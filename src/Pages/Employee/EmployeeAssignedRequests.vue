<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col bg-slate-50">
      <HrTopbar @logout="logout" />

      <main class="p-6 max-md:p-4">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Assigned Requests</p>
              <h2 class="mt-1 text-2xl font-extrabold text-slate-900">My Work Queue</h2>
              <p class="mt-1 text-sm text-slate-600">Review and manage jobs assigned to you.</p>
            </div>
            <span class="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Employee View
            </span>
          </div>

          <div v-if="loading" class="mt-4 text-sm text-slate-500">Loading requests...</div>
          <div v-else-if="assignedRequests.length === 0" class="mt-4 text-sm text-slate-500">No assigned requests.</div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="req in assignedRequests" :key="req.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-sm font-semibold text-slate-900">{{ req.service_type }}</p>
              <p class="text-xs text-slate-500">{{ req.address_text }}</p>
              <p class="text-xs text-slate-500">Preferred: {{ req.preferred_date || 'TBD' }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span
                  v-if="req.status !== 'assigned'"
                  class="inline-block rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                >
                  {{ req.status }}
                </span>
                <div v-else class="flex gap-2">
                  <button
                    v-if="canManage"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs font-semibold"
                    @click="updateRequest(req, 'accepted')"
                  >
                    Accept
                  </button>
                  <button
                    v-if="canManage"
                    class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs font-semibold"
                    @click="updateRequest(req, 'rejected')"
                  >
                    Reject
                  </button>
                  <span v-else class="text-xs text-slate-500">Contact HR for request actions.</span>
                </div>
                <button
                  v-if="canManage && canRequestConsumables(req)"
                  class="ml-auto bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-md text-xs font-semibold"
                  @click="requestConsumables(req)"
                >
                  Request Consumables
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import Swal from "@/lib/sweetalert-toast-shim";
import { confirmAndLogout } from '@/lib/auth-flow'
import HrSidebarNav from '@/Components/HrSidebarNav.vue'
import HrTopbar from '@/Components/HrTopbar.vue'
import {
  readEmployeeDashboardCache,
  writeEmployeeDashboardCache,
} from '@/lib/employee-dashboard-cache'

const activeMenu = ref("Assigned Requests");
const cachedDashboardState = readEmployeeDashboardCache();
const hasCachedDashboardState = Boolean(cachedDashboardState);
const loading = ref(!hasCachedDashboardState);
const profile = ref({
  first_name: "",
  middle_initial: "",
  last_name: "",
  email: "",
  contact_number: "",
});
const assignedRequests = ref([]);
const employeeData = ref(null);

const canManage = computed(() => Boolean(employeeData.value?.id))

const navigateTo = (menu, url) => {
  activeMenu.value = menu;
  router.visit(url);
};

const applyDashboardPayload = (payload = {}) => {
  profile.value = payload.profile || profile.value;
  assignedRequests.value = payload.assigned_requests || [];
  employeeData.value = payload.employee || null;
};

if (hasCachedDashboardState) {
  applyDashboardPayload(cachedDashboardState);
}

const fetchAssignedRequests = async ({ background = hasCachedDashboardState } = {}) => {
  if (!background) {
    loading.value = true;
  }
  try {
    const res = await axios.get("/employee/dashboard-data");
    applyDashboardPayload(res.data || {});
    writeEmployeeDashboardCache(res.data || {});
  } catch (err) {
    if (!background) {
      Swal.fire("Error", "Failed to load assigned requests.", "error");
    }
  } finally {
    loading.value = false;
  }
};

const updateRequest = async (req, status) => {
  const confirm = await Swal.fire({
    title: status === 'accepted' ? 'Accept this request?' : 'Reject this request?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#0f172a',
    cancelButtonColor: '#94a3b8',
  });
  if (!confirm.isConfirmed) return;

  try {
    await axios.patch(`/employee/assigned-requests/${req.id}`, { status });
    await fetchAssignedRequests();
    Swal.fire('Success', `Request ${status}.`, 'success');
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to update request.', 'error');
  }
};

const canRequestConsumables = (req) => {
  const status = String(req?.status || '').trim().toLowerCase();
  return ['assigned', 'accepted', 'awaiting_material', 'job_ready', 'in_progress'].includes(status);
};

const parseConsumableLines = (value) => {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split(',').map((x) => x.trim());
    const name = parts[0] || '';
    const quantity = Number(parts[1] || 1);
    const unit = parts[2] || 'pcs';
    return { name, quantity, unit };
  });
};

const requestConsumables = async (req) => {
  const result = await Swal.fire({
    title: 'Request Consumables',
    text: 'Enter one item per line: name, quantity, unit (example: PVC Pipe, 2, pcs)',
    input: 'textarea',
    inputPlaceholder: 'PVC Pipe, 2, pcs\nSealant, 1, tube',
    showCancelButton: true,
    confirmButtonText: 'Send to Procurement',
    inputValidator: (value) => {
      if (!String(value || '').trim()) return 'Please enter at least one item.';
      const items = parseConsumableLines(value);
      if (!items.length) return 'Please enter at least one valid line.';
      for (const item of items) {
        if (!item.name) return 'Each line must include item name.';
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) return `Invalid quantity for "${item.name}".`;
      }
      return null;
    },
  });

  if (!result.isConfirmed) return;

  const items = parseConsumableLines(result.value).map((item) => ({
    name: item.name,
    quantity: Math.round(item.quantity),
    unit: item.unit,
  }));

  try {
    await axios.post(`/employee/assigned-requests/${req.id}/request-consumables`, { items });
    Swal.fire('Sent', 'Consumables request sent to procurement.', 'success');
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.message || 'Failed to request consumables.', 'error');
  }
};

const logout = async () => {
  await confirmAndLogout()
};

onMounted(() => {
  fetchAssignedRequests({ background: hasCachedDashboardState });
});
</script>

