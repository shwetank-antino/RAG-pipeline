import fs from 'node:fs';
import path from 'node:path';
import valkey from './valkeyClient.js';
import client, { deleteCollection } from './qdrantClient.js';

const uploadDir = "uploads";

export async function cleanupOrphanedUploads(){
    if(!fs.existsSync(uploadDir)) return;

    const sessionDirs = fs.readdirSync(uploadDir);

    for(const dirName of sessionDirs){
        const dirPath = path.join(uploadDir, dirName);
        if(!fs.statSync(dirPath).isDirectory()) continue;

        const sessionKey = `session:${dirName}`;
        const exists = await valkey.exists(sessionKey);

        if(!exists) {
            fs.rmSync(dirPath, { recursive: true });
            console.log(`[cleanup] Removed orphaned upload dir: ${dirName}`);
        }
    }
}

export async function cleanupOrphanedQdrantCollections(){
    try {
        const { collections } = await client.getCollections();

        for (const col of collections) {
            if (!col.name.startsWith('rag_')) continue;

            const sessionId = col.name.replace(/^rag_/, '');
            const sessionKey = `session:${sessionId}`;
            const exists = await valkey.exists(sessionKey);

            if (!exists) {
                await deleteCollection(col.name);
                console.log(`[cleanup] Removed orphaned Qdrant collection: ${col.name}`);
            }
        }
    } catch (err) {
        console.error('[cleanup] Qdrant cleanup failed:', err);
        throw err;
    }
}