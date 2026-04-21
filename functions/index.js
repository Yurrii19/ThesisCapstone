const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load local env files for emulator/dev runs. In production, Firebase config/env will take precedence.
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

admin.initializeApp();

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const encodeKey = (value) => String(value || '').trim().toLowerCase().replace(/[.#$/\[\]]/g, '_');

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const normalizeEmail = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase();
const isValidEmailAddress = (value) => {
  const normalized = normalizeEmail(value);
  return EMAIL_ADDRESS_REGEX.test(normalized);
};
const normalizeContactNumber = (value) => {
  let digits = String(value || '').trim().replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return digits.slice(0, 10);
};

const getSmtpConfig = () => {
  const cfg = functions.config()?.smtp || {};
  const host = cfg.host || process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || 'smtp.gmail.com';
  const port = Number(cfg.port || process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || 587);
  const user = cfg.user
    || process.env.SMTP_USER
    || process.env.VITE_SMTP_USER
    || process.env.MAIL_USERNAME
    || '';
  const pass = cfg.pass
    || process.env.SMTP_PASS
    || process.env.VITE_SMTP_PASS
    || process.env.MAIL_PASSWORD
    || '';
  const from = cfg.from
    || process.env.SMTP_FROM
    || process.env.VITE_SMTP_FROM
    || process.env.MAIL_FROM_ADDRESS
    || user;
  return { host, port, user, pass, from };
};

const buildTransport = () => {
  const { host, port, user, pass } = getSmtpConfig();
  if (!user || !pass) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'SMTP is not configured on the server. Set smtp.user and smtp.pass in Firebase Functions config or provide SMTP_* env variables for local emulators.'
    );
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const maskValue = (value) => {
  const str = String(value || '');
  if (!str) return '';
  if (str.length <= 4) return '****';
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
};

const resolveRegistrationOtpPayload = (data) => {
  const email = normalizeEmail(data?.email);
  const role = String(data?.role || 'user').trim();
  const contactNumber = String(data?.contactNumber || '').trim();

  return { email, role, contactNumber };
};

const getSnapshotValue = async (ref) => ref.once('value');

const checkEmailAvailabilityWithAdmin = async (rawEmail) => {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return { available: false, verified: false, reason: 'missing_email' };
  }
  if (!isValidEmailAddress(email)) {
    return { available: false, verified: false, reason: 'invalid_email' };
  }

  try {
    await admin.auth().getUserByEmail(email);
    return { available: false, verified: true, reason: 'firebase_auth' };
  } catch (error) {
    if (String(error?.code || '').toLowerCase() !== 'auth/user-not-found') {
      throw error;
    }
  }

  const indexRef = admin.database().ref(`email_index/${encodeKey(email)}`);
  const indexSnapshot = await getSnapshotValue(indexRef);
  if (indexSnapshot.exists()) {
    const indexedUid = String(indexSnapshot.val() || '').trim();
    if (indexedUid) {
      const profileSnapshot = await getSnapshotValue(admin.database().ref(`profiles/${indexedUid}`));
      if (
        profileSnapshot.exists()
        && normalizeEmail(profileSnapshot.val()?.email) === email
      ) {
        return { available: false, verified: true, reason: 'email_index' };
      }
    }

    await indexRef.remove().catch(() => {});
  }

  return { available: true, verified: true, reason: 'verified_available' };
};

const checkContactAvailabilityWithAdmin = async (rawContactNumber) => {
  const contactNumber = normalizeContactNumber(rawContactNumber);
  if (!contactNumber) {
    return { available: true, verified: true, reason: 'missing_contact' };
  }

  const indexRef = admin.database().ref(`contact_index/${encodeKey(contactNumber)}`);
  const indexSnapshot = await getSnapshotValue(indexRef);
  if (!indexSnapshot.exists()) {
    return { available: true, verified: true, reason: 'verified_available' };
  }

  const indexedUid = String(indexSnapshot.val() || '').trim();
  if (indexedUid) {
    const profileSnapshot = await getSnapshotValue(admin.database().ref(`profiles/${indexedUid}`));
    if (
      profileSnapshot.exists()
      && normalizeContactNumber(profileSnapshot.val()?.contact_number) === contactNumber
    ) {
      return { available: false, verified: true, reason: 'contact_index' };
    }
  }

  await indexRef.remove().catch(() => {});
  return { available: true, verified: true, reason: 'verified_available' };
};

const checkRegistrationAvailability = async (data = {}) => {
  const email = normalizeEmail(data?.email);
  const contactNumber = normalizeContactNumber(data?.contactNumber);
  const result = {};

  if (email) {
    result.email = await checkEmailAvailabilityWithAdmin(email);
  }

  if (contactNumber) {
    result.contact = await checkContactAvailabilityWithAdmin(contactNumber);
  }

  return result;
};

const sendOtpEmail = async ({ email, role, contactNumber }) => {
  console.log('sendRegistrationOtp: request', {
    email: email ? email.replace(/^(.).*(.@)/, '$1***$2') : '',
    role,
    hasContact: Boolean(contactNumber),
  });

  if (!isValidEmailAddress(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address.');
  }

  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const now = Date.now();
  const payload = {
    email,
    role,
    contact_number: contactNumber,
    otp,
    delivery: 'smtp',
    delivered_at: now,
    expiresAt: now + OTP_EXPIRY_MS,
    createdAt: now,
  };

  const transporter = buildTransport();
  const { host, port, user, from } = getSmtpConfig();
  console.log('sendRegistrationOtp: smtp', {
    host,
    port,
    user: maskValue(user),
    from: maskValue(from),
  });

  const subject = 'Your OTP Code';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>Your OTP code is:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;">${otp}</p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('sendRegistrationOtp: smtp error', {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
      command: error?.command,
    });
    const message = String(error?.message || 'Failed to send OTP email.');
    throw new functions.https.HttpsError('failed-precondition', message, {
      code: error?.code,
      responseCode: error?.responseCode,
      command: error?.command,
    });
  }

  try {
    await admin.database().ref(`registration_otps/${encodeKey(email)}`).set(payload);
  } catch (error) {
    console.error('sendRegistrationOtp: database write error', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });
    const message = String(error?.message || 'Failed to store OTP in database.');
    throw new functions.https.HttpsError('failed-precondition', message, {
      code: error?.code,
      name: error?.name,
    });
  }

  return { sent: true, delivery: 'smtp' };
};

const setCorsHeaders = (res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
};

const parseJsonText = (value) => {
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const resolveHttpPayload = (req) => {
  if (req.method === 'GET') {
    return req.query || {};
  }

  if (Buffer.isBuffer(req.body)) {
    return parseJsonText(req.body.toString('utf8'));
  }

  if (typeof req.body === 'string') {
    return parseJsonText(req.body);
  }

  return req.body || {};
};

const httpsErrorStatusMap = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'failed-precondition': 412,
  'resource-exhausted': 429,
  internal: 500,
  unavailable: 503,
};

const getHttpStatusForError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  return httpsErrorStatusMap[code] || Number(error?.httpErrorCode?.status) || 500;
};

exports.sendRegistrationOtp = functions.https.onCall(async (data) => {
  return sendOtpEmail(resolveRegistrationOtpPayload(data));
});

exports.checkRegistrationAvailability = functions.https.onCall(async (data) => {
  return checkRegistrationAvailability(data || {});
});

exports.sendRegistrationOtpHttp = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        status: 'METHOD_NOT_ALLOWED',
        message: 'Use POST when requesting a registration OTP.',
      },
    });
    return;
  }

  try {
    const result = await sendOtpEmail(resolveRegistrationOtpPayload(resolveHttpPayload(req)));
    res.status(200).json(result);
  } catch (error) {
    console.error('sendRegistrationOtpHttp: request failed', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
    });
    const code = String(error?.code || 'internal').replace(/-/g, '_').toUpperCase();
    res.status(getHttpStatusForError(error)).json({
      error: {
        status: code,
        message: String(error?.message || 'Failed to send OTP email.'),
        details: error?.details,
      },
    });
  }
});

exports.checkRegistrationAvailabilityHttp = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({
      error: {
        status: 'METHOD_NOT_ALLOWED',
        message: 'Use GET or POST when checking registration availability.',
      },
    });
    return;
  }

  try {
    const result = await checkRegistrationAvailability(resolveHttpPayload(req));
    res.status(200).json(result);
  } catch (error) {
    console.error('checkRegistrationAvailabilityHttp: request failed', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
    });
    const code = String(error?.code || 'internal').replace(/-/g, '_').toUpperCase();
    res.status(getHttpStatusForError(error)).json({
      error: {
        status: code,
        message: String(error?.message || 'Failed to check registration availability.'),
        details: error?.details,
      },
    });
  }
});

exports.pingOtp = functions.https.onCall(() => {
  return { ok: true, at: Date.now() };
});
