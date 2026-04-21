<script setup>
import BrandLockup from '@/Components/BrandLockup.vue'
import TextInput from '@/Components/TextInput.vue'
import PrimaryButton from '@/Components/PrimaryButton.vue'
import SectionTitle from '@/Components/SectionTitle.vue'
import { Head, useForm } from '@inertiajs/vue3'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Swal from '@/lib/sweetalert-toast-shim'
import {
  checkContactAvailability as checkFirebaseContactAvailability,
  checkEmailAvailability as checkFirebaseEmailAvailability,
  getFriendlyFirebaseErrorMessage,
  registerWithFirebase,
  sendRegistrationOtp,
  verifyRegistrationOtpCode,
} from '@/lib/firebase-auth'

/* ================= STATE ================= */
const showModal = ref(false)
const otpModal = ref(false)
const step = ref(1)
const reviewChecked = ref(false)
const passwordStrength = ref('')
const locationReady = ref(false)
const locationEnabled = ref(true)
const locationRefreshing = ref(false)
const DRAFT_STORAGE_KEY = 'register_form_draft_v1'
const MAX_EMAIL_LENGTH = 255
const closeSwalIfOpen = () => {
  try {
    Swal.close()
  } catch {
    // Ignore close errors so loading cleanup never blocks the OTP flow.
  }
}
const closeOtpModal = () => {
  otpModal.value = false
  closeSwalIfOpen()
}
const FILE_FIELDS = [
  'government_id',
  'bir_registration',
  'dti_registration',
  'mayor_permit',
  'business_permit',
  'sanitary_permit',
]
const PERSISTABLE_FIELDS = [
  'role',
  'first_name',
  'middle_initial',
  'last_name',
  'email',
  'contact_number',
  'password',
  'password_confirmation',
  'business_name',
  'business_name_1',
  'business_owner',
  'business_owner_first',
  'business_owner_middle',
  'business_owner_last',
  'address',
  'address_unit',
  'address_street',
  'address_barangay',
  'address_city',
  'address_province',
  'address_postal',
  'category',
  'business_type',
  'business_ownership',
  'years_in_operation',
  'operating_hours',
  'latitude',
  'longitude',
]

/* ================= FORM ================= */
const form = useForm({
  role: '',
  first_name: '',
  middle_initial: '',
  last_name: '',
  email: '',
  contact_number: '',
  password: '',
  password_confirmation: '',
  government_id: null,
  business_name: '',
  business_name_1: '',
  business_owner: '',
  business_owner_first: '',
  business_owner_middle: '',
  business_owner_last: '',
  address: '',
  address_unit: '',
  address_street: '',
  address_barangay: '',
  address_city: '',
  address_province: '',
  address_postal: '',
  category: '',
  business_type: '',
  business_ownership: '',
  years_in_operation: '',
  operating_hours: '',
  bir_registration: null,
  dti_registration: null,
  mayor_permit: null,
  business_permit: null,
  sanitary_permit: null,
  latitude: '',
  longitude: '',
})

/* ================= OTP STATE ================= */
const otpSent = ref(false)
const otpVerified = ref(false)
const otpCode = ref('')
const emailForOtp = ref('')
const contactForOtp = ref('')
const availableIdentityEmail = ref('')
const availableIdentityContact = ref('')
const sendingOtp = ref(false)
const verifyingOtp = ref(false)
const resendCooldown = ref(0)
let resendTimer = null
const emailIsAvailable = ref(false)

/* ================= PASSWORD VISIBILITY ================= */
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const contactAlerted = ref(false)
const contactLocal = ref('')
const nextProcessing = ref(false)
const nextLoadingMode = ref('')
const submitProcessing = ref(false)
const pageLoading = ref(false)
const pageLoadingText = ref('')
const modalPreparing = ref(false)
const modalPreparingText = ref('')
const registrationSubmitState = ref('idle')
const registrationStatusText = ref('')
const otpStatusState = ref('idle')
const otpStatusText = ref('')
const NEXT_STEP_DELAY_MS = 0
const lampPullOffset = ref(0)
const lampPullAnchorY = ref(0)
const isLampPulling = ref(false)
const lampPullThreshold = 18
const lampPullMax = 88
const lampPullStartedAt = ref(0)
const isLampReadyToSwitch = computed(() => lampPullOffset.value >= lampPullThreshold)
const lampHintText = computed(() => (
  isLampReadyToSwitch.value
    ? 'Release to open Login'
    : 'Pull cord to open Login'
))
const LAMP_REVEAL_KEY = 'auth_lamp_reveal'
const showLampReveal = ref(false)
const router = useRouter()

const goToRoute = (path) => {
  const target = String(path || '/')
  return router.push(target).catch(() => {
    window.location.assign(target)
  })
}

/* ================= FILE PREVIEWS ================= */
const previewUrls = ref({
  government_id: '',
  bir_registration: '',
  dti_registration: '',
  mayor_permit: '',
  business_permit: '',
  sanitary_permit: '',
})

const isImage = (file) => !!file && !!file.type && file.type.startsWith('image/')

const setPreview = (key, file) => {
  if (previewUrls.value[key]) URL.revokeObjectURL(previewUrls.value[key])
  previewUrls.value[key] = file ? URL.createObjectURL(file) : ''
}

/* ================= CATEGORY & TYPE ================= */
const categories = [
  { label: 'Plumbing', value: 'plumbing', desc: 'Installation and repair of pipes, faucets, toilets, and water systems.' },
  { label: 'Siphoning', value: 'siphoning', desc: 'Septic tank cleaning, drainage, and waste removal services.' },
  { label: 'Plumbing & Siphoning', value: 'both', desc: 'Services include both plumbing and siphoning tasks.' },
]

const businessTypes = [
  { label: 'Individual', value: 'Individual' },
  { label: 'Company', value: 'Company' },
]

/* ================= COMPUTED ================= */
const totalSteps = computed(() => form.role==='business'?7:5)
const modalTitle = computed(() => form.role==='business'?'Business Registration':'User Registration')
const nextStepTarget = computed(() => Math.min(step.value + 1, totalSteps.value))
const nextActionLabel = computed(() => {
  if (!nextProcessing.value) return 'Next'
  if (nextLoadingMode.value === 'otp') {
    return form.role === 'business'
      ? 'Sending OTP for business account...'
      : 'Sending OTP for user account...'
  }
  if (nextLoadingMode.value === 'step') {
    return `Loading step ${nextStepTarget.value} of ${totalSteps.value}...`
  }
  return 'Loading...'
})
const otpModalTitle = computed(() => (sendingOtp.value && !otpSent.value ? 'Sending OTP Code' : 'Enter OTP Code'))
const resendOtpLabel = computed(() => {
  if (sendingOtp.value) return 'Sending OTP...'
  if (resendCooldown.value > 0) return `Resend OTP in ${resendCooldown.value}s`
  return 'Resend OTP'
})
const verifyOtpLabel = computed(() => (verifyingOtp.value ? 'Verifying OTP...' : 'Verify OTP'))
const submitButtonLabel = computed(() => (
  (form.processing || submitProcessing.value)
    ? (form.role === 'business' ? 'Submitting business registration...' : 'Submitting user registration...')
    : 'Submit'
))
const isRegistrationSubmitting = computed(() => registrationSubmitState.value === 'submitting')
const showWorkingOverlay = computed(() => (
  pageLoading.value
  || modalPreparing.value
  || nextProcessing.value
  || isRegistrationSubmitting.value
  || verifyingOtp.value
  || (sendingOtp.value && !otpModal.value)
))
const workingOverlayTitle = computed(() => {
  if (pageLoading.value) return 'Opening Page'
  if (modalPreparing.value) return 'Preparing Registration'
  if (isRegistrationSubmitting.value) {
    return form.role === 'business' ? 'Submitting Business Registration' : 'Submitting Registration'
  }
  if (verifyingOtp.value) return 'Verifying OTP'
  if (sendingOtp.value && !otpModal.value) return 'Sending OTP'
  if (nextProcessing.value) {
    return nextLoadingMode.value === 'otp' ? 'Preparing Verification' : 'Loading Next Step'
  }
  return 'Loading'
})
const workingOverlayText = computed(() => {
  if (pageLoading.value) return pageLoadingText.value
  if (modalPreparing.value) return modalPreparingText.value
  if (isRegistrationSubmitting.value) return registrationStatusText.value || submitButtonLabel.value
  if (verifyingOtp.value) return otpStatusText.value || 'Please wait while we verify your code.'
  if (sendingOtp.value && !otpModal.value) return otpStatusText.value || otpToastLoadingLabel.value
  if (nextProcessing.value) {
    return nextLoadingMode.value === 'otp'
      ? 'Checking your details and preparing verification.'
      : nextActionLabel.value
  }
  return 'Please wait...'
})
const hasRegistrationStatus = computed(() => (
  registrationSubmitState.value !== 'idle'
  && registrationStatusText.value.trim().length > 0
  && !isDuplicateIdentityMessage(registrationStatusText.value)
))
const registrationStatusClass = computed(() => {
  if (registrationSubmitState.value === 'success') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }

  if (registrationSubmitState.value === 'error') {
    return 'border-rose-300 bg-rose-50 text-rose-700'
  }

  return 'border-sky-300 bg-sky-50 text-sky-700'
})
const hasOtpStatus = computed(() => (
  otpStatusState.value !== 'idle' && otpStatusText.value.trim().length > 0
))
const otpStatusClass = computed(() => {
  if (otpStatusState.value === 'success') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }

  if (otpStatusState.value === 'error') {
    return 'border-rose-300 bg-rose-50 text-rose-700'
  }

  return 'border-sky-300 bg-sky-50 text-sky-700'
})
const otpToastLoadingLabel = computed(() => (
  form.role === 'business'
    ? 'Sending OTP for your business account...'
    : 'Sending OTP for your user account...'
))
const mapUrl = computed(() => {
  const lat = form.latitude||14.33
  const lng = form.longitude||120.95
  return `https://www.google.com/maps?q=${lat},${lng}&z=19&output=embed`
})
const locationStatusLabel = computed(() => {
  if (locationRefreshing.value) return 'Fetching current location...'
  if (!locationEnabled.value) return 'Location access is blocked'
  if (form.latitude && form.longitude) return 'Location captured'
  return 'Location not set'
})

const businessOwnerFull = computed(() => {
  const first = (form.business_owner_first || '').trim()
  const middle = (form.business_owner_middle || '').trim()
  const last = (form.business_owner_last || '').trim()
  return [first, middle, last].filter(Boolean).join(' ')
})

const businessNameFull = computed(() => {
  const a = (form.business_name_1 || '').trim()
  return [a].filter(Boolean).join(' ')
})

const addressFull = computed(() => {
  const parts = [
    form.address_unit,
    form.address_street,
    form.address_barangay,
    form.address_city,
    form.address_province,
    form.address_postal,
  ].map(v => (v || '').trim()).filter(Boolean)
  return parts.join(', ')
})

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
const isStrongPassword = computed(() => STRONG_PASSWORD_REGEX.test(String(form.password || '')))



/* ================= NAME FIELD ERRORS ================= */
const nameErrors = (val) => {
  const v = (val || '').trim()
  const hasNumber = /[0-9]/.test(v)
  const hasSpecial = /[^A-Za-z0-9\s]/.test(v)
  return { number: hasNumber, special: hasSpecial }
}

const saveDraft = () => {
  if (typeof window === 'undefined') return
  const draft = {
    step: step.value,
    reviewChecked: reviewChecked.value,
    otpVerified: otpVerified.value,
    otpSent: otpSent.value,
    emailForOtp: emailForOtp.value,
    contactForOtp: contactForOtp.value,
    availableIdentityEmail: availableIdentityEmail.value,
    availableIdentityContact: availableIdentityContact.value,
    contactLocal: contactLocal.value,
    form: PERSISTABLE_FIELDS.reduce((acc, key) => {
      acc[key] = form[key]
      return acc
    }, {}),
    selectedFiles: FILE_FIELDS.reduce((acc, key) => {
      acc[key] = !!form[key]
      return acc
    }, {}),
  }
  window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

const getSavedDraft = () => {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const restoreDraftForRole = (roleType) => {
  if (typeof window === 'undefined') return false
  const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.form || parsed.form.role !== roleType) return false
    PERSISTABLE_FIELDS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(parsed.form, key)) {
        form[key] = parsed.form[key]
      }
    })
    step.value = Math.min(Math.max(Number(parsed.step) || 1, 1), totalSteps.value)
    reviewChecked.value = !!parsed.reviewChecked
    otpVerified.value = !!parsed.otpVerified
    otpSent.value = !!parsed.otpSent
    emailForOtp.value = normalizeEmailInput(parsed.emailForOtp)
    contactForOtp.value = String(parsed.contactForOtp || '').trim()
    availableIdentityEmail.value = normalizeEmailInput(parsed.availableIdentityEmail)
    availableIdentityContact.value = String(parsed.availableIdentityContact || '').trim()
    contactLocal.value = parsed.contactLocal || contactLocal.value

    const currentEmail = getNormalizedFormEmail()
    const currentContact = String(form.contact_number || '').trim()
    const hasRestoredOtpIdentity = (
      otpVerified.value
      && emailForOtp.value.length > 0
      && contactForOtp.value.length > 0
      && currentEmail === emailForOtp.value
      && currentContact === contactForOtp.value
    )
    const hasRestoredAvailableIdentity = (
      currentEmail.length > 0
      && currentContact.length > 0
      && currentEmail === availableIdentityEmail.value
      && currentContact === availableIdentityContact.value
    )

    if (step.value > IDENTITY_STEP && !hasRestoredOtpIdentity) {
      step.value = IDENTITY_STEP
      otpVerified.value = false
      otpSent.value = false
      emailForOtp.value = ''
      contactForOtp.value = ''
      clearVerifiedIdentityAvailability()
    } else if (!hasRestoredAvailableIdentity) {
      clearVerifiedIdentityAvailability()
    }

    return true
  } catch {
    return false
  }
}

const clearDraft = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(DRAFT_STORAGE_KEY)
}

const scrollModalToTop = async () => {
  await nextTick()
  const modalScroller = document?.querySelector('[data-register-scroll]')
  modalScroller?.scrollTo?.({ top: 0, behavior: 'auto' })
}

/* ================= METHODS ================= */
const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if(!navigator.geolocation){
      return reject(new Error('Geolocation not supported'))
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })

const ensureLocationReady = async () => {
  try {
    const pos = await getCurrentLocation()
    form.latitude = pos.coords.latitude.toFixed(6)
    form.longitude = pos.coords.longitude.toFixed(6)
    locationEnabled.value = true
    locationReady.value = true
    return true
  } catch {
    locationEnabled.value = false
    locationReady.value = false
    Swal.fire('Location Required', 'Please turn on location services and allow browser location access before registering.', 'warning')
    return false
  }
}

const openModal = async (roleType) => {
  if (modalPreparing.value || pageLoading.value) return
  form.role = roleType
  modalPreparing.value = true
  modalPreparingText.value = roleType === 'business'
    ? 'Preparing your business registration flow...'
    : 'Preparing your user registration flow...'
  try {
    if(!restoreDraftForRole(roleType)){
      step.value = 1
    }
    showModal.value = true
    await scrollModalToTop()

    await ensureLocationReady()
  } finally {
    modalPreparing.value = false
    modalPreparingText.value = ''
  }
}

const closeModal = () => {
  closeSwalIfOpen()
  showModal.value=false
  otpModal.value=false
  step.value=1
  reviewChecked.value=false
  otpSent.value=false
  otpVerified.value=false
  otpCode.value=''
  emailForOtp.value=''
  contactForOtp.value=''
  clearVerifiedIdentityAvailability()
  resendCooldown.value = 0
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  passwordStrength.value=''
  submitProcessing.value=false
  registrationSubmitState.value='idle'
  registrationStatusText.value=''
  contactLocal.value=''
  form.reset()
  form.clearErrors()
  clearDraft()
}

const getLampPointerY = (event) => (typeof event?.clientY === 'number' ? event.clientY : null)

const startLampPull = (event) => {
  const pointerY = getLampPointerY(event)
  if (pointerY === null) return
  isLampPulling.value = true
  lampPullStartedAt.value = Date.now()
  lampPullAnchorY.value = pointerY - lampPullOffset.value
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

const moveLampPull = (event) => {
  if (!isLampPulling.value) return
  const pointerY = getLampPointerY(event)
  if (pointerY === null) return
  const delta = pointerY - lampPullAnchorY.value
  lampPullOffset.value = Math.max(0, Math.min(lampPullMax, delta))
}

const markLampReveal = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(LAMP_REVEAL_KEY, '1')
}

const consumeLampReveal = () => {
  if (typeof window === 'undefined') return false
  const shouldReveal = window.sessionStorage.getItem(LAMP_REVEAL_KEY) === '1'
  if (shouldReveal) {
    window.sessionStorage.removeItem(LAMP_REVEAL_KEY)
  }
  return shouldReveal
}

const navigateWithLoading = (path, label, { reveal = false } = {}) => {
  if (typeof window === 'undefined' || pageLoading.value) return
  if (reveal) {
    markLampReveal()
  }
  pageLoading.value = true
  pageLoadingText.value = label
  window.setTimeout(() => {
    void goToRoute(path)
  }, 180)
}

const goHome = () => navigateWithLoading('/', 'Returning to landing page...')
const navigateToLogin = (options = {}) => {
  navigateWithLoading('/login', 'Opening login...', options)
}

const endLampPull = (event) => {
  if (!isLampPulling.value) return
  isLampPulling.value = false
  event?.currentTarget?.releasePointerCapture?.(event.pointerId)
  const elapsed = Date.now() - lampPullStartedAt.value
  const shouldSwitch = lampPullOffset.value >= lampPullThreshold || elapsed <= 220
  lampPullOffset.value = 0
  if (shouldSwitch) {
    navigateToLogin({ reveal: true })
  }
}

const showOtpLoadingToast = () => {
  return null
}

const dismissOtpLoadingToast = (toastId) => {
  if (!toastId) return
  const toast = window.__appLoadingToast
  if (!toast?.dismiss) return
  toast.dismiss(toastId)
}

const showOtpStatusToast = (type, message, timeout = 2200) => {
  const toast = window.__appLoadingToast
  const handler = toast?.[type]
  if (typeof handler !== 'function') return null
  return handler(message, { timeout })
}

const showBlockingLoadingAlert = (title, text) => {
  Swal.fire({
    title,
    text,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

const setOtpStatus = (state, text = '') => {
  otpStatusState.value = state
  otpStatusText.value = String(text || '').trim()
}

const hasFieldError = (field) => Boolean(form.errors?.[field])
const fieldCardClass = (field) => (
  hasFieldError(field)
    ? 'rounded-xl border border-rose-300 bg-rose-50/80 p-3 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]'
    : ''
)
const textInputClass = (field) => (
  hasFieldError(field)
    ? '!border-rose-400 !bg-rose-50/70 !text-rose-900 focus:!border-rose-500 focus:!ring-rose-200'
    : ''
)
const inlineInputClass = (field) => (
  hasFieldError(field)
    ? 'border-rose-400 bg-rose-50/70 text-rose-900'
    : 'border-slate-300 bg-white'
)
const IDENTITY_STEP = 2
const INVALID_EMAIL_MESSAGE = 'Please enter a valid email address.'
const DUPLICATE_EMAIL_MESSAGE = 'This email is already taken.'
const LEGACY_DUPLICATE_EMAIL_MESSAGE = 'This email is already registered.'
const DUPLICATE_CONTACT_MESSAGE = 'Existing contact number detected. This mobile number is already registered.'
const EMAIL_AVAILABLE_MESSAGE = 'This email is available.'
const RESERVED_EMAIL_DOMAINS = new Set(['localhost'])
const RESERVED_EMAIL_TLDS = new Set(['example', 'invalid', 'local', 'localhost', 'test'])
const normalizeEmailInput = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase()
const getEmailDomain = (value) => normalizeEmailInput(value).split('@')[1] || ''
const hasPublicEmailDomain = (value) => {
  const domain = getEmailDomain(value)
  if (!domain || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false
  }
  if (RESERVED_EMAIL_DOMAINS.has(domain)) {
    return false
  }

  const labels = domain.split('.').filter(Boolean)
  if (labels.length < 2) {
    return false
  }

  const tld = labels[labels.length - 1]
  return tld.length >= 2 && !RESERVED_EMAIL_TLDS.has(tld)
}
const isValidRegistrationEmail = (value) => {
  const normalized = normalizeEmailInput(value)
  return EMAIL_REGEX.test(normalized) && hasPublicEmailDomain(normalized)
}
const getNormalizedFormEmail = () => normalizeEmailInput(form.email)
const getNormalizedFormContact = () => String(form.contact_number || '').trim()
const clearVerifiedIdentityAvailability = () => {
  availableIdentityEmail.value = ''
  availableIdentityContact.value = ''
  emailIsAvailable.value = false
}
const hasConfirmedCurrentIdentityAvailability = () => {
  const currentEmail = getNormalizedFormEmail()
  const currentContact = getNormalizedFormContact()
  return Boolean(
    currentEmail
    && currentContact
    && currentEmail === normalizeEmailInput(availableIdentityEmail.value)
    && currentContact === String(availableIdentityContact.value || '').trim()
  )
}
const isCurrentOtpIdentityVerified = () => {
  if (!otpVerified.value) return false

  const currentEmail = getNormalizedFormEmail()
  const currentContact = getNormalizedFormContact()

  if (!currentEmail || !currentContact) return false

  return (
    currentEmail === normalizeEmailInput(emailForOtp.value)
    && currentContact === String(contactForOtp.value || '').trim()
  )
}
const returnToIdentityStep = async () => {
  if (step.value !== IDENTITY_STEP) {
    step.value = IDENTITY_STEP
  }
  await scrollModalToTop()
}
const isDuplicateIdentityMessage = (message) => {
  const normalized = String(message || '').trim()
  return (
    normalized === DUPLICATE_EMAIL_MESSAGE
    || normalized === LEGACY_DUPLICATE_EMAIL_MESSAGE
    || normalized === DUPLICATE_CONTACT_MESSAGE
  )
}
const isDuplicateEmailMessage = (message) => {
  const normalized = String(message || '').trim()
  return normalized === DUPLICATE_EMAIL_MESSAGE || normalized === LEGACY_DUPLICATE_EMAIL_MESSAGE
}
const getFilePreviewUrl = (field) => previewUrls.value?.[field] || ''
const getFilePreviewAlt = (field, fallback = 'Preview') => {
  const file = form[field]
  return file?.name || fallback
}

const waitForNextDelay = (ms = NEXT_STEP_DELAY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const nextStep = async () => {
  if (nextProcessing.value) return
  if (!validateStep(step.value)) return

  const isOtpStep =
    (form.role === 'user' && step.value === 2) ||
    (form.role === 'business' && step.value === 2)

  nextProcessing.value = true
  nextLoadingMode.value = isOtpStep && !otpVerified.value ? 'otp' : 'step'
  try {
    if (!isOtpStep) {
      if (NEXT_STEP_DELAY_MS > 0) {
        await waitForNextDelay()
      }
    }

    if (isOtpStep && !otpVerified.value) {
      const identityAvailable = await validateIdentityAvailability()
      if (!identityAvailable) return

      otpCode.value = ''
      otpSent.value = false
      setOtpStatus('info', 'Sending OTP automatically. Please wait...')
      try {
        const sent = await sendOtp()
        if (!sent) {
          return
        }
        otpModal.value = true
        showOtpStatusToast('success', 'OTP sent. Check your email for the code.', 2400)
      } finally {
        dismissOtpLoadingToast(null)
      }
      return
    }

    if (isOtpStep && otpVerified.value && !hasConfirmedCurrentIdentityAvailability()) {
      const identityAvailable = await confirmIdentityAvailabilityAfterOtp({ announceAvailable: false })
      if (!identityAvailable) return
    }

    step.value += 1
  } finally {
    nextProcessing.value = false
    nextLoadingMode.value = ''
  }
}
const prevStep = ()=> step.value>1 && step.value--

/* ================= OTP ================= */
const checkEmailAvailability = async () => {
  const email = getNormalizedFormEmail()
  if (String(form.email || '') !== email) {
    form.email = email
  }
  if (!email) {
    form.setError('email', 'Email address is required.')
    Swal.fire('Oops', 'Please enter email first', 'warning')
    emailIsAvailable.value = false
    return false
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    const tooLongMessage = `Email address must not be greater than ${MAX_EMAIL_LENGTH} characters.`
    form.setError('email', tooLongMessage)
    Swal.fire('Email Too Long', tooLongMessage, 'error')
    emailIsAvailable.value = false
    return false
  }

  if (!isValidRegistrationEmail(email)) {
    form.setError('email', INVALID_EMAIL_MESSAGE)
    emailIsAvailable.value = false
    return false
  }

  try {
    const available = await checkFirebaseEmailAvailability(email)
    if (!available) {
      const message = DUPLICATE_EMAIL_MESSAGE
      form.setError('email', String(message))
      setOtpStatus('error', String(message))
      Swal.fire('Existing Email', String(message), 'error')
      emailIsAvailable.value = false
      return false
    }
    form.clearErrors('email')
    setOtpStatus('idle', '')
    emailIsAvailable.value = true
    return true
  } catch (err) {
    const unavailableMessage = err?.response?.data?.message
    const emailErr = err?.response?.data?.errors?.email?.[0]
    const msg = unavailableMessage || emailErr || (err instanceof Error ? err.message : 'Unable to validate email right now.')
    form.setError('email', String(msg))
    setOtpStatus('error', String(msg))
    const title = /unable to verify email availability/i.test(String(msg))
      ? 'Email Verification Unavailable'
      : 'Email Check Failed'
    Swal.fire(title, String(msg), 'error')
    emailIsAvailable.value = false
    return false
  }
}

const checkContactAvailability = async () => {
  const contactNumber = String(form.contact_number || '').trim()
  if (!contactNumber) {
    form.setError('contact_number', 'Contact number is required.')
    return false
  }

  try {
    const available = await checkFirebaseContactAvailability(contactNumber)
    if (!available) {
      form.setError('contact_number', DUPLICATE_CONTACT_MESSAGE)
      setOtpStatus('error', DUPLICATE_CONTACT_MESSAGE)
      Swal.fire('Existing Contact Number', DUPLICATE_CONTACT_MESSAGE, 'error')
      return false
    }
    form.clearErrors('contact_number')
    return true
  } catch (err) {
    const message = err?.response?.data?.message || (err instanceof Error ? err.message : 'Unable to validate contact number right now.')
    form.setError('contact_number', String(message))
    setOtpStatus('error', String(message))
    Swal.fire('Contact Check Failed', String(message), 'error')
    return false
  }
}

const validateIdentityAvailability = async () => {
  const emailAvailable = await checkEmailAvailability()
  if (!emailAvailable) return false

  const contactAvailable = await checkContactAvailability()
  if (!contactAvailable) return false

  setOtpStatus('idle', '')
  return true
}
const confirmIdentityAvailabilityAfterOtp = async ({ announceAvailable = true } = {}) => {
  if (!isCurrentOtpIdentityVerified()) {
    return false
  }

  if (hasConfirmedCurrentIdentityAvailability()) {
    if (announceAvailable) {
      setOtpStatus('success', EMAIL_AVAILABLE_MESSAGE)
      showOtpStatusToast('success', EMAIL_AVAILABLE_MESSAGE, 2200)
    }
    return true
  }

  setOtpStatus('info', 'Checking email and contact number in Firebase...')
  form.clearErrors('email', 'contact_number')

  const identityAvailable = await validateIdentityAvailability()
  if (!identityAvailable) {
    clearVerifiedIdentityAvailability()
    otpModal.value = false
    await returnToIdentityStep()
    return false
  }

  availableIdentityEmail.value = getNormalizedFormEmail()
  availableIdentityContact.value = getNormalizedFormContact()
  emailIsAvailable.value = true
  setOtpStatus('success', EMAIL_AVAILABLE_MESSAGE)
  if (announceAvailable) {
    showOtpStatusToast('success', EMAIL_AVAILABLE_MESSAGE, 2200)
  }
  return true
}

const refreshLocation = async () => {
  if (locationRefreshing.value) return
  locationRefreshing.value = true
  const ok = await ensureLocationReady()
  locationRefreshing.value = false
  if (ok) {
    Swal.fire('Location Updated', 'Current location captured successfully.', 'success')
  }
}

const sendOtp = async () => {
  closeSwalIfOpen()
  form.clearErrors('email', 'contact_number')
  setOtpStatus('idle', '')
  const normalizedEmail = getNormalizedFormEmail()
  if (String(form.email || '') !== normalizedEmail) {
    form.email = normalizedEmail
  }
  if(!form.email){
    form.setError('email', 'Email address is required.')
    Swal.fire('Oops','Please enter email first','warning')
    return false
  }
  if(!form.contact_number){
    form.setError('contact_number', 'Contact number is required.')
    Swal.fire('Oops','Please enter contact number','warning')
    return false
  }
  if (!isValidRegistrationEmail(normalizedEmail)) {
    form.setError('email', INVALID_EMAIL_MESSAGE)
    Swal.fire('Invalid Email', INVALID_EMAIL_MESSAGE, 'warning')
    return false
  }
  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    form.setError('email', `Email address must not be greater than ${MAX_EMAIL_LENGTH} characters.`)
    Swal.fire('Email Too Long', `Email address must not be greater than ${MAX_EMAIL_LENGTH} characters.`, 'error')
    return false
  }

  sendingOtp.value=true
  otpSent.value = false
  emailForOtp.value = normalizedEmail
  try{
    await sendRegistrationOtp({
      email: emailForOtp.value,
      role: form.role,
      contactNumber: form.contact_number,
    })
    otpSent.value=true
    contactForOtp.value = String(form.contact_number || '').trim()
    setOtpStatus('success', 'OTP sent. Check your email for the 6-digit code.')
    startResendCooldown(60)
    return true
  }catch(err){
    const timeoutError = err?.code === 'ECONNABORTED'
      || String(err?.message || '').toLowerCase().includes('timeout')
    const emailErr = err?.response?.data?.errors?.email?.[0]
    const contactErr = err?.response?.data?.errors?.contact_number?.[0]
    const msg = getFriendlyFirebaseErrorMessage(
      err,
      err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to send OTP. Try again.'),
      'otp',
    )
    const duplicateEmail = /email.+(taken|exists|already|registered)/i.test(String(emailErr || '')) || /email.+(taken|exists|already|registered)/i.test(msg)
    const duplicateContact = /contact.+(taken|exists|already|registered)/i.test(String(contactErr || '')) || /contact.+(taken|exists|already|registered)/i.test(msg)
    const invalidEmailFormat = /valid email|email.+(invalid|format)/i.test(String(emailErr || '')) || /valid email|email.+(invalid|format)/i.test(msg)

    if (timeoutError) {
      const timeoutMessage = 'OTP sending is taking too long right now. Please tap Resend OTP.'
      form.clearErrors('email')
      setOtpStatus('error', timeoutMessage)
      showOtpStatusToast('error', timeoutMessage, 3000)
      Swal.fire('OTP Timeout', timeoutMessage, 'error')
      otpSent.value = false
      return false
    }

    if (duplicateEmail) {
      const duplicateEmailMessage = msg || emailErr || DUPLICATE_EMAIL_MESSAGE
      form.setError('email', duplicateEmailMessage)
      setOtpStatus('error', duplicateEmailMessage)
      showOtpStatusToast('error', duplicateEmailMessage, 3200)
      Swal.fire('Existing Email', duplicateEmailMessage, 'error')
      otpModal.value = false
      otpSent.value = false
      return false
    }

    if (duplicateContact) {
      const duplicateContactMessage = contactErr || 'Existing contact number detected. This mobile number is already registered.'
      form.setError('contact_number', duplicateContactMessage)
      setOtpStatus('error', duplicateContactMessage)
      showOtpStatusToast('error', duplicateContactMessage, 3200)
      Swal.fire('Existing Contact Number', duplicateContactMessage, 'error')
      otpModal.value = false
      otpSent.value = false
      return false
    }

    if (contactErr) {
      form.setError('contact_number', contactErr)
      setOtpStatus('error', contactErr)
      showOtpStatusToast('error', contactErr, 3000)
      Swal.fire('Invalid Contact Number', contactErr, 'error')
      otpModal.value = false
      otpSent.value = false
      return false
    }

    if (invalidEmailFormat) {
      const invalidEmailMessage = emailErr || INVALID_EMAIL_MESSAGE
      form.setError('email', invalidEmailMessage)
      setOtpStatus('error', invalidEmailMessage)
      showOtpStatusToast('error', invalidEmailMessage, 3200)
      Swal.fire('Invalid Email', invalidEmailMessage, 'error')
      otpModal.value = false
      otpSent.value = false
      return false
    }

    const failureMessage = msg || 'Failed to send OTP. Try again.'
    if (emailIsAvailable.value && /failed to send otp email|otp service is not deployed/i.test(failureMessage)) {
      const detailed = `${failureMessage} Your email is available. Please check the OTP server (Firebase Functions + SMTP) and try again.`
      setOtpStatus('error', detailed)
      showOtpStatusToast('error', detailed, 3400)
      Swal.fire('Email Available', detailed, 'error')
      return false
    }
    form.clearErrors('email')
    setOtpStatus('error', failureMessage)
    showOtpStatusToast('error', failureMessage, 3000)
    Swal.fire('Error', failureMessage, 'error')
    return false
  }finally{
    sendingOtp.value=false
    closeSwalIfOpen()
  }
}

const startResendCooldown = (seconds = 60) => {
  resendCooldown.value = Math.max(0, Number(seconds) || 0)
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  if (resendCooldown.value <= 0) return

  resendTimer = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

const resendOtp = async () => {
  if (sendingOtp.value || resendCooldown.value > 0) return

  const sent = await sendOtp()
  if (sent) {
    showOtpStatusToast('success', 'OTP resent successfully.', 2200)
  }
}

const verifyOtp = async () => {
  if(!otpCode.value){
    setOtpStatus('error', 'Please enter the OTP code first.')
    Swal.fire('Oops','Please enter OTP','warning')
    return
  }
  verifyingOtp.value=true
  setOtpStatus('info', 'Verifying OTP. Please wait...')
  try{
    await verifyRegistrationOtpCode({ email: emailForOtp.value, otp: otpCode.value })
    closeSwalIfOpen()
    otpVerified.value=true
    resendCooldown.value = 0
    if (resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
    setOtpStatus('info', 'OTP verified. Checking email availability...')
    const identityAvailable = await confirmIdentityAvailabilityAfterOtp({ announceAvailable: true })
    if (!identityAvailable) {
      return
    }
    otpModal.value=false
    if (step.value < totalSteps.value) {
      step.value += 1
    }
  }catch(err){
    const msg = getFriendlyFirebaseErrorMessage(
      err,
      err?.response?.data?.message || (err instanceof Error ? err.message : 'Invalid OTP'),
      'otp',
    )
    closeSwalIfOpen()
    setOtpStatus('error', msg)
    showOtpStatusToast('error', msg, 2800)
    const title = /expired/i.test(String(msg))
      ? 'OTP Expired'
      : /incorrect|invalid/i.test(String(msg))
        ? 'Incorrect OTP'
        : /no otp request/i.test(String(msg))
          ? 'OTP Not Found'
          : 'OTP Verification Failed'
    Swal.fire(title, msg, 'error')
  }finally{
    verifyingOtp.value=false
    closeSwalIfOpen()
  }
}

const stepClass = (n) => {
  if (step.value > n) {
    return 'bg-[#0D1B2A] text-white border-[#0D1B2A] shadow-[0_6px_14px_rgba(13,27,42,0.2)]'
  }
  if (step.value === n) {
    return 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.16),0_7px_14px_rgba(59,130,246,0.24)]'
  }
  return 'bg-[#e2e8f0] text-[#64748b] border-[#cbd5e1]'
}

const resolveBusinessTypeFromOwnership = (ownership) => {
  const normalizedOwnership = String(ownership || '').trim()
  if (!normalizedOwnership) return ''
  if (normalizedOwnership === 'Sole proprietorship') return 'Individual'
  if (normalizedOwnership === 'Corporation' || normalizedOwnership === 'Partnership') return 'Company'
  return ''
}
const derivedBusinessType = computed(() => resolveBusinessTypeFromOwnership(form.business_ownership))
const isBusinessTypeAutoDerived = computed(() => derivedBusinessType.value.length > 0)
const selectBusinessType = () => {
  if (derivedBusinessType.value) {
    form.business_type = derivedBusinessType.value
  }
}

/* ================= VALIDATION ================= */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const CONTACT_LOCAL_REGEX = /^\d{10}$/
const SINGLE_LETTER_REGEX = /^[A-Za-z]$/
const NAME_TEXT_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/
const POSTAL_CODE_REGEX = /^\d{4}$/
const validateEmailAvailabilityOnBlur = async () => {
  const email = getNormalizedFormEmail()
  if (String(form.email || '') !== email) {
    form.email = email
  }
  if (!email || email.length > MAX_EMAIL_LENGTH || !isValidRegistrationEmail(email)) return
  await checkEmailAvailability()
}
const validateContactAvailabilityOnBlur = async () => {
  const localContact = String(contactLocal.value || '').trim()
  if (!localContact || !CONTACT_LOCAL_REGEX.test(localContact)) return
  await checkContactAvailability()
}

const hasText = (value) => String(value || '').trim().length > 0
const requireText = (errors, field, label) => {
  if (!hasText(form[field])) {
    errors[field] = `${label} is required.`
  }
}
const requireFile = (errors, field, label) => {
  if (!form[field]) {
    errors[field] = `${label} is required.`
  }
}
const stepFields = (role, s) => {
  if (role === 'user') {
    if (s === 1) return ['first_name', 'middle_initial', 'last_name']
    if (s === 2) return ['email', 'contact_number']
    if (s === 3) return ['government_id']
    if (s === 4) return ['password', 'password_confirmation']
    return []
  }

  if (role === 'business') {
    if (s === 1) {
      return [
        'business_owner_first',
        'business_owner_middle',
        'business_owner_last',
        'business_name_1',
        'business_ownership',
        'years_in_operation',
        'address_unit',
        'address_street',
        'address_barangay',
        'address_city',
        'address_province',
        'address_postal',
      ]
    }
    if (s === 2) return ['email', 'contact_number']
    if (s === 3) return ['category']
    if (s === 4) return ['business_type']
    if (s === 5) return ['bir_registration', 'dti_registration', 'mayor_permit', 'business_permit', 'sanitary_permit']
    if (s === 6) return ['password', 'password_confirmation']
    return []
  }

  return []
}

const validateStep = (s) => {
  const errors = {}
  const fieldsToClear = stepFields(form.role, s)
  if (fieldsToClear.length > 0) {
    form.clearErrors(...fieldsToClear)
  }

  if (s === 1 && form.role === 'user') {
    requireText(errors, 'first_name', 'First name')
    requireText(errors, 'middle_initial', 'Middle initial')
    requireText(errors, 'last_name', 'Last name')

    if (!errors.first_name && !NAME_TEXT_REGEX.test(String(form.first_name).trim())) {
      errors.first_name = 'First name must contain letters only.'
    }
    if (!errors.middle_initial && !SINGLE_LETTER_REGEX.test(String(form.middle_initial).trim())) {
      errors.middle_initial = 'Middle initial must be a single letter.'
    }
    if (!errors.last_name && !NAME_TEXT_REGEX.test(String(form.last_name).trim())) {
      errors.last_name = 'Last name must contain letters only.'
    }
  }

  if (s === 1 && form.role === 'business') {
    requireText(errors, 'business_owner_first', 'Owner first name')
    requireText(errors, 'business_owner_middle', 'Owner middle initial')
    requireText(errors, 'business_owner_last', 'Owner last name')
    requireText(errors, 'business_name_1', 'Business name')
    requireText(errors, 'business_ownership', 'Business ownership')
    requireText(errors, 'years_in_operation', 'Years in operation')
    requireText(errors, 'address_unit', 'House/Unit No.')
    requireText(errors, 'address_street', 'Street')
    requireText(errors, 'address_barangay', 'Barangay')
    requireText(errors, 'address_city', 'City/Municipality')
    requireText(errors, 'address_province', 'Province')
    requireText(errors, 'address_postal', 'Postal code')

    if (!errors.business_owner_first && !NAME_TEXT_REGEX.test(String(form.business_owner_first).trim())) {
      errors.business_owner_first = 'Owner first name must contain letters only.'
    }
    if (!errors.business_owner_middle && !SINGLE_LETTER_REGEX.test(String(form.business_owner_middle).trim())) {
      errors.business_owner_middle = 'Owner middle initial must be a single letter.'
    }
    if (!errors.business_owner_last && !NAME_TEXT_REGEX.test(String(form.business_owner_last).trim())) {
      errors.business_owner_last = 'Owner last name must contain letters only.'
    }
    if (!errors.address_postal && !POSTAL_CODE_REGEX.test(String(form.address_postal).trim())) {
      errors.address_postal = 'Postal code must be exactly 4 digits.'
    }
  }

  if (s === 2 && (form.role === 'user' || form.role === 'business')) {
    const normalizedEmail = getNormalizedFormEmail()
    if (String(form.email || '') !== normalizedEmail) {
      form.email = normalizedEmail
    }

    if (!normalizedEmail) {
      errors.email = 'Email address is required.'
    } else if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      errors.email = `Email address must not be greater than ${MAX_EMAIL_LENGTH} characters.`
    } else if (!isValidRegistrationEmail(normalizedEmail)) {
      errors.email = INVALID_EMAIL_MESSAGE
    }

    if (!hasText(contactLocal.value)) {
      errors.contact_number = 'Contact number is required.'
    } else if (!CONTACT_LOCAL_REGEX.test(String(contactLocal.value).trim())) {
      errors.contact_number = 'Contact number must be 10 digits after +63.'
    }
  }

  if (s === 3 && form.role === 'user') {
    requireFile(errors, 'government_id', 'Government ID')
  }

  if (s === 3 && form.role === 'business') {
    requireText(errors, 'category', 'Business category')
  }

  if (s === 4 && form.role === 'business') {
    requireText(errors, 'business_type', 'Business type')
    if (!errors.business_type && form.business_type !== derivedBusinessType.value) {
      errors.business_type = 'Business type must match the selected business ownership.'
    }
  }

  if (s === 5 && form.role === 'business') {
    requireFile(errors, 'bir_registration', 'BIR registration')
    requireFile(errors, 'dti_registration', 'DTI registration')
    requireFile(errors, 'mayor_permit', 'Mayor permit')
    requireFile(errors, 'business_permit', 'Business permit')
    requireFile(errors, 'sanitary_permit', 'Sanitary permit')
  }

  if ((s === 4 && form.role === 'user') || (s === 6 && form.role === 'business')) {
    requireText(errors, 'password', 'Password')
    requireText(errors, 'password_confirmation', 'Confirm password')

    if (!errors.password && !isStrongPassword.value) {
      errors.password = 'Use at least 8 chars with uppercase, lowercase, number, and special character.'
    }
    if (!errors.password && !errors.password_confirmation && form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Password confirmation does not match.'
    }
  }

  const errorKeys = Object.keys(errors)
  if (errorKeys.length > 0) {
    form.setError(errors)
    const firstError = errors[errorKeys[0]]
    Swal.fire('Please fix highlighted fields', firstError, 'warning')
    return false
  }

  return true
}

/* ================= SUBMIT ================= */
const submit = async ()=>{
  if (submitProcessing.value || form.processing) return

  registrationSubmitState.value = 'idle'
  registrationStatusText.value = ''

  submitProcessing.value = true

  if (!isCurrentOtpIdentityVerified()) {
    await returnToIdentityStep()
    if (!validateStep(IDENTITY_STEP)) {
      submitProcessing.value = false
      registrationSubmitState.value = 'error'
      registrationStatusText.value = form.errors.email || form.errors.contact_number || 'Please fix your email and contact number before continuing.'
      return
    }

    const identityAvailable = await validateIdentityAvailability()
    if (!identityAvailable) {
      submitProcessing.value = false
      registrationSubmitState.value = 'idle'
      registrationStatusText.value = ''
      return
    }

    const verificationMessage = 'Please verify the OTP code for this email and contact number before submitting the registration form.'
    registrationSubmitState.value = 'error'
    registrationStatusText.value = verificationMessage
    setOtpStatus('error', verificationMessage)
    Swal.fire('OTP Verification Required', verificationMessage, 'warning')
    submitProcessing.value = false
    return
  }

  const identityAvailable = await validateIdentityAvailability()
  if (!identityAvailable) {
    await returnToIdentityStep()
    submitProcessing.value = false
    registrationSubmitState.value = 'idle'
    registrationStatusText.value = ''
    return
  }

  if(!locationEnabled.value || !form.latitude || !form.longitude){
    registrationSubmitState.value = 'submitting'
    registrationStatusText.value = 'Checking your location before submission...'
    const ready = await ensureLocationReady()
    if (!ready) {
      submitProcessing.value = false
      registrationSubmitState.value = 'error'
      registrationStatusText.value = 'Location is not ready yet.'
      return
    }
  }

  if(!locationEnabled.value || !form.latitude || !form.longitude){
    submitProcessing.value = false
    registrationSubmitState.value = 'error'
    registrationStatusText.value = 'Location is not ready yet.'
    Swal.fire('Oops','Location is not ready','warning')
    return
  }
  if(!reviewChecked.value){
    submitProcessing.value = false
    registrationSubmitState.value = 'error'
    registrationStatusText.value = 'Please confirm that you reviewed your information.'
    Swal.fire('Oops','Please confirm that you have reviewed your information','warning')
    return
  }
  if (!isStrongPassword.value) {
    submitProcessing.value = false
    registrationSubmitState.value = 'error'
    registrationStatusText.value = 'Password must be strong before registration can continue.'
    Swal.fire(
      'Oops',
      'Password must be strong: at least 8 chars with uppercase, lowercase, number, and special character.',
      'warning'
    )
    return
  }

  form.business_owner = businessOwnerFull.value
  form.business_name = businessNameFull.value
  form.address = addressFull.value
  try {
    submitProcessing.value = true
    registrationSubmitState.value = 'submitting'
    registrationStatusText.value = form.role === 'business'
      ? 'Submitting business registration to Firebase. Please wait...'
      : 'Submitting user registration to Firebase. Please wait...'

    await registerWithFirebase(form)
    clearDraft()
    submitProcessing.value = false
    registrationSubmitState.value = 'success'
    registrationStatusText.value = 'Registration completed successfully. You can now sign in.'
    Swal.close()
    Swal.fire('Registration Submitted', 'Your Firebase account was created successfully.', 'success')
    window.setTimeout(() => {
      navigateToLogin()
    }, 900)
  } catch (error) {
    submitProcessing.value = false
    Swal.close()
    const firstError = getFriendlyFirebaseErrorMessage(
      error,
      error instanceof Error ? error.message : 'Registration failed. Please check your input.',
      'registration',
    )
    if (isDuplicateIdentityMessage(firstError)) {
      registrationSubmitState.value = 'idle'
      registrationStatusText.value = ''
      if (isDuplicateEmailMessage(firstError)) {
        form.setError('email', DUPLICATE_EMAIL_MESSAGE)
      } else {
        form.setError('contact_number', firstError)
      }
      await returnToIdentityStep()
      Swal.fire(isDuplicateEmailMessage(firstError) ? 'Existing Email' : 'Existing Contact Number', isDuplicateEmailMessage(firstError) ? DUPLICATE_EMAIL_MESSAGE : firstError, 'error')
      return
    }
    registrationSubmitState.value = 'error'
    registrationStatusText.value = firstError
    Swal.fire('Registration Failed', firstError, 'error')
  } finally {
    submitProcessing.value = false
    closeSwalIfOpen()
  }
}

/* ================= PASSWORD STRENGTH ================= */
watch(()=>form.password,(v)=>{
  if(!v){
    passwordStrength.value=''
    return
  }

  const hasLower = /[a-z]/.test(v)
  const hasUpper = /[A-Z]/.test(v)
  const hasNumber = /\d/.test(v)
  const hasSpecial = /[^A-Za-z0-9]/.test(v)
  const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length

  if (STRONG_PASSWORD_REGEX.test(v)) {
    passwordStrength.value = 'Strong'
    return
  }

  if (v.length >= 8 && score >= 3) {
    passwordStrength.value = 'Medium'
    return
  }

  passwordStrength.value = 'Weak'
})

/* ================= CONTACT NUMBER LIMIT ================= */
watch(()=>form.contact_number,(val)=>{
  if(!val){
    contactLocal.value = ''
    return
  }
  const digits = String(val).replace(/\D/g,'')
  let local = digits
  if(local.startsWith('63')) local = local.slice(2)
  if(local.startsWith('0')) local = local.slice(1)
  contactLocal.value = local.slice(0,10)
})

watch(contactLocal,(val)=>{
  if(!val) {
    form.contact_number = ''
    return
  }
  if(/[^0-9]/.test(val)){
    if(!contactAlerted.value){
      Swal.fire('Oops','Contact number must be numbers only','warning')
      contactAlerted.value = true
      setTimeout(()=>{ contactAlerted.value=false }, 500)
    }
  }
  let digits = String(val).replace(/\D/g,'')
  if(digits.startsWith('63')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  digits = digits.slice(0,10)
  if(digits !== val) contactLocal.value = digits
  const normalized = digits ? `63${digits}` : ''
  if(form.contact_number !== normalized) form.contact_number = normalized
})

watch(
  [() => form.email, () => form.contact_number],
  ([nextEmail, nextContact]) => {
    form.clearErrors('email', 'contact_number')
    clearVerifiedIdentityAvailability()
    if (!otpSent.value && !otpVerified.value) return
    const emailChanged =
      normalizeEmailInput(nextEmail) !== normalizeEmailInput(emailForOtp.value)
    const contactChanged =
      String(nextContact || '').trim() !== String(contactForOtp.value || '').trim()

    if (!emailChanged && !contactChanged) return

    otpSent.value = false
    otpVerified.value = false
    otpCode.value = ''
    otpModal.value = false
    setOtpStatus('idle', '')
    closeSwalIfOpen()
  }
)

watch(otpModal, (isOpen) => {
  if (!isOpen) {
    closeSwalIfOpen()
  }
})

watch(() => form.business_ownership, (val) => {
  form.business_type = resolveBusinessTypeFromOwnership(val)
}, { immediate: true })

watch(()=>form.government_id,(f)=>setPreview('government_id', f))
watch(()=>form.bir_registration,(f)=>setPreview('bir_registration', f))
watch(()=>form.dti_registration,(f)=>setPreview('dti_registration', f))
watch(()=>form.mayor_permit,(f)=>setPreview('mayor_permit', f))
watch(()=>form.business_permit,(f)=>setPreview('business_permit', f))
watch(()=>form.sanitary_permit,(f)=>setPreview('sanitary_permit', f))

watch(
  [form, step, reviewChecked, otpVerified, otpSent, contactLocal],
  () => {
    if (!showModal.value) return
    saveDraft()
  },
  { deep: true }
)

onMounted(() => {
  showLampReveal.value = consumeLampReveal()
  const draft = getSavedDraft()
  const roleType = draft?.form?.role
  if (roleType === 'user' || roleType === 'business') {
    form.role = roleType
    restoreDraftForRole(roleType)
    step.value = 1
    showModal.value = true
    scrollModalToTop()
  }
})

onBeforeUnmount(()=>{
  closeSwalIfOpen()
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  Object.values(previewUrls.value).forEach((url)=>{
    if(url) URL.revokeObjectURL(url)
  })
})

</script>

<template>
<Head title="Register" />
<div class="auth-register-shell relative grid h-dvh place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18)_0%,rgba(59,130,246,0.08)_24%,transparent_46%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14)_0%,rgba(59,130,246,0.06)_22%,transparent_44%),linear-gradient(180deg,#07111d_0%,#091624_42%,#0D1B2A_100%)] p-5 font-sans max-[1120px]:min-h-screen max-[1120px]:h-auto max-[1120px]:overflow-y-auto max-[1120px]:px-[14px] max-[1120px]:py-5">
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div class="absolute -left-24 top-2 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.32)_0%,rgba(59,130,246,0.12)_34%,transparent_72%)] blur-3xl"></div>
    <div class="absolute right-[-5rem] top-6 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(13,27,42,0.42)_0%,rgba(13,27,42,0.14)_38%,transparent_74%)] blur-3xl"></div>
    <div class="absolute bottom-[-7rem] left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2)_0%,rgba(59,130,246,0.08)_38%,transparent_78%)] blur-3xl"></div>
  </div>

  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="showWorkingOverlay" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[rgba(15,23,42,0.46)] px-6 text-center backdrop-blur-[6px]">
      <span class="h-16 w-16 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden="true"></span>
      <p class="mt-6 text-[1.15rem] font-black tracking-[-0.03em] text-white">{{ workingOverlayTitle }}</p>
      <p class="mt-2 max-w-sm text-sm leading-6 text-white/74">{{ workingOverlayText }}</p>
    </div>
  </transition>

  <div class="relative h-[min(650px,calc(100dvh-28px))] w-full max-w-[1180px] overflow-hidden rounded-[36px] border border-white/55 bg-white/86 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-md max-[1120px]:h-auto">

    <div class="grid h-full lg:grid-cols-[0.96fr_1.04fr] max-[1120px]:h-auto max-[1120px]:grid-cols-1">
      <section class="relative flex min-h-[320px] h-full flex-col overflow-hidden bg-[#0D1B2A] px-6 py-5 text-white md:px-8 md:py-6 lg:min-h-0 max-[1120px]:min-h-[300px]" :class="showLampReveal ? 'animate-auth-panel-drop origin-left motion-reduce:animate-none' : ''" aria-hidden="true">
        <div class="absolute inset-0 bg-cover" style="background-image: url('/images/landing-plumbing-hero.png'); background-position: 66% 13%; background-size: 126% auto;"></div>
        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,20,0.28)_0%,rgba(5,12,20,0.6)_46%,rgba(5,12,20,0.94)_100%)]"></div>
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,27,42,0.92)_0%,rgba(13,27,42,0.7)_42%,rgba(13,27,42,0.2)_100%)]"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.16),transparent_24%)]"></div>
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.03)_0%,rgba(13,27,42,0)_30%,rgba(13,27,42,0.08)_54%,rgba(13,27,42,0.32)_76%,rgba(13,27,42,0.72)_100%)]"></div>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(5,12,20,0.56)_55%,rgba(5,12,20,0.9)_100%)]"></div>
        <div class="pointer-events-none absolute inset-x-[-8%] bottom-[-2px] h-40 opacity-95">
          <svg viewBox="0 0 1440 320" class="h-full w-full text-[#07111d]" preserveAspectRatio="none" aria-hidden="true">
            <path
              fill="currentColor"
              d="M0,160L48,149.3C96,139,192,117,288,122.7C384,128,480,160,576,181.3C672,203,768,213,864,192C960,171,1056,117,1152,106.7C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>
        <div class="pointer-events-none absolute inset-x-[-6%] bottom-8 h-20 opacity-70">
          <svg viewBox="0 0 1440 320" class="h-full w-full text-[rgba(59,130,246,0.18)]" preserveAspectRatio="none" aria-hidden="true">
            <path
              fill="currentColor"
              d="M0,224L48,224C96,224,192,224,288,218.7C384,213,480,203,576,197.3C672,192,768,192,864,165.3C960,139,1056,85,1152,74.7C1248,64,1344,96,1392,112L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div class="relative z-10 flex items-start justify-between gap-4">
          <button type="button" class="inline-flex items-center rounded-full border border-white/14 bg-[rgba(10,22,36,0.88)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(2,8,20,0.35)] backdrop-blur-xl transition hover:bg-[rgba(10,22,36,0.96)] disabled:cursor-not-allowed disabled:opacity-60" :disabled="pageLoading || modalPreparing" @click="goHome">
            <BrandLockup theme="light" compact />
          </button>

          <span class="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/12 px-3.5 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md shadow-[0_14px_28px_rgba(2,6,23,0.14)]">
            Guided Access
          </span>
        </div>

        <div class="relative z-10 mt-auto max-w-[18.5rem] space-y-2 pb-6 max-[1120px]:pt-10 max-[1120px]:pb-3">
          <p class="text-[0.69rem] font-bold uppercase tracking-[0.26em] text-[#3B82F6]">Guided Access</p>
          <h1 class="max-w-[10ch] text-[clamp(2.35rem,5.2vw,4.55rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">
            Create your cleaner service account.
          </h1>
          <p class="max-w-[15.5rem] text-[0.7rem] leading-5 text-slate-200/78">
            Clean onboarding for user and business access.
          </p>
          <div class="flex flex-wrap gap-1 pt-1">
            <span class="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-white/88 backdrop-blur-sm">
              User Access
            </span>
            <span class="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-white/88 backdrop-blur-sm">
              Business Setup
            </span>
            <span class="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-white/88 backdrop-blur-sm">
              OTP Verified
            </span>
          </div>
        </div>

      </section>

      <section
        class="relative flex h-full flex-col justify-center bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12)_0%,rgba(59,130,246,0.05)_18%,transparent_40%),radial-gradient(circle_at_bottom_left,rgba(13,27,42,0.08)_0%,rgba(13,27,42,0.03)_18%,transparent_40%),linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(242,247,255,0.97)_44%,rgba(235,242,250,0.96)_100%)] px-6 py-5 md:px-8 md:py-6 lg:px-10 max-[1120px]:px-5 max-[1120px]:py-6"
        :class="showLampReveal ? 'animate-auth-panel-drop origin-top-right motion-reduce:animate-none' : ''"
      >
        <div class="mx-auto w-full max-w-[420px]">
          <div class="flex items-center justify-between gap-4 max-[860px]:flex-col max-[860px]:items-start">
            <button type="button" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60" :disabled="pageLoading || modalPreparing" @click="goHome">
              <span aria-hidden="true">&larr;</span>
              <span>Back to Home</span>
            </button>
            <p class="text-sm text-slate-500 max-[860px]:pl-1">
              Already registered?
              <button type="button" class="font-semibold text-[#0D1B2A] hover:text-[#11263b] hover:underline disabled:cursor-not-allowed disabled:opacity-60" :disabled="pageLoading || modalPreparing" @click="navigateToLogin()">Login</button>
            </p>
          </div>

          <div class="mt-4 space-y-1.5">
            <p class="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#0D1B2A]">Create Account</p>
            <h1 class="text-[clamp(2.3rem,4.4vw,4.1rem)] font-bold leading-[0.9] tracking-[-0.06em] text-[#0D1B2A]">Onboarding</h1>
            <p class="text-[0.84rem] leading-5 text-slate-600">Select the account type that matches your role, then continue to the guided registration form.</p>
          </div>

          <div class="mt-2.5 flex items-center justify-between gap-3 max-[560px]:items-start">
            <p class="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Account Type</p>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.7rem] font-semibold text-slate-600">Step 1 of 2</span>
          </div>

          <div class="mt-2 grid gap-2">
            <button
              @click="openModal('user')"
              type="button"
              :disabled="modalPreparing || pageLoading"
              class="group w-full rounded-[20px] border border-[#0D1B2A]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,252,0.96)_100%)] px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#3B82F6]/40 hover:shadow-[0_18px_34px_rgba(13,27,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <p class="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0D1B2A]">Personal</p>
              <p class="mt-1 text-[1.16rem] font-bold tracking-[-0.04em] text-slate-900">User Account</p>
              <p class="mt-1 text-[0.78rem] leading-5 text-slate-600">For customers submitting service requests, checking updates, and managing bookings.</p>
              <span class="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#0D1B2A] px-5 py-2 text-[0.92rem] font-semibold text-white">
                Continue
                <span class="transition-transform duration-150 group-hover:translate-x-[2px]">&rarr;</span>
              </span>
            </button>

            <button
              @click="openModal('business')"
              type="button"
              :disabled="modalPreparing || pageLoading"
              class="group w-full rounded-[20px] border border-[#0D1B2A]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,252,0.96)_100%)] px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#3B82F6]/40 hover:shadow-[0_18px_34px_rgba(13,27,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <p class="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0D1B2A]">Organization</p>
              <p class="mt-1 text-[1.16rem] font-bold tracking-[-0.04em] text-slate-900">Business Account</p>
              <p class="mt-1 text-[0.78rem] leading-5 text-slate-600">For companies handling teams, permits, document review, and service-side workflows.</p>
              <span class="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#0D1B2A] px-5 py-2 text-[0.92rem] font-semibold text-white">
                Continue
                <span class="transition-transform duration-150 group-hover:translate-x-[2px]">&rarr;</span>
              </span>
            </button>
          </div>

        </div>

      </section>
    </div>
  </div>

  <!-- MODAL -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="showModal" class="fixed inset-0 z-50 bg-[rgba(15,23,42,0.48)] backdrop-blur-[8px]">
      <div class="grid h-full place-items-center p-5 max-[1040px]:p-3">
        <div class="w-[min(1040px,94vw)] max-h-[calc(100dvh-44px)] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_34px_80px_rgba(15,23,42,0.18)] max-[1040px]:max-h-[calc(100dvh-24px)] max-[1040px]:rounded-[18px]">
          <div class="flex items-start justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f3f7fd_100%)] px-[22px] pt-[18px] pb-[14px] max-[1040px]:px-[14px] max-[1040px]:pt-[14px] max-[1040px]:pb-[12px]">
            <div>
              <p class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#0D1B2A]">{{ form.role === 'business' ? 'Business onboarding' : 'User onboarding' }}</p>
              <h2 class="mt-1 text-[1.6rem] font-extrabold leading-[1.1] text-slate-900 max-[1040px]:text-[1.3rem]">{{ modalTitle }}</h2>
              <p class="mt-2 max-w-[38rem] text-[0.88rem] leading-6 text-slate-600">
                Clean onboarding for approvals, permits, location capture, and account activation without the clutter of a generic form stack.
              </p>
            </div>
            <button @click="closeModal" class="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-[1.8rem] leading-none text-slate-500 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" aria-label="Close registration modal">&times;</button>
          </div>

          <div data-register-scroll class="max-h-[calc(100dvh-188px)] overflow-y-auto bg-[linear-gradient(180deg,rgba(247,249,253,0.98)_0%,rgba(238,244,251,0.98)_100%)] px-[22px] pt-4 pb-[16px] max-[1040px]:max-h-[calc(100dvh-154px)] max-[1040px]:px-[14px] max-[1040px]:pt-3 max-[1040px]:pb-[14px]">
         
        <div class="mx-auto mb-4 flex w-full max-w-[900px] items-center rounded-[22px] border border-[rgba(148,163,184,0.16)] bg-white/80 px-4 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] max-[1040px]:mb-3 max-[1040px]:px-3 max-[1040px]:py-3">
          <template v-for="n in totalSteps" :key="n">
            <div :class="['relative z-10 inline-flex h-[2.05rem] w-[2.05rem] flex-none items-center justify-center rounded-full border text-[0.84rem] font-bold leading-none transition-[background-color,color,border-color,box-shadow,transform] duration-200 max-[1040px]:h-[1.72rem] max-[1040px]:w-[1.72rem] max-[1040px]:text-[0.74rem]', stepClass(n)]">
              {{ n }}
            </div>
            <div
              v-if="n < totalSteps"
              :class="step > n ? 'bg-[#dbeafe] after:scale-x-100' : 'bg-[#dbe3f0] after:scale-x-0'"
              class="relative -mx-[1.025rem] h-[3px] min-w-[12px] flex-1 self-center rounded-full overflow-hidden after:absolute after:inset-0 after:origin-left after:scale-x-0 after:rounded-full after:bg-[linear-gradient(90deg,#0D1B2A,#3B82F6)] after:transition-transform after:duration-300 after:content-[''] max-[1040px]:-mx-[0.86rem] max-[1040px]:h-[2px]"
            ></div>
          </template>
        </div>

        <form @submit.prevent="submit" class="mx-auto flex min-h-full w-full max-w-[900px] flex-col gap-4 pb-1">

          <!-- USER STEPS -->
          <div v-if="form.role==='user'">
            <div v-if="step===1">
              <SectionTitle title="Basic Info"/>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>First Name</label>
                <TextInput v-model="form.first_name" required/>
                <p v-if="form.errors.first_name" class="text-rose-600 text-xs mt-1">{{ form.errors.first_name }}</p>
                <p v-if="nameErrors(form.first_name).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                <p v-if="nameErrors(form.first_name).special" class="text-red-500 text-xs">Special characters are not allowed</p>
              </div>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Middle Initial</label>
                <TextInput v-model="form.middle_initial" maxlength="1" required/>
                <p v-if="form.errors.middle_initial" class="text-rose-600 text-xs mt-1">{{ form.errors.middle_initial }}</p>
                <p v-if="nameErrors(form.middle_initial).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                <p v-if="nameErrors(form.middle_initial).special" class="text-red-500 text-xs">Special characters are not allowed</p>
              </div>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Last Name</label>
                <TextInput v-model="form.last_name" required/>
                <p v-if="form.errors.last_name" class="text-rose-600 text-xs mt-1">{{ form.errors.last_name }}</p>
                <p v-if="nameErrors(form.last_name).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                <p v-if="nameErrors(form.last_name).special" class="text-red-500 text-xs">Special characters are not allowed</p>
              </div>
            </div>

            <div v-if="step===2">
              <SectionTitle title="Email & Contact"/>
              <div :class="fieldCardClass('email')" class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Email Address</label>
                <TextInput v-model="form.email" :class="textInputClass('email')" required @blur="validateEmailAvailabilityOnBlur"/>
                <p v-if="form.errors.email" class="text-rose-600 text-xs mt-1">{{ form.errors.email }}</p>
              </div>
              <div :class="fieldCardClass('contact_number')" class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Contact Number</label>
                <div :class="inlineInputClass('contact_number')" class="flex items-center overflow-hidden rounded-lg border">
                  <span :class="hasFieldError('contact_number') ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-300 bg-slate-100 text-teal-700'" class="border-r px-3 py-[0.55rem] text-[0.9rem] font-semibold">+63</span>
                  <input
                    v-model="contactLocal"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="10"
                    placeholder="XXXXXXXXXX"
                    required
                    @blur="validateContactAvailabilityOnBlur"
                    :class="hasFieldError('contact_number') ? 'bg-rose-50/70 text-rose-900' : 'bg-white text-slate-900'"
                    class="flex-1 border-0 px-3 py-[0.55rem] text-[0.9rem] outline-none"
                  />
                </div>
                <p v-if="form.errors.contact_number" class="text-rose-600 text-xs mt-1">{{ form.errors.contact_number }}</p>
              </div>
            </div>

            <div v-if="step===3">
              <SectionTitle title="Government ID"/>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Upload ID</label>
                <input type="file" required @change="e=>form.government_id=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                <p class="text-xs text-slate-500 mt-1">Accepted document or photo files up to 50MB.</p>
                <p v-if="form.errors.government_id" class="text-rose-600 text-xs mt-1">{{ form.errors.government_id }}</p>
                <p v-if="form.government_id" class="text-xs text-gray-500 mt-1">Selected: {{ form.government_id.name }}</p>
              </div>
            </div>

            <div v-if="step===4" class="max-w-[640px]">
              <SectionTitle title="Set Password"/>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Password</label>
                <div class="relative flex w-full items-center">
                  <TextInput class="w-full pr-11" v-model="form.password" :type="showPassword ? 'text' : 'password'"/>
                  <button type="button" class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-teal-700 transition-colors duration-150 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700/40" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.88"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                      <path d="M14.12 14.12A3 3 0 0 0 9.88 9.88"/>
                      <path d="M23 12s-1.64 3.28-4.12 5.88"/>
                    </svg>
                  </button>
                </div>
                <p v-if="form.errors.password" class="text-rose-600 text-xs mt-1">{{ form.errors.password }}</p>
              </div>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Confirm Password</label>
                <div class="relative flex w-full items-center">
                  <TextInput class="w-full pr-11" v-model="form.password_confirmation" :type="showPasswordConfirm ? 'text' : 'password'"/>
                  <button type="button" class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-teal-700 transition-colors duration-150 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700/40" @click="showPasswordConfirm = !showPasswordConfirm" aria-label="Toggle confirm password visibility">
                    <svg v-if="!showPasswordConfirm" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.88"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                      <path d="M14.12 14.12A3 3 0 0 0 9.88 9.88"/>
                      <path d="M23 12s-1.64 3.28-4.12 5.88"/>
                    </svg>
                  </button>
                </div>
                <p v-if="form.errors.password_confirmation" class="text-rose-600 text-xs mt-1">{{ form.errors.password_confirmation }}</p>
              </div>
              <p class="text-sm text-gray-500 mt-1">Password Strength: <span :class="{'text-red-500':passwordStrength==='Weak','text-orange-500':passwordStrength==='Medium','text-green-500':passwordStrength==='Strong'}">{{ passwordStrength }}</span></p>
              <p class="text-xs text-gray-500 mt-1">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
              <p v-if="form.password && !isStrongPassword" class="text-xs text-rose-600 mt-1">Strong password required before proceeding.</p>
            </div>

            <div v-if="step===5">
              <SectionTitle title="Review & Edit Info"/>
              <div class="space-y-3">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>First Name</label><TextInput v-model="form.first_name" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Last Name</label><TextInput v-model="form.last_name" required/></div>
                </div>
                <div class="max-w-[220px] flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Middle Initial</label><TextInput v-model="form.middle_initial" maxlength="1" required/></div>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Email</label><TextInput v-model="form.email" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Contact Number</label>
                    <div class="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                      <span class="border-r border-slate-300 bg-slate-100 px-3 py-[0.55rem] text-[0.9rem] font-semibold text-teal-700">+63</span>
                      <input
                        v-model="contactLocal"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="10"
                        placeholder="XXXXXXXXXX"
                        required
                        class="flex-1 border-0 px-3 py-[0.55rem] text-[0.9rem] outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Upload ID</label>
                  <div class="flex flex-col gap-2 p-1">
                    <div class="text-[0.95rem] text-gray-900">{{ form.government_id ? form.government_id.name : 'No file chosen' }}</div>
                    <img v-if="isImage(form.government_id) && getFilePreviewUrl('government_id')" :src="getFilePreviewUrl('government_id')" :alt="getFilePreviewAlt('government_id', 'Government ID preview')" class="max-h-[150px] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-1.5" />
                    <input id="government_id_file_review" type="file" class="sr-only" @change="e=>form.government_id=e.target.files[0]" />
                    <label for="government_id_file_review" class="cursor-pointer self-start rounded-lg bg-teal-500 px-3 py-1.5 text-[0.9rem] text-white">Change file</label>
                  </div>
                </div>
              </div>
              <label class="flex items-center gap-2 mt-3"><input type="checkbox" v-model="reviewChecked"/> I have reviewed my info</label>
              <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
                    <p class="mt-1 text-sm font-semibold text-slate-800">{{ locationStatusLabel }}</p>
                    <p class="mt-1 text-xs text-slate-500">Lat: {{ form.latitude || 'N/A' }} • Lng: {{ form.longitude || 'N/A' }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-[#0D1B2A]/12 bg-[#0D1B2A]/5 px-4 py-2.5 text-xs font-semibold text-[#0D1B2A] transition hover:bg-[#0D1B2A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="locationRefreshing"
                    @click="refreshLocation"
                  >
                    {{ locationRefreshing ? 'Fetching location...' : 'Use my current location' }}
                  </button>
                </div>
              </div>
              <iframe :src="mapUrl" class="mt-4 h-[200px] w-full max-h-[200px] rounded-2xl border border-slate-200"></iframe>
            </div>
          </div>

          <!-- BUSINESS STEPS -->
          <div v-if="form.role==='business'">
            <div v-if="step===1">
              <SectionTitle title="Business Info"/>
              <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_1.2fr]">
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>First Name</label>
                  <TextInput v-model="form.business_owner_first" required/>
                  <p v-if="form.errors.business_owner_first" class="text-rose-600 text-xs mt-1">{{ form.errors.business_owner_first }}</p>
                  <p v-if="nameErrors(form.business_owner_first).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                  <p v-if="nameErrors(form.business_owner_first).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Middle Initial</label>
                  <TextInput v-model="form.business_owner_middle" maxlength="1" required/>
                  <p v-if="form.errors.business_owner_middle" class="text-rose-600 text-xs mt-1">{{ form.errors.business_owner_middle }}</p>
                  <p v-if="nameErrors(form.business_owner_middle).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                  <p v-if="nameErrors(form.business_owner_middle).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Last Name</label>
                  <TextInput v-model="form.business_owner_last" required/>
                  <p v-if="form.errors.business_owner_last" class="text-rose-600 text-xs mt-1">{{ form.errors.business_owner_last }}</p>
                  <p v-if="nameErrors(form.business_owner_last).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                  <p v-if="nameErrors(form.business_owner_last).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                </div>
              </div>
              <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Business Name</label>
                  <TextInput v-model="form.business_name_1" required/>
                  <p v-if="form.errors.business_name_1" class="text-rose-600 text-xs mt-1">{{ form.errors.business_name_1 }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Business Ownership</label>
                  <select v-model="form.business_ownership" class="min-h-[2.75rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-[0.55rem] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" required>
                    <option value="" disabled>Select Type</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Sole proprietorship">Sole proprietorship</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                  <p v-if="form.errors.business_ownership" class="text-rose-600 text-xs mt-1">{{ form.errors.business_ownership }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Years in Operation</label>
                  <select v-model="form.years_in_operation" class="min-h-[2.75rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-[0.55rem] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" required>
                    <option value="" disabled>Select</option>
                    <option v-for="y in 50" :key="y" :value="String(y)">{{ y }}</option>
                  </select>
                  <p v-if="form.errors.years_in_operation" class="text-rose-600 text-xs mt-1">{{ form.errors.years_in_operation }}</p>
                </div>
              </div>
              <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>House/Unit No.</label>
                  <TextInput v-model="form.address_unit" required/>
                  <p v-if="form.errors.address_unit" class="text-rose-600 text-xs mt-1">{{ form.errors.address_unit }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Street</label>
                  <TextInput v-model="form.address_street" required/>
                  <p v-if="form.errors.address_street" class="text-rose-600 text-xs mt-1">{{ form.errors.address_street }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Barangay</label>
                  <TextInput v-model="form.address_barangay" required/>
                  <p v-if="form.errors.address_barangay" class="text-rose-600 text-xs mt-1">{{ form.errors.address_barangay }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>City/Municipality</label>
                  <TextInput v-model="form.address_city" required/>
                  <p v-if="form.errors.address_city" class="text-rose-600 text-xs mt-1">{{ form.errors.address_city }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Province</label>
                  <TextInput v-model="form.address_province" required/>
                  <p v-if="form.errors.address_province" class="text-rose-600 text-xs mt-1">{{ form.errors.address_province }}</p>
                </div>
                <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Postal Code</label>
                  <TextInput v-model="form.address_postal" required/>
                  <p v-if="form.errors.address_postal" class="text-rose-600 text-xs mt-1">{{ form.errors.address_postal }}</p>
                </div>
              </div>
            </div>

            <div v-if="step===2">
              <SectionTitle title="Email & Contact"/>
              <div :class="fieldCardClass('email')" class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Email Address</label>
                <TextInput v-model="form.email" :class="textInputClass('email')" required @blur="validateEmailAvailabilityOnBlur"/>
                <p v-if="form.errors.email" class="text-rose-600 text-xs mt-1">{{ form.errors.email }}</p>
              </div>
              <div :class="fieldCardClass('contact_number')" class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Contact Number</label>
                <div :class="inlineInputClass('contact_number')" class="flex items-center overflow-hidden rounded-lg border">
                  <span :class="hasFieldError('contact_number') ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-300 bg-slate-100 text-teal-700'" class="border-r px-3 py-[0.55rem] text-[0.9rem] font-semibold">+63</span>
                  <input
                    v-model="contactLocal"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="10"
                    placeholder="XXXXXXXXXX"
                    required
                    @blur="validateContactAvailabilityOnBlur"
                    :class="hasFieldError('contact_number') ? 'bg-rose-50/70 text-rose-900' : 'bg-white text-slate-900'"
                    class="flex-1 border-0 px-3 py-[0.55rem] text-[0.9rem] outline-none"
                  />
                </div>
                <p v-if="form.errors.contact_number" class="text-rose-600 text-xs mt-1">{{ form.errors.contact_number }}</p>
              </div>
            </div>

            <div v-if="step===3">
              <SectionTitle title="Category"/>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="cat in categories" :key="cat.value" @click="form.category=cat.value" :class="['relative cursor-pointer rounded-[22px] border px-4 py-4 text-left text-[1rem] shadow-sm transition-colors duration-200', form.category===cat.value ? 'border-2 border-[#3B82F6] bg-[#eff6ff] text-[#0D1B2A] shadow-[0_0_0_1px_rgba(59,130,246,0.12)]' : 'border-slate-200 bg-white text-slate-700']">
                  <span v-if="form.category===cat.value" class="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-sm" aria-hidden="true">
                    <svg viewBox="0 0 20 20" class="h-4 w-4 fill-current">
                      <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.414 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <h3 class="font-semibold text-lg">{{cat.label}}</h3>
                  <p class="text-sm mt-1" :class="form.category===cat.value ? 'text-[#0D1B2A]' : 'text-gray-500'">{{cat.desc}}</p>
                </div>
              </div>
              <p v-if="form.errors.category" class="text-rose-600 text-xs mt-2">{{ form.errors.category }}</p>
            </div>

            <div v-if="step===4">
              <SectionTitle title="Business Type"/>
              <p class="mb-3 text-xs text-slate-500">
                This is set automatically from your Business Ownership selection:
                <span class="font-semibold text-slate-700">{{ form.business_ownership || 'Not selected' }}</span>
              </p>
              <div class="flex gap-4">
                <div
                  v-for="t in businessTypes"
                  :key="t.value"
                  @click="selectBusinessType()"
                  :class="[
                    'rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-[1rem] shadow-sm transition-colors duration-200',
                    form.business_type===t.value ? 'border-[#3B82F6] bg-[#eff6ff] text-[#0D1B2A]' : 'text-slate-700',
                    isBusinessTypeAutoDerived ? 'cursor-default' : 'cursor-pointer'
                  ]"
                >
                  <div class="font-semibold">{{ t.label }}</div>
                  <p v-if="form.business_type===t.value" class="mt-1 text-xs text-slate-500">Auto-selected from Business Ownership</p>
                </div>
              </div>
              <p v-if="form.errors.business_type" class="text-rose-600 text-xs mt-2">{{ form.errors.business_type }}</p>
            </div>

            <div v-if="step===5">
              <SectionTitle title="Upload Documents"/>
              <p class="mb-2.5 text-xs text-slate-500">Upload clear business document files. Large document or photo uploads up to 50MB are allowed.</p>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>BIR Registration</label>
                  <input type="file" required @change="e=>form.bir_registration=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                  <p v-if="form.errors.bir_registration" class="text-rose-600 text-xs mt-1">{{ form.errors.bir_registration }}</p>
                </div>
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>DTI Registration</label>
                  <input type="file" required @change="e=>form.dti_registration=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                  <p v-if="form.errors.dti_registration" class="text-rose-600 text-xs mt-1">{{ form.errors.dti_registration }}</p>
                </div>
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Mayor Permit</label>
                  <input type="file" required @change="e=>form.mayor_permit=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                  <p v-if="form.errors.mayor_permit" class="text-rose-600 text-xs mt-1">{{ form.errors.mayor_permit }}</p>
                </div>
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                  <label>Business Permit</label>
                  <input type="file" required @change="e=>form.business_permit=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                  <p v-if="form.errors.business_permit" class="text-rose-600 text-xs mt-1">{{ form.errors.business_permit }}</p>
                </div>
                <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700 md:col-span-2">
                  <label>Sanitary Permit</label>
                  <input type="file" required @change="e=>form.sanitary_permit=e.target.files[0]" class="cursor-pointer rounded-lg border border-slate-300 p-2"/>
                  <p v-if="form.errors.sanitary_permit" class="text-rose-600 text-xs mt-1">{{ form.errors.sanitary_permit }}</p>
                </div>
              </div>
            </div>

            <div v-if="step===6" class="max-w-[640px]">
              <SectionTitle title="Set Password"/>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Password</label>
                <div class="relative flex w-full items-center">
                  <TextInput class="w-full pr-11" v-model="form.password" :type="showPassword ? 'text' : 'password'"/>
                  <button type="button" class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-teal-700 transition-colors duration-150 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700/40" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.88"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                      <path d="M14.12 14.12A3 3 0 0 0 9.88 9.88"/>
                      <path d="M23 12s-1.64 3.28-4.12 5.88"/>
                    </svg>
                  </button>
                </div>
                <p v-if="form.errors.password" class="text-rose-600 text-xs mt-1">{{ form.errors.password }}</p>
              </div>
              <div class="mb-3 flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                <label>Confirm Password</label>
                <div class="relative flex w-full items-center">
                  <TextInput class="w-full pr-11" v-model="form.password_confirmation" :type="showPasswordConfirm ? 'text' : 'password'"/>
                  <button type="button" class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-teal-700 transition-colors duration-150 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700/40" @click="showPasswordConfirm = !showPasswordConfirm" aria-label="Toggle confirm password visibility">
                    <svg v-if="!showPasswordConfirm" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.88"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                      <path d="M14.12 14.12A3 3 0 0 0 9.88 9.88"/>
                      <path d="M23 12s-1.64 3.28-4.12 5.88"/>
                    </svg>
                  </button>
                </div>
                <p v-if="form.errors.password_confirmation" class="text-rose-600 text-xs mt-1">{{ form.errors.password_confirmation }}</p>
              </div>
              <p class="text-sm text-gray-500 mt-1">Password Strength: <span :class="{'text-red-500':passwordStrength==='Weak','text-orange-500':passwordStrength==='Medium','text-green-500':passwordStrength==='Strong'}">{{ passwordStrength }}</span></p>
              <p class="text-xs text-gray-500 mt-1">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
              <p v-if="form.password && !isStrongPassword" class="text-xs text-rose-600 mt-1">Strong password required before proceeding.</p>
            </div>

            <!-- BUSINESS REVIEW STEP -->
            <div v-if="step===7">
              <SectionTitle title="Review & Edit Info"/>
              <div class="space-y-3">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>First Name</label>
                    <TextInput v-model="form.business_owner_first" required/>
                    <p v-if="nameErrors(form.business_owner_first).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                    <p v-if="nameErrors(form.business_owner_first).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Middle Initial</label>
                    <TextInput v-model="form.business_owner_middle" maxlength="1" required/>
                    <p v-if="nameErrors(form.business_owner_middle).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                    <p v-if="nameErrors(form.business_owner_middle).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Last Name</label>
                    <TextInput v-model="form.business_owner_last" required/>
                    <p v-if="nameErrors(form.business_owner_last).number" class="text-red-500 text-xs mt-1">Numbers are not allowed</p>
                    <p v-if="nameErrors(form.business_owner_last).special" class="text-red-500 text-xs">Special characters are not allowed</p>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Business Name</label><TextInput v-model="form.business_name_1" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Business Ownership</label>
                    <select v-model="form.business_ownership" class="min-h-[2.75rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-[0.55rem] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" required>
                      <option value="" disabled>Select Type</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Sole proprietorship">Sole proprietorship</option>
                      <option value="Partnership">Partnership</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Years in Operation</label>
                    <select v-model="form.years_in_operation" class="min-h-[2.75rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-[0.55rem] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" required>
                      <option value="" disabled>Select</option>
                      <option v-for="y in 50" :key="y" :value="String(y)">{{ y }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>House/Unit No.</label><TextInput v-model="form.address_unit" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Street</label><TextInput v-model="form.address_street" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Barangay</label><TextInput v-model="form.address_barangay" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>City/Municipality</label><TextInput v-model="form.address_city" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Province</label><TextInput v-model="form.address_province" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Postal Code</label><TextInput v-model="form.address_postal" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700"><label>Email</label><TextInput v-model="form.email" required/></div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Contact Number</label>
                    <div class="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                      <span class="border-r border-slate-300 bg-slate-100 px-3 py-[0.55rem] text-[0.9rem] font-semibold text-teal-700">+63</span>
                      <input
                        v-model="contactLocal"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="10"
                        placeholder="XXXXXXXXXX"
                        required
                        class="flex-1 border-0 px-3 py-[0.55rem] text-[0.9rem] outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Category</label>
                    <select v-model="form.category" class="w-full border-b border-slate-300 bg-transparent p-2 min-h-[3rem]" required>
                      <option value="" disabled>Select Category</option>
                      <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1 [&>label]:font-semibold [&>label]:text-teal-700">
                    <label>Business Type</label>
                    <div class="min-h-[3rem] rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-800 shadow-sm">
                      {{ form.business_type || 'Not set' }}
                    </div>
                    <p class="text-xs text-slate-500">Automatically based on Business Ownership.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">BIR Registration</p>
                    <div class="mt-2 flex items-center gap-3">
                      <div class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img v-if="isImage(form.bir_registration) && getFilePreviewUrl('bir_registration')" :src="getFilePreviewUrl('bir_registration')" :alt="getFilePreviewAlt('bir_registration', 'BIR preview')" class="h-full w-full object-cover" />
                        <span v-else class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-800">{{ form.bir_registration ? form.bir_registration.name : 'No file chosen' }}</p>
                        <input id="bir_registration_file_review" type="file" class="sr-only" @change="e=>form.bir_registration=e.target.files[0]" />
                        <label for="bir_registration_file_review" class="mt-2 inline-flex cursor-pointer rounded-full bg-teal-500 px-3 py-1.5 text-[0.78rem] font-semibold text-white">Change</label>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">DTI Registration</p>
                    <div class="mt-2 flex items-center gap-3">
                      <div class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img v-if="isImage(form.dti_registration) && getFilePreviewUrl('dti_registration')" :src="getFilePreviewUrl('dti_registration')" :alt="getFilePreviewAlt('dti_registration', 'DTI preview')" class="h-full w-full object-cover" />
                        <span v-else class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-800">{{ form.dti_registration ? form.dti_registration.name : 'No file chosen' }}</p>
                        <input id="dti_registration_file_review" type="file" class="sr-only" @change="e=>form.dti_registration=e.target.files[0]" />
                        <label for="dti_registration_file_review" class="mt-2 inline-flex cursor-pointer rounded-full bg-teal-500 px-3 py-1.5 text-[0.78rem] font-semibold text-white">Change</label>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mayor Permit</p>
                    <div class="mt-2 flex items-center gap-3">
                      <div class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img v-if="isImage(form.mayor_permit) && getFilePreviewUrl('mayor_permit')" :src="getFilePreviewUrl('mayor_permit')" :alt="getFilePreviewAlt('mayor_permit', 'Mayor permit preview')" class="h-full w-full object-cover" />
                        <span v-else class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-800">{{ form.mayor_permit ? form.mayor_permit.name : 'No file chosen' }}</p>
                        <input id="mayor_permit_file_review" type="file" class="sr-only" @change="e=>form.mayor_permit=e.target.files[0]" />
                        <label for="mayor_permit_file_review" class="mt-2 inline-flex cursor-pointer rounded-full bg-teal-500 px-3 py-1.5 text-[0.78rem] font-semibold text-white">Change</label>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Business Permit</p>
                    <div class="mt-2 flex items-center gap-3">
                      <div class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img v-if="isImage(form.business_permit) && getFilePreviewUrl('business_permit')" :src="getFilePreviewUrl('business_permit')" :alt="getFilePreviewAlt('business_permit', 'Business permit preview')" class="h-full w-full object-cover" />
                        <span v-else class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-800">{{ form.business_permit ? form.business_permit.name : 'No file chosen' }}</p>
                        <input id="business_permit_file_review" type="file" class="sr-only" @change="e=>form.business_permit=e.target.files[0]" />
                        <label for="business_permit_file_review" class="mt-2 inline-flex cursor-pointer rounded-full bg-teal-500 px-3 py-1.5 text-[0.78rem] font-semibold text-white">Change</label>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-white/80 p-3 md:col-span-2">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sanitary Permit</p>
                    <div class="mt-2 flex items-center gap-3">
                      <div class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img v-if="isImage(form.sanitary_permit) && getFilePreviewUrl('sanitary_permit')" :src="getFilePreviewUrl('sanitary_permit')" :alt="getFilePreviewAlt('sanitary_permit', 'Sanitary permit preview')" class="h-full w-full object-cover" />
                        <span v-else class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-800">{{ form.sanitary_permit ? form.sanitary_permit.name : 'No file chosen' }}</p>
                        <input id="sanitary_permit_file_review" type="file" class="sr-only" @change="e=>form.sanitary_permit=e.target.files[0]" />
                        <label for="sanitary_permit_file_review" class="mt-2 inline-flex cursor-pointer rounded-full bg-teal-500 px-3 py-1.5 text-[0.78rem] font-semibold text-white">Change</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <label class="flex items-center gap-2 mt-3"><input type="checkbox" v-model="reviewChecked"/> I have reviewed my info</label>
              <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
                    <p class="mt-1 text-sm font-semibold text-slate-800">{{ locationStatusLabel }}</p>
                    <p class="mt-1 text-xs text-slate-500">Lat: {{ form.latitude || 'N/A' }} • Lng: {{ form.longitude || 'N/A' }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-[#0D1B2A]/12 bg-[#0D1B2A]/5 px-4 py-2.5 text-xs font-semibold text-[#0D1B2A] transition hover:bg-[#0D1B2A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="locationRefreshing"
                    @click="refreshLocation"
                  >
                    {{ locationRefreshing ? 'Fetching location...' : 'Use my current location' }}
                  </button>
                </div>
              </div>
              <iframe :src="mapUrl" class="w-full h-64 mt-4"></iframe>
            </div>
          </div>

          <!-- FOOTER -->
          <div
            v-if="hasRegistrationStatus"
            class="mt-4 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            :class="registrationStatusClass"
          >
            {{ registrationStatusText }}
          </div>
          <div class="mt-auto flex items-end justify-between border-t border-slate-200 pt-4">
            <button v-if="step>1" type="button" @click="prevStep" class="rounded-full px-5 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900">Back</button>
            <div class="ml-auto flex gap-3">
              <button
                v-if="step<totalSteps"
                type="button"
                @click="nextStep"
                :disabled="nextProcessing"
                :aria-busy="nextProcessing"
                class="rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,27,42,0.22)] transition-transform duration-150 hover:-translate-y-[1px] hover:bg-[#11263b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ nextActionLabel }}
              </button>
              <PrimaryButton
                v-else
                type="button"
                @click="submit"
                :disabled="form.processing || submitProcessing"
                :aria-busy="form.processing || submitProcessing"
                class="shadow-[0_14px_30px_rgba(13,27,42,0.22)]"
              >
                {{ submitButtonLabel }}
              </PrimaryButton>
            </div>
          </div>

        </form>
      </div>
    </div>
      </div>
    </div>
  </transition>

  <!-- OTP MODAL -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="otpModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.78)] p-4 backdrop-blur-md">
      <div class="w-full max-w-md overflow-hidden rounded-[26px] border border-[rgba(96,165,250,0.18)] bg-[linear-gradient(180deg,rgba(8,15,30,0.98),rgba(11,22,40,0.98))] p-6 shadow-[0_28px_60px_rgba(2,6,23,0.56),0_0_48px_rgba(14,165,233,0.12)]">
        <p class="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">Verification Layer</p>
        <h3 class="mb-4 mt-2 text-xl font-bold text-white">{{ otpModalTitle }}</h3>
        <div
          v-if="hasOtpStatus"
          class="mb-4 rounded-2xl border px-3 py-2 text-sm font-medium"
          :class="otpStatusClass"
        >
          {{ otpStatusText }}
        </div>
        <div v-if="sendingOtp && !otpSent" class="mb-4 inline-flex items-center gap-2 text-sm text-slate-300">
          <span class="h-[0.95rem] w-[0.95rem] rounded-full border-2 border-blue-200 border-t-[#3B82F6] animate-spin" aria-hidden="true"></span>
          <span>Sending verification code to <strong>{{ emailForOtp || form.email }}</strong>...</span>
        </div>
        <p v-else-if="otpSent" class="mb-4 text-sm text-slate-300">We sent a 6-digit code to <strong class="text-white">{{ emailForOtp }}</strong></p>
        <p v-else class="mb-4 text-sm text-slate-300">Waiting to send OTP to <strong class="text-white">{{ emailForOtp || form.email }}</strong>.</p>
        <TextInput
          v-model="otpCode"
          placeholder="Enter OTP"
          :disabled="sendingOtp || !otpSent"
          :class="otpStatusState === 'error' ? '!border-rose-400 !bg-rose-50/70 !text-rose-900 focus:!border-rose-500 focus:!ring-rose-200' : ''"
        />
        <div class="mt-3 text-sm text-slate-300">
          <button
            type="button"
            class="font-semibold text-[#93c5fd] hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
            :disabled="sendingOtp || resendCooldown > 0 || !otpSent"
            @click="resendOtp"
          >
            {{ resendOtpLabel }}
          </button>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="closeOtpModal"
            class="rounded-full px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <PrimaryButton @click="verifyOtp" :disabled="verifyingOtp || sendingOtp || !otpSent" class="shadow-[0_14px_30px_rgba(13,27,42,0.22)]">{{ verifyOtpLabel }}</PrimaryButton>
        </div>
      </div>
    </div>
  </transition>

</div>
</template>

<style scoped>
.auth-register-shell :deep(label) {
  color: #0d1b2a;
  font-size: 0.92rem;
  line-height: 1.25rem;
}

.auth-register-shell :deep(input.border-gray-300) {
  @apply rounded-2xl border-slate-200 px-3.5 py-2.5 text-slate-900 shadow-sm shadow-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500;
}

.auth-register-shell :deep(select) {
  @apply rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm shadow-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.auth-register-shell :deep(input[type='file']:not(.sr-only)) {
  @apply w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-[#0D1B2A] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#11263b];
}

.auth-register-shell :deep(label[for$='_file_review']) {
  @apply rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#11263b];
}

.auth-register-shell :deep(.text-teal-700),
.auth-register-shell :deep(.text-teal-700\/80),
.auth-register-shell :deep(.text-sky-700),
.auth-register-shell :deep(.text-cyan-300) {
  color: #0d1b2a;
}

.auth-register-shell :deep(.hover\:bg-cyan-50:hover) {
  background-color: rgba(59, 130, 246, 0.08);
}

.auth-register-shell :deep(.focus-visible\:outline-teal-700\/40:focus-visible) {
  outline-color: rgba(59, 130, 246, 0.4);
}

.auth-register-shell :deep(.focus\:border-teal-500:focus),
.auth-register-shell :deep(.focus\:ring-teal-200:focus) {
  border-color: rgb(59 130 246);
  --tw-ring-color: rgb(59 130 246);
}
</style>


