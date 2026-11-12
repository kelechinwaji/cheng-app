#!/usr/bin/env node
/**
 * Parse a saved .eml or .txt fixture (paste bank email into fixtures/).
 * Usage: node scripts/parse-fixture.js fixtures/sample.txt
 */
const fs = require('fs');
const { parseGeneric } = require('../src/parsers/index');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/parse-fixture.js <file>');
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');
const subject = lines.find((l) => l.toLowerCase().startsWith('subject:'))?.slice(8).trim() || '';
const from =
  lines.find((l) => l.toLowerCase().startsWith('from:'))?.slice(5).trim() || '';
const body = text.replace(/^subject:.*\n/i, '').replace(/^from:.*\n/i, '');

const result = parseGeneric({
  subject,
  from,
  bodyPlain: body,
  internalDate: Date.now(),
});

console.log(JSON.stringify(result, null, 2));
