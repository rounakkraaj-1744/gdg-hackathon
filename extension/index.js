const API_BASE_URL = 'http://localhost:8000';

const viewInput = document.getElementById('view-input');
const viewLoading = document.getElementById('view-loading');
const viewError = document.getElementById('view-error');
const viewResults = document.getElementById('view-results');
const btnAnalyzePage = document.getElementById('btn-analyze-page');
const btnAnalyzeText = document.getElementById('btn-analyze-text');
const btnRetry = document.getElementById('btn-retry');
const btnNewAnalysis = document.getElementById('btn-new-analysis');
const textInput = document.getElementById('text-input');
const overallRiskEl = document.getElementById('overall-risk');
const summaryListEl = document.getElementById('summary-list');
const clausesListEl = document.getElementById('clauses-list');

let lastAnalysisType = null;
let lastAnalysisText = null;

function showView(viewId) {
    viewInput.classList.add('hidden');
    viewLoading.classList.add('hidden');
    viewError.classList.add('hidden');
    viewResults.classList.add('hidden');

    document.getElementById(viewId).classList.remove('hidden');
}

async function analyzeText(text) {
    console.log('Sending analysis request for text length:', text.length);
    try {
        const response = await fetch(`${API_BASE_URL}/analyze/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

async function getPageContent() {
    console.log('Extracting page content...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
        throw new Error('No active tab found');
    }

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            return document.body.innerText || document.body.textContent || '';
        },
    });

    if (!results || results.length === 0 || !results[0].result)
        throw new Error('Could not extract page content');

    return results[0].result.trim();
}

function renderResults(data) {
    overallRiskEl.textContent = data.overall_risk;
    overallRiskEl.className = `badge badge-${data.overall_risk.toLowerCase()}`;

    summaryListEl.innerHTML = '';
    if (data.summary && data.summary.length > 0) {
        data.summary.forEach(item => {
            const li = document.createElement('li');
            li.className = 'summary-item';
            li.textContent = item;
            summaryListEl.appendChild(li);
        });
    }

    clausesListEl.innerHTML = '';
    if (data.flags && data.flags.length > 0) {
        data.flags.forEach(flag => {
            const li = document.createElement('li');
            li.className = 'clause-card';
            li.innerHTML = `
                <div class="clause-header">
                    <span class="clause-category">${escapeHtml(flag.category)}</span>
                    <span class="badge badge-${flag.risk_level.toLowerCase()}">${flag.risk_level}</span>
                </div>
                <p class="clause-text">${escapeHtml(flag.explanation)}</p>
                <p class="clause-impact"><strong>Impact:</strong> ${escapeHtml(flag.user_impact)}</p>
            `;
            clausesListEl.appendChild(li);
        });
    } else {
        clausesListEl.innerHTML = '<li class="clause-card"><p class="clause-text">No risky clauses detected.</p></li>';
    }

    showView('view-results');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleAnalysis(text, type) {
    lastAnalysisType = type;
    lastAnalysisText = text;

    showView('view-loading');

    try {
        const data = await analyzeText(text);
        renderResults(data);
    }
    catch (error) {
        console.error('Analysis failed:', error);
        showView('view-error');
    }
}

btnAnalyzePage.addEventListener('click', async () => {
    showView('view-loading');

    try {
        const pageText = await getPageContent();

        if (!pageText || pageText.length < 50) {
            throw new Error('Page content too short to analyze');
        }

        await handleAnalysis(pageText, 'page');
    } catch (error) {
        console.error('Failed to get page content:', error);
        showView('view-error');
    }
});

btnAnalyzeText.addEventListener('click', async () => {
    const text = textInput.value.trim();

    if (!text) {
        alert('Please paste some text to analyze.');
        return;
    }

    if (text.length < 50) {
        alert('Please paste more text for accurate analysis (at least 50 characters).');
        return;
    }

    await handleAnalysis(text, 'text');
});

btnRetry.addEventListener('click', async () => {
    if (lastAnalysisType === 'page')
        btnAnalyzePage.click();
    else if (lastAnalysisType === 'text' && lastAnalysisText)
        await handleAnalysis(lastAnalysisText, 'text');
    else
        showView('view-input');
});

btnNewAnalysis.addEventListener('click', () => {
    textInput.value = '';
    lastAnalysisType = null;
    lastAnalysisText = null;
    showView('view-input');
});