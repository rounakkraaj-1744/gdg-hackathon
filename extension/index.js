// extracting the dom elements
const analyzePageBtn = document.getElementById('analyze-page-btn');
const analyzeTextBtn = document.getElementById('analyze-text-btn');
const textInput = document.getElementById('text-input');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const resultsSection = document.getElementById('results-section');
const riskScoreBadge = document.getElementById('risk-score-badge');
const clausesList = document.getElementById('clauses-list');

function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    analyzePageBtn.disabled = true;
    analyzeTextBtn.disabled = true;
}

function hideLoading() {
    loadingState.classList.add('hidden');
    analyzePageBtn.disabled = false;
    analyzeTextBtn.disabled = false;
}

function showError(message = 'Something went wrong. Please try again.') {
    hideLoading();
    errorState.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    const errorMessageEl = errorState.querySelector('.error-message');
    if (errorMessageEl)
        errorMessageEl.textContent = message;
}

function hideError() {
    errorState.classList.add('hidden');
}

function updateRiskScore(riskLevel) {
    riskScoreBadge.textContent = riskLevel;
    riskScoreBadge.className = 'risk-badge';

    switch (riskLevel) {
        case 'LOW':
            riskScoreBadge.classList.add('risk-low');
            break;
        case 'MEDIUM':
            riskScoreBadge.classList.add('risk-medium');
            break;
        case 'HIGH':
            riskScoreBadge.classList.add('risk-high');
            break;
        default:
            riskScoreBadge.classList.add('risk-medium');
    }
}

function renderClauses(clauses) {
    clausesList.innerHTML = '';

    clauses.forEach(clause => {
        const li = document.createElement('li');
        li.className = 'clause-card';

        let riskClass = 'risk-medium';
        if (clause.riskLevel === 'LOW')
            riskClass = 'risk-low';
        if (clause.riskLevel === 'HIGH')
            riskClass = 'risk-high';

        li.innerHTML = `
            <div class="clause-header">
                <span class="clause-category">${escapeHtml(clause.category)}</span>
                <span class="risk-badge ${riskClass}">${escapeHtml(clause.riskLevel)}</span>
            </div>
            <p class="clause-explanation">${escapeHtml(clause.explanation)}</p>
            ${clause.impact ? `<p class="clause-impact">${escapeHtml(clause.impact)}</p>` : ''}
        `;

        clausesList.appendChild(li);
    });
}

function showResults(results) {
    hideLoading();
    hideError();

    updateRiskScore(results.overallRisk);
    renderClauses(results.clauses);

    resultsSection.classList.remove('hidden');
}

function hideResults() {
    resultsSection.classList.add('hidden');
}

function resetUI() {
    hideLoading();
    hideError();
    hideResults();
    textInput.value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// analyse this page button
analyzePageBtn.addEventListener('click', async () => {
    // 1. use chrome.scripting.executeScript to extract page content
    // 2. send extracted content to AI analysis service
    // 3. call showResults() with the response

    console.log('Analyze Page button clicked');

    showLoading();
    // try {
    //   const pageContent = await extractPageContent();
    //   const results = await analyzeContent(pageContent);
    //   showResults(results);
    // } catch (error) {
    //   showError(error.message);
    // }
});

// analyse page text button
analyzeTextBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();

    if (!text) {
        showError('Please paste some text to analyze.');
        return;
    }

    // implement the text analysis logic here
    // 1. validate text input
    // 2. send text to AI analysis service
    // 3. call showResults() with the response

    console.log('Analyze Text button clicked');
    console.log('Text length:', text.length);

    showLoading();

    // try {
    //   const results = await analyzeContent(text);
    //   showResults(results);
    // } catch (error) {
    //   showError(error.message);
    // }
});

textInput.addEventListener('input', () => {
    hideError();
});

// extension pop up initialisation
function init() {
    // on loading reset to the initial state
    hideLoading();
    hideError();
    hideResults();

    console.log('Red Flag Scanner popup initialized');
}

document.addEventListener('DOMContentLoaded', init);