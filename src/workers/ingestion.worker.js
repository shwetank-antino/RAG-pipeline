import { Worker } from 'bullmq';
import fs from 'node:fs';
import path from 'node:path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/qdrant';
import valkeyBullMQConnection from '../utils/valkeyBullMQConnection.js';
import valkey from '../utils/valkeyClient.js';
import { getEmbeddings } from '../utils/embeddingFactory.js';
import { ensureCollection } from '../utils/qdrantClient.js';
import config from '../../env.config.js';

const QUEUE_NAME = 'rag-ingestion';

const SESSION_TTL = 30 * 60;

const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        const { sessionId, filePath } = job.data;

        // Abort if session expired
        const sessionKey = `session:${sessionId}`;
        const exists = await valkey.exists(sessionKey);
        if (!exists) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return;
        }

        // Load and chunk PDF
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();

        if (docs.length === 0) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return;
        }

        const splitter = new CharacterTextSplitter({
            chunkSize: 1200,
            chunkOverlap: 120,
            separators: ['\n\n', '\n', '. ', ' ', ''],
        });
        const chunks = await splitter.splitDocuments(docs);

        const embeddings = getEmbeddings();
        const collectionName = `rag_${sessionId}`;

        // Ensure collection exists
        await ensureCollection(collectionName, config.embeddingDimension);

        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: config.qdrantUrl,
            collectionName,
        });
        await vectorStore.addDocuments(chunks);

        const statusKey = `session:${sessionId}:status`;
        const jobsTotalKey = `session:${sessionId}:jobsTotal`;
        const jobsCompletedKey = `session:${sessionId}:jobsCompleted`;

        const completed = await valkey.incr(jobsCompletedKey);
        await valkey.expire(jobsCompletedKey, SESSION_TTL);

        const total = parseInt(await valkey.get(jobsTotalKey) || '0', 10);
        if (completed >= total) {
            await valkey.set(statusKey, 'ready', { EX: SESSION_TTL });
        }

        // Delete PDF after success
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    },
    {
        connection: valkeyBullMQConnection,
        concurrency: 5,
    }
);

worker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err));

console.log(`[worker] Ingestion worker started for queue: ${QUEUE_NAME}`);