const { google } = require('googleapis');
const { getSetting } = require('../db');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:1337/api/oauth/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const refreshToken =
    process.env.GMAIL_REFRESH_TOKEN || getSetting('gmail_refresh_token');
  if (refreshToken) {
    oauth2.setCredentials({ refresh_token: refreshToken });
  }
  return oauth2;
}

function isGmailConfigured() {
  const oauth2 = getOAuth2Client();
  const refresh =
    process.env.GMAIL_REFRESH_TOKEN || getSetting('gmail_refresh_token');
  return Boolean(oauth2 && refresh);
}

function getGmailLabel() {
  return process.env.GMAIL_LABEL || 'Bank/Transactions';
}

async function getGmail() {
  const auth = getOAuth2Client();
  if (!auth) {
    throw new Error('Gmail OAuth is not configured');
  }
  return google.gmail({ version: 'v1', auth });
}

async function resolveLabelId(gmail, labelName) {
  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = res.data.labels || [];
  const exact = labels.find((l) => l.name === labelName);
  if (exact) return exact.id;
  const leaf = labelName.split('/').pop();
  const fuzzy = labels.find((l) => l.name === leaf || l.name.endsWith(`/${leaf}`));
  return fuzzy?.id || null;
}

module.exports = {
  SCOPES,
  getOAuth2Client,
  isGmailConfigured,
  getGmailLabel,
  getGmail,
  resolveLabelId,
};
