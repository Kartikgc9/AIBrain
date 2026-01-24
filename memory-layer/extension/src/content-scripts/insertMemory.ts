// AIBrain Memory Insertion
// Platform-specific DOM insertion for AI chat platforms

interface PlatformConfig {
    name: string;
    detect: () => boolean;
    insert: (content: string) => boolean;
}

// Platform detection and insertion strategies
const platforms: PlatformConfig[] = [
    {
        name: 'ChatGPT',
        detect: () => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com'),
        insert: (content: string) => {
            // Try multiple selectors for ChatGPT
            const selectors = [
                'textarea[data-id="root"]',
                'textarea#prompt-textarea',
                'textarea[placeholder*="Message"]',
                'div[contenteditable="true"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLTextAreaElement) {
                    // For textarea elements
                    const currentValue = element.value;
                    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

                    element.value = newValue;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.focus();

                    console.log('[AIBrain] Inserted into ChatGPT textarea');
                    return true;
                }

                if (element instanceof HTMLElement && element.isContentEditable) {
                    // For contenteditable elements
                    const currentText = element.innerText;
                    const newText = currentText ? `${currentText}\n\n${content}` : content;

                    element.innerText = newText;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();

                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);

                    console.log('[AIBrain] Inserted into ChatGPT contenteditable');
                    return true;
                }
            }

            return false;
        }
    },
    {
        name: 'Claude',
        detect: () => window.location.hostname.includes('claude.ai'),
        insert: (content: string) => {
            // Claude uses contenteditable div
            const selectors = [
                'div[contenteditable="true"]',
                'div.ProseMirror',
                'div[role="textbox"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector) as HTMLElement;

                if (element && element.isContentEditable) {
                    const currentText = element.innerText;
                    const newText = currentText ? `${currentText}\n\n${content}` : content;

                    element.innerText = newText;

                    // Trigger input events
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.focus();

                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);

                    console.log('[AIBrain] Inserted into Claude');
                    return true;
                }
            }

            return false;
        }
    },
    {
        name: 'Perplexity',
        detect: () => window.location.hostname.includes('perplexity.ai'),
        insert: (content: string) => {
            // Perplexity uses textarea
            const selectors = [
                'textarea[placeholder*="Ask"]',
                'textarea[placeholder*="Follow"]',
                'textarea'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector) as HTMLTextAreaElement;

                if (element instanceof HTMLTextAreaElement) {
                    const currentValue = element.value;
                    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

                    element.value = newValue;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.focus();

                    console.log('[AIBrain] Inserted into Perplexity');
                    return true;
                }
            }

            return false;
        }
    },
    {
        name: 'Gemini',
        detect: () => window.location.hostname.includes('gemini.google.com'),
        insert: (content: string) => {
            // Gemini uses rich-textarea component
            const selectors = [
                'rich-textarea textarea',
                'div[contenteditable="true"]',
                'textarea[aria-label*="prompt"]',
                'textarea'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLTextAreaElement) {
                    const currentValue = element.value;
                    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

                    element.value = newValue;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.focus();

                    console.log('[AIBrain] Inserted into Gemini');
                    return true;
                }

                if (element instanceof HTMLElement && element.isContentEditable) {
                    const currentText = element.innerText;
                    const newText = currentText ? `${currentText}\n\n${content}` : content;

                    element.innerText = newText;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();

                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);

                    console.log('[AIBrain] Inserted into Gemini contenteditable');
                    return true;
                }
            }

            return false;
        }
    },
    {
        name: 'Grok',
        detect: () => window.location.hostname.includes('x.com') && window.location.pathname.includes('/grok'),
        insert: (content: string) => {
            // Grok on X (formerly Twitter)
            const selectors = [
                'div[contenteditable="true"]',
                'textarea[aria-label*="message"]',
                'div[role="textbox"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLTextAreaElement) {
                    const currentValue = element.value;
                    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

                    element.value = newValue;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.focus();

                    console.log('[AIBrain] Inserted into Grok');
                    return true;
                }

                if (element instanceof HTMLElement && element.isContentEditable) {
                    const currentText = element.innerText;
                    const newText = currentText ? `${currentText}\n\n${content}` : content;

                    element.innerText = newText;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();

                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);

                    console.log('[AIBrain] Inserted into Grok');
                    return true;
                }
            }

            return false;
        }
    }
];

// Generic fallback for any platform
function genericInsert(content: string): boolean {
    // Try to find any textarea or contenteditable element
    const textareas = document.querySelectorAll('textarea');
    const editables = document.querySelectorAll('[contenteditable="true"]');

    // Prefer visible elements
    const visibleTextarea = Array.from(textareas).find(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });

    if (visibleTextarea) {
        const currentValue = visibleTextarea.value;
        const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

        visibleTextarea.value = newValue;
        visibleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        visibleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        visibleTextarea.focus();

        console.log('[AIBrain] Inserted into generic textarea');
        return true;
    }

    const visibleEditable = Array.from(editables).find(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });

    if (visibleEditable instanceof HTMLElement) {
        const currentText = visibleEditable.innerText;
        const newText = currentText ? `${currentText}\n\n${content}` : content;

        visibleEditable.innerText = newText;
        visibleEditable.dispatchEvent(new Event('input', { bubbles: true }));
        visibleEditable.focus();

        // Move cursor to end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(visibleEditable);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);

        console.log('[AIBrain] Inserted into generic contenteditable');
        return true;
    }

    return false;
}

// Copy to clipboard as ultimate fallback
async function copyToClipboard(content: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(content);
        console.log('[AIBrain] Copied to clipboard');
        showNotification('Memory copied to clipboard!', 'info');
    } catch (error) {
        console.error('[AIBrain] Clipboard write failed:', error);
        showNotification('Failed to copy memory', 'error');
    }
}

// Inject CSS animations once
let animationsInjected = false;
function injectAnimations() {
    if (animationsInjected) return;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes aibrain-slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes aibrain-slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    animationsInjected = true;
}

// Show notification to user
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    // Ensure animations are injected
    injectAnimations();

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#10b981'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        animation: aibrain-slideIn 0.3s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'aibrain-slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Main insertion function
export async function insertMemory(memory: any): Promise<void> {
    const content = memory.content;

    console.log('[AIBrain] Attempting to insert memory:', memory.id);

    // Try platform-specific insertion
    for (const platform of platforms) {
        if (platform.detect()) {
            console.log(`[AIBrain] Detected platform: ${platform.name}`);
            const success = platform.insert(content);

            if (success) {
                showNotification('Memory inserted!', 'success');
                return;
            }

            console.warn(`[AIBrain] Platform ${platform.name} insertion failed, trying generic...`);
            break;
        }
    }

    // Try generic insertion
    const genericSuccess = genericInsert(content);

    if (genericSuccess) {
        showNotification('Memory inserted!', 'success');
        return;
    }

    // Ultimate fallback: copy to clipboard
    console.warn('[AIBrain] All insertion methods failed, falling back to clipboard');
    await copyToClipboard(content);
}

// Export for use in content scripts
export function detectPlatform(): string {
    for (const platform of platforms) {
        if (platform.detect()) {
            return platform.name;
        }
    }
    return 'Unknown';
}
