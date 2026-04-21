<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col bg-slate-50">
      <HrTopbar @logout="logout" />

      <div class="hr-content flex flex-col gap-5 p-6">
        <section v-if="activeMenu === 'Dashboard'">
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-4 overflow-hidden rounded-2xl border-t-4 border-t-emerald-600 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">HR Workspace</p>
                <h2 class="mt-1 text-4xl font-extrabold leading-none tracking-tight text-slate-900">Workforce &amp; Personnel Management</h2>
                <p class="mt-2 text-sm text-slate-600">Track employee readiness, accredited partners, payroll status, and team coverage.</p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="rounded-full border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:brightness-105"
                  @click="exportWorkforceSummary"
                >
                  Export Workforce Summary
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-slate-400"
                  @click="openPayrollWorkspace"
                >
                  Open Payroll
                </button>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Employee Summary</p>
                <div class="mt-3 flex items-center justify-between">
                  <h3 class="text-2xl font-semibold text-slate-900">{{ stats.totalEmployees }}</h3>
                  <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">+{{ stats.monthlyGrowth }}%</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Active, probationary, and on-leave employees.</p>
              </div>

              <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Open Roles</p>
                <div class="mt-3 flex items-center justify-between">
                  <h3 class="text-2xl font-semibold text-slate-900">{{ stats.openPositions }}</h3>
                  <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">{{ stats.priorityRoles }} Priority</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Hiring across field, safety, and support roles.</p>
              </div>

              <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Attendance / Leave</p>
                <div class="mt-3 flex items-center justify-between">
                  <h3 class="text-2xl font-semibold text-slate-900">{{ stats.onLeave }}</h3>
                  <span class="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">{{ stats.leaveType }}</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Planned leave and approved absences.</p>
              </div>

              <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Payroll Readiness</p>
                <div class="mt-3 flex items-center justify-between">
                  <h3 class="text-2xl font-semibold text-slate-900">{{ payrollReady.earning_rows }}</h3>
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Payroll rows</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Employees with earnings prepared for payroll processing.</p>
              </div>
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Payroll Readiness</p>
                    <h3 class="mt-2 text-xl font-semibold text-slate-900">Payroll Snapshot</h3>
                  </div>
                  <span class="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">Workforce only</span>
                </div>
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Employee Earnings</p>
                    <p class="mt-2 text-lg font-bold text-emerald-700">PHP {{ Number(payrollReady.employee_earnings_total || 0).toFixed(2) }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Ready Payroll Rows</p>
                    <p class="mt-2 text-lg font-bold text-slate-900">{{ payrollReady.earning_rows }}</p>
                  </div>
                </div>
                <p class="mt-4 text-xs text-slate-500">Focused on employee payroll preparation only. Revenue and service workflow reporting stay with other office workspaces.</p>
              </section>

              <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Quick Access</p>
                  <h3 class="mt-2 text-xl font-semibold text-slate-900">HR Workspace Modules</h3>
                </div>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    v-for="shortcut in shortcuts"
                    :key="shortcut.label"
                    type="button"
                    class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
                    @click="navigateTo(shortcut.label, shortcut.path)"
                  >
                    <p class="text-sm font-semibold text-slate-900">{{ shortcut.label }}</p>
                    <p class="mt-1 text-xs text-slate-500">{{ shortcut.description }}</p>
                  </button>
                </div>
              </section>
            </div>

            <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Team Assignment Overview</p>
                  <h3 class="mt-2 text-xl font-semibold text-slate-900">Coverage by Team</h3>
                </div>
                <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {{ assignedTeamCount }} active teams
                </span>
              </div>

              <div v-if="teamSummary.length" class="mt-4 space-y-3">
                <div
                  v-for="team in teamSummary"
                  :key="team.name"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-slate-900">{{ team.name }}</p>
                    <p class="text-xs font-medium text-slate-500">{{ team.count }} people</p>
                  </div>
                  <div class="mt-2 h-2 w-full rounded-full bg-slate-200">
                    <div class="h-2 rounded-full bg-emerald-500" :style="{ width: team.coverage + '%' }"></div>
                  </div>
                  <p class="mt-2 text-xs text-slate-500">{{ team.coverage }}% of active workforce coverage.</p>
                </div>
              </div>

              <div v-else class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                <p class="text-sm font-semibold text-slate-900">No team assignments yet</p>
                <p class="mt-1 text-xs text-slate-500">Assign approved employees to teams to see coverage here.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import HrSidebarNav from '@/Components/HrSidebarNav.vue'
import HrTopbar from '@/Components/HrTopbar.vue'
import { confirmAndLogout } from '@/lib/auth-flow'
import { HR_DASHBOARD_CACHE_KEY } from '@/lib/dashboard-prefetch'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'

const activeMenu = ref('Dashboard')
const cachedDashboardState = readCachedViewState(HR_DASHBOARD_CACHE_KEY, null)
const hasCachedDashboardState = Boolean(cachedDashboardState)

const stats = ref({
  totalEmployees: 0,
  monthlyGrowth: 0,
  openPositions: 0,
  priorityRoles: 0,
  onLeave: 0,
  leaveType: 'On Leave',
  ...(cachedDashboardState?.stats || {}),
})
const teamSummary = ref(cachedDashboardState?.teamSummary || [])
const payrollReady = ref({
  employee_earnings_total: 0,
  earning_rows: 0,
  ...(cachedDashboardState?.payrollReady || {}),
})

const shortcuts = [
  {
    label: 'Employee Management',
    path: '/hr/recruitment',
    description: 'Manage employee records, onboarding, and staffing status.',
  },
  {
    label: 'Team Assignment',
    path: '/hr/linked-employees',
    description: 'Review approved employee-to-team and partner assignment links.',
  },
  {
    label: 'Provider Accreditation',
    path: '/hr/service-providers',
    description: 'Onboard and accredit external partners for workforce support.',
  },
  {
    label: 'Payroll',
    path: '/hr/payroll',
    description: 'Review payroll-ready earnings and payout preparation.',
  },
]

const assignedTeamCount = computed(() => teamSummary.value.length)

function navigateTo(menu, url) {
  activeMenu.value = menu
  router.visit(url)
}

const exportWorkforceSummary = () => {
  try {
    const lines = [
      ['Metric', 'Value'],
      ['Total Employees', stats.value.totalEmployees],
      ['Monthly Growth (%)', stats.value.monthlyGrowth],
      ['Open Roles', stats.value.openPositions],
      ['Priority Roles', stats.value.priorityRoles],
      ['Employees on Leave', stats.value.onLeave],
      ['Leave Type', stats.value.leaveType],
      ['Payroll Ready Rows', payrollReady.value.earning_rows],
      ['Employee Earnings Total', Number(payrollReady.value.employee_earnings_total || 0).toFixed(2)],
      ['Assigned Teams', assignedTeamCount.value],
    ]
    const csv = lines.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'workforce-summary.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    Swal.fire({
      icon: 'success',
      title: 'Exported',
      text: 'Workforce summary downloaded.',
      timer: 1200,
      showConfirmButton: false,
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Export failed',
      text: 'Unable to download the workforce summary.',
    })
  }
}

const openPayrollWorkspace = () => {
  navigateTo('Payroll', '/hr/payroll')
}

const applyDashboardPayload = (payload = {}) => {
  stats.value = {
    ...stats.value,
    ...(payload.stats || {}),
  }
  teamSummary.value = payload.teamSummary || []
  payrollReady.value = {
    ...payrollReady.value,
    ...(payload.payrollReady || {}),
  }
}

const fetchDashboardData = async ({ background = hasCachedDashboardState } = {}) => {
  try {
    const res = await axios.get('/hr/dashboard-data')
    applyDashboardPayload(res.data || {})
    writeCachedViewState(HR_DASHBOARD_CACHE_KEY, res.data || {})
  } catch (error) {
    if (!background) {
      Swal.fire('Error', 'Failed to load dashboard data', 'error')
    }
  }
}

onMounted(() => {
  fetchDashboardData({ background: hasCachedDashboardState })
})

const logout = async () => {
  await confirmAndLogout()
}
</script>
