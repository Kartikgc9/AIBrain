console.log("[AI Brain] Service Worker Starting...");

// Type definitions
interface MemorySource {
    url: string;
    platform: string;
    timestamp: number;
    conversationId?: string;
}

interface Memory {
    id: string;
    userId: string;
    content: string;
    type: 'preference' | 'fact' | 'task' | 'project' | 'meta';
    scope: 'user_global' | 'session' | 'site' | 'conversation';
    source: MemorySource;
    createdAt: number;
    updatedAt: number;
    confidence: number;
    tags: string[];
    embedding?: number[];
}

interface MemoryFilter {
    type?: string;
    scope?: string;
    tags?: string[];
    platform?: string;
    startDate?: number;
    endDate?: number;
}

type MessageType =
    | 'CAPTURE_CONVERSATION'
    | 'GET_STATS'
    | 'GET_RECENT_MEMORIES'
    | 'SEARCH_MEMORIES';

interface CapturePayload {
    text: string;
    url: string;
}

interface SearchPayload {
    query?: string;
    embedding?: number[];
    limit?: number;
    filter?: MemoryFilter;
}

interface Message {
    type: MessageType;
    payload?: CapturePayload | SearchPayload;
}

// Simple IndexedDB wrapper - no classes, just functions
const DB_NAME = 'MemoryLayerDB';
const STORE_NAME = 'memories';

let dbInstance: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => {
            console.error("[AI Brain] DB open error:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            console.log("[AI Brain] DB initialized");
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log("[AI Brain] Object store created");
            }
        };
    });
}

async function saveMemory(memory: Memory): Promise<string> {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(memory);

            request.onsuccess = () => {
                console.log("[AI Brain] Memory saved:", memory.id);
                resolve(memory.id);
            };

            request.onerror = () => {
                console.error("[AI Brain] Save error:", request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error("[AI Brain] Transaction error:", error);
            reject(error);
        }
    });
}

async function getAllMemories(): Promise<Memory[]> {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => {
                console.error("[AI Brain] GetAll error:", request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error("[AI Brain] Transaction error:", error);
            reject(error);
        }
    });
}

// Search utilities
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

function matchesFilter(memory: Memory, filter: MemoryFilter | undefined): boolean {
    if (!filter) return true;

    // Type filter
    if (filter.type && memory.type !== filter.type) return false;

    // Scope filter
    if (filter.scope && memory.scope !== filter.scope) return false;

    // Tags filter - memory must have ALL specified tags
    if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every((tag: string) =>
            memory.tags?.includes(tag)
        );
        if (!hasAllTags) return false;
    }

    // Platform filter
    if (filter.platform && memory.source?.platform !== filter.platform) {
        return false;
    }

    // Date range filter
    if (filter.startDate && memory.createdAt < filter.startDate) {
        return false;
    }
    if (filter.endDate && memory.createdAt > filter.endDate) {
        return false;
    }

    return true;
}

function textSearchScore(memory: Memory, query: string): number {
    if (!query) return 0;

    const lowerQuery = query.toLowerCase();
    const lowerContent = memory.content.toLowerCase();

    // Exact match scores higher
    if (lowerContent.includes(lowerQuery)) {
        const position = lowerContent.indexOf(lowerQuery);
        // Earlier matches score higher
        return 1 - (position / lowerContent.length) * 0.5;
    }

    // Word-based partial matching
    const queryWords = lowerQuery.split(/\s+/);
    const matchedWords = queryWords.filter(word => lowerContent.includes(word));
    return matchedWords.length / queryWords.length * 0.5;
}

async function searchMemories(params: SearchPayload): Promise<Memory[]> {
    const { query, embedding, limit = 20, filter } = params;

    console.log("[AI Brain] Searching memories:", { query, hasEmbedding: !!embedding, limit });

    let allMemories = await getAllMemories();

    // Apply filter first
    if (filter) {
        allMemories = allMemories.filter(m => matchesFilter(m, filter));
    }

    // If we have an embedding, use semantic search
    if (embedding && embedding.length > 0) {
        const scored = allMemories.map(m => ({
            memory: m,
            score: cosineSimilarity(embedding, m.embedding || [])
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.memory);
    }

    // Otherwise, use text search if query provided
    if (query) {
        const scored = allMemories.map(m => ({
            memory: m,
            score: textSearchScore(m, query)
        }));

        scored.sort((a, b) => b.score - a.score);
        // Filter out very low scores (< 0.1)
        return scored
            .filter(s => s.score > 0.1)
            .slice(0, limit)
            .map(s => s.memory);
    }

    // No search criteria, just return filtered and limited
    return allMemories.slice(0, limit);
}

// Message handlers
chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    console.log("[AI Brain] Received message:", message.type);

    if (message.type === 'CAPTURE_CONVERSATION') {
        handleCapture(message.payload as CapturePayload)
            .then(sendResponse)
            .catch((error: Error) => {
                console.error("[AI Brain] Capture failed:", error);
                sendResponse({ success: false, message: error.message });
            });
        return true; // Will respond asynchronously
    }

    if (message.type === 'GET_STATS') {
        handleGetStats()
            .then(sendResponse)
            .catch((error: Error) => {
                console.error("[AI Brain] Stats failed:", error);
                sendResponse({ success: false, total: 0 });
            });
        return true;
    }

    if (message.type === 'GET_RECENT_MEMORIES') {
        handleGetRecent()
            .then(sendResponse)
            .catch((error: Error) => {
                console.error("[AI Brain] Recent failed:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (message.type === 'SEARCH_MEMORIES') {
        handleSearch(message.payload as SearchPayload)
            .then(sendResponse)
            .catch((error: Error) => {
                console.error("[AI Brain] Search failed:", error);
                sendResponse({ success: false, error: error.message, memories: [] });
            });
        return true;
    }

    return false;
});

async function handleGetStats(): Promise<{ success: boolean; total: number }> {
    console.log("[AI Brain] Getting stats...");
    try {
        const all = await getAllMemories();
        console.log("[AI Brain] Total memories:", all.length);
        return { success: true, total: all.length };
    } catch (error) {
        console.error("[AI Brain] Stats error:", error);
        return { success: false, total: 0 };
    }
}

async function handleGetRecent(): Promise<{ success: boolean; memories?: Memory[]; error?: string }> {
    console.log("[AI Brain] Getting recent...");
    try {
        const all = await getAllMemories();
        all.sort((a, b) => b.createdAt - a.createdAt);
        const recent = all.slice(0, 10);
        console.log("[AI Brain] Recent count:", recent.length);
        return { success: true, memories: recent };
    } catch (error) {
        console.error("[AI Brain] Recent error:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function handleCapture(payload: CapturePayload): Promise<{ success: boolean; message: string }> {
    console.log("[AI Brain] Capturing from:", payload.url);

    try {
        const memory: Memory = {
            id: crypto.randomUUID(),
            userId: 'local_user',
            content: payload.text.substring(0, 1000),
            type: 'fact',
            scope: 'session',
            source: {
                url: payload.url,
                platform: new URL(payload.url).hostname,
                timestamp: Date.now()
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            confidence: 0.8,
            tags: []
            // Note: embedding is optional - will be generated by server if needed
        };

        await saveMemory(memory);

        return {
            success: true,
            message: "Memory saved successfully!"
        };

    } catch (error) {
        console.error("[AI Brain] Capture error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to save memory"
        };
    }
}

async function handleSearch(payload: SearchPayload): Promise<{ success: boolean; memories: Memory[]; count?: number; error?: string }> {
    console.log("[AI Brain] Handling search request...");

    try {
        const memories = await searchMemories(payload);

        console.log("[AI Brain] Search complete, found:", memories.length);

        return {
            success: true,
            memories,
            count: memories.length
        };

    } catch (error) {
        console.error("[AI Brain] Search error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            memories: []
        };
    }
}

console.log("[AI Brain] Service Worker Ready");
