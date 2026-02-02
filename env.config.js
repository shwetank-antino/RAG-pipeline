import { configDotenv } from "dotenv";
configDotenv();

const config = {
    port: process.env.PORT || 3000,
    valkeyUrl: process.env.VALKEY_URL || "redis://localhost:6379",

    qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",

    embeddingProvider: process.env.EMBEDDING_PROVIDER || "gemini",
    embeddingApiKey: process.env.EMBEDDING_API_KEY || "",
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-004",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || "768", 10),

    llmProvider: process.env.LLM_PROVIDER || "gemini",
    llmApiKey: process.env.LLM_API_KEY || "",
    llmModel: process.env.LLM_MODEL || "gemini-2.5-flash",
}

export default config;
