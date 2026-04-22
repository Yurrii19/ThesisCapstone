<template>
  <FinanceShell
    title="Partner Payout Monitoring"
    subtitle="Manage accredited partner payouts and audit trail records."
    active-path="/finance/payouts"
  >
    <div class="stats-grid">
      <div class="stat-card">
        <p class="label">Pending Payouts</p>
        <h3>{{ summary.pending_count }} - {{ money(summary.pending_amount) }}</h3>
      </div>
      <div class="stat-card">
        <p class="label">Released Payouts</p>
        <h3>{{ summary.released_count }} - {{ money(summary.released_amount) }}</h3>
      </div>
      <div class="stat-card">
        <p class="label">Cancelled Payouts</p>
        <h3>{{ summary.cancelled_count }} - {{ money(summary.cancelled_amount) }}</h3>
      </div>
      <div class="stat-card">
        <p class="label">Platform Margin Total</p>
        <h3>{{ money(summary.platform_margin_total) }}</h3>
      </div>
    </div>

    <div class="panel">
      <h3>Partner Payout Ledger</h3>
      <p class="mt-1.5 text-slate-500">Release partner payouts only after invoice payment verification.</p>
      <div class="tools">
        <select v-model="form.status">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="released">Released</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select v-model="form.business_id">
          <option value="">All businesses</option>
          <option v-for="business in businesses" :key="business.id" :value="String(business.id)">
            {{ business.business_name }}
          </option>
        </select>

        <select v-model="form.provider_id">
          <option value="">All accredited partners</option>
          <option v-for="provider in providers" :key="provider.id" :value="String(provider.id)">
            {{ provider.name || `Provider #${provider.id}` }}
          </option>
        </select>

        <label>
          From
          <input v-model="form.date_from" type="date" />
        </label>
        <label>
          To
          <input v-model="form.date_to" type="date" />
        </label>
        <button class="ok" @click="applyFilters">Apply Filters</button>
        <button @click="resetFilters">Reset</button>
        <a class="ok inline-flex items-center no-underline" :href="exportUrl">Export Payout CSV</a>
        <a class="ok inline-flex items-center no-underline" href="/finance/payouts/export-audit-csv">Export Audit Trail CSV</a>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Business</th>
            <th>Partner</th>
            <th>Request</th>
            <th>Invoice Ref</th>
            <th>Gross</th>
            <th>Partner Share</th>
            <th>Platform Margin</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="10">No payout records found for the selected filters.</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>#{{ row.id }}</td>
            <td>{{ row.business_name }}</td>
            <td>{{ row.provider_name }}</td>
            <td>#{{ row.service_request_id }} - {{ row.service_type || '-' }}</td>
            <td>{{ row.source_invoice_ref }}</td>
            <td>{{ money(row.gross_amount) }}</td>
            <td>{{ money(row.provider_share_amount) }} ({{ percent(row.provider_share_pct) }})</td>
            <td>{{ money(row.platform_margin_amount) }}</td>
            <td>
              <span class="badge" :class="row.status">{{ row.status }}</span>
            </td>
            <td>
              <button
                class="ok"
                :disabled="busyId === row.id || row.status === 'released'"
                @click="release(row.id)"
              >
                {{ busyId === row.id ? 'Processing...' : 'Release Payout' }}
              </button>
              <button
                class="reject"
                :disabled="busyId === row.id || row.status === 'released' || row.status === 'cancelled'"
                @click="cancel(row.id)"
              >
                {{ busyId === row.id ? 'Processing...' : 'Cancel Payout' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <h3>Recent Payout Audit Trail</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Payout</th>
            <th>Action</th>
            <th>From</th>
            <th>To</th>
            <th>By</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="logs.length === 0">
            <td colspan="7">No payout audit trail entries yet.</td>
          </tr>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ formatDate(log.created_at) }}</td>
            <td>#{{ log.service_request_payout_id }}</td>
            <td>{{ log.action }}</td>
            <td>{{ log.from_status || '-' }}</td>
            <td>{{ log.to_status || '-' }}</td>
            <td>{{ log.actor_name }}</td>
            <td>{{ log.notes || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </FinanceShell>
</template>

<script setup>
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { computed, reactive, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { createToastInterface, POSITION } from 'vue-toastification'
import FinanceShell from './FinanceShell.vue'

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  businesses: {
    type: Array,
    default: () => [],
  },
  providers: {
    type: Array,
    default: () => [],
  },
  filters: {
    type: Object,
    default: () => ({
      status: 'all',
      business_id: '',
      provider_id: '',
      date_from: '',
      date_to: '',
    }),
  },
  logs: {
    type: Array,
    default: () => [],
  },
  summary: {
    type: Object,
    default: () => ({
      pending_count: 0,
      released_count: 0,
      cancelled_count: 0,
      pending_amount: 0,
      released_amount: 0,
      cancelled_amount: 0,
      platform_margin_total: 0,
    }),
  },
})

const rows = computed(() => props.rows)
const logs = computed(() => props.logs)
const businesses = computed(() => props.businesses)
const providers = computed(() => props.providers)
const summary = computed(() => props.summary || {})
const busyId = ref(null)
const toast = createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 1800,
  closeButton: 'button',
  showCloseButtonOnHover: false,
})
const form = reactive({
  status: String(props.filters?.status || 'all'),
  business_id: String(props.filters?.business_id || ''),
  provider_id: String(props.filters?.provider_id || ''),
  date_from: String(props.filters?.date_from || ''),
  date_to: String(props.filters?.date_to || ''),
})

const exportUrl = computed(() => {
  const params = new URLSearchParams()
  if (form.status && form.status !== 'all') params.set('status', form.status)
  if (form.business_id) params.set('business_id', form.business_id)
  if (form.provider_id) params.set('provider_id', form.provider_id)
  if (form.date_from) params.set('date_from', form.date_from)
  if (form.date_to) params.set('date_to', form.date_to)
  const query = params.toString()
  return query ? `/finance/payouts/export-csv?${query}` : '/finance/payouts/export-csv'
})

async function release(id) {
  const notes = await askNotes('Release payout?', 'This will mark the payout as released.')
  if (!notes) return

  busyId.value = id
  try {
    await axios.patch(`/finance/payouts/${id}`, { status: 'released', notes })
    toast.success('Payout marked as released.')
    window.location.reload()
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to release payout.')
  } finally {
    busyId.value = null
  }
}

async function cancel(id) {
  const notes = await askNotes('Cancel payout?', 'This will mark the payout as cancelled.')
  if (!notes) return

  busyId.value = id
  try {
    await axios.patch(`/finance/payouts/${id}`, { status: 'cancelled', notes })
    toast.success('Payout marked as cancelled.')
    window.location.reload()
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to cancel payout.')
  } finally {
    busyId.value = null
  }
}

async function askNotes(title, text) {
  const result = await Swal.fire({
    title,
    text,
    input: 'text',
    inputLabel: 'Audit note (required)',
    inputPlaceholder: 'Type reason/remarks',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    inputValidator: (value) => {
      if (!value || !String(value).trim()) {
        return 'Audit note is required.'
      }
      if (String(value).trim().length > 255) {
        return 'Audit note must be 255 characters or less.'
      }
      return undefined
    },
  })

  if (!result.isConfirmed) return ''
  return String(result.value || '').trim()
}

function applyFilters() {
  router.get('/finance/payouts', { ...form }, { preserveState: true, preserveScroll: true })
}

function resetFilters() {
  form.status = 'all'
  form.business_id = ''
  form.provider_id = ''
  form.date_from = ''
  form.date_to = ''
  applyFilters()
}

function money(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0)
}

function percent(value) {
  const num = Number(value || 0)
  return `${num.toFixed(2)}%`
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}
</script>

