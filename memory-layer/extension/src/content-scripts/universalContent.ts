// Platform-specific DOM selectors and button injection logic

interface PlatformConfig {
    name: string;
    promptSelector: string;
    buttonPosition: 'before' | 'after' | 'inside';
    injectButton: (button: HTMLElement) => void;
}

const platformConfigs: Record<string, PlatformConfig> = {
    'chatgpt': {
        name: 'ChatGPT',
        promptSelector: 'textarea[data-id="root"]',
        buttonPosition: 'after',
        injectButton: (button) => {
            const textarea = document.querySelector('textarea[data-id="root"]');
            if (textarea?.parentElement) {
                const sendButton = textarea.parentElement.querySelector('button[data-testid="send-button"]');
                if (sendButton) {
                    sendButton.parentElement?.insertBefore(button, sendButton);
                } else {
                    textarea.parentElement.appendChild(button);
                }
            }
        }
    },
    'claude': {
        name: 'Claude',
        promptSelector: 'div[contenteditable="true"]',
        buttonPosition: 'after',
        injectButton: (button) => {
            const editor = document.querySelector('div[contenteditable="true"]');
            const container = editor?.closest('fieldset') || editor?.parentElement;
            if (container) {
                container.appendChild(button);
            }
        }
    },
    'perplexity': {
        name: 'Perplexity',
        promptSelector: 'textarea[placeholder*="Ask"]',
        buttonPosition: 'inside',
        injectButton: (button) => {
            const textarea = document.querySelector('textarea[placeholder*="Ask"]');
            if (textarea?.parentElement) {
                textarea.parentElement.style.position = 'relative';
                textarea.parentElement.appendChild(button);
            }
        }
    },
    'gemini': {
        name: 'Gemini',
        promptSelector: 'rich-textarea[placeholder*="Enter"]',
        buttonPosition: 'inside',
        injectButton: (button) => {
            const textarea = document.querySelector('rich-textarea[placeholder*="Enter"]');
            if (textarea) {
                const container = textarea.closest('.input-area-container');
                if (container) {
                    container.appendChild(button);
                }
            }
        }
    }
};

function createAIBrainButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'ai-brain-btn';
    button.innerHTML = '🧠';
    button.title = 'AI Brain - Remember this (Ctrl+M)';

    // Styling
    Object.assign(button.style, {
        position: 'relative',
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: '1px solid #444',
        background: '#1a1a1a',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        marginLeft: '8px',
        zIndex: '1000'
    });

    button.addEventListener('mouseenter', () => {
        button.style.background = '#9333ea';
        button.style.borderColor = '#9333ea';
    });

    button.addEventListener('mouseleave', () => {
        button.style.background = '#1a1a1a';
        button.style.borderColor = '#444';
    });

    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get conversation text
        const text = getConversationText();
        const url = window.location.href;

        // Send to background
        chrome.runtime.sendMessage({
            type: 'CAPTURE_CONVERSATION',
            payload: { text, url }
        }, (response) => {
            if (response?.success) {
                // Show success animation
                button.innerHTML = '✓';
                button.style.background = '#16a34a';
                setTimeout(() => {
                    button.innerHTML = '🧠';
                    button.style.background = '#1a1a1a';
                }, 2000);
            } else {
                // Show error
                button.innerHTML = '⚠';
                button.style.background = '#dc2626';
                setTimeout(() => {
                    button.innerHTML = '🧠';
                    button.style.background = '#1a1a1a';
                }, 2000);
            }
        });
    });

    return button;
}

function getConversationText(): string {
    // Platform-specific text extraction
    const hostname = window.location.hostname;

    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
        const messages = Array.from(document.querySelectorAll('[data-message-author-role]'));
        return messages.map(el => el.textContent).filter(Boolean).join('\n\n');
    }

    if (hostname.includes('claude.ai')) {
        const messages = Array.from(document.querySelectorAll('[class*="font-claude"]'));
        return messages.map(el => el.textContent).filter(Boolean).join('\n\n');
    }

    if (hostname.includes('perplexity.ai')) {
        return document.body.innerText.substring(0, 10000);
    }

    if (hostname.includes('gemini.google.com')) {
        const messages = Array.from(document.querySelectorAll('[class*="conversation"]'));
        return messages.map(el => el.textContent).filter(Boolean).join('\n\n');
    }

    // Fallback
    return document.body.innerText.substring(0, 10000);
}

function detectPlatform(): string | null {
    const hostname = window.location.hostname;

    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    if (hostname.includes('gemini.google.com')) return 'gemini';

    return null;
}

function injectButton() {
    // Prevent double injection
    if (document.getElementById('ai-brain-btn')) return;

    const platform = detectPlatform();
    if (!platform) return;

    const config = platformConfigs[platform];
    if (!config) return;

    const button = createAIBrainButton();

    try {
        config.injectButton(button);
        console.log(`[AI Brain] Button injected on ${config.name}`);
    } catch (error) {
        console.error('[AI Brain] Failed to inject button:', error);
    }
}

// Inject on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
} else {
    injectButton();
}

// Re-inject on navigation (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(injectButton, 1000);
    }
}).observe(document, { subtree: true, childList: true });

// Keyboard shortcut (Ctrl+M)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        const button = document.getElementById('ai-brain-btn');
        if (button) {
            button.click();
        }
    }
});

export { };
