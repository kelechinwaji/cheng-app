const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseWithDispatch } = require('../src/parsers');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function loadFixture(name) {
  const text = fs.readFileSync(path.join(fixturesDir, name), 'utf8');
  const subject =
    text.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() || '';
  const from = text.match(/^From:\s*(.+)$/im)?.[1]?.trim() || '';
  const body = text.replace(/^Subject:.*\n/im, '').replace(/^From:.*\n/im, '');
  return { subject, from, bodyPlain: body.trim(), internalDate: '1730000000000' };
}

// Stanbic credit
{
  const input = loadFixture('stanbic-credit.txt');
  const r = parseWithDispatch(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.bank_key, 'stanbic_ibtc');
  assert.strictEqual(r.type, 'credit');
  assert.strictEqual(r.amount, 100000);
  assert.ok(r.description.includes('UBA NOMINEE'));
  assert.ok(r.occurred_at.includes('2026-10-16'));
}

// Zenith debit
{
  const input = loadFixture('zenith-debit-transfer.txt');
  const r = parseWithDispatch(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.bank_key, 'zenith');
  assert.strictEqual(r.type, 'debit');
  assert.strictEqual(r.amount, 1000);
  assert.ok(r.description.includes('SHAFIU'));
}

// Kuda debit
{
  const input = loadFixture('kuda-debit-send.txt');
  const r = parseWithDispatch(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.bank_key, 'kuda');
  assert.strictEqual(r.type, 'debit');
  assert.strictEqual(r.amount, 20000);
  assert.ok(r.description.includes('Obinna'));
}

// Kuda credit (synthetic)
{
  const input = loadFixture('kuda-credit-receive.txt');
  const r = parseWithDispatch(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.type, 'credit');
  assert.strictEqual(r.amount, 5000);
}

console.log('banks.test.js: ok');
