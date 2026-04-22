const PROFESSIONAL_TOAST_STYLE_ID = 'professional-feedback-toast-style'
const PROFESSIONAL_TOAST_CLASS = 'professional-feedback-toast'
const PROFESSIONAL_TOAST_BODY_CLASS = 'professional-feedback-toast-body'
const PROFESSIONAL_TOAST_SUCCESS_CLASS = 'professional-feedback-toast-success'
const PROFESSIONAL_TOAST_ERROR_CLASS = 'professional-feedback-toast-error'
const PROFESSIONAL_TOAST_INFO_CLASS = 'professional-feedback-toast-info'
const PROFESSIONAL_TOAST_WARNING_CLASS = 'professional-feedback-toast-warning'

export const ensureProfessionalFeedbackToastStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(PROFESSIONAL_TOAST_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = PROFESSIONAL_TOAST_STYLE_ID
  style.textContent = `
    .${PROFESSIONAL_TOAST_CLASS} {
      min-height: 0 !important;
      border-radius: 20px !important;
      border: 1px solid rgba(148, 163, 184, 0.18) !important;
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18) !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .${PROFESSIONAL_TOAST_SUCCESS_CLASS} {
      background: linear-gradient(135deg, #f8fffd 0%, #ecfeff 52%, #f0fdf4 100%) !important;
      border-left: 4px solid #0f766e !important;
    }
    .${PROFESSIONAL_TOAST_ERROR_CLASS} {
      background: linear-gradient(135deg, #fff7ed 0%, #fff1f2 54%, #ffffff 100%) !important;
      border-left: 4px solid #dc2626 !important;
    }
    .${PROFESSIONAL_TOAST_INFO_CLASS} {
      background: linear-gradient(135deg, #f5fbff 0%, #ecfeff 48%, #f8fafc 100%) !important;
      border-left: 4px solid #0891b2 !important;
    }
    .${PROFESSIONAL_TOAST_WARNING_CLASS} {
      background: linear-gradient(135deg, #fffaf0 0%, #fef3c7 44%, #ffffff 100%) !important;
      border-left: 4px solid #d97706 !important;
    }
    .${PROFESSIONAL_TOAST_BODY_CLASS} {
      padding: 14px 40px 14px 16px !important;
      white-space: pre-line !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      letter-spacing: -0.01em !important;
    }
    .${PROFESSIONAL_TOAST_BODY_CLASS}::first-line {
      color: #020617 !important;
    }
  `
  document.head.appendChild(style)
}

export const showProfessionalFeedbackToast = (toast, type, title, detail = '', timeout = 3600) => {
  ensureProfessionalFeedbackToastStyles()

  const handler = toast?.[type]
  if (typeof handler !== 'function' || !title) {
    return
  }

  const normalizedType = String(type || 'info').trim().toLowerCase()
  const toneClass = {
    success: PROFESSIONAL_TOAST_SUCCESS_CLASS,
    error: PROFESSIONAL_TOAST_ERROR_CLASS,
    info: PROFESSIONAL_TOAST_INFO_CLASS,
    warning: PROFESSIONAL_TOAST_WARNING_CLASS,
  }[normalizedType] || PROFESSIONAL_TOAST_INFO_CLASS

  return handler(detail ? `${title}\n${detail}` : title, {
    timeout,
    icon: false,
    closeButton: 'button',
    hideProgressBar: true,
    toastClassName: [PROFESSIONAL_TOAST_CLASS, toneClass],
    bodyClassName: PROFESSIONAL_TOAST_BODY_CLASS,
  })
}
