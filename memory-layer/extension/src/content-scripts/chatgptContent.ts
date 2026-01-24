// Universal Content Script (handles multiple domains)

function getInteractiveText() {
    const url = window.location.href;
    let text = "";

    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        document.querySelectorAll('div[data-message-author-role]').forEach((el) => {
            text += `[${el.getAttribute('data-message-author-role')}]: ${(el as HTMLElement).innerText}\n`;
        });
    } else if (url.includes('claude.ai')) {
        document.querySelectorAll('.font-claude-message').forEach((el) => {
            text += `[Message]: ${(el as HTMLElement).innerText}\n`;
        });
    } else if (url.includes('perplexity.ai')) {
        // Perplexity-specific selectors for better content extraction
        const answerSelectors = [
            '[data-testid="answer-block"]',
            '.prose',
            '[class*="AnswerBlock"]',
            'article',
            '.markdown'
        ];

        let extracted = false;
        for (const selector of answerSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach((el, index) => {
                    text += `[Answer ${index + 1}]: ${(el as HTMLElement).innerText}\n\n`;
                });
                extracted = true;
                break;
            }
        }

        // Fallback to raw text if no specific selectors match
        if (!extracted) {
            text = document.body.innerText.substring(0, 10000);
        }
    } else if (url.includes('gemini.google.com')) {
        document.querySelectorAll('message-content').forEach((el) => {
            text += `[Gemini]: ${(el as HTMLElement).innerText}\n`;
        });
    } else {
        // Generic Page
        text = document.body.innerText.substring(0, 5000);
    }

    return text;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SCRAPE_PAGE") {
        console.log("Memory Layer: Scraping page...");
        const text = getInteractiveText();
        sendResponse({ text, url: window.location.href });
    }
});

// Memory Search Panel Integration (shared module)
import { initSearchPanel } from './initSearchPanel';

// Initialize search panel with keyboard shortcut
initSearchPanel();
