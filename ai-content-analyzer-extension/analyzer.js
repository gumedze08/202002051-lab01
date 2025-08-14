// Lightweight, on-device heuristics. No network calls.
// Returns { score: 0..1, reasons: string[], metrics: {...} }

function analyzeTextForAIGeneration(inputText, options = {}) {
	const text = (inputText || '').trim();
	if (!text) {
		return emptyResult('Empty text');
	}

	const normalized = normalizeWhitespace(text);
	const sentences = splitIntoSentences(normalized);
	const words = normalized.split(/\s+/);

	const metrics = {
		charCount: normalized.length,
		wordCount: words.length,
		sentenceCount: sentences.length,
		avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
		uppercaseRate: computeUppercaseRate(normalized),
		digitRate: computeDigitRate(normalized),
		punctuationRate: computePunctuationRate(normalized),
		repetitiveness: computeRepetitiveness(words),
		rareWordRate: computeRareWordRate(words),
		burstiness: computeBurstiness(sentences),
		perplexityProxy: computePerplexityProxy(words),
	};

	const reasons = [];
	let score = 0;

	if (metrics.wordCount < 30) {
		reasons.push('Very short text; low confidence');
		score += 0.05;
	}

	if (metrics.avgSentenceLength >= 18 && metrics.avgSentenceLength <= 28) {
		reasons.push('Consistent medium-long sentence length');
		score += scale(metrics.avgSentenceLength, 18, 28) * 0.15;
	}

	if (metrics.repetitiveness > 0.14) {
		reasons.push('Noticeable repetition of words/phrases');
		score += clamp((metrics.repetitiveness - 0.14) / 0.2, 0, 1) * 0.25;
	}

	if (metrics.perplexityProxy < 0.42) {
		reasons.push('Low lexical diversity');
		score += clamp((0.42 - metrics.perplexityProxy) / 0.42, 0, 1) * 0.2;
	}

	if (metrics.burstiness < 0.28) {
		reasons.push('Uniform sentence structure (low burstiness)');
		score += clamp((0.28 - metrics.burstiness) / 0.28, 0, 1) * 0.2;
	}

	if (metrics.rareWordRate < 0.06) {
		reasons.push('Few rare or domain-specific words');
		score += clamp((0.06 - metrics.rareWordRate) / 0.06, 0, 1) * 0.1;
	}

	if (metrics.punctuationRate > 0.08) {
		reasons.push('High punctuation density');
		score += clamp((metrics.punctuationRate - 0.08) / 0.12, 0, 1) * 0.1;
	}

	if (metrics.uppercaseRate < 0.02) {
		reasons.push('Very low uppercase usage');
		score += clamp((0.02 - metrics.uppercaseRate) / 0.02, 0, 1) * 0.05;
	}

	score = clamp(score, 0, 1);

	return {
		score,
		reasons,
		metrics
	};
}

function emptyResult(reason) {
	return { score: 0, reasons: [reason], metrics: {} };
}

function normalizeWhitespace(text) {
	return text.replace(/[\r\t\f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function splitIntoSentences(text) {
	const raw = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/);
	return raw.filter(Boolean);
}

function computeUppercaseRate(text) {
	const letters = text.match(/[A-Za-z]/g) || [];
	const uppers = text.match(/[A-Z]/g) || [];
	return letters.length ? uppers.length / letters.length : 0;
}

function computeDigitRate(text) {
	const digits = text.match(/[0-9]/g) || [];
	return text.length ? digits.length / text.length : 0;
}

function computePunctuationRate(text) {
	const punct = text.match(/[.,;:!?"'()\-—]/g) || [];
	return text.length ? punct.length / text.length : 0;
}

function computeRepetitiveness(words) {
	if (words.length === 0) return 0;
	const lower = words.map(w => w.toLowerCase());
	const freq = new Map();
	for (const w of lower) {
		freq.set(w, (freq.get(w) || 0) + 1);
	}
	const counts = Array.from(freq.values());
	const maxCount = Math.max(...counts);
	return maxCount / words.length;
}

function computeRareWordRate(words) {
	if (words.length === 0) return 0;
	const lower = words.map(w => w.toLowerCase().replace(/[^a-z']/g, ''));
	let rare = 0;
	for (const w of lower) {
		if (!w) continue;
		if (!COMMON_WORDS.has(w)) rare++;
	}
	return rare / lower.length;
}

function computeBurstiness(sentences) {
	if (sentences.length < 2) return 0;
	const lengths = sentences.map(s => (s.trim().split(/\s+/).length));
	const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
	const variance = lengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / lengths.length;
	const stddev = Math.sqrt(variance);
	return mean ? stddev / mean : 0;
}

function computePerplexityProxy(words) {
	if (words.length === 0) return 0;
	const lower = words.map(w => w.toLowerCase());
	const unique = new Set(lower);
	return unique.size / Math.sqrt(words.length);
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

function scale(n, a, b) {
	if (n <= a) return 0;
	if (n >= b) return 1;
	return (n - a) / (b - a);
}

const COMMON_WORDS = new Set([
	"the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"
]);

// Expose for content scripts loaded as classic scripts
if (typeof self !== 'undefined') {
	self.AIAnalyzer = { analyzeTextForAIGeneration };
}