# Cheng finance — bank email ledger

Simple **$0** personal finance app: bank alert emails in Gmail → parsed transactions → running balance (SQLite). Built for **multiple banks on one inbox** via a single Gmail label.

## How it works

1. In Gmail, create a label (default: `Bank/Transactions`) and filters so **all three banks** apply that label.
2. Connect Gmail (OAuth read-only).
3. Click **Sync Gmail now** (or call `POST /api/sync`). After a free host “wakes up”, catch-up loads every message since the last checkpoint; duplicates are skipped by Gmail message id.

## Quick start (local)

```bash
npm install
cp .env.example .env
# Fill GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, optional OPENING_BALANCE
npm start
```

Open http://localhost:1337

1. Click **Connect Gmail** (or visit `/api/oauth/url`) and complete consent.
2. Copy `GMAIL_REFRESH_TOKEN` into `.env` if you deploy elsewhere (token is also stored in `data/ledger.sqlite`).
3. Run sync.

## Three banks, one inbox (Stanbic, Zenith, Kuda)

Built-in parsers match these senders automatically:

| Bank | Typical From | Parser |
|------|----------------|--------|
| Stanbic IBTC | `StanbicIBTC-E-Alert@stanbicibtc.com` | Labelled amount, description, transaction date |
| Zenith Bank | `ebusinessgroup@zenithbank.com` | Transfer receipt table + subject beneficiary |
| Kuda | `no-reply@kuda.com` | `You just sent/received ₦…` sentence |

**Gmail filters** (all → label `Bank/Transactions`):

- From: `stanbicibtc.com`
- From: `zenithbank.com`
- From: `kuda.com`

Redacted samples live in [`fixtures/`](fixtures/). Run `npm test` to validate parsers.

Test a pasted email:

```bash
npm run parse-fixture -- fixtures/bank-a-sample.txt
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard` | Balance, month summary, review queue |
| POST | `/api/sync` | Pull labeled Gmail messages |
| GET | `/api/transactions` | List transactions |
| PATCH | `/api/transactions/:id` | Fix review items |
| POST | `/api/transactions/manual` | Cash / manual entries |

## Deploy (free tier)

- Set env vars on Render/Railway/Fly (same as `.env.example`).
- Use a **persistent disk** or mounted volume for `DATA_DIR` so SQLite survives restarts.
- Cold start is fine: emails stay in Gmail until the next sync.

## Gmail Cloud setup

1. [Google Cloud Console](https://console.cloud.google.com/) → new project → enable **Gmail API**.
2. OAuth consent (External / Testing) — add your Google account as test user.
3. Credentials → OAuth client (Web) → redirect URI: `https://YOUR_HOST/api/oauth/callback`.
4. Use client id + secret in env; complete OAuth once for a refresh token.

## What to send next

Please paste **one redacted sample per bank** (subject + body; mask account numbers). That lets us wire accurate parsers instead of generic regex.
