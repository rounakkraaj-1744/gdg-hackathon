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
const riskDefinitionEl = document.getElementById('risk-definition');
const giveUpListEl = document.getElementById('give-up-list');
const riskPatternsListEl = document.getElementById('risk-patterns-list');
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
    const response = await fetch(`${API_BASE_URL}/analyze/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
    });

    if (!response.ok)
        throw new Error(`API error: ${response.status}`);

    return await response.json();
}

async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id)
        throw new Error('No active tab found');

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText || document.body.textContent || '',
    });

    if (!results || results.length === 0 || !results[0].result)
        throw new Error('Could not extract page content');

    return results[0].result.trim();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRiskDefinition(riskLevel, riskScore) {
    const definitions = {
        HIGH: 'This document contains clauses that may significantly affect your rights or data.',
        MEDIUM: 'This document contains some clauses that warrant attention.',
        LOW: 'This document appears to have standard terms with limited risk.'
    };
    let definition = definitions[riskLevel] || '';
    if (riskScore !== undefined) {
        definition += ` Risk score: ${riskScore}/100.`;
    }
    return definition;
}

function renderResults(data) {
    // Overall Risk
    overallRiskEl.textContent = data.overall_risk;
    overallRiskEl.className = `badge badge-${data.overall_risk.toLowerCase()}`;

    // Risk Definition
    riskDefinitionEl.textContent = getRiskDefinition(data.overall_risk, data.risk_score);

    // What You Give Up
    giveUpListEl.innerHTML = '';
    if (data.what_you_give_up && data.what_you_give_up.length > 0) {
        data.what_you_give_up.slice(0, 3).forEach(item => {
            const li = document.createElement('li');
            li.className = 'give-up-item';
            li.textContent = item;
            giveUpListEl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'give-up-item';
        li.textContent = 'No significant concerns identified.';
        giveUpListEl.appendChild(li);
    }

    // Risk Patterns
    riskPatternsListEl.innerHTML = '';
    if (data.risk_patterns && data.risk_patterns.length > 0) {
        data.risk_patterns.forEach(pattern => {
            const li = document.createElement('li');
            li.className = 'risk-pattern-item';
            li.textContent = pattern;
            riskPatternsListEl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'risk-pattern-item';
        li.textContent = 'None detected';
        riskPatternsListEl.appendChild(li);
    }

    // Flagged Clauses (backend uses "flags")
    clausesListEl.innerHTML = '';
    const clauses = data.flags || data.flagged_clauses || [];

    if (clauses.length > 0) {
        clauses.forEach(clause => {
            const li = document.createElement('li');
            li.className = 'clause-card';

            // Build tags HTML if available
            let tagsHtml = '';
            if (clause.tags && clause.tags.length > 0) {
                tagsHtml = `<div class="clause-tags">${clause.tags.map(t => `<span class="clause-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
            }

            // Build action tip HTML if available
            let actionTipHtml = '';
            if (clause.action_tip) {
                actionTipHtml = `<p class="clause-action-tip"><span class="clause-action-label">💡 Tip:</span> ${escapeHtml(clause.action_tip)}</p>`;
            }

            li.innerHTML = `
                <div class="clause-header">
                    <span class="clause-category">${escapeHtml(clause.category)}</span>
                    <span class="badge badge-${clause.risk_level.toLowerCase()}">${clause.risk_level}</span>
                </div>
                <p class="clause-explanation">${escapeHtml(clause.simple_explanation || clause.explanation)}</p>
                <p class="clause-impact"><span class="clause-impact-label">Possible impact:</span> ${escapeHtml(clause.user_impact)}</p>
                ${actionTipHtml}
                ${tagsHtml}
            `;
            clausesListEl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'clause-card';
        li.innerHTML = '<p class="clause-explanation">No flagged clauses found.</p>';
        clausesListEl.appendChild(li);
    }

    showView('view-results');
}

async function handleAnalysis(text, type) {
    lastAnalysisType = type;
    lastAnalysisText = text;
    showView('view-loading');

    try {
        const data = await analyzeText(text);
        renderResults(data);
    } catch (error) {
        showView('view-error');
    }
}

btnAnalyzePage.addEventListener('click', async () => {
    showView('view-loading');

    try {
        const pageText = await getPageContent();

        if (!pageText || pageText.length < 50)
            throw new Error('Page content too short');

        await handleAnalysis(pageText, 'page');
    } catch (error) {
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
        alert('Please paste more text for accurate analysis.');
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