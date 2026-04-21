<script setup>
import BrandLockup from '@/Components/BrandLockup.vue'
import Checkbox from '@/Components/Checkbox.vue'
import InputError from '@/Components/InputError.vue'
import { Head, useForm } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createToastInterface, POSITION } from 'vue-toastification'
import {
  loginWithFirebase,
  setLoginRedirectSuppressed,
  sendPasswordResetWithFirebase,
} from '@/lib/firebase-auth'
import {
  prefetchWorkspaceRoutes,
  warmRoleDashboardData,
} from '@/lib/dashboard-prefetch'

const props = defineProps({
  canResetPassword: Boolean,
  status: String,
})

const form = useForm({
  email: '',
  password: '',
  remember: false,
})

const forgotForm = useForm({
  email: '',
  current_password: '',
  code: '',
  password: '',
  password_confirmation: '',
})

const showPassword = ref(false)
const capsLockOn = ref(false)
const localEmailError = ref('')
const localGeneralError = ref('')
const forgotModalOpen = ref(false)
const forgotStep = ref(1)
const forgotStatusState = ref('idle')
const forgotStatusText = ref('')
const forgotShowLastPassword = ref(false)
const forgotShowNewPassword = ref(false)
const forgotShowConfirmPassword = ref(false)
const submitState = ref('idle')
const submitStatusText = ref('')
const isPageLoading = ref(false)
const lockSeconds = ref(0)
const lampPullOffset = ref(0)
const lampPullAnchorY = ref(0)
const isLampPulling = ref(false)
const showLampReveal = ref(false)
const lampPullThreshold = 18
const lampPullMax = 90
const LAMP_REVEAL_KEY = 'auth_lamp_reveal'
let lockTimer = null
let submitSlowTimer = null
let submitLongTimer = null
const router = useRouter()
const waitForDashboardWarmup = (profile) => Promise.race([
  warmRoleDashboardData(profile),
  new Promise((resolve) => {
    window.setTimeout(resolve, 750)
  }),
])

const goToRoute = (path) => {
  const target = String(path || '/')
  return router.replace(target).catch(() => {
    window.location.replace(target)
  })
}

const isLocked = computed(() => lockSeconds.value > 0)
const isLampReadyToSwitch = computed(() => lampPullOffset.value >= lampPullThreshold)
const lampHintText = computed(() => (
  isLampReadyToSwitch.value
    ? 'Release to open Register'
    : 'Pull cord to open Register'
))
const canSubmit = computed(() => (
  !form.processing &&
  !isLocked.value &&
  form.email.trim().length > 0 &&
  form.password.length > 0 &&
  !localEmailError.value
))
const submitLabel = computed(() => {
  if (isLocked.value) return `WAIT ${lockSeconds.value}s`
  if (form.processing) return 'SIGNING IN...'
  return 'LOG IN'
})
const hasStatusNotice = computed(() => submitState.value === 'error' && submitStatusText.value.trim().length > 0)
const forgotHasStatus = computed(() => forgotStatusState.value !== 'idle' && forgotStatusText.value.trim().length > 0)
const forgotStepTitle = computed(() => {
  if (forgotStep.value === 1) return 'Verify your account'
  if (forgotStep.value === 2) return 'Enter email code'
  return 'Create a new password'
})
const forgotStepDescription = computed(() => {
  if (forgotStep.value === 1) return 'Enter your email address and the last password you still remember for this account.'
  if (forgotStep.value === 2) return 'We sent a 6-digit code to your email. Enter it below to continue.'
  return 'Set your new password after the email code has been confirmed.'
})
const forgotPrimaryLabel = computed(() => {
  if (forgotForm.processing) {
    if (forgotStep.value === 1) return 'Sending code...'
    if (forgotStep.value === 2) return 'Verifying code...'
    return 'Updating password...'
  }

  if (forgotStep.value === 1) return 'Send Code'
  if (forgotStep.value === 2) return 'Verify Code'
  return 'Save New Password'
})
const forgotCanSubmit = computed(() => {
  if (forgotForm.processing) return false

  if (forgotStep.value === 1) {
    return forgotForm.email.trim().length > 0 && forgotForm.current_password.length > 0
  }

  if (forgotStep.value === 2) {
    return forgotForm.code.trim().length === 6
  }

  return (
    forgotForm.password.length > 0 &&
    forgotForm.password_confirmation.length > 0
  )
})
const isFirebaseError = computed(() => /firebase|google|token|unreachable/i.test(localGeneralError.value || ''))
const statusNoticeClass = computed(() => {
  if (submitState.value === 'error') {
    return 'border-[rgba(248,113,113,0.5)] bg-[rgba(127,29,29,0.25)] text-[#fecaca]'
  }

  return 'border-[rgba(196,181,253,0.45)] bg-[rgba(76,29,149,0.22)] text-[#ddd6fe]'
})
const forgotStatusClass = computed(() => {
  if (forgotStatusState.value === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (forgotStatusState.value === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return 'border-sky-200 bg-sky-50 text-sky-700'
})
const toast = (typeof window !== 'undefined' && window.__appFeedbackToast)
  ? window.__appFeedbackToast
  : createToastInterface({
      position: POSITION.TOP_RIGHT,
      timeout: 2400,
      closeOnClick: true,
      pauseOnHover: true,
    })
if (typeof window !== 'undefined' && !window.__appFeedbackToast) {
  window.__appFeedbackToast = toast
}

const AUTH_PROGRESS_TOAST_ID = 'auth-login-progress'

const showAuthToast = (type, message, timeout = 2400) => {
  const handler = toast?.[type]
  if (typeof handler !== 'function' || !message) return
  handler(message, { timeout })
}

const dismissAuthProgressToast = () => {
  if (typeof toast?.dismiss === 'function') {
    toast.dismiss(AUTH_PROGRESS_TOAST_ID)
  }
}

const upsertAuthProgressToast = (type, message, options = {}) => {
  if (!message) return

  const nextOptions = {
    id: AUTH_PROGRESS_TOAST_ID,
    closeButton: false,
    closeOnClick: false,
    draggable: false,
    pauseOnHover: false,
    pauseOnFocusLoss: false,
    ...options,
  }

  if (typeof toast?.update === 'function') {
    toast.update(
      AUTH_PROGRESS_TOAST_ID,
      {
        content: message,
        options: {
          ...nextOptions,
          type,
        },
      },
      true,
    )
    return
  }

  dismissAuthProgressToast()

  const handler = toast?.[type]
  if (typeof handler === 'function') {
    handler(message, nextOptions)
  }
}

const showSubmittingToast = (message) => {
  upsertAuthProgressToast('info', message, {
    timeout: false,
    hideProgressBar: true,
    icon: false,
  })
}

const showRedirectingToast = (message, timeout = 1200) => {
  upsertAuthProgressToast('success', message, {
    timeout,
    hideProgressBar: false,
  })
}

const setForgotStatus = (state, text) => {
  forgotStatusState.value = state
  forgotStatusText.value = text
}

const firstErrorMessage = (errors, fallback) => {
  if (!errors || typeof errors !== 'object') return fallback

  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0])
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return fallback
}

const applyForgotErrors = (errors = {}) => {
  forgotForm.clearErrors()

  Object.entries(errors).forEach(([field, value]) => {
    forgotForm.setError(field, Array.isArray(value) ? value[0] : value)
  })
}

const resetForgotState = (keepEmail = false) => {
  const currentEmail = keepEmail ? forgotForm.email : form.email.trim()
  forgotForm.reset()
  forgotForm.clearErrors()
  forgotForm.email = currentEmail
  forgotStep.value = 1
  forgotShowLastPassword.value = false
  forgotShowNewPassword.value = false
  forgotShowConfirmPassword.value = false
  setForgotStatus('idle', '')
}

const openForgotPasswordModal = () => {
  resetForgotState(true)
  forgotForm.email = form.email.trim()
  forgotModalOpen.value = true
}

const closeForgotPasswordModal = () => {
  forgotModalOpen.value = false
  resetForgotState()
}

const stopLockTimer = () => {
  if (lockTimer) {
    clearInterval(lockTimer)
    lockTimer = null
  }
}

const stopSubmitTimers = () => {
  if (submitSlowTimer) {
    clearTimeout(submitSlowTimer)
    submitSlowTimer = null
  }

  if (submitLongTimer) {
    clearTimeout(submitLongTimer)
    submitLongTimer = null
  }
}

const startSubmitTimers = () => {
  stopSubmitTimers()

  submitSlowTimer = window.setTimeout(() => {
    if (!form.processing || submitState.value !== 'submitting') return
    submitStatusText.value = 'Still checking your account. Please wait a moment...'
    showSubmittingToast(submitStatusText.value)
  }, 2500)

  submitLongTimer = window.setTimeout(() => {
    if (!form.processing || submitState.value !== 'submitting') return
    submitStatusText.value = 'Still contacting the server. You will see the real result as soon as it responds...'
    showSubmittingToast(submitStatusText.value)
  }, 8000)
}

const startLockCountdown = (seconds) => {
  const total = Number(seconds || 0)
  if (!Number.isFinite(total) || total <= 0) return
  lockSeconds.value = Math.max(0, Math.round(total))
  stopLockTimer()
  lockTimer = setInterval(() => {
    lockSeconds.value = Math.max(0, lockSeconds.value - 1)
    if (lockSeconds.value <= 0) {
      stopLockTimer()
    }
  }, 1000)
}

const validateEmail = () => {
  const email = form.email.trim()
  form.email = email

  if (!email) {
    localEmailError.value = 'Email is required.'
    return false
  }

  const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!validEmailPattern.test(email)) {
    localEmailError.value = 'Please enter a valid email address.'
    return false
  }

  localEmailError.value = ''
  return true
}

const updateCapsLockState = (event) => {
  capsLockOn.value = Boolean(event?.getModifierState?.('CapsLock'))
}

const hideCapsLockHint = () => {
  capsLockOn.value = false
}

const getLampPointerY = (event) => (typeof event?.clientY === 'number' ? event.clientY : null)

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
  if (typeof window === 'undefined' || isPageLoading.value || form.processing) return
  if (reveal) {
    markLampReveal()
  }
  isPageLoading.value = true
  showAuthToast('info', label, 900)
  window.setTimeout(async () => {
    try {
      await goToRoute(path)
    } finally {
      isPageLoading.value = false
    }
  }, 120)
}

const goToHome = () => navigateWithLoading('/', 'Returning to landing page...')
const goToRegister = () => navigateWithLoading('/register', 'Opening registration...', { reveal: true })

const startLampPull = (event) => {
  const pointerY = getLampPointerY(event)
  if (pointerY === null) return
  isLampPulling.value = true
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

const endLampPull = (event) => {
  if (!isLampPulling.value) return
  isLampPulling.value = false
  event?.currentTarget?.releasePointerCapture?.(event.pointerId)
  const shouldSwitch = lampPullOffset.value >= lampPullThreshold
  lampPullOffset.value = 0
  if (shouldSwitch) {
    goToRegister()
  }
}

const submit = () => {
  submitLogin()
}

const submitForgotPasswordStep = async () => {
  if (forgotStep.value === 1) {
    await requestForgotPasswordCode()
    return
  }

  if (forgotStep.value === 2) {
    await verifyForgotPasswordCode()
    return
  }

  await saveForgotPassword()
}

const requestForgotPasswordCode = async () => {
  forgotForm.processing = true
  forgotForm.clearErrors()
  setForgotStatus('info', 'Sending your Firebase reset link...')

  try {
    await sendPasswordResetWithFirebase(forgotForm.email)
    const successMessage = 'Password reset email sent. Check your inbox and follow the Firebase reset link.'
    forgotStep.value = 1
    forgotForm.current_password = ''
    forgotForm.code = ''
    closeForgotPasswordModal()
    submitState.value = 'success'
    submitStatusText.value = successMessage
    showAuthToast('success', successMessage, 3200)
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Unable to send a reset email right now.'
    applyForgotErrors({ email: message })
    setForgotStatus('error', message)
    showAuthToast('error', message, 2800)
  } finally {
    forgotForm.processing = false
  }
}

const verifyForgotPasswordCode = async () => {
  setForgotStatus('info', 'Firebase password reset now uses the email link we just sent.')
  showAuthToast('info', 'Use the reset link from your email to continue.', 2600)
}

const saveForgotPassword = async () => {
  setForgotStatus('info', 'Finish the password reset from the email link, then sign in again here.')
  showAuthToast('info', 'Check your email to finish resetting your password.', 2600)
}

const submitLogin = async () => {
  localGeneralError.value = ''
  submitState.value = 'idle'
  submitStatusText.value = ''
  const isEmailValid = validateEmail()

  if (isLocked.value) {
    localGeneralError.value = `Too many attempts. Please wait ${lockSeconds.value} second(s).`
    submitState.value = 'error'
    submitStatusText.value = localGeneralError.value
    showAuthToast('warning', localGeneralError.value, 2600)
    return
  }

  if (!isEmailValid) {
    submitState.value = 'error'
    submitStatusText.value = localEmailError.value
    showAuthToast('error', localEmailError.value)
    return
  }

  if (!form.password) {
    form.setError('password', 'Password is required.')
    submitState.value = 'error'
    submitStatusText.value = 'Password is required.'
    showAuthToast('error', 'Password is required.')
    return
  }

  form.processing = true
  submitState.value = 'submitting'
  submitStatusText.value = 'Checking your account...'
  form.clearErrors()
  setLoginRedirectSuppressed(true)
  showSubmittingToast(submitStatusText.value)
  startSubmitTimers()

  try {
    const response = await loginWithFirebase({
      email: form.email,
      password: form.password,
      remember: form.remember,
    })
    stopSubmitTimers()
    const redirect = String(response?.redirect || '/Public/Dashboard')
    submitState.value = 'success'
    submitStatusText.value = 'Login successful. Redirecting to your dashboard...'
    form.processing = false
    setLoginRedirectSuppressed(false)
    prefetchWorkspaceRoutes(response?.profile, router).catch(() => {})
    await waitForDashboardWarmup(response?.profile).catch(() => {})
    showRedirectingToast(submitStatusText.value, 1200)
    await goToRoute(redirect)
  } catch (error) {
    stopSubmitTimers()
    submitState.value = 'error'
    form.processing = false
    setLoginRedirectSuppressed(false)
    dismissAuthProgressToast()

    const timeoutError = error?.code === 'ECONNABORTED'
      || String(error?.message || '').toLowerCase().includes('timeout')

    if (timeoutError) {
      localGeneralError.value = 'Login is taking too long. Please try again.'
      submitStatusText.value = localGeneralError.value
      showAuthToast('error', localGeneralError.value, 2600)
      form.reset('password')
      hideCapsLockHint()
      return
    }

    if (!error?.response) {
      localGeneralError.value = error instanceof Error
        ? error.message
        : 'The login service could not be reached. Please check your Firebase config and try again.'
      submitStatusText.value = localGeneralError.value
      showAuthToast('error', localGeneralError.value, 3000)
      form.reset('password')
      hideCapsLockHint()
      return
    }

    const errors = error?.response?.data?.errors || {}
    const waitSeconds = Number(errors?.lock_seconds || 0)
    if (Number.isFinite(waitSeconds) && waitSeconds > 0) {
      startLockCountdown(waitSeconds)
      submitStatusText.value = `Too many attempts. Wait ${Math.round(waitSeconds)} second(s).`
      showAuthToast('warning', submitStatusText.value, 2600)
    }

    if (errors?.error) {
      localGeneralError.value = Array.isArray(errors.error) ? errors.error[0] : errors.error
      submitStatusText.value = localGeneralError.value
      showAuthToast('error', localGeneralError.value, 3000)
      form.reset('password')
      hideCapsLockHint()
      return
    }

    const fallbackError =
      (Array.isArray(errors?.email) ? errors.email[0] : errors?.email) ||
      (Array.isArray(errors?.password) ? errors.password[0] : errors?.password) ||
      (Number(error?.response?.status || 0) >= 500
        ? 'Login failed because Firebase is not ready. Please try again.'
        : 'Login failed. Please check your email and password.')

    localGeneralError.value = String(fallbackError)
    submitStatusText.value = String(fallbackError)
    showAuthToast('error', String(fallbackError), 3000)
    form.reset('password')
    hideCapsLockHint()
  }
}

watch(() => form.email, () => {
  localEmailError.value = ''
  localGeneralError.value = ''
  form.clearErrors('email')
})

watch(() => form.password, () => {
  localGeneralError.value = ''
  form.clearErrors('password')
})

watch(() => forgotForm.email, () => {
  forgotForm.clearErrors('email')
})

watch(() => forgotForm.current_password, () => {
  forgotForm.clearErrors('current_password')
})

watch(() => forgotForm.code, () => {
  forgotForm.clearErrors('code')
})

watch(() => forgotForm.password, () => {
  forgotForm.clearErrors('password')
})

watch(() => forgotForm.password_confirmation, () => {
  forgotForm.clearErrors('password_confirmation')
})

onMounted(() => {
  setLoginRedirectSuppressed(false)
  dismissAuthProgressToast()
  showLampReveal.value = consumeLampReveal()
  stopLockTimer()
  stopSubmitTimers()
  if (props.status) {
    submitState.value = 'success'
    submitStatusText.value = props.status
    showAuthToast('success', props.status, 3200)
  }
})

onBeforeUnmount(() => {
  if (submitState.value === 'submitting') {
    dismissAuthProgressToast()
  }
  if (submitState.value !== 'success') {
    setLoginRedirectSuppressed(false)
  }
  stopLockTimer()
  stopSubmitTimers()
})
</script>

<template>
  <Head title="Login" />

  <div class="auth-login-shell relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18)_0%,rgba(59,130,246,0.08)_24%,transparent_46%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14)_0%,rgba(59,130,246,0.06)_22%,transparent_44%),linear-gradient(180deg,#07111d_0%,#091624_42%,#0D1B2A_100%)] p-5 font-sans max-[1120px]:overflow-y-auto max-[1120px]:px-[14px] max-[1120px]:py-5">
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -left-24 top-2 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.32)_0%,rgba(59,130,246,0.12)_34%,transparent_72%)] blur-3xl"></div>
      <div class="absolute right-[-5rem] top-6 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(13,27,42,0.42)_0%,rgba(13,27,42,0.14)_38%,transparent_74%)] blur-3xl"></div>
      <div class="absolute bottom-[-7rem] left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2)_0%,rgba(59,130,246,0.08)_38%,transparent_78%)] blur-3xl"></div>
    </div>

    <div class="relative h-[min(650px,calc(100dvh-28px))] w-full max-w-[1180px] overflow-hidden rounded-[36px] border border-white/55 bg-white/86 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-md max-[1120px]:h-auto">
      <div class="grid h-full lg:grid-cols-[0.96fr_1.04fr] max-[1120px]:h-auto max-[1120px]:grid-cols-1">
        <section class="relative flex min-h-[320px] h-full flex-col justify-between overflow-hidden bg-[#0D1B2A] px-6 py-5 text-white md:px-8 md:py-6 lg:min-h-0 max-[1120px]:min-h-[300px]" :class="showLampReveal ? 'animate-auth-panel-drop origin-left motion-reduce:animate-none' : ''" aria-hidden="true">
          <div class="absolute inset-0 bg-cover" style="background-image: url('/images/landing-plumbing-hero.png'); background-position: 66% 15%; background-size: 126% auto;"></div>
          <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,20,0.3)_0%,rgba(5,12,20,0.62)_46%,rgba(5,12,20,0.94)_100%)]"></div>
          <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,27,42,0.92)_0%,rgba(13,27,42,0.7)_42%,rgba(13,27,42,0.2)_100%)]"></div>
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.16),transparent_24%)]"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.02)_0%,rgba(13,27,42,0)_28%,rgba(13,27,42,0.08)_52%,rgba(13,27,42,0.32)_76%,rgba(13,27,42,0.72)_100%)]"></div>
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
            <div class="rounded-full border border-white/14 bg-[rgba(10,22,36,0.88)] px-4 py-2.5 shadow-[0_20px_50px_rgba(2,8,20,0.35)] backdrop-blur-xl">
              <BrandLockup theme="light" compact />
            </div>

            <span class="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/12 px-3.5 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md shadow-[0_14px_28px_rgba(2,6,23,0.14)]">
              Secure Access
            </span>
          </div>

          <div class="relative z-10 max-w-[23.5rem] space-y-2.5">
            <p class="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#3B82F6]">Customer And Operations Access</p>
            <h1 class="max-w-[10ch] text-[clamp(2.45rem,5.6vw,4.75rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">
              Manage bookings from one cleaner workspace.
            </h1>
            <p class="max-w-[22rem] text-[0.78rem] leading-5 text-slate-200/88">
              Designed for thesis presentation and real service flow, with clearer access to customer requests, approvals, and field coordination.
            </p>
          </div>

        </section>

        <section class="relative flex h-full flex-col justify-center bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12)_0%,rgba(59,130,246,0.05)_18%,transparent_40%),radial-gradient(circle_at_bottom_left,rgba(13,27,42,0.08)_0%,rgba(13,27,42,0.03)_18%,transparent_40%),linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(242,247,255,0.97)_44%,rgba(235,242,250,0.96)_100%)] px-6 py-5 md:px-8 md:py-6 lg:px-10 max-[1120px]:px-5 max-[1120px]:py-6" :class="showLampReveal ? 'animate-auth-panel-drop origin-top-right motion-reduce:animate-none' : ''">
          <div class="mx-auto w-full max-w-[410px]">
            <div class="flex items-center justify-between gap-3 max-[860px]:flex-col max-[860px]:items-start">
              <button type="button" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isPageLoading || form.processing" @click="goToHome">
                <span aria-hidden="true">&larr;</span>
                <span>Back to Home</span>
              </button>
              <p class="text-sm text-slate-500 max-[860px]:pl-1">
                No account yet?
                <button type="button" class="font-semibold text-[#0D1B2A] hover:text-[#11263b] hover:underline disabled:cursor-not-allowed disabled:opacity-60" :disabled="isPageLoading || form.processing" @click="goToRegister">Register</button>
              </p>
            </div>

            <div class="mt-4.5">
              <p class="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#0D1B2A]">Welcome Back</p>
              <h1 class="mt-1.5 text-[clamp(2.25rem,4.3vw,4rem)] font-bold leading-[0.9] tracking-[-0.06em] text-[#0D1B2A] max-[960px]:mt-0">Sign in</h1>
              <p class="mt-1.5 text-[0.84rem] leading-5 text-slate-600">
                Access your customer dashboard, service updates, or business-side operations with a cleaner thesis-ready login experience.
              </p>
            </div>

          <p v-if="status" class="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ status }}</p>
          <div
            v-if="localGeneralError"
            class="mt-2.5 rounded-2xl border px-4 py-3 text-sm shadow-sm"
            :class="isFirebaseError
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-rose-200 bg-rose-50 text-rose-700'"
          >
            <p class="font-semibold">
              {{ isFirebaseError ? 'Login service unavailable' : 'Login could not be completed' }}
            </p>
            <p class="mt-1 leading-6">
              {{ localGeneralError }}
            </p>
          </div>
          <p
            v-if="hasStatusNotice && !localGeneralError"
            class="mt-2.5 rounded-2xl border px-4 py-3 text-sm"
            :class="statusNoticeClass"
          >
            {{ submitStatusText }}
          </p>

          <form class="mt-3.5 grid gap-2.5" @submit.prevent="submit">
            <div class="w-full">
              <label for="email" class="mb-1.5 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Email Address</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="username"
                placeholder="name@example.com"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[0.95rem] text-slate-900 shadow-sm shadow-slate-100 transition duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-65"
                :disabled="form.processing || isLocked"
                required
                autofocus
                @blur="validateEmail"
              />
              <InputError :message="localEmailError || form.errors.email" class="mt-2" />
            </div>

            <div class="w-full">
              <div class="mb-1.5 flex items-center justify-between gap-3">
                <label for="password" class="block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Password</label>
              </div>
              <div class="relative">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-16 text-[0.95rem] text-slate-900 shadow-sm shadow-slate-100 transition duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-65"
                  :disabled="form.processing || isLocked"
                  required
                  @keydown="updateCapsLockState"
                  @keyup="updateCapsLockState"
                  @blur="hideCapsLockHint"
                />
                <button
                  type="button"
                class="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="form.processing"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.88"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                    <path d="M14.12 14.12A3 3 0 0 0 9.88 9.88"/>
                    <path d="M23 12s-1.64 3.28-4.12 5.88"/>
                  </svg>
                </button>
              </div>
              <p v-if="capsLockOn" class="mt-2 text-[0.8rem] text-amber-600">Caps Lock is on.</p>
              <InputError :message="form.errors.password" class="mt-2" />
            </div>

            <div class="mt-0.5 flex items-center justify-between gap-3 max-[560px]:flex-col max-[560px]:items-start">
              <label class="inline-flex items-center gap-2 text-[0.92rem] text-slate-600">
                <Checkbox name="remember" v-model:checked="form.remember" />
                <span>Remember me</span>
              </label>
              <button
                v-if="canResetPassword"
                type="button"
                class="text-[0.88rem] font-semibold text-[#0D1B2A] hover:text-[#11263b] hover:underline"
                @click="openForgotPasswordModal"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              class="mt-1 w-full rounded-full bg-[#0D1B2A] px-6 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_18px_38px_rgba(13,27,42,0.22)] transition duration-150 hover:-translate-y-[1px] hover:bg-[#11263b] hover:shadow-[0_24px_42px_rgba(13,27,42,0.26)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              :disabled="!canSubmit"
            >
              <span v-if="form.processing" class="relative -top-[1px] mr-2 inline-block h-[13px] w-[13px] rounded-full border-2 border-white/35 border-t-white animate-spin" aria-hidden="true"></span>
              {{ submitLabel }}
            </button>

            <p v-if="isLocked" class="text-[0.84rem] text-amber-600">
              Too many failed attempts. Try again in {{ lockSeconds }} second(s).
            </p>
          </form>
          </div>
        </section>
      </div>
    </div>

    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-[0.98]" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-[0.98]">
      <div v-if="forgotModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.46)] px-4 py-6 backdrop-blur-[10px]">
        <div class="w-full max-w-[34rem] overflow-hidden rounded-[30px] border border-white/70 bg-white/96 shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
          <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f3f7fd_100%)] px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0D1B2A]">Password Recovery</p>
                <h2 class="mt-2 text-[1.65rem] font-bold tracking-[-0.04em] text-slate-900">{{ forgotStepTitle }}</h2>
                <p class="mt-2 max-w-[28rem] text-[0.92rem] leading-6 text-slate-600">{{ forgotStepDescription }}</p>
              </div>
              <button
                type="button"
                class="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-[1.65rem] leading-none text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Close password recovery"
                @click="closeForgotPasswordModal"
              >
                &times;
              </button>
            </div>

            <div class="mt-4 flex items-center gap-2">
              <span :class="forgotStep >= 1 ? 'bg-[#0D1B2A] text-white' : 'bg-slate-100 text-slate-500'" class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[0.76rem] font-bold">1</span>
              <span :class="forgotStep >= 2 ? 'bg-[#0D1B2A] text-white' : 'bg-slate-100 text-slate-500'" class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[0.76rem] font-bold">2</span>
              <span :class="forgotStep >= 3 ? 'bg-[#0D1B2A] text-white' : 'bg-slate-100 text-slate-500'" class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[0.76rem] font-bold">3</span>
            </div>
          </div>

          <div class="bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fe_100%)] px-6 py-5">
            <p
              v-if="forgotHasStatus"
              class="mb-4 rounded-2xl border px-4 py-3 text-sm"
              :class="forgotStatusClass"
            >
              {{ forgotStatusText }}
            </p>

            <form class="grid gap-4" @submit.prevent="submitForgotPasswordStep">
              <div>
                <label for="forgot-email" class="mb-2 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Email Address</label>
                <input
                  id="forgot-email"
                  v-model="forgotForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="name@example.com"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[1rem] text-slate-900 shadow-sm shadow-slate-100 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :readonly="forgotStep > 1"
                />
                <InputError :message="forgotForm.errors.email" class="mt-2" />
              </div>

              <div v-if="forgotStep === 1">
                <label for="forgot-current-password" class="mb-2 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Last Password</label>
                <div class="relative">
                  <input
                    id="forgot-current-password"
                    v-model="forgotForm.current_password"
                    :type="forgotShowLastPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="Enter the last password you remember"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-24 text-[1rem] text-slate-900 shadow-sm shadow-slate-100 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    @click="forgotShowLastPassword = !forgotShowLastPassword"
                  >
                    {{ forgotShowLastPassword ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <InputError :message="forgotForm.errors.current_password" class="mt-2" />
              </div>

              <div v-if="forgotStep === 2">
                <label for="forgot-code" class="mb-2 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Email Code</label>
                <input
                  id="forgot-code"
                  v-model="forgotForm.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="Enter the 6-digit code"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[1rem] tracking-[0.3em] text-slate-900 shadow-sm shadow-slate-100 transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <InputError :message="forgotForm.errors.code" class="mt-2" />
              </div>

              <template v-if="forgotStep === 3">
                <div>
                  <label for="forgot-new-password" class="mb-2 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">New Password</label>
                  <div class="relative">
                    <input
                      id="forgot-new-password"
                      v-model="forgotForm.password"
                      :type="forgotShowNewPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Create a new password"
                      class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-24 text-[1rem] text-slate-900 shadow-sm shadow-slate-100 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      @click="forgotShowNewPassword = !forgotShowNewPassword"
                    >
                      {{ forgotShowNewPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <InputError :message="forgotForm.errors.password" class="mt-2" />
                </div>

                <div>
                  <label for="forgot-confirm-password" class="mb-2 block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Confirm Password</label>
                  <div class="relative">
                    <input
                      id="forgot-confirm-password"
                      v-model="forgotForm.password_confirmation"
                      :type="forgotShowConfirmPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Re-enter the new password"
                      class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-24 text-[1rem] text-slate-900 shadow-sm shadow-slate-100 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      @click="forgotShowConfirmPassword = !forgotShowConfirmPassword"
                    >
                      {{ forgotShowConfirmPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <InputError :message="forgotForm.errors.password_confirmation" class="mt-2" />
                  <InputError :message="forgotForm.errors.code" class="mt-2" />
                </div>
              </template>

              <div class="mt-2 flex items-center justify-between gap-3 max-[560px]:flex-col-reverse max-[560px]:items-stretch">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  @click="closeForgotPasswordModal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(13,27,42,0.22)] transition hover:-translate-y-[1px] hover:bg-[#11263b] hover:shadow-[0_22px_38px_rgba(13,27,42,0.26)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                  :disabled="!forgotCanSubmit"
                >
                  <span v-if="forgotForm.processing" class="relative -top-[1px] mr-2 inline-block h-[13px] w-[13px] rounded-full border-2 border-white/35 border-t-white animate-spin" aria-hidden="true"></span>
                  {{ forgotPrimaryLabel }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.auth-login-shell :deep(input[type='email']),
.auth-login-shell :deep(input[type='password']),
.auth-login-shell :deep(input[type='text']) {
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}
</style>
