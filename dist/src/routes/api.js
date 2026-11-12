const express = require('express');
const path = require('path');
const { getSetting, setSetting } = require('../db');
const {
  computeBalance,
  listTransactions,
  updateTransaction,
  addManualTransaction,
  getAccount,
  updateAccount,
  monthSummary,
} = require('../ledger');
const { syncGmail, getSyncState } = require('../gmail/sync');
const { getOAuth2Client, SCOPES, isGmailConfigured } = require('../gmail/client');
const { BANK_DEFINITIONS } = require('../parsers');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, gmail_configured: isGmailConfigured() });
});

router.get('/dashboard', (req, res) => {
  const account = getAccount();
  const balance = computeBalance();
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const summary = monthSummary(month);
  const recent = listTransactions({ limit: 15 });
  const review = listTransactions({ status: 'pending_review', limit: 50 });
  const sync = getSyncState();

  res.json({
    account,
    balance,
    month,
    month_summary: summary,
    recent_transactions: recent,
    review_queue: review,
    sync,
    gmail_configured: isGmailConfigured(),
    banks: BANK_DEFINITIONS.map((b) => ({ key: b.key, name: b.name })),
  });
});

router.get('/transactions', (req, res) => {
  const { status, month, limit, offset } = req.query;
  res.json({
    items: listTransactions({
      status: status || undefined,
      month: month || undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    }),
  });
});

router.patch('/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = updateTransaction(id, req.body);
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.post('/transactions/manual', (req, res) => {
  const { type, amount, description, occurred_at, category } = req.body;
  if (!type || !amount || !occurred_at) {
    return res.status(400).json({ error: 'type, amount, occurred_at required' });
  }
  const result = addManualTransaction({
    type,
    amount: Number(amount),
    description,
    occurred_at,
    category,
    currency: 'NGN',
  });
  res.status(201).json(result);
});

router.post('/sync', async (req, res) => {
  try {
    const result = await syncGmail({
      maxMessages: Number(req.body?.maxMessages || 50),
    });
    const status = result.ok ? 200 : result.configured ? 400 : 503;
    res.status(status).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/settings/account', (req, res) => {
  res.json(getAccount());
});

router.put('/settings/account', (req, res) => {
  res.json(updateAccount(req.body));
});

router.get('/oauth/url', (req, res) => {
  const oauth2 = getOAuth2Client();
  if (!oauth2) {
    return res.status(503).json({ error: 'Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET' });
  }
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  res.json({ url });
});

router.get('/oauth/callback', async (req, res) => {
  const oauth2 = getOAuth2Client();
  if (!oauth2) {
    return res.status(503).send('Gmail OAuth not configured on server.');
  }
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing code');
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    if (tokens.refresh_token) {
      setSetting('gmail_refresh_token', tokens.refresh_token);
    }
    res.redirect('/?oauth=ok');
  } catch (e) {
    res.status(500).send(`OAuth failed: ${e.message}`);
  }
});

module.exports = router;
