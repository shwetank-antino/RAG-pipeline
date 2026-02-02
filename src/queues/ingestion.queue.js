import { Queue } from 'bullmq';
import valkeyBullMQConnection from '../utils/valkeyBullMQConnection.js';

const QUEUE_NAME = 'rag-ingestion';

const ingestionQueue = new Queue(QUEUE_NAME, {
    connection: valkeyBullMQConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
    },
});

export async function addIngestionJob(sessionId, filePath) {
    await ingestionQueue.add('ingest-pdf', { sessionId, filePath });
}

export default ingestionQueue;