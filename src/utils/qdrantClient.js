import { QdrantClient } from '@qdrant/js-client-rest';
import config from '../../env.config.js';

const client = new QdrantClient({ url: config.qdrantURL });

export async function ensureCollection(collectionName, dimension) {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);

    if(exists) return;

    try{
        await client.createCollection(collectionName, {
            vectors: { size: dimension, distance: 'Cosine' },
        });
    } catch(err) {
        if(err?.status ===409 || err?.data?.status?.error?.includes('Collection already exists')) return;
        throw err;
    }
}

export async function deleteCollection(collectionName){
    try{
        await client.deleteCollection(collectionName);
        return true;
    } catch(err){
        if(err?.message.include('Not found')) return false;
        throw err;
    }
}

export async function collectionExists(collectionName) {
    const collections = await client.getCollections();
    return collections.collections.some(c=> c.name === collectionName);
}

export default client;