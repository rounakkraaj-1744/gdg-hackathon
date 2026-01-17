// Content script to extract page text
// This runs in the context of the active tab

(function () {
    // Get all text content from the page body
    const pageText = document.body.innerText || document.body.textContent || '';

    // Return the extracted text (Chrome scripting API will capture this)
    return pageText.trim();
})();
