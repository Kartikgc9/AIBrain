// AIBrain Memory Search Panel
// Floating overlay panel for searching and inserting memories

interface SearchState {
    query: string;
    filter: {
        type?: string;
        scope?: string;
        tags?: string[];
        platform?: string;
        startDate?: number;
        endDate?: number;
    };
    results: any[];
    selectedIndex: number;
    isLoading: boolean;
    showFilters: boolean;
}

class MemorySearchPanel {
    private panel: HTMLElement | null = null;
    private state: SearchState = {
        query: '',
        filter: {},
        results: [],
        selectedIndex: -1,
        isLoading: false,
        showFilters: false
    };
    private debounceTimer: number | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private onInsertCallback: ((memory: any) => void) | null = null;

    constructor(onInsert?: (memory: any) => void) {
        this.onInsertCallback = onInsert || null;
    }

    show() {
        if (this.panel) {
            this.panel.style.display = 'flex';
            this.focusSearchInput();
            return;
        }

        this.createPanel();
        document.body.appendChild(this.panel!);
        this.focusSearchInput();
        this.loadPosition();
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    toggle() {
        if (this.panel && this.panel.style.display !== 'none') {
            this.hide();
        } else {
            this.show();
        }
    }

    private createPanel() {
        const panel = document.createElement('div');
        panel.id = 'aibrain-search-panel';
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 380px;
            height: 600px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #e0e0e0;
            overflow: hidden;
        `;

        panel.innerHTML = `
            <div id="aibrain-panel-header" style="
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                cursor: move;
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v8M8 12h8"/>
                    </svg>
                    <span style="font-weight: 600; font-size: 14px; color: white;">AIBrain Memory Search</span>
                </div>
                <button id="aibrain-close-btn" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            </div>

            <div style="padding: 16px; border-bottom: 1px solid #333;">
                <input
                    id="aibrain-search-input"
                    type="text"
                    placeholder="Search memories..."
                    style="
                        width: 100%;
                        padding: 10px 12px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        color: #e0e0e0;
                        font-size: 14px;
                        outline: none;
                        box-sizing: border-box;
                    "
                />

                <button id="aibrain-toggle-filters" style="
                    margin-top: 8px;
                    padding: 6px 12px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #a0a0a0;
                    font-size: 12px;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#2a2a2a'">
                    <span style="margin-right: 4px;">▼</span> Filters
                </button>

                <div id="aibrain-filters" style="
                    display: none;
                    margin-top: 12px;
                    padding: 12px;
                    background: #2a2a2a;
                    border-radius: 8px;
                    font-size: 12px;
                ">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 4px; color: #a0a0a0;">Type:</label>
                        <select id="aibrain-filter-type" style="
                            width: 100%;
                            padding: 6px;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            border-radius: 4px;
                            color: #e0e0e0;
                        ">
                            <option value="">All Types</option>
                            <option value="preference">Preference</option>
                            <option value="fact">Fact</option>
                            <option value="task">Task</option>
                            <option value="project">Project</option>
                            <option value="meta">Meta</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 4px; color: #a0a0a0;">Scope:</label>
                        <select id="aibrain-filter-scope" style="
                            width: 100%;
                            padding: 6px;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            border-radius: 4px;
                            color: #e0e0e0;
                        ">
                            <option value="">All Scopes</option>
                            <option value="user_global">Global</option>
                            <option value="session">Session</option>
                            <option value="site">Site</option>
                            <option value="conversation">Conversation</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 4px; color: #a0a0a0;">Platform:</label>
                        <select id="aibrain-filter-platform" style="
                            width: 100%;
                            padding: 6px;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            border-radius: 4px;
                            color: #e0e0e0;
                        ">
                            <option value="">All Platforms</option>
                            <option value="chatgpt.com">ChatGPT</option>
                            <option value="claude.ai">Claude</option>
                            <option value="perplexity.ai">Perplexity</option>
                            <option value="gemini.google.com">Gemini</option>
                        </select>
                    </div>
                </div>
            </div>

            <div id="aibrain-results-container" style="
                flex: 1;
                overflow-y: auto;
                padding: 12px;
            ">
                <div id="aibrain-results-list"></div>
            </div>

            <div style="
                padding: 12px;
                border-top: 1px solid #333;
                background: #1a1a1a;
                font-size: 11px;
                color: #666;
                text-align: center;
            ">
                <kbd style="background: #2a2a2a; padding: 2px 6px; border-radius: 3px;">↑↓</kbd> Navigate
                <kbd style="background: #2a2a2a; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">Enter</kbd> Insert
                <kbd style="background: #2a2a2a; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">Esc</kbd> Close
            </div>
        `;

        this.panel = panel;
        this.attachEventListeners();
    }

    private attachEventListeners() {
        if (!this.panel) return;

        // Search input
        const searchInput = this.panel.querySelector('#aibrain-search-input') as HTMLInputElement;
        searchInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.state.query = target.value;
            this.debouncedSearch();
        });

        // Close button
        const closeBtn = this.panel.querySelector('#aibrain-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());

        // Filter toggle
        const toggleFilters = this.panel.querySelector('#aibrain-toggle-filters');
        toggleFilters?.addEventListener('click', () => {
            this.state.showFilters = !this.state.showFilters;
            const filtersDiv = this.panel?.querySelector('#aibrain-filters') as HTMLElement;
            const arrow = toggleFilters.querySelector('span');

            if (this.state.showFilters) {
                filtersDiv.style.display = 'block';
                if (arrow) arrow.textContent = '▲';
            } else {
                filtersDiv.style.display = 'none';
                if (arrow) arrow.textContent = '▼';
            }
        });

        // Filter inputs
        const filterType = this.panel.querySelector('#aibrain-filter-type') as HTMLSelectElement;
        const filterScope = this.panel.querySelector('#aibrain-filter-scope') as HTMLSelectElement;
        const filterPlatform = this.panel.querySelector('#aibrain-filter-platform') as HTMLSelectElement;

        filterType.addEventListener('change', () => {
            this.state.filter.type = filterType.value || undefined;
            this.performSearch();
        });

        filterScope.addEventListener('change', () => {
            this.state.filter.scope = filterScope.value || undefined;
            this.performSearch();
        });

        filterPlatform.addEventListener('change', () => {
            this.state.filter.platform = filterPlatform.value || undefined;
            this.performSearch();
        });

        // Dragging
        const header = this.panel.querySelector('#aibrain-panel-header') as HTMLElement;
        header.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));

        // Keyboard navigation
        searchInput.addEventListener('keydown', this.handleKeydown.bind(this));

        // Prevent panel from closing when clicking inside
        this.panel.addEventListener('click', (e) => e.stopPropagation());
    }

    private handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.hide();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectNext();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectPrevious();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.state.selectedIndex >= 0 && this.state.results[this.state.selectedIndex]) {
                this.insertMemory(this.state.results[this.state.selectedIndex]);
            }
        }
    }

    private selectNext() {
        if (this.state.results.length === 0) return;
        this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, this.state.results.length - 1);
        this.updateSelection();
    }

    private selectPrevious() {
        if (this.state.results.length === 0) return;
        this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, 0);
        this.updateSelection();
    }

    private updateSelection() {
        const resultsList = this.panel?.querySelector('#aibrain-results-list');
        if (!resultsList) return;

        const items = resultsList.querySelectorAll('.aibrain-memory-card');
        items.forEach((item, index) => {
            if (index === this.state.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    private startDrag(e: MouseEvent) {
        if (!this.panel) return;
        this.isDragging = true;
        const rect = this.panel.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
    }

    private drag(e: MouseEvent) {
        if (!this.isDragging || !this.panel) return;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        this.panel.style.left = `${x}px`;
        this.panel.style.top = `${y}px`;
        this.panel.style.right = 'auto';
    }

    private stopDrag() {
        if (this.isDragging && this.panel) {
            this.isDragging = false;
            this.savePosition();
        }
    }

    private savePosition() {
        if (!this.panel) return;
        try {
            const rect = this.panel.getBoundingClientRect();
            localStorage.setItem('aibrain-search-panel-position', JSON.stringify({
                left: rect.left,
                top: rect.top
            }));
        } catch (e) {
            // localStorage may be unavailable in private browsing mode
            console.warn('[AIBrain] Could not save panel position (localStorage unavailable):', e);
        }
    }

    private loadPosition() {
        if (!this.panel) return;
        try {
            const saved = localStorage.getItem('aibrain-search-panel-position');
            if (saved) {
                const pos = JSON.parse(saved);
                this.panel.style.left = `${pos.left}px`;
                this.panel.style.top = `${pos.top}px`;
                this.panel.style.right = 'auto';
            }
        } catch (e) {
            // localStorage may be unavailable in private browsing mode or parse error
            console.warn('[AIBrain] Could not load panel position:', e);
        }
    }

    private debouncedSearch() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    private async performSearch() {
        this.state.isLoading = true;
        this.renderResults(); // Show loading state

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SEARCH_MEMORIES',
                payload: {
                    query: this.state.query || undefined,
                    limit: 50,
                    filter: this.state.filter
                }
            });

            if (response.success) {
                this.state.results = response.memories;
                this.state.selectedIndex = this.state.results.length > 0 ? 0 : -1;
            } else {
                console.error('[AIBrain] Search failed:', response.error);
                this.state.results = [];
            }
        } catch (error) {
            console.error('[AIBrain] Search error:', error);
            this.state.results = [];
        }

        this.state.isLoading = false;
        this.renderResults();
    }

    private renderResults() {
        const resultsList = this.panel?.querySelector('#aibrain-results-list');
        if (!resultsList) return;

        if (this.state.isLoading) {
            resultsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 14px;">Searching memories...</div>
                </div>
            `;
            return;
        }

        if (this.state.results.length === 0) {
            resultsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <div style="font-size: 14px;">No memories found</div>
                    <div style="font-size: 12px; margin-top: 8px;">Try adjusting your search or filters</div>
                </div>
            `;
            return;
        }

        resultsList.innerHTML = this.state.results.map((memory, index) => `
            <div class="aibrain-memory-card ${index === this.state.selectedIndex ? 'selected' : ''}" data-index="${index}" style="
                background: ${index === this.state.selectedIndex ? '#2a2a2a' : '#1e1e1e'};
                border: 1px solid ${index === this.state.selectedIndex ? '#667eea' : '#333'};
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.background='#2a2a2a'; this.style.borderColor='#667eea'" onmouseout="if (!this.classList.contains('selected')) { this.style.background='#1e1e1e'; this.style.borderColor='#333' }">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="display: flex; gap: 6px;">
                        <span style="
                            background: ${this.getTypeColor(memory.type)};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 10px;
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${memory.type}</span>
                        <span style="
                            background: #333;
                            color: #a0a0a0;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 10px;
                        ">${memory.scope}</span>
                    </div>
                    <button class="aibrain-insert-btn" data-index="${index}" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Insert</button>
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: #e0e0e0; margin-bottom: 8px;">
                    ${this.truncate(memory.content, 120)}
                </div>
                <div style="font-size: 11px; color: #666; display: flex; gap: 12px;">
                    ${memory.source?.platform ? `<span>📍 ${memory.source.platform}</span>` : ''}
                    <span>🕒 ${this.formatDate(memory.createdAt)}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners to insert buttons
        resultsList.querySelectorAll('.aibrain-insert-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt((e.target as HTMLElement).dataset.index || '0');
                this.insertMemory(this.state.results[index]);
            });
        });

        // Add click listeners to cards for selection
        resultsList.querySelectorAll('.aibrain-memory-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt((card as HTMLElement).dataset.index || '0');
                this.state.selectedIndex = index;
                this.updateSelection();
            });
        });
    }

    private insertMemory(memory: any) {
        console.log('[AIBrain] Inserting memory:', memory.id);

        if (this.onInsertCallback) {
            this.onInsertCallback(memory);
        }

        this.hide();
    }

    private getTypeColor(type: string): string {
        const colors: Record<string, string> = {
            preference: '#667eea',
            fact: '#f093fb',
            task: '#4facfe',
            project: '#43e97b',
            meta: '#fa709a'
        };
        return colors[type] || '#666';
    }

    private truncate(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    private focusSearchInput() {
        const searchInput = this.panel?.querySelector('#aibrain-search-input') as HTMLInputElement;
        searchInput?.focus();
    }
}

// Export singleton instance
let searchPanelInstance: MemorySearchPanel | null = null;

export function getSearchPanel(onInsert?: (memory: any) => void): MemorySearchPanel {
    if (!searchPanelInstance) {
        searchPanelInstance = new MemorySearchPanel(onInsert);
    }
    return searchPanelInstance;
}

// Export the class type for use in other modules
export type { MemorySearchPanel };
