console.log("[AI Brain] Service Worker Starting...");

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

async function saveMemory(memory: any): Promise<string> {
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

async function getAllMemories(): Promise<any[]> {
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

// Message handlers
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
    console.log("[AI Brain] Received message:", message.type);

    if (message.type === 'CAPTURE_CONVERSATION') {
        handleCapture(message.payload)
            .then(sendResponse)
            .catch((error) => {
                console.error("[AI Brain] Capture failed:", error);
                sendResponse({ success: false, message: error.message });
            });
        return true; // Will respond asynchronously
    }

    if (message.type === 'GET_STATS') {
        handleGetStats()
            .then(sendResponse)
            .catch((error) => {
                console.error("[AI Brain] Stats failed:", error);
                sendResponse({ success: false, total: 0 });
            });
        return true;
    }

    if (message.type === 'GET_RECENT_MEMORIES') {
        handleGetRecent()
            .then(sendResponse)
            .catch((error) => {
                console.error("[AI Brain] Recent failed:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    return false;
});

async function handleGetStats() {
    console.log("[AI Brain] Getting stats...");
    try {
        const all = await getAllMemories();
        console.log("[AI Brain] Total memories:", all.length);
        return { success: true, total: all.length };
    } catch (error: any) {
        console.error("[AI Brain] Stats error:", error);
        return { success: false, total: 0 };
    }
}

async function handleGetRecent() {
    console.log("[AI Brain] Getting recent...");
    try {
        const all = await getAllMemories();
        all.sort((a, b) => b.createdAt - a.createdAt);
        const recent = all.slice(0, 10);
        console.log("[AI Brain] Recent count:", recent.length);
        return { success: true, memories: recent };
    } catch (error: any) {
        console.error("[AI Brain] Recent error:", error);
        return { success: false, error: error.message };
    }
}

async function handleCapture(payload: { text: string, url: string }) {
    console.log("[AI Brain] Capturing from:", payload.url);

    try {
        const memory = {
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
            tags: [],
            embedding: new Array(1536).fill(0)
        };

        await saveMemory(memory);

        return {
            success: true,
            message: "Memory saved successfully!"
        };

    } catch (error: any) {
        console.error("[AI Brain] Capture error:", error);
        return {
            success: false,
            message: error.message || "Failed to save memory"
        };
    }
}

console.log("[AI Brain] Service Worker Ready");
