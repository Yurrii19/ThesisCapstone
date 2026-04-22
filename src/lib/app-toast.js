const PENDING_APP_TOAST_KEY = 'thesis_capstone_pending_app_toast'

const canUseSessionStorage = () => typeof window !== 'undefined' && Boolean(window.sessionStorage)

export const queueAppToast = ({ type = 'info', message = '', timeout = 2400 } = {}) => {
  if (!canUseSessionStorage()) return false

  const normalizedMessage = String(message || '').trim()
  if (!normalizedMessage) return false

  try {
    window.sessionStorage.setItem(PENDING_APP_TOAST_KEY, JSON.stringify({
      type: String(type || 'info').trim().toLowerCase() || 'info',
      message: normalizedMessage,
      timeout: Number(timeout || 0) || 2400,
    }))
    return true
  } catch {
    return false
  }
}

export const consumeQueuedAppToast = () => {
  if (!canUseSessionStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(PENDING_APP_TOAST_KEY)
    if (!raw) return null

    window.sessionStorage.removeItem(PENDING_APP_TOAST_KEY)
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? {
          type: String(parsed.type || 'info').trim().toLowerCase() || 'info',
          message: String(parsed.message || '').trim(),
          timeout: Number(parsed.timeout || 0) || 2400,
        }
      : null
  } catch {
    return null
  }
}

export const queueLoggedOutToast = () => queueAppToast({
  type: 'info',
  message: 'Logged out',
  timeout: 2200,
})
