# AI Content Analyzer (Chrome Extension)

A Chrome (MV3) extension that analyzes on-page text with lightweight, on-device heuristics to estimate AI-generated likelihood. No network calls.

## Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and select this folder.

## Features

- Context menu to analyze selection or scan the entire page
- Popup to show latest results and trigger scans
- Visual overlays highlighting likely AI-generated sections
- On-device heuristics (no data leaves your browser)
- Optional autoscan on page load

## Files

- `manifest.json`: MV3 configuration
- `background.js`: Context menus, autoscan, message broker
- `content.js`: Injects overlay, scans page, shows badges and tooltips
- `analyzer.js`: Heuristics scorer exposed as `window.AIAnalyzer`
- `content.css`: Styles for overlay and highlights
- `popup.html`, `popup.css`, `popup.js`: Popup UI

## Notes

- Heuristics are indicative, not definitive. False positives/negatives are possible.
- You can tune thresholds in `content.js` (e.g., minimum text length, score cutoff) and adjust weights in `analyzer.js`.