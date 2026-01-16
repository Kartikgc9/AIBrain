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
        // Perplexity class names are dynamic/obfuscated often, checking for generic containers
        // Best effort MVP:
        text = document.body.innerText.substring(0, 10000); // Fallback to raw text for now
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
