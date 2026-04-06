import { tokenizeContent } from '../utils/text-utils.js';
class TfIdfScorer {
  constructor() {
    this.idf = new Map();
    this.docCount = 0;
    this._built = false;
  }

  build(documents) {
    const df = new Map();
    this.docCount = documents.length;
    for (const doc of documents) {
      const terms = new Set(tokenizeContent(doc));
      for (const t of terms) df.set(t, (df.get(t) || 0) + 1);
    }
    for (const [term, count] of df) {
      this.idf.set(term, Math.log((this.docCount + 1) / (count + 1)) + 1);
    }
    this._built = true;
  }

  score(query, document) {
    if (!this._built) return 0;
    const qTerms = tokenizeContent(query);
    const dTerms = tokenizeContent(document);
    if (qTerms.length === 0 || dTerms.length === 0) return 0;

    const qTf = new Map();
    for (const t of qTerms) qTf.set(t, (qTf.get(t) || 0) + 1);
    const dTf = new Map();
    for (const t of dTerms) dTf.set(t, (dTf.get(t) || 0) + 1);

    let dotProduct = 0, qMag = 0, dMag = 0;
    const allTerms = new Set([...qTf.keys(), ...dTf.keys()]);
    for (const term of allTerms) {
      const idf = this.idf.get(term) || 1;
      const qWeight = (qTf.get(term) || 0) * idf;
      const dWeight = (dTf.get(term) || 0) * idf;
      dotProduct += qWeight * dWeight;
      qMag += qWeight * qWeight;
      dMag += dWeight * dWeight;
    }
    if (qMag === 0 || dMag === 0) return 0;
    return dotProduct / (Math.sqrt(qMag) * Math.sqrt(dMag));
  }
}

export { TfIdfScorer };