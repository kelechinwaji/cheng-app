const { stripHtml, parseAmount, parseStanbicDate } = require('./util');

const BANK_KEY = 'stanbic_ibtc';

function detectType(text) {
  if (/credit alert details/i.test(text) || /\bcredited\b/i.test(text)) {
    return 'credit';
  }
  if (/debit alert details/i.test(text) || /\bdebited\b/i.test(text)) {
    return 'debit';
  }
  return null;
}

function parseStanbic({ subject, bodyPlain, bodyHtml, internalDate }) {
  const plain = bodyPlain || (bodyHtml ? stripHtml(bodyHtml) : '');
  const text = `${subject || ''}\n${plain}`.trim();

  const type = detectType(text);
  const amountMatch = text.match(/Amount:\s*NGN\s*([\d,]+\.\d{2})/i);
  const amount = parseAmount(amountMatch?.[1]);

  const dateMatch = text.match(
    /Transaction Date\s*&\s*Time:\s*(\d{2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );
  const occurred_at =
    parseStanbicDate(dateMatch?.[1]) ||
    (internalDate
      ? new Date(Number(internalDate)).toISOString()
      : new Date().toISOString());

  let description = null;
  const descMatch = text.match(
    /Description:\s*(.+?)(?=\s+Transaction Reference:|Account Number:|Your Branch:|$)/is
  );
  if (descMatch?.[1]) {
    description = descMatch[1].replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  if (!type || !amount) {
    return {
      ok: false,
      confidence: 0.3,
      bank_key: BANK_KEY,
      raw_snippet: text.slice(0, 500),
    };
  }

  return {
    ok: true,
    confidence: dateMatch ? 0.95 : 0.88,
    bank_key: BANK_KEY,
    type,
    amount,
    currency: 'NGN',
    description: description || 'Stanbic transaction',
    occurred_at,
    raw_snippet: text.slice(0, 500),
  };
}

module.exports = { parseStanbic, BANK_KEY };
