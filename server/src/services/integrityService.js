/**
 * Submission Integrity Service (Phase 8)
 * 100% FREE, LOCAL, and OFFLINE
 * No external APIs, no API keys, no paid services.
 */

/**
 * Normalise text: lowercase, strip punctuation and extra spaces
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract word tokens
 */
function tokenizeWords(normText) {
  if (!normText) return [];
  return normText.split(' ').filter(Boolean);
}

/**
 * Extract word n-gram shingles (default 5-gram)
 * Optional excludedSet: ignore shingles appearing in prompt/description
 */
function extractWordShingles(normText, n = 5, excludedSet = null) {
  const words = tokenizeWords(normText);
  if (words.length < n) {
    if (words.length === 0) return [];
    // If text is short, return full string as single shingle if not excluded
    const shortShingle = words.join(' ');
    if (excludedSet && excludedSet.has(shortShingle)) return [];
    return [shortShingle];
  }

  const shingles = [];
  for (let i = 0; i <= words.length - n; i++) {
    const shingle = words.slice(i, i + n).join(' ');
    if (excludedSet && excludedSet.has(shingle)) {
      continue;
    }
    shingles.push(shingle);
  }
  return shingles;
}

/**
 * Build description shingles set to ignore prompt boilerplate
 */
function buildDescriptionShinglesSet(assignmentTitle, assignmentDescription) {
  const descText = `${assignmentTitle || ''} ${assignmentDescription || ''}`.trim();
  if (!descText) return new Set();

  const normDesc = normalizeText(descText);
  // Include both 4-grams and 5-grams from description to catch boilerplate quotes
  const s5 = extractWordShingles(normDesc, 5);
  const s4 = extractWordShingles(normDesc, 4);
  return new Set([...s5, ...s4]);
}

/**
 * Compute Jaccard similarity on shingles
 */
function computeJaccard(shinglesA, shinglesB) {
  const setA = new Set(shinglesA);
  const setB = new Set(shinglesB);

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  if (unionSize === 0) return 0;

  return intersectionCount / unionSize;
}

/**
 * Compute Cosine similarity on word frequencies
 */
function computeCosine(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const freqA = Object.create(null);
  const freqB = Object.create(null);

  for (const w of wordsA) {
    freqA[w] = (freqA[w] || 0) + 1;
  }
  for (const w of wordsB) {
    freqB[w] = (freqB[w] || 0) + 1;
  }

  let dotProduct = 0;
  for (const w in freqA) {
    if (freqB[w]) {
      dotProduct += freqA[w] * freqB[w];
    }
  }

  let normASq = 0;
  for (const w in freqA) {
    normASq += freqA[w] * freqA[w];
  }

  let normBSq = 0;
  for (const w in freqB) {
    normBSq += freqB[w] * freqB[w];
  }

  const denominator = Math.sqrt(normASq) * Math.sqrt(normBSq);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find up to 5 top matching passages between two texts
 * Identifies sequences of overlapping word 5-grams and merges contiguous matches
 */
function extractMatchingPassages(normTextA, normTextB, excludedSet, maxPassages = 5) {
  const wordsA = tokenizeWords(normTextA);
  const wordsB = tokenizeWords(normTextB);

  if (wordsA.length < 5 || wordsB.length < 5) {
    return [];
  }

  // Map 5-grams in B to their starting indexes
  const bShingleMap = new Map();
  for (let j = 0; j <= wordsB.length - 5; j++) {
    const shingle = wordsB.slice(j, j + 5).join(' ');
    if (excludedSet && excludedSet.has(shingle)) continue;
    if (!bShingleMap.has(shingle)) {
      bShingleMap.set(shingle, []);
    }
    bShingleMap.get(shingle).push(j);
  }

  // Find contiguous matches along text A
  const rawPassages = [];
  let i = 0;
  while (i <= wordsA.length - 5) {
    const shingle = wordsA.slice(i, i + 5).join(' ');
    if (bShingleMap.has(shingle)) {
      const matchJ = bShingleMap.get(shingle)[0];
      // Expand match as far as words continue to match
      let len = 5;
      while (
        i + len < wordsA.length &&
        matchJ + len < wordsB.length &&
        wordsA[i + len] === wordsB[matchJ + len]
      ) {
        len++;
      }

      const matchText = wordsA.slice(i, i + len).join(' ');
      // Verify not just boilerplate
      if (!excludedSet || !excludedSet.has(matchText)) {
        // Snippet context
        const startA = Math.max(0, i - 3);
        const endA = Math.min(wordsA.length, i + len + 3);
        const startB = Math.max(0, matchJ - 3);
        const endB = Math.min(wordsB.length, matchJ + len + 3);

        rawPassages.push({
          match_text: matchText,
          word_count: len,
          passage_a: wordsA.slice(startA, endA).join(' '),
          passage_b: wordsB.slice(startB, endB).join(' ')
        });
      }
      i += len;
    } else {
      i++;
    }
  }

  // Sort by word count descending, take top unique passages
  rawPassages.sort((a, b) => b.word_count - a.word_count);

  const topPassages = [];
  const seenPassages = new Set();
  for (const p of rawPassages) {
    if (seenPassages.has(p.match_text)) continue;
    // Check if substring of already chosen passage
    let isSubset = false;
    for (const chosen of topPassages) {
      if (chosen.match_text.includes(p.match_text)) {
        isSubset = true;
        break;
      }
    }
    if (!isSubset) {
      topPassages.push(p);
      seenPassages.add(p.match_text);
      if (topPassages.length >= maxPassages) break;
    }
  }

  return topPassages;
}

/**
 * Compute pairwise similarity between two checkable submissions
 * Returns: { similarity_score, jaccard_score, cosine_score, matched_passages }
 */
function computePairSimilarity(textA, textB, assignmentTitle = '', assignmentDesc = '') {
  if (!textA || !textB) {
    return {
      similarity_score: 0,
      jaccard_score: 0,
      cosine_score: 0,
      matched_passages: []
    };
  }

  const normA = normalizeText(textA);
  const normB = normalizeText(textB);
  const excludedSet = buildDescriptionShinglesSet(assignmentTitle, assignmentDesc);

  const shinglesA = extractWordShingles(normA, 5, excludedSet);
  const shinglesB = extractWordShingles(normB, 5, excludedSet);

  const wordsA = tokenizeWords(normA);
  const wordsB = tokenizeWords(normB);

  const jaccard = computeJaccard(shinglesA, shinglesB);
  const cosine = computeCosine(wordsA, wordsB);

  // Combined score (0 - 100)
  // Jaccard captures verbatim phrase sharing; Cosine captures vocabulary distribution
  let combined = (0.5 * jaccard + 0.5 * cosine) * 100;

  // Round to 1 decimal place
  const similarityScore = Math.min(100, Math.max(0, Math.round(combined * 10) / 10));

  const matchedPassages = extractMatchingPassages(normA, normB, excludedSet, 5);

  return {
    similarity_score: similarityScore,
    jaccard_score: Math.round(jaccard * 1000) / 1000,
    cosine_score: Math.round(cosine * 1000) / 1000,
    matched_passages: matchedPassages
  };
}

/**
 * Risk classification:
 * below 30 = Low, 30 to 59 = Medium, 60 and above = High
 */
function classifyRisk(similarityScore) {
  if (similarityScore === null || similarityScore === undefined) return 'Not checkable';
  if (similarityScore < 30) return 'Low';
  if (similarityScore < 60) return 'Medium';
  return 'High';
}

/**
 * AI-likelihood (advisory only, LOCAL heuristics, no external API)
 * Scores 0 to 100 based on:
 * - sentence length variance (burstiness)
 * - vocabulary repetition (Type-Token Ratio)
 * - common AI filler phrases
 * - uniform paragraph structure
 * Very short texts (under 100 words) return "Too short to estimate"
 */
function computeAiLikelihood(text) {
  const disclaimer = 'AI detection is not reliable. Use this only as a hint and review the work yourself.';

  if (!text || typeof text !== 'string') {
    return {
      score: null,
      label: 'Too short to estimate',
      is_short: true,
      disclaimer,
      details: null
    };
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 100) {
    return {
      score: null,
      label: 'Too short to estimate',
      is_short: true,
      disclaimer,
      details: { word_count: words.length }
    };
  }

  // 1. Sentence length variance (Burstiness)
  // AI tends to produce uniform sentence lengths (low variance)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  let burstinessScore = 50;
  let sentenceLengthCv = 0.5;

  if (sentences.length >= 2) {
    const sLens = sentences.map((s) => s.split(/\s+/).length);
    const meanLen = sLens.reduce((a, b) => a + b, 0) / sLens.length;
    const variance = sLens.reduce((sum, len) => sum + Math.pow(len - meanLen, 2), 0) / sLens.length;
    const sd = Math.sqrt(variance);
    sentenceLengthCv = meanLen > 0 ? sd / meanLen : 0;

    // Low CV (<0.30) indicates robotic consistency
    if (sentenceLengthCv <= 0.25) {
      burstinessScore = 88;
    } else if (sentenceLengthCv <= 0.40) {
      burstinessScore = 72;
    } else if (sentenceLengthCv <= 0.55) {
      burstinessScore = 48;
    } else if (sentenceLengthCv <= 0.70) {
      burstinessScore = 28;
    } else {
      burstinessScore = 12; // High burstiness is typical of human writing
    }
  }

  // 2. Vocabulary Repetition / Type-Token Ratio
  const cleanTokens = words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')).filter(Boolean);
  const uniqueCount = new Set(cleanTokens).size;
  const ttr = cleanTokens.length > 0 ? uniqueCount / cleanTokens.length : 0.5;
  let ttrScore = 40;
  if (ttr >= 0.52 && ttr <= 0.68) {
    // Typical uniform AI lexical diversity
    ttrScore = 65;
  } else if (ttr < 0.45) {
    ttrScore = 75; // repetitive
  } else {
    ttrScore = 25; // wide natural human vocabulary
  }

  // 3. Common AI filler phrases
  const lowerText = text.toLowerCase();
  const aiPhrases = [
    'in conclusion',
    'it is important to note',
    'it is crucial to note',
    'it is worth noting',
    'delve into',
    'delves into',
    'delving into',
    'furthermore',
    'moreover',
    'in summary',
    'testament to',
    'plays a pivotal role',
    'beacon of',
    'underscores the importance',
    'fosters a sense of',
    'serves as a reminder',
    'comprehensive overview',
    'pivotal aspect'
  ];

  let phraseMatches = 0;
  const matchedPhrasesList = [];
  for (const phrase of aiPhrases) {
    const matches = lowerText.split(phrase).length - 1;
    if (matches > 0) {
      phraseMatches += matches;
      matchedPhrasesList.push(phrase);
    }
  }

  let phraseScore = 15;
  if (phraseMatches >= 4) {
    phraseScore = 92;
  } else if (phraseMatches === 3) {
    phraseScore = 78;
  } else if (phraseMatches === 2) {
    phraseScore = 58;
  } else if (phraseMatches === 1) {
    phraseScore = 38;
  }

  // 4. Uniform paragraph structure
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  let paraScore = 40;
  if (paragraphs.length >= 2) {
    const pLens = paragraphs.map((p) => p.split(/\s+/).length);
    const meanPara = pLens.reduce((a, b) => a + b, 0) / pLens.length;
    const paraVariance = pLens.reduce((sum, len) => sum + Math.pow(len - meanPara, 2), 0) / pLens.length;
    const paraCv = meanPara > 0 ? Math.sqrt(paraVariance) / meanPara : 0;

    if (paraCv <= 0.20) {
      paraScore = 80;
    } else if (paraCv <= 0.35) {
      paraScore = 55;
    } else {
      paraScore = 20;
    }
  }

  // Combine components into 0-100 score
  const rawScore = 0.35 * burstinessScore + 0.35 * phraseScore + 0.15 * paraScore + 0.15 * ttrScore;
  const finalScore = Math.min(95, Math.max(5, Math.round(rawScore)));

  return {
    score: finalScore,
    label: 'Heuristic estimate',
    is_short: false,
    disclaimer,
    details: {
      burstiness_cv: Math.round(sentenceLengthCv * 100) / 100,
      phrase_matches: phraseMatches,
      matched_phrases: matchedPhrasesList.slice(0, 4),
      ttr: Math.round(ttr * 100) / 100,
      word_count: words.length
    }
  };
}

module.exports = {
  normalizeText,
  tokenizeWords,
  extractWordShingles,
  buildDescriptionShinglesSet,
  computeJaccard,
  computeCosine,
  extractMatchingPassages,
  computePairSimilarity,
  classifyRisk,
  computeAiLikelihood
};
