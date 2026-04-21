<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col bg-slate-50">
      <HrTopbar @logout="logout" />

      <main class="p-6 max-md:p-4">
        <div v-if="loading" class="text-gray-500">Loading dashboard...</div>

        <section v-else class="space-y-6">
        <section v-if="!canView" class="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p class="text-sm font-semibold text-rose-800">Access restricted</p>
          <p class="mt-1 text-xs text-rose-700">
            Your HR permissions do not allow viewing this dashboard. Please contact HR for access.
          </p>
        </section>

          <section v-else class="space-y-6">
          <section v-if="latestEmergencyAlert" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm animate-pulse">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">High Priority Alert</p>
                <h2 class="mt-1 text-2xl font-extrabold text-rose-950">{{ noteTitle(latestEmergencyAlert) }}</h2>
                <p class="mt-1 text-sm text-rose-900">{{ noteMessage(latestEmergencyAlert) }}</p>
                <p class="mt-2 text-xs text-rose-700">
                  Location: {{ latestEmergencyAlert?.data?.address_text || latestEmergencyAlert?.address_text || 'Unavailable' }}
                </p>
                <p class="mt-1 text-xs text-rose-700">
                  Response window countdown: {{ emergencyCountdownLabel }}
                </p>
                <p v-if="latestEmergencyProofs.length" class="mt-1 text-xs text-rose-700">
                  Proofs: {{ latestEmergencyProofs.length }} file{{ latestEmergencyProofs.length === 1 ? '' : 's' }} attached
                </p>
                <div v-if="latestEmergencyProofs.length" class="mt-3 flex flex-wrap gap-2">
                  <a
                    v-for="proof in latestEmergencyProofs.slice(0, 3)"
                    :key="proof.url || proof.name"
                    :href="proof.url || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 hover:underline"
                  >
                    {{ proof.name }}
                  </a>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  @click="handleNotificationClick(latestEmergencyAlert)"
                >
                  Open Alert
                </button>
              </div>
            </div>
          </section>

        <section v-if="teamAssignmentPending" class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-amber-900">Team Confirmation Required</p>
              <p class="text-xs text-amber-800">
                  You were assigned to {{ employeeData?.team }}. Confirm to become active in the team.
                </p>
              </div>
              <div v-if="canManage" class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  :disabled="submittingTeamDecision"
                  @click="respondTeamAssignment('accept')"
                >
                  {{ submittingTeamDecision ? 'Saving...' : 'Accept Team' }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                  :disabled="submittingTeamDecision"
                  @click="respondTeamAssignment('reject')"
                >
                  Request Reassignment
                </button>
              </div>
              <p v-else class="text-xs text-amber-700">Contact HR to confirm your assignment.</p>
            </div>
          </section>

          <section v-else-if="teamAssignmentAccepted" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-emerald-900">Team Assignment Accepted</p>
                <p class="text-xs text-emerald-800">
                  Team: {{ employeeData?.team }}. You can request reassignment if needed.
                </p>
              </div>
              <button
                v-if="canManage"
                type="button"
                class="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                :disabled="submittingTeamDecision"
                @click="respondTeamAssignment('reject')"
              >
                {{ submittingTeamDecision ? 'Saving...' : 'Request Reassignment' }}
              </button>
              <p v-else class="text-xs text-emerald-700">Reassignment requests are managed by HR.</p>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Employee Overview</p>
                <h2 class="mt-1 text-2xl font-extrabold text-slate-900">{{ employeeProfileName }}</h2>
                <p class="mt-1 text-sm text-slate-600">Team status, schedule, and assignments.</p>
              </div>
              <span class="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Employee View
              </span>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p class="mt-1 text-sm font-bold text-slate-900">{{ employeeData?.status || 'Active' }}</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Team</p>
                <p class="mt-1 text-sm font-bold text-slate-900">{{ employeeData?.team || 'Unassigned' }}</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Group Schedule</p>
                <p class="mt-1 text-sm font-semibold text-slate-700">{{ groupScheduleLabel }}</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Assigned Requests</p>
                <p class="mt-1 text-sm font-bold text-slate-900">{{ assignedRequests.length }}</p>
              </article>
            </div>

            <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-500">Team Assignment Confirmation</p>
              <p class="mt-1 text-sm font-semibold" :class="teamAssignmentStatusClass">
                {{ teamAssignmentStatusLabel }}
              </p>
              <p v-if="employeeData?.team_assignment_response_note" class="mt-1 text-xs text-slate-500">
                {{ employeeData?.team_assignment_response_note }}
              </p>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Earnings</p>
                <h2 class="mt-1 text-2xl font-extrabold text-slate-900">Daily Earnings Summary</h2>
                <p class="mt-1 text-sm text-slate-600">Track your daily job shares and compensation totals.</p>
              </div>
              <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Updated Today
              </span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <article class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Today You Earned</p>
                <p class="mt-1 text-xl font-extrabold text-emerald-900">PHP {{ formatAmount(earningsOverview.today_total) }}</p>
              </article>
              <article class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Jobs Count Today</p>
                <p class="mt-1 text-xl font-extrabold text-sky-900">{{ Number(earningsOverview.today_job_count || 0) }}</p>
              </article>
              <article class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Cancellation Compensation</p>
                <p class="mt-1 text-xl font-extrabold text-amber-900">PHP {{ formatAmount(earningsOverview.today_compensation_total) }}</p>
              </article>
            </div>

            <div class="mt-4">
              <p class="text-xs uppercase tracking-wide text-slate-500">Daily Earnings</p>
              <div v-if="dailyEarnings.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                <div
                  v-for="row in dailyEarnings"
                  :key="`earning-${row.date}`"
                  class="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <p class="text-xs text-slate-500">{{ row.date }}</p>
                  <p class="text-sm font-semibold text-emerald-700">PHP {{ Number(row.total || 0).toFixed(2) }}</p>
                  <p class="text-[11px] text-slate-500">{{ row.count }} entries</p>
                  <p v-if="Number(row.compensation_total || 0) > 0" class="text-[11px] font-semibold text-amber-700">
                    Compensation: PHP {{ formatAmount(row.compensation_total) }}
                  </p>
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-slate-500">No earnings posted yet.</p>
            </div>
          </section>
        </section>
      </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import Swal from "@/lib/sweetalert-toast-shim";
import { confirmAndLogout } from '@/lib/auth-flow'
import HrSidebarNav from '@/Components/HrSidebarNav.vue'
import HrTopbar from '@/Components/HrTopbar.vue'
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

const activeMenu = ref("Dashboard");
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
const dailyEarnings = ref([]);
const earningsOverview = ref({
  today_total: 0,
  today_compensation_total: 0,
  today_job_count: 0,
});
const submittingTeamDecision = ref(false);
const schedulePopupShown = ref(false);
const notifications = ref([]);
const assignedRequests = ref([]);
const showNotificationsMenu = ref(false);
const showProfileMenu = ref(false);
const currentTimeTick = ref(Date.now());
const shownEmergencyAlertIds = new Set();
let notificationPoller = null;
let notificationRefreshPoller = null;

const hasEmployeeRecord = computed(() => Boolean(employeeData.value?.id))
const staffPermissions = computed(() =>
  normalizeStaffPermissions(employeeData.value?.staff_permissions, { hasEmployee: hasEmployeeRecord.value })
)
const accessLevel = computed(() => resolveEmployeeAccessLevel(staffPermissions.value))
const canView = computed(() => accessLevel.value !== 'none')
const canManage = computed(() => ['manage', 'approve'].includes(accessLevel.value))
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

const employeeProfileName = computed(() => {
  const first = String(profile.value?.first_name || '').trim()
  const middle = String(profile.value?.middle_initial || '').trim()
  const last = String(profile.value?.last_name || '').trim()
  return [first, middle ? `${middle}.` : '', last].filter(Boolean).join(' ').trim() || 'Employee'
})

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)
const isEmergencyNotification = (note) => (
  String(note?.priority || note?.data?.priority || '').toLowerCase() === 'high'
  || String(note?.category || note?.data?.category || '').toLowerCase() === 'emergency'
  || String(note?.type || note?.data?.type || '').toLowerCase() === 'emergency_booking'
)
const emergencyNotifications = computed(() => notifications.value.filter((note) => isEmergencyNotification(note)))
const latestEmergencyAlert = computed(() => (
  emergencyNotifications.value.find((note) => !note.read_at)
  || emergencyNotifications.value[0]
  || null
))
const parseDeadline = (note) => String(note?.response_deadline_at || note?.data?.response_deadline_at || note?.emergency_deadline_at || note?.data?.emergency_deadline_at || '').trim()
const notificationProofs = (note) => {
  const data = note?.data || {}
  const rawProofs = data.emergency_proofs || note?.emergency_proofs || data.emergency_proof_urls || note?.emergency_proof_urls || []
  const list = Array.isArray(rawProofs) ? rawProofs : []
  return list.map((entry, index) => {
    if (typeof entry === 'string') {
      const url = entry.trim()
      return url ? { name: `Proof ${index + 1}`, url } : null
    }
    const url = String(entry?.url || entry?.path || entry?.storage_url || '').trim()
    const name = String(entry?.name || entry?.file_name || entry?.original_name || `Proof ${index + 1}`).trim()
    if (!url && !name) return null
    return { url, name: name || `Proof ${index + 1}` }
  }).filter(Boolean)
}
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char])
const latestEmergencyProofs = computed(() => notificationProofs(latestEmergencyAlert.value))
const formatEmergencyCountdown = (deadlineText) => {
  if (!deadlineText) return 'Countdown unavailable'
  const target = new Date(deadlineText)
  if (Number.isNaN(target.getTime())) return 'Countdown unavailable'
  const diff = Math.max(0, target.getTime() - currentTimeTick.value)
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${minutes}m ${seconds}s`
}
const emergencyCountdownLabel = computed(() => formatEmergencyCountdown(parseDeadline(latestEmergencyAlert.value)))

const normalizedTeamAssignmentStatus = computed(() => {
  const raw = String(employeeData.value?.team_assignment_status || "").trim().toLowerCase();
  if (raw === "accepted" || raw === "pending" || raw === "rejected") return raw;
  const hasTeam = String(employeeData.value?.team || "").trim() !== "";
  return hasTeam ? "accepted" : "unassigned";
});

const teamAssignmentPending = computed(() => normalizedTeamAssignmentStatus.value === "pending");
const teamAssignmentAccepted = computed(() => normalizedTeamAssignmentStatus.value === "accepted");

const teamAssignmentStatusLabel = computed(() => {
  const status = normalizedTeamAssignmentStatus.value;
  if (status === "accepted") return "Accepted by you";
  if (status === "pending") return "Waiting for your approval";
  if (status === "rejected") return "Reassignment requested";
  return "No team assignment yet";
});

const teamAssignmentStatusClass = computed(() => {
  const status = normalizedTeamAssignmentStatus.value;
  if (status === "accepted") return "text-emerald-600";
  if (status === "pending") return "text-amber-600";
  if (status === "rejected") return "text-rose-600";
  return "text-slate-600";
});

const normalizedScheduleTimeFrom = computed(() =>
  String(employeeData.value?.team_schedule_time_from || employeeData.value?.team_schedule_time || "").trim().slice(0, 5)
);
const normalizedScheduleTimeTo = computed(() =>
  String(employeeData.value?.team_schedule_time_to || "").trim().slice(0, 5)
);
const groupScheduleLabel = computed(() => {
  const date = String(employeeData.value?.team_schedule_date || "").trim();
  const timeFrom = normalizedScheduleTimeFrom.value;
  const timeTo = normalizedScheduleTimeTo.value;
  if (!date && !timeFrom && !timeTo) return "Not set yet";
  if (!date) return `${timeFrom}${timeTo ? ` - ${timeTo}` : ""}`.trim();
  if (!timeFrom && !timeTo) return date;
  if (!timeTo) return `${date} ${timeFrom}`;
  return `${date} ${timeFrom} - ${timeTo}`;
});

const navigateTo = (menu, url) => {
  activeMenu.value = menu;
  showNotificationsMenu.value = false
  showProfileMenu.value = false
  router.visit(url);
};

const formatAmount = (value) => Number(value || 0).toFixed(2);

const applyDashboardPayload = (payload = {}) => {
  profile.value = payload.profile || profile.value;
  employeeData.value = payload.employee || null;
  dailyEarnings.value = Array.isArray(payload.daily_earnings) ? payload.daily_earnings : [];
  notifications.value = Array.isArray(payload.notifications) ? payload.notifications : [];
  assignedRequests.value = Array.isArray(payload.assigned_requests) ? payload.assigned_requests : [];
  earningsOverview.value = {
    today_total: Number(payload?.earnings_overview?.today_total || 0),
    today_compensation_total: Number(payload?.earnings_overview?.today_compensation_total || 0),
    today_job_count: Number(payload?.earnings_overview?.today_job_count || 0),
  };
};

if (hasCachedDashboardState) {
  applyDashboardPayload(cachedDashboardState);
}

const fetchDashboardData = async ({ background = hasCachedDashboardState } = {}) => {
  if (!background) {
    loading.value = true;
  }
  try {
    const res = await axios.get("/employee/dashboard-data");
    applyDashboardPayload(res.data || {});
    writeEmployeeDashboardCache(res.data || {});
    await showSchedulePopupIfNeeded();
  } catch (err) {
    if (!background) {
      Swal.fire("Error", "Failed to load dashboard data.", "error");
    }
  } finally {
    loading.value = false;
  }
};

const refreshNotifications = async () => {
  try {
    const res = await axios.get('/user/notifications')
    notifications.value = Array.isArray(res.data) ? res.data : []
    await showEmergencyAlertIfNeeded()
  } catch (err) {
    // Keep polling quiet if notifications are temporarily unavailable.
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
  router.visit('/employee/notifications')
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

const showEmergencyAlertIfNeeded = async () => {
  const emergencyNote = (notifications.value || []).find((note) => isEmergencyNotification(note) && !note.read_at)
  if (!emergencyNote || shownEmergencyAlertIds.has(emergencyNote.id)) return
  shownEmergencyAlertIds.add(emergencyNote.id)
  const proofs = notificationProofs(emergencyNote).slice(0, 3)
  const proofMarkup = proofs.length
    ? `
      <div style="margin-top:12px;text-align:left;font-size:12px;line-height:1.6;color:#7f1d1d">
        <div style="font-weight:700;margin-bottom:4px;">Proof files:</div>
        <ul style="margin:0;padding-left:18px;">
          ${proofs.map((proof) => `
            <li>
              ${proof.url
                ? `<a href="${escapeHtml(proof.url)}" target="_blank" rel="noopener noreferrer" style="color:#b91c1c;text-decoration:underline;">${escapeHtml(proof.name)}</a>`
                : escapeHtml(proof.name)
              }
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : ''
  await Swal.fire({
    icon: 'warning',
    titleText: noteTitle(emergencyNote),
    html: `
      <div style="text-align:left">
        <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(noteMessage(emergencyNote) || 'High-priority emergency booking needs immediate attention.')}</div>
        <div style="font-size:12px;line-height:1.6;color:#7f1d1d">
          <div><strong>Countdown:</strong> ${escapeHtml(emergencyCountdownLabel.value)}</div>
          <div><strong>Location:</strong> ${escapeHtml(String(emergencyNote?.data?.address_text || emergencyNote?.address_text || 'Unavailable'))}</div>
        </div>
        ${proofMarkup}
      </div>
    `,
    confirmButtonText: 'Open Alert',
    confirmButtonColor: '#dc2626',
    showCancelButton: true,
    cancelButtonText: 'Later',
  }).then((result) => {
    if (result.isConfirmed) {
      handleNotificationClick(emergencyNote)
    }
  })
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

const respondTeamAssignment = async (action) => {
  if (!employeeData.value?.id || !employeeData.value?.team) {
    Swal.fire("Warning", "No team assignment found.", "warning");
    return;
  }

  let reason = null;
  if (action === "reject") {
    const result = await Swal.fire({
      title: "Request reassignment?",
      text: "You can provide a reason so HR Manager can reassign you.",
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. Skill mismatch",
      showCancelButton: true,
      confirmButtonText: "Request Reassignment",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;
    reason = result.value || null;
  } else {
    const result = await Swal.fire({
      title: "Accept team assignment?",
      text: `Confirm assignment to ${employeeData.value.team}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Accept Team",
    });
    if (!result.isConfirmed) return;
  }

  submittingTeamDecision.value = true;
  try {
    const res = await axios.patch("/employee/team-assignment/respond", {
      action,
      reason,
    });

    if (res?.data?.employee) {
      employeeData.value = {
        ...employeeData.value,
        ...res.data.employee,
      };
      await showSchedulePopupIfNeeded();
    }

    Swal.fire("Success", res?.data?.message || "Team assignment updated.", "success");
  } catch (err) {
    const message = err?.response?.data?.message || "Failed to update team assignment.";
    Swal.fire("Error", message, "error");
  } finally {
    submittingTeamDecision.value = false;
  }
};

const showSchedulePopupIfNeeded = async () => {
  if (schedulePopupShown.value) return;
  if (!employeeData.value?.id) return;
  if (normalizedTeamAssignmentStatus.value !== "accepted") return;

  const team = String(employeeData.value?.team || "").trim();
  const date = String(employeeData.value?.team_schedule_date || "").trim();
  const timeFrom = normalizedScheduleTimeFrom.value;
  const timeTo = normalizedScheduleTimeTo.value;
  if (!team || !date || !timeFrom || !timeTo) return;

  const key = `employee-team-schedule:${employeeData.value.id}:${team}:${date}:${timeFrom}:${timeTo}`;
  if (window.localStorage.getItem(key) === "1") return;

  schedulePopupShown.value = true;
  await Swal.fire({
    icon: "info",
    title: "Team Schedule Set",
    text: `Team: ${team}\nDate: ${date}\nTime: ${timeFrom} - ${timeTo}`,
    confirmButtonText: "Got it",
  });
  window.localStorage.setItem(key, "1");
};

onMounted(() => {
  fetchDashboardData({ background: hasCachedDashboardState });
  currentTimeTick.value = Date.now()
  notificationPoller = setInterval(() => {
    currentTimeTick.value = Date.now()
    if (notifications.value.length) {
      showEmergencyAlertIfNeeded()
    }
  }, 1000)
  notificationRefreshPoller = setInterval(() => {
    refreshNotifications()
  }, 15000)
});

onBeforeUnmount(() => {
  if (notificationPoller) {
    clearInterval(notificationPoller)
    notificationPoller = null
  }
  if (notificationRefreshPoller) {
    clearInterval(notificationRefreshPoller)
    notificationRefreshPoller = null
  }
});
</script>

