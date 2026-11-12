const { stripHtml, parseAmount, parseZenithDate } = require('./util');

const BANK_KEY = 'zenith';

function detectType(text, subject) {
  const subj = (subject || '').toUpperCase();
  const combined = `${subject || ''}\n${text}`;
  if (
    subj.includes('PAYMENT RECEIPT TO') ||
    /transfer(?:s)? made from your account/i.test(combined)
  ) {
    return 'debit';
  }
  if (
    subj.includes('RECEIPT FROM') ||
    subj.includes('CREDIT') ||
    /credited to your account/i.test(combined)
  ) {
    return 'credit';
  }
  return null;
}

function descriptionFromSubject(subject) {
  const m = subject?.match(/PAYMENT RECEIPT TO\s*\(([^)]+)\)/i);
  if (m?.[1]) return `Transfer to ${m[1].trim()}`;
  return null;
}

function parseZenith({ subject, bodyPlain, bodyHtml, internalDate }) {
  const plain = bodyPlain || (bodyHtml ? stripHtml(bodyHtml) : '');
  const text = `${subject || ''}\n${plain}`.trim();

  const type = detectType(text, subject);
  const amountMatch = text.match(/Amount:\s*([\d,]+\.\d{2})/i);
  const amount = parseAmount(amountMatch?.[1]);

  const effMatch = text.match(
    /Effective Date:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );
  const dotMatch = text.match(/Date of Transaction:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const occurred_at =
    parseZenithDate(effMatch?.[1]) ||
    parseZenithDate(dotMatch?.[1]) ||
    (internalDate
      ? new Date(Number(internalDate)).toISOString()
      : new Date().toISOString());

  let description =
    descriptionFromSubject(subject) ||
    text.match(/Beneficiary Name:\s*(.+?)(?=\s+Effective Date:|$)/is)?.[1]?.trim() ||
    text.match(/Description:\s*(.+?)(?=\s+Reference Code:|$)/is)?.[1]?.trim();

  if (description) {
    description = description.replace(/\s+/g, ' ').slice(0, 200);
  }

  if (!amount) {
    return {
      ok: false,
      confidence: 0.25,
      bank_key: BANK_KEY,
      raw_snippet: text.slice(0, 500),
    };
  }

  if (!type) {
    return {
      ok: true,
      confidence: 0.7,
      bank_key: BANK_KEY,
      type: 'debit',
      amount,
      currency: 'NGN',
      description: description || subject || 'Zenith transaction',
      occurred_at,
      raw_snippet: text.slice(0, 500),
    };
  }

  return {
    ok: true,
    confidence: effMatch ? 0.95 : 0.9,
    bank_key: BANK_KEY,
    type,
    amount,
    currency: 'NGN',
    description: description || 'Zenith transaction',
    occurred_at,
    raw_snippet: text.slice(0, 500),
  };
}

module.exports = { parseZenith, BANK_KEY };
