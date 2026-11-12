# Bank email fixtures

Add one redacted sample per bank so we can tune parsers.

Included samples (from real redacted alerts):

- `stanbic-credit.txt`
- `zenith-debit-transfer.txt`
- `kuda-debit-send.txt`
- `kuda-credit-receive.txt` (synthetic credit pattern)

Each file can start with:

```
Subject: ...
From: alerts@examplebank.com

(paste email body below)
```

Run:

```bash
node scripts/parse-fixture.js fixtures/bank-a-sample.txt
```
