const state = {
	overlay: null,
	tooltips: new Set(),
	badges: [],
	highlights: new WeakSet(),
	enabled: true
};

// Access analyzer provided by analyzer.js loaded before this script
function analyzeLocal(text) {
	if (self && self.AIAnalyzer && typeof self.AIAnalyzer.analyzeTextForAIGeneration === 'function') {
		return self.AIAnalyzer.analyzeTextForAIGeneration(text);
	}
	return { score: 0, reasons: ['Analyzer not loaded'], metrics: {} };
}

init();

function init() {
	createOverlay();
	chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
		if (!state.enabled) return;
		if (message?.type === 'ANALYZE_SELECTION') {
			analyzeSelection();
		}
		if (message?.type === 'SCAN_PAGE') {
			scanPage();
		}
		if (message?.type === 'PING') {
			// no-op
		}
	});
}

function createOverlay() {
	if (state.overlay) return state.overlay;
	const overlay = document.createElement('div');
	overlay.className = 'ai-analyzer-overlay';
	document.documentElement.appendChild(overlay);
	state.overlay = overlay;
	return overlay;
}

function analyzeSelection() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;
	const text = selection.toString();
	const result = analyzeLocal(text);
	showResultNearRange(selection.getRangeAt(0), result, 'Selection');
	chrome.runtime.sendMessage({ type: 'OPEN_POPUP_WITH_RESULTS', payload: packResult('Selection', text, result) });
}

function scanPage() {
	clearBadgesAndTooltips();
	const candidates = findTextNodesCandidates();
	const results = [];
	for (const candidate of candidates) {
		const text = candidate.textContent.trim();
		if (text.length < 160) continue;
		const result = analyzeLocal(text);
		if (result.score >= 0.55) {
			markElement(candidate, result);
			results.push(packResult(shorten(candidate), text, result));
		}
	}
	if (results.length) {
		chrome.runtime.sendMessage({ type: 'OPEN_POPUP_WITH_RESULTS', payload: results });
	}
}

function findTextNodesCandidates() {
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
		acceptNode(node) {
			const tag = node.tagName?.toLowerCase();
			if (!tag) return NodeFilter.FILTER_SKIP;
			if ([
				'script','style','noscript','iframe','canvas','svg','picture','video','audio','code','pre','kbd','samp'
			].includes(tag)) return NodeFilter.FILTER_SKIP;
			if (node.closest('[contenteditable="true"]')) return NodeFilter.FILTER_SKIP;
			const text = node.textContent || '';
			if (text.trim().length < 120) return NodeFilter.FILTER_SKIP;
			return NodeFilter.FILTER_ACCEPT;
		}
	});
	const elems = [];
	let current = walker.nextNode();
	while (current) {
		elems.push(current);
		current = walker.nextNode();
	}
	return elems;
}

function markElement(element, result) {
	if (!state.overlay) createOverlay();
	const rect = element.getBoundingClientRect();

	const badge = document.createElement('div');
	badge.className = 'ai-analyzer-badge';
	badge.textContent = `AI-likeness ${Math.round(result.score * 100)}%`;
	badge.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
	badge.style.top = `${Math.max(8, rect.top + window.scrollY)}px`;
	badge.title = result.reasons.slice(0,3).join('; ');
	badge.addEventListener('mouseenter', () => showTooltip(rect, element, result));
	badge.addEventListener('mouseleave', hideTooltips);

	state.overlay.appendChild(badge);
	state.badges.push(badge);

	try { element.classList.add('ai-analyzer-highlight'); } catch {}
}

function showResultNearRange(range, result, label) {
	const rect = range.getBoundingClientRect();
	const summary = `${label}: AI-likeness ${Math.round(result.score * 100)}%\n- ${result.reasons.slice(0,4).join('\n- ')}`;
	showTooltip(rect, null, result, summary);
}

function showTooltip(rect, element, result, overrideContent) {
	hideTooltips();
	const tip = document.createElement('div');
	tip.className = 'ai-analyzer-tooltip';
	const reasonsList = result.reasons.map(r => `• ${r}`).join('<br>');
	const html = overrideContent
		? overrideContent.replace(/\n/g, '<br>')
		: `AI-likeness: <b>${Math.round(result.score * 100)}%</b><br>${reasonsList}`;
	tip.innerHTML = html;
	tip.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
	tip.style.top = `${Math.max(8, rect.bottom + window.scrollY + 6)}px`;
	document.body.appendChild(tip);
	state.tooltips.add(tip);
}

function hideTooltips() {
	for (const tip of state.tooltips) {
		try { tip.remove(); } catch {}
	}
	state.tooltips.clear();
}

function clearBadgesAndTooltips() {
	hideTooltips();
	for (const b of state.badges) {
		try { b.remove(); } catch {}
	}
	state.badges = [];
}

function packResult(title, text, result) {
	return {
		title,
		preview: text.slice(0, 140) + (text.length > 140 ? '…' : ''),
		score: result.score,
		reasons: result.reasons,
		metrics: result.metrics
	};
}

function shorten(element) {
	const txt = (element.textContent || '').trim();
	return txt.length <= 60 ? txt : txt.slice(0, 57) + '…';
}