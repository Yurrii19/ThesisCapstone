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
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Profile</p>
              <h2 class="mt-1 text-2xl font-extrabold text-slate-900">My Profile</h2>
              <p class="mt-1 text-sm text-slate-600">Keep your personal details updated.</p>
            </div>
            <span class="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Employee View
            </span>
          </div>

          <div v-if="loading" class="mt-4 text-sm text-slate-500">Loading profile...</div>
          <div v-else-if="!canView" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Access restricted. Your HR permissions do not allow viewing the profile page.
          </div>
          <form v-else class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="saveProfile">
              <input v-model="profile.first_name" type="text" placeholder="First Name" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900" required />
              <input v-model="profile.middle_initial" type="text" placeholder="Middle Initial" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900" maxlength="1" />
              <input v-model="profile.last_name" type="text" placeholder="Last Name" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900" required />
              <input
                v-model="profile.contact_number"
                type="text"
                inputmode="numeric"
                placeholder="Contact Number"
                maxlength="11"
                @input="onContactInput"
                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              />
              <input v-model="profile.email" type="email" placeholder="Email" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 md:col-span-2" disabled />
              <div class="md:col-span-2">
                <button type="submit" class="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save Profile</button>
              </div>
          </form>
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

const activeMenu = ref("Profile");
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

const navigateTo = (menu, url) => {
  activeMenu.value = menu;
  showNotificationsMenu.value = false
  showProfileMenu.value = false
  router.visit(url);
};

const applyDashboardPayload = (payload = {}) => {
  profile.value = payload.profile || profile.value;
  employeeData.value = payload.employee || null;
  notifications.value = Array.isArray(payload.notifications) ? payload.notifications : [];
};

if (hasCachedDashboardState) {
  applyDashboardPayload(cachedDashboardState);
}

const fetchProfile = async ({ background = hasCachedDashboardState } = {}) => {
  if (!background) {
    loading.value = true;
  }
  try {
    const res = await axios.get("/employee/dashboard-data");
    applyDashboardPayload(res.data || {});
    writeEmployeeDashboardCache(res.data || {});
  } catch (err) {
    if (!background) {
      Swal.fire("Error", "Failed to load profile.", "error");
    }
  } finally {
    loading.value = false;
  }
};

const saveProfile = async () => {
  try {
    const res = await axios.put("/employee/profile", profile.value);
    profile.value = res.data;
    Swal.fire("Saved", "Profile updated.", "success");
  } catch (err) {
    Swal.fire("Error", "Unable to save profile.", "error");
  }
};

const onContactInput = () => {
  const value = String(profile.value.contact_number || "");
  const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
  profile.value.contact_number = digitsOnly;
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
  fetchProfile({ background: hasCachedDashboardState });
});
</script>
