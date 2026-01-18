// Splash Screen
(function () {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');

    setTimeout(() => {
        splash.classList.add('splash-hidden');
        app.classList.remove('app-hidden');
        app.classList.add('app-visible');

        setTimeout(() => splash.remove(), 400);
    }, 1800);
})();

const API_BASE_URL = 'http://localhost:8000';

const viewInput = document.getElementById('view-input');
const viewLoading = document.getElementById('view-loading');
const viewError = document.getElementById('view-error');
const viewResults = document.getElementById('view-results');
const btnAnalyzePage = document.getElementById('btn-analyze-page');
const btnAnalyzeText = document.getElementById('btn-analyze-text');
const btnAnalyzePdf = document.getElementById('btn-analyze-pdf');
const pdfInput = document.getElementById('pdf-input');
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
let lastPdfFile = null;

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

async function analyzePdf(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/analyze-pdf/`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${response.status}`);
    }

    return await response.json();
}

async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id)
        throw new Error('No active tab found');

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body?.innerText || document.documentElement?.innerText || '',
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
    // Store data for insight interactions
    window.analysisData = data;

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

    // Populate insight panels
    const clauses = data.flags || data.flagged_clauses || [];

    // Biggest risk - find highest risk clause
    const highRiskClause = clauses.find(c => c.risk_level === 'HIGH') || clauses[0];
    const biggestRiskEl = document.getElementById('biggest-risk-content');
    if (biggestRiskEl && highRiskClause) {
        biggestRiskEl.textContent = `${highRiskClause.category}: ${highRiskClause.simple_explanation || highRiskClause.explanation}`;
    }

    // Financial impact - find clauses with money-related keywords
    const financialKeywords = ['payment', 'fee', 'cost', 'charge', 'money', 'refund', 'cancel', 'subscription', 'billing'];
    const financialClauses = clauses.filter(c => {
        const text = (c.explanation + c.user_impact).toLowerCase();
        return financialKeywords.some(kw => text.includes(kw));
    });
    const financialEl = document.getElementById('financial-impact-content');
    if (financialEl) {
        if (financialClauses.length > 0) {
            financialEl.textContent = financialClauses.map(c => c.user_impact).join(' ');
        } else {
            financialEl.textContent = 'No direct financial impact clauses detected in this analysis.';
        }
    }

    // Flagged Clauses with collapsible details
    clausesListEl.innerHTML = '';

    if (clauses.length > 0) {
        clauses.forEach((clause, idx) => {
            const li = document.createElement('li');
            li.className = 'clause-card';

            // Core visible content
            let tagsHtml = '';
            if (clause.tags && clause.tags.length > 0) {
                tagsHtml = `<div class="clause-tags">${clause.tags.map(t => `<span class="clause-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
            }

            // Hidden details (revealed on click)
            const detailId = `clause-detail-${idx}`;

            li.innerHTML = `
                <div class="clause-header">
                    <span class="clause-category">${escapeHtml(clause.category)}</span>
                    <span class="badge badge-${clause.risk_level.toLowerCase()}">${clause.risk_level}</span>
                </div>
                <p class="clause-explanation">${escapeHtml(clause.simple_explanation || clause.explanation)}</p>
                ${tagsHtml}
                <div class="clause-actions">
                    <button class="clause-action-btn" data-action="why" data-idx="${idx}">Why risky?</button>
                    <button class="clause-action-btn" data-action="example" data-idx="${idx}">Example</button>
                    <button class="clause-action-btn" data-action="tip" data-idx="${idx}">What to do</button>
                    ${lastAnalysisType === 'page' && clause.clause ? `<button class="clause-action-btn btn-view-clause" data-clause="${escapeHtml(clause.clause)}" data-risk="${clause.risk_level}">Find in page</button>` : ''}
                </div>
                <div id="${detailId}" class="clause-detail clause-detail-hidden"></div>
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

    // Insight chip click handlers
    document.querySelectorAll('.insight-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const target = chip.getAttribute('data-target');
            const panel = document.getElementById(target);

            if (target === 'give-up-section') {
                // Scroll to give up section
                document.getElementById('give-up-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            if (panel) {
                const isHidden = panel.classList.contains('hidden');
                // Hide all panels first
                document.querySelectorAll('.insight-panel').forEach(p => p.classList.add('hidden'));
                document.querySelectorAll('.insight-chip').forEach(c => c.classList.remove('active'));

                if (isHidden) {
                    panel.classList.remove('hidden');
                    chip.classList.add('active');
                }
            }
        });
    });

    // Clause action button handlers
    document.querySelectorAll('.clause-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.getAttribute('data-action');
            const idx = btn.getAttribute('data-idx');
            const clauseText = btn.getAttribute('data-clause');
            const riskLevel = btn.getAttribute('data-risk');

            // Handle "Find in page" button
            if (clauseText) {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tab?.id) return;

                    const response = await chrome.tabs.sendMessage(tab.id, {
                        type: 'HIGHLIGHT_CLAUSE',
                        clauseText: clauseText,
                        riskLevel: riskLevel
                    });

                    if (!response?.found) {
                        btn.textContent = 'Not found';
                        btn.disabled = true;
                        setTimeout(() => {
                            btn.textContent = 'Find in page';
                            btn.disabled = false;
                        }, 2000);
                    }
                } catch (error) {
                    btn.textContent = 'Unavailable';
                    btn.disabled = true;
                }
                return;
            }

            // Handle clause detail buttons
            if (action && idx !== null && window.analysisData) {
                const clauses = window.analysisData.flags || window.analysisData.flagged_clauses || [];
                const clause = clauses[parseInt(idx)];
                if (!clause) return;

                const detailEl = document.getElementById(`clause-detail-${idx}`);
                if (!detailEl) return;

                let content = '';
                switch (action) {
                    case 'why':
                        content = `<strong>Why this is risky:</strong> ${escapeHtml(clause.user_impact)}`;
                        break;
                    case 'example':
                        content = clause.example_scenario
                            ? `<strong>Example scenario:</strong> ${escapeHtml(clause.example_scenario)}`
                            : 'No example scenario available.';
                        break;
                    case 'tip':
                        content = clause.action_tip
                            ? `<strong>💡 What you can do:</strong> ${escapeHtml(clause.action_tip)}`
                            : 'No specific action tip available.';
                        break;
                }

                // Toggle visibility
                const isVisible = detailEl.classList.contains('clause-detail-visible');
                if (isVisible && detailEl.innerHTML.includes(action)) {
                    detailEl.classList.remove('clause-detail-visible');
                    detailEl.classList.add('clause-detail-hidden');
                    btn.classList.remove('active');
                } else {
                    detailEl.innerHTML = `<p style="margin-top: 12px; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">${content}</p>`;
                    detailEl.classList.remove('clause-detail-hidden');
                    detailEl.classList.add('clause-detail-visible');
                    // Update button states
                    btn.parentElement.querySelectorAll('.clause-action-btn[data-action]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            }
        });
    });
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
    pdfInput.value = '';
    lastAnalysisType = null;
    lastAnalysisText = null;
    lastPdfFile = null;
    showView('view-input');
});

// PDF Upload Handlers
btnAnalyzePdf.addEventListener('click', () => {
    pdfInput.click();
});

pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    lastAnalysisType = 'pdf';
    lastPdfFile = file;

    // Update loading text for PDF
    const statusText = document.querySelector('#view-loading .status-text');
    if (statusText) statusText.textContent = 'Analyzing PDF agreement…';

    showView('view-loading');

    try {
        const data = await analyzePdf(file);
        renderResults(data);
    } catch (error) {
        showPdfError(error.message);
    }
});

function showPdfError(message) {
    const errorText = document.querySelector('#view-error .status-text');
    const errorSubtext = document.querySelector('#view-error .status-subtext');

    if (message.includes('does not contain readable text') || message.includes('scanned')) {
        if (errorText) errorText.textContent = 'This PDF appears to be scanned or protected.';
        if (errorSubtext) errorSubtext.textContent = 'Text extraction is not supported. Please paste the text manually.';
    } else {
        if (errorText) errorText.textContent = 'Something went wrong.';
        if (errorSubtext) errorSubtext.textContent = 'The document could not be analyzed. Please try again.';
    }

    showView('view-error');
}