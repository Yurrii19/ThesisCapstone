<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <nav class="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold">
          EM
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Employee Dashboard</h1>
          <p class="text-xs text-gray-500">Your daily work overview</p>
        </div>
      </div>

      <div class="flex items-center gap-3 relative">
        <div class="relative">
          <button
            type="button"
            class="relative h-10 w-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            @click="toggleNotificationsMenu"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" class="mx-auto h-5 w-5" aria-hidden="true">
              <path d="M15 17H9m9-2V11a6 6 0 1 0-12 0v4l-2 2h16l-2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10.5 20a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span
              v-if="unreadCount"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[18px]"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>

          <div
            v-if="showNotificationsMenu"
            class="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-semibold text-gray-800">Notifications</p>
              <button type="button" class="text-xs font-semibold text-teal-700 hover:underline" @click="refreshNotifications">
                Refresh
              </button>
            </div>
            <div class="max-h-[340px] overflow-y-auto">
              <div v-if="notifications.length === 0" class="px-4 py-6 text-sm text-gray-500">
                No notifications yet.
              </div>
              <div v-else class="divide-y divide-gray-100">
                <div
                  v-for="note in notifications"
                  :key="`nav-note-${note.id}`"
                  class="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
                  @click="handleNotificationClick(note)"
                >
                  <div class="w-2 h-2 mt-2 rounded-full" :class="note.read_at ? 'bg-gray-300' : 'bg-teal-500'"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">{{ noteTitle(note) }}</p>
                    <p class="text-xs text-gray-600 mt-0.5 break-words">{{ noteMessage(note) }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">{{ note.created_at }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            class="h-10 min-w-10 px-3 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            @click="toggleProfileMenu"
          >
            <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
              {{ userInitials }}
            </span>
            <span class="text-xs font-semibold hidden sm:inline">Profile</span>
          </button>

          <div
            v-if="showProfileMenu"
            class="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-xl z-50 py-1"
          >
            <button type="button" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="openProfile">
              Profile
            </button>
            <button type="button" class="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-64 bg-white shadow-r px-4 py-6 flex-shrink-0 h-full overflow-y-auto">
        <div class="mb-6 px-3">
          <p class="text-xs uppercase tracking-wide text-gray-400">Navigation</p>
        </div>
        <ul class="space-y-2">
          <li
            v-for="item in sidebarItems"
            :key="item.key"
            @click="navigateTo(item.label, item.path)"
            :class="menuClass(item.label)"
            class="px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2"
          >
            <span class="text-sm">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </li>
        </ul>
        <div class="mt-8 px-3">
          <div class="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-500">
            {{ sidebarNote }}
          </div>
        </div>
      </aside>

      <main class="flex-1 p-8 overflow-y-auto">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Payslips</p>
              <h2 class="mt-1 text-2xl font-extrabold text-slate-900">My Payslips</h2>
              <p class="mt-1 text-sm text-slate-600">View your payroll history and payouts.</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              @click="fetchPayslips"
            >
              Refresh
            </button>
          </div>

          <div v-if="loading" class="mt-4 text-sm text-slate-500">Loading payslips...</div>
          <div v-else-if="!canView" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Access restricted. Your HR permissions do not allow viewing payroll.
          </div>
          <div v-else-if="payrolls.length === 0" class="mt-4 text-sm text-slate-500">No payslips yet.</div>
          <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
            <article
              v-for="row in payrolls"
              :key="`payroll-${row.id}`"
              class="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Payroll Period</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ payrollPeriodLabel(row) }}</p>
                  <p class="mt-1 text-xs text-slate-500">Pay Date: {{ payrollPayDate(row) }}</p>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{{ row.compensation_model || 'semi_monthly' }}</span>
              </div>
              <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div class="rounded-lg border border-emerald-200 bg-white p-3">
                  <p class="uppercase tracking-wide text-emerald-700">Gross</p>
                  <p class="mt-1 font-semibold text-slate-900">{{ money(payrollGross(row)) }}</p>
                </div>
                <div class="rounded-lg border border-rose-200 bg-white p-3">
                  <p class="uppercase tracking-wide text-rose-700">Deductions</p>
                  <p class="mt-1 font-semibold text-slate-900">{{ money(payrollDeductions(row)) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-900 p-3 text-white">
                  <p class="uppercase tracking-wide text-white/70">Net Pay</p>
                  <p class="mt-1 font-semibold">{{ money(payrollNet(row)) }}</p>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Basic Salary: <span class="font-semibold text-slate-800">{{ money(row.basic_salary ?? 0) }}</span></div>
                <div>Daily Rate: <span class="font-semibold text-slate-800">{{ money(row.daily_rate ?? 500) }}</span></div>
                <div>Overtime & Holiday: <span class="font-semibold text-slate-800">{{ money(row.overtime_holiday ?? 150) }}</span></div>
                <div>Bonuses: <span class="font-semibold text-slate-800">{{ money(row.bonuses_incentives ?? ((Number(row.days_present || 0) || 0) * 100)) }}</span></div>
                <div>Days Present: <span class="font-semibold text-slate-800">{{ row.days_present }}</span></div>
                <div>Days Absent: <span class="font-semibold text-slate-800">{{ row.days_absent }}</span></div>
                <div>Late Days: <span class="font-semibold text-slate-800">{{ row.late_days }}</span></div>
                <div>Meal Allowance: <span class="font-semibold text-slate-800">{{ money(row.meal_allowance ?? 0) }}</span></div>
                <div>Transport Allowance: <span class="font-semibold text-slate-800">{{ money(row.transport_allowance ?? 0) }}</span></div>
                <div>SSS: <span class="font-semibold text-slate-800">{{ money(row.sss_amount ?? 0) }}</span></div>
                <div>Pag-IBIG: <span class="font-semibold text-slate-800">{{ money(row.pagibig_amount ?? 0) }}</span></div>
                <div>PhilHealth: <span class="font-semibold text-slate-800">{{ money(row.philhealth_amount ?? 0) }}</span></div>
                <div>Salary Loan: <span class="font-semibold text-slate-800">{{ money(row.salary_loan ?? 0) }}</span></div>
                <div>SSS Loan: <span class="font-semibold text-slate-800">{{ money(row.sss_loan ?? 0) }}</span></div>
                <div>Health Insurance: <span class="font-semibold text-slate-800">{{ money(row.health_insurance ?? 0) }}</span></div>
                <div>Life Insurance: <span class="font-semibold text-slate-800">{{ money(row.life_insurance ?? 0) }}</span></div>
              </div>
            </article>
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
import {
  normalizeStaffPermissions,
  resolveEmployeeAccessLevel,
  employeeSidebarItems,
  employeeSidebarNote,
} from '@/lib/employee-rbac'
import {
  readEmployeeDashboardCache,
  writeEmployeeDashboardCache,
} from '@/lib/employee-dashboard-cache'

const activeMenu = ref("Payroll");
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
const employeeData = ref(null);
const payrolls = ref([]);
const notifications = ref([]);
const showNotificationsMenu = ref(false);
const showProfileMenu = ref(false);

const hasEmployeeRecord = computed(() => Boolean(employeeData.value?.id))
const staffPermissions = computed(() =>
  normalizeStaffPermissions(employeeData.value?.staff_permissions, { hasEmployee: hasEmployeeRecord.value })
)
const accessLevel = computed(() => resolveEmployeeAccessLevel(staffPermissions.value))
const canView = computed(() => accessLevel.value !== 'none')
const sidebarItems = computed(() => employeeSidebarItems(staffPermissions.value))
const sidebarNote = computed(() => employeeSidebarNote(staffPermissions.value))

const menuClass = (label) =>
  activeMenu.value === label ? 'font-bold text-blue-600 bg-teal-50' : 'text-gray-700 hover:bg-gray-100'

const userInitials = computed(() => {
  const first = String(profile.value?.first_name || '').trim().charAt(0)
  const last = String(profile.value?.last_name || '').trim().charAt(0)
  const result = `${first}${last}`.toUpperCase()
  return result || 'EM'
})

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)
const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
const payrollGross = (row) => {
  if (row?.total_income !== undefined && row?.total_income !== null) return Number(row.total_income) || 0
  const daysPresent = Number(row?.days_present || 0) || 0
  const dailyRate = Number(row?.daily_rate || 500) || 500
  const overtimeHoliday = Number(row?.overtime_holiday || 150) || 0
  const bonuses = Number(row?.bonuses_incentives ?? (daysPresent * 100)) || 0
  const allowances = (Number(row?.meal_allowance || 0) || 0) + (Number(row?.transport_allowance || 0) || 0)
  return (daysPresent * dailyRate) + overtimeHoliday + bonuses + allowances
}
const payrollDeductions = (row) => {
  if (row?.total_deductions !== undefined && row?.total_deductions !== null) return Number(row.total_deductions) || 0
  return [
    row?.sss_amount,
    row?.pagibig_amount,
    row?.philhealth_amount,
    row?.salary_loan,
    row?.sss_loan,
    row?.health_insurance,
    row?.life_insurance,
    row?.union_fee,
    row?.other_deductions,
    row?.leave_without_pay,
    row?.tardiness_deduction,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0)
}
const payrollNet = (row) => {
  if (row?.net_pay !== undefined && row?.net_pay !== null) return Number(row.net_pay) || 0
  return payrollGross(row) - payrollDeductions(row)
}
const payrollPeriodLabel = (row) => {
  const label = String(row?.payroll_period_label || '').trim()
  if (label) return label
  if (row?.payroll_period_start && row?.payroll_period_end) {
    return `${row.payroll_period_start} to ${row.payroll_period_end}`
  }
  return 'Semi-monthly payroll'
}
const payrollPayDate = (row) => String(row?.pay_date || row?.created_at || 'N/A').trim() || 'N/A'

const navigateTo = (menu, url) => {
  activeMenu.value = menu;
  showNotificationsMenu.value = false
  showProfileMenu.value = false
  router.visit(url);
};

const applyDashboardPayload = (payload = {}) => {
  profile.value = payload.profile || profile.value;
  employeeData.value = payload.employee || null;
  payrolls.value = Array.isArray(payload.payrolls) ? payload.payrolls : [];
  notifications.value = Array.isArray(payload.notifications) ? payload.notifications : [];
};

if (hasCachedDashboardState) {
  applyDashboardPayload(cachedDashboardState);
}

const fetchPayslips = async ({ background = hasCachedDashboardState } = {}) => {
  if (!background) {
    loading.value = true;
  }
  try {
    const res = await axios.get("/employee/dashboard-data");
    applyDashboardPayload(res.data || {});
    writeEmployeeDashboardCache(res.data || {});
  } catch (err) {
    if (!background) {
      Swal.fire("Error", "Failed to load payslips.", "error");
    }
  } finally {
    loading.value = false;
  }
};

const refreshNotifications = async () => {
  try {
    const res = await axios.get('/user/notifications')
    notifications.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    Swal.fire("Error", "Failed to fetch notifications.", "error");
  }
}

const markRead = async (id) => {
  if (!id) return
  try {
    await axios.post(`/user/notifications/${id}/read`)
    const n = notifications.value.find((row) => row.id === id)
    if (n) n.read_at = n.read_at || new Date().toISOString()
  } catch (err) {
    // Ignore notification read errors
  }
}

const openNotificationTarget = (note) => {
  const link = note?.link || note?.data?.link
  if (link) {
    window.location.assign(link)
    return
  }
}

const handleNotificationClick = async (note) => {
  if (!note?.read_at && note?.id) {
    await markRead(note.id)
  }
  openNotificationTarget(note)
}

const noteTitle = (note) => {
  const data = note?.data || {}
  return note?.title || data.title || data.message || note?.message || 'Notification'
}

const noteMessage = (note) => {
  const data = note?.data || {}
  return note?.message || data.message || data.details || ''
}

const toggleNotificationsMenu = async () => {
  const next = !showNotificationsMenu.value
  showNotificationsMenu.value = next
  if (next) showProfileMenu.value = false
  if (next && notifications.value.length === 0) {
    await refreshNotifications()
  }
}

const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value
  if (showProfileMenu.value) showNotificationsMenu.value = false
}

const openProfile = () => {
  showProfileMenu.value = false
  router.visit('/employee/profile')
}

const logout = async () => {
  await confirmAndLogout()
};

onMounted(() => {
  fetchPayslips({ background: hasCachedDashboardState });
});
</script>
