# Vercel: `cheng-app-qned-0m1k` still failing?

This repo is linked to **three** Vercel GitHub projects. Two usually pass; `cheng-app-qned-0m1k` often has **stale project settings** from before the Express finance app.

In [Vercel → Project Settings](https://vercel.com):

1. **General → Framework Preset:** Express (or let `vercel.json` `framework: express` apply).
2. **Root Directory:** empty (repository root), **not** `public`, `dist`, or `api`.
3. **Build & Output:** clear custom **Output Directory** (must not be `public` alone for this app).
4. **Node.js Version:** 22.x (or ≥18 with `better-sqlite3` fallback in `src/db.js`).
5. Or **disconnect** this duplicate project and keep a single Vercel project for the repo.

The app entrypoint is [`server.js`](/server.js) (`module.exports = app`). Do not use the legacy `/api` folder on Vercel for Express.
