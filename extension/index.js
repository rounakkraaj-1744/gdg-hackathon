// DOM Elements
const viewInput = document.getElementById('view-input');
const viewLoading = document.getElementById('view-loading');
const viewError = document.getElementById('view-error');
const viewResults = document.getElementById('view-results');

const btnAnalyzePage = document.getElementById('btn-analyze-page');
const btnAnalyzeText = document.getElementById('btn-analyze-text');
const btnRetry = document.getElementById('btn-retry');
const btnNewAnalysis = document.getElementById('btn-new-analysis');
const textInput = document.getElementById('text-input');

// View Management
function showView(viewId) {
    viewInput.classList.add('hidden');
    viewLoading.classList.add('hidden');
    viewError.classList.add('hidden');
    viewResults.classList.add('hidden');

    document.getElementById(viewId).classList.remove('hidden');
}

// Event Listeners
btnAnalyzePage.addEventListener('click', () => {
    showView('view-loading');

    // Simulate loading then show results
    setTimeout(() => {
        showView('view-results');
    }, 1500);
});

btnAnalyzeText.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (!text) {
        alert('Please paste some text to analyze.');
        return;
    }

    showView('view-loading');

    setTimeout(() => {
        showView('view-results');
    }, 1500);
});

btnRetry.addEventListener('click', () => {
    showView('view-input');
});

btnNewAnalysis.addEventListener('click', () => {
    textInput.value = '';
    showView('view-input');
});