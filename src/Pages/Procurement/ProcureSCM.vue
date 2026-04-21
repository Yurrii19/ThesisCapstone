<template>
  <section class="space-y-5">
    <div class="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-700 text-white p-6 shadow-lg">
      <p class="text-xs uppercase tracking-[0.14em] text-white/85">Supply Chain</p>
      <h2 class="text-2xl font-bold mt-1">Supply Chain Management</h2>
      <p class="text-sm text-white/90 mt-1">Connect incoming items to each request awaiting materials, including required and received quantities.</p>
    </div>

    <div v-if="loading" class="grid gap-4">
      <div class="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"></div>
      <div class="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"></div>
    </div>

    <div v-else class="space-y-4">
      <div v-if="refreshing" class="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-semibold text-slate-500">
        Refreshing latest supply chain data...
      </div>
      <article class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-sm font-bold text-slate-900">Add Purchase Entry</p>
            <p class="mt-1 text-xs text-slate-500">Online purchase stays in SCM receiving. Physical purchase goes straight to received stock after receipt upload.</p>
          </div>
          <div class="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              class="rounded-full px-4 py-2 text-xs font-semibold transition"
              :class="form.purchase_type === 'online' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'"
              @click="form.purchase_type = 'online'"
            >
              Online Purchase
            </button>
            <button
              type="button"
              class="rounded-full px-4 py-2 text-xs font-semibold transition"
              :class="form.purchase_type === 'physical' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white'"
              @click="form.purchase_type = 'physical'"
            >
              Physical Purchase
            </button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-8 gap-3">
          <select v-model="form.material_name" @change="handleMaterialChange" class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" required>
            <option disabled value="">Select material</option>
            <optgroup v-for="group in groupedMaterialOptions" :key="group.key" :label="group.label">
              <option v-for="opt in group.options" :key="`${opt.material_name}-${opt.unit}`" :value="opt.material_name">
                {{ opt.label }}
              </option>
            </optgroup>
          </select>

          <template v-if="form.purchase_type === 'online'">
            <input v-model.trim="form.purchase_link" type="url" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Purchase link (https://...)" required />
          </template>
          <template v-else>
            <label class="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-400">
              <span class="truncate pr-3">{{ form.receipt_image ? form.receipt_image.name : 'Upload receipt image or PDF' }}</span>
              <span class="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Choose File</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" class="hidden" @change="handleReceiptChange" />
            </label>
          </template>

          <input v-model.number="form.quantity" type="number" min="1" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Quantity" required />
          <input v-model.trim="form.unit" type="text" class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50" placeholder="Unit (pcs)" readonly required />
          <input v-model.trim="form.supplier_name" type="text" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Supplier / Store" />
          <input v-model.number="form.unit_cost" type="number" min="0" step="0.01" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Unit cost (PHP)" />
          <input v-model.number="form.total_cost" type="number" min="0" step="0.01" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Total cost (PHP)" />
          <input v-model="form.expected_date" :min="minDate" :max="maxDate" type="date" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <p v-if="form.material_name" class="mt-2 text-xs text-slate-500">
          Auto-detected needed quantity:
          <span class="font-semibold text-slate-700">{{ detectedNeededQty(form.material_name) }}</span>
          <span v-if="selectedMaterialOption" class="ml-2">
            Current stock: <span class="font-semibold text-slate-700">{{ selectedMaterialOption.available }} {{ selectedMaterialOption.unit }}</span>
          </span>
        </p>
        <p v-if="form.purchase_type === 'physical'" class="mt-1 text-xs text-emerald-700">
          Physical purchase records receipt proof immediately and updates inventory as received stock.
        </p>
        <div class="mt-3 flex justify-end">
          <button :disabled="saving" @click="addStockOrder" class="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {{ saving ? 'Saving...' : (form.purchase_type === 'physical' ? 'Record Physical Purchase' : 'Add to Stock Orders') }}
          </button>
        </div>
      </article>

      <div v-if="rows.length" class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Request</th>
              <th class="px-4 py-3 text-left font-semibold">Customer</th>
              <th class="px-4 py-3 text-left font-semibold">Business</th>
              <th class="px-4 py-3 text-left font-semibold">Service</th>
              <th class="px-4 py-3 text-left font-semibold">Material Needed</th>
              <th class="px-4 py-3 text-right font-semibold">Required</th>
              <th class="px-4 py-3 text-right font-semibold">Ordered</th>
              <th class="px-4 py-3 text-right font-semibold">Received</th>
              <th class="px-4 py-3 text-right font-semibold">Incoming</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" class="border-t border-slate-100 hover:bg-slate-50/70">
              <td class="px-4 py-3 font-semibold text-slate-800">#{{ row.requestId }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.customer }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.business }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.service }}</td>
              <td class="px-4 py-3 text-slate-800">{{ row.material }}</td>
              <td class="px-4 py-3 text-right text-slate-700">{{ row.required }} {{ row.unit }}</td>
              <td class="px-4 py-3 text-right text-slate-700">{{ row.ordered }}</td>
              <td class="px-4 py-3 text-right text-emerald-700">{{ row.received }}</td>
              <td class="px-4 py-3 text-right font-semibold" :class="row.incoming > 0 ? 'text-amber-700' : 'text-slate-500'">{{ row.incoming }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-bold text-slate-900">Stock Orders (SCM Receiving)</p>
          <span class="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-slate-900 text-white border-slate-900">Ordered</span>
        </div>

        <div v-if="filteredStockOrders.length" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article v-for="order in filteredStockOrders" :key="`scm-order-${order.id}`" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Material</p>
                <h3 class="text-lg font-bold text-slate-900">{{ order.material_name }}</h3>
                <p class="mt-1 text-xs text-slate-500">
                  PR: {{ order.pr_reference || `PR-${order.id}` }}
                  <span v-if="order.urgency" class="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    {{ String(order.urgency).toUpperCase() }}
                  </span>
                </p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="px-3 py-1 rounded-full text-xs font-semibold capitalize" :class="statusClass(order.status)">
                  {{ order.status }}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="isPhysicalPurchaseType(order.purchase_type) ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'">
                  {{ isPhysicalPurchaseType(order.purchase_type) ? 'Physical' : 'Online' }}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-semibold capitalize" :class="prStatusClass(order.pr_status)">
                  {{ prettyPrStatus(order.pr_status) }}
                </span>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Quantity</p>
                <p class="font-semibold text-slate-800 mt-1">{{ order.quantity }} {{ order.unit || 'pcs' }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Expected Date</p>
                <p class="font-semibold text-slate-800 mt-1">{{ formatDate(order.expected_date) }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Arrival Date</p>
                <p class="font-semibold text-slate-800 mt-1">{{ formatDate(order.arrival_date) }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Source</p>
                <p class="font-semibold text-slate-800 mt-1">{{ order.business_name || 'General Stock' }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Supplier</p>
                <p class="font-semibold text-slate-800 mt-1">{{ order.supplier_store || order.supplier_name || 'N/A' }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Total Cost</p>
                <p class="font-semibold text-slate-800 mt-1">{{ money(order.total_cost || order.estimated_cost || ((order.unit_cost || 0) * (order.quantity || 0))) }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Finance Release</p>
                <p class="font-semibold text-slate-800 mt-1">{{ money(order.finance_release_amount) }}</p>
                <p class="mt-1">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold" :class="releaseStatusClass(order.finance_release_status)">
                    {{ releaseStatusLabel(order.finance_release_status) }}
                  </span>
                </p>
              </div>
            </div>

            <div class="mt-3 text-sm">
              <a v-if="order.purchase_link" :href="order.purchase_link" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
                {{ order.purchase_link }}
              </a>
              <p v-else class="text-slate-500">No purchase link provided.</p>
            </div>

            <div class="mt-3">
              <button
                v-if="['pending','rejected'].includes(String(order.pr_status || '').toLowerCase())"
                type="button"
                :disabled="receivingOrderId === order.id"
                @click="reviewPr(order)"
                class="mr-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {{ receivingOrderId === order.id ? 'Saving...' : 'Review PR' }}
              </button>
              <button
                v-if="canProceedWithPurchase(order) && String(order.purchase_type || '').toLowerCase() === 'online'"
                type="button"
                :disabled="receivingOrderId === order.id"
                @click="markPrInTransit(order)"
                class="mr-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {{ receivingOrderId === order.id ? 'Updating...' : 'Mark In Transit' }}
              </button>
              <button
                v-if="canProceedWithPurchase(order) && isPhysicalPurchaseType(order.purchase_type)"
                type="button"
                :disabled="receivingOrderId === order.id"
                @click="completeDirect(order)"
                class="mr-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {{ receivingOrderId === order.id ? 'Submitting...' : 'Complete Direct Purchase' }}
              </button>
              <button
                v-if="String(order.status).toLowerCase() !== 'received' && ['in_transit','delivered','completed'].includes(String(order.pr_status || '').toLowerCase())"
                type="button"
                :disabled="receivingOrderId === order.id"
                @click="markOrderReceived(order)"
                class="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {{ receivingOrderId === order.id ? 'Marking...' : 'Mark as Received' }}
              </button>
              <p v-else class="text-sm font-semibold text-emerald-600">Received and recorded.</p>
            </div>

            <p class="mt-3 text-xs" :class="fundingNoteClass(order)">
              {{ fundingNote(order) }}
            </p>
          </article>
        </div>

        <div v-else class="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-sm">
          {{ emptyOrdersText }}
        </div>
      </article>

      <article v-if="recentPhysicalPurchases.length" class="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-900">Recent Physical Purchases</p>
            <p class="mt-1 text-xs text-slate-500">Receipt-backed entries already posted into available stock.</p>
          </div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{{ recentPhysicalPurchases.length }} recent</span>
        </div>
        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <article v-for="order in recentPhysicalPurchases" :key="`physical-order-${order.id}`" class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-emerald-700">Material</p>
                <h3 class="text-base font-bold text-slate-900">{{ order.material_name }}</h3>
                <p class="mt-1 text-xs text-slate-600">{{ order.quantity }} {{ order.unit || 'pcs' }} • {{ money(order.total_cost || order.estimated_cost) }}</p>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">Received</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-lg border border-emerald-100 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Store</p>
                <p class="font-semibold text-slate-800 mt-1">{{ order.supplier_store || order.supplier_name || 'N/A' }}</p>
              </div>
              <div class="rounded-lg border border-emerald-100 bg-white p-2.5">
                <p class="text-[11px] uppercase tracking-wide text-slate-400">Posted Date</p>
                <p class="font-semibold text-slate-800 mt-1">{{ formatDate(order.received_at || order.arrival_date || order.created_at) }}</p>
              </div>
            </div>
            <div class="mt-3">
              <a
                v-if="firstReceiptLink(order)"
                :href="firstReceiptLink(order)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                View Receipt
              </a>
              <p v-else class="text-xs text-slate-500">Receipt file unavailable.</p>
            </div>
          </article>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'
import { resolveStoredFileUrl } from '@/lib/file-url'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
})

const SCM_CACHE_KEY = 'procurement-scm'
const cachedScmState = readCachedViewState(SCM_CACHE_KEY, null)
const hasCachedScmState = Boolean(cachedScmState)
const loading = ref(!hasCachedScmState)
const refreshing = ref(false)
const saving = ref(false)
const receivingOrderId = ref(null)
const awaitingRequests = ref(Array.isArray(cachedScmState?.awaitingRequests) ? cachedScmState.awaitingRequests : [])
const stockOrders = ref(Array.isArray(cachedScmState?.stockOrders) ? cachedScmState.stockOrders : [])
const materialOptions = ref(Array.isArray(cachedScmState?.materialOptions) ? cachedScmState.materialOptions : [])
const inventoryRows = ref(Array.isArray(cachedScmState?.inventoryRows) ? cachedScmState.inventoryRows : [])

const todayString = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const currentYearMonth = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return { yyyy, mm }
}

const minDate = todayString()

const maxDate = (() => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = now.getMonth()
  const lastDay = new Date(yyyy, mm + 1, 0).getDate()
  const month = String(mm + 1).padStart(2, '0')
  const day = String(lastDay).padStart(2, '0')
  return `${yyyy}-${month}-${day}`
})()

const form = reactive({
  purchase_type: 'online',
  material_name: '',
  purchase_link: '',
  quantity: 1,
  unit: 'pcs',
  supplier_name: '',
  unit_cost: null,
  total_cost: null,
  expected_date: minDate,
  receipt_image: null,
})

const resetForm = () => {
  form.purchase_type = 'online'
  form.material_name = ''
  form.purchase_link = ''
  form.quantity = 1
  form.unit = 'pcs'
  form.supplier_name = ''
  form.unit_cost = null
  form.total_cost = null
  form.expected_date = minDate
  form.receipt_image = null
}

watch(
  () => [form.quantity, form.unit_cost],
  ([qty, unitCost]) => {
    if (unitCost === null || unitCost === '') {
      return
    }
    const quantity = Number(qty)
    const cost = Number(unitCost)
    if (quantity > 0 && cost >= 0 && Number.isFinite(cost)) {
      form.total_cost = Number((quantity * cost).toFixed(2))
    }
  },
)
watch(
  () => form.purchase_type,
  (nextType) => {
    if (nextType === 'online') {
      form.receipt_image = null
      return
    }
    form.purchase_link = ''
  }
)

const fullName = (r) =>
  `${r.first_name ?? ''} ${r.middle_initial ? `${r.middle_initial}.` : ''} ${r.last_name ?? ''}`.replace(/\s+/g, ' ').trim()

const normalizeMaterialKey = (name, unit) => `${String(name || '').trim().toLowerCase()}::${String(unit || 'pcs').trim().toLowerCase()}`
const inventoryByMaterial = computed(() => {
  const map = new Map()
  for (const row of inventoryRows.value || []) {
    const key = normalizeMaterialKey(row?.material_name, row?.unit || 'pcs')
    map.set(key, {
      available: Number(row?.available || 0),
      unit: String(row?.unit || 'pcs').trim() || 'pcs',
    })
  }
  return map
})
const flatMaterialOptions = computed(() => (
  (materialOptions.value || [])
    .map((option) => {
      const materialName = String(option?.material_name || '').trim()
      const unit = String(option?.unit || 'pcs').trim() || 'pcs'
      const stock = inventoryByMaterial.value.get(normalizeMaterialKey(materialName, unit))
      return {
        material_name: materialName,
        unit,
        service_track: String(option?.service_track || 'general').trim() || 'general',
        available: Number(stock?.available || 0),
        label: `${materialName} (available: ${Number(stock?.available || 0)} ${unit})`,
      }
    })
    .filter((option) => option.material_name)
))
const groupedMaterialOptions = computed(() => {
  const labels = {
    plumbing: 'Plumbing Materials',
    siphoning: 'Siphoning Materials',
    general: 'General Materials',
  }
  return ['plumbing', 'siphoning', 'general']
    .map((track) => ({
      key: track,
      label: labels[track],
      options: flatMaterialOptions.value
        .filter((option) => (option.service_track || 'general') === track)
        .sort((left, right) => left.material_name.localeCompare(right.material_name)),
    }))
    .filter((group) => group.options.length)
})
const selectedMaterialOption = computed(() => flatMaterialOptions.value.find((option) => option.material_name === form.material_name))

const stockByRequestAndMaterial = computed(() => {
  const map = new Map()

  for (const order of stockOrders.value) {
    const requestId = Number(order.service_request_id)
    const unit = String(order.unit || 'pcs').trim() || 'pcs'
    const materialKey = normalizeMaterialKey(order.material_name, unit)
    const key = `${requestId}::${materialKey}`

    const existing = map.get(key) || { ordered: 0, received: 0 }
    const qty = Number(order.quantity) > 0 ? Number(order.quantity) : 0

    if (String(order.status).toLowerCase() === 'received') {
      existing.received += qty
    } else {
      existing.ordered += qty
    }

    map.set(key, existing)
  }

  return map
})

const rows = computed(() => {
  const output = []

  for (const req of awaitingRequests.value) {
    const materials = Array.isArray(req.materials) ? req.materials : []

    for (const mat of materials) {
      const unit = String(mat.unit || 'pcs').trim() || 'pcs'
      const materialKey = normalizeMaterialKey(mat.name, unit)
      const stock = stockByRequestAndMaterial.value.get(`${req.id}::${materialKey}`) || { ordered: 0, received: 0 }
      const required = Number(mat.qty) > 0 ? Number(mat.qty) : 0
      const incoming = Math.max(stock.ordered - stock.received, 0)

      output.push({
        key: `${req.id}-${materialKey}`,
        requestId: req.id,
        customer: fullName(req) || 'N/A',
        business: req.business_name || 'N/A',
        service: req.service_type || 'N/A',
        material: mat.name || 'N/A',
        unit,
        required,
        ordered: stock.ordered,
        received: stock.received,
        incoming,
      })
    }
  }

  return output
})

const neededByMaterial = computed(() => {
  const map = new Map()
  for (const req of awaitingRequests.value) {
    const mats = Array.isArray(req.materials) ? req.materials : []
    for (const mat of mats) {
      const name = String(mat.name || '').trim().toLowerCase()
      if (!name) continue
      const qty = Number(mat.qty) > 0 ? Number(mat.qty) : 0
      map.set(name, (map.get(name) || 0) + qty)
    }
  }
  return map
})

const detectedNeededQty = (materialName) => {
  return neededByMaterial.value.get(String(materialName || '').trim().toLowerCase()) || 0
}

const handleMaterialChange = () => {
  const selected = flatMaterialOptions.value.find((opt) => opt.material_name === form.material_name)
  form.unit = selected?.unit || 'pcs'
  const needed = detectedNeededQty(form.material_name)
  if (needed > 0) form.quantity = needed
}
const handleReceiptChange = (event) => {
  form.receipt_image = event?.target?.files?.[0] || null
}

const summary = computed(() => ({
  awaitingRequests: awaitingRequests.value.length,
  requiredQty: rows.value.reduce((sum, row) => sum + row.required, 0),
  incomingQty: rows.value.reduce((sum, row) => sum + row.incoming, 0),
}))

const filteredStockOrders = computed(() => {
  const list = stockOrders.value || []
  return list.filter((o) => String(o.status).toLowerCase() !== 'received')
})
const recentPhysicalPurchases = computed(() => (
  (stockOrders.value || [])
    .filter((order) => isPhysicalPurchaseType(order?.purchase_type) && Array.isArray(order?.receipt_files) && order.receipt_files.length)
    .sort((left, right) => new Date(right?.received_at || right?.created_at || 0).getTime() - new Date(left?.received_at || left?.created_at || 0).getTime())
    .slice(0, 6)
))

const emptyOrdersText = computed(() => 'No ordered stock entries pending receive.')

const formatDate = (date) => {
  if (!date) return 'N/A'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
const firstReceiptLink = (order) => {
  const firstFile = Array.isArray(order?.receipt_files) ? order.receipt_files[0] : null
  const source = firstFile?.url || firstFile?.path || ''
  return source ? resolveStoredFileUrl(source, 'procurement-receipts') : ''
}

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ordered') return 'bg-amber-100 text-amber-700'
  if (normalized === 'received') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

const prettyPrStatus = (status) => {
  const s = String(status || '').toLowerCase().trim()
  if (!s) return 'pending'
  return s.replace(/_/g, ' ')
}

const prStatusClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'bg-slate-100 text-slate-700'
  if (s === 'pending_finance_approval') return 'bg-amber-100 text-amber-700'
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (s === 'rejected') return 'bg-rose-100 text-rose-700'
  if (s === 'in_transit') return 'bg-cyan-100 text-cyan-700'
  if (s === 'delivered') return 'bg-indigo-100 text-indigo-700'
  if (s === 'completed') return 'bg-teal-100 text-teal-700'
  return 'bg-slate-100 text-slate-700'
}

const money = (value) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
}

const releaseStatusLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'Pending release'
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const releaseStatusClass = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'released') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'awaiting_finance_approval') return 'bg-amber-100 text-amber-700'
  if (normalized === 'not_released') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

const isPhysicalPurchaseType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'direct' || normalized === 'physical'
}

const canProceedWithPurchase = (order) => (
  String(order?.pr_status || '').toLowerCase() === 'approved'
  && String(order?.finance_release_status || '').toLowerCase() === 'released'
)

const fundingNote = (order) => {
  const prStatus = String(order?.pr_status || '').toLowerCase()
  const releaseStatus = String(order?.finance_release_status || '').toLowerCase()
  const settlement = String(order?.finance_settlement_status || '').toLowerCase()
  if (settlement === 'additional_funds_needed') {
    return 'Actual purchase exceeded the released amount. Finance follow-up is needed for additional funds.'
  }
  if (settlement === 'change_due_back') {
    return 'Purchase used less than the released amount. Record the returned balance to Finance.'
  }
  if (prStatus === 'pending_finance_approval' || releaseStatus === 'awaiting_finance_approval') {
    return 'Waiting for Finance approval and upfront fund release before Procurement can buy.'
  }
  if (prStatus === 'rejected' || releaseStatus === 'not_released') {
    return 'Finance rejected this PR. Update the estimate or supplier details, then resubmit.'
  }
  if (canProceedWithPurchase(order)) {
    return `Funds released: ${money(order?.finance_release_amount)} via ${String(order?.finance_release_mode || '').replace(/_/g, ' ') || 'Finance release'}.`
  }
  return 'Review PR status, fund release, and delivery progress here.'
}

const fundingNoteClass = (order) => {
  const prStatus = String(order?.pr_status || '').toLowerCase()
  const releaseStatus = String(order?.finance_release_status || '').toLowerCase()
  const settlement = String(order?.finance_settlement_status || '').toLowerCase()
  if (prStatus === 'rejected' || releaseStatus === 'not_released' || settlement === 'additional_funds_needed') return 'text-rose-600'
  if (prStatus === 'pending_finance_approval' || releaseStatus === 'awaiting_finance_approval') return 'text-amber-700'
  if (settlement === 'change_due_back') return 'text-indigo-600'
  if (canProceedWithPurchase(order)) return 'text-emerald-700'
  return 'text-slate-500'
}

const fetchMaterialOptions = async () => {
  try {
    const [templateRes, inventoryRes] = await Promise.all([
      axios.get('/procurement/material-template-options'),
      axios.get('/procurement/inventory-summary'),
    ])
    materialOptions.value = Array.isArray(templateRes.data) ? templateRes.data : []
    inventoryRows.value = Array.isArray(inventoryRes.data) ? inventoryRes.data : []
    writeCachedViewState(SCM_CACHE_KEY, {
      awaitingRequests: awaitingRequests.value,
      stockOrders: stockOrders.value,
      materialOptions: materialOptions.value,
      inventoryRows: inventoryRows.value,
    })
  } catch {
    materialOptions.value = []
    inventoryRows.value = []
  }
}

const fetchData = async ({ background = false } = {}) => {
  if (background) refreshing.value = true
  else loading.value = true
  try {
    const [requestsRes, ordersRes] = await Promise.all([
      axios.get('/procurement/requests-awaiting-material'),
      axios.get('/procurement/stock-orders'),
    ])

    awaitingRequests.value = Array.isArray(requestsRes.data) ? requestsRes.data : []
    stockOrders.value = Array.isArray(ordersRes.data) ? ordersRes.data : []
    writeCachedViewState(SCM_CACHE_KEY, {
      awaitingRequests: awaitingRequests.value,
      stockOrders: stockOrders.value,
      materialOptions: materialOptions.value,
      inventoryRows: inventoryRows.value,
    })
  } catch {
    if (!background) {
      Swal.fire('Error', 'Failed to load supply chain data', 'error')
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const addStockOrder = async () => {
  if (!form.material_name.trim()) {
    Swal.fire('Missing Item', 'Please select a material.', 'warning')
    return
  }
  if (form.purchase_type === 'online' && !form.purchase_link.trim()) {
    Swal.fire('Missing Link', 'Purchase link is required.', 'warning')
    return
  }
  if (form.purchase_type === 'physical' && !form.receipt_image) {
    Swal.fire('Missing Receipt', 'Receipt image or PDF is required for physical purchase.', 'warning')
    return
  }
  if (!(Number(form.quantity) > 0)) {
    Swal.fire('Invalid Quantity', 'Quantity must be greater than 0.', 'warning')
    return
  }
  if (!form.unit.trim()) {
    Swal.fire('Missing Unit', 'Unit is required.', 'warning')
    return
  }
  if (!form.expected_date) {
    Swal.fire('Missing Date', 'Expected date is required.', 'warning')
    return
  }
  if (form.unit_cost !== null && form.unit_cost !== '' && Number(form.unit_cost) < 0) {
    Swal.fire('Invalid Cost', 'Unit cost cannot be negative.', 'warning')
    return
  }
  if (form.total_cost !== null && form.total_cost !== '' && Number(form.total_cost) < 0) {
    Swal.fire('Invalid Cost', 'Total cost cannot be negative.', 'warning')
    return
  }

  saving.value = true
  try {
    if (form.purchase_type === 'physical') {
      const formData = new FormData()
      formData.append('purchase_type', 'physical')
      formData.append('material_name', form.material_name.trim())
      formData.append('quantity', String(Number(form.quantity)))
      formData.append('unit', form.unit.trim())
      formData.append('supplier_name', form.supplier_name?.trim() || '')
      formData.append('unit_cost', form.unit_cost === null || form.unit_cost === '' ? '' : String(Number(form.unit_cost)))
      formData.append('total_cost', form.total_cost === null || form.total_cost === '' ? '' : String(Number(form.total_cost)))
      formData.append('expected_date', form.expected_date || '')
      formData.append('receipt_image', form.receipt_image)
      await axios.post('/procurement/stock-orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipGlobalLoading: true,
      })
    } else {
      await axios.post('/procurement/stock-orders', {
        purchase_type: 'online',
        material_name: form.material_name.trim(),
        purchase_link: form.purchase_link.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        supplier_name: form.supplier_name?.trim() || null,
        unit_cost: form.unit_cost === null || form.unit_cost === '' ? null : Number(form.unit_cost),
        total_cost: form.total_cost === null || form.total_cost === '' ? null : Number(form.total_cost),
        expected_date: form.expected_date,
      }, { skipGlobalLoading: true })
    }
    Swal.fire(
      'Success',
      form.purchase_type === 'physical'
        ? 'Physical purchase recorded and inventory updated.'
        : 'Online stock order added.',
      'success'
    )
    resetForm()
    fetchMaterialOptions().catch(() => {})
    fetchData({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to add stock order', 'error')
  } finally {
    saving.value = false
  }
}

const reviewPr = async (order) => {
  const result = await Swal.fire({
    title: `Review PR ${order.pr_reference || `PR-${order.id}`}`,
    html: `
      <div style="display:grid;gap:8px;text-align:left">
        <label>Purchase Type
          <select id="swal-pr-purchase-type" class="swal2-input">
            <option value="online">Online / Supplier Order</option>
            <option value="physical">Physical / Direct Hardware Purchase</option>
          </select>
        </label>
        <input id="swal-pr-supplier-store" class="swal2-input" placeholder="Supplier/Store" value="${order.supplier_store || order.supplier_name || ''}">
        <input id="swal-pr-estimated-cost" class="swal2-input" placeholder="Estimated Cost (PHP)" type="number" min="0" step="0.01" value="${order.estimated_cost || order.total_cost || ''}">
        <input id="swal-pr-expected-date" class="swal2-input" type="date" value="${order.expected_delivery_date || order.expected_date || ''}">
        <input id="swal-pr-link" class="swal2-input" placeholder="Purchase link (optional for direct)" value="${order.purchase_link || ''}">
        <textarea id="swal-pr-note" class="swal2-textarea" placeholder="Procurement note (optional)">${order.procurement_note || ''}</textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit to Finance',
    preConfirm: () => {
      const purchaseType = document.getElementById('swal-pr-purchase-type')?.value || ''
      const supplierStore = document.getElementById('swal-pr-supplier-store')?.value || ''
      const estimatedCost = document.getElementById('swal-pr-estimated-cost')?.value || ''
      const expectedDeliveryDate = document.getElementById('swal-pr-expected-date')?.value || ''
      const purchaseLink = document.getElementById('swal-pr-link')?.value || ''
      const procurementNote = document.getElementById('swal-pr-note')?.value || ''
      if (!purchaseType) {
        Swal.showValidationMessage('Purchase type is required.')
        return false
      }
      if (!(Number(estimatedCost) > 0)) {
        Swal.showValidationMessage('Estimated cost is required before sending the PR to Finance.')
        return false
      }
      if (purchaseType === 'online' && !expectedDeliveryDate) {
        Swal.showValidationMessage('Expected delivery date is required for online orders.')
        return false
      }
      return { purchaseType, supplierStore, estimatedCost, expectedDeliveryDate, purchaseLink, procurementNote }
    },
  })
  if (!result.isConfirmed || !result.value) return

  receivingOrderId.value = order.id
  try {
    await axios.post(`/procurement/stock-orders/${order.id}/review-pr`, {
      purchase_type: result.value.purchaseType,
      supplier_store: result.value.supplierStore || null,
      estimated_cost: result.value.estimatedCost === '' ? null : Number(result.value.estimatedCost),
      expected_delivery_date: result.value.expectedDeliveryDate || null,
      purchase_link: result.value.purchaseLink || null,
      procurement_note: result.value.procurementNote || null,
    }, { skipGlobalLoading: true })
    Swal.fire('Submitted', 'PR submitted for finance approval.', 'success')
    fetchData({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to review PR', 'error')
  } finally {
    receivingOrderId.value = null
  }
}

const markPrInTransit = async (order) => {
  receivingOrderId.value = order.id
  try {
    await axios.post(`/procurement/stock-orders/${order.id}/in-transit`, {
      expected_delivery_date: order.expected_delivery_date || order.expected_date || null,
    }, { skipGlobalLoading: true })
    Swal.fire('Updated', 'PR marked as in transit.', 'success')
    fetchData({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to mark in transit', 'error')
  } finally {
    receivingOrderId.value = null
  }
}

const completeDirect = async (order) => {
  const result = await Swal.fire({
    title: `Complete Direct Purchase (${order.pr_reference || `PR-${order.id}`})`,
    html: `
      <div style="display:grid;gap:8px;text-align:left">
        <input id="swal-direct-receipt" class="swal2-file" type="file" accept=".jpg,.jpeg,.png,.pdf">
        <input id="swal-direct-store" class="swal2-input" placeholder="Store name" value="${order.supplier_store || order.supplier_name || ''}">
        <input id="swal-direct-unit-cost" class="swal2-input" type="number" min="0" step="0.01" placeholder="Unit cost" value="${order.unit_cost || ''}">
        <input id="swal-direct-total-cost" class="swal2-input" type="number" min="0" step="0.01" placeholder="Total cost" value="${order.total_cost || order.estimated_cost || ''}">
        <textarea id="swal-direct-note" class="swal2-textarea" placeholder="Note">${order.procurement_note || ''}</textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Complete Purchase',
    preConfirm: () => {
      const fileInput = document.getElementById('swal-direct-receipt')
      const receipt = fileInput?.files?.[0]
      if (!receipt) {
        Swal.showValidationMessage('Receipt image/file is required.')
        return false
      }
      return {
        receipt,
        supplierStore: document.getElementById('swal-direct-store')?.value || '',
        unitCost: document.getElementById('swal-direct-unit-cost')?.value || '',
        totalCost: document.getElementById('swal-direct-total-cost')?.value || '',
        note: document.getElementById('swal-direct-note')?.value || '',
      }
    },
  })
  if (!result.isConfirmed || !result.value) return

  const formData = new FormData()
  formData.append('receipt_image', result.value.receipt)
  formData.append('supplier_store', result.value.supplierStore || '')
  formData.append('unit_cost', result.value.unitCost || '')
  formData.append('total_cost', result.value.totalCost || '')
  formData.append('procurement_note', result.value.note || '')

  receivingOrderId.value = order.id
  try {
    await axios.post(`/procurement/stock-orders/${order.id}/complete-direct`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipGlobalLoading: true,
    })
    Swal.fire('Completed', 'Direct purchase recorded, receipt uploaded, and inventory updated.', 'success')
    fetchData({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to complete direct purchase', 'error')
  } finally {
    receivingOrderId.value = null
  }
}

const markOrderReceived = async (order) => {
  receivingOrderId.value = order.id
  try {
    await axios.post(`/procurement/mark-received/${order.id}`, {}, { skipGlobalLoading: true })
    Swal.fire('Success', 'Stock marked as received.', 'success')
    fetchData({ background: true }).catch(() => {})
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to update stock', 'error')
  } finally {
    receivingOrderId.value = null
  }
}

onMounted(() => {
  if (!props.embedded && typeof window !== 'undefined') {
    window.location.replace('/Procurement/ProcurementDashboard?section=supply-chain')
    return
  }
  fetchData({ background: hasCachedScmState })
  fetchMaterialOptions()
})
</script>


