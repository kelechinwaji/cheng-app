# Bank email fixtures

Add one redacted sample per bank so we can tune parsers.

Suggested file names:

- `bank-a-sample.txt`
- `bank-b-sample.txt`
- `bank-c-sample.txt`

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
