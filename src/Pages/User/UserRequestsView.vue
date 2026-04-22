<template>
  <section class="space-y-6">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-5 text-white shadow-lg">
      <div class="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/15"></div>
      <div class="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-white/10"></div>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">{{ title }}</h2>
          <p class="text-sm text-white/85">{{ subtitle }}</p>
        </div>
        <button
          @click="emitRefresh"
          class="self-start sm:self-auto px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-gray-500">Loading your requests...</div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">
          <p class="text-xs text-teal-600 uppercase tracking-wide">Total</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.total }}</p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
          <p class="text-xs text-amber-700 uppercase tracking-wide">Active</p>
          <p class="text-2xl font-bold text-amber-800 mt-1">{{ stats.active }}</p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <p class="text-xs text-emerald-700 uppercase tracking-wide">Completed</p>
          <p class="text-2xl font-bold text-emerald-800 mt-1">{{ stats.completed }}</p>
        </div>
      </div>

      <div v-if="visibleRequests.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="req in visibleRequests"
          :key="req.id"
          class="bg-white p-5 rounded-2xl shadow-md border border-gray-100 border-l-4"
          :class="cardAccentClass(req)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-gray-400">Business</p>
              <p class="text-lg font-semibold text-gray-800 leading-tight">{{ businessName(req) }}</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize" :class="statusClass(req)">
              {{ prettyStatus(req) }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Service Type</p>
              <p class="font-semibold text-gray-800 mt-1">Service: {{ req.service_type || 'N/A' }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Preferred Date</p>
              <p class="font-semibold text-gray-800 mt-1">Date: {{ formatDate(req.preferred_date) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Payment Method</p>
              <p class="font-semibold text-gray-800 mt-1">{{ paymentMethodLabel(req.payment_method) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Payment Status</p>
              <p class="font-semibold text-gray-800 mt-1">{{ paymentStatusLabel(req) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Service Fee</p>
              <p class="font-semibold text-gray-800 mt-1">{{ serviceFeeLabel(req) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Downpayment</p>
              <p class="font-semibold text-gray-800 mt-1">{{ money(amountValue(req.downpayment_amount)) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Remaining Balance</p>
              <p class="font-semibold text-gray-800 mt-1">{{ remainingBalanceLabel(req) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Requested At</p>
              <p class="font-semibold text-gray-800 mt-1">Time: {{ formatDateTime(req.created_at) }}</p>
              <p class="text-[11px] text-gray-500 mt-0.5">{{ timeAgo(req.created_at) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Address</p>
              <p class="font-semibold text-gray-800 mt-1">Location: {{ req.address_text || 'N/A' }}</p>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Request Journey</p>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                  Step {{ userCurrentStep(req) }}/{{ userTotalSteps(req) }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="statusClass(req)">
                  {{ userProgressPercent(req) }}%
                </span>
              </div>
            </div>

            <div class="mb-2">
              <div class="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/70">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="userProgressBarClass(req)"
                  :style="{ width: `${userProgressPercent(req)}%` }"
                ></div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="step in userTimeline(req)"
                :key="`${req.id}-${step.key}`"
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                :class="timelineClass(step.state)"
              >
                {{ step.label }}
              </span>
            </div>
          </div>

          <p class="mt-2 text-[11px] text-gray-500">
            Last status update: {{ formatDateTime(req.updated_at || req.created_at) }}
          </p>

          <div class="mt-4 flex items-center justify-between">
            <button
              v-if="allowCancelActions && String(req.status || '').toLowerCase() === 'pending'"
              @click="cancelRequest(req)"
              class="text-xs font-semibold text-rose-600 hover:underline"
            >
              Cancel Request
            </button>
            <button
              v-else-if="allowArchiveActions && isArchivable(req)"
              @click="emitArchive(req)"
              class="text-xs font-semibold text-sky-700 hover:underline"
            >
              Archive Request
            </button>
            <span v-else class="text-xs text-gray-400"></span>

            <div class="ml-auto flex items-center gap-3">
              <a
                v-if="canOpenInvoice(req)"
                :href="invoiceViewUrl(req)"
                @click.prevent="openInvoice(req)"
                class="inline-flex rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
              >
                Open Invoice
              </a>
              <a
                v-if="req.latitude && req.longitude"
                :href="mapLink(req.latitude, req.longitude)"
                target="_blank"
                class="text-sm font-semibold text-teal-700 hover:underline"
              >
                View Location
              </a>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p class="text-base font-semibold text-gray-700">No requests yet.</p>
        <p class="text-sm text-gray-500 mt-1">Create a request to start tracking.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'

const props = defineProps({
  requests: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  title: { type: String, default: 'My Service Requests' },
  subtitle: { type: String, default: 'Track the status of your own requests.' },
  allowArchiveActions: { type: Boolean, default: false },
  allowCancelActions: { type: Boolean, default: true },
})

const emit = defineEmits(['refresh-data', 'request-cancelled', 'archive-request'])
const emitRefresh = () => emit('refresh-data')

const visibleRequests = computed(() =>
  (props.requests || []).filter((r) => !r?.archived_at)
)

const isCompletionReviewPending = (req) => (
  String(req?.status || '').trim().toLowerCase() === 'completed'
  && String(req?.completion_review_status || '').trim().toLowerCase() === 'pending'
)

const stats = computed(() => {
  const rows = visibleRequests.value
  const total = rows.length
  const active = rows.filter((r) => {
    const status = String(r.status || '').toLowerCase()
    if (['rejected', 'cancelled'].includes(status)) return false
    if (status === 'completed' && !isCompletionReviewPending(r)) return false
    return true
  }).length
  const completed = rows.filter((r) => String(r.status || '').toLowerCase() === 'completed' && !isCompletionReviewPending(r)).length
  return { total, active, completed }
})

const businessName = (req) => req.business?.business_name || req.business_name || 'N/A'
const amountValue = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}
const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amountValue(value))

const requestServiceTrack = (req) => {
  const raw = String(
    req?.service_track
    || req?.service_type
    || req?.category
    || req?.category_label
    || ''
  ).trim().toLowerCase()
  if (/(siphon|septic|desludg|vacuum|jetter)/.test(raw)) return 'siphoning'
  return raw
}

const inspectionBillingNotice = 'Inspection required before final billing'

const hasCompletedInspection = (req) => {
  const result = String(req?.inspection_result || '').trim().toLowerCase()
  if (['minor', 'major'].includes(result)) return true
  const status = String(req?.status || '').trim().toLowerCase()
  return ['completed', 'warranty_pending', 'warranty_rework'].includes(status)
}

const isInspectionBillingRequired = (req) => requestServiceTrack(req) === 'siphoning'

const canShowInvoiceAmount = (req) => {
  if (!isInspectionBillingRequired(req)) return true
  if (hasCompletedInspection(req)) return true
  const phase = String(req?.latest_invoice?.phase || '').trim().toLowerCase()
  const paymentMethod = String(req?.payment_method || '').trim().toLowerCase()
  return phase === 'downpayment' || paymentMethod === 'downpayment'
}

const canShowFinalBillingAmount = (req) => {
  if (!isInspectionBillingRequired(req)) return true
  return hasCompletedInspection(req)
}

const serviceFeeLabel = (req) => {
  if (!canShowFinalBillingAmount(req)) return inspectionBillingNotice
  return money(amountValue(req?.total_amount))
}

const remainingBalanceLabel = (req) => {
  if (!canShowFinalBillingAmount(req)) return inspectionBillingNotice
  return money(amountValue(req?.final_amount))
}

const paymentMethodLabel = (method) => {
  const m = String(method || '').toLowerCase().trim()
  if (m === 'downpayment') return 'Downpayment'
  if (m === 'full' || m === 'personal') return 'Full Payment'
  return 'N/A'
}

const paymentStatusLabel = (req) => {
  const reqStatus = String(req?.payment_status || '').toLowerCase().trim()
  const invStatus = String(req?.latest_invoice?.status || '').toLowerCase().trim()
  if (reqStatus === 'paid' || invStatus === 'paid') return 'Paid'
  if (reqStatus === 'partial_paid') return 'Partially Paid'
  if (invStatus === 'failed' || invStatus === 'expired') return 'Payment Failed'
  return 'Unpaid'
}

const prettyStatus = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if (s === 'pending') return 'Pending'
  if (s === 'approved' || s === 'accepted') return 'Approved'
  if (s === 'assigned') return 'Awaiting Provider Acceptance'
  if (s === 'awaiting_material') return 'Awaiting Materials'
  if (s === 'job_ready') return 'Ready for Dispatch'
  if (s === 'in_progress' || s === 'ongoing') return 'Work in Progress'
  if (s === 'completed' && isCompletionReviewPending(req)) return 'Awaiting OM Verification'
  if (s === 'completed') return 'Completed'
  if (s === 'rejected') return 'Rejected'
  if (s === 'cancelled') return 'Cancelled'
  return req?.status || input || 'Unknown'
}

const statusClass = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if (s === 'completed' && isCompletionReviewPending(req)) return 'bg-sky-50 text-sky-700'
  return {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    assigned: 'bg-sky-50 text-sky-700',
    awaiting_material: 'bg-orange-50 text-orange-700',
    job_ready: 'bg-cyan-50 text-cyan-700',
    in_progress: 'bg-indigo-50 text-indigo-700',
    ongoing: 'bg-indigo-50 text-indigo-700',
    completed: 'bg-teal-50 text-teal-700',
    rejected: 'bg-rose-50 text-rose-700',
    cancelled: 'bg-slate-100 text-slate-600'
  }[s] || 'bg-gray-100 text-gray-700'
}

const cardAccentClass = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if (s === 'rejected') return 'border-l-rose-500'
  if (s === 'cancelled') return 'border-l-slate-400'
  if (s === 'completed' && isCompletionReviewPending(req)) return 'border-l-sky-500'
  if (s === 'completed') return 'border-l-emerald-500'
  if (s === 'in_progress' || s === 'ongoing') return 'border-l-indigo-500'
  if (s === 'awaiting_material') return 'border-l-orange-500'
  if (s === 'job_ready') return 'border-l-cyan-500'
  if (s === 'assigned') return 'border-l-sky-500'
  if (s === 'approved' || s === 'accepted') return 'border-l-emerald-500'
  return 'border-l-amber-500'
}

const formatDate = (value) => {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const timeAgo = (value) => {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'N/A'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

const normalizeRequestStatus = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if (s === 'accepted') return 'approved'
  if (s === 'ongoing') return 'in_progress'
  return s
}

const userStatusFlow = ['pending', 'approved', 'assigned', 'awaiting_material', 'job_ready', 'in_progress', 'completed']
const userStatusLabel = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Awaiting Provider Acceptance',
  awaiting_material: 'Awaiting Materials',
  job_ready: 'Ready for Dispatch',
  in_progress: 'Work in Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
}

const userTimeline = (input) => {
  const current = normalizeRequestStatus(input)
  if (current === 'rejected' || current === 'cancelled') {
    return [
      { key: 'pending', label: userStatusLabel.pending, state: 'done' },
      { key: current, label: userStatusLabel[current], state: 'current' }
    ]
  }
  const idx = userStatusFlow.indexOf(current)
  if (idx === -1) return [{ key: current || 'unknown', label: prettyStatus(input), state: 'current' }]
  return userStatusFlow.map((key, i) => ({
    key,
    label: userStatusLabel[key] || key,
    state: i < idx ? 'done' : (i === idx ? 'current' : 'todo')
  }))
}

const userProgressPercent = (input) => {
  const current = normalizeRequestStatus(input)
  if (current === 'rejected' || current === 'cancelled') return 100
  const idx = userStatusFlow.indexOf(current)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / userStatusFlow.length) * 100)
}

const userCurrentStep = (input) => {
  const current = normalizeRequestStatus(input)
  if (current === 'rejected' || current === 'cancelled') return 2
  const idx = userStatusFlow.indexOf(current)
  return idx === -1 ? 1 : (idx + 1)
}

const userTotalSteps = (input) => {
  const current = normalizeRequestStatus(input)
  if (current === 'rejected' || current === 'cancelled') return 2
  return userStatusFlow.length
}

const userProgressBarClass = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = normalizeRequestStatus(input)
  if (s === 'completed' && isCompletionReviewPending(req)) return 'bg-sky-500'
  if (s === 'rejected') return 'bg-rose-500'
  if (s === 'cancelled') return 'bg-slate-500'
  if (s === 'completed') return 'bg-emerald-500'
  if (s === 'in_progress') return 'bg-indigo-500'
  if (s === 'job_ready') return 'bg-cyan-500'
  if (s === 'awaiting_material') return 'bg-orange-500'
  if (s === 'assigned') return 'bg-sky-500'
  if (s === 'approved') return 'bg-emerald-500'
  return 'bg-amber-500'
}

const timelineClass = (state) => {
  if (state === 'done') return 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
  if (state === 'current') return 'bg-sky-600 text-white border border-sky-600 shadow-sm'
  return 'bg-white text-slate-500 border border-slate-200'
}

const isArchivable = (req) => {
  if (!req || req.archived_at) return false
  const s = String(req.status || '').trim().toLowerCase()
  if (s === 'completed' && isCompletionReviewPending(req)) return false
  return ['completed', 'cancelled', 'rejected'].includes(s)
}

const emitArchive = (req) => {
  emit('archive-request', req)
}

const cancelRequest = async (req) => {
  const id = req?.id
  if (!id) return
  const result = await Swal.fire({
    title: 'Cancel request?',
    text: 'You can only cancel while it is still pending.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel',
  })
  if (!result.isConfirmed) return

  try {
    await axios.post(`/user/service-requests/${id}/cancel`)
    await Swal.fire({
      icon: 'success',
      title: 'Cancelled',
      text: 'Your request was cancelled.',
      timer: 1000,
      showConfirmButton: false,
    })
    emit('request-cancelled', { id })
    emitRefresh()
  } catch (err) {
    await Swal.fire('Error', err?.response?.data?.error || 'Failed to cancel request', 'error')
  }
}

const mapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`
const INVOICE_LOADING_DELAY_MS = 600
const invoiceViewUrl = (req) => {
  if (!canOpenInvoice(req)) return '#'
  const id = req?.latest_invoice?.id
  return id ? `/payment/return?invoice_id=${encodeURIComponent(id)}` : '#'
}
const canOpenInvoice = (req) => Boolean(req?.latest_invoice?.invoice_url) && canShowInvoiceAmount(req)
const openInvoice = (req) => {
  const url = invoiceViewUrl(req)
  if (!url || url === '#') return
  window.__appGlobalLoader?.start?.()
  setTimeout(() => window.location.assign(url), INVOICE_LOADING_DELAY_MS)
}
</script>

