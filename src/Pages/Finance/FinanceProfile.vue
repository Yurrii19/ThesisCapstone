<template>
  <FinanceShell
    title="Finance Profile"
    subtitle="Manage your finance account details and session."
    active-path="/finance/profile"
  >
    <section class="space-y-6">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 p-6 shadow-lg">
        <div class="absolute -top-6 -right-10 h-32 w-32 rounded-full bg-white/20"></div>
        <div class="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/15"></div>
        <div class="relative flex flex-col md:flex-row md:items-center gap-6 text-white">
          <div class="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
            {{ initials }}
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-bold">My Profile</h2>
            <p class="text-white/80 text-sm">Manage your details and finance operations access.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">Active</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p class="text-xs text-gray-400">Full Name</p>
              <p class="font-semibold text-gray-800 mt-1">{{ profile.full_name || 'N/A' }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p class="text-xs text-gray-400">Department</p>
              <p class="font-semibold text-gray-800 mt-1">{{ profile.department || 'N/A' }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p class="text-xs text-gray-400">Email</p>
              <p class="font-semibold text-gray-800 mt-1">{{ profile.email || 'N/A' }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p class="text-xs text-gray-400">Contact Number</p>
              <p class="font-semibold text-gray-800 mt-1">{{ profile.phone || 'N/A' }}</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              @click="openEditModal"
              class="sm:max-w-xs w-full bg-teal-600 text-white py-3 rounded-xl shadow hover:bg-teal-700 transition font-semibold"
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h4 class="text-lg font-semibold text-gray-800">Account Status</h4>
          <div class="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p class="text-xs text-gray-400">Role</p>
            <p class="mt-1 font-semibold text-emerald-700">Finance Officer</p>
            <p class="text-xs text-gray-400 mt-3">Department</p>
            <p class="mt-1 font-semibold text-gray-800">{{ profile.department || 'Finance and Billing' }}</p>
            <p class="text-xs text-gray-500 mt-3">Use this account for billing operations, approvals, payout actions, and reports.</p>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl relative">
        <button
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
          @click="closeEditModal"
        >
          &times;
        </button>
        <div class="mb-4">
          <h3 class="text-xl font-bold text-gray-800">Edit Profile</h3>
          <p class="text-sm text-gray-500">Update your basic account details.</p>
        </div>
        <form @submit.prevent="save" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">Full Name</label>
              <input v-model="editProfile.full_name" type="text" placeholder="Full Name" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">Department</label>
              <input v-model="editProfile.department" type="text" placeholder="Department" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">Email</label>
              <input v-model="editProfile.email" type="email" placeholder="Email" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">Contact Number</label>
              <input v-model="editProfile.phone" type="text" placeholder="Contact Number" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required />
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeEditModal" class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700">Cancel</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-semibold disabled:opacity-60">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </FinanceShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import FinanceShell from './FinanceShell.vue'
import axios from 'axios'
import { createToastInterface, POSITION } from 'vue-toastification'

const props = defineProps({
  profile: {
    type: Object,
    default: () => ({
      full_name: '',
      email: '',
      phone: '',
      department: '',
    }),
  },
})

const profile = reactive({
  full_name: props.profile.full_name || '',
  email: props.profile.email || '',
  phone: props.profile.phone || '',
  department: props.profile.department || '',
})
const editProfile = reactive({
  full_name: props.profile.full_name || '',
  email: props.profile.email || '',
  phone: props.profile.phone || '',
  department: props.profile.department || '',
})

const saving = ref(false)
const showEditModal = ref(false)
const toast = createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 1800,
  closeButton: 'button',
  showCloseButtonOnHover: false,
})

const initials = computed(() => {
  const name = String(profile.full_name || '').trim()
  if (!name) return 'FO'
  const parts = name.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
})

async function save() {
  saving.value = true
  try {
    await axios.put('/finance/profile', editProfile)
    profile.full_name = editProfile.full_name
    profile.email = editProfile.email
    profile.phone = editProfile.phone
    profile.department = editProfile.department
    showEditModal.value = false
    toast.success('Finance profile updated.')
  } catch {
    toast.error('Unable to save finance profile.')
  } finally {
    saving.value = false
  }
}

function openEditModal() {
  editProfile.full_name = profile.full_name
  editProfile.email = profile.email
  editProfile.phone = profile.phone
  editProfile.department = profile.department
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

</script>
