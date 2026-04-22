import {
  checkEmailAvailability,
  checkContactAvailability,
  createStaffAuthUser,
  fetchUserProfile,
  getStoredAuthProfile,
  getDashboardPathForRole,
  getStoredProfileCache,
  loginWithFirebase,
  logoutWithFirebase,
  removeStoredProfileCache,
  registerWithFirebase,
  probeEmailAvailability,
  sendPasswordResetWithFirebase,
  sendRegistrationOtp,
  syncStoredAuthProfile,
  upsertStoredProfileCache,
  verifyRegistrationOtpCode,
} from '@/lib/firebase-auth'
import { queueLoggedOutToast } from '@/lib/app-toast'
import { firebaseAuth, firebaseConfigReady, realtimeDb, storage } from '@/firebase/client'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { equalTo, get, orderByChild, push, query, ref as dbRef, remove, set, update } from 'firebase/database'
import { buildTemporaryFilePath } from '@/lib/file-url'
import { getSqlSeedUsers } from '@/lib/sql-user-seed'

const APP_ROOT = 'app_data'
const ROLE_SEGMENTS = new Set(['admin', 'user', 'business', 'employee', 'finance', 'hr', 'operational', 'procurement', 'service-provider', 'serviceprovider', 'csr', 'profile', 'public'])
const DOCUMENT_FILE_FIELDS = [
  'government_id',
  'bir_registration',
  'dti_registration',
  'mayor_permit',
  'business_permit',
  'sanitary_permit',
]
const ENTITY_ALIASES = {
  businesses: 'businesses',
  'all-businesses': 'businesses',
  'service-requests': 'service_requests',
  requests: 'service_requests',
  notifications: 'notifications',
  'service-providers': 'service_providers',
  providers: 'service_providers',
  'available-providers': 'service_providers',
  employees: 'employees',
  'available-employees': 'employees',
  'formed-teams': 'teams',
  teams: 'teams',
  applications: 'applications',
  'pending-applications': 'applications',
  permits: 'permits',
  invoices: 'invoices',
  payouts: 'payouts',
  refunds: 'refunds',
  payrolls: 'payrolls',
  payslips: 'payrolls',
  'fleet-shifts': 'fleet_shifts',
  'truck-shifts': 'fleet_shifts',
  'shift-allocations': 'fleet_shifts',
  inventory: 'inventory',
  'inventory-summary': 'inventory',
  'stock-orders': 'stock_orders',
  orders: 'stock_orders',
  reviews: 'reviews',
  'pricing-rules': 'pricing_rules',
  reports: 'reports',
  'material-template-options': 'material_templates',
  'audit-logs': 'audit_logs',
  'attendance-data': 'attendance_records',
}

const nowIso = () => new Date().toISOString()
const trimString = (value) => String(value ?? '').trim()
const normalizeEmail = (value) => trimString(value).toLowerCase()
const normalizeEmailCandidate = (value) => normalizeEmail(value).replace(/\s+/g, '')
const toArray = (value) => Array.isArray(value) ? value : []
const normalizeKey = (value) => trimString(value).replace(/[.#$/\[\]]/g, '_')
const humanizeChecklistValue = (value) => trimString(value).replace(/_/g, ' ')
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

const isExternalUrl = (url) => /^https?:\/\//i.test(String(url || ''))
const isFirebaseStoragePermissionError = (error) => {
  const code = String(error?.code || error?.error?.code || error?.error?.message || '').toLowerCase()
  const message = String(error?.message || error?.error?.message || '').toLowerCase()
  return code.includes('storage/unauthorized')
    || code.includes('unauthorized')
    || code.includes('permission')
    || message.includes('unauthorized')
    || message.includes('permission')
}
const isFirebasePermissionError = (error) => {
  const code = String(error?.code || error?.error?.code || error?.error?.message || '').toLowerCase()
  const message = String(error?.message || error?.error?.message || '').toLowerCase()
  return code.includes('permission') || message.includes('permission')
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const prepareRealtimeDatabaseWrite = async () => {
  if (!firebaseAuth) {
    const error = new Error('Firebase session is not ready for Realtime Database writes.')
    error.code = 'auth/session-not-ready'
    throw error
  }

  let currentUser = firebaseAuth.currentUser
  for (let attempt = 0; !currentUser && attempt < 10; attempt += 1) {
    await wait(120)
    currentUser = firebaseAuth.currentUser
  }

  if (!currentUser) {
    const error = new Error('Firebase session is not ready for Realtime Database writes.')
    error.code = 'auth/session-not-ready'
    throw error
  }

  try {
    await currentUser.getIdToken(true)
  } catch {
    // Keep the current session if token refresh is temporarily unavailable.
  }

  await wait(180)
  return currentUser
}
const setProfileRecord = async (uid, payload) => {
  await prepareRealtimeDatabaseWrite()
  return set(dbRef(realtimeDb, `profiles/${uid}`), payload)
}

const collectKnownEmails = (record) => {
  if (!record) return []
  const emails = new Set()
  const direct = normalizeEmailCandidate(record.email || record.company_email || record?.user?.email || '')
  if (direct) emails.add(direct)
  return [...emails]
}

const isDuplicateEmail = async (email, { excludeEntity = '', excludeId = '' } = {}) => {
  const target = normalizeEmailCandidate(email)
  if (!target) return false

  const matches = (record, entityName) => {
    if (!record) return false
    const recordId = normalizeKey(record?.id || record?.uid || '')
    if (excludeEntity === entityName && recordId && recordId === normalizeKey(excludeId)) return false
    return collectKnownEmails(record).includes(target)
  }

  let profiles = []
  try {
    const snapshot = await get(dbRef(realtimeDb, 'profiles'))
    profiles = snapshot.exists()
      ? Object.values(snapshot.val() || {}).map((entry) => ({
          ...entry,
          id: entry?.id || entry?.uid,
          uid: entry?.uid || entry?.id,
        }))
      : []
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  const [providers, employees] = await Promise.all([
    listCollection('service_providers').catch(() => []),
    listCollection('employees').catch(() => []),
  ])

  return profiles.some((record) => matches(record, 'profiles'))
    || providers.some((record) => matches(record, 'service_providers'))
    || employees.some((record) => matches(record, 'employees'))
}

const normalizePayload = (payload) => {
  if (!payload) return {}
  const source = typeof payload?.data === 'function' ? payload.data() : payload
  if (source instanceof FormData) {
    const result = {}
    for (const [key, value] of source.entries()) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const existing = result[key]
        result[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value]
      } else {
        result[key] = value
      }
    }
    return sanitizeFirebaseValue(result)
  }
  if (typeof source === 'string') {
    try {
      return sanitizeFirebaseValue(JSON.parse(source))
    } catch {
      return {}
    }
  }
  return sanitizeFirebaseValue(source)
}

const buildAxiosResponse = (config, data, status = 200, statusText = 'OK') => ({
  data,
  status,
  statusText,
  headers: {},
  config,
  request: null,
})

const buildAxiosError = (config, message, status = 422, data = {}) => {
  const error = new Error(message)
  error.config = config
  error.response = buildAxiosResponse(config, { message, ...data }, status, 'Error')
  return error
}

const getPathInfo = (url) => {
  const source = String(url || '').split('?')[0]
  const segments = source.split('/').map((segment) => trimString(segment)).filter(Boolean)
  return {
    source,
    segments,
    first: segments[0] || '',
    last: segments[segments.length - 1] || '',
  }
}

const entityFromSegments = (segments = []) => {
  for (const segment of [...segments].reverse()) {
    if (ENTITY_ALIASES[segment]) return ENTITY_ALIASES[segment]
  }
  return null
}

const isIdSegment = (value) => /^[A-Za-z0-9_-]{6,}$/.test(String(value || '')) || /^\d+$/.test(String(value || ''))

const clone = (value) => JSON.parse(JSON.stringify(value))

const normalizeAdminRole = (value) => trimString(value).toLowerCase().replace(/[\s-]+/g, '_')

const titleCaseFromKey = (value) => trimString(value)
  .split('_')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const normalizeBusinessType = (value) => {
  const raw = trimString(value)
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')

  if (
    ['company', 'corporation', 'corporate'].includes(raw)
    || (raw.includes('hr') && raw.includes('managed') && raw.includes('company'))
    || (raw.includes('company') && raw.includes('managed'))
  ) {
    return 'company'
  }

  if ([
    'individual',
    'small business',
    'smallbusiness',
    'small biz',
    'individual small business',
    'sole proprietor',
    'sole proprietorship',
  ].includes(raw)) {
    return 'individual'
  }

  return ''
}

const deriveManagementMode = (profile = {}) => {
  const explicit = normalizeAdminRole(
    profile.management_mode
    || profile.business?.management_mode
    || profile.assigned_business?.management_mode
  )

  if (explicit === 'hr') return 'hr'
  if (explicit === 'business') return 'business'

  const businessType = normalizeBusinessType(
    profile.business_type
    || profile.business?.business_type
    || profile.assigned_business?.business_type
  )

  if (businessType === 'company') return 'hr'
  if (businessType === 'individual') return 'business'
  return ''
}

const isCompanyStaffRole = (role) => [
  'hr',
  'finance',
  'procurement',
  'operational',
  'operational_management',
  'csr',
  'employee',
].includes(normalizeAdminRole(role))

const OFFICE_DEPARTMENT_ROLES = new Set([
  'hr',
  'finance',
  'procurement',
  'operational',
  'operational_management',
  'csr',
])

const isOfficeDepartmentRole = (role) => OFFICE_DEPARTMENT_ROLES.has(normalizeAdminRole(role))

const isApprovedEmployeeRecord = (employee = {}) => {
  const approval = normalizeStatus(employee?.approval_status)
  const status = normalizeStatus(employee?.status)
  const approvedFlag = resolveApprovalFlag(employee?.is_approved, false)

  if (approval === 'approved') return employee?.is_approved === false ? false : true
  if (approval === 'active') return approvedFlag
  if (typeof employee?.is_approved === 'boolean') return employee.is_approved
  if (status === 'approved') return true
  if (status === 'active') return approvedFlag
  return false
}

const shouldAutoApproveDepartmentAccount = (payload = {}) => {
  if (payload?.auto_approve === true) return true
  if (trimString(payload?.account_source) === 'hr_department_account') return true

  const role = normalizeAdminRole(payload?.role)
  if (!isOfficeDepartmentRole(role)) return false

  return !trimString(payload?.service_provider_id || payload?.serviceProviderId || payload?.service_provider?.id)
}

const isHrManagedRequest = (request = {}) => (
  deriveManagementMode({
    ...(request || {}),
    business: request?.business || null,
    assigned_business: request?.assigned_business || request?.business || null,
  }) === 'hr'
  || normalizeBusinessType(
    request?.business_type
    || request?.business?.business_type
    || request?.assigned_business?.business_type
  ) === 'company'
)

const applyScopedRequestVisibility = (rows = [], profile = {}, scopedIds = new Set()) => {
  if (scopedIds.size) {
    return rows.filter((row) => isRequestInBusinessScope(row, scopedIds))
  }

  if (isCompanyStaffRole(profile?.role)) {
    return rows.filter((row) => isHrManagedRequest(row))
  }

  return rows
}

const applyScopedOrderVisibility = (rows = [], profile = {}, scopedIds = new Set()) => {
  if (scopedIds.size) {
    return rows.filter((row) => isOrderInBusinessScope(row, scopedIds))
  }

  if (isCompanyStaffRole(profile?.role)) {
    return rows.filter((row) => (
      deriveManagementMode({
        ...(row || {}),
        business: row?.business || null,
        assigned_business: row?.assigned_business || row?.business || null,
      }) === 'hr'
      || normalizeBusinessType(row?.business_type || row?.business?.business_type) === 'company'
    ))
  }

  return rows
}

const workspaceTypeForRole = (role) => {
  switch (normalizeAdminRole(role)) {
    case 'admin':
      return 'platform_admin'
    case 'business':
      return 'business_owner'
    case 'serviceprovider':
    case 'service_provider':
      return 'service_provider'
    case 'employee':
    case 'hr':
    case 'finance':
    case 'procurement':
    case 'operational':
    case 'operational_management':
    case 'csr':
      return 'company_staff'
    case 'user':
      return 'customer_portal'
    default:
      return normalizeAdminRole(role) || 'general_workspace'
  }
}

const workspaceTypeForProfile = (profile = {}) => {
  const role = normalizeAdminRole(profile.role)
  if (role === 'business') {
    const businessType = normalizeBusinessType(
      profile.business_type
      || profile.business?.business_type
      || profile.assigned_business?.business_type
    )
    const managementMode = deriveManagementMode(profile)

    if (businessType === 'company' || managementMode === 'hr') {
      return 'hr_managed_company'
    }

    return 'business_owner'
  }

  return workspaceTypeForRole(role)
}

const prettyWorkspaceType = (value) => {
  const normalized = normalizeAdminRole(value)
  if (!normalized) return 'General Workspace'
  const labels = {
    platform_admin: 'Platform Administrator',
    business_owner: 'Business Owner',
    hr_managed_company: 'HR-Managed Company',
    company_staff: 'Company Staff',
    service_provider: 'Service Provider',
    service_team: 'Service Team',
    customer_portal: 'Customer Portal User',
  }
  return labels[normalized] || titleCaseFromKey(normalized)
}

const prettyAccountSource = (value) => {
  const normalized = normalizeAdminRole(value)
  if (!normalized) return 'Unspecified'
  const labels = {
    admin_created: 'Admin-Created Account',
    self_registered: 'Self-Registered Account',
    offline_registered: 'Offline Registered Account',
    firestore: 'Firestore',
    firebase_auth: 'Firebase Authentication',
    auth_table: 'Auth Table',
    legacy_snapshot: 'Legacy Snapshot',
    admin_snapshot: 'Admin Snapshot',
    cache: 'Cache',
  }
  return labels[normalized] || titleCaseFromKey(normalized)
}

const adminUserName = (profile = {}) => {
  const first = trimString(profile.first_name)
  const middle = trimString(profile.middle_initial)
  const last = trimString(profile.last_name)
  const fullName = [first, middle ? `${middle}.` : '', last]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return fullName
    || trimString(profile.display_name)
    || trimString(profile.business_name)
    || trimString(profile.company_name)
    || trimString(profile.email)
    || 'Unnamed user'
}

const normalizeAdminProfileRecord = (profile = {}, defaults = {}) => {
  const source = { ...defaults, ...profile }
  const hasOwnField = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key)
  const email = trimString(source.email || source.company_email || source?.user?.email).toLowerCase()
  const id = trimString(source.id || source.uid || defaults.id || defaults.uid || email)
  const uid = trimString(source.uid || source.id || defaults.uid || defaults.id || id)
  const role = normalizeAdminRole(source.role)
  const status = trimString(source.status || source.approval_status || defaults.status || '')
  const isApproved = resolveApprovalFlag(
    source.is_approved ?? defaults.is_approved,
    !status || status === 'approved',
  )
  const workspaceType = trimString(source.workspace_type || defaults.workspace_type || workspaceTypeForProfile(source))
  const accountSource = trimString(source.account_source || defaults.account_source || 'cache')
  const sourceTrace = Array.isArray(source.source_trace)
    ? source.source_trace.filter(Boolean)
    : Array.isArray(defaults.source_trace)
      ? defaults.source_trace.filter(Boolean)
      : []
  const sourceMissing = Array.isArray(source.source_missing)
    ? source.source_missing.filter(Boolean)
    : Array.isArray(defaults.source_missing)
      ? defaults.source_missing.filter(Boolean)
      : []
  const createdAt = source.created_at || defaults.created_at || nowIso()
  const updatedAt = source.updated_at || defaults.updated_at || createdAt

  const nextProfile = {
    ...defaults,
    ...source,
    id: id || uid,
    uid: uid || id,
    firebase_uid: source.firebase_uid || uid || id,
    email,
    role,
    first_name: trimString(source.first_name || defaults.first_name),
    middle_initial: trimString(source.middle_initial || defaults.middle_initial),
    last_name: trimString(source.last_name || defaults.last_name),
    display_name: adminUserName(source),
    name: adminUserName(source),
    status: status || (isApproved ? 'approved' : 'pending'),
    approval_status: status || (isApproved ? 'approved' : 'pending'),
    is_approved: isApproved,
    workspace_type: workspaceType,
    workspace_type_label: trimString(source.workspace_type_label || defaults.workspace_type_label || prettyWorkspaceType(workspaceType)),
    account_source: accountSource,
    account_source_label: trimString(source.account_source_label || defaults.account_source_label || prettyAccountSource(accountSource)),
    source_trace: sourceTrace.length ? sourceTrace : ['Firebase Auth'],
    source_trace_label: trimString(source.source_trace_label || defaults.source_trace_label || (sourceTrace.length ? sourceTrace.join(' > ') : 'Firebase Auth')),
    source_missing: sourceMissing,
    source_missing_label: trimString(source.source_missing_label || defaults.source_missing_label || (sourceMissing.length ? `Missing: ${sourceMissing.join(' > ')}` : '')),
    created_at: createdAt,
    updated_at: updatedAt,
  }

  if (source.business || defaults.business) {
    nextProfile.business = source.business || defaults.business
  }
  if (source.assigned_business || defaults.assigned_business) {
    nextProfile.assigned_business = source.assigned_business || defaults.assigned_business
  }
  if (source.business_id || defaults.business_id) {
    nextProfile.business_id = source.business_id || defaults.business_id
  }
  if (source.company_name || defaults.company_name) {
    nextProfile.company_name = source.company_name || defaults.company_name
  }
  if (hasOwnField(profile, 'archived_at') || hasOwnField(defaults, 'archived_at')) {
    const archivedAt = source.archived_at ?? defaults.archived_at ?? null
    if (archivedAt) {
      nextProfile.archived_at = archivedAt
    } else {
      delete nextProfile.archived_at
    }
  }
  if (hasOwnField(profile, 'rejection_reason') || hasOwnField(defaults, 'rejection_reason')) {
    const rejectionReason = source.rejection_reason ?? defaults.rejection_reason ?? null
    if (rejectionReason) {
      nextProfile.rejection_reason = rejectionReason
    } else {
      delete nextProfile.rejection_reason
    }
  }
  if (Array.isArray(source.rejection_checklist) || Array.isArray(defaults.rejection_checklist)) {
    nextProfile.rejection_checklist = Array.isArray(source.rejection_checklist)
      ? source.rejection_checklist.filter(Boolean)
      : Array.isArray(defaults.rejection_checklist)
        ? defaults.rejection_checklist.filter(Boolean)
        : []
  }
  if (hasOwnField(profile, 'latest_account_review_title') || hasOwnField(defaults, 'latest_account_review_title')) {
    const reviewTitle = source.latest_account_review_title ?? defaults.latest_account_review_title ?? null
    if (reviewTitle) {
      nextProfile.latest_account_review_title = reviewTitle
    } else {
      delete nextProfile.latest_account_review_title
    }
  }
  if (hasOwnField(profile, 'latest_account_review_message') || hasOwnField(defaults, 'latest_account_review_message')) {
    const reviewMessage = source.latest_account_review_message ?? defaults.latest_account_review_message ?? null
    if (reviewMessage) {
      nextProfile.latest_account_review_message = reviewMessage
    } else {
      delete nextProfile.latest_account_review_message
    }
  }
  if (hasOwnField(profile, 'latest_account_review_kind') || hasOwnField(defaults, 'latest_account_review_kind')) {
    const reviewKind = source.latest_account_review_kind ?? defaults.latest_account_review_kind ?? null
    if (reviewKind) {
      nextProfile.latest_account_review_kind = reviewKind
    } else {
      delete nextProfile.latest_account_review_kind
    }
  }
  if (hasOwnField(profile, 'latest_account_review_at') || hasOwnField(defaults, 'latest_account_review_at')) {
    const reviewAt = source.latest_account_review_at ?? defaults.latest_account_review_at ?? null
    if (reviewAt) {
      nextProfile.latest_account_review_at = reviewAt
    } else {
      delete nextProfile.latest_account_review_at
    }
  }
  if (hasOwnField(profile, 'latest_account_review_seen_at') || hasOwnField(defaults, 'latest_account_review_seen_at')) {
    const reviewSeenAt = source.latest_account_review_seen_at ?? defaults.latest_account_review_seen_at ?? null
    if (reviewSeenAt) {
      nextProfile.latest_account_review_seen_at = reviewSeenAt
    } else {
      delete nextProfile.latest_account_review_seen_at
    }
  }
  if (source.has_viewed !== undefined || defaults.has_viewed !== undefined) {
    nextProfile.has_viewed = source.has_viewed ?? defaults.has_viewed ?? false
  }

  delete nextProfile.password
  delete nextProfile.password_confirmation

  return nextProfile
}

const buildAdminReviewQueueRecord = (profile = {}, overrides = {}) => sanitizeFirebaseValue({
  id: trimString(overrides.id || profile.uid || profile.id || profile.email),
  uid: trimString(overrides.uid || profile.uid || profile.id || profile.email),
  firebase_uid: trimString(overrides.firebase_uid || profile.uid || profile.id || profile.email),
  email: trimString(overrides.email || profile.email || profile.company_email).toLowerCase(),
  first_name: trimString(overrides.first_name || profile.first_name || profile.business_owner_first),
  middle_initial: trimString(overrides.middle_initial || profile.middle_initial || profile.business_owner_middle),
  last_name: trimString(overrides.last_name || profile.last_name || profile.business_owner_last),
  business_name: trimString(overrides.business_name || profile.business_name || profile.business_name_1),
  company_name: trimString(overrides.company_name || profile.company_name || profile.business_name || profile.business_name_1),
  business_type: trimString(overrides.business_type || profile.business_type),
  management_mode: trimString(overrides.management_mode || profile.management_mode),
  business_id: trimString(overrides.business_id || profile.business_id),
  role: normalizeAdminRole(overrides.role || profile.role || 'user'),
  workspace_type: trimString(overrides.workspace_type || profile.workspace_type || workspaceTypeForProfile(profile)),
  account_source: trimString(overrides.account_source || profile.account_source || 'self_registered'),
  source_trace: Array.isArray(overrides.source_trace)
    ? overrides.source_trace
    : (Array.isArray(profile.source_trace) ? profile.source_trace : ['Firebase Registration']),
  status: trimString(overrides.status || profile.status || 'pending') || 'pending',
  approval_status: trimString(overrides.approval_status || profile.approval_status || profile.status || 'pending') || 'pending',
  is_approved: resolveApprovalFlag(overrides.is_approved ?? profile.is_approved, false),
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

const getAdminUsersPathInfo = (segments = []) => {
  const isAdminUsers = segments[0] === 'admin' && segments[1] === 'users'
  if (!isAdminUsers) {
    return { isAdminUsers: false, id: null, action: '' }
  }

  const thirdSegment = trimString(segments[2])
  if (!thirdSegment) {
    return { isAdminUsers: true, id: null, action: '' }
  }

  if (thirdSegment === 'list' || thirdSegment === 'refresh-firebase') {
    return { isAdminUsers: true, id: null, action: thirdSegment }
  }

  return {
    isAdminUsers: true,
    id: thirdSegment,
    action: segments.slice(3).join('/'),
  }
}

const findProfileById = (profiles, userId) => {
  const target = trimString(userId)
  if (!target) return null
  const normalizedTarget = target.toLowerCase()
  return (Array.isArray(profiles) ? profiles : []).find((profile) => (
    String(profile.id || profile.uid || profile.firebase_uid || '') === target
    || String(profile.uid || profile.id || profile.firebase_uid || '') === target
    || normalizeEmail(profile.email) === normalizedTarget
  )) || null
}

const persistAdminProfile = async (profile, defaults = {}, writeDb = true) => {
  const nextProfile = normalizeAdminProfileRecord(profile, defaults)
  if (writeDb) {
    nextProfile.updated_at = trimString(profile?.updated_at) || nowIso()
  }
  upsertStoredProfileCache(nextProfile)

  if (writeDb) {
    try {
      await setProfileRecord(nextProfile.uid, nextProfile)
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }
  }

  return nextProfile
}
const syncEmployeeApprovalProfile = async (employee = {}, overrides = {}) => {
  const identity = trimString(employee?.uid || employee?.user_id || employee?.id || employee?.email)
  const email = normalizeEmailCandidate(employee?.email || '')
  if (!identity && !email) return null

  const profiles = await listProfiles().catch(() => [])
  const existingProfile = findProfileById(profiles, identity) || findProfileById(profiles, email)
  if (!existingProfile && !email) return null

  const approvalState = normalizeEmployeeApprovalState(
    overrides.approval_state || employee?.approval_status || employee?.status
  )
  const requestedStatus = trimString(
    overrides.requested_status
    || employee?.requested_status
    || employee?.employment_status
    || 'Active'
  ) || 'Active'

  return await persistAdminProfile({
    ...existingProfile,
    id: trimString(existingProfile?.id || employee?.uid || employee?.user_id || employee?.id || email),
    uid: trimString(existingProfile?.uid || employee?.uid || employee?.user_id || employee?.id || email),
    email: trimString(existingProfile?.email || employee?.email).toLowerCase(),
    role: trimString(existingProfile?.role || employee?.role || 'employee'),
    first_name: trimString(existingProfile?.first_name || employee?.first_name || employee?.given_name),
    middle_initial: trimString(existingProfile?.middle_initial || employee?.middle_initial || employee?.middle_name),
    last_name: trimString(existingProfile?.last_name || employee?.last_name),
    business_id: employee?.business_id ?? existingProfile?.business_id ?? null,
    business: employee?.business ?? existingProfile?.business ?? null,
    assigned_business: employee?.assigned_business ?? existingProfile?.assigned_business ?? null,
    company_name: trimString(employee?.company_name || existingProfile?.company_name),
    status: approvalState,
    approval_status: approvalState,
    is_approved: approvalState === 'approved',
    requested_status: requestedStatus,
    employment_status: requestedStatus,
    rejection_reason: overrides.rejection_reason ?? employee?.rejection_reason ?? existingProfile?.rejection_reason ?? null,
  }, existingProfile || {}, true)
}

const clearAdminProfileReferences = async (profileOrId, options = {}) => {
  const normalizedProfile = typeof profileOrId === 'object' && profileOrId
    ? normalizeAdminProfileRecord(profileOrId)
    : null
  const identity = normalizedProfile
    ? (normalizedProfile?.uid || normalizedProfile?.id || normalizedProfile?.email)
    : profileOrId

  if (!identity) return true

  const removeReviewRecords = options.removeReviewRecords !== false
  const queueId = trimString(normalizedProfile?.uid || normalizedProfile?.id || identity)
  const emailKey = normalizeEmailCandidate(normalizedProfile?.email)
  const contactKey = trimString(normalizedProfile?.contact_number || '').replace(/\D/g, '')
  const cleanupTargets = [
    removeReviewRecords && queueId ? `app_data/admin_review_queue/${normalizeKey(queueId)}` : '',
    removeReviewRecords && queueId ? `app_data/resubmissions/${normalizeKey(queueId)}` : '',
    emailKey ? `email_index/${normalizeKey(emailKey)}` : '',
    contactKey ? `contact_index/${normalizeKey(contactKey)}` : '',
  ].filter(Boolean)

  for (const target of cleanupTargets) {
    try {
      await remove(dbRef(realtimeDb, target))
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }
  }

  return true
}

const removeAdminProfile = async (profileOrId) => {
  removeStoredProfileCache(profileOrId)
  const normalizedProfile = typeof profileOrId === 'object' && profileOrId
    ? normalizeAdminProfileRecord(profileOrId)
    : null
  const identity = normalizedProfile
    ? (normalizedProfile?.uid || normalizedProfile?.id || normalizedProfile?.email)
    : profileOrId

  if (!identity) return true

  try {
    await remove(dbRef(realtimeDb, `profiles/${normalizeKey(identity)}`))
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  await clearAdminProfileReferences(normalizedProfile || identity)
  return true
}

const listProfiles = async () => {
  const seedRows = getSqlSeedUsers()
  let rows = []

  try {
    const snapshot = await get(dbRef(realtimeDb, 'profiles'))
    rows = snapshot.exists()
      ? Object.values(snapshot.val() || {}).map((entry) => ({
          ...entry,
          id: entry?.id || entry?.uid,
          uid: entry?.uid || entry?.id,
        }))
      : []
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  const cachedRows = getStoredProfileCache()
  const me = await currentProfile()
  const profileMap = new Map()
  const pushProfile = (entry) => {
    if (!entry) return
    const normalized = normalizeAdminProfileRecord(entry)
    const key = normalized.email || normalized.uid || normalized.id
    if (!key) return
    profileMap.set(key, normalized)
  }

  for (const entry of [...seedRows, ...cachedRows, ...rows]) {
    pushProfile(entry)
  }
  if (me) {
    pushProfile({
      ...me,
      id: me.id || me.uid,
      uid: me.uid || me.id,
    })
  }

  const profiles = [...profileMap.values()]

  for (const profile of profiles) {
    upsertStoredProfileCache(profile)
  }

  return profiles.map((entry) => ({
    ...entry,
    id: entry?.id || entry?.uid,
    uid: entry?.uid || entry?.id,
  }))
}

const currentUid = () => firebaseAuth?.currentUser?.uid || null

const currentProfile = async () => {
  const uid = currentUid()
  if (!uid) return getStoredAuthProfile()
  return fetchUserProfile(uid)
}

const collectionRef = (name) => dbRef(realtimeDb, `${APP_ROOT}/${name}`)
const recordRef = (name, id) => dbRef(realtimeDb, `${APP_ROOT}/${name}/${normalizeKey(id)}`)
const COLLECTION_CACHE_TTL_MS = 2000
const collectionCache = new Map()
const collectionInflight = new Map()

const readCollectionCache = (name) => {
  const cached = collectionCache.get(name)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    collectionCache.delete(name)
    return null
  }
  return clone(cached.rows)
}

const writeCollectionCache = (name, rows = []) => {
  collectionCache.set(name, {
    rows: clone(Array.isArray(rows) ? rows : []),
    expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS,
  })
}

const invalidateCollectionCache = (name) => {
  collectionCache.delete(name)
  collectionInflight.delete(name)
}

const listCollection = async (name) => {
  const cachedRows = readCollectionCache(name)
  if (cachedRows) return cachedRows

  const inflight = collectionInflight.get(name)
  if (inflight) {
    return clone(await inflight)
  }

  const request = (async () => {
    const snapshot = await get(collectionRef(name))
    const rows = snapshot.exists()
      ? Object.entries(snapshot.val() || {}).map(([id, entry]) => ({
          id: entry?.id || id,
          ...entry,
        }))
      : []
    writeCollectionCache(name, rows)
    return rows
  })()

  collectionInflight.set(name, request)
  try {
    return clone(await request)
  } finally {
    if (collectionInflight.get(name) === request) {
      collectionInflight.delete(name)
    }
  }
}

const listCollectionByChild = async (name, child, value) => {
  const normalizedValue = trimString(value)
  if (!normalizedValue) return []
  const snapshot = await get(query(collectionRef(name), orderByChild(child), equalTo(normalizedValue)))
  if (!snapshot.exists()) return []
  return Object.entries(snapshot.val() || {}).map(([id, entry]) => ({
    id: entry?.id || id,
    ...entry,
  }))
}

const getRecord = async (name, id) => {
  const snapshot = await get(recordRef(name, id))
  if (!snapshot.exists()) return null
  return {
    id,
    ...snapshot.val(),
  }
}

const saveRecord = async (name, value, providedId = null) => {
  const nextId = normalizeKey(providedId || value?.id || push(collectionRef(name)).key)
  const payload = {
    ...value,
    id: nextId,
    updated_at: nowIso(),
  }
  if (!payload.created_at) payload.created_at = nowIso()
  await set(recordRef(name, nextId), payload)
  invalidateCollectionCache(name)
  return payload
}

const normalizeAccountReviewNotification = (value = {}) => {
  const createdAt = trimString(value.created_at || nowIso())
  const title = trimString(value.title || 'Account review update')
  const message = trimString(value.message || 'Your account review status has changed.')
  return {
    id: trimString(value.id || normalizeKey(`account_review_${createdAt}`)),
    title,
    message,
    type: 'account_review',
    category: 'account_review',
    checklist: Array.isArray(value.checklist) ? value.checklist.filter(Boolean) : [],
    rejection_reason: trimString(value.reason || value.rejection_reason) || null,
    read_at: trimString(value.read_at) || null,
    created_at: createdAt,
    created_by: trimString(value.created_by || 'admin_review') || 'admin_review',
  }
}

const profileAccountReviewNotificationMap = (profile = {}) => {
  const source = profile?.account_review_notifications
  if (Array.isArray(source)) {
    return source.reduce((accumulator, entry) => {
      const normalized = normalizeAccountReviewNotification(entry)
      if (normalized.id) accumulator[normalized.id] = normalized
      return accumulator
    }, {})
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).reduce((accumulator, [key, entry]) => {
      const normalized = normalizeAccountReviewNotification({ id: key, ...(entry || {}) })
      if (normalized.id) accumulator[normalized.id] = normalized
      return accumulator
    }, {})
  }

  return {}
}

const listProfileAccountReviewNotifications = (profile = {}) => (
  Object.values(profileAccountReviewNotificationMap(profile)).sort((a, b) => (
    new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  ))
)

const appendProfileAccountReviewNotification = (profile = {}, payload = {}) => {
  const notification = normalizeAccountReviewNotification(payload)
  const notifications = profileAccountReviewNotificationMap(profile)
  notifications[notification.id] = notification
  return {
    profile: {
      ...profile,
      account_review_notifications: notifications,
    },
    notification,
  }
}

const createAccountReviewNotification = async (profile, { title, message, checklist = [], reason = '' } = {}) => {
  const targetUid = trimString(profile?.uid || profile?.id)
  if (!targetUid) return null

  try {
    return await saveRecord('notifications', {
      user_id: targetUid,
      title: trimString(title) || 'Account review update',
      message: trimString(message) || 'Your account review status has changed.',
      type: 'account_review',
      category: 'account_review',
      checklist: Array.isArray(checklist) ? checklist.filter(Boolean) : [],
      rejection_reason: trimString(reason) || null,
      read_at: null,
      created_by: 'admin_review',
    })
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
    return null
  }
}

const patchRecord = async (name, id, value) => {
  const targetRef = recordRef(name, id)
  await update(targetRef, {
    ...value,
    updated_at: nowIso(),
  })
  invalidateCollectionCache(name)
  return getRecord(name, id)
}

const normalizeStatus = (value) => trimString(value).toLowerCase()
const EMPLOYEE_APPROVAL_STATES = new Set(['approved', 'pending', 'rejected'])
const isEmployeeApprovalState = (value) => EMPLOYEE_APPROVAL_STATES.has(normalizeStatus(value))
const normalizeEmployeeApprovalState = (value, fallback = 'pending') => {
  const normalized = normalizeStatus(value)
  return EMPLOYEE_APPROVAL_STATES.has(normalized) ? normalized : fallback
}
const resolveEmployeeApprovalState = (payload = {}, existing = {}) => {
  if (isEmployeeApprovalState(payload?.approval_status)) {
    return normalizeEmployeeApprovalState(payload.approval_status)
  }
  if (isEmployeeApprovalState(payload?.status)) {
    return normalizeEmployeeApprovalState(payload.status)
  }

  const existingApproval = normalizeStatus(existing?.approval_status)
  if (EMPLOYEE_APPROVAL_STATES.has(existingApproval)) return existingApproval

  const existingStatus = normalizeStatus(existing?.status)
  if (EMPLOYEE_APPROVAL_STATES.has(existingStatus)) return existingStatus
  if (existingStatus === 'active') return resolveApprovalFlag(existing?.is_approved, true) ? 'approved' : 'pending'

  return resolveApprovalFlag(existing?.is_approved, false) ? 'approved' : 'pending'
}
const resolveEmployeeRequestedStatus = (payload = {}, existing = {}) => {
  const explicitRequested = trimString(payload?.requested_status || payload?.employment_status)
  if (explicitRequested) return explicitRequested

  const rawStatus = trimString(payload?.status)
  if (rawStatus && !isEmployeeApprovalState(rawStatus)) return rawStatus

  return trimString(
    existing?.requested_status
    || existing?.employment_status
    || (!isEmployeeApprovalState(existing?.status) ? existing?.status : '')
    || 'Active'
  ) || 'Active'
}
const buildEmployeeLifecyclePatch = (existing = {}, payload = {}, overrides = {}) => {
  const approvalState = normalizeEmployeeApprovalState(
    overrides.approval_state || resolveEmployeeApprovalState(payload, existing)
  )
  const requestedStatus = trimString(
    overrides.requested_status || resolveEmployeeRequestedStatus(payload, existing)
  ) || 'Active'

  return {
    status: approvalState,
    approval_status: approvalState,
    requested_status: requestedStatus,
    employment_status: requestedStatus,
    is_approved: approvalState === 'approved',
  }
}
const normalizeUnit = (value) => trimString(value || 'pcs').toLowerCase() || 'pcs'
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
const toMoney = (value) => Number(toNumber(value, 0).toFixed(2))
const addDaysIso = (days) => {
  const next = new Date()
  next.setDate(next.getDate() + Number(days || 0))
  return next.toISOString()
}
const DEFAULT_SHIFT_TRUCK_CAPACITY = 3
const EMERGENCY_GEOFENCE_KM = 15
const SERVICE_TRAVEL_BUFFER_HOURS = 1
const SHIFT_DEFINITIONS = [
  { shift: 'morning', label: 'Morning Shift', start_hour: 6, end_hour: 14, start_time: '06:00', end_time: '14:00' },
  { shift: 'evening', label: 'Evening Shift', start_hour: 14, end_hour: 22, start_time: '14:00', end_time: '22:00' },
  { shift: 'graveyard', label: 'Graveyard Shift', start_hour: 22, end_hour: 6, start_time: '22:00', end_time: '06:00' },
]
const formatLocalDate = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const normalizeTimeText = (value) => {
  const raw = trimString(value)
  if (!raw) return ''
  const direct = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (direct) {
    const hours = Number(direct[1])
    const minutes = Number(direct[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i)
  if (ampm) {
    let hours = Number(ampm[1])
    const minutes = ampm[2] ? Number(ampm[2]) : 0
    const suffix = String(ampm[3]).toLowerCase()
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      if (suffix === 'am') {
        hours = hours === 12 ? 0 : hours
      } else {
        hours = hours === 12 ? 12 : hours + 12
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }
  return ''
}
const parseLocalDateTime = (dateText, timeText) => {
  const normalizedDate = trimString(dateText)
  const normalizedTime = normalizeTimeText(timeText)
  if (!normalizedDate || !normalizedTime) return null
  const [year, month, day] = normalizedDate.split('-').map((part) => Number(part))
  const [hours, minutes] = normalizedTime.split(':').map((part) => Number(part))
  if (![year, month, day, hours, minutes].every((part) => Number.isFinite(part))) return null
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}
const addHoursToDate = (value, hours) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
  const next = new Date(value.getTime())
  next.setHours(next.getHours() + Number(hours || 0))
  return next
}
const parseBooleanFlag = (value) => ['1', 'true', 'yes', 'y', 'on'].includes(trimString(value).toLowerCase())
const normalizePropertyType = (value) => {
  const raw = trimString(value).toLowerCase()
  if (raw.includes('commercial')) return 'commercial'
  if (raw.includes('residential')) return 'residential'
  return ''
}
const getBookingDurationHours = (request = {}) => {
  const explicit = Number(request.service_duration_hours || request.duration_hours || request.duration || 0)
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.min(24, Math.round(explicit)))
  }
  const propertyType = normalizePropertyType(
    request.property_type
    || request.property_classification
    || request.client_property_type
    || ''
  )
  if (propertyType === 'commercial') return 4
  return 2
}
const getBookingLeadTimeHours = (request = {}) => {
  if (parseBooleanFlag(request.is_emergency) || normalizeStatus(request.pricing_urgency) === 'emergency') {
    return 2
  }
  const propertyType = normalizePropertyType(request.property_type || request.client_property_type || '')
  return propertyType === 'commercial' ? 24 : 4
}
const getShiftKeyForHour = (hour) => {
  const normalizedHour = Number(hour)
  if (normalizedHour >= 6 && normalizedHour < 14) return 'morning'
  if (normalizedHour >= 14 && normalizedHour < 22) return 'evening'
  return 'graveyard'
}
const getShiftDefinitionForHour = (hour) => SHIFT_DEFINITIONS.find((item) => item.shift === getShiftKeyForHour(hour)) || SHIFT_DEFINITIONS[0]
const normalizeTruckIdList = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[,\n;]/)
  return [...new Set(
    source
      .flatMap((entry) => String(entry || '').split(/[,\n;]/))
      .map((entry) => trimString(entry))
      .filter(Boolean)
  )]
}
const normalizeFleetShiftRecord = (row = {}, defaults = {}) => {
  const shift = getShiftKeyForHour(
    Number(row.start_hour || defaults.start_hour || (row.shift === 'evening' ? 14 : row.shift === 'graveyard' ? 22 : 6))
  )
  const truckIds = normalizeTruckIdList(row.truck_ids || row.truck_ids_text || row.trucks || [])
  const capacityLimit = Math.max(1, Math.floor(toNumber(row.capacity_limit || row.capacity || truckIds.length || defaults.capacity_limit || DEFAULT_SHIFT_TRUCK_CAPACITY, DEFAULT_SHIFT_TRUCK_CAPACITY)))
  return {
    id: trimString(row.id || defaults.id || shift),
    shift,
    label: trimString(row.label || defaults.label || getShiftDefinitionForHour(Number(row.start_hour || defaults.start_hour || 6)).label),
    start_time: trimString(row.start_time || defaults.start_time || getShiftDefinitionForHour(Number(row.start_hour || defaults.start_hour || 6)).start_time),
    end_time: trimString(row.end_time || defaults.end_time || getShiftDefinitionForHour(Number(row.start_hour || defaults.start_hour || 6)).end_time),
    start_hour: Number.isFinite(Number(row.start_hour)) ? Number(row.start_hour) : Number(defaults.start_hour || getShiftDefinitionForHour(6).start_hour),
    end_hour: Number.isFinite(Number(row.end_hour)) ? Number(row.end_hour) : Number(defaults.end_hour || getShiftDefinitionForHour(6).end_hour),
    truck_ids: truckIds,
    capacity_limit: capacityLimit,
    truck_count: truckIds.length,
    business_id: trimString(row.business_id || defaults.business_id || ''),
    updated_at: trimString(row.updated_at || defaults.updated_at || nowIso()),
    created_at: trimString(row.created_at || defaults.created_at || nowIso()),
  }
}
const defaultFleetShiftRecords = (businessId = '') => SHIFT_DEFINITIONS.map((definition) => normalizeFleetShiftRecord({
  id: definition.shift,
  shift: definition.shift,
  label: definition.label,
  start_time: definition.start_time,
  end_time: definition.end_time,
  start_hour: definition.start_hour,
  end_hour: definition.end_hour,
  capacity_limit: DEFAULT_SHIFT_TRUCK_CAPACITY,
  truck_ids: [],
  business_id: businessId || '',
}, {
  ...definition,
  capacity_limit: DEFAULT_SHIFT_TRUCK_CAPACITY,
  business_id: businessId || '',
}))
const resolveFleetShiftRecords = async (businessId = '') => {
  const targetBusinessId = trimString(businessId)
  const rows = (await listCollection('fleet_shifts').catch(() => []))
    .map((row) => normalizeFleetShiftRecord(row))
  if (!rows.length) {
    return defaultFleetShiftRecords(targetBusinessId)
  }

  const normalized = new Map()
  const relevantRows = rows.filter((row) => {
    if (!trimString(row.business_id)) return true
    return trimString(row.business_id) === targetBusinessId
  })
  const sourceRows = relevantRows.length ? relevantRows : rows
  for (const fallback of defaultFleetShiftRecords(targetBusinessId)) {
    normalized.set(fallback.shift, fallback)
  }
  sourceRows
    .sort((left, right) => {
      const leftPriority = trimString(left.business_id) === targetBusinessId ? 1 : 0
      const rightPriority = trimString(right.business_id) === targetBusinessId ? 1 : 0
      return leftPriority - rightPriority
    })
    .forEach((row) => {
      normalized.set(row.shift, normalizeFleetShiftRecord(row, normalized.get(row.shift) || {}))
    })
  return [...normalized.values()]
}
const getShiftCapacityMap = (shiftRecords = []) => shiftRecords.reduce((accumulator, record) => {
  accumulator[record.shift] = Math.max(1, Math.floor(toNumber(record.capacity_limit || record.truck_count || DEFAULT_SHIFT_TRUCK_CAPACITY, DEFAULT_SHIFT_TRUCK_CAPACITY)))
  return accumulator
}, {
  morning: DEFAULT_SHIFT_TRUCK_CAPACITY,
  evening: DEFAULT_SHIFT_TRUCK_CAPACITY,
  graveyard: DEFAULT_SHIFT_TRUCK_CAPACITY,
})
const isEmergencyEligible = (request = {}, business = null) => {
  if (!parseBooleanFlag(request.is_emergency)) return true
  const userLat = Number(request.latitude)
  const userLng = Number(request.longitude)
  const businessLat = Number(business?.latitude)
  const businessLng = Number(business?.longitude)
  if (![userLat, userLng, businessLat, businessLng].every((value) => Number.isFinite(value))) {
    return false
  }
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(businessLat - userLat)
  const dLng = toRad(businessLng - userLng)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(userLat)) * Math.cos(toRad(businessLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = 6371 * c
  return Number.isFinite(distanceKm) && distanceKm <= EMERGENCY_GEOFENCE_KM
}
const buildBookingWindows = (requests = []) => (
  (Array.isArray(requests) ? requests : [])
    .map((request) => {
      const start = parseLocalDateTime(request.preferred_date || request.service_date, request.preferred_time || request.service_time)
      if (!start) return null
      const durationHours = getBookingDurationHours(request)
      const end = addHoursToDate(start, durationHours + SERVICE_TRAVEL_BUFFER_HOURS)
      if (!end) return null
      return {
        id: trimString(request.id),
        business_id: trimString(request.business_id || request.business?.id || request.assigned_business?.id || ''),
        start,
        end,
        durationHours,
        status: normalizeStatus(request.status),
        row: request,
      }
    })
    .filter(Boolean)
)
const isBookingActive = (request = {}) => !['cancelled', 'rejected', 'archived', 'completed'].includes(normalizeStatus(request.status))
const buildAvailabilitySnapshot = async ({
  businessId = '',
  preferredDate = '',
  propertyType = '',
  pricingUrgency = '',
  isEmergency = false,
  serviceDurationHours = 0,
  latitude = null,
  longitude = null,
  excludedRequestId = '',
} = {}) => {
  const targetDate = trimString(preferredDate)
  const normalizedBusinessId = trimString(businessId)
  const durationHours = Math.max(1, Math.min(24, Math.round(Number(serviceDurationHours || getBookingDurationHours({ property_type: propertyType, is_emergency: isEmergency, pricing_urgency: pricingUrgency })))))
  const leadHours = getBookingLeadTimeHours({
    property_type: propertyType,
    is_emergency: isEmergency,
    pricing_urgency: pricingUrgency,
  })
  const now = new Date()
  const leadThreshold = addHoursToDate(now, leadHours)
  const shiftRecords = await resolveFleetShiftRecords(normalizedBusinessId)
  const shiftCapacityMap = getShiftCapacityMap(shiftRecords)
  const allRequests = await listCollection('service_requests').catch(() => [])
  const existingRequests = buildBookingWindows(allRequests.filter((request) => {
    if (!isBookingActive(request)) return false
    if (trimString(excludedRequestId) && trimString(request.id) === trimString(excludedRequestId)) return false
    const requestBusinessId = trimString(request.business_id || request.business?.id || request.assigned_business?.id || request.created_by_business_id || '')
    if (normalizedBusinessId) {
      if (!requestBusinessId) return false
      if (requestBusinessId !== normalizedBusinessId) return false
    }
    return true
  }))
  const slotLabels = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  const blockedTimes = []
  for (const slot of slotLabels) {
    const candidateStart = parseLocalDateTime(targetDate, slot)
    if (!candidateStart) continue
    if (candidateStart < leadThreshold) {
      blockedTimes.push(slot)
      continue
    }
    const candidateEnd = addHoursToDate(candidateStart, durationHours + SERVICE_TRAVEL_BUFFER_HOURS)
    let blocked = false
    for (let cursor = new Date(candidateStart.getTime()); cursor && candidateEnd && cursor < candidateEnd; cursor = addHoursToDate(cursor, 1)) {
      const shiftKey = getShiftKeyForHour(cursor.getHours())
      const capacity = shiftCapacityMap[shiftKey] || DEFAULT_SHIFT_TRUCK_CAPACITY
      const occupied = existingRequests.filter((window) => window.start <= cursor && cursor < window.end).length
      if (occupied >= capacity) {
        blocked = true
        break
      }
    }
    if (blocked) blockedTimes.push(slot)
  }
  const nextAvailableTime = slotLabels.find((slot) => !blockedTimes.includes(slot)) || ''
  const business = normalizedBusinessId ? (await listBusinessDirectory().catch(() => [])).find((row) => trimString(row?.id) === normalizedBusinessId) || null : null
  const emergencyAllowed = isEmergencyEligible({
    is_emergency: isEmergency,
    latitude,
    longitude,
  }, business)
  return {
    times: blockedTimes,
    next_available_time: nextAvailableTime,
    lead_time_hours: leadHours,
    service_duration_hours: durationHours,
    travel_buffer_hours: SERVICE_TRAVEL_BUFFER_HOURS,
    emergency_allowed: emergencyAllowed,
    shift_capacities: shiftCapacityMap,
  }
}
const toFileArray = (value) => {
  if (Array.isArray(value)) return value.filter((entry) => entry instanceof File)
  return value instanceof File ? [value] : []
}
const materialKey = (name, unit = 'pcs') => `${trimString(name).toLowerCase()}::${normalizeUnit(unit)}`
const normalizeMaterialEntry = (entry = {}) => {
  const name = trimString(entry?.name || entry?.material_name)
  const qty = Math.max(1, Math.floor(toNumber(entry?.qty ?? entry?.quantity, 1)))
  const unit = trimString(entry?.unit || 'pcs') || 'pcs'
  const notes = trimString(entry?.notes || entry?.reason) || null
  if (!name) return null
  return { name, qty, unit, notes }
}
const normalizeMaterialList = (value) => {
  const list = Array.isArray(value) ? value : []
  return list
    .map((entry) => normalizeMaterialEntry(entry))
    .filter(Boolean)
}
const detectServiceTrack = (serviceType) => {
  const value = trimString(serviceType).toLowerCase()
  if (/(siphon|septic|desludg|jetter|vacuum)/.test(value)) return 'siphoning'
  if (/(plumb|pipe|drain|leak|faucet|toilet|sink|sewer)/.test(value)) return 'plumbing'
  return 'general'
}
const suggestedMaterialsForTrack = (track) => {
  if (track === 'siphoning') {
    return [
      'Drain Hose',
      'Jetter Nozzle',
      'Vacuum Filter',
      'Suction Coupling',
      'Vacuum Pump',
      'Desludging Hose',
      'High Pressure Hose',
      'Suction Pipe',
      'Septic Tank Cover Hook',
      'Sludge Bucket',
      'Grease Trap Scoop',
      'Grease Trap Hose',
      'Hydro Jetting Hose',
      'Hydro Jetting Nozzle',
      'PPE Gloves',
      'Protective Goggles',
      'Face Mask',
      'Disinfectant Solution',
      'Odor Neutralizer',
      'Pipe Inspection Rod',
    ]
  }
  if (track === 'plumbing') {
    return [
      'PVC Pipe',
      'Elbow Joint',
      'Sealant',
      'Pipe Clamp',
      'PPR Pipe',
      'Pipe Wrench',
      'Adjustable Wrench',
      'Plumber Snake',
      'Hydro Jetting Hose',
      'Hydro Jetting Nozzle',
      'Faucet Set',
      'Shower Valve',
      'Toilet Wax Ring',
      'Teflon Tape',
      'Ball Valve',
      'Flexible Connector',
      'P Trap',
      'Drain Auger',
      'Leak Repair Clamp',
      'Pipe Cutter',
    ]
  }
  return [
    'PVC Pipe',
    'Sealant',
    'Drain Hose',
    'Pipe Wrench',
    'Vacuum Pump',
  ]
}
const defaultMaterialUnit = (materialName = '') => {
  const value = trimString(materialName).toLowerCase()
  if (!value) return 'pcs'
  if (value.includes('sealant') || value.includes('solution') || value.includes('neutralizer')) return 'bottles'
  if (value.includes('tape')) return 'rolls'
  if (value.includes('gloves') || value.includes('mask') || value.includes('goggles')) return 'sets'
  return 'pcs'
}
const buildMaterialTemplateOptions = async () => {
  const storedRows = await listCollection('material_templates').catch(() => [])
  const catalog = new Map()

  const mergeRow = (row = {}) => {
    const materialName = trimString(row?.material_name)
    if (!materialName) return
    const key = materialName.toLowerCase()
    const existing = catalog.get(key) || {}
    catalog.set(key, {
      ...existing,
      material_name: materialName,
      service_track: trimString(row?.service_track || existing.service_track) || null,
      unit: trimString(row?.unit || existing.unit || defaultMaterialUnit(materialName)) || defaultMaterialUnit(materialName),
    })
  }

  ;['siphoning', 'plumbing'].forEach((track) => {
    suggestedMaterialsForTrack(track).forEach((materialName) => {
      mergeRow({
        material_name: materialName,
        service_track: track,
        unit: defaultMaterialUnit(materialName),
      })
    })
  })

  ;(Array.isArray(storedRows) ? storedRows : []).forEach((row) => mergeRow(row))

  return Array.from(catalog.values()).sort((left, right) => {
    const trackCompare = String(left?.service_track || 'zz').localeCompare(String(right?.service_track || 'zz'))
    if (trackCompare !== 0) return trackCompare
    return String(left?.material_name || '').localeCompare(String(right?.material_name || ''))
  })
}
const matchesCurrentUserId = (candidate, values = []) => {
  const normalized = trimString(candidate)
  if (!normalized) return false
  return values.some((value) => trimString(value) === normalized)
}
const matchesAnyUserId = (candidates = [], values = []) => (
  (Array.isArray(candidates) ? candidates : [candidates]).some((candidate) => matchesCurrentUserId(candidate, values))
)
const buildUploadArtifact = (upload, file, timestamp = nowIso()) => ({
  id: normalizeKey(`${timestamp}_${file?.name || upload?.name || 'file'}`),
  path: trimString(upload?.path),
  url: trimString(upload?.url),
  name: trimString(upload?.name || file?.name),
  content_type: trimString(file?.type || upload?.content_type),
  size: Number(file?.size || upload?.size || 0) || 0,
  uploaded_at: timestamp,
  storage_status: trimString(upload?.storage_status || 'stored'),
})
const uploadArtifacts = async (folder, fieldName, files = []) => {
  const artifacts = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    if (!(file instanceof File)) continue
    const upload = await uploadProfileFile(folder, `${fieldName}-${index + 1}`, file, { versioned: true })
    if (!upload) continue
    artifacts.push(buildUploadArtifact(upload, file))
  }
  return artifacts
}
const buildScopedBusinessIds = async (profile = null) => {
  const me = profile || await currentProfile()
  const ids = new Set()
  const meId = trimString(me?.uid || me?.id)
  const email = normalizeEmailCandidate(me?.email)
  const explicitBusinessId = trimString(me?.business_id || me?.business?.id || me?.assigned_business?.id)
  const companyHints = new Set([
    trimString(me?.company_name),
    trimString(me?.business_name),
    trimString(me?.business?.business_name),
    trimString(me?.business?.company_name),
    trimString(me?.assigned_business?.business_name),
    trimString(me?.assigned_business?.company_name),
  ].filter(Boolean).map((value) => value.toLowerCase()))
  if (explicitBusinessId) ids.add(explicitBusinessId)

  try {
    const profiles = await listProfiles()
    const matchedProfile = profiles.find((entry) => (
      trimString(entry?.uid || entry?.id) === meId
      || (email && normalizeEmailCandidate(entry?.email) === email)
    )) || null

    if (matchedProfile) {
      const matchedBusinessId = trimString(
        matchedProfile?.business_id
        || matchedProfile?.business?.id
        || matchedProfile?.assigned_business?.id
      )
      if (matchedBusinessId) ids.add(matchedBusinessId)

      ;[
        matchedProfile?.company_name,
        matchedProfile?.business_name,
        matchedProfile?.business?.business_name,
        matchedProfile?.business?.company_name,
        matchedProfile?.assigned_business?.business_name,
        matchedProfile?.assigned_business?.company_name,
      ].map((value) => trimString(value).toLowerCase()).filter(Boolean).forEach((value) => companyHints.add(value))
    }
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  try {
    const employees = await listCollection('employees')
    const matchedEmployee = employees.find((entry) => (
      trimString(entry?.uid || entry?.id || entry?.user_id) === meId
      || (email && normalizeEmailCandidate(entry?.email || entry?.company_email) === email)
    )) || null

    if (matchedEmployee) {
      const matchedBusinessId = trimString(
        matchedEmployee?.business_id
        || matchedEmployee?.business?.id
        || matchedEmployee?.assigned_business?.id
      )
      if (matchedBusinessId) ids.add(matchedBusinessId)

      ;[
        matchedEmployee?.company_name,
        matchedEmployee?.business_name,
        matchedEmployee?.business?.business_name,
        matchedEmployee?.business?.company_name,
        matchedEmployee?.assigned_business?.business_name,
        matchedEmployee?.assigned_business?.company_name,
      ].map((value) => trimString(value).toLowerCase()).filter(Boolean).forEach((value) => companyHints.add(value))
    }
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  try {
    const businesses = await listBusinessDirectory()
    businesses.forEach((business) => {
      if (
        matchesCurrentUserId(business?.owner_uid, [meId])
        || matchesCurrentUserId(business?.id, [explicitBusinessId])
        || companyHints.has(trimString(business?.business_name).toLowerCase())
        || companyHints.has(trimString(business?.company_name).toLowerCase())
      ) {
        if (trimString(business?.id)) ids.add(trimString(business.id))
        if (trimString(business?.owner_uid)) ids.add(trimString(business.owner_uid))
      }
    })
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  if (!ids.size && ['business', 'serviceprovider', 'service_provider'].includes(normalizeAdminRole(me?.role)) && meId) {
    ids.add(meId)
  }

  return ids
}
const isRequestInBusinessScope = (request, scopedIds = new Set()) => {
  const values = [
    request?.business_id,
    request?.business?.id,
    request?.assigned_business?.id,
    request?.business_uid,
    request?.owner_uid,
    request?.created_by_business_id,
  ].map((value) => trimString(value)).filter(Boolean)

  return values.some((value) => scopedIds.has(value))
}
const isOrderInBusinessScope = (order, scopedIds = new Set()) => {
  const values = [
    order?.business_id,
    order?.business?.id,
    order?.business_uid,
    order?.owner_uid,
  ].map((value) => trimString(value)).filter(Boolean)

  return values.some((value) => scopedIds.has(value))
}
const isEmployeeInBusinessScope = (employee, scopedIds = new Set()) => {
  const values = [
    employee?.business_id,
    employee?.business?.id,
    employee?.assigned_business?.id,
    employee?.business_uid,
    employee?.owner_uid,
    employee?.created_by_business_id,
  ].map((value) => trimString(value)).filter(Boolean)

  return values.some((value) => scopedIds.has(value))
}
const resolveScopedBusiness = async (profile = null, scopedIds = null) => {
  const me = profile || await currentProfile()
  const explicit = me?.assigned_business || me?.business || null
  if (explicit?.id || explicit?.business_name || explicit?.company_name) return explicit

  const ids = scopedIds || await buildScopedBusinessIds(me)
  if (!ids.size) return null

  try {
    const businesses = await listBusinessDirectory()
    return businesses.find((business) => (
      ids.has(trimString(business?.id))
      || ids.has(trimString(business?.owner_uid))
    )) || null
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  return null
}
const decorateServiceRequests = async (rows = []) => {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return []

  const [profiles, businesses, providers] = await Promise.all([
    listProfiles().catch(() => []),
    listBusinessDirectory().catch(() => []),
    listCollection('service_providers').catch(() => []),
  ])

  const profileMap = new Map(
    profiles.flatMap((profile) => {
      const ids = [profile?.uid, profile?.id, profile?.email].map((value) => trimString(value)).filter(Boolean)
      return ids.map((id) => [id, profile])
    })
  )
  const businessMap = new Map(
    businesses.flatMap((business) => {
      const ids = [business?.id, business?.owner_uid].map((value) => trimString(value)).filter(Boolean)
      return ids.map((id) => [id, business])
    })
  )
  const providerMap = new Map(
    providers.flatMap((provider) => {
      const ids = [provider?.id, provider?.uid, provider?.user_id].map((value) => trimString(value)).filter(Boolean)
      return ids.map((id) => [id, provider])
    })
  )

  return list.map((row) => {
    const user = profileMap.get(trimString(row?.user_id)) || profileMap.get(trimString(row?.email)) || null
    const business = businessMap.get(trimString(row?.business_id)) || businessMap.get(trimString(row?.business_uid)) || row?.business || null
    const provider = providerMap.get(trimString(row?.service_provider_id || row?.provider_id || row?.assigned_provider_id)) || null
    const requestBusinessType = normalizeBusinessType(
      row?.business_type
      || business?.business_type
      || user?.business_type
    )
    const managementMode = deriveManagementMode({
      ...(business || {}),
      ...(row || {}),
      business,
      assigned_business: business,
    })

    return {
      ...row,
      user: user || row?.user || null,
      business: business || row?.business || null,
      provider: provider || row?.provider || null,
      first_name: trimString(row?.first_name || user?.first_name),
      middle_initial: trimString(row?.middle_initial || user?.middle_initial),
      last_name: trimString(row?.last_name || user?.last_name),
      user_name: trimString(
        row?.user_name
        || [row?.first_name || user?.first_name, row?.middle_initial || user?.middle_initial ? `${row?.middle_initial || user?.middle_initial}.` : '', row?.last_name || user?.last_name]
          .filter(Boolean)
          .join(' ')
      ) || trimString(user?.email),
      business_name: trimString(row?.business_name || business?.business_name || business?.company_name),
      company_name: trimString(row?.company_name || business?.company_name || business?.business_name),
      management_mode: trimString(row?.management_mode || managementMode),
      business_type: trimString(row?.business_type || requestBusinessType),
      service_track: trimString(row?.service_track || detectServiceTrack(row?.service_type)),
    }
  })
}
const findInventoryRow = (inventoryRows = [], name, unit = 'pcs') => (
  (inventoryRows || []).find((row) => materialKey(row?.material_name, row?.unit) === materialKey(name, unit)) || null
)
const evaluateMaterialShortage = (materials = [], inventoryRows = []) => (
  normalizeMaterialList(materials).map((item) => {
    const inventoryRow = findInventoryRow(inventoryRows, item.name, item.unit)
    const available = Math.max(0, Math.floor(toNumber(inventoryRow?.available, 0)))
    const missing = Math.max(0, item.qty - available)
    return {
      ...item,
      available,
      missing,
      shortage: missing > 0,
    }
  })
)
const listRequestStockOrders = async (requestId) => {
  const rows = await listCollection('stock_orders')
  return rows.filter((row) => trimString(row?.service_request_id) === trimString(requestId))
}
const ensureProcurementOrdersForShortage = async (request = {}, shortages = []) => {
  const existingOrders = await listRequestStockOrders(request.id)
  const createdOrders = []

  for (const shortage of shortages.filter((item) => item.shortage)) {
    const existing = existingOrders.find((order) =>
      materialKey(order?.material_name, order?.unit) === materialKey(shortage.name, shortage.unit)
      && !['received', 'completed'].includes(normalizeStatus(order?.status))
    )

    if (existing) {
      if (toNumber(existing.quantity, 0) < shortage.missing) {
        await patchRecord('stock_orders', existing.id, {
          quantity: shortage.missing,
          updated_from_shortage: true,
        })
      }
      createdOrders.push(existing)
      continue
    }

    const order = await saveRecord('stock_orders', {
      service_request_id: request.id,
      business_id: request.business_id || request.business?.id || null,
      business_name: request.business_name || request.business?.business_name || null,
      material_name: shortage.name,
      quantity: shortage.missing,
      required_quantity: shortage.qty,
      unit: shortage.unit,
      urgency: request.pricing_urgency || request.urgency || 'standard',
      service_type: request.service_type || null,
      status: 'ordered',
      pr_status: 'pending',
      purchase_type: null,
      procurement_note: shortage.notes || null,
      expected_date: request.preferred_date || null,
      expected_delivery_date: request.preferred_date || null,
    })

    const prReference = `PR-${order.id}`
    const withReference = await patchRecord('stock_orders', order.id, { pr_reference: prReference })
    createdOrders.push(withReference || { ...order, pr_reference: prReference })
  }

  return createdOrders
}
const refreshRequestMaterialReadiness = async (requestId) => {
  const request = await getRecord('service_requests', requestId)
  if (!request) return null

  if (normalizeInventoryAllocations(request?.inventory_allocations).length) {
    return request
  }

  const inventoryRows = await listCollection('inventory')
  const reservation = await reserveInventoryForRequest(request, request.materials, inventoryRows)
  const shortages = reservation.shortages?.length
    ? reservation.shortages
    : evaluateMaterialShortage(request.materials, inventoryRows)
  const hasShortage = shortages.some((item) => item.shortage)

  return await patchRecord('service_requests', requestId, {
    material_availability: shortages,
    procurement_stage: hasShortage ? 'pending_procurement' : 'materials_ready',
    stock_status: hasShortage ? 'stock_unavailable' : 'stock_available',
    status: hasShortage ? 'awaiting_material' : 'job_ready',
    workflow_stage: hasShortage ? 'procurement_processing' : 'job_ready',
    materials_ready_at: hasShortage ? null : nowIso(),
    materials_reserved_at: hasShortage ? null : reservation.reservedAt,
    inventory_allocations: hasShortage ? [] : reservation.allocations,
  })
}
const notifyUser = async (userId, title, message, extra = {}) => {
  const targetId = trimString(userId)
  if (!targetId) return null
  try {
    return await saveRecord('notifications', {
      user_id: targetId,
      title,
      message,
      read_at: null,
      ...extra,
    })
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
    return null
  }
}
const normalizeInventoryAllocation = (entry = {}) => {
  const normalized = normalizeMaterialEntry(entry)
  if (!normalized) return null
  return {
    ...normalized,
    inventory_row_id: trimString(entry?.inventory_row_id || entry?.inventory_id) || null,
    reserved_qty: Math.max(1, Math.floor(toNumber(entry?.reserved_qty ?? entry?.qty ?? entry?.quantity, normalized.qty))),
    reserved_at: trimString(entry?.reserved_at) || null,
  }
}
const normalizeInventoryAllocations = (value) => (
  (Array.isArray(value) ? value : [])
    .map((entry) => normalizeInventoryAllocation(entry))
    .filter(Boolean)
)
const collectScopedBusinessContext = (source = {}) => ({
  businessId: trimString(
    source?.business_id
    || source?.business?.id
    || source?.assigned_business?.id
    || source?.business_uid
    || source?.owner_uid
    || source?.created_by_business_id
  ),
  businessNames: new Set([
    source?.business_name,
    source?.company_name,
    source?.client_company_name,
    source?.business?.business_name,
    source?.business?.company_name,
    source?.assigned_business?.business_name,
    source?.assigned_business?.company_name,
  ].map((value) => trimString(value).toLowerCase()).filter(Boolean)),
})
const isEntryInScopedBusiness = (entry = {}, context = {}) => {
  const scopedBusinessId = trimString(context?.businessId)
  const scopedNames = context?.businessNames instanceof Set ? context.businessNames : new Set()
  const entryBusinessId = trimString(
    entry?.business_id
    || entry?.business?.id
    || entry?.assigned_business?.id
    || entry?.business_uid
    || entry?.owner_uid
    || entry?.created_by_business_id
  )
  if (scopedBusinessId && entryBusinessId && scopedBusinessId === entryBusinessId) return true

  const entryNames = [
    entry?.business_name,
    entry?.company_name,
    entry?.business?.business_name,
    entry?.business?.company_name,
    entry?.assigned_business?.business_name,
    entry?.assigned_business?.company_name,
  ].map((value) => trimString(value).toLowerCase()).filter(Boolean)

  return entryNames.some((value) => scopedNames.has(value))
}
const listScopedRoleRecipientIds = async (scopeSource = {}, roles = []) => {
  const roleSet = new Set(
    (Array.isArray(roles) ? roles : [roles])
      .map((value) => normalizeAdminRole(value))
      .filter(Boolean)
  )
  if (!roleSet.size) return []

  const context = collectScopedBusinessContext(scopeSource)
  const hasContext = Boolean(context.businessId) || context.businessNames.size > 0
  const ids = new Set()
  const [profiles, employees] = await Promise.all([
    listProfiles().catch(() => []),
    listCollection('employees').catch(() => []),
  ])

  const maybeAdd = (entry, role) => {
    if (!roleSet.has(normalizeAdminRole(role))) return
    if (hasContext && !isEntryInScopedBusiness(entry, context)) return
    const userId = trimString(entry?.uid || entry?.id || entry?.user_id)
    if (userId) ids.add(userId)
  }

  profiles.forEach((profile) => maybeAdd(profile, profile?.role))
  employees.forEach((employee) => maybeAdd(employee, employee?.role))

  return [...ids]
}
const notifyScopedRoleRecipients = async (scopeSource = {}, roles = [], title, message, extra = {}) => {
  const recipients = await listScopedRoleRecipientIds(scopeSource, roles)
  await Promise.all(recipients.map((recipientId) => notifyUser(recipientId, title, message, extra)))
  return recipients
}
const notifyRequestAssignee = async (request = {}, title, message, extra = {}) => {
  const targets = new Set([
    trimString(request?.team_leader_id),
    trimString(request?.service_provider_id),
    trimString(request?.assigned_provider_id),
    trimString(request?.provider_id),
    trimString(request?.employee_id),
    trimString(request?.assigned_employee_id),
  ].filter(Boolean))

  await Promise.all([...targets].map((recipientId) => notifyUser(recipientId, title, message, extra)))
  return [...targets]
}
const isWarrantyPriorityTicket = (request = {}) => {
  const status = normalizeStatus(request?.status)
  const workflowStage = normalizeStatus(request?.workflow_stage)
  const warrantyStatus = normalizeStatus(request?.warranty_status)
  return status === 'warranty_pending'
    || workflowStage === 'warranty_priority_ticket'
    || warrantyStatus === 'claimed'
}
const summarizeShortages = (shortages = []) => (
  shortages
    .filter((item) => item?.shortage)
    .slice(0, 3)
    .map((item) => `${item.name} x${item.missing}`)
    .join(', ')
)
const inferFinanceReleaseMode = (purchaseType) => {
  const normalized = normalizeStatus(purchaseType)
  return ['direct', 'physical'].includes(normalized) ? 'cash_release' : 'online_payment'
}
const buildFinanceSettlementFields = (releasedAmount, actualAmount) => {
  const released = toMoney(releasedAmount)
  const actual = toMoney(actualAmount)

  if (released <= 0 || actual <= 0) {
    return {
      finance_release_variance: null,
      finance_release_balance: null,
      finance_settlement_status: released > 0 ? 'awaiting_receipt' : null,
      finance_settled_at: null,
    }
  }

  const variance = toMoney(actual - released)
  const balance = toMoney(released - actual)
  let settlementStatus = 'settled'

  if (variance > 0.009) settlementStatus = 'additional_funds_needed'
  else if (balance > 0.009) settlementStatus = 'change_due_back'

  return {
    finance_release_variance: variance,
    finance_release_balance: balance,
    finance_settlement_status: settlementStatus,
    finance_settled_at: nowIso(),
  }
}
const releaseInventoryAllocations = async (request = {}) => {
  const allocations = normalizeInventoryAllocations(request?.inventory_allocations)
  if (!allocations.length) return []

  const inventoryRows = await listCollection('inventory')
  for (const allocation of allocations) {
    let inventoryRow = allocation.inventory_row_id
      ? inventoryRows.find((row) => trimString(row?.id) === trimString(allocation.inventory_row_id))
      : null

    if (!inventoryRow) {
      inventoryRow = findInventoryRow(inventoryRows, allocation.name, allocation.unit)
    }

    if (inventoryRow?.id) {
      const nextAvailable = Math.max(0, Math.floor(toNumber(inventoryRow?.available, 0))) + allocation.reserved_qty
      const patched = await patchRecord('inventory', inventoryRow.id, { available: nextAvailable })
      const nextIndex = inventoryRows.findIndex((row) => trimString(row?.id) === trimString(inventoryRow.id))
      if (nextIndex >= 0) inventoryRows[nextIndex] = patched || { ...inventoryRow, available: nextAvailable }
      continue
    }

    const created = await saveRecord('inventory', {
      material_name: allocation.name,
      unit: allocation.unit,
      available: allocation.reserved_qty,
    })
    inventoryRows.push(created)
  }

  return allocations
}
const reserveInventoryForRequest = async (request = {}, materials = null, inventoryRows = null) => {
  const existingAllocations = normalizeInventoryAllocations(request?.inventory_allocations)
  if (existingAllocations.length) {
    return {
      shortages: [],
      allocations: existingAllocations,
      reservedAt: trimString(request?.materials_reserved_at) || nowIso(),
    }
  }

  const normalizedMaterials = normalizeMaterialList(materials?.length ? materials : request?.materials)
  if (!normalizedMaterials.length) {
    return {
      shortages: [],
      allocations: [],
      reservedAt: null,
    }
  }

  const workingRows = Array.isArray(inventoryRows)
    ? inventoryRows.map((row) => ({ ...row }))
    : await listCollection('inventory')
  const shortages = evaluateMaterialShortage(normalizedMaterials, workingRows)
  if (shortages.some((item) => item.shortage)) {
    return {
      shortages,
      allocations: [],
      reservedAt: null,
    }
  }

  const reservedAt = nowIso()
  const allocations = []
  for (const item of normalizedMaterials) {
    const inventoryRow = findInventoryRow(workingRows, item.name, item.unit)
    if (!inventoryRow?.id) {
      throw new Error(`Inventory row not found for ${item.name}.`)
    }

    const available = Math.max(0, Math.floor(toNumber(inventoryRow?.available, 0)))
    if (available < item.qty) {
      throw new Error(`Not enough stock to reserve ${item.name}.`)
    }

    const nextAvailable = available - item.qty
    const patched = await patchRecord('inventory', inventoryRow.id, { available: nextAvailable })
    const rowIndex = workingRows.findIndex((row) => trimString(row?.id) === trimString(inventoryRow.id))
    if (rowIndex >= 0) workingRows[rowIndex] = patched || { ...inventoryRow, available: nextAvailable }

    allocations.push({
      ...item,
      inventory_row_id: trimString(inventoryRow.id),
      reserved_qty: item.qty,
      reserved_at: reservedAt,
    })
  }

  return {
    shortages,
    allocations,
    reservedAt,
  }
}
const maybeCreatePerJobPayroll = async (request = {}) => {
  const managementMode = deriveManagementMode(request)
  if (managementMode === 'hr') return null
  if (request?.warranty_free_service) return null

  const assigneeId = trimString(
    request.service_provider_id
    || request.provider_id
    || request.assigned_provider_id
    || request.employee_id
    || request.assigned_employee_id
  )
  if (!assigneeId) return null

  const payrolls = await listCollection('payrolls')
  const existing = payrolls.find((row) =>
    trimString(row?.service_request_id) === trimString(request.id)
    && normalizeStatus(row?.compensation_model) === 'per_job'
  )
  if (existing) return existing

  const grossAmount = toMoney(request.total_amount)
  const workerAmount = grossAmount > 0 ? toMoney(grossAmount * 0.6) : 0
  const businessShareAmount = grossAmount > 0 ? toMoney(grossAmount * 0.4) : 0
  return await saveRecord('payrolls', {
    employee_id: assigneeId,
    user_id: assigneeId,
    business_id: request.business_id || request.business?.id || null,
    service_request_id: request.id,
    service_type: request.service_type || null,
    compensation_model: 'per_job',
    salary_basis: 'by_work',
    payroll_category: 'service_completion',
    gross_amount: grossAmount,
    business_share_amount: businessShareAmount,
    net_pay: workerAmount,
    status: 'generated',
    pay_date: nowIso().slice(0, 10),
    request_completed_at: request.completed_at || nowIso(),
  })
}

const removeRecord = async (name, id) => {
  await remove(recordRef(name, id))
  invalidateCollectionCache(name)
  return true
}

const filterByUserScope = async (collection, roleSegment) => {
  const me = await currentProfile()
  const rows = await listCollection(collection)
  if (!me) return rows

  if (roleSegment === 'user') {
    return rows.filter((row) =>
      String(row.user_id || row.uid || row.created_by || '') === String(me.uid || me.id || '')
    )
  }

  if (roleSegment === 'business') {
    const scopedIds = await buildScopedBusinessIds(me)
    if (scopedIds.size) {
      return rows.filter((row) => isEmployeeInBusinessScope(row, scopedIds))
    }

    const fallbackIds = new Set([
      trimString(me?.business_id),
      trimString(me?.business?.id),
      trimString(me?.assigned_business?.id),
      trimString(me?.uid),
      trimString(me?.id),
    ].filter(Boolean))

    return rows.filter((row) => (
      isEmployeeInBusinessScope(row, fallbackIds)
      || matchesCurrentUserId(row?.created_by, [me?.uid, me?.id])
    ))
  }

  if (roleSegment === 'employee' || roleSegment === 'hr') {
    return rows.filter((row) =>
      String(row.employee_id || row.user_id || row.uid || '') === String(me.uid || '')
      || String(row.business_id || '') === String(me.business_id || '')
      || rows.length > 0
    )
  }

  return rows
}

const ensureSeedData = async () => {
  try {
    const me = await currentProfile()
    if (!me) return

    const businesses = await listCollection('businesses')
    if (!businesses.length) {
      const businessProfiles = (await listProfiles()).filter((profile) => trimString(profile.role).toLowerCase() === 'business')
      const seeds = businessProfiles.length ? businessProfiles : [me]
      for (const profile of seeds) {
        await saveRecord('businesses', {
          id: profile.uid || profile.id,
          owner_uid: profile.uid || profile.id,
          business_name: profile.business_name || profile.business_name_1 || `${profile.first_name || 'Sample'} Services`,
          category: profile.category || 'plumbing',
          address: profile.address || 'Cavite',
          latitude: profile.latitude || '14.4095',
          longitude: profile.longitude || '120.9030',
          starting_price: 500,
          is_open: true,
        }, profile.uid || profile.id)
      }
    }

    const providers = await listCollection('service_providers')
    if (!providers.length) {
      const providerProfiles = (await listProfiles()).filter((profile) => ['service_provider', 'serviceprovider'].includes(trimString(profile.role).toLowerCase()))
      if (providerProfiles.length) {
        for (const profile of providerProfiles) {
          await saveRecord('service_providers', {
            id: profile.uid || profile.id,
            uid: profile.uid || profile.id,
            user_id: profile.uid || profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
            category: profile.category || 'plumbing',
            status: 'approved',
            is_approved: true,
            experience_years: profile.experience_years || 1,
            service_description: profile.service_description || 'Firebase-backed provider profile',
          }, profile.uid || profile.id)
        }
      }
    }

    const requests = await listCollection('service_requests')
    if (!requests.length) {
      const business = (await listCollection('businesses'))[0]
      await saveRecord('service_requests', {
        user_id: me.uid || me.id,
        business_id: business?.id || '',
        business_name: business?.business_name || 'Sample Business',
        service_type: business?.category || 'plumbing',
        status: 'pending',
        payment_status: 'pending',
        urgency: 'standard',
        address_text: me.address || 'Cavite',
        latitude: me.latitude || '14.4095',
        longitude: me.longitude || '120.9030',
        selected_team: '',
        notes: 'Seed request stored in Firebase.',
        total_amount: 500,
        created_by: me.uid || me.id,
      })
    }

    const notifications = await listCollection('notifications')
    if (!notifications.length) {
      await saveRecord('notifications', {
        user_id: me.uid || me.id,
        title: 'Firebase Connected',
        message: 'Your dashboard data is now loading from Firebase.',
        read_at: null,
      })
    }

    const inventory = await listCollection('inventory')
    if (!inventory.length) {
      for (const item of [
        { material_name: 'PVC Pipe', available: 24, unit: 'pcs' },
        { material_name: 'Drain Hose', available: 8, unit: 'pcs' },
        { material_name: 'Sealant', available: 12, unit: 'tubes' },
        { material_name: 'Elbow Joint', available: 18, unit: 'pcs' },
        { material_name: 'Pipe Clamp', available: 30, unit: 'pcs' },
        { material_name: 'Jetter Nozzle', available: 6, unit: 'pcs' },
        { material_name: 'Vacuum Filter', available: 4, unit: 'pcs' },
        { material_name: 'Suction Coupling', available: 5, unit: 'pcs' },
      ]) {
        await saveRecord('inventory', item)
      }
    }

    const materialTemplates = await listCollection('material_templates')
    if (!materialTemplates.length) {
      for (const item of [
        { material_name: 'PVC Pipe' },
        { material_name: 'Elbow Joint' },
        { material_name: 'Drain Hose' },
        { material_name: 'Jetter Nozzle' },
        { material_name: 'Sealant' },
        { material_name: 'Pipe Clamp' },
        { material_name: 'Vacuum Filter' },
        { material_name: 'Suction Coupling' },
      ]) {
        await saveRecord('material_templates', item)
      }
    }
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }
}

const summarizeOperationalDashboard = async () => {
  const me = await currentProfile()
  const scopedIds = await buildScopedBusinessIds(me)
  const role = normalizeAdminRole(me?.role)
  const useGlobalOperationalView = (
    ['operational', 'operational_management'].includes(role)
    && !scopedIds.size
  )
  let [requests, prRows] = await Promise.all([
    listCollection('service_requests').then((rows) => decorateServiceRequests(rows)),
    listCollection('stock_orders'),
  ])
  if (!useGlobalOperationalView) {
    requests = applyScopedRequestVisibility(requests, me, scopedIds)
    prRows = applyScopedOrderVisibility(prRows, me, scopedIds)
  }
  return {
    scope: {
      business_id: trimString(me?.business_id || '') || null,
    },
    stats: {
      total_requests: requests.length,
      pending_requests: requests.filter((row) => normalizeStatus(row.status) === 'pending').length,
      pending_review: requests.filter((row) => normalizeStatus(row.operations_stage) === 'awaiting_operational_review').length,
      awaiting_materials: requests.filter((row) => normalizeStatus(row.status) === 'awaiting_material').length,
      job_ready: requests.filter((row) => normalizeStatus(row.status) === 'job_ready').length,
      ongoing: requests.filter((row) => normalizeStatus(row.status) === 'in_progress').length,
      completed_today: requests.filter((row) => {
        if (normalizeStatus(row.status) !== 'completed') return false
        return trimString(row.completed_at).slice(0, 10) === nowIso().slice(0, 10)
      }).length,
      pr_status_summary: {
        pending: prRows.filter((row) => normalizeStatus(row.pr_status) === 'pending').length,
        pending_finance_approval: prRows.filter((row) => normalizeStatus(row.pr_status) === 'pending_finance_approval').length,
        approved: prRows.filter((row) => normalizeStatus(row.pr_status) === 'approved').length,
        rejected: prRows.filter((row) => normalizeStatus(row.pr_status) === 'rejected').length,
        in_transit: prRows.filter((row) => normalizeStatus(row.pr_status) === 'in_transit').length,
        delivered: prRows.filter((row) => normalizeStatus(row.pr_status) === 'delivered').length,
        completed: prRows.filter((row) => normalizeStatus(row.pr_status) === 'completed').length,
      },
    },
    queue: requests,
  }
}

const listUsersForAdmin = async () => {
  invalidateCollectionCache('resubmissions')
  invalidateCollectionCache('admin_review_queue')
  const [profiles, resubmissions, employees, adminReviewQueue] = await Promise.all([
    listProfiles(),
    listCollection('resubmissions').catch(() => []),
    listCollection('employees').catch(() => []),
    listCollection('admin_review_queue').catch(() => []),
  ])
  const resubmissionMap = new Map()
  ;(Array.isArray(resubmissions) ? resubmissions : []).forEach((entry) => {
    const key = trimString(entry?.user_id || entry?.uid || entry?.id || entry?.email).toLowerCase()
    if (!key) return
    resubmissionMap.set(key, entry)
  })
  const adminReviewQueueMap = new Map()
  ;(Array.isArray(adminReviewQueue) ? adminReviewQueue : []).forEach((entry) => {
    const keys = [
      trimString(entry?.uid || entry?.id || entry?.firebase_uid).toLowerCase(),
      normalizeEmail(entry?.email),
    ].filter(Boolean)
    keys.forEach((key) => adminReviewQueueMap.set(key, entry))
  })

  const users = profiles.map((profile) => {
    const uidKey = trimString(profile.uid || profile.id).toLowerCase()
    const emailKey = normalizeEmail(profile.email)
    const queuedReview = adminReviewQueueMap.get(uidKey) || (emailKey ? adminReviewQueueMap.get(emailKey) : null)
    const resubmission = resubmissionMap.get(uidKey) || (emailKey ? resubmissionMap.get(emailKey) : null)
    const explicitStatus = normalizeStatus(profile.status)
    const explicitApprovalStatus = normalizeStatus(profile.approval_status)
    const hasExplicitPendingReviewState = [
      explicitStatus,
      explicitApprovalStatus,
    ].some((value) => ['pending', 'pending_approval', 'pending_review', 'under_review', 'reviewing'].includes(value))
    if (queuedReview) {
      Object.assign(profile, queuedReview)
    }
    const resubmittedAt = trimString(resubmission?.resubmitted_at)
    const profileReviewKind = trimString(profile.latest_account_review_kind).toLowerCase()
    const profileReviewTitle = trimString(profile.latest_account_review_title).toLowerCase()
    const profileReviewMessage = trimString(profile.latest_account_review_message).toLowerCase()
    const profileReviewAt = trimString(profile.latest_account_review_at)
    const profileResubmittedAt = trimString(profile.document_resubmitted_at)
    const profileHasStoredResubmissionFile = Boolean(
      trimString(profile.government_id_resubmission || profile.government_id_resubmission_url)
    )
    const profileResubmittedTime = profileResubmittedAt ? new Date(profileResubmittedAt).getTime() : NaN
    const profileReviewTime = profileReviewAt ? new Date(profileReviewAt).getTime() : NaN
    const profileResubmittedAfterReview = Boolean(profileResubmittedAt) && (
      !profileReviewAt
      || Number.isNaN(profileResubmittedTime)
      || Number.isNaN(profileReviewTime)
      || profileResubmittedTime >= profileReviewTime
    )
    const profileHasResubmissionSignal = Boolean(
      profileReviewKind === 'resubmitted'
      || profileReviewTitle.includes('resubmitted')
      || profileReviewMessage.includes('resubmitted')
      || profileReviewMessage.includes('updated documents were submitted')
      || profileResubmittedAfterReview
      || profileHasStoredResubmissionFile
    )
    const hasQueuedResubmission = Boolean(
      resubmittedAt
      || (Array.isArray(resubmission?.checklist) && resubmission.checklist.length)
      || ['pending', 'queued', 'resubmitted'].includes(normalizeStatus(resubmission?.status))
      || profileHasResubmissionSignal
    )

    if (resubmittedAt && !profile.document_resubmitted_at) {
      profile.document_resubmitted_at = resubmittedAt
    }
    if (resubmission?.checklist && !profile.latest_account_review_kind) {
      profile.latest_account_review_kind = 'resubmitted'
    }
    if (hasExplicitPendingReviewState) {
      delete profile.archived_at
      profile.status = 'pending'
      profile.approval_status = 'pending'
      profile.is_approved = false
    }
    if (hasQueuedResubmission) {
      delete profile.archived_at
      profile.status = 'pending'
      profile.approval_status = 'pending'
      profile.is_approved = false
      profile.has_viewed = false
      profile.latest_account_review_kind = trimString(profile.latest_account_review_kind || 'resubmitted')
      profile.latest_account_review_title = trimString(profile.latest_account_review_title || 'Documents resubmitted')
      profile.latest_account_review_message = trimString(
        profile.latest_account_review_message
        || `The user submitted updated documents for review${Array.isArray(resubmission?.checklist) && resubmission.checklist.length ? `: ${resubmission.checklist.map(humanizeChecklistValue).join(', ')}.` : '.'}`
      )
      profile.latest_account_review_at = trimString(profile.latest_account_review_at || resubmittedAt || nowIso())
      profile.latest_account_review_seen_at = null
    }
    return {
      ...profile,
      id: profile.id || profile.uid,
      firebase_uid: profile.uid || profile.id,
    }
  })

  const findExistingUser = (candidate) => {
    const uid = trimString(candidate?.uid || candidate?.id || candidate?.firebase_uid)
    const email = normalizeEmail(candidate?.email || candidate?.company_email)
    return users.find((user) => (
      (uid && [user?.uid, user?.id, user?.firebase_uid].some((value) => trimString(value) === uid))
      || (email && normalizeEmail(user?.email) === email)
    )) || null
  }

  ;(Array.isArray(adminReviewQueue) ? adminReviewQueue : []).forEach((queuedEntry) => {
    const normalizedQueuedEntry = normalizeAdminProfileRecord({
      ...queuedEntry,
      status: trimString(queuedEntry?.status || 'pending') || 'pending',
      approval_status: trimString(queuedEntry?.approval_status || queuedEntry?.status || 'pending') || 'pending',
      is_approved: resolveApprovalFlag(queuedEntry?.is_approved, false),
      has_viewed: Boolean(queuedEntry?.has_viewed),
      archived_at: null,
    })
    const existing = findExistingUser(normalizedQueuedEntry)
    if (existing) {
      Object.assign(existing, normalizeAdminProfileRecord({
        ...existing,
        ...normalizedQueuedEntry,
        archived_at: null,
        status: 'pending',
        approval_status: 'pending',
        is_approved: false,
      }))
      return
    }

    users.push(normalizedQueuedEntry)
    upsertStoredProfileCache(normalizedQueuedEntry)
  })

  ;(Array.isArray(employees) ? employees : []).forEach((employee) => {
    const fallbackId = trimString(employee?.uid || employee?.id || employee?.user_id || employee?.email)
    if (!fallbackId) return

    const rawStatus = normalizeStatus(employee?.status)
    const employeeUser = normalizeAdminProfileRecord({
      ...employee,
      id: fallbackId,
      uid: fallbackId,
      firebase_uid: fallbackId,
      email: trimString(employee?.email || employee?.company_email),
      first_name: trimString(employee?.first_name || employee?.given_name),
      middle_initial: trimString(employee?.middle_initial || employee?.middle_name),
      last_name: trimString(employee?.last_name),
      role: trimString(employee?.role) || 'employee',
      status: rawStatus === 'active' ? 'approved' : trimString(employee?.status || 'approved'),
      approval_status: rawStatus === 'active' ? 'approved' : trimString(employee?.approval_status || employee?.status || 'approved'),
      is_approved: resolveApprovalFlag(
        employee?.is_approved,
        !['pending', 'rejected', 'archived', 'deleted'].includes(rawStatus),
      ),
      workspace_type: trimString(employee?.workspace_type || 'company_staff'),
      account_source: trimString(employee?.account_source || 'hr_created'),
      source_trace: Array.isArray(employee?.source_trace) && employee.source_trace.length
        ? employee.source_trace
        : ['Employees Collection'],
      company_name: trimString(employee?.company_name || employee?.business_name),
    })

    const existing = findExistingUser(employeeUser)
    if (existing) {
      Object.assign(existing, normalizeAdminProfileRecord({
        ...employeeUser,
        ...existing,
        email: existing.email || employeeUser.email,
        first_name: existing.first_name || employeeUser.first_name,
        middle_initial: existing.middle_initial || employeeUser.middle_initial,
        last_name: existing.last_name || employeeUser.last_name,
        company_name: existing.company_name || employeeUser.company_name,
        assigned_business: existing.assigned_business || employeeUser.assigned_business,
        business: existing.business || employeeUser.business,
      }))
      return
    }

    users.push(employeeUser)
    upsertStoredProfileCache(employeeUser)
  })

  return users
}

const applicationStatusForCurrentUser = async () => {
  const me = await currentProfile()
  const providers = await listCollection('service_providers')
  const matched = providers.find((row) => String(row.user_id || row.uid || '') === String(me?.uid || ''))
  return {
    hasApplied: Boolean(matched),
    pending: matched ? !resolveApprovalFlag(matched?.is_approved, normalizeStatus(matched?.status) === 'approved') : false,
    approved: matched ? resolveApprovalFlag(matched?.is_approved, normalizeStatus(matched?.status) === 'approved') : false,
    rejected: trimString(matched?.status).toLowerCase() === 'rejected',
    provider: matched || null,
  }
}

const buildEmployeeDashboardData = async () => {
  const me = await currentProfile()
  const notifications = await filterByUserScope('notifications', 'user')
  const requests = await listCollection('service_requests')
  const assignedRequests = requests.filter((row) =>
    String(row.employee_id || row.assigned_employee_id || '') === String(me?.uid || '')
  )
  const payrolls = (await listCollection('payrolls')).filter((row) =>
    String(row.employee_id || row.user_id || '') === String(me?.uid || '')
  )

  return {
    profile: me || {},
    employee: {
      id: me?.uid || me?.id || null,
      name: [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.email || 'Employee',
      team: me?.team || '',
      team_assignment_status: me?.team_assignment_status || 'pending',
      team_schedule_date: me?.team_schedule_date || '',
      team_schedule_time_from: me?.team_schedule_time_from || '',
      team_schedule_time_to: me?.team_schedule_time_to || '',
      ...me,
    },
    daily_earnings: payrolls,
    payrolls,
    notifications,
    assigned_requests: assignedRequests,
    earnings_overview: {
      today_total: assignedRequests.length * 250,
      today_compensation_total: assignedRequests.length * 180,
      today_job_count: assignedRequests.length,
    },
  }
}

const buildHrDashboardData = async () => {
  const [requests, employees, teams] = await Promise.all([
    listCollection('service_requests'),
    listCollection('employees'),
    listCollection('teams'),
  ])
  return {
    stats: {
      total_requests: requests.length,
      pending_requests: requests.filter((row) => trimString(row.status).toLowerCase() === 'pending').length,
      approved_requests: requests.filter((row) => trimString(row.status).toLowerCase().includes('approved')).length,
      total_employees: employees.length,
    },
    teamSummary: teams,
    payrollReady: {
      ready_count: employees.length,
      pending_count: 0,
    },
  }
}

const buildCsrDashboardData = async () => {
  const me = await currentProfile()
  const scopedIds = await buildScopedBusinessIds(me)
  let requests = await decorateServiceRequests(await listCollection('service_requests'))
  requests = applyScopedRequestVisibility(requests, me, scopedIds)
  const scopeBusiness = await resolveScopedBusiness(me, scopedIds)
  const scopeLabel = trimString(
    scopeBusiness?.business_name
    || scopeBusiness?.company_name
    || me?.company_name
    || me?.business_name
    || me?.business?.business_name
    || ''
  )
  const pendingIntake = requests.filter((row) =>
    (
      (normalizeStatus(row.status) === 'pending' && normalizeStatus(row.workflow_stage) !== 'csr_forwarded')
      || isWarrantyPriorityTicket(row)
    )
  )
  const paymentQueue = requests.filter((row) => {
    const paymentGate = normalizeStatus(row.payment_gate_status || row.payment_status)
    return paymentGate.includes('pending')
  })
  const forwardedQueue = requests.filter((row) =>
    normalizeStatus(row.workflow_stage) === 'csr_forwarded'
    || normalizeStatus(row.operations_stage) === 'awaiting_operational_review'
  )
  const residentialCount = requests.filter((row) => normalizeBusinessType(row.business_type) === 'individual').length
  const commercialCount = requests.filter((row) => normalizeBusinessType(row.business_type) === 'company').length
  return {
    scope: {
      business_id: scopeBusiness?.id || trimString(me?.business_id || '') || null,
      business_name: scopeLabel || null,
    },
    stats: {
      total_intake: requests.length,
      intake_pending: pendingIntake.length,
      forwarded_total: forwardedQueue.length,
      pending_intake: pendingIntake.length,
      forwarded_requests: forwardedQueue.length,
      pending_payment_gate: paymentQueue.length,
      priority_tickets: requests.filter((row) => isWarrantyPriorityTicket(row)).length,
      residential: residentialCount,
      commercial: commercialCount,
    },
    intake_queue: requests.filter((row) =>
      (
        (
          ['pending', 'submitted'].includes(normalizeStatus(row.status))
          && normalizeStatus(row.workflow_stage) !== 'csr_forwarded'
        )
        || isWarrantyPriorityTicket(row)
      )
    ),
    payment_queue: paymentQueue,
    forwarded_queue: forwardedQueue,
  }
}

const buildServiceProviderDashboardData = async () => {
  const me = await currentProfile()
  const providerRows = await listCollection('service_providers')
  const provider = providerRows.find((row) => String(row.uid || row.user_id || row.id) === String(me?.uid || '')) || {
    id: me?.uid || null,
    uid: me?.uid || null,
    name: [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.email || 'Service Provider',
    category: me?.category || 'plumbing',
  }
  const businesses = await listCollection('businesses')
  const requests = await listCollection('service_requests')
  const assigned = requests.filter((row) => {
    const values = [
      row.service_provider_id,
      row.provider_id,
      row.assigned_provider_id,
      row.employee_id,
      row.assigned_employee_id,
    ]
    return values.some((value) => matchesCurrentUserId(value, [me?.uid, me?.id]))
  })
  const completed = assigned.filter((row) => normalizeStatus(row.status) === 'completed')
  const grossTotal = completed.reduce((sum, row) => sum + toMoney(row.total_amount), 0)

  return {
    provider,
    user: me || {},
    businesses,
    revenue_summary: {
      total_jobs: assigned.length,
      total_earnings: completed.reduce((sum, row) => sum + toMoney(row.total_amount), 0),
      gross_total: grossTotal,
      business_total: toMoney(grossTotal * 0.4),
      employee_pool_total: toMoney(grossTotal * 0.6),
      request_count: completed.length,
    },
    reviews: await listCollection('reviews'),
  }
}

const buildBusinessContext = async () => {
  const me = await currentProfile()
  const storedBusiness = (await listCollection('businesses')).find((row) =>
    String(row.owner_uid || row.id || '') === String(me?.uid || '')
  )
  const fallbackBusiness = me ? {
    id: me.uid || me.id || null,
    owner_uid: me.uid || me.id || null,
    business_name: me.business_name || me.business_name_1 || me.company_name || '',
    owner_name: me.business_owner || '',
    owner_first_name: me.business_owner_first || me.first_name || '',
    owner_middle_initial: me.business_owner_middle || me.middle_initial || '',
    owner_last_name: me.business_owner_last || me.last_name || '',
    company_email: me.company_email || me.email || '',
    category: me.category || '',
    business_type: me.business_type || '',
    business_ownership: me.business_ownership || '',
    years_in_operation: me.years_in_operation || '',
    management_mode: me.management_mode || '',
    contact_number: me.contact_number || '',
    address: me.address || '',
    address_unit: me.address_unit || '',
    address_street: me.address_street || '',
    address_barangay: me.address_barangay || '',
    address_city: me.address_city || '',
    address_province: me.address_province || '',
    address_postal: me.address_postal || '',
    latitude: me.latitude || '',
    longitude: me.longitude || '',
    bir_registration: me.bir_registration || '',
    dti_registration: me.dti_registration || '',
    mayor_permit: me.mayor_permit || '',
    business_permit: me.business_permit || '',
    sanitary_permit: me.sanitary_permit || '',
    auto_assign_enabled: me.auto_assign_enabled ?? false,
    sla_threshold_minutes: me.sla_threshold_minutes || 120,
    metrics: me.metrics || null,
  } : null
  const business = {
    ...(fallbackBusiness || {}),
    ...(storedBusiness || {}),
  }
  const businessType = normalizeBusinessType(business.business_type)
  const managementMode = deriveManagementMode({
    ...(me || {}),
    ...(business || {}),
    business,
  }) || 'business'

  return {
    business: Object.keys(business || {}).length ? business : null,
    user: me || null,
    business_type: business.business_type || me?.business_type || '',
    is_individual: businessType === 'individual',
    management_mode: managementMode,
    auto_assign_enabled: business.auto_assign_enabled ?? me?.auto_assign_enabled ?? false,
    auto_assign: business.auto_assign_enabled ?? me?.auto_assign_enabled ?? false,
    sla_threshold_minutes: Number(business.sla_threshold_minutes || me?.sla_threshold_minutes || 120),
    metrics: business.metrics || me?.metrics || null,
    generated_at: nowIso(),
  }
}

const businessDirectoryDisplayName = (value = {}) => {
  return trimString(
    value.business_name
    || value.business_name_1
    || value.company_name
    || value.display_name
    || value.name
    || value.email
  )
}

const businessDirectoryOwnerName = (value = {}) => {
  const direct = trimString(value.owner_name || value.business_owner)
  if (direct) return direct

  const first = trimString(value.business_owner_first || value.first_name)
  const middleInitial = trimString(value.business_owner_middle || value.middle_initial)
  const last = trimString(value.business_owner_last || value.last_name)
  const middle = middleInitial ? `${middleInitial}.` : ''

  return [first, middle, last].filter(Boolean).join(' ').trim()
}

const businessDirectoryAddress = (value = {}) => {
  const direct = trimString(value.address)
  if (direct) return direct

  return [
    value.address_unit,
    value.address_street,
    value.address_barangay,
    value.address_city,
    value.address_province,
    value.address_postal,
  ].map((entry) => trimString(entry)).filter(Boolean).join(', ')
}

const normalizeBusinessDirectoryRecord = (value = {}, defaults = {}) => {
  const source = { ...defaults, ...value }
  const role = trimString(source.role || defaults.role || 'business').toLowerCase()
  const id = trimString(
    source.id
    || defaults.id
    || source.business_id
    || source.uid
    || source.owner_uid
    || normalizeKey(source.email || source.company_email || source.business_name || source.company_name)
  )
  const ownerUid = trimString(source.owner_uid || defaults.owner_uid || source.uid || source.id || defaults.uid || defaults.id || id)
  const businessType = trimString(source.business_type || defaults.business_type)
  const managementMode = trimString(
    source.management_mode
    || defaults.management_mode
    || deriveManagementMode({
      ...defaults,
      ...source,
      business_type: businessType,
    })
    || (normalizeBusinessType(businessType) === 'company' ? 'hr' : 'business')
  )
  const ownerName = businessDirectoryOwnerName(source)
  const businessName = businessDirectoryDisplayName(source) || ownerName || 'Business Workspace'
  const companyEmail = trimString(source.company_email || defaults.company_email || source.email || defaults.email)
  const status = trimString(source.status || defaults.status || source.approval_status || defaults.approval_status)
  const approvalStatus = trimString(source.approval_status || defaults.approval_status || status)
  const isApproved = resolveApprovalFlag(
    source.is_approved ?? defaults.is_approved,
    !approvalStatus || approvalStatus === 'approved',
  )

  return sanitizeFirebaseValue({
    ...defaults,
    ...source,
    id,
    uid: trimString(source.uid || defaults.uid || ownerUid || id),
    owner_uid: ownerUid || id,
    role: role || 'business',
    business_name: businessName,
    company_name: trimString(source.company_name || defaults.company_name || businessName),
    owner_name: ownerName,
    first_name: trimString(source.first_name || defaults.first_name || source.business_owner_first),
    middle_initial: trimString(source.middle_initial || defaults.middle_initial || source.business_owner_middle),
    last_name: trimString(source.last_name || defaults.last_name || source.business_owner_last),
    company_email: companyEmail,
    email: trimString(source.email || defaults.email || companyEmail),
    category: trimString(source.category || defaults.category || 'plumbing'),
    business_type: businessType || 'Business',
    management_mode: managementMode || 'business',
    contact_number: trimString(source.contact_number || defaults.contact_number),
    address: businessDirectoryAddress(source),
    address_unit: trimString(source.address_unit || defaults.address_unit),
    address_street: trimString(source.address_street || defaults.address_street),
    address_barangay: trimString(source.address_barangay || defaults.address_barangay),
    address_city: trimString(source.address_city || defaults.address_city),
    address_province: trimString(source.address_province || defaults.address_province),
    address_postal: trimString(source.address_postal || defaults.address_postal),
    latitude: source.latitude ?? defaults.latitude ?? '',
    longitude: source.longitude ?? defaults.longitude ?? '',
    status: status || (isApproved ? 'approved' : 'pending'),
    approval_status: approvalStatus || status || (isApproved ? 'approved' : 'pending'),
    is_approved: isApproved,
    is_open: source.is_open ?? defaults.is_open ?? true,
    source_kind: trimString(
      source.source_kind
      || defaults.source_kind
      || (role === 'business' ? 'profile_registration' : 'businesses_collection')
    ),
  })
}

const businessDirectoryKeys = (value = {}) => {
  const emailKey = normalizeEmailCandidate(value.company_email || value.email)
  return Array.from(new Set([
    trimString(value.id),
    trimString(value.uid),
    trimString(value.owner_uid),
    trimString(value.business_id),
    emailKey,
  ].filter(Boolean)))
}

const listBusinessDirectory = async () => {
  let businessRows = []
  try {
    businessRows = await listCollection('businesses')
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  const businessProfiles = (await listProfiles())
    .filter((profile) => trimString(profile.role).toLowerCase() === 'business')

  const directoryMap = new Map()
  const keyMap = new Map()

  const upsert = (entry, defaults = {}) => {
    const base = normalizeBusinessDirectoryRecord(entry, defaults)
    const matchedId = businessDirectoryKeys(base)
      .map((key) => keyMap.get(key))
      .find(Boolean)
    const existing = matchedId ? directoryMap.get(matchedId) : null
    const merged = normalizeBusinessDirectoryRecord(entry, existing || defaults)
    const primaryId = trimString(merged.id || merged.owner_uid || merged.uid)
    if (!primaryId) return

    directoryMap.set(primaryId, merged)
    businessDirectoryKeys(merged).forEach((key) => {
      keyMap.set(key, primaryId)
    })
  }

  businessRows.forEach((row) => {
    upsert({
      ...row,
      source_kind: trimString(row?.source_kind || 'businesses_collection'),
    })
  })

  businessProfiles.forEach((profile) => {
    upsert({
      ...profile,
      id: trimString(profile.business_id || profile.uid || profile.id),
      owner_uid: trimString(profile.uid || profile.id),
      business_name: trimString(profile.business_name || profile.business_name_1 || profile.company_name),
      company_name: trimString(profile.company_name || profile.business_name || profile.business_name_1),
      owner_name: trimString(profile.business_owner),
      first_name: trimString(profile.business_owner_first || profile.first_name),
      middle_initial: trimString(profile.business_owner_middle || profile.middle_initial),
      last_name: trimString(profile.business_owner_last || profile.last_name),
      company_email: trimString(profile.company_email || profile.email),
      source_kind: 'profile_registration',
    })
  })

  let reviewRows = []
  try {
    reviewRows = await listCollection('reviews')
  } catch (error) {
    if (!isFirebasePermissionError(error)) throw error
  }

  const normalizedReviews = reviewRows
    .map((review) => ({
      ...review,
      id: trimString(review?.id),
      business_id: trimString(
        review?.business_id
        || review?.business?.id
        || review?.business?.uid
        || review?.business_uid
        || review?.service_request_business_id
        || review?.request_business_id
      ),
      business_uid: trimString(review?.business_uid || review?.business?.uid || review?.business?.owner_uid),
      rating: toNumber(review?.rating, 0),
      feedback: trimString(review?.feedback) || null,
      submitted_at: trimString(review?.submitted_at || review?.created_at),
      user_name: trimString(review?.user_name || review?.submitted_by_name || review?.customer_name || 'Customer') || 'Customer',
      attachments: Array.isArray(review?.attachments) ? review.attachments : [],
    }))
    .filter((review) => review.business_id || review.business_uid)

  const reviewGroupMap = new Map()
  normalizedReviews.forEach((review) => {
    const keys = new Set([review.business_id, review.business_uid].filter(Boolean))
    keys.forEach((key) => {
      if (!reviewGroupMap.has(key)) reviewGroupMap.set(key, [])
      reviewGroupMap.get(key).push(review)
    })
  })

  return [...directoryMap.values()]
    .filter((entry) => trimString(entry.business_name))
    .sort((a, b) => String(a.business_name || '').localeCompare(String(b.business_name || '')))
    .map((business) => {
      const keys = businessDirectoryKeys(business)
      const seen = new Set()
      const groupedReviews = []

      keys.forEach((key) => {
        const rows = reviewGroupMap.get(key) || []
        rows.forEach((review) => {
          const uniqueKey = trimString(review.id || `${review.business_id || review.business_uid || 'review'}-${review.submitted_at || review.created_at || review.rating || ''}`)
          if (!uniqueKey || seen.has(uniqueKey)) return
          seen.add(uniqueKey)
          groupedReviews.push(review)
        })
      })

      groupedReviews.sort((left, right) => (
        new Date(trimString(right.submitted_at || right.created_at || 0)).getTime()
        - new Date(trimString(left.submitted_at || left.created_at || 0)).getTime()
      ))

      const ratings = groupedReviews
        .map((review) => Number(review.rating || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
      const averageRating = ratings.length
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
        : 0

      return {
        ...business,
        review_summary: {
          average_rating: averageRating,
          review_count: groupedReviews.length,
          latest_review_at: trimString(groupedReviews[0]?.submitted_at || groupedReviews[0]?.created_at || ''),
        },
        recent_reviews: groupedReviews.slice(0, 3).map((review) => ({
          id: review.id || normalizeKey(`review_${review.business_id || review.business_uid || business.id || business.uid || 'business'}`),
          rating: review.rating,
          feedback: review.feedback,
          submitted_at: review.submitted_at,
          user_name: review.user_name,
          attachments: review.attachments,
        })),
      }
    })
}

const parseRequestTarget = (segments) => {
  const entity = entityFromSegments(segments)
  const entityIndex = segments.findIndex((segment) => ENTITY_ALIASES[segment] === entity)
  const afterEntity = entityIndex >= 0 ? segments.slice(entityIndex + 1) : []
  const id = afterEntity.find((segment) => isIdSegment(segment)) || null
  const action = afterEntity.filter((segment) => segment !== id).join('/')
  return { entity, id, action }
}

const inferListShape = (path) => {
  if (/dashboard-data/.test(path)) return {}
  if (/status|profile|settings|summary|health/.test(path)) return {}
  return []
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

const sanitizeStorageSegment = (value, fallback = 'file') => {
  const normalized = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || fallback
}

const normalizeDocumentHistoryMap = (value) => {
  if (Array.isArray(value)) {
    return value.reduce((accumulator, entry, index) => {
      if (!entry || typeof entry !== 'object') return accumulator
      const key = trimString(entry.id || normalizeKey(`history_${index + 1}`))
      if (key) accumulator[key] = entry
      return accumulator
    }, {})
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, entry]) => {
      if (!entry || typeof entry !== 'object') return accumulator
      const normalizedKey = trimString(entry.id || key || normalizeKey(`history_${Object.keys(accumulator).length + 1}`))
      if (normalizedKey) accumulator[normalizedKey] = entry
      return accumulator
    }, {})
  }

  return {}
}

const buildDocumentHistoryEntry = ({
  id = '',
  path = '',
  url = '',
  meta = {},
  uploadedAt = '',
  label = '',
} = {}) => {
  const nextUploadedAt = trimString(uploadedAt || meta?.uploaded_at || meta?.updated_at || nowIso())
  const nextId = trimString(id || normalizeKey(`history_${nextUploadedAt}_${path || url || label || 'file'}`))
  if (!nextId || !trimString(path || url)) return null

  return {
    id: nextId,
    path: trimString(path),
    url: trimString(url),
    name: trimString(meta?.name || label),
    content_type: trimString(meta?.content_type),
    size: Number(meta?.size || 0) || 0,
    uploaded_at: nextUploadedAt,
    updated_at: trimString(meta?.updated_at || nextUploadedAt),
    storage_status: trimString(meta?.storage_status || 'stored'),
  }
}

const ensureHistoryEntry = (historyMap, entry) => {
  if (!entry?.id) return historyMap
  const duplicateKey = Object.keys(historyMap).find((key) => {
    const current = historyMap[key]
    return String(current?.path || '') === String(entry.path || '')
      && String(current?.url || '') === String(entry.url || '')
  })

  if (duplicateKey) {
    historyMap[duplicateKey] = {
      ...historyMap[duplicateKey],
      ...entry,
      id: duplicateKey,
    }
    return historyMap
  }

  historyMap[entry.id] = entry
  return historyMap
}

const uploadProfileFile = async (folder, fieldName, file, options = {}) => {
  if (!(file instanceof File)) return null
  const uid = currentUid() || 'guest'
  const ext = trimString(file.name).split('.').pop()
  const useVersionedPath = Boolean(options?.versioned)
  const safeOriginalName = sanitizeStorageSegment(trimString(file.name).replace(/\.[^.]+$/, ''), fieldName)
  const timestampKey = nowIso().replace(/[:.]/g, '-')
  const targetPath = useVersionedPath
    ? `${folder}/${uid}/${fieldName}/${timestampKey}-${safeOriginalName}.${ext || 'bin'}`
    : `${folder}/${uid}/${fieldName}.${ext || 'bin'}`
  const ref = storageRef(storage, targetPath)
  try {
    const result = await uploadBytes(ref, file)
    const url = await getDownloadURL(result.ref)
    return {
      path: result.metadata.fullPath,
      url,
      name: file.name,
    }
  } catch (error) {
    if (!isFirebaseStoragePermissionError(error)) throw error

    const fallbackUrl = await fileToDataUrl(file)
    const fallbackPath = buildTemporaryFilePath(folder, uid, `${fieldName}.${ext || 'bin'}`, fallbackUrl)
    return {
      path: fallbackPath,
      url: fallbackUrl,
      name: file.name,
      storage_status: 'local_fallback',
    }
  }
}

const buildUploadedFileMeta = (upload, file, timestamp = nowIso()) => {
  return {
    name: trimString(upload?.name || file?.name),
    content_type: trimString(file?.type || upload?.content_type),
    size: Number(file?.size || upload?.size || 0) || 0,
    uploaded_at: timestamp,
    updated_at: timestamp,
    storage_status: trimString(upload?.storage_status || 'stored'),
  }
}

const handleGet = async (config, info) => {
  const { source, segments, first } = info
  const { isAdminUsers, id: adminUserId, action: adminUserAction } = getAdminUsersPathInfo(segments)

  if (source === '/admin/users' || source === '/admin/users/list') {
    return await listUsersForAdmin()
  }
  if (isAdminUsers && adminUserId && !adminUserAction) {
    const users = await listUsersForAdmin()
    return findProfileById(users, adminUserId) || {}
  }

  await ensureSeedData()

  if (source === '/user/profile') {
    return await currentProfile() || {}
  }
  if (source === '/user/application-status') {
    return await applicationStatusForCurrentUser()
  }
  if (source === '/user/service-provider-details') {
    const status = await applicationStatusForCurrentUser()
    return status.provider || {}
  }
  if (source === '/operational/dashboard-data') {
    return await summarizeOperationalDashboard()
  }
  if (source === '/hr/dashboard-data') {
    return await buildHrDashboardData()
  }
  if (source === '/csr/dashboard-data') {
    return await buildCsrDashboardData()
  }
  if (source === '/service-provider/dashboard-data') {
    return await buildServiceProviderDashboardData()
  }
  if (source === '/employee/dashboard-data' || source === '/employee/cs-dashboard-data') {
    return await buildEmployeeDashboardData()
  }
  if (source === '/business/context' || source === '/hr/workspace-context') {
    return await buildBusinessContext()
  }
  if (source === '/admin/businesses') {
    return await listCollection('businesses')
  }
  if (source === '/admin/permits') {
    return await listCollection('permits')
  }
  if (source === '/finance/notifications' || source === '/procurement/notifications' || source === '/user/notifications') {
    const me = await currentProfile()
    const meId = trimString(me?.uid || me?.id)
    if (!meId) return []
    try {
      const storedNotifications = await listCollectionByChild('notifications', 'user_id', meId)
      const profileNotifications = listProfileAccountReviewNotifications(me)
      const merged = new Map()
      profileNotifications.forEach((entry) => {
        if (!entry?.id) return
        merged.set(entry.id, entry)
      })
      storedNotifications.forEach((entry) => {
        const normalized = {
          ...entry,
          id: trimString(entry?.id),
          title: trimString(entry?.title),
          message: trimString(entry?.message),
          created_at: trimString(entry?.created_at),
          read_at: trimString(entry?.read_at) || null,
          type: trimString(entry?.type),
          category: trimString(entry?.category),
        }
        if (!normalized.id || !normalized.title || !normalized.message || !normalized.created_at) return
        const existing = merged.get(normalized.id)
        merged.set(normalized.id, existing ? { ...existing, ...normalized } : normalized)
      })
      return [...merged.values()].sort((a, b) => (
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
      ))
    } catch (error) {
      if (isFirebasePermissionError(error)) return listProfileAccountReviewNotifications(me)
      throw error
    }
  }
  if (source === '/finance/profile') {
    return await currentProfile() || {}
  }
  if (source === '/finance/procurement-approvals') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    let rows = await listCollection('stock_orders')
    if (scopedIds.size) {
      rows = rows.filter((row) => isOrderInBusinessScope(row, scopedIds))
    }
    return rows.filter((row) => ['pending_finance_approval', 'approved', 'rejected'].includes(normalizeStatus(row.pr_status)))
  }
  if (source === '/business/managed/employees' || source === '/hr/employees' || source === '/hr/available-employees' || source === '/operational/assignable-employees') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    const role = normalizeAdminRole(me?.role)
    const allowGlobalOperationalEmployees = (
      source === '/operational/assignable-employees'
      && ['operational', 'operational_management'].includes(role)
      && !scopedIds.size
    )
    let employees = await listCollection('employees')

    if (source === '/operational/assignable-employees') {
      const assignable = employees
        .filter((employee) => !isOfficeDepartmentRole(employee?.role))
        .filter((employee) => isApprovedEmployeeRecord(employee))

      if (allowGlobalOperationalEmployees) {
        return assignable
      }
      employees = assignable
    } else if (allowGlobalOperationalEmployees) {
      return employees
    }

    if (scopedIds.size) {
      employees = employees.filter((employee) => isEmployeeInBusinessScope(employee, scopedIds))
    } else if (me) {
      const fallbackIds = new Set([
        trimString(me?.business_id),
        trimString(me?.business?.id),
        trimString(me?.assigned_business?.id),
        trimString(me?.uid),
        trimString(me?.id),
      ].filter(Boolean))
      employees = employees.filter((employee) => (
        isEmployeeInBusinessScope(employee, fallbackIds)
        || matchesCurrentUserId(employee?.created_by, [me?.uid, me?.id])
      ))
    }

    return employees
  }
  if (source === '/business/operational-management-users' || source === '/hr/operational-management-users') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    let employees = (await listCollection('employees')).filter((row) => trimString(row.role).toLowerCase() === 'operational')

    if (scopedIds.size) {
      employees = employees.filter((employee) => isEmployeeInBusinessScope(employee, scopedIds))
    } else if (me) {
      const fallbackIds = new Set([
        trimString(me?.business_id),
        trimString(me?.business?.id),
        trimString(me?.assigned_business?.id),
        trimString(me?.uid),
        trimString(me?.id),
      ].filter(Boolean))
      employees = employees.filter((employee) => (
        isEmployeeInBusinessScope(employee, fallbackIds)
        || matchesCurrentUserId(employee?.created_by, [me?.uid, me?.id])
      ))
    }

    return employees
  }
  if (source === '/business/service-providers' || source === '/business/provider-applications' || source === '/hr/service-providers' || source === '/hr/available-providers' || source === '/user/service-providers') {
    return await listCollection('service_providers')
  }
  if (source === '/business/service-requests' || source === '/hr/service-requests' || source === '/hr/service-requests/accepted' || source === '/hr/service-requests/rejected' || source === '/user/service-requests' || source === '/procurement/requests-awaiting-material' || source === '/user/service-provider/assigned-requests') {
    let rows = []
    if (source === '/user/service-requests') {
      const me = await currentProfile()
      const meId = trimString(me?.uid || me?.id)
      if (!meId) return []
      try {
        rows = await listCollectionByChild('service_requests', 'user_id', meId)
      } catch (error) {
        if (isFirebasePermissionError(error)) return []
        throw error
      }
    } else {
      rows = await listCollection('service_requests')
    }
    rows = await decorateServiceRequests(rows)
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    const role = normalizeAdminRole(me?.role)
    const useGlobalProcurementView = (
      source === '/procurement/requests-awaiting-material'
      && role === 'procurement'
      && !scopedIds.size
    )
    if (source === '/business/service-requests' || source.startsWith('/hr/service-requests')) {
      rows = applyScopedRequestVisibility(rows, me, scopedIds)
    }
    if (source === '/procurement/requests-awaiting-material' && !useGlobalProcurementView) {
      rows = applyScopedRequestVisibility(rows, me, scopedIds)
    }
    if (source.endsWith('/accepted')) return rows.filter((row) => trimString(row.status).toLowerCase() === 'accepted')
    if (source.endsWith('/rejected')) return rows.filter((row) => trimString(row.status).toLowerCase() === 'rejected')
    if (source === '/procurement/requests-awaiting-material') return rows.filter((row) => ['awaiting_material', 'job_ready', 'operational_approved'].includes(trimString(row.status).toLowerCase()))
    if (source === '/user/service-provider/assigned-requests') {
      const me = await currentProfile()
      const employeeRows = await listCollection('employees').catch(() => [])
      const currentIds = new Set([trimString(me?.uid), trimString(me?.id)].filter(Boolean))
      ;(Array.isArray(employeeRows) ? employeeRows : []).forEach((employee) => {
        if (matchesAnyUserId([employee?.id, employee?.uid, employee?.user_id], [me?.uid, me?.id])) {
          ;[employee?.id, employee?.uid, employee?.user_id].forEach((value) => {
            const normalized = trimString(value)
            if (normalized) currentIds.add(normalized)
          })
        }
      })
      const currentIdList = Array.from(currentIds)
      return rows
        .filter((row) => {
          const values = [
            row.service_provider_id,
            row.provider_id,
            row.assigned_provider_id,
            row.employee_id,
            row.assigned_employee_id,
          ]
          const dispatchIds = Array.isArray(row?.dispatch_employee_ids)
            ? row.dispatch_employee_ids.map((value) => trimString(value)).filter(Boolean)
            : []
          return values.some((value) => matchesCurrentUserId(value, currentIdList))
            || dispatchIds.some((value) => matchesCurrentUserId(value, currentIdList))
        })
        .map((row) => ({
          ...row,
          current_user_is_team_leader: matchesAnyUserId(
            [row?.team_leader_id, row?.employee_id, row?.assigned_employee_id],
            currentIdList
          ),
        }))
    }
    return rows
  }
  if (source === '/business/operations/inventory-summary' || source === '/procurement/inventory-summary' || source === '/operational/inventory-summary') {
    return await listCollection('inventory')
  }
  if (source === '/operational/material-template-options' || source === '/procurement/material-template-options') {
    return await buildMaterialTemplateOptions()
  }
  if (source === '/procurement/stock-orders' || source === '/business/reports/assignment-audit') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    const role = normalizeAdminRole(me?.role)
    const useGlobalProcurementView = source === '/procurement/stock-orders' && role === 'procurement' && !scopedIds.size
    const rows = await listCollection(source === '/procurement/stock-orders' ? 'stock_orders' : 'audit_logs')
    if (!scopedIds.size || useGlobalProcurementView) return rows
    if (source === '/procurement/stock-orders') {
      return rows.filter((row) => isOrderInBusinessScope(row, scopedIds))
    }
    return rows.filter((row) => isOrderInBusinessScope(row, scopedIds))
  }
  if (source === '/hr/payrolls' || source === '/service-provider/payslip-data') {
    const me = await currentProfile()
    const rows = await listCollection('payrolls')
    if (source === '/service-provider/payslip-data') {
      return rows.filter((row) =>
        matchesCurrentUserId(row?.user_id || row?.employee_id, [me?.uid, me?.id])
      )
    }
    return rows
  }
  if (source === '/service-provider/attendance-data') {
    return {
      records: await listCollection('attendance_records'),
      today_record: null,
      active_shift: null,
      summary: {
        total_days: 0,
        total_hours: 0,
      },
    }
  }
  if (source === '/service-provider/linked-employees') {
    return await listCollection('employees')
  }
  if (source === '/user/all-businesses') {
    return await listBusinessDirectory()
  }
  if (source === '/user/formed-teams' || source === '/hr/employees/team-overview') {
    return await listCollection('teams')
  }
  if (source === '/user/route-preview') {
    return {
      polyline: [],
      distance_km: 0,
      duration_minutes: 0,
    }
  }
  if (source === '/user/service-requests/blocked-times') {
    const params = config?.params || {}
    if (!trimString(params.preferred_date)) {
      return { times: [], next_available_time: '' }
    }
    return await buildAvailabilitySnapshot({
      businessId: params.business_id,
      preferredDate: params.preferred_date,
      propertyType: params.property_type,
      pricingUrgency: params.pricing_urgency,
      isEmergency: parseBooleanFlag(params.is_emergency),
      serviceDurationHours: params.service_duration_hours,
      latitude: params.latitude,
      longitude: params.longitude,
    })
  }
  if (source === '/business/managed/pricing-rules') {
    return await listCollection('pricing_rules')
  }
  if (source === '/business/managed/reports') {
    return await listCollection('reports')
  }
  if (source === '/business/setup/management') {
    return { current_mode: 'managed' }
  }
  if (source === '/business/settings/rbac-matrix') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    let employees = await listCollection('employees')
    if (scopedIds.size) {
      employees = employees.filter((employee) => isEmployeeInBusinessScope(employee, scopedIds))
    } else if (me) {
      const fallbackIds = new Set([
        trimString(me?.business_id),
        trimString(me?.business?.id),
        trimString(me?.assigned_business?.id),
        trimString(me?.uid),
        trimString(me?.id),
      ].filter(Boolean))
      employees = employees.filter((employee) => (
        isEmployeeInBusinessScope(employee, fallbackIds)
        || matchesCurrentUserId(employee?.created_by, [me?.uid, me?.id])
      ))
    }
    const sortedEmployees = [...employees].sort((left, right) => (
      new Date(right?.created_at || right?.updated_at || 0).getTime()
      - new Date(left?.created_at || left?.updated_at || 0).getTime()
    ))
    return {
      creator_role_staff_matrix: {
        business_owner: { can_view: true, can_manage: true, can_approve: true },
        hr_owner: { can_view: true, can_manage: true, can_approve: true },
      },
      employee_rows: sortedEmployees.map((employee) => ({
        ...employee,
        staff_permissions: employee.staff_permissions || {
          modules: {},
        },
      })),
    }
  }

  if (source.includes('/cavite/barangays/')) {
    return []
  }
  if (source.includes('/suggested-materials/')) {
    const requestId = trimString(segments[segments.length - 1])
    const request = requestId ? await getRecord('service_requests', requestId) : null
    const track = detectServiceTrack(request?.service_type)
    return suggestedMaterialsForTrack(track).map((material_name) => ({ material_name }))
  }

  const { entity, id } = parseRequestTarget(segments)
  if (!entity) {
    return inferListShape(source)
  }

  if (entity === 'businesses') {
    const rows = await listBusinessDirectory()
    return rows
  }

  if (entity === 'service_providers') {
    let rows = await listCollection('service_providers')
    if (!rows.length) {
      rows = (await listProfiles())
        .filter((profile) => ['service_provider', 'serviceprovider'].includes(trimString(profile.role).toLowerCase()))
        .map((profile) => ({
          id: profile.uid || profile.id,
          uid: profile.uid || profile.id,
          user_id: profile.uid || profile.id,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
          ...profile,
        }))
    }
    return rows
  }

  if (entity === 'employees') {
    let rows = await listCollection('employees')
    if (!rows.length) {
      rows = (await listProfiles())
        .filter((profile) => ['employee', 'hr', 'finance', 'procurement', 'operational', 'csr'].includes(trimString(profile.role).toLowerCase()))
        .map((profile) => ({
          id: profile.uid || profile.id,
          uid: profile.uid || profile.id,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
          ...profile,
        }))
    }
    return rows
  }

  if (entity === 'notifications' && first) {
    return await filterByUserScope('notifications', first)
  }

  if (entity === 'service_requests' && first) {
    if (source.includes('dashboard-data')) {
      return await summarizeOperationalDashboard()
    }
    const rows = await filterByUserScope('service_requests', first)
    return id ? rows.find((row) => String(row.id) === String(id)) || {} : rows
  }

  if (entity === 'inventory') {
    const rows = await listCollection('inventory')
    return rows
  }

  if (entity === 'material_templates') {
    return await listCollection('material_templates')
  }

  if (entity === 'teams') {
    return await listCollection('teams')
  }

  if (entity === 'applications') {
    return await listCollection('applications')
  }

  if (entity === 'payrolls' || entity === 'payouts' || entity === 'refunds' || entity === 'invoices' || entity === 'stock_orders' || entity === 'audit_logs') {
    return await listCollection(entity)
  }

  return id ? (await getRecord(entity, id)) || {} : await listCollection(entity)
}

const handleWrite = async (config, info) => {
  const { source, segments } = info
  await ensureSeedData()
  const payload = normalizePayload(config.data)
  const { entity, id, action } = parseRequestTarget(segments)
  const me = await currentProfile()
  const adminUsersPath = getAdminUsersPathInfo(segments)

  if (source === '/login' && config.method === 'post') {
    return await loginWithFirebase(payload)
  }
  if (source === '/force-logout' || source === '/logout') {
    await logoutWithFirebase()
    queueLoggedOutToast()
    return { redirect: '/Auth/Login' }
  }
  if (source === '/check-email') {
    const normalizedEmail = normalizeEmailCandidate(payload.email)
    const emailProbe = normalizedEmail
      ? await probeEmailAvailability(normalizedEmail, { preferServer: false })
      : { available: false, verified: false }
    const existsInRecords = normalizedEmail ? await isDuplicateEmail(normalizedEmail) : false
    const existsInAuth = normalizedEmail ? emailProbe.verified && !emailProbe.available : false
    const exists = existsInAuth || existsInRecords

    if (normalizedEmail && !emailProbe.verified && !existsInRecords) {
      return {
        exists: true,
        verified: false,
        message: 'Unable to verify email right now. Please try again.',
      }
    }

    return {
      exists,
      verified: true,
      message: exists ? 'This email is already registered.' : 'Email is available.',
    }
  }
  if (source === '/register/send-otp') {
    return await sendRegistrationOtp({
      email: payload.email,
      role: payload.role,
      contactNumber: payload.contact_number,
    })
  }
  if (source === '/register/verify-otp') {
    await verifyRegistrationOtpCode({
      email: payload.email,
      otp: payload.otp,
    })
    return { verified: true, message: 'OTP verified successfully.' }
  }
  if (source === '/register') {
    const result = await registerWithFirebase(payload)
    return {
      user: result.user,
      profile: result.profile,
      redirect: getDashboardPathForRole(result.profile || { role: result.profile?.role }),
    }
  }
  if (source === '/forgot-password' || source === '/password/modal/request-code' || source === '/password/modal/reset' || source === '/reset-password') {
    await sendPasswordResetWithFirebase(payload.email)
    return { message: 'Password reset email sent.' }
  }
  if (source === '/password/modal/verify-code' || source === '/email/verification-notification' || source === '/confirm-password') {
    return { message: 'Success' }
  }

  if (source === '/admin/users' && config.method === 'post') {
    let emailAvailable = true
    try {
      emailAvailable = await checkEmailAvailability(payload.email)
    } catch (error) {
      throw new Error(error?.message || 'Unable to verify email availability right now. Please try again.')
    }

    if (!emailAvailable) {
      throw new Error('This email is already registered.')
    }

    const businesses = await listCollection('businesses')
    const assignedBusiness = businesses.find((business) => String(business.id) === String(payload.business_id)) || null
    const generatedUserId = payload.id || payload.uid || push(dbRef(realtimeDb, 'profiles')).key
    const createdProfile = await persistAdminProfile({
      ...payload,
      id: generatedUserId,
      uid: generatedUserId,
      business_id: assignedBusiness?.id || payload.business_id || null,
      business: assignedBusiness || null,
      assigned_business: assignedBusiness || null,
      company_name: assignedBusiness?.business_name || null,
      first_name: payload.first_name || '',
      middle_initial: payload.middle_initial || '',
      last_name: payload.last_name || '',
      email: payload.email,
      role: payload.role,
      status: 'approved',
      approval_status: 'approved',
      is_approved: true,
      account_source: 'admin_created',
      source_trace: ['Admin Console'],
      source_missing: [],
      has_viewed: false,
      password: undefined,
      password_confirmation: undefined,
    }, {}, true)

    delete createdProfile.password
    delete createdProfile.password_confirmation

    return {
      message: 'Admin user created successfully.',
      user: createdProfile,
      credentials_email_recipients: [
        assignedBusiness?.company_email,
        assignedBusiness?.assignment_email,
        createdProfile.email,
      ].filter(Boolean),
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('toggle-approval')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const currentApproved = resolveApprovalFlag(
      existing.is_approved,
      ['approved', 'active'].includes(normalizeStatus(existing.status || existing.approval_status)),
    )
    const nextApproved = !currentApproved
    let nextUser = await persistAdminProfile({
      ...existing,
      ...(nextApproved && trimString(existing.government_id_resubmission)
        ? {
            government_id: existing.government_id_resubmission,
            government_id_url: existing.government_id_resubmission_url || '',
            government_id_meta: existing.government_id_resubmission_meta || existing.government_id_meta || null,
            government_id_resubmission: null,
            government_id_resubmission_url: null,
            government_id_resubmission_meta: null,
          }
        : {}),
      ...(nextApproved
        ? {
            archived_at: null,
            document_resubmitted_at: null,
            rejection_reason: null,
            rejection_checklist: [],
          }
        : {}),
      is_approved: nextApproved,
      status: nextApproved ? 'approved' : 'pending',
      approval_status: nextApproved ? 'approved' : 'pending',
    }, existing, true)

    if (nextApproved) {
      const reviewTimestamp = nowIso()
      const reviewMessage = 'Your account has been approved. HR workspace tabs are now unlocked.'
      await createAccountReviewNotification(nextUser, {
        title: 'Account approved',
        message: reviewMessage,
      })
      const { profile: profileWithNotification } = appendProfileAccountReviewNotification(nextUser, {
        title: 'Account approved',
        message: reviewMessage,
        created_at: reviewTimestamp,
        read_at: null,
      })
      nextUser = await persistAdminProfile({
        ...profileWithNotification,
        latest_account_review_title: 'Account approved',
        latest_account_review_message: reviewMessage,
        latest_account_review_kind: 'approved',
        latest_account_review_at: reviewTimestamp,
        latest_account_review_seen_at: null,
        has_viewed: false,
      }, profileWithNotification, true)
      await removeRecord('resubmissions', existing.uid || existing.id || adminUsersPath.id)
      await removeRecord('admin_review_queue', existing.uid || existing.id || adminUsersPath.id)
    }

    return {
      message: nextApproved ? 'User approved successfully.' : 'User approval removed.',
      is_approved: nextUser.is_approved,
      user: nextUser,
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('reject')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const rejectionChecklist = Array.isArray(payload.checklist) ? payload.checklist : (existing.rejection_checklist || [])
    const rejectionReason = payload.reason || existing.rejection_reason || null

    const nextUser = await persistAdminProfile({
      ...existing,
      is_approved: false,
      status: 'rejected',
      approval_status: 'rejected',
      archived_at: nowIso(),
      document_resubmitted_at: null,
      government_id_resubmission: null,
      government_id_resubmission_url: null,
      government_id_resubmission_meta: null,
      rejection_reason: rejectionReason,
      rejection_checklist: rejectionChecklist,
    }, existing, true)

    const issueSummary = rejectionChecklist.length
      ? `Issues found: ${rejectionChecklist.map(humanizeChecklistValue).join(', ')}.`
      : 'Please review the rejection details from the admin.'
    const detailSummary = trimString(rejectionReason)
      ? ` Additional note: ${trimString(rejectionReason)}`
      : ''
    const reviewMessage = `Your account was rejected by admin. ${issueSummary}${detailSummary}`
    const reviewTimestamp = nowIso()
    await createAccountReviewNotification(nextUser, {
      title: 'Account rejected',
      message: reviewMessage,
      checklist: rejectionChecklist,
      reason: rejectionReason,
    })

    const userWithProfileNotification = appendProfileAccountReviewNotification(nextUser, {
      title: 'Account rejected',
      message: reviewMessage,
      checklist: rejectionChecklist,
      reason: rejectionReason,
      created_at: reviewTimestamp,
      read_at: null,
    }).profile

    const reviewedUser = await persistAdminProfile({
      ...userWithProfileNotification,
      ...nextUser,
      latest_account_review_title: 'Account rejected',
      latest_account_review_message: reviewMessage,
      latest_account_review_kind: 'rejected',
      latest_account_review_at: reviewTimestamp,
      latest_account_review_seen_at: null,
    }, userWithProfileNotification, true)
    await removeRecord('resubmissions', existing.uid || existing.id || adminUsersPath.id)
    await removeRecord('admin_review_queue', existing.uid || existing.id || adminUsersPath.id)

    return {
      message: 'User rejected successfully.',
      user: reviewedUser,
      is_approved: reviewedUser.is_approved,
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('archive')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const nextUser = await persistAdminProfile({
      ...existing,
      archived_at: nowIso(),
      status: 'archived',
      approval_status: existing.approval_status || (
        resolveApprovalFlag(
          existing.is_approved,
          ['approved', 'active'].includes(normalizeStatus(existing.status || existing.approval_status)),
        ) ? 'approved' : 'pending'
      ),
    }, existing, true)
    await removeRecord('admin_review_queue', existing.uid || existing.id || adminUsersPath.id)

    return {
      message: 'User archived successfully.',
      user: nextUser,
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('restore')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const nextUser = await persistAdminProfile({
      ...existing,
      archived_at: null,
      status: resolveApprovalFlag(
        existing.is_approved,
        ['approved', 'active'].includes(normalizeStatus(existing.status || existing.approval_status)),
      ) ? 'approved' : 'pending',
      approval_status: resolveApprovalFlag(
        existing.is_approved,
        ['approved', 'active'].includes(normalizeStatus(existing.status || existing.approval_status)),
      ) ? 'approved' : 'pending',
    }, existing, true)
    if (normalizeStatus(nextUser.status || nextUser.approval_status) === 'pending') {
      await saveRecord('admin_review_queue', buildAdminReviewQueueRecord(nextUser, {
        status: 'pending',
        approval_status: 'pending',
        is_approved: false,
      }), nextUser.uid || nextUser.id || adminUsersPath.id)
    }

    return {
      message: 'User restored successfully.',
      user: nextUser,
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('mark-viewed')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const nextUser = await persistAdminProfile({
      ...existing,
      has_viewed: true,
    }, existing, true)
    const queueId = nextUser.uid || nextUser.id || adminUsersPath.id
    if (queueId) {
      try {
        const queuedEntry = await getRecord('admin_review_queue', queueId)
        if (queuedEntry) {
          await saveRecord('admin_review_queue', buildAdminReviewQueueRecord({
            ...queuedEntry,
            ...nextUser,
          }, {
            has_viewed: true,
          }), queueId)
        }
      } catch (error) {
        if (!isFirebasePermissionError(error)) throw error
      }
    }

    return {
      message: 'User marked as viewed.',
      user: nextUser,
    }
  }

  if (adminUsersPath.isAdminUsers && adminUsersPath.id && adminUsersPath.action.includes('wrong-email-delete')) {
    const users = await listUsersForAdmin()
    const existing = findProfileById(users, adminUsersPath.id)
    if (!existing) {
      return { message: 'User not found.' }
    }

    const deletedAt = nowIso()
    const deletionReason = trimString(payload.reason || existing.rejection_reason || 'Wrong login email entered during admin account creation.')
      || 'Wrong login email entered during admin account creation.'
    const reviewMessage = `This account was removed from active use. Reason: ${deletionReason}. Update the correct account details and resubmit the application if access is still needed.`
    const nextUser = await persistAdminProfile({
      ...existing,
      archived: true,
      archived_at: deletedAt,
      status: 'deleted',
      approval_status: 'deleted',
      is_approved: false,
      has_viewed: false,
      document_resubmitted_at: null,
      rejection_reason: deletionReason,
      latest_account_review_title: 'Account deleted',
      latest_account_review_message: reviewMessage,
      latest_account_review_kind: 'deleted',
      latest_account_review_at: deletedAt,
      latest_account_review_seen_at: null,
    }, existing, true)
    await clearAdminProfileReferences(nextUser)
    await notifyUser(nextUser.uid || nextUser.id, 'Account deleted', reviewMessage, {
      type: 'account_deleted',
      reason: deletionReason,
      archived: true,
    })
    return {
      message: 'Wrong-email account marked as deleted.',
      user: nextUser,
    }
  }

  if (source === '/admin/users/refresh-firebase') {
    const users = await listUsersForAdmin()
    return { message: 'Firebase users refreshed.', users, rows: users, refreshed: users.length > 0 }
  }

  if (source === '/user/password/update') {
    return { message: 'Password updated successfully.' }
  }

  if (source === '/user/delete') {
    const meProfile = await currentProfile()
    if (meProfile?.uid) {
      await removeAdminProfile(meProfile)
    }
    await logoutWithFirebase()
    return { message: 'Account deleted.' }
  }

  if (source === '/business/settings/rbac-matrix') {
    const me = await currentProfile()
    const scopedIds = await buildScopedBusinessIds(me)
    let employees = await listCollection('employees')
    if (scopedIds.size) {
      employees = employees.filter((employee) => isEmployeeInBusinessScope(employee, scopedIds))
    } else if (me) {
      const fallbackIds = new Set([
        trimString(me?.business_id),
        trimString(me?.business?.id),
        trimString(me?.assigned_business?.id),
        trimString(me?.uid),
        trimString(me?.id),
      ].filter(Boolean))
      employees = employees.filter((employee) => (
        isEmployeeInBusinessScope(employee, fallbackIds)
        || matchesCurrentUserId(employee?.created_by, [me?.uid, me?.id])
      ))
    }
    const updatedRows = employees.map((employee) => ({
      ...employee,
      staff_permissions: payload.employee_permissions?.[String(employee.id)] || employee.staff_permissions || { modules: {} },
    }))
    for (const row of updatedRows) {
      await saveRecord('employees', row, row.id)
    }
    return {
      message: 'RBAC checklist settings updated.',
      creator_role_staff_matrix: payload.creator_role_staff_matrix || {},
      employee_rows: updatedRows,
    }
  }

  if (source === '/employee/team-assignment/respond') {
    const meProfile = await currentProfile()
    const nextStatus = payload.action === 'reject' ? 'rejected' : 'accepted'
    if (meProfile?.uid) {
      await setProfileRecord(meProfile.uid, {
        ...meProfile,
        team_assignment_status: nextStatus,
        team_assignment_reason: payload.reason || null,
      })
    }
    return {
      message: 'Team assignment updated.',
      employee: {
        ...meProfile,
        team_assignment_status: nextStatus,
        team_assignment_reason: payload.reason || null,
      },
    }
  }

  if (source === '/finance/profile' || source === '/employee/profile' || source === '/user/profile/update-info' || source === '/service-provider/update') {
    const meProfile = await currentProfile()
    if (!meProfile?.uid) throw new Error('No signed-in Firebase user found.')
    const nextProfile = { ...meProfile, ...payload }
    await setProfileRecord(meProfile.uid, nextProfile)
    return nextProfile
  }

  if (source === '/employee/upload-requirements') {
    return { message: 'Requirements uploaded successfully.' }
  }

  if (source === '/service-provider/attendance/clock-in' || source === '/service-provider/attendance/clock-out') {
    const record = await saveRecord('attendance_records', {
      user_id: me?.uid || null,
      action: source.endsWith('clock-in') ? 'clock_in' : 'clock_out',
      timestamp: nowIso(),
    })
    return { message: 'Attendance saved.', record }
  }

  if (source === '/service-provider/attendance/proof') {
    return { message: 'Attendance proof uploaded.' }
  }

  if (source === '/service-provider/attendance/qr-session') {
    return {
      session_id: normalizeKey(Date.now()),
      scan_url: '/service-provider/attendance',
      expires_at: nowIso(),
      action: payload.action || 'clock_in',
    }
  }

  if (source === '/service-provider/attendance/qr-session/status') {
    return { status: 'ready' }
  }

  if (source === '/business/setup/management' || source === '/business/settings/auto-assign' || source === '/business/settings/sla-threshold') {
    const meProfile = await currentProfile()
    if (!meProfile?.uid) throw new Error('No signed-in Firebase user found.')

    const businesses = await listCollection('businesses')
    const scopedBusinessIds = await buildScopedBusinessIds(meProfile)
    const business = businesses.find((row) => scopedBusinessIds.has(trimString(row?.id))) || null

    const profilePatch = {}
    const businessPatch = {}

    if (source === '/business/setup/management') {
      const requestedMode = normalizeStatus(payload.management_mode || payload.mode)
      const nextMode = ['hr', 'business'].includes(requestedMode)
        ? requestedMode
        : deriveManagementMode({ ...meProfile, ...business }) || 'business'
      profilePatch.management_mode = nextMode
      businessPatch.management_mode = nextMode
    }

    if (source === '/business/settings/auto-assign') {
      const enabled = Boolean(payload.enabled)
      profilePatch.auto_assign_enabled = enabled
      businessPatch.auto_assign_enabled = enabled
    }

    if (source === '/business/settings/sla-threshold') {
      const minutes = Math.max(15, Math.floor(toNumber(payload.sla_threshold_minutes, 120)))
      profilePatch.sla_threshold_minutes = minutes
      businessPatch.sla_threshold_minutes = minutes
    }

    const nextProfile = { ...meProfile, ...profilePatch, updated_at: nowIso() }
    await setProfileRecord(meProfile.uid, nextProfile)
    syncStoredAuthProfile(nextProfile)
    upsertStoredProfileCache(nextProfile)

    let nextBusiness = business
    if (business?.id) {
      nextBusiness = await patchRecord('businesses', business.id, businessPatch)
    }

    return {
      message: 'Business settings updated.',
      management_mode: nextProfile.management_mode || nextBusiness?.management_mode || null,
      auto_assign_enabled: nextProfile.auto_assign_enabled ?? nextBusiness?.auto_assign_enabled ?? false,
      sla_threshold_minutes: nextProfile.sla_threshold_minutes || nextBusiness?.sla_threshold_minutes || 120,
      redirect_to: source === '/business/setup/management'
        ? ((nextProfile.management_mode || nextBusiness?.management_mode) === 'hr'
          ? '/HR/HrBusinessShell'
          : '/Business/BusinessDashboard')
        : null,
    }
  }

  if (source === '/business/settings/modules') {
    const meProfile = await currentProfile()
    if (!meProfile?.uid) throw new Error('No signed-in Firebase user found.')

    const modules = toArray(payload.modules)
      .map((value) => trimString(value))
      .filter(Boolean)
    const nextProfile = {
      ...meProfile,
      business_modules: modules,
      updated_at: nowIso(),
    }
    await setProfileRecord(meProfile.uid, nextProfile)
    syncStoredAuthProfile(nextProfile)
    upsertStoredProfileCache(nextProfile)

    let nextBusiness = null
    try {
      const businesses = await listCollection('businesses')
      const scopedBusinessIds = await buildScopedBusinessIds(meProfile)
      const business = businesses.find((row) => scopedBusinessIds.has(trimString(row?.id))) || null
      if (business?.id) {
        nextBusiness = await patchRecord('businesses', business.id, { business_modules: modules })
      }
    } catch (error) {
      if (!isFirebasePermissionError(error)) throw error
    }

    return {
      message: 'Business modules updated.',
      business_modules: modules,
      business: nextBusiness,
    }
  }

  if (source === '/business/managed/teams/schedule-publish') {
    return { message: 'Team schedule published.' }
  }

  if (source === '/admin/fleet-shifts') {
    const me = await currentProfile()
    const scopedBusinessId = trimString(
      me?.business_id
      || me?.business?.id
      || me?.assigned_business?.id
      || ''
    )
    return await resolveFleetShiftRecords(scopedBusinessId)
  }

  if (source === '/business/operations/inventory-order') {
    const record = await saveRecord('stock_orders', payload)
    return { message: 'Inventory order created.', data: record }
  }

  if (segments[0] === 'csr' && segments[1] === 'requests' && segments[2] && segments[3] === 'forward') {
    const requestId = trimString(segments[2])
    const existing = await getRecord('service_requests', requestId)
    const isWarrantyTicket = isWarrantyPriorityTicket(existing)
    const record = await patchRecord('service_requests', requestId, {
      status: 'pending',
      workflow_stage: isWarrantyTicket ? 'warranty_priority_forwarded' : 'csr_forwarded',
      operations_stage: 'awaiting_operational_review',
      csr_status: 'validated',
      csr_forwarded_at: nowIso(),
      csr_validated_by: me?.uid || me?.id || null,
      csr_validated_by_name: adminUserName(me || {}),
      rejection_reason: null,
      warranty_priority_ticket_status: isWarrantyTicket ? 'forwarded' : (existing?.warranty_priority_ticket_status || null),
    })
    await notifyScopedRoleRecipients(
      record,
      ['operational', 'operational_management'],
      isWarrantyTicket ? 'Priority warranty ticket forwarded' : 'CSR forwarded a request to Operations',
      isWarrantyTicket
        ? `CSR forwarded warranty ticket #${requestId} for urgent Operations review.`
        : `CSR validated request #${requestId} and forwarded it to Operations.`,
      {
        category: 'operations',
        type: isWarrantyTicket ? 'warranty_priority_forwarded' : 'csr_forwarded_to_operations',
        request_id: requestId,
        link: '/Operational/OperationalLiveQueue',
      }
    )
    if (trimString(record?.user_id)) {
      await notifyUser(
        record.user_id,
        isWarrantyTicket ? 'Warranty ticket forwarded' : 'Request forwarded to Operations',
        isWarrantyTicket
          ? 'CSR tagged your warranty claim as a priority ticket and forwarded it to Operations.'
          : 'CSR validated your request and forwarded it to Operations.',
        {
          category: 'request_status',
          type: isWarrantyTicket ? 'warranty_priority_forwarded' : 'request_forwarded_to_operations',
          request_id: requestId,
        }
      )
    }
    return { message: 'Request validated and forwarded to Operations.', data: record }
  }

  if (segments[0] === 'csr' && segments[1] === 'requests' && segments[2] && segments[3] === 'reject') {
    const requestId = trimString(segments[2])
    const existing = await getRecord('service_requests', requestId)
    if (normalizeInventoryAllocations(existing?.inventory_allocations).length) {
      await releaseInventoryAllocations(existing)
    }
    const rejectionReason = trimString(payload.reason) || null
    const record = await patchRecord('service_requests', requestId, {
      status: 'rejected',
      workflow_stage: 'csr_rejected',
      operations_stage: null,
      csr_status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_by: me?.uid || me?.id || null,
      rejected_at: nowIso(),
      archived: true,
      archived_at: nowIso(),
      inventory_allocations: [],
      materials_reserved_at: null,
    })
    if (trimString(record?.user_id)) {
      const rejectionMessage = rejectionReason
        ? `CSR rejected your service request. Reason: ${rejectionReason}. Please review and resubmit if needed.`
        : 'CSR rejected your service request. Please review and resubmit if needed.'
      await notifyUser(record.user_id, 'Request rejected', rejectionMessage, {
        category: 'request_status',
        type: 'request_rejected',
        rejection_reason: rejectionReason,
      })
    }
    return { message: 'Request rejected successfully.', data: record }
  }

  if (segments[0] === 'finance' && segments[1] === 'procurement-approvals' && segments[2]) {
    const orderId = trimString(segments[2])
    const order = await getRecord('stock_orders', orderId)
    if (!order) throw new Error('Purchase requisition not found.')
    const approve = normalizeStatus(payload.action) === 'approve'
    const releaseAmount = toMoney(
      payload.release_amount === null || payload.release_amount === ''
        ? (order?.estimated_cost || order?.total_cost || 0)
        : payload.release_amount
    )
    if (approve && releaseAmount <= 0) {
      throw new Error('Finance must release a positive amount before approving this PR.')
    }
    const releaseMode = trimString(payload.release_mode) || inferFinanceReleaseMode(order?.purchase_type)
    const nextOrder = await patchRecord('stock_orders', orderId, {
      pr_status: approve ? 'approved' : 'rejected',
      finance_note: trimString(payload.finance_note) || null,
      finance_reviewed_at: nowIso(),
      finance_reviewed_by: me?.uid || me?.id || null,
      finance_release_status: approve ? 'released' : 'not_released',
      finance_release_amount: approve ? releaseAmount : 0,
      finance_release_mode: approve ? releaseMode : null,
      finance_release_reference: approve ? trimString(payload.release_reference) || null : null,
      finance_released_at: approve ? nowIso() : null,
      finance_released_by: approve ? (me?.uid || me?.id || null) : null,
      finance_release_variance: null,
      finance_release_balance: null,
      finance_settlement_status: approve ? 'awaiting_procurement_receipt' : null,
      finance_settled_at: null,
    })
    if (trimString(order?.service_request_id)) {
      await patchRecord('service_requests', order.service_request_id, {
        procurement_stage: approve ? 'finance_approved' : 'pending_procurement',
        stock_status: approve ? 'awaiting_delivery' : 'stock_unavailable',
        status: 'awaiting_material',
        workflow_stage: 'procurement_processing',
      })
      await notifyScopedRoleRecipients(
        { ...order, service_request_id: order.service_request_id },
        ['operational', 'operational_management'],
        approve ? 'Finance approved material funding' : 'Finance rejected material funding',
        approve
          ? `Finance approved ${trimString(order?.pr_reference || `PR-${orderId}`)}. Operations can wait for Procurement delivery before dispatch.`
          : `Finance rejected ${trimString(order?.pr_reference || `PR-${orderId}`)}. Review the finance note, revise materials, or cancel the job.`,
        {
          category: 'operations',
          type: approve ? 'finance_material_approved' : 'finance_material_rejected',
          link: '/Operational/OperationalMaterialPlanning',
          order_id: orderId,
          request_id: order.service_request_id,
        }
      )
    }
    const orderScope = {
      ...order,
      business_id: order?.business_id || null,
      business_name: order?.business_name || null,
    }
    await notifyScopedRoleRecipients(
      orderScope,
      ['procurement'],
      approve ? 'PR approved by Finance' : 'PR rejected by Finance',
      approve
        ? `Finance approved ${trimString(order?.pr_reference || `PR-${orderId}`)} and released ${releaseAmount.toFixed(2)} PHP for ${trimString(order?.material_name || 'the requested material')}.`
        : `Finance rejected ${trimString(order?.pr_reference || `PR-${orderId}`)}. Review the note and resubmit the PR if needed.`,
      {
        category: 'procurement',
        type: approve ? 'pr_finance_approved' : 'pr_finance_rejected',
        link: '/Procurement/ProcurementDashboard?section=supply-chain',
        order_id: orderId,
        request_id: order?.service_request_id || null,
        release_amount: approve ? releaseAmount : 0,
        release_mode: approve ? releaseMode : null,
      }
    )
    return {
      message: approve ? 'Purchase requisition approved and funding released.' : 'Purchase requisition rejected.',
      pr_status: approve ? 'approved' : 'rejected',
      data: nextOrder,
    }
  }

  if (segments[0] === 'service-provider' && segments[1] === 'update-request' && segments[2]) {
    const requestId = trimString(segments[2])
    const request = await getRecord('service_requests', requestId)
    if (!request) throw new Error('Service request not found.')

    const nextStatus = normalizeStatus(payload.status) || normalizeStatus(request.status) || 'assigned'
    const liveReportStage = normalizeStatus(payload.live_report_stage)
    if (nextStatus === 'in_progress') {
      const materialsReady = parseBooleanFlag(payload.pre_job_materials_ready)
      const equipmentReady = parseBooleanFlag(payload.pre_job_equipment_ready)
      if (!materialsReady || !equipmentReady) {
        throw new Error('Confirm materials and equipment readiness before starting the job.')
      }
    }
    const patch = {
      status: nextStatus,
      preferred_date: payload.preferred_date || request.preferred_date || null,
      updated_by_provider_at: nowIso(),
    }

    if (trimString(payload.reason)) {
      patch.rejection_reason = trimString(payload.reason)
      patch.notes = trimString(payload.reason)
    }
    if (nextStatus === 'awaiting_material') {
      patch.provider_accepted_at = nowIso()
      patch.workflow_stage = 'procurement_processing'
    }
    if (nextStatus === 'job_ready') {
      patch.materials_collected_at = nowIso()
      patch.procurement_stage = 'materials_ready'
      patch.stock_status = 'stock_available'
      patch.workflow_stage = 'job_ready'
    }
    if (nextStatus === 'in_progress') {
      patch.started_at = nowIso()
      patch.workflow_stage = 'service_in_progress'
      patch.pre_job_materials_ready = Boolean(payload.pre_job_materials_ready)
      patch.pre_job_equipment_ready = Boolean(payload.pre_job_equipment_ready)
    }
    if (liveReportStage === 'arrived') {
      patch.status = 'in_progress'
      patch.workflow_stage = 'service_in_progress'
      patch.live_report_stage = 'arrived'
      patch.arrived_at = trimString(payload.arrival_time) || nowIso()
      patch.field_status_label = 'arrived_at_location'
    }
    if (liveReportStage === 'work_in_progress') {
      const beforePhotos = await uploadArtifacts('service-request-proofs', 'before-proof', toFileArray(payload['before_photos[]'] || payload.before_photos))
      if (!beforePhotos.length) {
        throw new Error('Upload at least one before photo before marking the work as in progress.')
      }
      patch.status = 'in_progress'
      patch.workflow_stage = 'service_in_progress'
      patch.live_report_stage = 'work_in_progress'
      patch.work_started_at = trimString(payload.work_started_at) || nowIso()
      patch.field_status_label = 'work_in_progress'
      patch.live_report_before_files = beforePhotos
    }

    const record = await patchRecord('service_requests', requestId, patch)
    if (trimString(record?.user_id)) {
      if (liveReportStage === 'arrived') {
        await notifyUser(record.user_id, 'Team arrived on site', 'Your assigned team has arrived at the location and is preparing to start the job.', {
          category: 'request_status',
          type: 'team_arrived',
          request_id: requestId,
        })
      }
      if (liveReportStage === 'work_in_progress') {
        await notifyUser(record.user_id, 'Work in progress', 'Your assigned team has started the work and uploaded before-service photos.', {
          category: 'request_status',
          type: 'work_in_progress',
          request_id: requestId,
        })
      }
    }
    return { message: 'Request updated successfully.', status: record?.status || nextStatus, data: record }
  }

  if (segments[0] === 'service-provider' && segments[1] === 'complete-job' && segments[2]) {
    const requestId = trimString(segments[2])
    const request = await getRecord('service_requests', requestId)
    if (!request) throw new Error('Service request not found.')
    const requestStatus = normalizeStatus(request.status)
    if (requestStatus !== 'in_progress') {
      throw new Error('Job can only be completed while it is in progress.')
    }
    if (!['work_in_progress', 'completed'].includes(normalizeStatus(request?.live_report_stage))) {
      throw new Error('Update the live report to Work in Progress first before completing the job.')
    }
    const isWarrantyRepair = Boolean(request?.warranty_free_service)

    const completionFiles = await uploadArtifacts('service-request-proofs', 'completion-proof', toFileArray(payload['photos[]'] || payload.photos))
    if (!completionFiles.length) {
      throw new Error('Please upload at least one proof file before completing the job.')
    }
    const materialsUsed = trimString(payload.materials_used)
    const equipmentCondition = trimString(payload.equipment_condition)
    const inspectionResult = normalizeStatus(payload.inspection_result)
    if (!materialsUsed) {
      throw new Error('Please enter materials used before completing the job.')
    }
    if (!equipmentCondition) {
      throw new Error('Please enter equipment condition before completing the job.')
    }
    if (!['minor', 'major'].includes(inspectionResult)) {
      throw new Error('Please select a valid inspection result before completing the job.')
    }
    const completedAt = trimString(payload.completion_time) || nowIso()
    const record = await patchRecord('service_requests', requestId, {
      status: 'completed',
      workflow_stage: 'completed',
      operations_stage: 'completion_review_pending',
      completed_at: completedAt,
      completion_files: completionFiles,
      live_report_stage: 'completed',
      live_report_after_files: completionFiles,
      materials_used: materialsUsed,
      equipment_condition: equipmentCondition,
      inspection_result: inspectionResult,
      completion_review_status: 'pending',
      completion_review_requested_at: nowIso(),
      completion_review_requested_by: request?.team_leader_id || request?.service_provider_id || me?.uid || me?.id || null,
      warranty_status: 'pending_activation',
      warranty_started_at: null,
      warranty_expires_at: null,
    })
    await maybeCreatePerJobPayroll(record || request)
    await notifyScopedRoleRecipients(
      record,
      ['operational', 'operational_management'],
      'Completion report ready for review',
      isWarrantyRepair
        ? `Warranty repair for request #${requestId} was completed and is waiting for Operations final verification.`
        : `Request #${requestId} was marked complete by the field team and is waiting for Operations final verification.`,
      {
        category: 'operations',
        type: 'completion_review_pending',
        request_id: requestId,
        link: '/Operational/OperationalLiveQueue',
      }
    )
    return { message: 'Job completed successfully.', data: record }
  }

  if (segments[0] === 'procurement' && segments[1] === 'mark-received' && segments[2]) {
    const orderId = trimString(segments[2])
    const order = await getRecord('stock_orders', orderId)
    if (!order) throw new Error('Stock order not found.')

    const currentInventory = findInventoryRow(await listCollection('inventory'), order.material_name, order.unit)
    if (currentInventory?.id) {
      await patchRecord('inventory', currentInventory.id, {
        available: Math.max(0, Math.floor(toNumber(currentInventory.available, 0))) + Math.max(0, Math.floor(toNumber(order.quantity, 0))),
      })
    } else {
      await saveRecord('inventory', {
        material_name: order.material_name,
        unit: order.unit || 'pcs',
        available: Math.max(0, Math.floor(toNumber(order.quantity, 0))),
      })
    }

    const settledAmount = toMoney(order?.total_cost || order?.estimated_cost || 0)
    const nextOrder = await patchRecord('stock_orders', orderId, {
      status: 'received',
      pr_status: ['completed', 'delivered'].includes(normalizeStatus(order.pr_status)) ? normalizeStatus(order.pr_status) : 'delivered',
      arrival_date: nowIso().slice(0, 10),
      received_at: nowIso(),
      ...buildFinanceSettlementFields(order?.finance_release_amount, settledAmount),
    })

    let nextRequest = null
    if (trimString(order?.service_request_id)) {
      nextRequest = await refreshRequestMaterialReadiness(order.service_request_id)
      if (nextRequest && normalizeStatus(nextRequest.status) === 'job_ready') {
        await notifyScopedRoleRecipients(
          { ...order, ...nextRequest },
          ['operational', 'operational_management'],
          'Materials ready for dispatch',
          `Request #${order.service_request_id} now has enough stock and is ready for dispatch planning.`,
          {
            category: 'operations',
            type: 'materials_ready_for_dispatch',
            request_id: order.service_request_id,
            order_id: orderId,
            link: '/Operational/OperationalLiveQueue',
          }
        )
      }
    }

    return {
      message: nextRequest && normalizeStatus(nextRequest.status) === 'job_ready'
        ? 'Materials received. Request is now job ready.'
        : 'Stock marked as received.',
      data: nextOrder,
      request: nextRequest,
    }
  }

  if (segments[0] === 'procurement' && segments[1] === 'mark-job-ready' && segments[2]) {
    const requestId = trimString(segments[2])
    const request = await getRecord('service_requests', requestId)
    if (!request) throw new Error('Service request not found.')
    if (normalizeInventoryAllocations(request?.inventory_allocations).length) {
      await releaseInventoryAllocations(request)
    }
    const materials = normalizeMaterialList(payload.materials?.length ? payload.materials : request.materials)
    const shortages = evaluateMaterialShortage(materials, await listCollection('inventory'))
    const requiresProcurement = shortages.some((item) => item.shortage)
    const reservation = requiresProcurement
      ? { allocations: [], reservedAt: null }
      : await reserveInventoryForRequest({ ...request, inventory_allocations: [] }, materials)
    const nextPatch = {
      materials,
      material_availability: shortages,
      procurement_stage: requiresProcurement ? 'pending_procurement' : 'materials_ready',
      stock_status: requiresProcurement ? 'stock_unavailable' : 'stock_available',
      status: requiresProcurement ? 'awaiting_material' : 'job_ready',
      workflow_stage: requiresProcurement ? 'procurement_processing' : 'job_ready',
      materials_ready_at: requiresProcurement ? null : nowIso(),
      materials_reserved_at: requiresProcurement ? null : reservation.reservedAt,
      inventory_allocations: requiresProcurement ? [] : reservation.allocations,
    }
    const record = await patchRecord('service_requests', requestId, nextPatch)
    if (requiresProcurement) {
      await ensureProcurementOrdersForShortage({ ...request, ...record }, shortages)
      await notifyScopedRoleRecipients(
        { ...request, ...record },
        ['procurement'],
        'Request needs procurement',
        `Request #${requestId} has missing stock: ${summarizeShortages(shortages) || 'materials still need procurement review'}.`,
        {
          category: 'procurement',
          type: 'request_shortage',
          link: '/Procurement/ProcurementDashboard?section=requests',
          request_id: requestId,
        }
      )
    } else {
      await notifyScopedRoleRecipients(
        { ...request, ...record },
        ['operational', 'operational_management'],
        'Materials ready for dispatch',
        `Request #${requestId} is now job ready and can move to dispatch.`,
        {
          category: 'operations',
          type: 'materials_ready_for_dispatch',
          request_id: requestId,
          link: '/Operational/OperationalLiveQueue',
        }
      )
    }
    return {
      message: requiresProcurement
        ? 'Some materials are still missing. Purchase requisition entries were prepared for Procurement and Finance review.'
        : 'All required materials are available. Request is now job ready.',
      requires_procurement: requiresProcurement,
      data: record,
    }
  }

  if (segments[0] === 'procurement' && segments[1] === 'stock-orders' && config.method === 'post' && segments.length === 2) {
    const materialName = trimString(payload.material_name)
    const purchaseType = normalizeStatus(payload.purchase_type || (payload.receipt_image ? 'physical' : 'online')) || 'online'
    const quantity = Math.max(1, Math.floor(toNumber(payload.quantity, 1)))
    const unit = trimString(payload.unit) || defaultMaterialUnit(materialName)
    if (!materialName) {
      throw new Error('Please select a material first.')
    }
    if (purchaseType === 'online' && !trimString(payload.purchase_link)) {
      throw new Error('Purchase link is required for online purchase entries.')
    }
    if (purchaseType === 'physical' && !toFileArray(payload.receipt_image).length) {
      throw new Error('Receipt proof is required for physical purchase entries.')
    }

    const unitCost = payload.unit_cost === '' || payload.unit_cost === null || payload.unit_cost === undefined
      ? null
      : toMoney(payload.unit_cost)
    const totalCost = payload.total_cost === '' || payload.total_cost === null || payload.total_cost === undefined
      ? (unitCost === null ? null : toMoney(unitCost * quantity))
      : toMoney(payload.total_cost)
    const receiptFiles = purchaseType === 'physical'
      ? await uploadArtifacts('procurement-receipts', 'manual-purchase-receipt', toFileArray(payload.receipt_image))
      : []
    const receivedNow = purchaseType === 'physical'

    const record = await saveRecord('stock_orders', {
      material_name: materialName,
      purchase_type: purchaseType,
      purchase_link: purchaseType === 'online' ? trimString(payload.purchase_link) || null : null,
      quantity,
      unit,
      supplier_name: trimString(payload.supplier_name) || null,
      supplier_store: trimString(payload.supplier_store || payload.supplier_name) || null,
      unit_cost: unitCost,
      total_cost: totalCost,
      estimated_cost: totalCost,
      expected_date: trimString(payload.expected_date) || null,
      expected_delivery_date: trimString(payload.expected_date) || null,
      receipt_files: receiptFiles,
      status: receivedNow ? 'received' : 'ordered',
      pr_status: receivedNow ? 'completed' : 'pending',
      received_at: receivedNow ? nowIso() : null,
      arrival_date: receivedNow ? nowIso().slice(0, 10) : null,
      direct_purchase_completed_at: receivedNow ? nowIso() : null,
      created_by: me?.uid || me?.id || null,
      created_by_role: trimString(me?.role) || null,
    })

    if (receivedNow) {
      const inventoryRows = await listCollection('inventory')
      const currentInventory = findInventoryRow(inventoryRows, materialName, unit)
      if (currentInventory?.id) {
        await patchRecord('inventory', currentInventory.id, {
          available: Math.max(0, Math.floor(toNumber(currentInventory.available, 0))) + quantity,
        })
      } else {
        await saveRecord('inventory', {
          material_name: materialName,
          unit,
          available: quantity,
        })
      }
    }

    return {
      message: receivedNow
        ? 'Physical purchase recorded, receipt uploaded, and inventory updated.'
        : 'Online stock order added successfully.',
      data: record,
    }
  }

  if (segments[0] === 'procurement' && segments[1] === 'stock-orders' && segments[2] && segments[3] === 'review-pr') {
    const orderId = trimString(segments[2])
    const order = await getRecord('stock_orders', orderId)
    if (!order) throw new Error('Stock order not found.')
    const estimatedCost = toMoney(payload.estimated_cost)
    if (estimatedCost <= 0) {
      throw new Error('Estimated cost is required before submitting a PR to Finance.')
    }
    const record = await patchRecord('stock_orders', orderId, {
      purchase_type: trimString(payload.purchase_type) || null,
      supplier_store: trimString(payload.supplier_store) || null,
      estimated_cost: estimatedCost,
      expected_delivery_date: trimString(payload.expected_delivery_date) || trimString(payload.expected_date) || null,
      purchase_link: trimString(payload.purchase_link) || null,
      procurement_note: trimString(payload.procurement_note) || null,
      pr_status: 'pending_finance_approval',
      pr_submitted_at: nowIso(),
      status: 'ordered',
      finance_release_status: 'awaiting_finance_approval',
      finance_release_amount: null,
      finance_release_mode: null,
      finance_release_reference: null,
      finance_release_variance: null,
      finance_release_balance: null,
      finance_settlement_status: null,
      finance_released_at: null,
      finance_released_by: null,
      finance_reviewed_at: null,
      finance_reviewed_by: null,
    })
    if (trimString(order?.service_request_id)) {
      await patchRecord('service_requests', order.service_request_id, {
        procurement_stage: 'pending_finance_approval',
        status: 'awaiting_material',
        workflow_stage: 'procurement_processing',
      })
    }
    await notifyScopedRoleRecipients(
      { ...order, ...record },
      ['finance'],
      'PR ready for finance approval',
      `${trimString(record?.pr_reference || `PR-${orderId}`)} is waiting for Finance approval for ${trimString(record?.material_name || 'a material order')}.`,
      {
        category: 'finance',
        type: 'pr_pending_finance_approval',
        link: '/finance/procurement-approvals',
        order_id: orderId,
        request_id: record?.service_request_id || order?.service_request_id || null,
        estimated_cost: estimatedCost,
      }
    )
    return { message: 'PR submitted for finance approval.', data: record }
  }

  if (segments[0] === 'procurement' && segments[1] === 'stock-orders' && segments[2] && segments[3] === 'in-transit') {
    const orderId = trimString(segments[2])
    const order = await getRecord('stock_orders', orderId)
    if (!order) throw new Error('Stock order not found.')
    if (normalizeStatus(order?.pr_status) !== 'approved' || normalizeStatus(order?.finance_release_status) !== 'released') {
      throw new Error('Finance must approve the PR and release funds before Procurement can place the order.')
    }
    const record = await patchRecord('stock_orders', orderId, {
      pr_status: 'in_transit',
      expected_delivery_date: trimString(payload.expected_delivery_date) || null,
      in_transit_at: nowIso(),
      status: 'ordered',
    })
    if (trimString(order?.service_request_id)) {
      await patchRecord('service_requests', order.service_request_id, {
        procurement_stage: 'finance_approved',
        stock_status: 'awaiting_delivery',
        status: 'awaiting_material',
        workflow_stage: 'procurement_processing',
      })
    }
    return { message: 'PR marked as in transit.', data: record }
  }

  if (segments[0] === 'procurement' && segments[1] === 'stock-orders' && segments[2] && segments[3] === 'complete-direct') {
    const orderId = trimString(segments[2])
    const order = await getRecord('stock_orders', orderId)
    if (!order) throw new Error('Stock order not found.')
    if (normalizeStatus(order?.pr_status) !== 'approved' || normalizeStatus(order?.finance_release_status) !== 'released') {
      throw new Error('Finance must approve the PR and release funds before Procurement can complete this purchase.')
    }
    const receiptFiles = await uploadArtifacts('procurement-receipts', 'direct-receipt', toFileArray(payload.receipt_image))
    const settledAmount = toMoney(
      payload.total_cost === '' || payload.total_cost === null
        ? (order?.estimated_cost || 0)
        : payload.total_cost
    )
    const record = await patchRecord('stock_orders', orderId, {
      supplier_store: trimString(payload.supplier_store) || null,
      unit_cost: payload.unit_cost === '' ? null : toMoney(payload.unit_cost),
      total_cost: settledAmount,
      procurement_note: trimString(payload.procurement_note) || null,
      receipt_files: receiptFiles,
      pr_status: 'completed',
      direct_purchase_completed_at: nowIso(),
      received_at: nowIso(),
      arrival_date: nowIso().slice(0, 10),
      status: 'received',
      ...buildFinanceSettlementFields(order?.finance_release_amount, settledAmount),
    })
    let nextRequest = null
    if (trimString(order?.service_request_id)) {
      nextRequest = await refreshRequestMaterialReadiness(order.service_request_id)
      if (nextRequest && normalizeStatus(nextRequest.status) === 'job_ready') {
        await notifyScopedRoleRecipients(
          { ...order, ...nextRequest },
          ['operational', 'operational_management'],
          'Direct purchase completed',
          `Request #${order.service_request_id} is now job ready after Procurement completed the direct purchase.`,
          {
            category: 'operations',
            type: 'materials_ready_for_dispatch',
            request_id: order.service_request_id,
            order_id: orderId,
            link: '/Operational/OperationalLiveQueue',
          }
        )
      }
    }
    return {
      message: nextRequest && normalizeStatus(nextRequest.status) === 'job_ready'
        ? 'Direct purchase completed. Request is now job ready.'
        : 'Direct purchase recorded successfully.',
      data: record,
      request: nextRequest,
    }
  }

  if (source === '/hr/payrolls' && config.method === 'post') {
    const employee = payload.employee_id ? await getRecord('employees', payload.employee_id) : null
    const payDate = trimString(payload.pay_date)
    let payrollPeriodLabel = trimString(payload.payroll_period_label)
    let payrollPeriodStart = trimString(payload.payroll_period_start)
    let payrollPeriodEnd = trimString(payload.payroll_period_end)
    if (payDate && (!payrollPeriodLabel || !payrollPeriodStart || !payrollPeriodEnd)) {
      const parsed = new Date(`${payDate}T00:00:00`)
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear()
        const month = parsed.getMonth()
        const lastDay = new Date(year, month + 1, 0).getDate()
        const day = parsed.getDate()
        const isFirstHalf = day <= 15
        const startDay = isFirstHalf ? 1 : 16
        const endDay = isFirstHalf ? 15 : lastDay
        const formatDatePart = (dateValue) => {
          const yyyy = dateValue.getFullYear()
          const mm = String(dateValue.getMonth() + 1).padStart(2, '0')
          const dd = String(dateValue.getDate()).padStart(2, '0')
          return `${yyyy}-${mm}-${dd}`
        }
        payrollPeriodLabel = payrollPeriodLabel || (isFirstHalf ? '1st Kinsenas' : '2nd Kinsenas')
        payrollPeriodStart = payrollPeriodStart || formatDatePart(new Date(year, month, startDay))
        payrollPeriodEnd = payrollPeriodEnd || formatDatePart(new Date(year, month, endDay))
      }
    }
    const record = await saveRecord('payrolls', {
      ...payload,
      employee_id: payload.employee_id,
      user_id: employee?.uid || employee?.user_id || payload.employee_id,
      business_id: employee?.business_id || me?.business_id || null,
      compensation_model: trimString(payload.compensation_model) || 'semi_monthly',
      salary_basis: trimString(payload.salary_basis) || 'fixed_employee_salary',
      payroll_period_label: payrollPeriodLabel || null,
      payroll_period_start: payrollPeriodStart || null,
      payroll_period_end: payrollPeriodEnd || null,
      payroll_category: 'employee_payroll',
      status: 'generated',
    })
    return { message: 'Payroll saved successfully.', data: record }
  }

  if (!entity) {
    return { message: 'Saved to Firebase.' }
  }

  if (entity === 'service_requests' && id && action.includes('review')) {
    const existing = await getRecord('service_requests', id)
    const approve = normalizeStatus(payload.action) !== 'reject'
    if (!approve && normalizeInventoryAllocations(existing?.inventory_allocations).length) {
      await releaseInventoryAllocations(existing)
    }
    const record = await patchRecord('service_requests', id, {
      status: approve ? 'approved' : 'rejected',
      workflow_stage: approve ? 'operations_reviewed' : 'operations_rejected',
      operations_stage: approve ? 'operational_review_approved' : 'operational_review_rejected',
      operational_review_action: approve ? 'approve' : 'reject',
      operational_review_reason: trimString(payload.reason) || null,
      reviewed_by: me?.uid || me?.id || null,
      reviewed_at: nowIso(),
      archived: !approve,
      archived_at: approve ? null : nowIso(),
      stock_status: approve ? 'pending_stock_check' : null,
      inventory_allocations: approve ? (existing?.inventory_allocations || []) : [],
      materials_reserved_at: approve ? (existing?.materials_reserved_at || null) : null,
    })
    return { message: approve ? 'Request approved by Operations.' : 'Request rejected by Operations.', data: record }
  }

  if (entity === 'service_requests' && id && action.includes('approve-procurement')) {
    const existing = await getRecord('service_requests', id)
    const managementMode = deriveManagementMode({
      ...(existing || {}),
      business: existing?.business || null,
      assigned_business: existing?.assigned_business || existing?.business || null,
    })
    const businessType = normalizeBusinessType(
      existing?.business_type
      || existing?.business?.business_type
      || existing?.assigned_business?.business_type
    )
    const requiresCsrValidation = (
      (managementMode === 'hr' || businessType === 'company')
      && normalizeStatus(existing?.csr_status) !== 'validated'
      && normalizeStatus(existing?.workflow_stage) !== 'csr_forwarded'
    )

    const patch = {
      status: 'pending',
      hr_approved_for_procurement: true,
      approved_by: me?.uid || me?.id || null,
      approved_at: nowIso(),
    }

    if (requiresCsrValidation) {
      patch.workflow_stage = 'csr_review'
      patch.operations_stage = 'awaiting_csr_validation'
      patch.csr_status = normalizeStatus(existing?.csr_status) || 'pending'
    } else {
      patch.workflow_stage = 'csr_forwarded'
      patch.operations_stage = 'awaiting_operational_review'
    }

    const record = await patchRecord('service_requests', id, patch)
    return {
      message: requiresCsrValidation
        ? 'Request sent to CSR intake review first.'
        : 'Request sent to Operations review.',
      data: record,
    }
  }

  if (entity === 'service_requests' && id && (action.includes('archive') || source.includes('/archive'))) {
    const record = await patchRecord('service_requests', id, { archived: true })
    return { message: 'Request archived successfully.', data: record }
  }

  if (entity === 'service_requests' && id && (action.includes('restore') || source.includes('/restore'))) {
    const record = await patchRecord('service_requests', id, { archived: false })
    return { message: 'Request restored successfully.', data: record }
  }

  if (entity === 'service_requests' && id && (action.includes('cancel') || source.includes('/cancel'))) {
    const existing = await getRecord('service_requests', id)
    if (normalizeInventoryAllocations(existing?.inventory_allocations).length) {
      await releaseInventoryAllocations(existing)
    }
    const record = await patchRecord('service_requests', id, {
      status: 'cancelled',
      inventory_allocations: [],
      materials_reserved_at: null,
    })
    return { message: 'Request cancelled successfully.', data: record }
  }

  if (entity === 'service_requests' && id && (action.includes('feedback') || source.includes('/feedback'))) {
    const existing = await getRecord('service_requests', id)
    if (!existing) throw new Error('Service request not found.')

    const meProfile = me || await currentProfile()
    const currentUserId = trimString(meProfile?.uid || meProfile?.id)
    const requesterId = trimString(existing?.user_id || existing?.user?.uid || existing?.user?.id)

    if (!currentUserId) {
      throw new Error('No signed-in Firebase user found.')
    }
    if (requesterId && requesterId !== currentUserId) {
      throw new Error('You can only submit feedback for your own service request.')
    }
    if (normalizeStatus(existing?.status) !== 'completed') {
      throw new Error('Feedback can only be submitted after the job is completed.')
    }
    if (trimString(existing?.feedback?.submitted_at) || Number(existing?.feedback?.rating || 0) > 0) {
      throw new Error('Feedback has already been submitted for this request.')
    }

    const rating = Math.trunc(toNumber(payload.rating, 0))
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Please provide a rating from 1 to 5.')
    }

    const feedbackFiles = toFileArray(payload['attachments[]'] || payload.attachments)
    if (feedbackFiles.length > 5) {
      throw new Error('You can upload up to 5 photos only.')
    }

    const attachments = await uploadArtifacts('service-request-feedback', 'feedback', feedbackFiles)
    const reviewId = normalizeKey(`service_request_review_${id}`)
    const reviewRecord = await saveRecord('reviews', {
      id: reviewId,
      service_request_id: existing.id,
      request_id: existing.id,
      business_id: trimString(
        existing?.business_id
        || existing?.business?.id
        || existing?.business?.uid
        || existing?.assigned_business?.id
        || existing?.assigned_business?.uid
      ),
      business_uid: trimString(existing?.business?.uid || existing?.business?.owner_uid || existing?.assigned_business?.uid || existing?.assigned_business?.owner_uid || ''),
      business_name: trimString(existing?.business_name || existing?.business?.business_name || existing?.assigned_business?.business_name || ''),
      provider_id: trimString(existing?.service_provider_id || existing?.provider_id || existing?.assigned_provider_id || ''),
      provider_name: trimString(existing?.service_provider?.name || existing?.assigned_employee_name || existing?.provider?.name || ''),
      user_id: currentUserId,
      user_name: trimString(
        meProfile?.full_name
        || [meProfile?.first_name, meProfile?.middle_initial ? `${meProfile.middle_initial}.` : '', meProfile?.last_name]
          .filter(Boolean)
          .join(' ')
      ) || trimString(meProfile?.email) || 'Customer',
      rating,
      feedback: trimString(payload.feedback) || null,
      attachments,
      submitted_at: nowIso(),
      visible_to_public: true,
      source_kind: 'service_request_feedback',
    }, reviewId)
    const record = await patchRecord('service_requests', id, {
      feedback: {
        rating,
        feedback: trimString(payload.feedback) || null,
        attachments,
        submitted_at: nowIso(),
        review_id: trimString(reviewRecord?.id || reviewId),
      },
    })
    return { message: 'Feedback submitted successfully.', data: record }
  }

  if (entity === 'service_requests' && id && (action.includes('warranty-claim') || source.includes('/warranty-claim')) && !action.includes('resolve')) {
    const existing = await getRecord('service_requests', id)
    if (!existing) throw new Error('Service request not found.')
    if (normalizeStatus(existing?.status) !== 'completed') {
      throw new Error('Warranty claims can only be filed after the job is completed.')
    }
    if (normalizeStatus(existing?.warranty_status) !== 'active') {
      throw new Error('This request is not inside an active warranty period.')
    }

    const claimTimestamp = nowIso()
    const warrantyExpiresAt = trimString(existing?.warranty_expires_at)
    if (!warrantyExpiresAt || Number.isNaN(new Date(warrantyExpiresAt).getTime()) || new Date(warrantyExpiresAt).getTime() < new Date(claimTimestamp).getTime()) {
      throw new Error('This warranty has already expired.')
    }

    const record = await patchRecord('service_requests', id, {
      warranty_claim: {
        ...payload,
        submitted_at: claimTimestamp,
        submitted_by: me?.uid || me?.id || null,
        submitted_by_name: adminUserName(me || {}),
        status: 'pending',
      },
      warranty_status: 'claimed',
      status: 'warranty_pending',
      workflow_stage: 'warranty_priority_ticket',
      operations_stage: 'warranty_review_pending',
      warranty_priority_ticket_status: 'pending',
      priority: 'high',
      warranty_review_status: 'pending',
      warranty_free_service: false,
      notes: `${trimString(existing?.notes)} [WARRANTY_CLAIM:${claimTimestamp}]`.trim(),
    })
    await notifyScopedRoleRecipients(
      record,
      ['csr'],
      'Priority warranty ticket',
      `A customer filed a warranty claim for request #${id}. Review it as a priority CSR ticket.`,
      {
        category: 'csr',
        type: 'warranty_priority_ticket',
        request_id: id,
        priority: 'high',
        link: '/CSR/Dashboard',
      }
    )
    return { message: 'Warranty claim submitted successfully.', data: record }
  }

  if (entity === 'service_requests' && id && action.includes('warranty-claim') && action.includes('resolve')) {
    const existing = await getRecord('service_requests', id)
    if (!existing) throw new Error('Service request not found.')
    const status = normalizeStatus(existing?.status)
    const warrantyStatus = normalizeStatus(existing?.warranty_status)
    if (!['warranty_pending', 'warranty_rework'].includes(status) && warrantyStatus !== 'claimed') {
      throw new Error('This request is not waiting for a warranty decision.')
    }

    const approve = normalizeStatus(payload.action) !== 'reject'
    const reviewTimestamp = nowIso()
    const reviewReason = trimString(payload.reason) || null
    const nextPatch = {
      warranty_review_status: approve ? 'approved' : 'rejected',
      warranty_review_reason: reviewReason,
      warranty_reviewed_at: reviewTimestamp,
      warranty_reviewed_by: me?.uid || me?.id || null,
      warranty_reviewed_by_name: adminUserName(me || {}),
      warranty_resolution: {
        action: approve ? 'approved' : 'rejected',
        reason: reviewReason,
        reviewed_at: reviewTimestamp,
        reviewed_by: me?.uid || me?.id || null,
        reviewed_by_name: adminUserName(me || {}),
      },
      notes: `${trimString(existing?.notes)} [WARRANTY_REVIEW:${approve ? 'approved' : 'rejected'}:${reviewTimestamp}]`.trim(),
    }

    if (approve) {
      nextPatch.status = 'warranty_rework'
      nextPatch.workflow_stage = 'warranty_handling'
      nextPatch.operations_stage = 'warranty_rework_scheduled'
      nextPatch.warranty_status = 'rework_scheduled'
      nextPatch.warranty_free_service = true
      nextPatch.warranty_reopen_at = reviewTimestamp
    } else {
      nextPatch.status = 'completed'
      nextPatch.workflow_stage = 'completed'
      nextPatch.operations_stage = 'warranty_rejected'
      nextPatch.warranty_status = 'rejected'
      nextPatch.warranty_free_service = false
      nextPatch.archived = true
      nextPatch.archived_at = reviewTimestamp
    }

    const record = await patchRecord('service_requests', id, nextPatch)
    if (trimString(record?.user_id)) {
      await notifyUser(
        record.user_id,
        approve ? 'Warranty claim approved' : 'Warranty claim rejected',
        approve
          ? 'Your warranty claim was approved. The request was reopened for a free follow-up repair.'
          : `Your warranty claim was rejected. ${reviewReason || 'The issue was marked outside warranty coverage.'}`,
        {
          category: 'request_status',
          type: approve ? 'warranty_claim_approved' : 'warranty_claim_rejected',
        }
      )
    }
    return { message: approve ? 'Warranty claim approved.' : 'Warranty claim rejected.', data: record }
  }

  if (entity === 'service_requests' && id && action.includes('assign-team-equipment')) {
    const existing = await getRecord('service_requests', id)
    const record = await patchRecord('service_requests', id, {
      assigned_team: trimString(payload.team) || trimString(existing?.assigned_team) || null,
      selected_team: trimString(payload.team) || trimString(existing?.selected_team) || null,
      equipment_notes: trimString(payload.equipment_notes) || null,
      assigned_at: nowIso(),
      assigned_by_user_id: me?.uid || me?.id || null,
      status: 'assigned',
      workflow_stage: 'operations_assignment',
      operations_stage: 'team_assigned',
    })
    return { message: 'Team assignment saved.', data: record }
  }

  if (entity === 'service_requests' && id && action.includes('dispatch-team')) {
    const existing = await getRecord('service_requests', id)
    const stockStage = trimString(existing?.stock_status).toLowerCase()
    const procurementStage = trimString(existing?.procurement_stage).toLowerCase()
    const dispatchEmployeeIds = Array.isArray(payload.dispatch_employee_ids)
      ? payload.dispatch_employee_ids.map((value) => trimString(value)).filter(Boolean)
      : []
    const dispatchEmployeeRoles = Array.isArray(payload.dispatch_employee_roles)
      ? payload.dispatch_employee_roles.map((value) => trimString(value)).filter(Boolean)
      : []
    if (dispatchEmployeeIds.length !== 3) {
      throw new Error('Dispatch team must contain exactly 3 personnel: 1 team leader and 2 technicians.')
    }
    const nextPatch = {
      employee_id: trimString(payload.employee_id || payload.assigned_employee_id) || trimString(existing?.employee_id || existing?.assigned_employee_id) || null,
      assigned_employee_id: trimString(payload.assigned_employee_id || payload.employee_id) || trimString(existing?.assigned_employee_id || existing?.employee_id) || null,
      assigned_employee_name: trimString(payload.assigned_employee_name) || trimString(existing?.assigned_employee_name) || null,
      dispatch_employee_ids: dispatchEmployeeIds,
      dispatch_employee_roles: dispatchEmployeeRoles,
      team_members_count: Number(payload.team_members_count || dispatchEmployeeIds.length || existing?.team_members_count || 0),
      team_leader_id: trimString(payload.team_leader_id || payload.employee_id || payload.assigned_employee_id) || trimString(existing?.team_leader_id || existing?.employee_id || existing?.assigned_employee_id) || null,
      team_leader_role: trimString(payload.team_leader_role) || trimString(existing?.team_leader_role) || null,
      team_leader_name: trimString(payload.team_leader_name) || trimString(existing?.team_leader_name) || null,
      assigned_team: trimString(payload.assigned_team || payload.team) || trimString(existing?.assigned_team) || null,
      selected_team: trimString(payload.selected_team || payload.team) || trimString(existing?.selected_team) || null,
      assigned_at: trimString(payload.assigned_at) || nowIso(),
      assigned_by_user_id: me?.uid || me?.id || null,
      workflow_stage: 'procurement_processing',
      operations_stage: 'team_assigned',
      procurement_stage: procurementStage && procurementStage !== 'not_started'
        ? procurementStage
        : 'awaiting_stock_review',
      status: 'awaiting_material',
    }

    if (stockStage === 'pending_stock_check') {
      nextPatch.stock_status = null
    } else if (stockStage) {
      nextPatch.stock_status = stockStage
    }

    const record = await patchRecord('service_requests', id, nextPatch)
    await Promise.all(dispatchEmployeeIds.map((recipientId) => notifyUser(recipientId, 'Dispatch assignment received', `You were assigned to dispatch for request #${id}. Check your dashboard for the job details.`, {
      category: 'assignment',
      type: 'dispatch_assignment',
      request_id: id,
    })))
    return { message: 'Dispatch team assigned and request moved to materials coordination.', data: record }
  }

  if (entity === 'service_requests' && id && action.includes('plan-materials')) {
    const existing = await getRecord('service_requests', id)
    if (!existing) throw new Error('Service request not found.')
    if (normalizeInventoryAllocations(existing?.inventory_allocations).length) {
      await releaseInventoryAllocations(existing)
    }
    const materials = normalizeMaterialList(payload.materials)
    const shortages = evaluateMaterialShortage(materials, await listCollection('inventory'))
    const requiresProcurement = shortages.some((item) => item.shortage)
    const reservation = requiresProcurement
      ? { allocations: [], reservedAt: null }
      : await reserveInventoryForRequest({ ...existing, inventory_allocations: [] }, materials)
    const record = await patchRecord('service_requests', id, {
      materials,
      material_availability: shortages,
      procurement_stage: requiresProcurement ? 'pending_procurement' : 'materials_ready',
      stock_status: requiresProcurement ? 'stock_unavailable' : 'stock_available',
      workflow_stage: requiresProcurement ? 'procurement_processing' : 'job_ready',
      status: requiresProcurement ? 'awaiting_material' : 'job_ready',
      materials_planned_at: nowIso(),
      materials_ready_at: requiresProcurement ? null : nowIso(),
      materials_reserved_at: requiresProcurement ? null : reservation.reservedAt,
      inventory_allocations: requiresProcurement ? [] : reservation.allocations,
      service_track: trimString(existing?.service_track || detectServiceTrack(existing?.service_type)),
    })
    if (requiresProcurement) {
      await ensureProcurementOrdersForShortage({ ...existing, ...record }, shortages)
      await notifyScopedRoleRecipients(
        { ...existing, ...record },
        ['procurement'],
        'Request needs procurement',
        `Request #${id} has missing stock: ${summarizeShortages(shortages) || 'materials still need procurement review'}.`,
        {
          category: 'procurement',
          type: 'request_shortage',
          link: '/Procurement/ProcurementDashboard?section=requests',
          request_id: id,
        }
      )
    }
    return {
      message: requiresProcurement
        ? 'Materials plan saved. Procurement was notified and draft PR entries were prepared for missing stock.'
        : 'Materials plan saved. Stock was reserved and the request is now job ready.',
      requires_procurement: requiresProcurement,
      data: record,
    }
  }

  if (segments[0] === 'operational' && segments[1] === 'service-requests' && segments[2] && segments[3] === 'final-review') {
    const requestId = trimString(segments[2])
    const existing = await getRecord('service_requests', requestId)
    if (!existing) throw new Error('Service request not found.')
    if (normalizeStatus(existing?.status) !== 'completed') {
      throw new Error('Only completed jobs can be reviewed for final closure.')
    }

    const approve = normalizeStatus(payload.action) !== 'reject'
    const reviewTimestamp = nowIso()
    const reason = trimString(payload.reason) || null
    const nextPatch = approve
      ? {
          completion_review_status: 'approved',
          completion_review_reason: null,
          completion_reviewed_at: reviewTimestamp,
          completion_reviewed_by: me?.uid || me?.id || null,
          completion_reviewed_by_name: adminUserName(me || {}),
          operations_stage: 'job_closed',
          closed_at: reviewTimestamp,
          warranty_status: 'active',
          warranty_started_at: trimString(existing?.completed_at) || reviewTimestamp,
          warranty_expires_at: addDaysIso(14),
        }
      : {
          status: 'in_progress',
          workflow_stage: 'service_in_progress',
          operations_stage: 'completion_review_rejected',
          completion_review_status: 'rejected',
          completion_review_reason: reason,
          completion_reviewed_at: reviewTimestamp,
          completion_reviewed_by: me?.uid || me?.id || null,
          completion_reviewed_by_name: adminUserName(me || {}),
          closed_at: null,
          last_completion_attempt_at: trimString(existing?.completed_at) || reviewTimestamp,
          completed_at: null,
          warranty_status: 'none',
          warranty_started_at: null,
          warranty_expires_at: null,
          live_report_stage: 'work_in_progress',
        }
    const record = await patchRecord('service_requests', requestId, nextPatch)
    if (trimString(record?.user_id)) {
      await notifyUser(
        record.user_id,
        approve ? 'Service completed' : 'Operations requested rework',
        approve
          ? 'Operations closed your job successfully. Your 2-week warranty is now active.'
          : `Operations rejected the completion report and requested fixes before closing the job.${reason ? ` Reason: ${reason}` : ''}`,
        {
          category: 'request_status',
          type: approve ? 'request_closed' : 'completion_rework_requested',
          request_id: requestId,
        }
      )
    }
    await notifyRequestAssignee(
      { ...existing, ...record },
      approve ? 'Job closed by Operations' : 'Completion report rejected',
      approve
        ? `Operations approved the final report for request #${requestId}.`
        : `Operations rejected the final report for request #${requestId}.${reason ? ` Reason: ${reason}` : ''}`,
      {
        category: 'operations',
        type: approve ? 'job_closed' : 'completion_rejected',
        request_id: requestId,
      }
    )
    return {
      message: approve ? 'Job closed and warranty activated.' : 'Completion rejected and request returned to the field team.',
      data: record,
    }
  }

  if (entity === 'service_requests' && id && action.includes('assign')) {
    const existing = await getRecord('service_requests', id)
    const providerId = trimString(payload.service_provider_id || payload.provider_id || payload.assigned_provider_id)
    const stockStage = trimString(existing?.stock_status).toLowerCase()
    const procurementStage = trimString(existing?.procurement_stage).toLowerCase()
    let provider = null
    if (providerId) {
      const providers = await listCollection('service_providers')
      provider = providers.find((row) => matchesAnyUserId([row?.id, row?.uid, row?.user_id], [providerId])) || null
    }
    const providerUserId = provider?.user_id || provider?.uid || provider?.id || providerId || null

    const nextPatch = {
      service_provider_id: providerUserId || existing?.service_provider_id || null,
      provider_id: providerUserId || existing?.provider_id || null,
      assigned_provider_id: providerUserId,
      assigned_provider_name: trimString(provider?.name || provider?.display_name),
      status: 'awaiting_material',
      assigned_at: nowIso(),
      assigned_by_user_id: me?.uid || me?.id || null,
      workflow_stage: 'procurement_processing',
      operations_stage: 'provider_assigned',
      procurement_stage: procurementStage && procurementStage !== 'not_started'
        ? procurementStage
        : 'awaiting_stock_review',
    }

    if (stockStage === 'pending_stock_check') {
      nextPatch.stock_status = null
    } else if (stockStage) {
      nextPatch.stock_status = stockStage
    }

    const record = await patchRecord('service_requests', id, nextPatch)

    await saveRecord('audit_logs', {
      service_request_id: id,
      business_id: record?.business_id || existing?.business_id || me?.business_id || null,
      assignment_mode: 'manual',
      assignment_source: source.startsWith('/business/') ? 'business_dashboard' : 'operations',
      assigned_provider_id: record?.service_provider_id || providerId || null,
      assigned_by: me?.uid || me?.id || null,
      assigned_by_name: adminUserName(me || {}),
    })

    if (trimString(record?.service_provider_id)) {
      await notifyUser(record.service_provider_id, 'New service request assigned', 'A new request was assigned to you and is waiting for your acceptance.', {
        category: 'assignment',
        type: 'business_assignment',
        link: '/serviceprovider?section=assigned-requests',
      })
    }

    return { message: 'Provider assigned successfully.', data: record }
  }

  if (entity === 'service_requests' && id && (action.includes('assign') || action.includes('dispatch-team') || action.includes('assign-team-equipment') || action.includes('plan-materials') || action.includes('request-consumables') || action.includes('log-payment') || action.includes('complete-job') || action.includes('update-request'))) {
    const record = await patchRecord('service_requests', id, payload)
    return { message: 'Request updated successfully.', data: record }
  }

  if (entity === 'employees' && id && action.includes('status')) {
    const existing = await getRecord('employees', id)
    if (!existing) {
      throw buildAxiosError(config, 'Employee not found.', 404)
    }

    const actionKey = normalizeStatus(payload.action)
    const approvalState = actionKey === 'approve'
      ? 'approved'
      : actionKey === 'reject'
        ? 'rejected'
        : 'pending'
    const lifecyclePatch = buildEmployeeLifecyclePatch(existing, payload, { approval_state: approvalState })
    const record = await patchRecord('employees', id, {
      ...lifecyclePatch,
      team_assignment_status: trimString(existing?.team_assignment_status || 'pending') || 'pending',
      approved_at: approvalState === 'approved' ? nowIso() : existing?.approved_at || null,
      approved_by: approvalState === 'approved' ? (trimString(me?.uid || me?.id) || null) : existing?.approved_by || null,
      approved_by_role: approvalState === 'approved' ? (trimString(me?.role) || null) : existing?.approved_by_role || null,
      rejected_at: approvalState === 'rejected' ? nowIso() : null,
      rejected_by: approvalState === 'rejected' ? (trimString(me?.uid || me?.id) || null) : null,
      rejected_by_role: approvalState === 'rejected' ? (trimString(me?.role) || null) : null,
      rejection_reason: approvalState === 'rejected'
        ? (trimString(payload.reason || existing?.rejection_reason || '') || null)
        : null,
    })
    await syncEmployeeApprovalProfile(record, {
      approval_state: lifecyclePatch.approval_status,
      requested_status: lifecyclePatch.requested_status,
      rejection_reason: record.rejection_reason || null,
    })
    return { message: 'Employee status updated successfully.', data: record }
  }

  if (entity === 'employees' && id && action.includes('approve')) {
    const existing = await getRecord('employees', id)
    if (!existing) {
      throw buildAxiosError(config, 'Employee not found.', 404)
    }

    const lifecyclePatch = buildEmployeeLifecyclePatch(existing, payload, { approval_state: 'approved' })
    const record = await patchRecord('employees', id, {
      ...lifecyclePatch,
      team_assignment_status: trimString(existing?.team_assignment_status || 'pending') || 'pending',
      approved_at: nowIso(),
      approved_by: trimString(me?.uid || me?.id) || null,
      approved_by_role: trimString(me?.role) || null,
      rejection_reason: null,
    })
    await syncEmployeeApprovalProfile(record, {
      approval_state: lifecyclePatch.approval_status,
      requested_status: lifecyclePatch.requested_status,
      rejection_reason: null,
    })
    return { message: 'Employee approved and released to Operations.', data: record }
  }

  if (entity === 'employees' && id && action.includes('reject')) {
    const existing = await getRecord('employees', id)
    if (!existing) {
      throw buildAxiosError(config, 'Employee not found.', 404)
    }

    const reason = trimString(payload.reason || existing?.rejection_reason || '')
    const lifecyclePatch = buildEmployeeLifecyclePatch(existing, payload, { approval_state: 'rejected' })
    const record = await patchRecord('employees', id, {
      ...lifecyclePatch,
      rejected_at: nowIso(),
      rejected_by: trimString(me?.uid || me?.id) || null,
      rejected_by_role: trimString(me?.role) || null,
      rejection_reason: reason || null,
    })
    await syncEmployeeApprovalProfile(record, {
      approval_state: lifecyclePatch.approval_status,
      requested_status: lifecyclePatch.requested_status,
      rejection_reason: reason || null,
    })
    return { message: 'Employee rejected.', data: record }
  }

  if (entity === 'employees' && id && ['patch', 'put'].includes(config.method)) {
    const existing = await getRecord('employees', id)
    if (!existing) {
      throw buildAxiosError(config, 'Employee not found.', 404)
    }

    const touchesLifecycle = ['status', 'approval_status', 'requested_status', 'employment_status', 'is_approved']
      .some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key))
    const nextPayload = touchesLifecycle
      ? {
          ...payload,
          ...buildEmployeeLifecyclePatch(existing, payload),
        }
      : payload
    const record = await patchRecord('employees', id, nextPayload)
    if (touchesLifecycle) {
      await syncEmployeeApprovalProfile(record, {
        approval_state: nextPayload.approval_status || record.approval_status,
        requested_status: nextPayload.requested_status || record.requested_status,
        rejection_reason: record.rejection_reason || null,
      })
    }
    return { message: 'Employee updated successfully.', data: record }
  }

  if (entity === 'notifications' && id && (action.includes('read') || source.includes('/read'))) {
    const meProfile = await currentProfile()
    const readAt = nowIso()
    const profileNotifications = profileAccountReviewNotificationMap(meProfile || {})

    if (profileNotifications[id]) {
      const targetNotification = {
        ...profileNotifications[id],
        read_at: readAt,
      }
      profileNotifications[id] = targetNotification

      const nextProfile = {
        ...(meProfile || {}),
        account_review_notifications: profileNotifications,
      }

      const reviewAt = trimString(nextProfile.latest_account_review_at)
      if (reviewAt && trimString(targetNotification.created_at) === reviewAt) {
        nextProfile.latest_account_review_seen_at = reviewAt
      }

      if (trimString(nextProfile.uid)) {
        await setProfileRecord(nextProfile.uid, nextProfile)
        syncStoredAuthProfile(nextProfile)
        upsertStoredProfileCache(nextProfile)
      }

      return { message: 'Notification marked as read.', data: targetNotification }
    }

    const record = await patchRecord('notifications', id, { read_at: readAt })
    return { message: 'Notification marked as read.', data: record }
  }

  if (entity === 'notifications' && config.method === 'post') {
    const record = await saveRecord('notifications', {
      ...payload,
      user_id: payload.user_id || me?.uid || null,
    })
    return { message: 'Notification saved.', data: record }
  }

  if (entity === 'fleet_shifts' && ['post', 'patch', 'put'].includes(config.method)) {
    const shiftKey = trimString(payload.shift || payload.id || '').toLowerCase().includes('evening')
      ? 'evening'
      : trimString(payload.shift || payload.id || '').toLowerCase().includes('graveyard') || trimString(payload.shift || payload.id || '').toLowerCase().includes('night')
        ? 'graveyard'
        : 'morning'
    const defaults = SHIFT_DEFINITIONS.find((definition) => definition.shift === shiftKey) || SHIFT_DEFINITIONS[0]
    const normalized = normalizeFleetShiftRecord({
      ...payload,
      id: trimString(payload.id || shiftKey || defaults.shift),
      shift: shiftKey,
      truck_ids: normalizeTruckIdList(payload.truck_ids || payload.truck_ids_text || payload.trucks),
      business_id: trimString(payload.business_id || me?.business_id || ''),
    }, defaults)
    const record = await saveRecord('fleet_shifts', normalized, normalized.id)
    return { message: 'Fleet shift saved.', data: record }
  }

  if (entity === 'service_requests' && config.method === 'post') {
    const {
      ['photos[]']: rawPhotoList,
      photos: rawPhotos,
      ['urgency_photos[]']: rawUrgencyPhotos,
      urgency_photos: rawUrgencyPhotosAlt,
      ['septic_photos[]']: rawSepticPhotos,
      septic_photos: rawSepticPhotosAlt,
      ['emergency_proofs[]']: rawEmergencyProofs,
      emergency_proofs: rawEmergencyProofsAlt,
      ...requestPayload
    } = payload
    const businesses = await listBusinessDirectory()
    const normalizedBusinessId = trimString(requestPayload.business_id)
    const normalizedBusinessEmail = normalizeEmailCandidate(requestPayload.company_email || requestPayload.email)
    const business = businesses.find((row) => (
      matchesCurrentUserId(row?.id, [normalizedBusinessId])
      || matchesCurrentUserId(row?.owner_uid, [normalizedBusinessId])
      || (normalizedBusinessEmail && normalizeEmailCandidate(row?.company_email || row?.email) === normalizedBusinessEmail)
    )) || null
    if (!trimString(requestPayload.service_type)) {
      throw buildAxiosError(config, 'Service type is required.', 422, {
        errors: { service_type: ['Service type is required.'] },
      })
    }
    if (!trimString(requestPayload.property_type)) {
      throw buildAxiosError(config, 'Request category is required.', 422, {
        errors: { property_type: ['Request category is required.'] },
      })
    }
    const propertyType = normalizePropertyType(requestPayload.property_type)
    const isEmergency = parseBooleanFlag(requestPayload.is_emergency)
    const requestedDurationHours = getBookingDurationHours({
      ...requestPayload,
      property_type: propertyType || requestPayload.property_type,
    })
    const preferredDate = trimString(requestPayload.preferred_date)
    const preferredTime = normalizeTimeText(requestPayload.preferred_time || requestPayload.service_time)
    const availability = preferredDate
      ? await buildAvailabilitySnapshot({
        businessId: business?.id || normalizedBusinessId || '',
        preferredDate,
        propertyType,
        pricingUrgency: requestPayload.pricing_urgency,
        isEmergency,
        serviceDurationHours: requestedDurationHours,
        latitude: requestPayload.latitude,
        longitude: requestPayload.longitude,
      })
      : { times: [], emergency_allowed: true }

    if (!preferredDate) {
      throw buildAxiosError(config, 'Preferred date is required.', 422, {
        errors: { preferred_date: ['Preferred date is required.'] },
      })
    }
    if (!preferredTime) {
      throw buildAxiosError(config, 'Preferred time is required.', 422, {
        errors: { preferred_time: ['Preferred time is required.'] },
      })
    }
    if (propertyType === 'commercial') {
      if (!trimString(requestPayload.client_company_name)) {
        throw buildAxiosError(config, 'Commercial company name is required.', 422, {
          errors: { client_company_name: ['Commercial company name is required.'] },
        })
      }
      if (!trimString(requestPayload.purchase_order_number)) {
        throw buildAxiosError(config, 'Purchase order number is required.', 422, {
          errors: { purchase_order_number: ['Purchase order number is required.'] },
        })
      }
    }
    if (isEmergency) {
      if (!availability.emergency_allowed) {
        throw buildAxiosError(config, 'Emergency bookings are only available within 15 km of the business.', 422, {
          errors: { is_emergency: ['Emergency bookings are only available within 15 km of the business.'] },
        })
      }
      if (!toFileArray(rawEmergencyProofs || rawEmergencyProofsAlt).length) {
        throw buildAxiosError(config, 'Emergency bookings require at least one photo or video proof.', 422, {
          errors: { emergency_proofs: ['Emergency bookings require at least one photo or video proof.'] },
        })
      }
    }
    if ((availability.times || []).includes(preferredTime)) {
      throw buildAxiosError(config, 'Selected time slot is unavailable or outside the allowed lead time.', 422, {
        errors: { preferred_time: ['Selected time slot is unavailable or outside the allowed lead time.'] },
      })
    }

    const photoAttachments = await uploadArtifacts('service-request-photos', 'request-photo', toFileArray(rawPhotoList || rawPhotos))
    const urgencyAttachments = await uploadArtifacts(
      'service-request-photos',
      'urgency-photo',
      toFileArray(rawUrgencyPhotos || rawUrgencyPhotosAlt)
    )
    const septicAttachments = await uploadArtifacts(
      'service-request-photos',
      'septic-photo',
      toFileArray(rawSepticPhotos || rawSepticPhotosAlt)
    )
    const emergencyAttachments = await uploadArtifacts(
      'service-request-emergency',
      'emergency-proof',
      toFileArray(rawEmergencyProofs || rawEmergencyProofsAlt)
    )
    const serviceTrack = detectServiceTrack(requestPayload.service_type)
    const profileBusinessType = normalizeBusinessType(
      business?.business_type
      || me?.business_type
      || requestPayload.business_type
    )
    const managementMode = deriveManagementMode({
      ...(me || {}),
      ...(business || {}),
      business,
      business_type: profileBusinessType,
    }) || (profileBusinessType === 'company' ? 'hr' : 'business')

    let record = await saveRecord('service_requests', {
      ...requestPayload,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      service_duration_hours: requestedDurationHours,
      travel_buffer_hours: SERVICE_TRAVEL_BUFFER_HOURS,
      is_emergency: isEmergency,
      emergency_verified: isEmergency,
      emergency_verified_at: isEmergency ? nowIso() : null,
      emergency_surcharge_amount: toMoney(requestPayload.emergency_surcharge_amount),
      photos: photoAttachments,
      urgency_photos: urgencyAttachments,
      septic_photos: septicAttachments,
      emergency_proofs: emergencyAttachments,
      user_id: requestPayload.user_id || me?.uid || me?.id || null,
      created_by: me?.uid || me?.id || null,
      email: trimString(requestPayload.email || me?.email),
      first_name: trimString(requestPayload.first_name || me?.first_name),
      middle_initial: trimString(requestPayload.middle_initial || me?.middle_initial),
      last_name: trimString(requestPayload.last_name || me?.last_name),
      business_id: business?.id || normalizedBusinessId || null,
      business: business || null,
      assigned_business: business || null,
      business_name: trimString(requestPayload.business_name || business?.business_name || business?.company_name),
      company_name: trimString(requestPayload.company_name || business?.company_name || business?.business_name),
      client_company_name: trimString(requestPayload.client_company_name),
      purchase_order_number: trimString(requestPayload.purchase_order_number),
      business_type: profileBusinessType || requestPayload.business_type || '',
      management_mode: managementMode,
      service_track: serviceTrack,
      workflow_stage: 'csr_review',
      operations_stage: 'awaiting_csr_validation',
      procurement_stage: 'not_started',
      stock_status: 'pending_stock_check',
      status: 'pending',
      warranty_status: 'none',
      priority: isEmergency ? 'high' : (normalizeStatus(requestPayload.pricing_urgency) || 'normal'),
    }, id)
    const normalizedPaymentMethod = normalizeStatus(requestPayload.payment_method) || 'request'
    const totalAmount = toMoney(requestPayload.total_amount)
    const downpaymentAmount = toMoney(requestPayload.downpayment_amount)
    const invoiceAmount = normalizedPaymentMethod === 'downpayment' && downpaymentAmount > 0
      ? downpaymentAmount
      : totalAmount > 0
        ? totalAmount
        : null
    const invoicePhase = normalizedPaymentMethod === 'downpayment'
      ? 'downpayment'
      : normalizedPaymentMethod === 'personal'
        ? 'on_site'
        : normalizedPaymentMethod === 'full'
          ? 'full'
          : 'request'
    const invoiceStatus = normalizeStatus(requestPayload.payment_status) || 'pending'
    const invoiceUrl = `/Public/PaymentReturn?request_id=${encodeURIComponent(String(record.id || ''))}&status=${encodeURIComponent(invoiceStatus)}`
    const latestInvoice = {
      id: record.id,
      reference: `INV-${record.id}`,
      amount: invoiceAmount,
      currency: 'PHP',
      phase: invoicePhase,
      status: invoiceStatus,
      payment_channel: trimString(requestPayload.payment_channel || (normalizedPaymentMethod === 'personal' ? 'on_site' : '')) || null,
      invoice_url: invoiceUrl,
      created_at: nowIso(),
    }
    const persistedPatch = {
      invoice_url: invoiceUrl,
      latest_invoice: latestInvoice,
    }
    if (!trimString(record.payment_status)) {
      persistedPatch.payment_status = invoiceStatus
    }
    record = await patchRecord('service_requests', record.id, persistedPatch) || {
      ...record,
      ...persistedPatch,
    }

    if (isEmergency) {
      const emergencyRecipients = new Set()
      const [profiles, employeeRows] = await Promise.all([
        listProfiles().catch(() => []),
        listCollection('employees').catch(() => []),
      ])
      const businessScopeNames = new Set([
        trimString(record.business_name),
        trimString(record.company_name),
        trimString(record.client_company_name),
        trimString(business?.business_name),
        trimString(business?.company_name),
      ].filter(Boolean).map((value) => value.toLowerCase()))
      const targetBusinessId = trimString(record.business_id || business?.id || normalizedBusinessId)
      profiles.forEach((profile) => {
        const role = normalizeAdminRole(profile.role)
        const uid = trimString(profile.uid || profile.id)
        if (!uid) return
        if (role === 'admin') {
          emergencyRecipients.add(uid)
          return
        }
        const profileBusinessId = trimString(profile.business_id || profile.business?.id || profile.assigned_business?.id)
        const profileCompanyNames = [
          profile.company_name,
          profile.business_name,
          profile.business?.business_name,
          profile.business?.company_name,
          profile.assigned_business?.business_name,
          profile.assigned_business?.company_name,
        ].map((value) => trimString(value).toLowerCase()).filter(Boolean)
        if (targetBusinessId && profileBusinessId && profileBusinessId === targetBusinessId) {
          emergencyRecipients.add(uid)
          return
        }
        if (profileCompanyNames.some((value) => businessScopeNames.has(value))) {
          emergencyRecipients.add(uid)
        }
      })
      employeeRows.forEach((employee) => {
        const uid = trimString(employee.uid || employee.id || employee.user_id)
        if (!uid) return
        const employeeBusinessId = trimString(employee.business_id || employee.business?.id || employee.assigned_business?.id)
        const employeeCompanyNames = [
          employee.company_name,
          employee.business_name,
          employee.business?.business_name,
          employee.business?.company_name,
          employee.assigned_business?.business_name,
          employee.assigned_business?.company_name,
        ].map((value) => trimString(value).toLowerCase()).filter(Boolean)
        if (targetBusinessId && employeeBusinessId && employeeBusinessId === targetBusinessId) {
          emergencyRecipients.add(uid)
          return
        }
        if (employeeCompanyNames.some((value) => businessScopeNames.has(value))) {
          emergencyRecipients.add(uid)
        }
      })

      const emergencyDeadline = addHoursToDate(new Date(), 2)
      const emergencyTitle = 'Emergency booking confirmed'
      const emergencyMessage = `High-priority emergency booking from ${trimString(record.client_company_name || record.business_name || record.company_name || record.first_name || 'customer')} at ${trimString(record.address_text || requestPayload.address_text || 'the selected address')}.`
      await Promise.all([...emergencyRecipients].map((recipientId) => notifyUser(recipientId, emergencyTitle, emergencyMessage, {
        category: 'emergency',
        type: 'emergency_booking',
        priority: 'high',
        request_id: record.id,
        business_id: record.business_id || null,
        business_name: record.business_name || null,
        client_company_name: record.client_company_name || null,
        address_text: requestPayload.address_text || null,
        latitude: requestPayload.latitude ?? null,
        longitude: requestPayload.longitude ?? null,
        proof_count: emergencyAttachments.length,
        emergency_proofs: emergencyAttachments,
        emergency_proof_urls: emergencyAttachments.map((attachment) => attachment?.url).filter(Boolean),
        response_deadline_at: emergencyDeadline ? emergencyDeadline.toISOString() : null,
        countdown_minutes: 120,
        link: '/employee?section=notifications',
      })))
    }

    return {
      message: 'Request saved successfully.',
      request: record,
      invoice_url: invoiceUrl,
      latest_invoice: latestInvoice,
      data: record,
    }
  }

  if (entity === 'applications' && config.method === 'post') {
    const record = await saveRecord('applications', {
      ...payload,
      user_id: me?.uid || null,
      status: payload.status || 'pending',
    }, id)
    return { message: 'Application saved.', data: record }
  }

  if (entity === 'employees' && config.method === 'post') {
    const email = normalizeEmailCandidate(payload.email)
    if (email) {
      let existsInAuth = false
      try {
        existsInAuth = !(await checkEmailAvailability(email))
      } catch (error) {
        const message = error?.message || 'Unable to verify email availability right now. Please try again.'
        throw buildAxiosError(config, message, 422, {
          errors: { email: [message] },
        })
      }
      const existsInRecords = await isDuplicateEmail(email)
      if (existsInAuth || existsInRecords) {
        throw buildAxiosError(config, 'This email is already registered.', 422, {
          errors: { email: ['This email is already registered.'] },
        })
      }
    }
    let authUid = null
    if (email && payload.password) {
      const displayName = [payload.first_name || payload.given_name, payload.last_name]
        .filter(Boolean)
        .join(' ')
        .trim()
      try {
        const authResult = await createStaffAuthUser({
          email,
          password: payload.password,
          displayName,
        })
        authUid = authResult?.uid || null
      } catch (error) {
        const code = String(error?.code || '').toLowerCase()
        let message = error?.message || 'Unable to create Firebase account.'
        if (code.includes('email-already-in-use')) message = 'This email is already registered.'
        if (code.includes('invalid-email')) message = 'Invalid email address.'
        if (code.includes('weak-password')) message = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        throw buildAxiosError(config, message, 422, {
          errors: { email: [message] },
        })
      }
    }

    const recordId = normalizeKey(authUid || payload.id || id || push(collectionRef('employees')).key)
    const scopeBusiness = await resolveScopedBusiness(me)
    const fallbackBusiness = me?.assigned_business || me?.business || null
    const assignedBusiness = scopeBusiness || fallbackBusiness || null
    const businessId = trimString(
      assignedBusiness?.id
      || me?.business_id
      || fallbackBusiness?.id
      || ''
    )
    const employeeName = trimString(
      payload.name
      || [
        payload.first_name || payload.given_name,
        payload.middle_initial || payload.middle_name,
        payload.last_name,
      ].map((value) => trimString(value)).filter(Boolean).join(' ')
    )
    const isDepartmentAccount = shouldAutoApproveDepartmentAccount(payload)
    const lifecyclePatch = buildEmployeeLifecyclePatch({}, payload, isDepartmentAccount
      ? { approval_state: 'approved', requested_status: 'Active' }
      : {})
    const sanitizedPayload = {
      ...payload,
      id: recordId,
      uid: recordId,
      user_id: recordId,
      name: employeeName || trimString(payload.email) || 'New Employee',
      business_id: businessId || null,
      business: assignedBusiness || null,
      assigned_business: assignedBusiness || null,
      business_name: trimString(
        assignedBusiness?.business_name
        || assignedBusiness?.company_name
        || payload.business_name
        || payload.company_name
      ) || null,
      company_name: trimString(
        me?.company_name
        || assignedBusiness?.business_name
        || assignedBusiness?.company_name
        || payload.company_name
        || payload.business_name
      ) || null,
      created_by: trimString(me?.uid || me?.id) || null,
      created_by_business_id: businessId || null,
      created_by_role: trimString(me?.role) || null,
      workspace_type: trimString(payload.workspace_type || me?.workspace_type || 'company_staff') || 'company_staff',
      account_source: trimString(payload.account_source || (isDepartmentAccount ? 'hr_department_account' : 'hr_created')) || 'hr_created',
      source_trace: Array.isArray(payload.source_trace) && payload.source_trace.length
        ? payload.source_trace
        : [isDepartmentAccount ? 'HR Department Account' : 'HR Workspace'],
      ...lifecyclePatch,
      team_assignment_status: trimString(payload.team_assignment_status || (isDepartmentAccount ? 'not_applicable' : 'pending')) || 'pending',
    }
    delete sanitizedPayload.password
    delete sanitizedPayload.password_confirmation
    const record = await saveRecord('employees', sanitizedPayload, recordId)

    if (email) {
      const firstName = trimString(payload.first_name || payload.given_name)
      const middleInitial = trimString(payload.middle_initial || payload.middle_name)
      const lastName = trimString(payload.last_name)
      const profilePayload = {
        id: recordId,
        uid: recordId,
        email,
        role: trimString(payload.role) || 'employee',
        first_name: firstName,
        middle_initial: middleInitial,
        last_name: lastName,
        status: lifecyclePatch.status,
        approval_status: lifecyclePatch.approval_status,
        is_approved: lifecyclePatch.is_approved,
        requested_status: lifecyclePatch.requested_status,
        employment_status: lifecyclePatch.employment_status,
        account_source: isDepartmentAccount ? 'hr_department_account' : 'hr_created',
        source_trace: [isDepartmentAccount ? 'HR Department Account' : 'HR Workspace'],
        business_id: businessId || null,
        business: assignedBusiness || null,
        assigned_business: assignedBusiness || null,
        company_name: trimString(me?.company_name || assignedBusiness?.business_name || assignedBusiness?.company_name),
      }

      await persistAdminProfile(profilePayload, {}, true)

      try {
        await set(dbRef(realtimeDb, `email_index/${normalizeKey(email)}`), recordId)
      } catch (error) {
        if (!isFirebasePermissionError(error)) throw error
      }
    }

    return {
      message: isDepartmentAccount ? 'Department account created and approved.' : 'Employee saved.',
      data: record,
    }
  }

  if (entity === 'service_providers' && config.method === 'post') {
    const email = normalizeEmailCandidate(payload.email || payload?.user?.email)
    if (email) {
      let existsInAuth = false
      try {
        existsInAuth = !(await checkEmailAvailability(email))
      } catch (error) {
        const message = error?.message || 'Unable to verify email availability right now. Please try again.'
        throw buildAxiosError(config, message, 422, {
          errors: { email: [message] },
        })
      }
      const existsInRecords = await isDuplicateEmail(email)
      if (existsInAuth || existsInRecords) {
        throw buildAxiosError(config, 'This email is already registered.', 422, {
          errors: { email: ['This email is already registered.'] },
        })
      }
    }
    const userProfile = {
      first_name: trimString(payload.first_name || payload.user?.first_name),
      middle_initial: trimString(payload.middle_initial || payload.user?.middle_initial),
      last_name: trimString(payload.last_name || payload.user?.last_name),
      email: trimString(payload.email || payload.user?.email),
    }
    const record = await saveRecord('service_providers', {
      ...payload,
      user: {
        ...payload.user,
        ...userProfile,
      },
    }, id)
    return { message: 'Service provider saved.', data: record }
  }

  if (entity === 'inventory' && config.method === 'post') {
    const record = await saveRecord('inventory', payload, id)
    return { message: 'Inventory updated.', data: record }
  }

  if (entity === 'stock_orders' && config.method === 'post') {
    const record = await saveRecord('stock_orders', {
      ...payload,
      status: payload.status || 'ordered',
      pr_status: payload.pr_status || 'pending',
    }, id)
    return { message: 'Stock order saved.', data: record }
  }

  if ((entity === 'payrolls' || entity === 'payouts' || entity === 'refunds' || entity === 'invoices') && ['post', 'patch', 'put'].includes(config.method)) {
    const record = id
      ? await patchRecord(entity, id, payload)
      : await saveRecord(entity, payload)
    return { message: 'Record updated.', data: record }
  }

  if (source.includes('/profile') || source.includes('/user/profile')) {
    const meProfile = await currentProfile()
    if (!meProfile?.uid) throw new Error('No signed-in Firebase user found.')
    const profileUpdateTimestamp = nowIso()
    const normalizedApprovalState = trimString(meProfile.status || meProfile.approval_status).toLowerCase()
    const normalizedReviewKind = trimString(meProfile.latest_account_review_kind).toLowerCase()
    const existingReviewAt = trimString(meProfile.latest_account_review_at)
    const existingResubmittedAt = trimString(meProfile.document_resubmitted_at)
    const forceResubmission = ['1', 'true', 'yes', 'y'].includes(String(payload.force_resubmission || '').trim().toLowerCase())
    delete payload.force_resubmission
    delete payload._method
    const isUnderReview = ['rejected', 'pending'].includes(normalizedApprovalState) || !truthyValue(meProfile.is_approved)
    const existingResubmissionTime = existingResubmittedAt ? new Date(existingResubmittedAt).getTime() : NaN
    const existingReviewTime = existingReviewAt ? new Date(existingReviewAt).getTime() : NaN
    const hasPendingResubmission = Boolean(existingResubmittedAt) && (
      normalizedReviewKind === 'resubmitted'
      || !existingReviewAt
      || Number.isNaN(existingResubmissionTime)
      || Number.isNaN(existingReviewTime)
      || existingResubmissionTime >= existingReviewTime
    )
    const incomingDocumentFields = DOCUMENT_FILE_FIELDS.filter((field) => payload[field] instanceof File)

    if (
      incomingDocumentFields.length
      && !truthyValue(meProfile.is_approved)
      && ['pending', 'pending_approval'].includes(normalizedApprovalState)
      && hasPendingResubmission
    ) {
      throw new Error('Your latest resubmitted documents are already under review. Wait for admin rejection before uploading another replacement.')
    }

    let nextProfile = {
      ...meProfile,
      ...payload,
    }
    const updatedDocumentFields = []

    if (payload.profile_photo instanceof File) {
      const upload = await uploadProfileFile('profile-photos', 'profile_photo', payload.profile_photo)
      nextProfile.profile_photo = upload.path
      nextProfile.profile_photo_url = upload.url
    }

    for (const field of DOCUMENT_FILE_FIELDS) {
      if (!(payload[field] instanceof File)) continue
      const useVersionedUpload = isUnderReview || field === 'government_id'
      const upload = await uploadProfileFile('profile-files', field, payload[field], {
        versioned: useVersionedUpload,
      })
      const uploadedMeta = buildUploadedFileMeta(upload, payload[field], profileUpdateTimestamp)
      if (field === 'government_id' && isUnderReview) {
        nextProfile.government_id_resubmission = upload.path
        nextProfile.government_id_resubmission_url = upload.url
        nextProfile.government_id_resubmission_meta = uploadedMeta
      } else {
        nextProfile[field] = upload.path
        nextProfile[`${field}_url`] = upload.url
        nextProfile[`${field}_meta`] = uploadedMeta
      }

      if (field === 'government_id') {
        nextProfile.government_id_last_submitted_at = profileUpdateTimestamp
        nextProfile.government_id_last_submitted_name = trimString(uploadedMeta?.name || upload.name)
        const historyMap = normalizeDocumentHistoryMap(meProfile.government_id_history)
        const previousEntry = buildDocumentHistoryEntry({
          path: meProfile.government_id,
          url: meProfile.government_id_url,
          meta: meProfile.government_id_meta || {},
          uploadedAt: meProfile.government_id_meta?.uploaded_at || meProfile.government_id_meta?.updated_at || meProfile.government_id_last_submitted_at || meProfile.document_resubmitted_at || meProfile.created_at,
          label: meProfile.government_id_meta?.name || meProfile.government_id,
        })
        ensureHistoryEntry(historyMap, previousEntry)

        const latestEntry = buildDocumentHistoryEntry({
          path: upload.path,
          url: upload.url,
          meta: uploadedMeta,
          uploadedAt: uploadedMeta?.uploaded_at || uploadedMeta?.updated_at || profileUpdateTimestamp,
          label: upload.name,
        })
        ensureHistoryEntry(historyMap, latestEntry)
        nextProfile.government_id_history = historyMap
      }
      updatedDocumentFields.push(field)
    }

    nextProfile.updated_at = profileUpdateTimestamp

    if (updatedDocumentFields.length && (isUnderReview || forceResubmission)) {
      delete nextProfile.archived_at
      nextProfile.status = 'pending'
      nextProfile.approval_status = 'pending'
      nextProfile.is_approved = false
      nextProfile.has_viewed = false
      nextProfile.rejection_reason = null
      nextProfile.rejection_checklist = []
      nextProfile.document_resubmitted_at = profileUpdateTimestamp
      nextProfile.latest_account_review_title = 'Documents resubmitted'
      nextProfile.latest_account_review_message = `Your updated documents were submitted for review: ${updatedDocumentFields.map(humanizeChecklistValue).join(', ')}.`
      nextProfile.latest_account_review_kind = 'resubmitted'
      nextProfile.latest_account_review_at = profileUpdateTimestamp
      nextProfile.latest_account_review_seen_at = null

      await createAccountReviewNotification(nextProfile, {
        title: 'Documents resubmitted',
        message: nextProfile.latest_account_review_message,
        checklist: updatedDocumentFields,
      })

      nextProfile = appendProfileAccountReviewNotification(nextProfile, {
        title: 'Documents resubmitted',
        message: nextProfile.latest_account_review_message,
        checklist: updatedDocumentFields,
        created_at: nextProfile.latest_account_review_at,
        read_at: null,
      }).profile
    }

    await setProfileRecord(meProfile.uid, nextProfile)
    if (updatedDocumentFields.length) {
      await saveRecord('resubmissions', {
        id: meProfile.uid,
        user_id: meProfile.uid,
        email: meProfile.email || '',
        resubmitted_at: profileUpdateTimestamp,
        checklist: updatedDocumentFields,
        status: 'pending',
      }, meProfile.uid)
      await saveRecord('admin_review_queue', buildAdminReviewQueueRecord(nextProfile, {
        status: 'pending',
        approval_status: 'pending',
        is_approved: false,
        has_viewed: false,
      }), meProfile.uid)
    }
    syncStoredAuthProfile(nextProfile)
    upsertStoredProfileCache(nextProfile)
    return nextProfile
  }

  if (source.includes('/review-pr') || source.includes('/in-transit') || source.includes('/complete-direct') || source.includes('/mark-received/') || source.includes('/mark-job-ready/') || source.includes('/approve') || source.includes('/reject') || source.includes('/toggle-approval') || source.includes('/mark-viewed') || source.includes('/wrong-email-delete') || source.includes('/forward')) {
    return { message: 'Action completed successfully.' }
  }

  if (['put', 'patch'].includes(config.method) && entity && id) {
    const record = await patchRecord(entity, id, payload)
    return { message: 'Record updated.', data: record }
  }

  if (config.method === 'delete' && entity && id) {
    await removeRecord(entity, id)
    return { message: 'Record deleted.' }
  }

  if (config.method === 'post' && entity) {
    const record = await saveRecord(entity, payload, id)
    return { message: 'Saved to Firebase.', data: record }
  }

  return { message: 'Saved to Firebase.' }
}

export const canHandleViaFirebase = (config = {}) => {
  const url = String(config?.url || '')
  if (!firebaseConfigReady) return false
  if (!url || isExternalUrl(url)) return false
  return url.startsWith('/')
}

export const firebaseApiAdapter = async (config) => {
  if (!firebaseConfigReady) {
    throw buildAxiosError(config, 'Firebase is not configured. Add your Firebase web config to public/runtime-config.js or define the Vite Firebase variables before building.', 503)
  }

  try {
    const info = getPathInfo(config.url)
    const method = trimString(config.method || 'get').toLowerCase()
    const data = method === 'get'
      ? await handleGet(config, info)
      : await handleWrite({ ...config, method }, info)

    return buildAxiosResponse(config, clone(data), 200, 'OK')
  } catch (error) {
    if (error?.response) {
      throw error
    }
    throw buildAxiosError(config, error instanceof Error ? error.message : 'Firebase API request failed.', 422)
  }
}
