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

const MONTH_MAP = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Stanbic: 16-Oct-2026 14:45:48 */
function parseStanbicDate(raw) {
  if (!raw) return null;
  const m = raw
    .trim()
    .match(/^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
  if (month === undefined) return null;
  const d = new Date(
    Number(m[3]),
    month,
    Number(m[1]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6])
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Zenith: 09/11/2026 10:27:23 (DD/MM/YYYY) */
function parseZenithDate(raw) {
  if (!raw) return null;
  const withTime = raw
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (withTime) {
    const d = new Date(
      Number(withTime[3]),
      Number(withTime[2]) - 1,
      Number(withTime[1]),
      Number(withTime[4]),
      Number(withTime[5]),
      Number(withTime[6])
    );
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const dateOnly = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateOnly) {
    const d = new Date(
      Number(dateOnly[3]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[1])
    );
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

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
  parseStanbicDate,
  parseZenithDate,
};
