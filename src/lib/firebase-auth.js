import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { getApps, initializeApp } from 'firebase/app'
import { get, ref as dbRef, remove, set } from 'firebase/database'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { firebaseAuth, firebaseConfig, firebaseConfigReady, firebaseFunctions, firebaseFunctionsRegion, realtimeDb, storage } from '@/firebase/client'
import { buildTemporaryFilePath } from '@/lib/file-url'

const AUTH_PROFILE_STORAGE_KEY = 'thesis_capstone_auth_profile'
const PROFILE_CACHE_STORAGE_KEY = 'thesis_capstone_profile_cache'
const REGISTRATION_OTP_PREFIX = 'thesis_capstone_registration_otp'
const REGISTRATION_REDIRECT_SUPPRESSION_KEY = 'thesis_capstone_registration_redirect_suppressed'
const APP_ROOT = 'app_data'

const PUBLIC_ROLE_DASHBOARD = {
  admin: '/Admin/AdminDashboard',
  user: '/User/UserDashboard',
  business: '/Business/BusinessDashboard',
  service_provider: '/ServiceProvider/ServiceProviderDashboard',
  serviceprovider: '/ServiceProvider/ServiceProviderDashboard',
  employee: '/Employee/EmployeeDashboard',
  hr: '/HR/HrDashboard',
  finance: '/Finance/FinanceDashboard',
  procurement: '/Procurement/ProcurementDashboard',
  operational: '/Operational/OperationalDashboard',
  csr: '/CSR/Dashboard',
}

const FILE_FIELD_LABELS = {
  government_id: 'government-id',
  bir_registration: 'bir-registration',
  dti_registration: 'dti-registration',
  mayor_permit: 'mayor-permit',
  business_permit: 'business-permit',
  sanitary_permit: 'sanitary-permit',
}

const fileFields = Object.keys(FILE_FIELD_LABELS)
const nowIso = () => new Date().toISOString()
const DEV_ADMIN_EMAIL = 'admin@thesis.local'
const DEV_ADMIN_EMAIL_ALIASES = new Set([DEV_ADMIN_EMAIL, 'admin@thesis.com'])
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const DEV_ADMIN_PROFILE = {
  first_name: 'Admin',
  middle_initial: '',
  last_name: 'Local',
  role: 'admin',
  contact_number: '',
  profile_photo: '',
  is_approved: true,
  status: 'approved',
}

const trimString = (value) => String(value ?? '').trim()
const normalizeRole = (role) => trimString(role).toLowerCase().replace(/\s+/g, '_')
const encodeKey = (value) => trimString(value).toLowerCase().replace(/[.#$/\[\]]/g, '_')
const normalizeEmail = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase()
const isValidEmailAddress = (value) => {
  const normalized = normalizeEmail(value)
  return EMAIL_ADDRESS_REGEX.test(normalized)
}
const STORAGE_SAFE_URL_MAX_LENGTH = 2048
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]'
const sanitizeFirebaseValue = (value) => {
  if (typeof value === 'function') return undefined

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeFirebaseValue(entry))
      .filter((entry) => entry !== undefined)
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, entry]) => {
      const sanitized = sanitizeFirebaseValue(entry)
      if (sanitized !== undefined) {
        accumulator[key] = sanitized
      }
      return accumulator
    }, {})
  }

  return value
}
const normalizeAuthEmail = (value) => {
  const email = normalizeEmail(value)
  if (email === 'admin@thesis.com') return DEV_ADMIN_EMAIL
  return email
}
const normalizeContactNumber = (value) => {
  let digits = trimString(value).replace(/\D/g, '')
  if (digits.startsWith('63')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  return digits.slice(0, 10)
}
const normalizeBusinessType = (value) => {
  const raw = trimString(value)
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')

  if (['company', 'corporation', 'corporate'].includes(raw)) return 'company'
  if ([
    'individual',
    'small business',
    'smallbusiness',
    'small biz',
    'individual small business',
    'sole proprietor',
    'sole proprietorship',
  ].includes(raw)) return 'individual'

  return ''
}
const buildAdminReviewQueueRecord = (profile = {}, overrides = {}) => sanitizeFirebaseValue({
  id: trimString(overrides.id || profile.uid || profile.id || profile.email),
  uid: trimString(overrides.uid || profile.uid || profile.id || profile.email),
  firebase_uid: trimString(overrides.firebase_uid || profile.uid || profile.id || profile.email),
  email: normalizeEmail(overrides.email || profile.email || profile.company_email),
  first_name: trimString(overrides.first_name || profile.first_name || profile.business_owner_first),
  middle_initial: trimString(overrides.middle_initial || profile.middle_initial || profile.business_owner_middle),
  last_name: trimString(overrides.last_name || profile.last_name || profile.business_owner_last),
  business_name: trimString(overrides.business_name || profile.business_name || profile.business_name_1),
  company_name: trimString(overrides.company_name || profile.company_name || profile.business_name || profile.business_name_1),
  business_type: trimString(overrides.business_type || profile.business_type),
  management_mode: trimString(overrides.management_mode || profile.management_mode),
  business_id: trimString(overrides.business_id || profile.business_id),
  role: normalizeRole(overrides.role || profile.role || 'user'),
  workspace_type: trimString(overrides.workspace_type || profile.workspace_type),
  account_source: trimString(overrides.account_source || profile.account_source || 'self_registered'),
  source_trace: Array.isArray(overrides.source_trace)
    ? overrides.source_trace
    : (Array.isArray(profile.source_trace) ? profile.source_trace : ['Firebase Registration']),
  status: trimString(overrides.status || profile.status || 'pending') || 'pending',
  approval_status: trimString(overrides.approval_status || profile.approval_status || profile.status || 'pending') || 'pending',
  is_approved: Boolean(overrides.is_approved ?? profile.is_approved ?? false),
  has_viewed: Boolean(overrides.has_viewed ?? profile.has_viewed ?? false),
  rejection_reason: overrides.rejection_reason ?? profile.rejection_reason ?? null,
  rejection_checklist: Array.isArray(overrides.rejection_checklist)
    ? overrides.rejection_checklist
    : (Array.isArray(profile.rejection_checklist) ? profile.rejection_checklist : []),
  latest_account_review_title: overrides.latest_account_review_title ?? profile.latest_account_review_title ?? null,
  latest_account_review_message: overrides.latest_account_review_message ?? profile.latest_account_review_message ?? null,
  latest_account_review_kind: overrides.latest_account_review_kind ?? profile.latest_account_review_kind ?? null,
  latest_account_review_at: overrides.latest_account_review_at ?? profile.latest_account_review_at ?? null,
  latest_account_review_seen_at: overrides.latest_account_review_seen_at ?? profile.latest_account_review_seen_at ?? null,
  document_resubmitted_at: overrides.document_resubmitted_at ?? profile.document_resubmitted_at ?? null,
  government_id: trimString(overrides.government_id || profile.government_id),
  government_id_url: trimString(overrides.government_id_url || profile.government_id_url),
  government_id_resubmission: trimString(overrides.government_id_resubmission || profile.government_id_resubmission),
  government_id_resubmission_url: trimString(overrides.government_id_resubmission_url || profile.government_id_resubmission_url),
  created_at: overrides.created_at ?? profile.created_at ?? nowIso(),
  updated_at: overrides.updated_at ?? nowIso(),
})
const normalizeManagementMode = (value) => trimString(value).toLowerCase().replace(/[\s_-]+/g, '_')
const truthyValue = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'approved', 'active'].includes(normalized)) return true
    if (['0', 'false', 'no', '', 'pending', 'rejected', 'archived', 'deleted'].includes(normalized)) return false
  }

  return Boolean(value)
}
const resolveApprovalFlag = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return truthyValue(fallback)
  }

  if (typeof value === 'string' && value.trim() === '') {
    return truthyValue(fallback)
  }

  return truthyValue(value)
}
const normalizeEmployeeProfile = (entry = {}, uid = '', fallbackEmail = '') => {
  const resolvedUid = trimString(uid || entry.uid || entry.id || entry.user_id)
  const status = trimString(entry.status).toLowerCase()
  return {
    ...entry,
    id: resolvedUid || trimString(entry.id || entry.uid || entry.user_id),
    uid: resolvedUid || trimString(entry.uid || entry.id || entry.user_id),
    email: normalizeEmail(entry.email || entry.company_email || fallbackEmail),
    first_name: trimString(entry.first_name || entry.given_name),
    middle_initial: trimString(entry.middle_initial || entry.middle_name),
    last_name: trimString(entry.last_name),
    role: normalizeRole(entry.role || 'employee'),
    status: status === 'active' ? 'approved' : trimString(entry.status || 'approved'),
    approval_status: status === 'active' ? 'approved' : trimString(entry.approval_status || entry.status || 'approved'),
    is_approved: resolveApprovalFlag(
      entry.is_approved,
      !['pending', 'rejected', 'archived', 'deleted'].includes(status),
    ),
    workspace_type: trimString(entry.workspace_type || 'company_staff'),
    account_source: trimString(entry.account_source || 'hr_created'),
    source_trace: Array.isArray(entry.source_trace) && entry.source_trace.length
      ? entry.source_trace
      : ['Employees Collection'],
  }
}
const isApprovedProfile = (profile = {}) => {
  const status = trimString(profile.status || profile.approval_status).toLowerCase()
  if (
    profile.is_approved !== undefined
    && profile.is_approved !== null
    && !(typeof profile.is_approved === 'string' && profile.is_approved.trim() === '')
    && !truthyValue(profile.is_approved)
  ) return false
  if (['pending', 'rejected', 'archived'].includes(status)) return false
  return true
}
const resolveBusinessDashboardPath = (profile = {}) => {
  const businessType = normalizeBusinessType(
    profile.business_type
    || profile.business?.business_type
    || profile.assigned_business?.business_type
  )
  const managementMode = normalizeManagementMode(
    profile.management_mode
    || profile.business?.management_mode
    || profile.assigned_business?.management_mode
  )
  const workspaceType = normalizeManagementMode(profile.workspace_type)

  if (businessType === 'company' || managementMode === 'hr' || workspaceType === 'hr_managed_company') {
    return '/HR/HrBusinessShell'
  }

  if (!isApprovedProfile(profile)) {
    return PUBLIC_ROLE_DASHBOARD.business
  }

  if (managementMode === 'business') {
    return '/Business/BusinessDashboard'
  }

  if (businessType === 'individual') {
    return '/Business/BusinessDashboard'
  }

  return PUBLIC_ROLE_DASHBOARD.business
}
const isFirebasePermissionError = (error) => {
  const code = String(error?.code || error?.error?.message || '').toLowerCase()
  const message = String(error?.message || error?.error?.message || '').toLowerCase()
  return code.includes('permission') || message.includes('permission')
}
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
const waitForSignedInUser = (timeoutMs = 4000) => new Promise((resolve) => {
  if (!firebaseAuth) {
    resolve(null)
    return
  }

  if (firebaseAuth.currentUser) {
    resolve(firebaseAuth.currentUser)
    return
  }

  let finished = false
  let unsubscribe = null

  const finish = (user) => {
    if (finished) return
    finished = true
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    resolve(user || firebaseAuth.currentUser || null)
  }

  unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
    if (user) finish(user)
  })

  window.setTimeout(() => finish(firebaseAuth.currentUser), timeoutMs)
})
const prepareRealtimeDatabaseWrite = async () => {
  const user = await waitForSignedInUser()
  if (!user) {
    const error = new Error('Firebase session is not ready for Realtime Database writes.')
    error.code = 'auth/session-not-ready'
    throw error
  }

  try {
    await user.getIdToken(true)
  } catch {
    // Keep the current session if token refresh is temporarily unavailable.
  }

  await wait(180)
  return user
}
const setProfileRecord = async (uid, profile) => {
  await prepareRealtimeDatabaseWrite()
  return set(dbRef(realtimeDb, `profiles/${uid}`), profile)
}
const normalizeFirebaseErrorText = (value) => String(value || '')
  .replace(/^firebase:\s*/i, '')
  .replace(/\((auth|functions)\/([^)]+)\)\.?/gi, '$2')
  .replace(/\s+/g, ' ')
  .trim()
const isGenericFirebaseErrorText = (value) => {
  const normalized = normalizeFirebaseErrorText(value).toLowerCase()
  return !normalized
    || normalized === 'internal'
    || normalized === 'internal-error'
    || normalized === 'internal error'
    || normalized === 'unknown'
    || normalized === 'error'
}
export const getFriendlyFirebaseErrorMessage = (
  error,
  fallback = 'Something went wrong. Please try again.',
  context = 'general',
) => {
  const code = String(
    error?.code
    || error?.details?.code
    || error?.error?.code
    || error?.error?.message
    || ''
  ).toLowerCase()
  const rawMessage = normalizeFirebaseErrorText(
    (typeof error?.details === 'string' ? error.details : '')
    || error?.details?.message
    || error?.message
    || error?.error?.message
    || ''
  )
  const message = rawMessage.toLowerCase()

  if (code.includes('email-already-in-use') || message.includes('already registered') || message.includes('already in use')) {
    return 'This email is already registered.'
  }
  if (code.includes('email_availability_unverified') || message.includes('unable to verify email availability')) {
    return 'Unable to verify email availability right now. Please check your Firebase Auth and Realtime Database access, then try again.'
  }
  if (code.includes('invalid-email') || message.includes('invalid email')) {
    return 'Please enter a valid email address.'
  }
  if (
    code.includes('invalid-credential')
    || code.includes('invalid-login-credentials')
    || code.includes('wrong-password')
    || code.includes('user-not-found')
    || message.includes('invalid credential')
    || message.includes('invalid login credentials')
    || message.includes('wrong password')
    || message.includes('user not found')
  ) {
    return 'Invalid email or password.'
  }
  if (code.includes('weak-password') || message.includes('weak password')) {
    return 'Your password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.'
  }
  if (code.includes('operation-not-allowed')) {
    return 'Email/password registration is not enabled in Firebase Auth.'
  }
  if (code.includes('network-request-failed') || code.includes('unavailable') || message.includes('network request failed') || message.includes('network error')) {
    return context === 'otp'
      ? 'The OTP service is unreachable right now. Check your internet connection and try again.'
      : 'Firebase is unreachable right now. Check your internet connection and try again.'
  }
  if (code.includes('too-many-requests') || message.includes('too many requests')) {
    return 'Too many attempts were made. Please wait a moment and try again.'
  }
  if (code.includes('permission') || message.includes('permission denied')) {
    return 'Firebase denied the request. Check your Firebase rules and project configuration.'
  }
  if (code.includes('not-found') || message.includes('not deployed')) {
    return context === 'otp'
      ? 'OTP service is not deployed. Please deploy Firebase Functions first.'
      : fallback
  }
  if (isGenericFirebaseErrorText(rawMessage) || code.includes('internal')) {
    return context === 'otp'
      ? 'We could not send your OTP right now. Please try again in a moment.'
      : 'We could not complete your registration right now. Please try again in a moment.'
  }
  return rawMessage || fallback
}
const isDevAdminEmail = (value) => DEV_ADMIN_EMAIL_ALIASES.has(normalizeEmail(value))
const isFirebaseStoragePermissionError = (error) => {
  const code = String(error?.code || error?.error?.code || error?.error?.message || '').toLowerCase()
  const message = String(error?.message || error?.error?.message || '').toLowerCase()
  return code.includes('storage/unauthorized')
    || code.includes('unauthorized')
    || code.includes('permission')
    || message.includes('unauthorized')
    || message.includes('permission')
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!(file instanceof File)) {
    resolve('')
    return
  }

  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(reader.error || new Error('Failed to read file as data URL.'))
  reader.readAsDataURL(file)
})

const getOtpCallable = () => {
  if (!firebaseFunctions) {
    throw new Error('OTP service is not configured. Firebase Functions is unavailable.')
  }
  return httpsCallable(firebaseFunctions, 'sendRegistrationOtp')
}
const getAvailabilityCallable = () => {
  if (!firebaseFunctions) {
    throw new Error('Registration availability service is not configured. Firebase Functions is unavailable.')
  }
  return httpsCallable(firebaseFunctions, 'checkRegistrationAvailability')
}

const FIREBASE_CONFIGURATION_HELP = 'Firebase is not configured. Add your Firebase web config to public/runtime-config.js or define the Vite Firebase variables before building.'
const FIREBASE_FUNCTIONS_REGION = trimString(firebaseFunctionsRegion || 'us-central1') || 'us-central1'

const getOtpHttpUrl = () => {
  const projectId = trimString(firebaseConfig?.projectId)
  if (!projectId) {
    throw new Error('OTP service is not configured. Firebase project ID is unavailable.')
  }
  return `https://${FIREBASE_FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/sendRegistrationOtpHttp`
}
const getAvailabilityHttpUrl = () => {
  const projectId = trimString(firebaseConfig?.projectId)
  if (!projectId) {
    throw new Error('Registration availability service is not configured. Firebase project ID is unavailable.')
  }
  return `https://${FIREBASE_FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/checkRegistrationAvailabilityHttp`
}

const sendRegistrationOtpViaHttp = async (payload) => {
  const response = await fetch(getOtpHttpUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      data?.error?.message
      || data?.message
      || `Failed to send OTP email. HTTP ${response.status}.`,
    )
    error.code = String(data?.error?.status || `http/${response.status}`)
    error.details = data?.error?.details
    throw error
  }

  return data || { sent: true, delivery: 'smtp' }
}
const probeRegistrationAvailabilityViaHttp = async ({ email = '', contactNumber = '' } = {}) => {
  const params = new URLSearchParams()
  if (email) params.set('email', email)
  if (contactNumber) params.set('contactNumber', contactNumber)

  const response = await fetch(`${getAvailabilityHttpUrl()}?${params.toString()}`, {
    method: 'GET',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      data?.error?.message
      || data?.message
      || `Failed to check registration availability. HTTP ${response.status}.`,
    )
    error.code = String(data?.error?.status || `http/${response.status}`)
    error.details = data?.error?.details
    throw error
  }

  return data || {}
}
const probeServerRegistrationAvailability = async ({ email = '', contactNumber = '' } = {}) => {
  if (!firebaseFunctions) return null

  const payload = {
    email: normalizeAuthEmail(email),
    contactNumber: normalizeContactNumber(contactNumber),
  }

  try {
    const callable = getAvailabilityCallable()
    const result = await callable(payload)
    return result?.data || null
  } catch (error) {
    const code = String(error?.code || '').toLowerCase()
    if (
      code.includes('permission')
      || code.includes('internal')
      || code.includes('unavailable')
      || code.includes('not-found')
    ) {
      try {
        return await probeRegistrationAvailabilityViaHttp(payload)
      } catch {
        return null
      }
    }
    return null
  }
}

const buildDisplayName = (profile = {}) => {
  const role = normalizeRole(profile.role)
  if (role === 'business') {
    return trimString(profile.business_name_1 || profile.business_name || profile.business_owner || profile.email) || 'Business User'
  }

  const first = trimString(profile.first_name || profile.business_owner_first)
  const last = trimString(profile.last_name || profile.business_owner_last)
  return [first, last].filter(Boolean).join(' ') || trimString(profile.email) || 'User'
}

const buildSidebarState = (role) => {
  const normalizedRole = normalizeRole(role)
  return {
    role: normalizedRole,
    section: normalizedRole || 'guest',
  }
}

const baseAuthState = () => ({
  user: {
    id: null,
    uid: null,
    name: 'Guest',
    email: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    role: 'guest',
    contact_number: '',
    profile_photo: '',
    is_approved: false,
  },
  sidebar: {},
  flags: {},
  employee_rbac: null,
})

const ensureFirebaseReady = () => {
  if (!firebaseConfigReady || !firebaseAuth || !realtimeDb || !storage) {
    throw new Error(FIREBASE_CONFIGURATION_HELP)
  }
}

const SECONDARY_AUTH_APP_NAME = 'thesis_capstone_staff_auth'
let secondaryAuth = null

const getSecondaryAuth = () => {
  if (!firebaseConfigReady) {
    throw new Error(FIREBASE_CONFIGURATION_HELP)
  }
  if (secondaryAuth) return secondaryAuth
  const existing = getApps().find((app) => app.name === SECONDARY_AUTH_APP_NAME)
  const app = existing || initializeApp(firebaseConfig, SECONDARY_AUTH_APP_NAME)
  secondaryAuth = getAuth(app)
  return secondaryAuth
}

const readStoredProfile = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getProfileCacheIdentity = (value) => {
  if (!value) {
    return { email: '', id: '' }
  }

  if (typeof value === 'string') {
    const trimmed = trimString(value)
    return {
      email: trimmed.includes('@') ? normalizeEmail(trimmed) : '',
      id: trimmed,
    }
  }

  return {
    email: normalizeEmail(value.email),
    id: trimString(value.uid || value.id),
  }
}

const profileCacheKey = (value) => {
  const identity = getProfileCacheIdentity(value)
  return identity.email || identity.id || ''
}

const normalizeStoredProfileCacheEntry = (profile = {}) => {
  const id = trimString(profile.id || profile.uid)
  const uid = trimString(profile.uid || profile.id)
  const email = normalizeEmail(profile.email)
  const status = trimString(profile.status || profile.approval_status)
  const approvalStatus = trimString(profile.approval_status || profile.status)
  const normalizedStatus = trimString(approvalStatus || status).toLowerCase()
  const isApproved = resolveApprovalFlag(
    profile.is_approved,
    !['pending', 'rejected', 'archived', 'deleted'].includes(normalizedStatus),
  )
  const nextProfile = {
    ...profile,
    id: id || uid,
    uid: uid || id,
    email: email || trimString(profile.email),
    status: status || (isApproved ? 'approved' : 'pending'),
    approval_status: approvalStatus || status || (isApproved ? 'approved' : 'pending'),
    is_approved: isApproved,
  }

  delete nextProfile.password
  delete nextProfile.password_confirmation

  return nextProfile
}

const stripLargeStoredFileValue = (value) => {
  const raw = trimString(value)
  if (!raw) return raw

  if (raw.startsWith('data:')) {
    return ''
  }

  if (raw.startsWith('local://') && raw.includes('?')) {
    return raw.slice(0, raw.indexOf('?'))
  }

  if ((raw.startsWith('blob:') || raw.includes('data:')) && raw.length > STORAGE_SAFE_URL_MAX_LENGTH) {
    return ''
  }

  return raw.length > STORAGE_SAFE_URL_MAX_LENGTH && /(src=|url=)/i.test(raw)
    ? raw.split('?')[0]
    : raw
}

const sanitizeStoredProfileValue = (value, key = '') => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeStoredProfileValue(entry, key))
      .filter((entry) => entry !== undefined)
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [entryKey, entryValue]) => {
      const sanitized = sanitizeStoredProfileValue(entryValue, entryKey)
      if (sanitized !== undefined) {
        accumulator[entryKey] = sanitized
      }
      return accumulator
    }, {})
  }

  if (typeof value === 'string') {
    if (
      key.endsWith('_url')
      || key.endsWith('_path')
      || key.endsWith('_photo')
      || key.endsWith('_file')
      || key === 'profile_photo'
      || key === 'profile_photo_url'
      || key === 'government_id'
      || key === 'government_id_resubmission'
    ) {
      return stripLargeStoredFileValue(value)
    }

    if (value.startsWith('data:') && value.length > 512) {
      return ''
    }
  }

  return value
}

const toMinimalStoredProfile = (profile = {}) => {
  const normalized = normalizeStoredProfileCacheEntry(profile)
  const minimal = {
    id: normalized.id,
    uid: normalized.uid,
    email: normalized.email,
    role: normalized.role,
    first_name: normalized.first_name,
    middle_initial: normalized.middle_initial,
    last_name: normalized.last_name,
    business_name: normalized.business_name,
    business_name_1: normalized.business_name_1,
    company_name: normalized.company_name,
    business_type: normalized.business_type,
    management_mode: normalized.management_mode,
    category: normalized.category,
    contact_number: normalized.contact_number,
    status: normalized.status,
    approval_status: normalized.approval_status,
    is_approved: normalized.is_approved,
    workspace_type: normalized.workspace_type,
    workspace_type_label: normalized.workspace_type_label,
    rejection_reason: normalized.rejection_reason,
    rejection_checklist: normalized.rejection_checklist,
    latest_account_review_title: normalized.latest_account_review_title,
    latest_account_review_message: normalized.latest_account_review_message,
    latest_account_review_kind: normalized.latest_account_review_kind,
    latest_account_review_at: normalized.latest_account_review_at,
    latest_account_review_seen_at: normalized.latest_account_review_seen_at,
    document_resubmitted_at: normalized.document_resubmitted_at,
    government_id: stripLargeStoredFileValue(normalized.government_id),
    government_id_url: stripLargeStoredFileValue(normalized.government_id_url),
    government_id_resubmission: stripLargeStoredFileValue(normalized.government_id_resubmission),
    government_id_resubmission_url: stripLargeStoredFileValue(normalized.government_id_resubmission_url),
  }

  return sanitizeStoredProfileValue(minimal)
}

const createStorageSafeProfile = (profile, { minimal = false } = {}) => {
  const normalized = normalizeStoredProfileCacheEntry(profile)
  if (minimal) {
    return normalizeStoredProfileCacheEntry(toMinimalStoredProfile(normalized))
  }
  return normalizeStoredProfileCacheEntry(sanitizeStoredProfileValue(normalized))
}

const readStoredProfileCacheMap = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.reduce((accumulator, entry) => {
        const normalized = normalizeStoredProfileCacheEntry(entry)
        const key = profileCacheKey(normalized)
        if (key) {
          accumulator[key] = normalized
        }
        return accumulator
      }, {})
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).reduce((accumulator, [key, entry]) => {
        const normalized = normalizeStoredProfileCacheEntry(entry)
        const nextKey = profileCacheKey(normalized) || trimString(key)
        if (nextKey) {
          accumulator[nextKey] = normalized
        }
        return accumulator
      }, {})
    }
  } catch {
    return {}
  }

  return {}
}

const writeStoredProfileCacheMap = (cache) => {
  if (typeof window === 'undefined') return
  try {
    const safeCache = Object.entries(cache || {}).reduce((accumulator, [key, entry]) => {
      const safeEntry = createStorageSafeProfile(entry)
      if (profileCacheKey(safeEntry)) {
        accumulator[key] = safeEntry
      }
      return accumulator
    }, {})
    window.localStorage.setItem(PROFILE_CACHE_STORAGE_KEY, JSON.stringify(safeCache))
  } catch {
    try {
      const fallbackCache = Object.entries(cache || {}).reduce((accumulator, [key, entry]) => {
        const safeEntry = createStorageSafeProfile(entry, { minimal: true })
        if (profileCacheKey(safeEntry)) {
          accumulator[key] = safeEntry
        }
        return accumulator
      }, {})
      window.localStorage.setItem(PROFILE_CACHE_STORAGE_KEY, JSON.stringify(fallbackCache))
    } catch {
      // Ignore cache write failures.
    }
  }
}

export const getStoredProfileCache = () => Object.values(readStoredProfileCacheMap())
  .filter(Boolean)

export const upsertStoredProfileCache = (profile) => {
  if (!profile) return null

  const normalized = normalizeStoredProfileCacheEntry(profile)
  const key = profileCacheKey(normalized)
  if (!key) return normalized

  const cache = readStoredProfileCacheMap()
  cache[key] = normalized
  writeStoredProfileCacheMap(cache)
  return normalized
}

export const removeStoredProfileCache = (profileOrId) => {
  const cache = readStoredProfileCacheMap()
  const identity = getProfileCacheIdentity(profileOrId)

  for (const [key, entry] of Object.entries(cache)) {
    const entryIdentity = getProfileCacheIdentity(entry)
    if (
      (identity.email && entryIdentity.email === identity.email)
      || (identity.id && entryIdentity.id === identity.id)
      || (identity.email && normalizeEmail(entry.email) === identity.email)
      || (identity.id && String(entry.uid || entry.id || '') === identity.id)
    ) {
      delete cache[key]
    }
  }

  writeStoredProfileCacheMap(cache)
  return true
}

const clearLocalRegistrationCache = ({ email = '', contactNumber = '' } = {}) => {
  const normalizedEmail = normalizeAuthEmail(email)
  const normalizedContact = normalizeContactNumber(contactNumber)

  const storedProfile = readStoredProfile()
  if (storedProfile) {
    const storedEmail = normalizeEmail(storedProfile.email)
    const storedContact = normalizeContactNumber(storedProfile.contact_number)
    if (
      (normalizedEmail && storedEmail === normalizedEmail)
      || (normalizedContact && storedContact === normalizedContact)
    ) {
      writeStoredProfile(null)
    }
  }

  if (!normalizedEmail && !normalizedContact) return

  const cache = readStoredProfileCacheMap()
  let changed = false
  for (const [key, entry] of Object.entries(cache)) {
    const entryEmail = normalizeEmail(entry?.email)
    const entryContact = normalizeContactNumber(entry?.contact_number)
    if (
      (normalizedEmail && entryEmail === normalizedEmail)
      || (normalizedContact && entryContact === normalizedContact)
    ) {
      delete cache[key]
      changed = true
    }
  }

  if (changed) {
    writeStoredProfileCacheMap(cache)
  }
}

const writeStoredProfile = (profile) => {
  if (typeof window === 'undefined') return
  if (!profile) {
    window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY)
    return
  }

  const nextProfile = createStorageSafeProfile(profile)

  try {
    window.localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
  } catch {
    try {
      const fallbackProfile = createStorageSafeProfile(profile, { minimal: true })
      window.localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(fallbackProfile))
    } catch {
      // Ignore auth profile write failures and keep the live Firebase session active.
    }
  }

  upsertStoredProfileCache(nextProfile)
}

export const getStoredAuthProfile = () => {
  const profile = readStoredProfile()
  return profile ? normalizeStoredProfileCacheEntry(profile) : null
}

export const syncStoredAuthProfile = (profile) => {
  if (!profile) return null
  const normalized = normalizeStoredProfileCacheEntry(profile)
  writeStoredProfile(normalized)
  return normalized
}

const buildDevAdminProfile = (uid, email) => ({
  id: uid,
  uid,
  email: trimString(email).toLowerCase(),
  ...DEV_ADMIN_PROFILE,
  created_at: Date.now(),
  updated_at: Date.now(),
})

const getOtpStorageKey = (email) => `${REGISTRATION_OTP_PREFIX}:${encodeKey(email)}`

const readOtpSession = (email) => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(getOtpStorageKey(email))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeOtpSession = (email, payload) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(getOtpStorageKey(email), JSON.stringify(payload))
}

const clearOtpSession = (email) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(getOtpStorageKey(email))
}

const setRegistrationRedirectSuppressed = (suppressed) => {
  if (typeof window === 'undefined') return
  if (suppressed) {
    window.sessionStorage.setItem(REGISTRATION_REDIRECT_SUPPRESSION_KEY, '1')
    return
  }
  window.sessionStorage.removeItem(REGISTRATION_REDIRECT_SUPPRESSION_KEY)
}

export const isRegistrationRedirectSuppressed = () => {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(REGISTRATION_REDIRECT_SUPPRESSION_KEY) === '1'
}

const mapFirebaseUserToAuthState = (firebaseUser, profile = null) => {
  if (!firebaseUser) return baseAuthState()

  const resolvedProfile = profile || readStoredProfile() || {}
  const role = normalizeRole(resolvedProfile.role)
  const normalizedApprovalStatus = trimString(resolvedProfile.approval_status || resolvedProfile.status).toLowerCase()
  const resolvedApproval = resolveApprovalFlag(
    resolvedProfile.is_approved,
    !['pending', 'rejected', 'archived', 'deleted'].includes(normalizedApprovalStatus),
  )
  const resolvedStatus = trimString(resolvedProfile.status || resolvedProfile.approval_status)
  const resolvedApprovalStatus = trimString(resolvedProfile.approval_status || resolvedProfile.status)
  const displayName = buildDisplayName({
    ...resolvedProfile,
    email: firebaseUser.email,
  })

  return {
    user: {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: displayName,
      email: firebaseUser.email || trimString(resolvedProfile.email),
      first_name: trimString(resolvedProfile.first_name || resolvedProfile.business_owner_first),
      middle_initial: trimString(resolvedProfile.middle_initial || resolvedProfile.business_owner_middle),
      last_name: trimString(resolvedProfile.last_name || resolvedProfile.business_owner_last),
      role: role || 'user',
      contact_number: trimString(resolvedProfile.contact_number),
      profile_photo: trimString(resolvedProfile.profile_photo_url || resolvedProfile.profile_photo),
      is_approved: resolvedApproval,
      status: resolvedStatus || (resolvedApproval ? 'approved' : 'pending'),
      approval_status: resolvedApprovalStatus || resolvedStatus || (resolvedApproval ? 'approved' : 'pending'),
      business_type: trimString(resolvedProfile.business_type),
      management_mode: trimString(resolvedProfile.management_mode),
      rejection_reason: trimString(resolvedProfile.rejection_reason),
      latest_account_review_title: trimString(resolvedProfile.latest_account_review_title),
      latest_account_review_message: trimString(resolvedProfile.latest_account_review_message),
      latest_account_review_kind: trimString(resolvedProfile.latest_account_review_kind),
      latest_account_review_at: trimString(resolvedProfile.latest_account_review_at),
      latest_account_review_seen_at: trimString(resolvedProfile.latest_account_review_seen_at),
    },
    sidebar: buildSidebarState(role),
    flags: {
      is_hr_manager: role === 'hr',
    },
    employee_rbac: resolvedProfile.employee_rbac || null,
  }
}

export const getStoredAuthState = () => mapFirebaseUserToAuthState(null, null)

export const getDashboardPathForRole = (roleOrProfile) => {
  const profile = roleOrProfile && typeof roleOrProfile === 'object' ? roleOrProfile : null
  const normalizedRole = normalizeRole(profile?.role || roleOrProfile)
  if (!normalizedRole || normalizedRole === 'guest') {
    return '/Auth/Login'
  }

  if (normalizedRole === 'business' && profile) {
    return resolveBusinessDashboardPath(profile)
  }

  return PUBLIC_ROLE_DASHBOARD[normalizedRole] || '/Public/Dashboard'
}

export const isPublicPath = (path) => {
  const normalized = trimString(path).split('?')[0] || '/'
  return normalized === '/'
    || normalized.startsWith('/Auth/')
    || normalized.startsWith('/Public/')
}

export const shouldRedirectAuthenticatedUser = (path) => {
  const normalized = trimString(path).split('?')[0] || '/'
  return normalized === '/'
    || normalized === '/Auth/Login'
    || normalized === '/Auth/Register'
    || normalized === '/login'
    || normalized === '/register'
}

export const createRoutePath = (rawPath = '') => {
  const normalized = trimString(rawPath)
  if (!normalized) return '/'
  if (normalized.startsWith('/')) return normalized
  if (normalized === 'login') return '/Auth/Login'
  if (normalized === 'register') return '/Auth/Register'
  return `/${normalized.replace(/^\/+/, '')}`
}

export const fetchUserProfile = async (uid, fallbackEmail = '') => {
  ensureFirebaseReady()
  if (!uid) return null
  try {
    const snapshot = await get(dbRef(realtimeDb, `profiles/${uid}`))
    if (!snapshot.exists()) {
      try {
        const employeeSnapshot = await get(dbRef(realtimeDb, `${APP_ROOT}/employees/${uid}`))
        if (employeeSnapshot.exists()) {
          const employeeProfile = normalizeEmployeeProfile(employeeSnapshot.val(), uid, fallbackEmail)
          writeStoredProfile(employeeProfile)
          return employeeProfile
        }
      } catch (employeeError) {
        if (!isFirebasePermissionError(employeeError)) throw employeeError
      }

      if (fallbackEmail) {
        try {
          const employeesSnapshot = await get(dbRef(realtimeDb, `${APP_ROOT}/employees`))
          if (employeesSnapshot.exists()) {
            const normalizedFallbackEmail = normalizeEmail(fallbackEmail)
            const matchedEntry = Object.entries(employeesSnapshot.val() || {}).find(([, entry]) =>
              normalizeEmail(entry?.email || entry?.company_email) === normalizedFallbackEmail
            )
            if (matchedEntry) {
              const [employeeUid, employeeEntry] = matchedEntry
              const employeeProfile = normalizeEmployeeProfile(employeeEntry, employeeUid, fallbackEmail)
              writeStoredProfile(employeeProfile)
              return employeeProfile
            }
          }
        } catch (employeesError) {
          if (!isFirebasePermissionError(employeesError)) throw employeesError
        }
      }

      const storedProfile = readStoredProfile()
      if (storedProfile && String(storedProfile.uid || storedProfile.id || '') === String(uid)) {
        return storedProfile
      }
      const cachedProfile = getStoredProfileCache().find((entry) => (
        String(entry.uid || entry.id || '') === String(uid)
        || normalizeEmail(entry.email) === normalizeEmail(fallbackEmail)
      ))
      if (cachedProfile) {
        return cachedProfile
      }
      return null
    }
    const profile = normalizeStoredProfileCacheEntry(snapshot.val() || {})
    writeStoredProfile(profile)
    return profile
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error

    const storedProfile = readStoredProfile()
    if (storedProfile && (
      String(storedProfile.uid || storedProfile.id || '') === String(uid)
      || normalizeEmail(storedProfile.email) === normalizeEmail(fallbackEmail)
    )) {
      return storedProfile
    }
    const cachedProfile = getStoredProfileCache().find((entry) => (
      String(entry.uid || entry.id || '') === String(uid)
      || normalizeEmail(entry.email) === normalizeEmail(fallbackEmail)
    ))
    if (cachedProfile) {
      return cachedProfile
    }
    return null
  }
}

export const syncFirebaseSession = async (firebaseUser) => {
  if (!firebaseUser) {
    writeStoredProfile(null)
    return baseAuthState()
  }

  let profile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email || '')
  if (!profile && isDevAdminEmail(firebaseUser.email)) {
    profile = buildDevAdminProfile(firebaseUser.uid, firebaseUser.email)
    writeStoredProfile(profile)
  }

  return mapFirebaseUserToAuthState(firebaseUser, profile)
}

export const watchFirebaseSession = (callback) => {
  if (!firebaseAuth || typeof callback !== 'function') {
    callback(baseAuthState())
    return () => {}
  }

  return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    try {
      const authState = await syncFirebaseSession(firebaseUser)
      callback(authState, firebaseUser)
    } catch (error) {
      callback(baseAuthState(), null, error)
    }
  })
}

export const checkEmailAvailability = async (email) => {
  const probe = await probeEmailAvailability(email)
  if (probe.verified) {
    return probe.available
  }

  const reason = String(probe?.reason || '').trim()
  const message = reason === 'missing_email'
    ? 'Email address is required.'
    : reason === 'invalid_email'
      ? 'Please enter a valid email address.'
    : 'Unable to verify email availability right now. Please check your Firebase Auth and Realtime Database access, then try again.'

  const error = new Error(message)
  error.code = reason || 'email_availability_unverified'
  error.details = probe
  throw error
}

export const probeEmailAvailability = async (email, options = {}) => {
  const preferServer = options.preferServer !== false
  const normalizedEmail = normalizeAuthEmail(email)
  if (!normalizedEmail) {
    return { available: false, verified: false, reason: 'missing_email' }
  }
  if (!isValidEmailAddress(normalizedEmail)) {
    return { available: false, verified: false, reason: 'invalid_email' }
  }
  ensureFirebaseReady()

  let authCheckFailed = false
  try {
    const signInMethods = await fetchSignInMethodsForEmail(firebaseAuth, normalizedEmail)
    if (Array.isArray(signInMethods) && signInMethods.length > 0) {
      return { available: false, verified: true, reason: 'firebase_auth' }
    }
  } catch {
    authCheckFailed = true
  }

  try {
    const indexRef = dbRef(realtimeDb, `email_index/${encodeKey(normalizedEmail)}`)
    const snapshot = await get(indexRef)
    if (snapshot.exists()) {
      const indexedUid = trimString(snapshot.val())
      if (indexedUid) {
        const profileSnapshot = await get(dbRef(realtimeDb, `profiles/${indexedUid}`)).catch((error) => {
          if (!isFirebasePermissionError(error)) throw error
          return null
        })
        if (
          profileSnapshot
          && profileSnapshot.exists()
          && normalizeEmail(profileSnapshot.val()?.email) === normalizedEmail
        ) {
          return { available: false, verified: true, reason: 'email_index' }
        }
      }

      clearLocalRegistrationCache({ email: normalizedEmail })
      try {
        await remove(indexRef)
      } catch (error) {
        if (!isFirebasePermissionError(error)) throw error
      }

      if (!authCheckFailed) {
        if (preferServer) {
          const serverProbe = await probeServerRegistrationAvailability({ email: normalizedEmail })
          if (serverProbe?.email?.verified) {
            return serverProbe.email
          }
        }
        return { available: true, verified: true, reason: 'stale_email_index' }
      }
    }
    if (!authCheckFailed) {
      if (preferServer) {
        const serverProbe = await probeServerRegistrationAvailability({ email: normalizedEmail })
        if (serverProbe?.email?.verified) {
          return serverProbe.email
        }
      }
      return { available: true, verified: true, reason: 'verified_available' }
    }
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  const serverProbe = await probeServerRegistrationAvailability({ email: normalizedEmail })
  if (serverProbe?.email) {
    return serverProbe.email
  }

  return {
    available: false,
    verified: false,
    reason: authCheckFailed ? 'auth_lookup_unavailable' : 'email_probe_unavailable',
  }
}

export const checkContactAvailability = async (contactNumber) => {
  ensureFirebaseReady()
  const normalizedContact = normalizeContactNumber(contactNumber)
  if (!normalizedContact) return true

  const serverProbe = await probeServerRegistrationAvailability({ contactNumber: normalizedContact })
  if (serverProbe?.contact?.verified) {
    return Boolean(serverProbe.contact.available)
  }

  try {
    const indexRef = dbRef(realtimeDb, `contact_index/${encodeKey(normalizedContact)}`)
    const snapshot = await get(indexRef)
    if (!snapshot.exists()) {
      return true
    }

    const indexedUid = trimString(snapshot.val())
    if (indexedUid) {
      const profileSnapshot = await get(dbRef(realtimeDb, `profiles/${indexedUid}`)).catch((error) => {
        if (!isFirebasePermissionError(error)) throw error
        return null
      })
      if (
        profileSnapshot
        && profileSnapshot.exists()
        && normalizeContactNumber(profileSnapshot.val()?.contact_number) === normalizedContact
      ) {
        return false
      }
    }

    clearLocalRegistrationCache({ contactNumber: normalizedContact })
    try {
      await remove(indexRef)
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }
    return true
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
    return true
  }
}

export const createStaffAuthUser = async ({ email, password, displayName }) => {
  ensureFirebaseReady()
  const normalizedEmail = normalizeAuthEmail(email)
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.')
  }
  if (!STRONG_PASSWORD_REGEX.test(String(password || ''))) {
    throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.')
  }

  const auth = getSecondaryAuth()
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
  if (displayName) {
    try {
      await updateProfile(credential.user, { displayName })
    } catch {
      // Best effort only.
    }
  }
  try {
    await signOut(auth)
  } catch {
    // Ignore secondary logout errors.
  }
  return { uid: credential.user.uid, email: normalizedEmail }
}

export const sendRegistrationOtp = async ({ email, role, contactNumber }) => {
  ensureFirebaseReady()
  const normalizedEmail = normalizeAuthEmail(email)
  if (!isValidEmailAddress(normalizedEmail)) {
    throw new Error('Please enter a valid email address.')
  }
  const availableEmail = await checkEmailAvailability(normalizedEmail)
  if (!availableEmail) {
    throw new Error('This email is already registered.')
  }
  const availableContact = await checkContactAvailability(contactNumber)
  if (!availableContact) {
    throw new Error('Existing contact number detected. This mobile number is already registered.')
  }
  const callable = getOtpCallable()
  const payload = {
    email: normalizedEmail,
    role: normalizeRole(role) || 'user',
    contactNumber: trimString(contactNumber),
  }
  try {
    const result = await callable(payload)
    return result?.data || { sent: true, delivery: 'smtp' }
  } catch (error) {
    const code = String(error?.code || '').toLowerCase()
    if (
      code.includes('permission')
      || code.includes('internal')
      || code.includes('unavailable')
      || code.includes('not-found')
    ) {
      try {
        return await sendRegistrationOtpViaHttp(payload)
      } catch (fallbackError) {
        throw new Error(getFriendlyFirebaseErrorMessage(fallbackError, 'Failed to send OTP email.', 'otp'))
      }
    }
    throw new Error(getFriendlyFirebaseErrorMessage(error, 'Failed to send OTP email.', 'otp'))
  }
}

export const verifyRegistrationOtpCode = async ({ email, otp }) => {
  ensureFirebaseReady()
  const normalizedEmail = normalizeAuthEmail(email)
  let record = null

  try {
    const snapshot = await get(dbRef(realtimeDb, `registration_otps/${encodeKey(normalizedEmail)}`))
    record = snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  if (!record) {
    record = readOtpSession(normalizedEmail)
  }

  if (!record) {
    throw new Error('No OTP request found for this email.')
  }

  if (Number(record.expiresAt || 0) < Date.now()) {
    try {
      await remove(dbRef(realtimeDb, `registration_otps/${encodeKey(normalizedEmail)}`))
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }
    clearOtpSession(normalizedEmail)
    throw new Error('OTP has expired. Please request a new code.')
  }

  if (trimString(record.otp) !== trimString(otp)) {
    throw new Error('Invalid OTP code.')
  }

  writeOtpSession(normalizedEmail, {
    ...record,
    verified: true,
    verifiedAt: Date.now(),
  })

  return true
}

const uploadFileIfPresent = async (uid, field, file) => {
  if (!(file instanceof File)) return null
  const extension = trimString(file.name).split('.').pop()
  const baseName = FILE_FIELD_LABELS[field] || field
  const target = storageRef(storage, `profiles/${uid}/${baseName}.${extension || 'bin'}`)
  try {
    const uploadResult = await uploadBytes(target, file)
    const downloadUrl = await getDownloadURL(uploadResult.ref)
    return {
      path: uploadResult.metadata.fullPath,
      url: downloadUrl,
      name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: Number(file.size || 0),
    }
  } catch (error) {
    if (!isFirebaseStoragePermissionError(error)) throw error

    const fallbackUrl = await fileToDataUrl(file)
    const fallbackPath = buildTemporaryFilePath('profiles', uid, `${baseName}.${extension || 'bin'}`, fallbackUrl)
    return {
      path: fallbackPath,
      url: fallbackUrl,
      name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: Number(file.size || 0),
      storage_status: 'local_fallback',
    }
  }
}

const normalizeRegistrationPayload = (form) => {
  const source = typeof form?.data === 'function' ? form.data() : form
  const payload = Object.entries(source || {}).reduce((acc, [key, value]) => {
    if (key === 'errors' || key === 'processing') return acc
    if (typeof value === 'function') return acc
    acc[key] = value
    return acc
  }, {})

  payload.role = normalizeRole(payload.role)
  payload.email = normalizeAuthEmail(payload.email)
  payload.company_email = trimString(payload.company_email).toLowerCase() || payload.email
  payload.contact_number = trimString(payload.contact_number)
  payload.business_owner = trimString(payload.business_owner)
  payload.business_name = trimString(payload.business_name)
  payload.address = trimString(payload.address)
  const normalizedBusinessType = normalizeBusinessType(payload.business_type)
  if (payload.role === 'business') {
    payload.management_mode = normalizedBusinessType === 'company' ? 'hr' : 'business'
    payload.workspace_type = normalizedBusinessType === 'company' ? 'hr_managed_company' : 'business_owner'
  }
  payload.is_approved = false
  payload.status = 'pending'
  payload.approval_status = 'pending'
  payload.has_viewed = false
  payload.archived_at = null
  payload.rejection_reason = null
  payload.rejection_checklist = []
  payload.latest_account_review_title = null
  payload.latest_account_review_message = null
  payload.latest_account_review_kind = null
  payload.latest_account_review_at = null
  payload.latest_account_review_seen_at = null
  payload.document_resubmitted_at = null
  payload.account_source = 'self_registered'
  payload.source_trace = ['Firebase Registration']
  payload.source_missing = []
  payload.created_at = Date.now()
  payload.updated_at = Date.now()
  return sanitizeFirebaseValue(payload)
}

export const registerWithFirebase = async (form) => {
  ensureFirebaseReady()
  const payload = normalizeRegistrationPayload(form)
  if (!isValidEmailAddress(payload.email)) {
    throw new Error('Please enter a valid email address.')
  }
  const available = await checkEmailAvailability(payload.email)
  if (!available) {
    throw new Error('This email is already registered.')
  }
  const availableContact = await checkContactAvailability(payload.contact_number)
  if (!availableContact) {
    throw new Error('Existing contact number detected. This mobile number is already registered.')
  }

  const otpSession = readOtpSession(payload.email)
  if (!otpSession?.verified) {
    throw new Error('Verify the OTP code before submitting the registration form.')
  }

  const persistence = browserSessionPersistence
  let credential = null
  let profileStored = false
  setRegistrationRedirectSuppressed(true)

  try {
    await setPersistence(firebaseAuth, persistence)
    try {
      credential = await createUserWithEmailAndPassword(firebaseAuth, payload.email, payload.password)
    } catch (error) {
      throw new Error(getFriendlyFirebaseErrorMessage(error, 'Unable to create your Firebase account. Please try again.', 'registration'))
    }
    const uid = credential.user.uid

    const uploadedFiles = {}
    for (const field of fileFields) {
      const uploaded = await uploadFileIfPresent(uid, field, payload[field])
      if (uploaded) {
        uploadedFiles[field] = uploaded.path
        uploadedFiles[`${field}_url`] = uploaded.url
        uploadedFiles[`${field}_meta`] = {
          name: uploaded.name,
          content_type: uploaded.content_type,
          size: uploaded.size,
        }
      }
    }

    const profile = sanitizeFirebaseValue({
      ...payload,
      ...uploadedFiles,
      uid,
      id: uid,
      password: undefined,
      password_confirmation: undefined,
    })

    delete profile.password
    delete profile.password_confirmation

    writeStoredProfile(profile)

    try {
      await setProfileRecord(uid, profile)
      profileStored = true
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
      try {
        await deleteUser(credential.user)
      } catch {
        // Ignore auth rollback failures and surface the database write failure below.
      }
      writeStoredProfile(null)
      throw new Error('Firebase Auth account was created, but saving the profile to Realtime Database was denied. Check your Firebase Database rules for the profiles node.')
    }

    try {
      await set(dbRef(realtimeDb, `email_index/${encodeKey(payload.email)}`), uid)
      if (payload.contact_number) {
        await set(dbRef(realtimeDb, `contact_index/${encodeKey(payload.contact_number)}`), uid)
      }
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }

    try {
      await set(
        dbRef(realtimeDb, `${APP_ROOT}/admin_review_queue/${uid}`),
        buildAdminReviewQueueRecord(profile, {
          status: 'pending',
          approval_status: 'pending',
          is_approved: false,
          has_viewed: false,
        }),
      )
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }

    try {
      await updateProfile(credential.user, {
        displayName: buildDisplayName(profile),
      })
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }

    try {
      await remove(dbRef(realtimeDb, `registration_otps/${encodeKey(payload.email)}`))
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }
    clearOtpSession(payload.email)

    await signOut(firebaseAuth)
    writeStoredProfile(null)

    return {
      user: credential.user,
      profile,
    }
  } catch (error) {
    if (credential?.user) {
      try {
        await signOut(firebaseAuth)
      } catch {
        // Ignore logout cleanup failures during registration rollback.
      }
      writeStoredProfile(null)
    }
    throw new Error(
      getFriendlyFirebaseErrorMessage(
        error,
        error instanceof Error ? error.message : 'Registration failed. Please check your input.',
        'registration',
      ),
    )
  } finally {
    setRegistrationRedirectSuppressed(false)
  }
}

export const loginWithFirebase = async ({ email, password, remember = false }) => {
  ensureFirebaseReady()
  const persistence = remember ? browserLocalPersistence : browserSessionPersistence
  await setPersistence(firebaseAuth, persistence)
  const normalizedEmail = normalizeAuthEmail(email)
  let credential = null
  try {
    credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
  } catch (error) {
    throw new Error(
      getFriendlyFirebaseErrorMessage(
        error,
        'Login failed. Please check your email and password.',
        'login',
      ),
    )
  }
  let profile = await fetchUserProfile(credential.user.uid, credential.user.email || normalizedEmail)
  if (!profile && isDevAdminEmail(normalizedEmail)) {
    profile = buildDevAdminProfile(credential.user.uid, credential.user.email || email)
    writeStoredProfile(profile)
  }
  return {
    user: credential.user,
    profile,
    redirect: getDashboardPathForRole(profile || { role: profile?.role }),
  }
}

export const logoutWithFirebase = async () => {
  if (firebaseAuth) {
    await signOut(firebaseAuth)
  }
  writeStoredProfile(null)
}

export const sendPasswordResetWithFirebase = async (email) => {
  ensureFirebaseReady()
  await sendPasswordResetEmail(firebaseAuth, normalizeAuthEmail(email))
  return true
}
