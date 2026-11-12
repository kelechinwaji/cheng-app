const { stripHtml, detectType, extractAmount, extractDate, extractDescription } = require('./util');
const { parseStanbic } = require('./stanbic');
const { parseZenith } = require('./zenith');
const { parseKuda } = require('./kuda');

const DEFAULT_FROM_PATTERNS = {
  stanbic_ibtc: ['stanbicibtc.com'],
  zenith: ['zenithbank.com'],
  kuda: ['kuda.com'],
};

const BANK_DEFINITIONS = [
  {
    key: 'stanbic_ibtc',
    name: 'Stanbic IBTC',
    parse: parseStanbic,
    matchFrom: () => false,
  },
  {
    key: 'zenith',
    name: 'Zenith Bank',
    parse: parseZenith,
    matchFrom: () => false,
  },
  {
    key: 'kuda',
    name: 'Kuda',
    parse: parseKuda,
    matchFrom: () => false,
  },
];

function matchSender(fromHeader, patterns) {
  const from = (fromHeader || '').toLowerCase();
  return patterns.some((p) => {
    if (typeof p === 'string') return from.includes(p.toLowerCase());
    if (p instanceof RegExp) return p.test(fromHeader || '');
    return false;
  });
}

function configureBanksFromEnv() {
  const envKeys = {
    stanbic_ibtc: process.env.BANK_STANBIC_FROM || process.env.BANK_A_FROM,
    zenith: process.env.BANK_ZENITH_FROM || process.env.BANK_B_FROM,
    kuda: process.env.BANK_KUDA_FROM || process.env.BANK_C_FROM,
  };

  for (const def of BANK_DEFINITIONS) {
    const fromEnv = envKeys[def.key]
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const patterns = fromEnv?.length ? fromEnv : DEFAULT_FROM_PATTERNS[def.key];
    def.matchFrom = (from) => matchSender(from, patterns);
  }
}

configureBanksFromEnv();

function detectBank(fromHeader) {
  for (const bank of BANK_DEFINITIONS) {
    if (bank.matchFrom(fromHeader)) return bank;
  }
  return null;
}

function parseGeneric({ subject, bodyPlain, bodyHtml, internalDate, from }) {
  const plain = bodyPlain || (bodyHtml ? stripHtml(bodyHtml) : '');
  const text = `${subject || ''}\n${plain}`.trim();
  const type = detectType(text);
  const amount = extractAmount(text);
  const occurred_at = extractDate(
    text,
    internalDate ? new Date(Number(internalDate)).toISOString() : new Date().toISOString()
  );
  const description = extractDescription(text);

  if (!type || !amount) {
    return {
      ok: false,
      confidence: 0.2,
      bank_key: detectBank(from)?.key || 'unknown',
      raw_snippet: text.slice(0, 500),
    };
  }

  const bank = detectBank(from);
  return {
    ok: true,
    confidence: bank ? 0.85 : 0.65,
    bank_key: bank?.key || 'unknown',
    type,
    amount,
    currency: 'NGN',
    description,
    occurred_at,
    raw_snippet: text.slice(0, 500),
  };
}

function parseWithDispatch(input) {
  const bank = detectBank(input.from);
  if (bank?.parse) {
    const result = bank.parse(input);
    if (result.ok) return result;
  }
  return parseGeneric(input);
}

function parseBankEmail(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const body = extractBodies(message.payload);

  const result = parseWithDispatch({
    subject,
    from,
    bodyPlain: body.plain,
    bodyHtml: body.html,
    internalDate: message.internalDate,
  });

  if (result.ok && result.confidence >= 0.8) {
    return { ...result, status: 'posted' };
  }
  if (result.ok) {
    return { ...result, status: 'pending_review' };
  }
  return { ...result, status: 'pending_review' };
}

function extractBodies(part, acc = { plain: '', html: '' }) {
  if (!part) return acc;
  if (part.mimeType === 'text/plain' && part.body?.data) {
    acc.plain += decodeBody(part.body.data);
  } else if (part.mimeType === 'text/html' && part.body?.data) {
    acc.html += decodeBody(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      extractBodies(child, acc);
    }
  }
  return acc;
}

function decodeBody(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

module.exports = {
  BANK_DEFINITIONS,
  detectBank,
  parseGeneric,
  parseWithDispatch,
  parseBankEmail,
  configureBanksFromEnv,
};
