/* Background service worker (MV3) */

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: 'analyze-selection',
		title: 'Analyze selection for AI-generated text',
		contexts: ['selection']
	});

	chrome.contextMenus.create({
		id: 'scan-page',
		title: 'Scan page for AI-generated content',
		contexts: ['page']
	});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (!tab || !tab.id) return;
	if (info.menuItemId === 'analyze-selection') {
		chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_SELECTION' });
	}
	if (info.menuItemId === 'scan-page') {
		chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' });
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message?.type === 'OPEN_POPUP_WITH_RESULTS') {
		chrome.storage.session.set({ lastResults: message.payload || null }).then(() => {
			sendResponse({ ok: true });
		});
		return true; // keep channel open for async
	}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete') {
		try {
			const { autoScan = false } = await chrome.storage.local.get(['autoScan']);
			if (autoScan) {
				chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' });
			}
		} catch (e) {
			// ignore
		}
	}
});