"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LocalStore_1 = require("./store/LocalStore");
const OpenAIProvider_1 = require("./llm/OpenAIProvider");
const IngestionPipeline_1 = require("./ingestion/IngestionPipeline");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("Please set OPENAI_API_KEY in .env");
        return;
    }
    // Setup
    const persistencePath = path_1.default.join(__dirname, '../data/memories.json');
    const store = new LocalStore_1.LocalStore(persistencePath);
    const llm = new OpenAIProvider_1.OpenAIProvider(apiKey);
    const pipeline = new IngestionPipeline_1.IngestionPipeline(store, llm);
    // Initialize store
    await store.init();
    // Test Ingestion
    console.log("Ingesting mock conversation...");
    const text = "I am working on a React project using Next.js. I prefer Tailwind CSS for styling.";
    const source = {
        url: "https://chat.openai.com/test",
        timestamp: Date.now(),
        platform: "chatgpt"
    };
    const ids = await pipeline.run(text, source);
    console.log("Saved Memories:", ids);
    // Test Retrieval
    console.log("Searching for 'css preference'...");
    const queryEmbedding = await llm.generateEmbedding("What CSS framework do I like?");
    const results = await store.searchByEmbedding(queryEmbedding, 2);
    console.log("Search Results:");
    results.forEach(m => {
        console.log(`- [${m.confidence}] ${m.content} (${m.tags.join(', ')})`);
    });
}
main().catch(console.error);
