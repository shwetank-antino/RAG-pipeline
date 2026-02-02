import {OpenAIEmbeddings} from '@langchain/openai';
import {GoogleGenerativeAIEmbeddings} from '@langchain/google-genai';
import config from '../../env.config.js';

export function getEmbeddings(){
    const { embeddingProvider, embeddingApiKey, embeddingModel } = config;

    switch(embeddingProvider?.toLowerCase()) {
        case 'openai':
            return new OpenAIEmbeddings({
                model: embeddingModel,
                apiKey: embeddingApiKey, 
            });
        case 'gemini':
        case 'google':
            return new GoogleGenerativeAIEmbeddings({
                model: embeddingModel,
                apiKey: embeddingApiKey,
            });
        default:
            throw new Error(`Unsupported embedding provider: ${embeddingProvider}`);
    }
}