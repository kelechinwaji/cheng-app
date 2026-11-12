function fmtMoney(n, currency = 'NGN') {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function txRow(tx) {
  const div = document.createElement('div');
  div.className = `row ${tx.type}`;
  div.innerHTML = `
    <div>
      <strong>${tx.description || '(no description)'}</strong>
      <div class="muted">${fmtDate(tx.occurred_at)} · ${tx.bank_key || tx.source} · ${tx.status}</div>
    </div>
    <div class="amt">${tx.type === 'credit' ? '+' : '−'}${fmtMoney(tx.amount, tx.currency)}</div>
  `;
  return div;
}

async function loadDashboard() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();

  document.getElementById('balance').textContent = fmtMoney(
    data.balance.balance,
    data.balance.currency
  );
  document.getElementById('balanceMeta').textContent = `Opening ${fmtMoney(
    data.balance.opening_balance,
    data.balance.currency
  )}`;
  document.getElementById('monthIncome').textContent = `Income: ${fmtMoney(
    data.month_summary.income,
    data.balance.currency
  )}`;
  document.getElementById('monthExpenses').textContent = `Expenses: ${fmtMoney(
    data.month_summary.expenses,
    data.balance.currency
  )}`;

  const gmailEl = document.getElementById('gmailStatus');
  const oauthLink = document.getElementById('oauthLink');
  if (data.gmail_configured) {
    gmailEl.textContent = 'Gmail connected';
    oauthLink.classList.add('hidden');
  } else {
    gmailEl.textContent = 'Gmail not connected — set OAuth env or connect below';
    oauthLink.classList.remove('hidden');
    const oauthRes = await fetch('/api/oauth/url').catch(() => null);
    if (oauthRes?.ok) {
      const { url } = await oauthRes.json();
      oauthLink.href = url;
    }
  }

  const syncStatus = document.getElementById('syncStatus');
  if (data.sync?.last_synced_at) {
    syncStatus.textContent = `Last sync: ${fmtDate(data.sync.last_synced_at)}`;
  }

  const reviewList = document.getElementById('reviewList');
  reviewList.replaceChildren();
  if (!data.review_queue.length) {
    reviewList.innerHTML = '<p class="muted">Nothing to review</p>';
  } else {
    data.review_queue.forEach((tx) => reviewList.appendChild(txRow(tx)));
  }

  const txList = document.getElementById('txList');
  txList.replaceChildren();
  data.recent_transactions.forEach((tx) => txList.appendChild(txRow(tx)));
}

async function syncNow() {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true;
  const syncStatus = document.getElementById('syncStatus');
  syncStatus.textContent = 'Syncing…';
  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (data.ok) {
      syncStatus.textContent = `Synced: ${data.inserted} new, ${data.duplicates} skipped duplicates`;
    } else {
      syncStatus.textContent = data.error || 'Sync failed';
    }
    await loadDashboard();
  } catch (e) {
    syncStatus.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('syncBtn').addEventListener('click', syncNow);
document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

document.getElementById('manualForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const occurred = fd.get('occurred_at');
  const body = {
    type: fd.get('type'),
    amount: Number(fd.get('amount')),
    description: fd.get('description'),
    occurred_at: new Date(occurred).toISOString(),
  };
  await fetch('/api/transactions/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  e.target.reset();
  await loadDashboard();
});

loadDashboard().then(() => {
  if (new URLSearchParams(location.search).get('oauth') === 'ok') {
    document.getElementById('syncStatus').textContent = 'Gmail connected. Run sync.';
  }
});
