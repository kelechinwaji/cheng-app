function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[₦NGN\s]/gi, '')
    .replace(/,/g, '')
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectType(text) {
  const t = text.toLowerCase();
  if (
    /\bcredit(?:ed)?\b/.test(t) ||
    /\binflow\b/.test(t) ||
    /\breceived\b/.test(t) ||
    /\bdeposit\b/.test(t)
  ) {
    return 'credit';
  }
  if (
    /\bdebit(?:ed)?\b/.test(t) ||
    /\boutflow\b/.test(t) ||
    /\bpaid\b/.test(t) ||
    /\bpurchase\b/.test(t) ||
    /\bwithdraw(?:al)?\b/.test(t)
  ) {
    return 'debit';
  }
  return null;
}

const AMOUNT_PATTERNS = [
  /(?:amount|sum|value)[:\s]+(?:₦|NGN)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:₦|NGN)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /\b([\d,]+(?:\.\d{1,2})?)\s*(?:₦|NGN)\b/i,
];

function extractAmount(text) {
  for (const re of AMOUNT_PATTERNS) {
    const m = text.match(re);
    const amt = parseAmount(m?.[1]);
    if (amt) return amt;
  }
  return null;
}

const DATE_PATTERNS = [
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)/,
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/,
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4},?\s+\d{1,2}:\d{2})/i,
];

function extractDate(text, fallbackIso) {
  for (const re of DATE_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }
  return fallbackIso;
}

const DESC_PATTERNS = [
  /(?:narration|description|remark|remarks|details|purpose|merchant|beneficiary)[:\s]+(.{3,200}?)(?:\.|$|\n)/i,
  /(?:for|to)\s+(.{3,120}?)(?:\.|$|\n)/i,
];

function extractDescription(text) {
  for (const re of DESC_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      return m[1].replace(/\s+/g, ' ').trim().slice(0, 200);
    }
  }
  const subjectLine = text.split('\n')[0]?.trim();
  return subjectLine?.slice(0, 200) || 'Bank transaction';
}

module.exports = {
  stripHtml,
  parseAmount,
  detectType,
  extractAmount,
  extractDate,
  extractDescription,
};
