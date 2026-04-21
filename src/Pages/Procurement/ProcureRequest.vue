<template>
  <section class="space-y-5">
    <div class="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 shadow-lg">
      <p class="text-xs uppercase tracking-[0.14em] text-white/85">Materials Queue</p>
      <h2 class="text-2xl font-bold mt-1">Materials Planning Queue</h2>
      <p class="text-sm text-white/90 mt-1">Review required items, check stock availability, and trigger PR flow when inventory is not enough.</p>
    </div>

    <div v-if="loading" class="grid gap-4">
      <div v-for="idx in 3" :key="`request-skeleton-${idx}`" class="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"></div>
    </div>

    <div v-else class="space-y-4">
      <div v-if="refreshing" class="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-semibold text-slate-500">
        Refreshing latest materials queue...
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-2 rounded-lg text-sm font-semibold border transition"
          :class="activeTab === tab.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
        >
          {{ tab.label }}
        </button>
      </div>

      <article
        v-for="req in filteredRequests"
        :key="req.id"
        class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Customer</p>
            <h3 class="text-xl font-bold text-slate-900">{{ fullName(req) }}</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="statusClass(req.status)">
            {{ req.status }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Service</p>
            <p class="font-semibold text-indigo-700 mt-1">{{ req.service_type || 'N/A' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Business</p>
            <p class="font-semibold text-slate-800 mt-1">{{ req.business_name || 'N/A' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Preferred Date</p>
            <p class="font-semibold text-slate-800 mt-1">{{ formatDate(req.preferred_date) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Address</p>
            <p class="font-semibold text-slate-800 mt-1">{{ req.address_text || 'N/A' }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {{ customerTypeLabel(req.customer_type) }}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {{ propertyTypeLabel(req.property_type) }}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {{ truckLoadLabel(req.truck_load_volume) }}
          </span>
          <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
            {{ paymentTermsLabel(req.payment_terms) }}
          </span>
          <span class="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-semibold text-cyan-800">
            {{ prettyValue(req.procurement_stage || req.stock_status || 'awaiting_stock_review') }}
          </span>
          <span v-if="req.payment_due_days" class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
            Balance due in {{ req.payment_due_days }} days
          </span>
        </div>

        <div class="mt-5 border border-slate-200 rounded-xl p-4 bg-slate-50/60">
          <p class="text-xs uppercase tracking-wide text-slate-500 mb-3">Materials Needed</p>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div class="md:col-span-2">
              <select
                v-model="req.tempMaterial"
                @change="handleMaterialChange(req)"
                class="w-full h-12 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option disabled value="">Select material</option>
                <option
                  v-for="opt in availableOptions(req)"
                  :key="`${req.id}-${opt}`"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
              <p class="mt-1 text-xs text-slate-500">
                Available:
                <span
                  class="font-semibold"
                  :class="!req.tempMaterial ? 'text-slate-500' : (isLowStockRemaining(req) ? 'text-rose-600' : 'text-slate-700')"
                >
                  {{ req.tempMaterial ? `${remainingForTemp(req)} pcs` : 'Select a material' }}
                </span>
                <span v-if="isLowStockRemaining(req)" class="ml-1 font-semibold text-rose-600">
                  LOW STOCK
                </span>
              </p>
            </div>
            <input
              v-model.trim="req.tempNotes"
              type="text"
              maxlength="255"
              class="w-full h-12 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white md:col-span-2"
              placeholder="Reason / notes (optional)"
            />
            <input
              v-model.number="req.tempQty"
              type="number"
              min="0"
              :max="maxSelectableQty(req)"
              class="w-full h-12 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              placeholder="Qty (pcs)"
              @input="clampQty(req)"
            />
            <button
              type="button"
              @click="addMaterial(req)"
              :disabled="!req.tempMaterial || remainingForTemp(req) <= 0 || req.tempQty <= 0 || req.tempQty > maxSelectableQty(req)"
              class="h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Add Material
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="(mat, index) in req.selectedMaterials"
              :key="`${mat.name}-${mat.unit}-${index}`"
              class="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold"
            >
              <span>{{ mat.name }} ({{ mat.qty }} {{ mat.unit }})<span v-if="mat.notes"> - {{ mat.notes }}</span></span>
              <button type="button" @click="removeMaterial(req, index)" class="text-rose-500">x</button>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            @click="markReady(req)"
            class="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow"
          >
            Save Materials Plan
          </button>
        </div>
      </article>

      <div v-if="!filteredRequests.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        {{ emptyText }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
})

const REQUEST_CACHE_KEY = 'procurement-requests'
const cachedRequestState = readCachedViewState(REQUEST_CACHE_KEY, null)
const hasCachedRequestState = Boolean(cachedRequestState)
const requests = ref([])
const loading = ref(!hasCachedRequestState)
const refreshing = ref(false)
const inventorySummary = ref(Array.isArray(cachedRequestState?.inventorySummary) ? cachedRequestState.inventorySummary : [])
const lowStockThreshold = 5
const activeTab = ref('new')
const tabs = [
  { label: 'Awaiting Materials', value: 'new' },
  { label: 'Job Ready', value: 'ready' },
  { label: 'All Requests', value: 'all' },
]

const filteredRequests = computed(() => {
  const list = requests.value || []
  if (activeTab.value === 'ready') return list.filter((r) => String(r.status).toLowerCase() === 'job_ready')
  if (activeTab.value === 'new') return list.filter((r) => String(r.status).toLowerCase() === 'awaiting_material')
  return list
})

const emptyText = computed(() => {
  if (activeTab.value === 'ready') return 'No dispatch-ready requests yet.'
  if (activeTab.value === 'new') return 'No requests are currently in materials planning.'
  return 'No procurement planning requests found.'
})

const fullName = (r) =>
  `${r.first_name ?? ''} ${r.middle_initial ? `${r.middle_initial}.` : ''} ${r.last_name ?? ''}`.replace(/\s+/g, ' ').trim()

const prettyValue = (value, fallback = 'N/A') => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized
    ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    : fallback
}

const customerTypeLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'non_contract') return 'Non-Contract'
  if (normalized === 'contracted') return 'Contracted'
  return prettyValue(value)
}

const propertyTypeLabel = (value) => prettyValue(value, 'Residential')

const truckLoadLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'Standard Load'
  if (normalized === 'large') return 'Large Load'
  return prettyValue(value)
}

const paymentTermsLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'full_before_service') return 'Full Payment Before Service'
  if (normalized === '30_percent_down_30_days') return '30% Down, 30-Day Balance'
  return prettyValue(value, 'Payment Terms Pending')
}

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'

const statusClass = (status) => {
  const classes = {
    awaiting_material: 'bg-amber-100 text-amber-700',
    job_ready: 'bg-teal-100 text-teal-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-emerald-100 text-emerald-700',
  }
  return classes[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-700'
}

const normalizeKey = (name, unit = 'pcs') => `${String(name || '').trim().toLowerCase()}::${String(unit || 'pcs').trim().toLowerCase()}`

const inventoryMap = computed(() => {
  const map = new Map()
  for (const row of inventorySummary.value) {
    const name = String(row.material_name || '').trim()
    if (!name) continue
    const unit = String(row.unit || 'pcs').trim() || 'pcs'
    map.set(normalizeKey(name, unit), Number(row.available) > 0 ? Number(row.available) : 0)
  }
  return map
})

const normalizeRequest = (r) => {
  const selectedMaterials = Array.isArray(r.materials)
    ? r.materials.map((m) => ({
        name: String(m.name || '').trim(),
        qty: Number(m.qty) > 0 ? Number(m.qty) : 1,
        unit: String(m.unit || 'pcs').trim() || 'pcs',
        notes: String(m.notes || '').trim() || null,
      }))
    : []

  const originalMaterialMap = {}
  for (const mat of selectedMaterials) {
    const key = normalizeKey(mat.name, mat.unit)
    originalMaterialMap[key] = (originalMaterialMap[key] || 0) + mat.qty
  }

  return {
    ...r,
    selectedMaterials,
    originalMaterialMap,
    tempMaterial: '',
    tempQty: 0,
    tempNotes: '',
    tempUnit: 'pcs',
    serviceMaterialOptions: Array.isArray(r.serviceMaterialOptions) ? r.serviceMaterialOptions : [],
  }
}

const hydrateCachedRequests = (rows = []) => (
  (Array.isArray(rows) ? rows : []).map((row) => normalizeRequest(row))
)

const maxAllowedForRequest = (req, materialName, unit = 'pcs') => {
  const key = normalizeKey(materialName, unit)
  const available = inventoryMap.value.get(key) || 0
  const reservedByThisRequest = Number(req.originalMaterialMap?.[key] || 0)
  return available + reservedByThisRequest
}

const currentSelectedQty = (req, materialName, unit = 'pcs') => {
  const key = normalizeKey(materialName, unit)
  return req.selectedMaterials.reduce((sum, mat) => {
    if (normalizeKey(mat.name, mat.unit) === key) return sum + (Number(mat.qty) || 0)
    return sum
  }, 0)
}

const remainingForTemp = (req) => {
  const name = String(req.tempMaterial || '').trim()
  if (!name) return 0
  const unit = 'pcs'
  const maxAllowed = maxAllowedForRequest(req, name, unit)
  const selected = currentSelectedQty(req, name, unit)
  return Math.max(maxAllowed - selected, 0)
}

const maxSelectableQty = (req) => Math.max(remainingForTemp(req), 0)

const isLowStockRemaining = (req) => {
  const name = String(req.tempMaterial || '').trim()
  if (!name) return false
  const remaining = remainingForTemp(req)
  return remaining > 0 && remaining <= lowStockThreshold
}

const availableForMaterial = (req, materialName) => {
  const name = String(materialName || '').trim()
  if (!name) return 0
  const unit = 'pcs'
  const maxAllowed = maxAllowedForRequest(req, name, unit)
  const selected = currentSelectedQty(req, name, unit)
  return Math.max(maxAllowed - selected, 0)
}

const availableOptions = (req) => {
  const opts = Array.isArray(req.serviceMaterialOptions) ? req.serviceMaterialOptions : []
  return opts.filter((opt) => availableForMaterial(req, opt) > 0)
}

const handleMaterialChange = (req) => {
  const remaining = remainingForTemp(req)
  req.tempQty = Math.max(remaining, 0)
}

const clampQty = (req) => {
  const max = maxSelectableQty(req)
  if (!Number.isFinite(req.tempQty)) {
    req.tempQty = max
    return
  }
  if (req.tempQty > max) req.tempQty = max
  if (req.tempQty < 0) req.tempQty = 0
}

const loadSuggestedMaterials = async (normalizedRequests) => {
  await Promise.all(
    normalizedRequests.map(async (req) => {
      try {
        const res = await axios.get(`/procurement/suggested-materials/${req.id}`)
        const suggestions = Array.isArray(res.data) ? res.data : []
        req.serviceMaterialOptions = suggestions
          .map((item) => String(item.material_name || '').trim())
          .filter(Boolean)
      } catch {
        req.serviceMaterialOptions = []
      }
    })
  )
}

if (hasCachedRequestState) {
  requests.value = hydrateCachedRequests(cachedRequestState?.requests)
  const needsSuggestedMaterials = requests.value.some((req) => !Array.isArray(req.serviceMaterialOptions) || !req.serviceMaterialOptions.length)
  if (needsSuggestedMaterials) {
    loadSuggestedMaterials(requests.value)
      .then(() => {
        writeCachedViewState(REQUEST_CACHE_KEY, {
          requests: requests.value,
          inventorySummary: inventorySummary.value,
        })
      })
      .catch(() => {})
  }
}

const fetchRequests = async ({ background = false } = {}) => {
  if (background) refreshing.value = true
  else loading.value = true
  try {
    const [requestsRes, inventoryRes] = await Promise.all([
      axios.get('/procurement/requests-awaiting-material'),
      axios.get('/procurement/inventory-summary'),
    ])

    inventorySummary.value = Array.isArray(inventoryRes.data) ? inventoryRes.data : []
    const normalizedRequests = (Array.isArray(requestsRes.data) ? requestsRes.data : []).map(normalizeRequest)
    await loadSuggestedMaterials(normalizedRequests)
    requests.value = normalizedRequests
    writeCachedViewState(REQUEST_CACHE_KEY, {
      requests: requests.value,
      inventorySummary: inventorySummary.value,
    })
  } catch {
    if (!background) {
      Swal.fire('Error', 'Failed to fetch requests', 'error')
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const addMaterial = (req) => {
  const name = String(req.tempMaterial || '').trim()
  if (!name) {
    Swal.fire('Missing Material', 'Please select a material from the dropdown.', 'warning')
    return
  }

  const qty = Number(req.tempQty) > 0 ? Number(req.tempQty) : 0
  if (!qty) {
    Swal.fire('Invalid Quantity', 'Please enter quantity in pcs.', 'warning')
    return
  }

  const unit = 'pcs'
  const remaining = remainingForTemp(req)
  if (remaining <= 0) {
    Swal.fire('No Stock', `No stock for ${name}. Please place an order.`, 'warning')
    return
  }

  const maxAllowed = maxAllowedForRequest(req, name, unit)
  const selected = currentSelectedQty(req, name, unit)
  const nextTotal = selected + qty

  if (nextTotal > maxAllowed) {
    Swal.fire('Insufficient Stock', `Only ${Math.max(maxAllowed - selected, 0)} pcs available for ${name}.`, 'warning')
    return
  }

  if (maxAllowed > 0 && maxAllowed <= lowStockThreshold) {
    Swal.fire('Low Stock', `${name} is low on stock (${maxAllowed} pcs available).`, 'warning')
  }

  const existing = req.selectedMaterials.find((m) => normalizeKey(m.name, m.unit) === normalizeKey(name, unit))
  const notes = String(req.tempNotes || '').trim()
  if (existing) {
    existing.qty += qty
    if (notes) {
      existing.notes = existing.notes ? `${existing.notes}; ${notes}` : notes
    }
  } else {
    req.selectedMaterials.push({ name, qty, unit, notes: notes || null })
  }

  req.tempMaterial = ''
  req.tempQty = 1
  req.tempNotes = ''
}

const removeMaterial = (req, index) => {
  req.selectedMaterials.splice(index, 1)
}

const markReady = async (req) => {
  if (!req.selectedMaterials.length) {
    Swal.fire('Select Materials', 'Please add at least one material', 'warning')
    return
  }

  try {
    const res = await axios.post(`/procurement/mark-job-ready/${req.id}`, {
      materials: req.selectedMaterials.map((m) => ({
        name: m.name,
        qty: m.qty,
        unit: m.unit || 'pcs',
        notes: m.notes || null,
      })),
    }, { skipGlobalLoading: true })
    const payload = res?.data || {}
    Swal.fire('Success', payload.message || 'Materials updated successfully.', payload.requires_procurement ? 'info' : 'success')
    fetchRequests({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || err.response?.data?.error || 'Failed to update request', 'error')
  }
}

onMounted(() => {
  if (!props.embedded && typeof window !== 'undefined') {
    window.location.replace('/Procurement/ProcurementDashboard?section=requests')
    return
  }
  fetchRequests({ background: hasCachedRequestState })
})
</script>

