import express, { Request, Response } from 'express';
import localFaqs from '../data/faq.json';

const router = express.Router();

// === Tokenize a string into lowercase words ===
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

// === Compute Term Frequency (TF) ===
function termFreq(terms: string[]): { [key: string]: number } {
  const tf: { [key: string]: number } = {};
  const count = terms.length;
  for (const term of terms) {
    tf[term] = (tf[term] || 0) + 1;
  }
  for (const term in tf) {
    tf[term] = tf[term] / count;
  }
  return tf;
}

// === Compute Inverse Document Frequency (IDF) ===
function computeIDF(docs: string[]): { [key: string]: number } {
  const idf: { [key: string]: number } = {};
  const totalDocs = docs.length;

  for (const doc of docs) {
    const uniqueTerms = new Set(tokenize(doc));
    for (const term of uniqueTerms) {
      idf[term] = (idf[term] || 0) + 1;
    }
  }

  for (const term in idf) {
    idf[term] = Math.log(totalDocs / (idf[term]));
  }

  return idf;
}

// === Convert TF to TF-IDF vector ===
function tfidfVector(tf: { [key: string]: number }, idf: { [key: string]: number }, vocab: string[]): number[] {
  return vocab.map(term => (tf[term] || 0) * (idf[term] || 0));
}

// === Cosine similarity between two vectors ===
function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0, mag1 = 0, mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

// === Load FAQs (can be async if from DB) ===
async function getFaqs(): Promise<{ question: string; answer: string; }[]> {
  return localFaqs;
}

// === Main Route ===
router.post('/query', async (req: Request, res: Response) => {
  const q = (req.body.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Empty query' });

  const faqs = await getFaqs();
  const questions = faqs.map(f => f.question);

  // 1. Compute IDF from questions (not including query)
  const idf = computeIDF(questions);
  const vocab = Object.keys(idf);

  // 2. Build TF for FAQ questions and the query
  const tfDocs = questions.map(q => termFreq(tokenize(q)));
  const tfQuery = termFreq(tokenize(q));

  // 3. Convert query and questions to TF-IDF vectors
  const queryVec = tfidfVector(tfQuery, idf, vocab);

  const scores = tfDocs.map((tf, i) => {
    const docVec = tfidfVector(tf, idf, vocab);
    return {
      index: i,
      score: cosineSimilarity(queryVec, docVec)
    };
  });

  // 4. Sort scores by similarity
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const CONF_THRESHOLD = 0.2;

  // 5. If best match is strong enough, return answer
  if (best && best.score >= CONF_THRESHOLD) {
    const matchedFaq = faqs[best.index];
    return res.json({
      answer: matchedFaq.answer,
      source: 'faq',
      confidence: best.score
    });
  }

  // 6. Otherwise return top 3 relevant suggestions (filtering low scores)
  const suggestions = scores
    .filter(s => s.score > 0.05)
    .slice(0, 3)
    .map(s => ({
      question: faqs[s.index].question,
      score: s.score
    }));

  return res.json({
    answer: null,
    suggestions,
    confidence: best ? best.score : 0
  });
});

export default router;