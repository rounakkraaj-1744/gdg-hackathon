// RedFlags Content Script
// Listens for messages from the popup to highlight clauses on the page

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HIGHLIGHT_CLAUSE') {
        const result = highlightClauseOnPage(message.clauseText, message.riskLevel);
        sendResponse({ found: result });
    }
    return true;
});

// Risk-based highlight colors
const HIGHLIGHT_COLORS = {
    HIGH: 'rgba(255, 100, 100, 0.25)',    // Red
    MEDIUM: 'rgba(255, 200, 50, 0.3)',    // Yellow/Amber
    LOW: 'rgba(100, 200, 100, 0.25)'      // Green
};

/**
 * Attempts to find and highlight a clause on the page.
 * Uses multiple matching strategies for best-effort matching.
 */
function highlightClauseOnPage(clauseText, riskLevel) {
    if (!clauseText || clauseText.length < 15) return false;

    // Normalize text for matching
    const normalizedClause = clauseText.replace(/\s+/g, ' ').trim().toLowerCase();

    // Try multiple anchor lengths for flexible matching
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

    // Try matching any significant word sequence (last resort)
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

/**
 * Searches for a text node containing the anchor string.
 */
function findTextNodeContaining(anchor) {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while ((node = walker.nextNode())) {
        const text = node.textContent.replace(/\s+/g, ' ').toLowerCase();
        if (text.includes(anchor)) {
            return node;
        }
    }
    return null;
}

/**
 * Scrolls to and highlights the parent element of a text node.
 * Uses risk-level-based colors.
 */
function scrollAndHighlight(textNode, riskLevel) {
    const parentElement = textNode.parentElement;
    if (!parentElement) return;

    // Scroll into view
    parentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    // Get highlight color based on risk level
    const highlightColor = HIGHLIGHT_COLORS[riskLevel] || HIGHLIGHT_COLORS.HIGH;

    // Apply temporary highlight
    const originalBackground = parentElement.style.backgroundColor;
    const originalTransition = parentElement.style.transition;

    parentElement.style.transition = 'background-color 0.3s ease';
    parentElement.style.backgroundColor = highlightColor;

    // Remove highlight after 5 seconds
    setTimeout(() => {
        parentElement.style.backgroundColor = originalBackground;
        setTimeout(() => {
            parentElement.style.transition = originalTransition;
        }, 300);
    }, 5000);
}
