import { LocalStore } from './store/LocalStore';
import { OpenAIProvider } from './llm/OpenAIProvider';
import { IngestionPipeline } from './ingestion/IngestionPipeline';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("Please set OPENAI_API_KEY in .env");
        return;
    }

    // Setup
    const persistencePath = path.join(__dirname, '../data/memories.json');
    const store = new LocalStore(persistencePath);
    const llm = new OpenAIProvider(apiKey);
    const pipeline = new IngestionPipeline(store, llm);

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
