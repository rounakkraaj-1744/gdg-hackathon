const LEGAL_KEYWORDS = [
    'terms', 'privacy', 'policy', 'agreement', 'legal',
    'tos', 'eula', 'conditions', 'consent', 'cookie'
];
function isLegalAgreementPage(url, title) {
    const lowerUrl = (url || '').toLowerCase();
    const lowerTitle = (title || '').toLowerCase();

    return LEGAL_KEYWORDS.some(kw => lowerUrl.includes(kw) || lowerTitle.includes(kw));
}

async function updateBadgeForTab(tabId, url, title) {
    try {
        if (isLegalAgreementPage(url, title)) {
            chrome.action.setBadgeText({ text: '!', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId: tabId });
            chrome.action.setTitle({
                title: 'RedFlags - Legal agreement detected',
                tabId: tabId
            });
            console.log('[RedFlags] Legal agreement detected:', url);
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId });
            chrome.action.setTitle({ title: 'RedFlags', tabId: tabId });
        }
    } catch (e) {
        console.log('[RedFlags] Badge error:', e.message);
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        updateBadgeForTab(tabId, tab.url, tab.title);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            updateBadgeForTab(tab.id, tab.url, tab.title);
        }
    } catch (e) {
        console.log('[RedFlags] Tab get error:', e.message);
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[RedFlags] Service worker started');
});

console.log('[RedFlags] Background script loaded');