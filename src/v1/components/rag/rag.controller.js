import { addIngestionJob } from '../../../queues/ingestion.queue.js';
import valkey from '../../../utils/valkeyClient.js';
import { getEmbeddings } from '../../../utils/embeddingFactory.js';
import { generate } from '../../../utils/llmFactory.js';
import { QdrantVectorStore } from '@langchain/qdrant';
import { collectionExists } from '../../../utils/qdrantClient.js';
import config from '../../../../env.config.js';

const SESSION_TTL = 30 * 60;

export async function uploadPdfController(req, res) {
    try{
        if(!req.files || req.files.length ===0){
            return res.status(400).json({
                error: "No PDF files uploaded",
            });
        }

        const { sessionId } = req;
        const statusKey = `session:${sessionId}:status`;
        const jobsTotalKey = `session:${sessionId}:jobsTotal`;
        const jobsCompletedKey = `session:${sessionId}:jobsCompleted`;

        // Set status to ingesting and track job count
        await valkey.set(statusKey, 'ingesting', { EX: SESSION_TTL });
        await valkey.set(jobsTotalKey, String(req.files.length), { EX: SESSION_TTL });
        await valkey.set(jobsCompletedKey, '0', { EX: SESSION_TTL });

        for(const file of req.files){
            await addIngestionJob(req.sessionId, file.path);
        }

        res.status(200).json({
            message: "PDFs uploaded successfully",
            sessionId: req.sessionId,
            files: req.files.map((file)=>({
                name: file.originalname,
                size: file.size,
            })),
        });
    } catch(err) {
        res.status(500).json({
            error: "Upload failed",
            details: err.message,
        });
    }
};

export async function getStatusController(req, res) {
    try {
        const { sessionId } = req;
        const statusKey = `session:${sessionId}:status`;
        const status = await valkey.get(statusKey);

        if (!status) {
            return res.status(200).json({
                status: 'idle',
                message: 'No upload or session expired',
            });
        }

        res.status(200).json({ status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get status', details: err.message });
    }
}

export async function queryController(req, res) {
    try {
        const { sessionId } = req;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID is missing. Send x-session-id header with the same value from your upload.',
            });
        }
        
        const { question, chatHistory = [] } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'question is required and must be a string' });
        }

        // Check status
        const statusKey = `session:${sessionId}:status`;
        const status = await valkey.get(statusKey);
        if (status !== 'ready') {
            return res.status(400).json({
                error: 'Documents still ingesting',
                status: status || 'idle',
            });
        }

        // Check collection exists
        const collectionName = `rag_${sessionId}`;
        const exists = await collectionExists(collectionName);
        if (!exists) {
            return res.status(400).json({ error: 'No documents indexed for this session' });
        }

        // Retrieve relevant chunks
        const embeddings = getEmbeddings();
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: config.qdrantUrl,
            collectionName,
        });
        const retriever = vectorStore.asRetriever({ k: 5 });
        const docs = await retriever.invoke(question);

        const context = docs.map((d) => d.pageContent).join('\n\n');

        const SYSTEM_PROMPT = `You are a helpful AI assistant. Answer the user's question based ONLY on the following context from their uploaded documents. If the context doesn't contain relevant information, say so. Do not make up information.

Context:
${context}`;

        // Build messages: system + chat history + current question
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

        for (const turn of chatHistory) {
            if (turn.role && turn.content) {
                messages.push({ role: turn.role, content: turn.content });
            }
        }
        messages.push({ role: 'user', content: question });

        const answer = await generate(messages);

        res.status(200).json({ answer });
    } catch (err) {
        console.error('[query] Error:', err);
        res.status(500).json({ error: 'Query failed', details: err.message });
    }
}