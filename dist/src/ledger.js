const { getDb } = require('./db');

function getAccount() {
  return getDb().prepare('SELECT * FROM accounts ORDER BY id LIMIT 1').get();
}

function updateAccount({ opening_balance, opening_balance_at, name }) {
  const account = getAccount();
  getDb()
    .prepare(
      `UPDATE accounts SET
        opening_balance = COALESCE(?, opening_balance),
        opening_balance_at = COALESCE(?, opening_balance_at),
        name = COALESCE(?, name)
       WHERE id = ?`
    )
    .run(opening_balance ?? null, opening_balance_at ?? null, name ?? null, account.id);
  return getAccount();
}

function computeBalance(accountId = 1) {
  const account = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  const agg = getDb()
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as debits
       FROM transactions
       WHERE account_id = ? AND status = 'posted'`
    )
    .get(accountId);
  return {
    currency: account.currency,
    opening_balance: account.opening_balance,
    credits: agg.credits,
    debits: agg.debits,
    balance: account.opening_balance + agg.credits - agg.debits,
  };
}

function listTransactions({ status, limit = 100, offset = 0, month } = {}) {
  const conditions = ['1=1'];
  const params = {};

  if (status) {
    conditions.push('status = @status');
    params.status = status;
  }
  if (month) {
    conditions.push("strftime('%Y-%m', occurred_at) = @month");
    params.month = month;
  }

  const sql = `SELECT * FROM transactions
    WHERE ${conditions.join(' AND ')}
    ORDER BY occurred_at DESC, id DESC
    LIMIT @limit OFFSET @offset`;

  return getDb().prepare(sql).all({ ...params, limit, offset });
}

function insertTransaction(tx) {
  const status = tx.status ?? 'posted';
  if (status === 'posted' && (!tx.amount || tx.amount <= 0)) {
    throw new Error('Posted transactions require a positive amount');
  }
  const stmt = getDb().prepare(`
    INSERT INTO transactions (
      account_id, type, amount, currency, description, category,
      occurred_at, status, source, gmail_message_id, bank_key,
      parse_confidence, raw_snippet
    ) VALUES (
      @account_id, @type, @amount, @currency, @description, @category,
      @occurred_at, @status, @source, @gmail_message_id, @bank_key,
      @parse_confidence, @raw_snippet
    )
  `);
  try {
    const info = stmt.run({
      account_id: tx.account_id ?? 1,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency ?? 'NGN',
      description: tx.description ?? null,
      category: tx.category ?? null,
      occurred_at: tx.occurred_at,
      status: tx.status ?? 'posted',
      source: tx.source ?? 'email',
      gmail_message_id: tx.gmail_message_id,
      bank_key: tx.bank_key ?? null,
      parse_confidence: tx.parse_confidence ?? null,
      raw_snippet: tx.raw_snippet ?? null,
    });
    return { id: info.lastInsertRowid, duplicate: false };
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { duplicate: true };
    }
    throw e;
  }
}

function updateTransaction(id, fields) {
  const allowed = [
    'type',
    'amount',
    'description',
    'category',
    'occurred_at',
    'status',
  ];
  const sets = [];
  const params = { id };
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = @${key}`);
      params[key] = fields[key];
    }
  }
  if (sets.length === 0) return null;
  getDb()
    .prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = @id`)
    .run(params);
  return getDb().prepare('SELECT * FROM transactions WHERE id = ?').get(id);
}

function addManualTransaction(body) {
  return insertTransaction({
    ...body,
    source: 'manual',
    gmail_message_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'posted',
    parse_confidence: 1,
  });
}

function monthSummary(month) {
  return getDb()
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as expenses,
        COUNT(*) as count
       FROM transactions
       WHERE status = 'posted' AND strftime('%Y-%m', occurred_at) = ?`
    )
    .get(month);
}

module.exports = {
  getAccount,
  updateAccount,
  computeBalance,
  listTransactions,
  insertTransaction,
  updateTransaction,
  addManualTransaction,
  monthSummary,
};
