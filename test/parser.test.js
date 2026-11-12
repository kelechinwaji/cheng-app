const assert = require('assert');
const { parseGeneric } = require('../src/parsers');

const sample = parseGeneric({
  subject: 'Debit Alert',
  from: 'alerts@examplebank.com',
  bodyPlain:
    'Dear Customer, your account was debited. Amount: NGN 12,500.00. Narration: POS PURCHASE UBER. Date: 2025-03-01 14:22:10',
  internalDate: Date.now(),
});

assert.strictEqual(sample.ok, true);
assert.strictEqual(sample.type, 'debit');
assert.strictEqual(sample.amount, 12500);

const credit = parseGeneric({
  subject: 'Credit Alert',
  from: 'notify@examplebank.com',
  bodyPlain: 'Account credited with ₦50,000.00. Description: SALARY PAYMENT March',
  internalDate: Date.now(),
});

assert.strictEqual(credit.ok, true);
assert.strictEqual(credit.type, 'credit');
assert.strictEqual(credit.amount, 50000);

console.log('parser.test.js: ok');
