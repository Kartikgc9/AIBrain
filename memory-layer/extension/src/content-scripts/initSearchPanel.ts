// Shared Search Panel Initialization
// Used by both chatgptContent.ts and universalContent.ts

import { getSearchPanel, type MemorySearchPanel } from './searchPanel';
import { insertMemory } from './insertMemory';

let initialized = false;
let searchPanel: MemorySearchPanel | null = null;

/**
 * Initializes the search panel with keyboard shortcut.
 * Safe to call multiple times - will only initialize once.
 */
export function initSearchPanel(): MemorySearchPanel {
    if (initialized && searchPanel) {
        return searchPanel;
    }

    // Initialize search panel with insert callback
    searchPanel = getSearchPanel((memory) => {
        insertMemory(memory);
    });

    // Keyboard shortcut: Ctrl+Shift+M to open search panel
    document.addEventListener('keydown', (event: KeyboardEvent) => {
        // Ctrl+Shift+M or Cmd+Shift+M
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
            event.preventDefault();
            console.log('[AIBrain] Opening search panel...');
            searchPanel?.toggle();
        }
    });

    initialized = true;
    console.log('[AIBrain] Search panel initialized');

    return searchPanel;
}

/**
 * Returns the search panel instance, initializing if needed.
 */
export function getInitializedSearchPanel(): MemorySearchPanel {
    if (!searchPanel) {
        return initSearchPanel();
    }
    return searchPanel;
}
