const { getDb, setSetting } = require('../db');
const { insertTransaction } = require('../ledger');
const { parseBankEmail } = require('../parsers');
const {
  getGmail,
  resolveLabelId,
  getGmailLabel,
  isGmailConfigured,
} = require('./client');

function getSyncState() {
  return getDb().prepare('SELECT * FROM sync_state WHERE id = 1').get();
}

function updateSyncState(fields) {
  const current = getSyncState();
  getDb()
    .prepare(
      `UPDATE sync_state SET
        gmail_history_id = COALESCE(?, gmail_history_id),
        last_synced_at = COALESCE(?, last_synced_at),
        last_error = ?
       WHERE id = 1`
    )
    .run(
      fields.gmail_history_id ?? current.gmail_history_id,
      fields.last_synced_at ?? current.last_synced_at,
      fields.last_error ?? null
    );
}

async function syncGmail({ maxMessages = 50 } = {}) {
  if (!isGmailConfigured()) {
    return {
      ok: false,
      configured: false,
      error: 'Gmail not configured. Set OAuth env vars and refresh token.',
    };
  }

  const gmail = await getGmail();
  const labelName = getGmailLabel();
  const labelId = await resolveLabelId(gmail, labelName);

  if (!labelId) {
    const err = `Gmail label not found: "${labelName}". Create the label and filter bank mail into it.`;
    updateSyncState({ last_error: err });
    return { ok: false, configured: true, error: err };
  }

  const messages = [];
  let pageToken;
  const pageSize = Math.min(maxMessages, 100);
  while (messages.length < maxMessages) {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [labelId],
      maxResults: pageSize,
      pageToken,
    });
    const batch = listRes.data.messages || [];
    messages.push(...batch);
    pageToken = listRes.data.nextPageToken;
    if (!pageToken || !batch.length) break;
  }
  let processed = 0;
  let inserted = 0;
  let duplicates = 0;
  let review = 0;

  for (const item of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: item.id,
      format: 'full',
    });

    const parsed = parseBankEmail(full.data);
    processed += 1;

    if (!parsed.ok) {
      review += 1;
      const r = insertTransaction({
        type: 'debit',
        amount: null,
        status: 'pending_review',
        currency: 'NGN',
        description: 'Needs review — could not parse email',
        occurred_at: full.data.internalDate
          ? new Date(Number(full.data.internalDate)).toISOString()
          : new Date().toISOString(),
        gmail_message_id: full.data.id,
        bank_key: parsed.bank_key,
        parse_confidence: parsed.confidence,
        raw_snippet: parsed.raw_snippet,
      });
      if (r.duplicate) duplicates += 1;
      else inserted += 1;
      continue;
    }

    const r = insertTransaction({
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      occurred_at: parsed.occurred_at,
      status: parsed.status,
      gmail_message_id: full.data.id,
      bank_key: parsed.bank_key,
      parse_confidence: parsed.confidence,
      raw_snippet: parsed.raw_snippet,
    });

    if (r.duplicate) duplicates += 1;
    else {
      inserted += 1;
      if (parsed.status === 'pending_review') review += 1;
    }
  }

  const profile = await gmail.users.getProfile({ userId: 'me' });
  const historyId = profile.data.historyId;
  if (historyId) {
    setSetting('gmail_history_id', historyId);
  }

  updateSyncState({
    gmail_history_id: historyId || null,
    last_synced_at: new Date().toISOString(),
    last_error: null,
  });

  return {
    ok: true,
    configured: true,
    label: labelName,
    fetched: messages.length,
    processed,
    inserted,
    duplicates,
    pending_review: review,
    history_id: historyId,
  };
}

module.exports = {
  syncGmail,
  getSyncState,
  updateSyncState,
};
