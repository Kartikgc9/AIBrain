export interface MemoryItem {
    id: string;
    memory: string;
    hash?: string;
    createdAt?: string;
    updatedAt?: string;
    score?: number;
    metadata?: Record<string, any>;
    userId?: string;
    agentId?: string;
    runId?: string;
}

export interface SearchResult {
    results: MemoryItem[];
    relations?: any[];
}

export interface Entity {
    userId?: string;
    agentId?: string;
    runId?: string;
}

export interface SearchFilters extends Entity {
    [key: string]: any;
}

export interface AddMemoryOptions extends Entity {
    metadata?: Record<string, any>;
    filters?: SearchFilters;
    infer?: boolean;
}

export interface SearchMemoryOptions extends Entity {
    limit?: number;
    filters?: SearchFilters;
}

export interface GetAllMemoryOptions extends Entity {
    limit?: number;
}
