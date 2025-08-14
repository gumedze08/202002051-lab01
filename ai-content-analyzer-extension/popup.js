const resultsContainer = document.getElementById('results');
const confidenceEl = document.getElementById('confidence');
const scanPageBtn = document.getElementById('scanPageBtn');
const autoScanToggle = document.getElementById('autoScanToggle');

init();

async function init() {
	await restoreSettings();
	scanPageBtn.addEventListener('click', scanActivePage);
	autoScanToggle.addEventListener('change', saveSettings);
	await loadLastResults();
}

async function restoreSettings() {
	const { autoScan = false } = await chrome.storage.local.get(['autoScan']);
	autoScanToggle.checked = !!autoScan;
}

async function saveSettings() {
	await chrome.storage.local.set({ autoScan: !!autoScanToggle.checked });
}

async function loadLastResults() {
	const { lastResults = null } = await chrome.storage.session.get(['lastResults']);
	if (!lastResults) {
		confidenceEl.textContent = 'No results yet';
		resultsContainer.innerHTML = '';
		return;
	}
	renderResults(Array.isArray(lastResults) ? lastResults : [lastResults]);
}

async function scanActivePage() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) return;
	await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' });
	setTimeout(loadLastResults, 500);
}

function renderResults(items) {
	if (!items.length) {
		confidenceEl.textContent = 'No results found';
		resultsContainer.innerHTML = '';
		return;
	}

	const topScore = Math.max(...items.map(i => i.score));
	confidenceEl.textContent = `Top AI-likeness: ${Math.round(topScore * 100)}%`;

	resultsContainer.innerHTML = '';
	for (const item of items.sort((a,b) => b.score - a.score)) {
		const card = document.createElement('div');
		card.className = 'card';
		card.innerHTML = `
			<div class="title">${escapeHtml(item.title)}</div>
			<div class="preview">${escapeHtml(item.preview)}</div>
			<div class="score">Score: ${Math.round(item.score * 100)}%</div>
			<div class="reasons">${item.reasons.slice(0,6).map(r => `<span class="reason">${escapeHtml(r)}</span>`).join('')}</div>
		`;
		resultsContainer.appendChild(card);
	}
}

function escapeHtml(s) {
	return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}