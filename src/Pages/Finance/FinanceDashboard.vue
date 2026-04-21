<template>
  <FinanceShell
    title="Finance Dashboard"
    subtitle="Monitor payment checks, procurement budget reviews, payouts, and finance reporting."
    active-path="/finance"
  >
    <div class="stats-grid">
      <div class="stat-card" v-for="card in cards" :key="card.label">
        <p class="label">{{ card.label }}</p>
        <h3>{{ card.value }}</h3>
      </div>
    </div>

    <div class="panel">
      <h3>Recent Invoices</h3>
      <table>
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Client</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in recentInvoices" :key="inv.id">
            <td>{{ inv.invoice_no }}</td>
            <td>{{ inv.client }}</td>
            <td>
              <span class="badge" :class="inv.status">{{ inv.status }}</span>
            </td>
            <td>{{ money(inv.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </FinanceShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import FinanceShell from './FinanceShell.vue'
import {
  buildFinanceDashboardState,
  FINANCE_DASHBOARD_CACHE_KEY,
} from '@/lib/dashboard-prefetch'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'

const props = defineProps({
  recentInvoices: {
    type: Array,
    default: () => [],
  },
  cards: {
    type: Array,
    default: () => [],
  },
})

const hasProvidedData = computed(() => props.recentInvoices.length > 0 || props.cards.length > 0)
const cachedDashboardState = readCachedViewState(FINANCE_DASHBOARD_CACHE_KEY, null)
const recentInvoicesState = ref(
  hasProvidedData.value
    ? props.recentInvoices
    : (Array.isArray(cachedDashboardState?.recentInvoices) ? cachedDashboardState.recentInvoices : []),
)
const cardsState = ref(
  hasProvidedData.value
    ? props.cards
    : (Array.isArray(cachedDashboardState?.cards) ? cachedDashboardState.cards : []),
)

const recentInvoices = computed(() => recentInvoicesState.value)
const cards = computed(() =>
  cardsState.value.map((card) => ({
    ...card,
    value: typeof card.value === 'number' && !String(card.label).toLowerCase().includes('invoice')
      ? money(card.value)
      : String(card.value),
  })),
)

const fetchFinanceDashboard = async () => {
  try {
    const [invoicesRes, payoutsRes, refundsRes] = await Promise.all([
      axios.get('/finance/invoices', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
      axios.get('/finance/payouts', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
      axios.get('/finance/refunds', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
    ])

    const payload = buildFinanceDashboardState({
      invoices: invoicesRes?.data,
      payouts: payoutsRes?.data,
      refunds: refundsRes?.data,
    })

    recentInvoicesState.value = payload.recentInvoices
    cardsState.value = payload.cards
    writeCachedViewState(FINANCE_DASHBOARD_CACHE_KEY, payload)
  } catch {
    // Leave cached or server-provided values in place.
  }
}

onMounted(() => {
  if (!hasProvidedData.value) {
    fetchFinanceDashboard().catch(() => {})
  }
})

function money(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0)
}
</script>
