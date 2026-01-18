// RedFlags Content Script
// Handles clause highlighting and shows agreement detection notification

// =====================
// AGREEMENT DETECTION
// =====================

const LEGAL_KEYWORDS = [
    'terms', 'privacy', 'policy', 'agreement', 'legal',
    'tos', 'eula', 'conditions', 'consent', 'cookie'
];

function isLegalAgreementPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    return LEGAL_KEYWORDS.some(kw => url.includes(kw) || title.includes(kw));
}

function showAgreementNotification() {
    // Don't show if already shown or dismissed
    if (document.getElementById('redflags-notification')) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'redflags-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 16px;
            right: 16px;
            background: #1a1a1a;
            color: #fff;
            padding: 14px 18px;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            max-width: 320px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 2147483647;
            animation: rfSlideIn 0.3s ease-out;
        ">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 18px;">⚠️</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">Legal Agreement Detected</div>
                    <div style="color: #aaa; font-size: 12px;">Click the RedFlags extension to analyze this page before agreeing.</div>
                </div>
                <button id="redflags-dismiss" style="
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>
        </div>
        <style>
            @keyframes rfSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes rfSlideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
        </style>
    `;

    document.body.appendChild(notification);

    // Dismiss button
    document.getElementById('redflags-dismiss').addEventListener('click', () => {
        notification.querySelector('div').style.animation = 'rfSlideOut 0.2s ease-in forwards';
        setTimeout(() => notification.remove(), 200);
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (document.getElementById('redflags-notification')) {
            notification.querySelector('div').style.animation = 'rfSlideOut 0.2s ease-in forwards';
            setTimeout(() => notification.remove(), 200);
        }
    }, 8000);
}

// Show notification if legal agreement detected
if (isLegalAgreementPage()) {
    // Small delay to let page settle
    setTimeout(showAgreementNotification, 1000);
}

// =====================
// CLAUSE HIGHLIGHTING
// =====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HIGHLIGHT_CLAUSE') {
        const result = highlightClauseOnPage(message.clauseText, message.riskLevel);
        sendResponse({ found: result });
    }
    return true;
});

const HIGHLIGHT_COLORS = {
    HIGH: 'rgba(255, 100, 100, 0.25)',
    MEDIUM: 'rgba(255, 200, 50, 0.3)',
    LOW: 'rgba(100, 200, 100, 0.25)'
};

function highlightClauseOnPage(clauseText, riskLevel) {
    if (!clauseText || clauseText.length < 15) return false;

    const normalizedClause = clauseText.replace(/\s+/g, ' ').trim().toLowerCase();
    const anchorLengths = [60, 40, 25, 15];

    for (const len of anchorLengths) {
        if (normalizedClause.length < len) continue;
        const anchor = normalizedClause.substring(0, len);
        const matchNode = findTextNodeContaining(anchor);
        if (matchNode) {
            scrollAndHighlight(matchNode, riskLevel);
            return true;
        }
    }

    const words = normalizedClause.split(' ').filter(w => w.length > 4);
    if (words.length >= 3) {
        const wordAnchor = words.slice(0, 4).join(' ');
        const matchNode = findTextNodeContaining(wordAnchor);
        if (matchNode) {
            scrollAndHighlight(matchNode, riskLevel);
            return true;
        }
    }

    return false;
}

function findTextNodeContaining(anchor) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        const text = node.textContent.replace(/\s+/g, ' ').toLowerCase();
        if (text.includes(anchor)) return node;
    }
    return null;
}

function scrollAndHighlight(textNode, riskLevel) {
    const parentElement = textNode.parentElement;
    if (!parentElement) return;

    parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const highlightColor = HIGHLIGHT_COLORS[riskLevel] || HIGHLIGHT_COLORS.HIGH;
    const originalBackground = parentElement.style.backgroundColor;
    const originalTransition = parentElement.style.transition;

    parentElement.style.transition = 'background-color 0.3s ease';
    parentElement.style.backgroundColor = highlightColor;

    setTimeout(() => {
        parentElement.style.backgroundColor = originalBackground;
        setTimeout(() => {
            parentElement.style.transition = originalTransition;
        }, 300);
    }, 5000);
}
