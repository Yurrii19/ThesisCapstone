import { createToastInterface, POSITION } from 'vue-toastification'

const toast = (typeof window !== 'undefined' && window.__appFeedbackToast)
  || createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 1800,
  closeOnClick: true,
  closeButton: 'button',
  showCloseButtonOnHover: false,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  maxToasts: 4,
  newestOnTop: true,
})
if (typeof window !== 'undefined' && !window.__appFeedbackToast) {
  window.__appFeedbackToast = toast
}

const iconToType = (icon) => {
  const normalized = String(icon || '').toLowerCase()
  if (normalized === 'success') return 'success'
  if (normalized === 'error') return 'error'
  if (normalized === 'warning') return 'warning'
  if (normalized === 'question') return 'info'
  return 'info'
}

const GENERIC_TITLES = new Set([
  'success',
  'error',
  'warning',
  'info',
  'done',
  'saved',
  'updated',
  'required',
  'oops',
  'invalid',
  'copied',
  'failed',
])

const inferTypeFromContent = (options) => {
  const raw = [
    String(options?.title || ''),
    String(options?.text || ''),
    String(options?.html || ''),
  ].join(' ').toLowerCase()

  if (/\berror|failed|unable|invalid\b/.test(raw)) return 'error'
  if (/\bwarning|required|missing\b/.test(raw)) return 'warning'
  if (/\bsuccess|saved|updated|approved|completed|copied|restored|archived\b/.test(raw)) return 'success'
  return 'info'
}

const canonicalTitle = (type) => {
  if (type === 'success') return 'Success'
  if (type === 'error') return 'Error'
  if (type === 'warning') return 'Warning'
  return 'Info'
}

const htmlToToastText = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (typeof document === 'undefined') {
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }

  const node = document.createElement('div')
  node.innerHTML = raw

  node.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  node.querySelectorAll('p, div, li').forEach((el) => {
    if (el.nextSibling) {
      el.appendChild(document.createTextNode('\n'))
    }
  })

  return (node.textContent || node.innerText || '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const normalizeToastPayload = (options) => {
  const explicitType = iconToType(options?.icon)
  const type = explicitType === 'info' ? inferTypeFromContent(options) : explicitType

  const titleRaw = String(options?.title || '').trim()
  const textRaw = String(options?.text || '').trim()
  const htmlRaw = htmlToToastText(options?.html)

  const text = textRaw || htmlRaw
  const titleLower = titleRaw.toLowerCase()
  const useTitleAsBody = titleRaw !== '' && (text === '' || GENERIC_TITLES.has(titleLower))
  const body = useTitleAsBody ? (text || titleRaw) : text

  return {
    type,
    title: canonicalTitle(type),
    body: body || 'Notification',
  }
}

const messageFrom = (payload) => `${payload.title}: ${payload.body}`

const shouldDisplayToast = (payload) => {
  if (!payload) return false
  return true
}

const parseFireArgs = (args) => {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return { ...args[0] }
  }
  return {
    title: args[0] ?? '',
    text: args[1] ?? '',
    icon: args[2] ?? 'info',
  }
}

const withTimeout = (options, type) => {
  if (typeof options?.timer === 'number' && options.timer > 0) return options.timer
  if (type === 'error') return 2000
  if (type === 'warning') return 1800
  if (type === 'success') return 1400
  return 1600
}

const wait = (ms) =>
  new Promise((resolve) => {
    if (!ms || ms <= 0) return resolve()
    setTimeout(resolve, ms)
  })

const isLoadingStyle = (options) => {
  if (typeof options?.timer === 'number' && options.timer > 0) return false
  if (options?.showCancelButton) return false
  if (options?.input) return false
  if (options?.allowOutsideClick !== false) return false
  if (options?.showConfirmButton === false) return true
  return false
}

let activeDialog = null
let styleInjected = false
let activeLoadingToastId = null
let activeValidationNode = null

const removeActiveDialog = () => {
  if (!activeDialog) return
  activeDialog.remove()
  activeDialog = null
  activeValidationNode = null
}

const showDialogValidationMessage = (message) => {
  if (!activeValidationNode) return
  const text = String(message || '').trim()
  activeValidationNode.textContent = text
  activeValidationNode.style.display = text ? 'block' : 'none'
}

const ensureDialogStyles = () => {
  if (styleInjected) return
  styleInjected = true

  const style = document.createElement('style')
  style.textContent = `
    .swalx-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 20% 0%, rgba(56, 189, 248, 0.18), transparent 38%),
        radial-gradient(circle at 85% 100%, rgba(14, 165, 233, 0.16), transparent 42%),
        rgba(2, 6, 23, 0.66);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      animation: swalx-fade-in 180ms ease-out;
    }
    .swalx-box {
      width: min(640px, 100%);
      border-radius: 22px;
      border: 1px solid rgba(148, 163, 184, 0.26);
      color: #e2e8f0;
      background:
        linear-gradient(160deg, rgba(8, 20, 51, 0.98), rgba(6, 18, 48, 0.96)),
        linear-gradient(120deg, #0b1838, #0b1230);
      box-shadow: 0 28px 60px rgba(2, 6, 23, 0.56);
      padding: 18px 20px;
      font-family: "Segoe UI", "Trebuchet MS", sans-serif;
      transform: translateY(0);
      animation: swalx-pop-in 220ms cubic-bezier(.2,.8,.2,1);
    }
    .swalx-head {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 10px;
      align-items: start;
      margin-bottom: 8px;
    }
    .swalx-head.naked {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .swalx-chip {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0b1838;
      font-weight: 800;
      font-size: 16px;
      background: linear-gradient(145deg, #7dd3fc, #38bdf8);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
    }
    .swalx-title {
      margin: 2px 0 0;
      font-size: clamp(22px, 2.4vw, 32px);
      line-height: 1.02;
      letter-spacing: -0.02em;
      font-weight: 800;
      color: #f8fafc;
    }
    .swalx-text {
      margin: 6px 0 0;
      font-size: 15px;
      line-height: 1.4;
      color: #cbd5e1;
      min-height: 0;
    }
    .swalx-input {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      border: 1px solid rgba(100, 116, 139, 0.55);
      background: rgba(2, 6, 23, 0.55);
      color: #e2e8f0;
      padding: 0 14px;
      margin: 4px 0 18px;
      font-size: 16px;
      outline: none;
      transition: border-color .16s ease, box-shadow .16s ease;
    }
    .swalx-input:focus {
      border-color: #7dd3fc;
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18);
    }
    .swalx-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .swalx-validation {
      display: none;
      margin-top: 8px;
      border: 1px solid #fecaca;
      background: #fff1f2;
      color: #be123c;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .swalx-btn {
      min-width: 110px;
      height: 46px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      padding: 0 24px;
      border: 1px solid transparent;
      transition: transform .12s ease, opacity .12s ease, box-shadow .12s ease, background-color .12s ease;
    }
    .swalx-btn:active { transform: translateY(1px); }
    .swalx-btn-secondary {
      background: transparent;
      color: #cbd5e1;
      border-color: rgba(148, 163, 184, 0.55);
    }
    .swalx-btn-secondary:hover {
      background: rgba(148, 163, 184, 0.08);
    }
    .swalx-btn-primary {
      color: #08203f;
      background: linear-gradient(135deg, #a7d8ff, #7dc2ff);
      box-shadow: 0 8px 18px rgba(56, 189, 248, 0.35);
    }
    .swalx-btn-primary:hover {
      filter: brightness(1.02);
      box-shadow: 0 11px 24px rgba(56, 189, 248, 0.42);
    }
    .swalx-light {
      color: #0f172a;
      background: #ffffff;
      border-color: #dbe7f0;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
    }
    .swalx-light .swalx-title {
      color: #0f172a;
    }
    .swalx-light .swalx-text {
      color: #334155;
    }
    .swalx-light .swalx-btn-secondary {
      color: #334155;
      border-color: #cbd5e1;
      background: #ffffff;
    }
    .swalx-light .swalx-btn-secondary:hover {
      background: #f8fafc;
    }
    .swalx-light .swalx-btn-primary {
      color: #0b3c62;
      background: linear-gradient(135deg, #cdeaff, #99d2ff);
      box-shadow: 0 8px 18px rgba(56, 189, 248, 0.26);
    }
    @keyframes swalx-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes swalx-pop-in {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 640px) {
      .swalx-box { padding: 14px; border-radius: 16px; }
      .swalx-title { font-size: 22px; }
      .swalx-text { font-size: 14px; }
      .swalx-actions { justify-content: stretch; }
      .swalx-btn { width: 100%; min-width: 0; }
    }
  `
  document.head.appendChild(style)
}

const createDialogBase = (options = {}) => {
  removeActiveDialog()
  ensureDialogStyles()

  const overlay = document.createElement('div')
  overlay.className = 'swalx-overlay'

  const box = document.createElement('div')
  box.className = 'swalx-box'
  const popupClass = String(options?.customClass?.popup || '').trim()
  if (popupClass) {
    popupClass.split(/\s+/).filter(Boolean).forEach((cls) => box.classList.add(cls))
  }
  overlay.appendChild(box)

  activeDialog = overlay
  document.body.appendChild(overlay)
  return { overlay, box }
}

const addDialogHeader = (box, options) => {
  const title = String(options?.title || '').trim() || 'Confirm'
  const text = String(options?.text || '').trim()
  const html = String(options?.html || '').trim()
  const showIcon = options?.showIcon !== false

  const head = document.createElement('div')
  head.className = `swalx-head${showIcon ? '' : ' naked'}`
  box.appendChild(head)

  if (showIcon) {
    const chip = document.createElement('div')
    chip.className = 'swalx-chip'
    chip.textContent = '!'
    head.appendChild(chip)
  }

  const content = document.createElement('div')
  head.appendChild(content)

  const titleEl = document.createElement('h3')
  titleEl.className = 'swalx-title'
  titleEl.textContent = title
  content.appendChild(titleEl)

  if (text || html) {
    const bodyEl = document.createElement('div')
    bodyEl.className = 'swalx-text'
    if (html) bodyEl.innerHTML = html
    else bodyEl.textContent = text
    content.appendChild(bodyEl)
  }
}

const makeButton = (label, primary = false) => {
  const btn = document.createElement('button')
  btn.className = `swalx-btn ${primary ? 'swalx-btn-primary' : 'swalx-btn-secondary'}`
  btn.type = 'button'
  btn.textContent = label
  return btn
}

const fireConfirmDialog = (options) =>
  new Promise((resolve) => {
    const { overlay, box } = createDialogBase(options)
    addDialogHeader(box, options)
    const validation = document.createElement('div')
    validation.className = 'swalx-validation'
    box.appendChild(validation)
    activeValidationNode = validation

    const actions = document.createElement('div')
    actions.className = 'swalx-actions'

    const cancelBtn = makeButton(String(options?.cancelButtonText || 'Cancel'))
    const okBtn = makeButton(String(options?.confirmButtonText || 'OK'), true)
    actions.append(cancelBtn, okBtn)
    box.appendChild(actions)

    const close = (result) => {
      removeActiveDialog()
      resolve(result)
    }

    cancelBtn.addEventListener('click', () =>
      close({ isConfirmed: false, isDismissed: true, value: false })
    )
    okBtn.addEventListener('click', async () => {
      if (okBtn.disabled) return
      showDialogValidationMessage('')
      let nextValue = true
      if (typeof options?.preConfirm === 'function') {
        try {
          nextValue = await options.preConfirm()
        } catch (err) {
          const msg = err?.message || 'Unable to continue. Please review your input.'
          showDialogValidationMessage(msg)
          return
        }
        if (nextValue === false) return
      }
      close({ isConfirmed: true, isDismissed: false, value: nextValue })
    })

    const allowOutsideClick = options?.allowOutsideClick !== false
    if (allowOutsideClick) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          close({ isConfirmed: false, isDismissed: true, value: false })
        }
      })
    }

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onEsc)
        close({ isConfirmed: false, isDismissed: true, value: false })
      }
    }
    document.addEventListener('keydown', onEsc, { once: true })

    if (typeof options?.didOpen === 'function') {
      try {
        options.didOpen(box)
      } catch {
        // Ignore callback errors to avoid breaking modal.
      }
    }
  })

const fireInputDialog = (options) =>
  new Promise((resolve) => {
    const { overlay, box } = createDialogBase(options)
    addDialogHeader(box, options)
    const validation = document.createElement('div')
    validation.className = 'swalx-validation'
    box.appendChild(validation)
    activeValidationNode = validation

    const input = document.createElement('input')
    input.className = 'swalx-input'
    input.type = options?.input === 'email' ? 'email' : 'text'
    input.value = String(options?.inputValue || '')
    input.placeholder = String(options?.inputPlaceholder || '')
    box.appendChild(input)

    const actions = document.createElement('div')
    actions.className = 'swalx-actions'

    const cancelBtn = makeButton(String(options?.cancelButtonText || 'Cancel'))
    const okBtn = makeButton(String(options?.confirmButtonText || 'OK'), true)
    actions.append(cancelBtn, okBtn)
    box.appendChild(actions)

    const close = (result) => {
      removeActiveDialog()
      resolve(result)
    }

    cancelBtn.addEventListener('click', () =>
      close({ isConfirmed: false, isDismissed: true, value: null })
    )
    okBtn.addEventListener('click', async () => {
      if (okBtn.disabled) return
      showDialogValidationMessage('')
      let nextValue = input.value
      if (typeof options?.preConfirm === 'function') {
        try {
          nextValue = await options.preConfirm(input.value)
        } catch (err) {
          const msg = err?.message || 'Unable to continue. Please review your input.'
          showDialogValidationMessage(msg)
          return
        }
        if (nextValue === false) return
      }
      close({ isConfirmed: true, isDismissed: false, value: nextValue })
    })

    const allowOutsideClick = options?.allowOutsideClick !== false
    if (allowOutsideClick) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          close({ isConfirmed: false, isDismissed: true, value: null })
        }
      })
    }

    if (typeof options?.didOpen === 'function') {
      try {
        options.didOpen(box)
      } catch {
        // Ignore callback errors.
      }
    }
    setTimeout(() => input.focus(), 0)
  })

const shim = {
  fire: async (...args) => {
    const options = parseFireArgs(args)

    if (options.input) {
      return fireInputDialog(options)
    }

    if (options.showCancelButton) {
      return fireConfirmDialog(options)
    }

    if (isLoadingStyle(options)) {
      if (activeLoadingToastId) {
        toast.dismiss(activeLoadingToastId)
        activeLoadingToastId = null
      }

      const payload = normalizeToastPayload(options)
      const message = messageFrom({
        ...payload,
        type: 'info',
        title: 'Loading',
        body: payload.body || 'Please wait...',
      })
      if (shouldDisplayToast({ type: 'info', title: 'Loading', body: payload.body || 'Please wait...' })) {
        activeLoadingToastId = toast.info(message, {
          timeout: false,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
        })
      }

      if (typeof options.didOpen === 'function') {
        try {
          options.didOpen()
        } catch {
          // Ignore didOpen callback errors from legacy modal usage.
        }
      }

      return { isConfirmed: true, isDismissed: false, value: true }
    }

    if (activeLoadingToastId) {
      toast.dismiss(activeLoadingToastId)
      activeLoadingToastId = null
    }

    const payload = normalizeToastPayload(options)
    const type = payload.type
    if (!shouldDisplayToast(payload)) {
      if (typeof options.didOpen === 'function') {
        try {
          options.didOpen()
        } catch {
          // Ignore didOpen callback errors from legacy modal usage.
        }
      }
      return { isConfirmed: true, isDismissed: false, value: true }
    }
    const message = messageFrom(payload)
    const timeout = withTimeout(options, type)
    if (type === 'success') toast.success(message, { timeout })
    else if (type === 'error') toast.error(message, { timeout })
    else if (type === 'warning') toast.warning(message, { timeout })
    else toast.info(message, { timeout })

    if (typeof options.didOpen === 'function') {
      try {
        options.didOpen()
      } catch {
        // Ignore didOpen callback errors from legacy modal usage.
      }
    }

    await wait(timeout)
    return { isConfirmed: true, isDismissed: false, value: true }
  },
  showLoading: () => {},
  showValidationMessage: (message) => {
    showDialogValidationMessage(message)
  },
  close: () => {
    removeActiveDialog()
    if (activeLoadingToastId) {
      toast.dismiss(activeLoadingToastId)
      activeLoadingToastId = null
    }
  },
}

export default shim
