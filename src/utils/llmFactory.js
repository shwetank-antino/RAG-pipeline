import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import config from '../../env.config.js';

export function getLLM() {
    const { llmProvider, llmApiKey, llmModel } = config;

    switch (llmProvider?.toLowerCase()) {
        case 'openai':
            return new ChatOpenAI({
                model: llmModel,
                apiKey: llmApiKey,
                temperature: 0.7,
            });
        case 'gemini':
        case 'google':
            return new ChatGoogleGenerativeAI({
                model: llmModel,
                apiKey: llmApiKey,
                temperature: 0.7,
            });
        default:
            throw new Error(`Unsupported LLM provider: ${llmProvider}`);
    }
}

export async function generate(messages, options = {}) {
    const llm = getLLM();
    const response = await llm.invoke(messages, options);
    return response.content;
}