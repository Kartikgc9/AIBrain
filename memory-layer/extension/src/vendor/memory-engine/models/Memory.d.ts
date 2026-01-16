export type MemoryScope = "user_global" | "session" | "site" | "conversation";
export type MemoryType = "preference" | "fact" | "task" | "project" | "meta";
export interface MemorySource {
    url: string;
    platform?: string;
    timestamp: number;
    pageTitle?: string;
    conversationId?: string;
}
export interface Memory {
    id: string;
    userId: string;
    content: string;
    type: MemoryType;
    scope: MemoryScope;
    source: MemorySource;
    createdAt: number;
    updatedAt: number;
    confidence: number;
    tags: string[];
    embedding: number[];
}
export interface MemoryFilter {
    type?: MemoryType;
    scope?: MemoryScope;
    tags?: string[];
    platform?: string;
    startDate?: number;
    endDate?: number;
}
