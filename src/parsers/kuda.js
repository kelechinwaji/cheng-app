const { stripHtml, parseAmount } = require('./util');

const BANK_KEY = 'kuda';

function parseKuda({ subject, bodyPlain, bodyHtml, internalDate }) {
  const plain = bodyPlain || (bodyHtml ? stripHtml(bodyHtml) : '');
  const text = `${subject || ''}\n${plain}`.trim();

  const sendMatch = text.match(
    /You just sent ₦([\d,]+\.\d{2})\s+to\s+(.+?)\./is
  );
  const receiveMatch = text.match(
    /You(?: just)? received ₦([\d,]+\.\d{2})(?:\s+from\s+(.+?))?\./is
  );

  const occurred_at = internalDate
    ? new Date(Number(internalDate)).toISOString()
    : new Date().toISOString();

  if (sendMatch) {
    const amount = parseAmount(sendMatch[1]);
    const description = sendMatch[2].replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!amount) {
      return {
        ok: false,
        confidence: 0.3,
        bank_key: BANK_KEY,
        raw_snippet: text.slice(0, 500),
      };
    }
    return {
      ok: true,
      confidence: 0.95,
      bank_key: BANK_KEY,
      type: 'debit',
      amount,
      currency: 'NGN',
      description,
      occurred_at,
      raw_snippet: text.slice(0, 500),
    };
  }

  if (receiveMatch) {
    const amount = parseAmount(receiveMatch[1]);
    const description =
      (receiveMatch[2] && receiveMatch[2].replace(/\s+/g, ' ').trim()) ||
      'Kuda credit';
    if (!amount) {
      return {
        ok: false,
        confidence: 0.3,
        bank_key: BANK_KEY,
        raw_snippet: text.slice(0, 500),
      };
    }
    return {
      ok: true,
      confidence: 0.95,
      bank_key: BANK_KEY,
      type: 'credit',
      amount,
      currency: 'NGN',
      description: description.slice(0, 200),
      occurred_at,
      raw_snippet: text.slice(0, 500),
    };
  }

  return {
    ok: false,
    confidence: 0.2,
    bank_key: BANK_KEY,
    raw_snippet: text.slice(0, 500),
  };
}

module.exports = { parseKuda, BANK_KEY };
