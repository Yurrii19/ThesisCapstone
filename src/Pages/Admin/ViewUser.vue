<template>
  <div>
    <!-- Modal Background -->
    <transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div class="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-y-auto">

          <!-- Header -->
          <div class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Account review</p>
                <h2 class="mt-1 text-2xl font-black tracking-tight text-slate-900">User Details</h2>
              </div>
              <button
                @click="closeModal"
                :disabled="actingOnUser"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >&times;</button>
            </div>
          </div>

          <div class="space-y-6 bg-slate-50 p-5 sm:p-6">
            <div v-if="loadingUser && !hasUserDetails" class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p class="text-base font-semibold text-slate-700">Loading user details...</p>
              <p class="mt-2 text-sm text-slate-500">Please wait while we fetch the registration record.</p>
            </div>

            <template v-else>

            <!-- Account Overview Card -->
            <div class="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold mb-4 text-teal-600">Account Overview</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="detail in accountOverviewRows"
                  :key="detail.label"
                  :class="[detail.full ? 'md:col-span-2' : '', 'rounded-lg border border-gray-200 bg-white p-3']"
                >
                  <p class="text-sm text-gray-500">{{ detail.label }}</p>
                  <p class="font-medium break-words">{{ detail.value }}</p>
                </div>
              </div>
            </div>

            <!-- Personal Info Card -->
            <div class="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold mb-4 text-teal-600">Personal Information</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="detail in personalDetailRows"
                  :key="detail.label"
                  :class="[detail.full ? 'md:col-span-2' : '', 'rounded-lg border border-gray-200 bg-white p-3']"
                >
                  <p class="text-sm text-gray-500">{{ detail.label }}</p>
                  <p class="font-medium break-words">{{ detail.value }}</p>
                </div>
              </div>
              <div v-if="mapUrl" class="mt-4">
                <p class="text-sm text-gray-500 mb-2">Location Map</p>
                <iframe :src="mapUrl" class="w-full h-56 rounded-lg border" loading="lazy"></iframe>
              </div>
            </div>

            <!-- Profile Photo -->
            <div v-if="profilePhoto" class="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold mb-4 text-teal-600">Profile Photo</h3>
              <div class="w-full md:w-1/2">
                <button v-if="profilePhotoImageUrl" type="button" class="w-full" @click="openFilePreview(profilePhoto, 'Profile Photo', profilePhotoImageUrl)">
                  <img
                    :src="profilePhotoImageUrl"
                    alt="Profile Photo"
                    class="w-full h-64 rounded border bg-slate-100 object-contain cursor-zoom-in"
                    @error="handleImageLoadError(profilePhoto, user.value?.profile_photo_url, { uid: user.value?.uid || user.value?.id, field: 'profile_photo' })"
                  />
                </button>
                <div v-else class="flex h-64 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  Preview unavailable
                </div>
                <p class="text-xs text-gray-500 mt-2">Click to preview</p>
              </div>
            </div>

            <!-- User Government ID -->
            <div v-if="displayedGovernmentIdValue" class="bg-gray-50 p-6 rounded-lg shadow-md">
              <div v-if="hasActiveGovernmentIdResubmission" class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">New Customer Upload</p>
                <p class="mt-1 text-sm font-semibold text-emerald-900">This Government ID appears to be the latest resubmitted file from the user.</p>
                <p class="mt-1 text-xs text-emerald-700">Detected {{ governmentIdUpdatedLabel }}</p>
              </div>
              <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-teal-600">Government ID</h3>
                  <p class="mt-1 text-sm text-slate-500 break-all">{{ displayedGovernmentIdName }}</p>
                </div>
                <div v-if="hasActiveGovernmentIdResubmission" class="flex flex-col items-start gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">New Upload Detected</span>
                  <span class="text-sm font-semibold text-emerald-800">Customer resubmitted a new Government ID</span>
                  <span class="text-xs text-emerald-700">Updated {{ governmentIdUpdatedLabel }}</span>
                </div>
              </div>
              <div v-if="hasActiveGovernmentIdResubmission && (latestGovernmentIdEntry || previousGovernmentIdEntry)" class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <article v-if="latestGovernmentIdEntry" class="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Latest Submission</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 break-all">{{ latestGovernmentIdEntry.name || fileName(latestGovernmentIdEntry.path) }}</p>
                  <p class="mt-1 text-xs text-slate-500">Uploaded {{ formatDateTime(latestGovernmentIdEntry.uploaded_at || latestGovernmentIdEntry.updated_at) }}</p>
                </article>
                <article v-if="previousGovernmentIdEntry" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Previous Submission</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 break-all">{{ previousGovernmentIdEntry.name || fileName(previousGovernmentIdEntry.path) }}</p>
                  <p class="mt-1 text-xs text-slate-500">Uploaded {{ formatDateTime(previousGovernmentIdEntry.uploaded_at || previousGovernmentIdEntry.updated_at) }}</p>
                </article>
              </div>
              <div v-if="isImageFile(displayedGovernmentIdValue)" class="w-full md:w-1/2">
                <button v-if="displayedGovernmentIdImageUrl" type="button" class="w-full" @click="openFilePreview(displayedGovernmentIdValue, 'Government ID', displayedGovernmentIdImageUrl)">
                  <img
                    :src="displayedGovernmentIdImageUrl"
                    alt="Government ID"
                    class="w-full h-64 rounded border bg-slate-100 object-contain cursor-zoom-in"
                    @error="handleImageLoadError(displayedGovernmentIdValue, displayedGovernmentIdExplicitUrl, { uid: user.value?.uid || user.value?.id, field: 'government_id' })"
                  />
                </button>
                <div v-else class="flex h-64 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  Preview unavailable
                </div>
                <p class="text-xs text-gray-500 mt-2">Click to preview</p>
              </div>
              <div v-else class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:w-1/2">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Uploaded File</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 break-all">{{ displayedGovernmentIdName }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ fileTypeLabel(displayedGovernmentIdValue) }}</p>
                <button
                  type="button"
                  class="mt-4 inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
                  @click="openFilePreview(displayedGovernmentIdValue, 'Government ID', displayedGovernmentIdImageUrl)"
                >
                  Open Document
                </button>
              </div>
            </div>

            <!-- Business Info Card -->
            <div v-if="businessRecord" class="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold mb-4 text-teal-600">Business Information</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="detail in businessDetailRows"
                  :key="detail.label"
                  :class="[detail.full ? 'md:col-span-2' : '', 'rounded-lg border border-gray-200 bg-white p-3']"
                >
                  <p class="text-sm text-gray-500">{{ detail.label }}</p>
                  <p class="font-medium break-words">{{ detail.value }}</p>
                </div>
              </div>
              <!-- Uploaded Documents Card -->
              <div class="mt-6 p-4 bg-white rounded-lg border shadow-sm">
                <h4 class="font-semibold text-gray-700 mb-4 text-teal-500">Uploaded Documents</h4>
                <div v-if="hasActiveBusinessDocumentResubmission" class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">New Business Upload</p>
                  <p class="mt-1 text-sm font-semibold text-emerald-900">The files below reflect the latest resubmitted business/company documents from this account.</p>
                  <p class="mt-1 text-xs text-emerald-700">Detected {{ governmentIdUpdatedLabel }}</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <article
                    v-for="doc in businessDocuments"
                    :key="doc.key"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                  >
                    <p class="text-xs text-gray-500 mb-2">{{ doc.label }}</p>
                    <button
                      v-if="isImageFile(doc.value) && doc.imageUrl"
                      type="button"
                      class="w-full"
                      @click="openFilePreview(doc.value, doc.label, doc.explicitUrl, { uid: user.value?.uid || user.value?.id, field: doc.key })"
                    >
                      <img
                        :src="doc.imageUrl"
                        :alt="doc.label"
                        class="w-full h-32 rounded border bg-slate-100 object-contain cursor-zoom-in"
                        @error="handleImageLoadError(doc.value, doc.explicitUrl, { uid: user.value?.uid || user.value?.id, field: doc.key })"
                      />
                    </button>
                    <div
                      v-else-if="isImageFile(doc.value)"
                      class="flex h-32 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-sm text-slate-500"
                    >
                      Preview unavailable
                    </div>
                    <div
                      v-else
                      class="flex h-32 flex-col justify-between rounded-lg border border-dashed border-slate-300 bg-white p-3 text-left"
                    >
                      <div>
                        <p class="text-2xl font-black text-cyan-700">{{ fileExtension(doc.value) }}</p>
                        <p class="mt-2 text-sm font-semibold text-slate-900 break-all line-clamp-3">{{ fileName(doc.value) }}</p>
                      </div>
                      <p class="text-xs text-slate-500">{{ fileTypeLabel(doc.value) }}</p>
                    </div>
                    <button
                      type="button"
                      class="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
                      @click="openFilePreview(doc.value, doc.label, doc.explicitUrl, { uid: user.value?.uid || user.value?.id, field: doc.key })"
                    >
                      Open Document
                    </button>
                  </article>
                </div>
                <p v-if="!businessDocuments.length" class="text-sm text-slate-500">No uploaded business documents found.</p>
              </div>
            </div>
            <div v-else-if="isBusinessRegistration" class="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 class="text-lg font-semibold text-amber-700">Business Information</h3>
              <p class="mt-2 text-sm text-amber-700">
                No linked business profile was found for this registration record. This usually means the account came from an older or offline snapshot that only stored the base user fields.
              </p>
            </div>

            <!-- Service Provider Info Card -->
            <div v-if="serviceProviderRecord" class="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold mb-4 text-teal-600">Service Provider Information</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="detail in serviceProviderDetailRows"
                  :key="detail.label"
                  :class="[detail.full ? 'md:col-span-2' : '', 'rounded-lg border border-gray-200 bg-white p-3']"
                >
                  <p class="text-sm text-gray-500">{{ detail.label }}</p>
                  <p class="font-medium break-words">{{ detail.value }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div class="mb-4 text-sm text-slate-600">
                Status:
                <span :class="userStatusClass">
                  {{ userStatusLabel }}
                </span>
              </div>
              <div v-if="hasActiveGovernmentIdResubmission" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p class="text-sm font-semibold text-emerald-900">Latest Government ID upload detected</p>
                <p class="mt-1 text-xs text-emerald-700">Customer upload timestamp: {{ governmentIdUpdatedLabel }}</p>
              </div>
              <div class="flex justify-end gap-3">
                <button
                  @click="approveUser"
                  :disabled="!canManageUser"
                  :aria-busy="actingOnUser ? 'true' : 'false'"
                  class="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  @click="rejectUser"
                  :disabled="!canManageUser"
                  :aria-busy="actingOnUser ? 'true' : 'false'"
                  class="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  @click="closeModal"
                  :disabled="actingOnUser"
                  class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
            </template>

          </div>
        </div>
      </div>
    </transition>

    <transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="previewState.open" class="fixed inset-0 z-[60] bg-slate-950/90 p-4" @click="closeImagePreview">
        <button
          type="button"
          class="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20"
          @click.stop="closeImagePreview"
        >
          Close
        </button>
        <div class="flex h-full flex-col items-center justify-center gap-3 overflow-auto">
          <p class="text-sm font-semibold text-white/80">{{ previewState.label }}</p>
          <p class="text-xs text-white/60">Click the image to {{ previewZoom > 1 ? 'reset zoom' : 'zoom in' }}.</p>
          <img
            v-if="previewState.src"
            :src="previewState.src"
            :alt="previewState.label"
            class="max-h-[82vh] max-w-[92vw] origin-center object-contain transition duration-200"
            :style="{ transform: `scale(${previewZoom})` }"
            @click.stop="toggleImageZoom"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import { onValue, ref as realtimeRef } from 'firebase/database'
import { createToastInterface, POSITION } from 'vue-toastification'
import Swal from '@/lib/sweetalert-toast-shim'
import { firebaseConfigReady, realtimeDb } from '@/firebase/client'
import { promptAdminAccountRejection } from '@/lib/admin-account-review'
import { buildStoredFileUrlCandidates } from '@/lib/file-url'
import { showProfessionalFeedbackToast } from '@/lib/professional-feedback-toast'
import { hasLocalResubmission } from '@/lib/profile-resubmission'

const showModal = ref(false)
const user = ref({})
const loadingUser = ref(false)
const actingOnUser = ref(false)
const actionToastId = ref(null)
const failedImageKeys = ref(new Set())
const imageCandidateIndexes = ref({})
const previewState = ref({
  open: false,
  src: '',
  label: '',
})
const previewZoom = ref(1)
const liveUserUnsubscribe = ref(null)
const emit = defineEmits(['user-approved', 'user-rejected'])
const toast = (typeof window !== 'undefined' && window.__appFeedbackToast)
  || createToastInterface({
    position: POSITION.TOP_RIGHT,
    timeout: 2400,
    closeOnClick: true,
    closeButton: 'button',
    showCloseButtonOnHover: false,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    maxToasts: 4,
    newestOnTop: true,
  })

if (typeof window !== 'undefined' && !window.__appFeedbackToast) {
  window.__appFeedbackToast = toast
}

const dismissActionProgressToast = () => {
  if (actionToastId.value === null || typeof toast?.dismiss !== 'function') {
    actionToastId.value = null
    return
  }

  toast.dismiss(actionToastId.value)
  actionToastId.value = null
}

const showActionProgressToast = (action) => {
  dismissActionProgressToast()
  const normalizedAction = String(action || '').trim().toLowerCase()
  const title = normalizedAction === 'reject' ? 'Rejecting...' : 'approving account'

  actionToastId.value = showProfessionalFeedbackToast(
    toast,
    'info',
    title,
    '',
    false,
  ) ?? null
}

const warmedImageUrls = new Set()

const imageKey = (value, explicitUrl = '', options = {}) => [
  String(value || '').trim(),
  String(explicitUrl || '').trim(),
  String(options?.field || '').trim(),
  String(options?.uid || '').trim(),
].join('::')

const fileUrlCandidates = (value, explicitUrl = '', options = {}) => (
  buildStoredFileUrlCandidates(value, {
    explicitUrl,
    uid: String(options?.uid || user.value?.uid || user.value?.id || '').trim(),
    field: String(options?.field || '').trim(),
    defaultFolder: '',
  })
)

const docUrl = (value, explicitUrl = '', options = {}) => {
  const candidates = fileUrlCandidates(value, explicitUrl, options)
  if (!candidates.length) return ''

  const key = imageKey(value, explicitUrl, options)
  const candidateIndex = Number(imageCandidateIndexes.value[key] || 0)
  return candidates[candidateIndex] || candidates[0] || ''
}

const safeImageUrl = (value, explicitUrl = '', options = {}) => {
  const key = imageKey(value, explicitUrl, options)
  if (failedImageKeys.value.has(key)) return ''
  return docUrl(value, explicitUrl, options)
}

const handleImageLoadError = (value, explicitUrl = '', options = {}) => {
  const key = imageKey(value, explicitUrl, options)
  const candidates = fileUrlCandidates(value, explicitUrl, options)
  const candidateIndex = Number(imageCandidateIndexes.value[key] || 0)

  if (candidateIndex + 1 < candidates.length) {
    imageCandidateIndexes.value = {
      ...imageCandidateIndexes.value,
      [key]: candidateIndex + 1,
    }
    return
  }

  const next = new Set(failedImageKeys.value)
  next.add(key)
  failedImageKeys.value = next
}

const resetImageResolutionState = () => {
  failedImageKeys.value = new Set()
  imageCandidateIndexes.value = {}
}

const warmImageUrls = (urls = []) => {
  if (typeof Image === 'undefined') return

  urls
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .forEach((url) => {
      if (warmedImageUrls.has(url)) return
      warmedImageUrls.add(url)
      const image = new Image()
      image.decoding = 'async'
      image.loading = 'eager'
      image.src = url
    })
}

const isImageFile = (value) => {
  if (!value) return false
  const raw = String(value).toLowerCase()
  const clean = raw.split('#')[0].split('?')[0]
  return clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.jfif') || clean.endsWith('.gif') || clean.endsWith('.webp') || clean.endsWith('.bmp') || clean.endsWith('.tif') || clean.endsWith('.tiff') || clean.endsWith('.svg')
}

const isPdfFile = (value) => {
  if (!value) return false
  const raw = String(value).toLowerCase()
  const clean = raw.split('#')[0].split('?')[0]
  return clean.endsWith('.pdf')
}

const fileName = (value) => {
  if (!value) return 'Unknown file'
  const normalized = String(value).split('#')[0].split('?')[0].replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

const fileExtension = (value) => {
  const name = fileName(value)
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return ext ? ext.toUpperCase().slice(0, 4) : 'FILE'
}

const fileTypeLabel = (value) => {
  if (isImageFile(value)) return 'Image file'
  if (isPdfFile(value)) return 'PDF document'
  const ext = fileExtension(value)
  return ext === 'FILE' ? 'Uploaded document' : `${ext} document`
}

const mergeUserPayload = (payload = {}, fallback = null) => {
  const resolvedId = payload.id || payload.uid || payload.firebase_uid || payload.email || fallback?.id || fallback?.uid || fallback?.firebase_uid || fallback?.email
  return {
    ...(fallback || {}),
    ...payload,
    id: resolvedId || '',
    uid: payload.uid || payload.id || fallback?.uid || fallback?.id || '',
  }
}

const clearActiveResubmissionState = (profile = {}) => ({
  ...profile,
  government_id_resubmission: null,
  government_id_resubmission_url: null,
  government_id_resubmission_meta: null,
  document_resubmitted_at: null,
})

const normalizeStatus = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
const normalizeBusinessType = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')

  if (['company', 'corporation', 'corporate'].includes(raw)) return 'company'
  if ([
    'individual',
    'small business',
    'smallbusiness',
    'small biz',
    'individual small business',
    'sole proprietor',
    'sole proprietorship',
  ].includes(raw)) return 'individual'

  return ''
}

const truthyValue = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'approved', 'active'].includes(normalized)) return true
    if (['0', 'false', 'no', '', 'pending', 'rejected', 'archived', 'deleted'].includes(normalized)) return false
  }

  return Boolean(value)
}

const prettyLabel = (value) => {
  const normalized = normalizeStatus(value)
  if (!normalized) return ''

  const labels = {
    operational_management: 'Operational Management',
    serviceprovider: 'Service Provider',
    service_provider: 'Service Provider',
    customer_portal: 'Customer Portal User',
    business_owner: 'Business Owner',
    hr_managed_company: 'HR-Managed Company',
    admin_created: 'Admin-Created Account',
    self_registered: 'Self-Registered Account',
    offline_registered: 'Offline Registered Account',
    firebase_auth: 'Firebase Authentication',
    firebase_registration: 'Firebase Registration',
    auth_table: 'Auth Table',
    legacy_snapshot: 'Legacy Snapshot',
    source_trace: 'Source Trace',
    source_missing: 'Missing Sources',
    invalid_government_id: 'Government ID is unclear, invalid, or missing',
    profile_photo_issue: 'Profile photo is missing or unreadable',
    contact_information_incomplete: 'Contact information is incomplete or incorrect',
    location_information_missing: 'Location details are missing or inconsistent',
    business_documents_incomplete: 'Business documents are incomplete or missing',
    business_information_mismatch: 'Business information does not match the uploaded documents',
    duplicate_registration: 'Possible duplicate or existing registration',
    other_validation_issue: 'Other validation issue',
  }

  return labels[normalized] || normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const businessRoleLabel = (record = {}) => (
  normalizeBusinessType(
    record.business_type
    || record.business?.business_type
    || record.assigned_business?.business_type
  ) === 'company'
  || ['hr', 'hr_managed_company'].includes(normalizeStatus(
    record.management_mode
    || record.business?.management_mode
    || record.assigned_business?.management_mode
    || record.workspace_type
  ))
    ? 'Company'
    : 'Business'
)

const formatDateTime = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'Not provided'

  const isEpoch = /^\d{10,}$/.test(raw)
  const normalized = isEpoch ? Number(raw) : (raw.includes(' ') ? raw.replace(' ', 'T') : raw)
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return raw
  }

  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatPhoneNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return 'Not provided'

  if (digits.length === 12 && digits.startsWith('63')) {
    return `+63 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
  }

  if (digits.length === 10) {
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
  }

  return String(value)
}

const displayValue = (value, options = {}) => {
  if (Array.isArray(value)) {
    const items = value.map((item) => prettyLabel(item)).filter(Boolean)
    return items.length ? items.join(', ') : 'Not provided'
  }

  if (options.type === 'date') {
    return formatDateTime(value)
  }

  if (options.type === 'phone') {
    return formatPhoneNumber(value)
  }

  if (options.type === 'bool') {
    if (value === null || value === undefined || value === '') return 'Not provided'
    return truthyValue(value) ? 'Yes' : 'No'
  }

  const raw = String(value ?? '').trim()
  return raw !== '' ? raw : 'Not provided'
}

const detailRow = (label, value, options = {}) => {
  const formatted = displayValue(value, options)
  if (!options.showEmpty && formatted === 'Not provided') {
    return null
  }

  return {
    label,
    value: formatted,
    full: Boolean(options.full),
  }
}

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return String(value ?? '').trim() !== ''
}

const buildBusinessFallbackRecord = (record = {}) => {
  const fallback = {
    business_name: record.business_name || record.business_name_1 || '',
    owner_name: record.business_owner || '',
    owner_first_name: record.business_owner_first || '',
    owner_middle_initial: record.business_owner_middle || '',
    owner_last_name: record.business_owner_last || '',
    company_email: record.company_email || '',
    category: record.category || '',
    business_type: record.business_type || '',
    business_ownership: record.business_ownership || '',
    years_in_operation: record.years_in_operation || '',
    management_mode: record.management_mode || '',
    contact_number: record.contact_number || '',
    address: record.address || '',
    address_unit: record.address_unit || '',
    address_street: record.address_street || '',
    address_barangay: record.address_barangay || '',
    address_city: record.address_city || '',
    address_province: record.address_province || '',
    address_postal: record.address_postal || '',
    status: record.status || record.approval_status || '',
    is_approved: record.is_approved,
    latitude: record.latitude || '',
    longitude: record.longitude || '',
    bir_registration: record.bir_registration || '',
    dti_registration: record.dti_registration || '',
    mayor_permit: record.mayor_permit || '',
    business_permit: record.business_permit || '',
    sanitary_permit: record.sanitary_permit || '',
  }

  return Object.values(fallback).some((entry) => hasValue(entry)) ? fallback : null
}

const businessRecord = computed(() => {
  const candidate = user.value?.business || user.value?.assigned_business || null
  const fallback = buildBusinessFallbackRecord(user.value)
  if (candidate && typeof candidate === 'object' && Object.keys(candidate).length) {
    return {
      ...(fallback || {}),
      ...candidate,
    }
  }

  if (!isBusinessRegistration.value) {
    return null
  }

  return fallback
})

const serviceProviderRecord = computed(() => {
  const candidate = user.value?.service_provider || null
  return candidate && typeof candidate === 'object' && Object.keys(candidate).length ? candidate : null
})
const hasUserDetails = computed(() => (
  Boolean(user.value?.id || user.value?.uid || user.value?.firebase_uid || user.value?.email)
  || Object.keys(user.value || {}).length > 0
))

const profilePhoto = computed(() => {
  const value = user.value?.profile_photo || user.value?.profile_photo_path || ''
  return String(value || '').trim()
})

const profilePhotoImageUrl = computed(() => safeImageUrl(
  profilePhoto.value,
  user.value?.profile_photo_url,
  {
    uid: user.value?.uid || user.value?.id,
    field: 'profile_photo',
  },
))
const governmentIdHistoryEntries = computed(() => {
  const normalizeUploadedTime = (value = '') => {
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }
  const status = normalizeStatus(user.value?.status || user.value?.approval_status)
  const reviewKind = normalizeStatus(user.value?.latest_account_review_kind)
  const source = user.value?.government_id_history
  const entries = Array.isArray(source)
    ? source
    : (source && typeof source === 'object' ? Object.values(source) : [])

  const normalized = entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || '').trim(),
      kind: String(entry.kind || '').trim(),
      path: String(entry.path || '').trim(),
      url: String(entry.url || '').trim(),
      name: String(entry.name || '').trim(),
      uploaded_at: String(entry.uploaded_at || '').trim(),
      updated_at: String(entry.updated_at || '').trim(),
    }))
    .filter((entry) => entry.path || entry.url)

  const resubmissionPath = String(user.value?.government_id_resubmission || '').trim()
  const resubmissionUrl = String(user.value?.government_id_resubmission_url || '').trim()
  const resubmissionEntryExists = normalized.some((entry) => (
    (resubmissionPath && entry.path === resubmissionPath)
    || (resubmissionUrl && entry.url === resubmissionUrl)
  ))

  if (resubmissionEntryExists) {
    normalized.forEach((entry) => {
      if (
        (resubmissionPath && entry.path === resubmissionPath)
        || (resubmissionUrl && entry.url === resubmissionUrl)
      ) {
        entry.kind = 'resubmission'
      }
    })
  }

  if (!resubmissionEntryExists && (resubmissionPath || resubmissionUrl)) {
    normalized.push({
      id: 'resubmission',
      kind: 'resubmission',
      path: resubmissionPath,
      url: resubmissionUrl,
      name: String(user.value?.government_id_resubmission_meta?.name || user.value?.government_id_last_submitted_name || '').trim() || fileName(resubmissionPath),
      uploaded_at: String(user.value?.government_id_resubmission_meta?.uploaded_at || user.value?.government_id_last_submitted_at || user.value?.document_resubmitted_at || '').trim(),
      updated_at: String(user.value?.government_id_resubmission_meta?.updated_at || user.value?.latest_account_review_at || '').trim(),
    })
  }

  const currentPath = String(user.value?.government_id || '').trim()
  const currentUrl = String(user.value?.government_id_url || '').trim()
  const currentEntryExists = normalized.some((entry) => (
    (currentPath && entry.path === currentPath)
    || (currentUrl && entry.url === currentUrl)
  ))

  if (currentEntryExists) {
    normalized.forEach((entry) => {
      if (
        (currentPath && entry.path === currentPath)
        || (currentUrl && entry.url === currentUrl)
      ) {
        entry.kind = entry.kind || 'current'
      }
    })
  }

  if (!currentEntryExists && (currentPath || currentUrl)) {
    normalized.push({
      id: 'current',
      kind: 'current',
      path: currentPath,
      url: currentUrl,
      name: String(user.value?.government_id_meta?.name || '').trim() || fileName(currentPath),
      uploaded_at: String(user.value?.government_id_meta?.uploaded_at || user.value?.government_id_last_submitted_at || user.value?.document_resubmitted_at || '').trim(),
      updated_at: String(user.value?.government_id_meta?.updated_at || user.value?.latest_account_review_at || '').trim(),
    })
  }

  const preferResubmission = Boolean(resubmissionPath || resubmissionUrl) && (
    reviewKind === 'resubmitted'
    || ['pending', 'rejected'].includes(status)
  )

  return normalized.sort((left, right) => {
    const leftPriority = preferResubmission && left.kind === 'resubmission' ? 1 : 0
    const rightPriority = preferResubmission && right.kind === 'resubmission' ? 1 : 0
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority
    }

    const leftTime = normalizeUploadedTime(left.uploaded_at || left.updated_at || 0)
    const rightTime = normalizeUploadedTime(right.uploaded_at || right.updated_at || 0)
    return rightTime - leftTime
  })
})
const explicitResubmittedGovernmentIdEntry = computed(() => {
  const resubmissionPath = String(user.value?.government_id_resubmission || '').trim()
  const resubmissionUrl = String(user.value?.government_id_resubmission_url || '').trim()
  if (!resubmissionPath && !resubmissionUrl) return null

  return {
    id: 'explicit-resubmission',
    kind: 'resubmission',
    path: resubmissionPath,
    url: resubmissionUrl,
    name: String(
      user.value?.government_id_resubmission_meta?.name
      || user.value?.government_id_last_submitted_name
      || ''
    ).trim() || fileName(resubmissionPath),
    uploaded_at: String(
      user.value?.government_id_resubmission_meta?.uploaded_at
      || user.value?.document_resubmitted_at
      || user.value?.government_id_last_submitted_at
      || ''
    ).trim(),
    updated_at: String(
      user.value?.government_id_resubmission_meta?.updated_at
      || user.value?.latest_account_review_at
      || ''
    ).trim(),
  }
})
const preferredGovernmentIdEntries = computed(() => {
  const baseEntries = Array.isArray(governmentIdHistoryEntries.value) ? [...governmentIdHistoryEntries.value] : []
  const explicitResubmission = explicitResubmittedGovernmentIdEntry.value

  if (!governmentIdResubmissionState.value.active || !explicitResubmission) {
    return baseEntries
  }

  const filteredEntries = baseEntries.filter((entry) => !(
    (explicitResubmission.path && entry.path === explicitResubmission.path)
    || (explicitResubmission.url && entry.url === explicitResubmission.url)
  ))

  return [explicitResubmission, ...filteredEntries]
})
const latestGovernmentIdEntry = computed(() => preferredGovernmentIdEntries.value[0] || null)
const previousGovernmentIdEntry = computed(() => preferredGovernmentIdEntries.value[1] || null)
const displayedGovernmentIdValue = computed(() => latestGovernmentIdEntry.value?.path || user.value?.government_id || '')
const displayedGovernmentIdExplicitUrl = computed(() => latestGovernmentIdEntry.value?.url || user.value?.government_id_url || '')
const displayedGovernmentIdName = computed(() => {
  const latestName = String(latestGovernmentIdEntry.value?.name || '').trim()
  if (latestName) return latestName
  const metaName = String(user.value?.government_id_meta?.name || '').trim()
  if (metaName) return metaName
  return fileName(displayedGovernmentIdValue.value)
})
const displayedGovernmentIdImageUrl = computed(() => safeImageUrl(
  displayedGovernmentIdValue.value,
  displayedGovernmentIdExplicitUrl.value,
  {
    uid: user.value?.uid || user.value?.id,
    field: 'government_id',
  },
))
const governmentIdUpdatedAt = computed(() => (
  String(
    latestGovernmentIdEntry.value?.uploaded_at
    || latestGovernmentIdEntry.value?.updated_at
    || user.value?.government_id_last_submitted_at
    || user.value?.government_id_meta?.updated_at
    || user.value?.document_resubmitted_at
    || user.value?.latest_account_review_at
    || ''
  ).trim()
))
const governmentIdUpdatedLabel = computed(() => formatDateTime(governmentIdUpdatedAt.value))
const governmentIdResubmissionState = computed(() => {
  const status = normalizeStatus(user.value?.status || user.value?.approval_status)
  const reviewKind = normalizeStatus(user.value?.latest_account_review_kind)
  const reviewTitle = String(user.value?.latest_account_review_title || '').trim().toLowerCase()
  const reviewMessage = String(user.value?.latest_account_review_message || '').trim().toLowerCase()
  const reviewAt = String(user.value?.latest_account_review_at || '').trim()
  const resubmittedAt = String(user.value?.document_resubmitted_at || '').trim()
  const hasStoredResubmissionFile = Boolean(
    String(user.value?.government_id_resubmission || user.value?.government_id_resubmission_url || '').trim()
  )
  const resubmittedTime = resubmittedAt ? new Date(resubmittedAt).getTime() : NaN
  const reviewTime = reviewAt ? new Date(reviewAt).getTime() : NaN
  const resubmittedAfterReview = Boolean(resubmittedAt) && (
    !reviewAt
    || Number.isNaN(resubmittedTime)
    || Number.isNaN(reviewTime)
    || resubmittedTime >= reviewTime
  )
  const hasReviewResubmissionSignal = (
    reviewKind === 'resubmitted'
    || reviewTitle.includes('resubmitted')
    || reviewMessage.includes('resubmitted')
    || reviewMessage.includes('updated documents were submitted')
  )
  const localResubmission = hasLocalResubmission(user.value, reviewAt)
  const hasPendingStoredResubmission = hasStoredResubmissionFile && (
    !truthyValue(user.value?.is_approved)
    || ['pending', 'pending_approval', 'rejected', 'under_review', 'reviewing'].includes(status)
  )

  return {
    active: Boolean(
      hasReviewResubmissionSignal
      || resubmittedAfterReview
      || localResubmission
      || hasPendingStoredResubmission
    ),
  }
})
const accountLastUpdatedAt = computed(() => {
  const candidates = [
    String(user.value?.updated_at || '').trim(),
    String(governmentIdUpdatedAt.value || '').trim(),
    String(user.value?.latest_account_review_at || '').trim(),
  ].filter(Boolean)

  if (!candidates.length) return ''

  return candidates.reduce((latest, current) => {
    const latestTime = new Date(/^\d{10,}$/.test(latest) ? Number(latest) : latest).getTime()
    const currentTime = new Date(/^\d{10,}$/.test(current) ? Number(current) : current).getTime()
    if (Number.isNaN(latestTime)) return current
    if (Number.isNaN(currentTime)) return latest
    return currentTime > latestTime ? current : latest
  })
})

const hasResubmittedDocuments = computed(() => {
  return governmentIdResubmissionState.value.active
})

const userStatusState = computed(() => {
  const status = normalizeStatus(user.value?.status)
  const approvalStatus = normalizeStatus(user.value?.approval_status)

  if (user.value?.archived_at || ['archived', 'deleted'].includes(status)) {
    return 'archived'
  }

  if (status === 'rejected' || approvalStatus === 'rejected') {
    return hasResubmittedDocuments.value ? 'pending' : 'rejected'
  }

  if (['pending', 'pending_approval'].includes(status) || approvalStatus === 'pending') {
    return 'pending'
  }

  if (!truthyValue(user.value?.is_approved)) {
    return 'pending'
  }

  return 'approved'
})

const userStatusLabel = computed(() => prettyLabel(userStatusState.value))

const userStatusClass = computed(() => {
  if (userStatusState.value === 'approved') return 'font-bold text-emerald-700'
  if (userStatusState.value === 'rejected') return 'font-extrabold text-rose-700'
  if (userStatusState.value === 'archived') return 'font-bold text-slate-700'
  return 'font-extrabold text-amber-700'
})
const hasActiveGovernmentIdResubmission = computed(() => (
  userStatusState.value === 'pending'
  && hasResubmittedDocuments.value
))
const hasActiveBusinessDocumentResubmission = computed(() => (
  isBusinessRegistration.value
  && userStatusState.value === 'pending'
  && hasResubmittedDocuments.value
))

const accountOverviewRows = computed(() => ([
  detailRow('Record ID', user.value?.id),
  detailRow('Approval Status', userStatusLabel.value),
  detailRow('Role', normalizeStatus(user.value?.role) === 'business' ? businessRoleLabel(user.value) : prettyLabel(user.value?.role)),
  detailRow('Workspace Classification', user.value?.workspace_type_label || prettyLabel(user.value?.workspace_type)),
  detailRow('Account Source', user.value?.account_source_label || prettyLabel(user.value?.account_source)),
  detailRow('Registered At', user.value?.created_at, { type: 'date' }),
  detailRow('Last Updated', accountLastUpdatedAt.value || user.value?.updated_at, { type: 'date' }),
  detailRow('Email Verified At', user.value?.email_verified_at, { type: 'date' }),
  detailRow('Source Trace', user.value?.source_trace_label || user.value?.source_trace, { full: true }),
  detailRow('Missing Sources', user.value?.source_missing_label || user.value?.source_missing, { full: true }),
  detailRow('Rejection Checklist', user.value?.rejection_checklist, { full: true }),
  detailRow('Rejection Reason', user.value?.rejection_reason, { full: true }),
]).filter(Boolean))

const personalDetailRows = computed(() => ([
  detailRow('Full Name', userFullName.value),
  detailRow('First Name', user.value?.first_name),
  detailRow('Middle Initial', user.value?.middle_initial),
  detailRow('Last Name', user.value?.last_name),
  detailRow('Email', user.value?.email),
  detailRow('Contact Number', user.value?.contact_number, { type: 'phone' }),
  detailRow('Latitude', user.value?.latitude),
  detailRow('Longitude', user.value?.longitude),
]).filter(Boolean))

const businessDetailRows = computed(() => {
  const business = businessRecord.value || {}

  return ([
    detailRow('Business Name', business.business_name),
    detailRow('Owner Name', business.owner_name),
    detailRow('Owner First Name', business.owner_first_name),
    detailRow('Owner Middle Initial', business.owner_middle_initial),
    detailRow('Owner Last Name', business.owner_last_name),
    detailRow('Official Company Email', business.company_email),
    detailRow('Category', prettyLabel(business.category)),
    detailRow('Business Type', prettyLabel(business.business_type)),
    detailRow('Business Ownership', business.business_ownership),
    detailRow('Years in Operation', business.years_in_operation),
    detailRow('Management Mode', prettyLabel(business.management_mode)),
    detailRow('Contact Number', business.contact_number, { type: 'phone' }),
    detailRow('Main Address', business.address, { full: true }),
    detailRow('House/Unit No.', business.address_unit),
    detailRow('Street', business.address_street),
    detailRow('Barangay', business.address_barangay),
    detailRow('City / Municipality', business.address_city),
    detailRow('Province', business.address_province),
    detailRow('Postal Code', business.address_postal),
    detailRow('Business Status', prettyLabel(business.status)),
    detailRow('Business Approved', business.is_approved ?? business.approved, { type: 'bool' }),
    detailRow('Latitude', business.latitude),
    detailRow('Longitude', business.longitude),
  ]).filter(Boolean)
})

const serviceProviderDetailRows = computed(() => {
  const provider = serviceProviderRecord.value || {}

  return ([
    detailRow('Category', prettyLabel(provider.category)),
    detailRow('Description', provider.service_description, { full: true }),
    detailRow('Experience Years', provider.experience_years),
    detailRow('Available', provider.is_available, { type: 'bool' }),
    detailRow('Approved', provider.is_approved, { type: 'bool' }),
    detailRow('Rejected', provider.is_rejected, { type: 'bool' }),
    detailRow('Valid ID', provider.valid_id),
    detailRow('Rejection Reason', provider.reject_reason, { full: true }),
  ]).filter(Boolean)
})

const documentTimestamp = (...values) => values.reduce((latest, value) => {
  const raw = String(value || '').trim()
  if (!raw) return latest

  const normalized = /^\d{10,}$/.test(raw)
    ? Number(raw)
    : (raw.includes(' ') ? raw.replace(' ', 'T') : raw)
  const time = new Date(normalized).getTime()
  if (Number.isNaN(time)) return latest
  return Math.max(latest, time)
}, 0)

const resolveLatestBusinessDocument = (fieldKey) => {
  const profile = user.value || {}
  const business = businessRecord.value || {}

  const profileValue = String(profile[fieldKey] || '').trim()
  const profileUrl = String(profile[`${fieldKey}_url`] || '').trim()
  const profileMeta = profile[`${fieldKey}_meta`] && typeof profile[`${fieldKey}_meta`] === 'object'
    ? profile[`${fieldKey}_meta`]
    : null

  const businessValue = String(business[fieldKey] || '').trim()
  const businessUrl = String(business[`${fieldKey}_url`] || '').trim()
  const businessMeta = business[`${fieldKey}_meta`] && typeof business[`${fieldKey}_meta`] === 'object'
    ? business[`${fieldKey}_meta`]
    : null

  const profileDoc = (profileValue || profileUrl)
    ? {
        value: profileValue,
        explicitUrl: profileUrl,
        meta: profileMeta,
        updatedAt: String(
          profileMeta?.uploaded_at
          || profileMeta?.updated_at
          || profile.document_resubmitted_at
          || profile.updated_at
          || profile.latest_account_review_at
          || ''
        ).trim(),
        source: 'profile',
      }
    : null

  const businessDoc = (businessValue || businessUrl)
    ? {
        value: businessValue,
        explicitUrl: businessUrl,
        meta: businessMeta,
        updatedAt: String(
          businessMeta?.uploaded_at
          || businessMeta?.updated_at
          || business.updated_at
          || business.created_at
          || ''
        ).trim(),
        source: 'business',
      }
    : null

  if (!profileDoc && !businessDoc) return null
  if (!profileDoc) return businessDoc
  if (!businessDoc) return profileDoc

  if (
    hasResubmittedDocuments.value
    && (profileDoc.value || profileDoc.explicitUrl)
    && (
      profileDoc.value !== businessDoc.value
      || profileDoc.explicitUrl !== businessDoc.explicitUrl
    )
  ) {
    return profileDoc
  }

  const profileTime = documentTimestamp(profileDoc.updatedAt)
  const businessTime = documentTimestamp(businessDoc.updatedAt)
  if (profileTime !== businessTime) {
    return profileTime >= businessTime ? profileDoc : businessDoc
  }

  if (profileDoc.explicitUrl && profileDoc.explicitUrl !== businessDoc.explicitUrl) {
    return profileDoc
  }

  return profileDoc.value ? profileDoc : businessDoc
}

const isBusinessRegistration = computed(() => {
  const role = normalizeStatus(user.value?.role)
  const workspace = normalizeStatus(user.value?.workspace_type)

  return role === 'business' || workspace === 'business_owner'
})

const businessDocuments = computed(() => {
  const profile = user.value || {}
  const docs = [
    {
      key: 'bir_registration',
      label: 'BIR Registration',
    },
    {
      key: 'dti_registration',
      label: 'DTI Registration',
    },
    {
      key: 'mayor_permit',
      label: 'Mayor Permit',
    },
    {
      key: 'business_permit',
      label: 'Business Permit',
    },
    {
      key: 'sanitary_permit',
      label: 'Sanitary Permit',
    },
  ]
  return docs
    .map((doc) => {
      const resolved = resolveLatestBusinessDocument(doc.key)
      if (!resolved) return null

      return {
        ...doc,
        value: resolved.value,
        explicitUrl: resolved.explicitUrl,
        updatedAt: resolved.updatedAt,
        source: resolved.source,
        imageUrl: safeImageUrl(resolved.value, resolved.explicitUrl, {
          uid: profile.uid || profile.id,
          field: doc.key,
        }),
      }
    })
    .filter(Boolean)
})

const warmUserImageAssets = (profile = {}) => {
  const resolvedUid = String(profile?.uid || profile?.id || '').trim()
  if (!resolvedUid) return

  const candidates = []
  const pushImageCandidates = (value, explicitUrl, field) => {
    if (!isImageFile(value) && !isImageFile(explicitUrl)) return
    candidates.push(...fileUrlCandidates(value, explicitUrl, {
      uid: resolvedUid,
      field,
    }))
  }

  pushImageCandidates(profile?.profile_photo || profile?.profile_photo_path, profile?.profile_photo_url, 'profile_photo')
  pushImageCandidates(profile?.government_id_resubmission, profile?.government_id_resubmission_url, 'government_id')
  pushImageCandidates(profile?.government_id, profile?.government_id_url, 'government_id')

  ;['bir_registration', 'dti_registration', 'mayor_permit', 'business_permit', 'sanitary_permit'].forEach((field) => {
    pushImageCandidates(profile?.[field], profile?.[`${field}_url`], field)
  })

  warmImageUrls(candidates)
}

watch(user, (nextUser) => {
  warmUserImageAssets(nextUser || {})
}, { deep: false })

const unsubscribeLiveUser = () => {
  if (typeof liveUserUnsubscribe.value === 'function') {
    liveUserUnsubscribe.value()
  }
  liveUserUnsubscribe.value = null
}

const subscribeLiveUser = (profileId, fallbackUser = null) => {
  unsubscribeLiveUser()

  const resolvedProfileId = String(profileId || '').trim()
  if (!firebaseConfigReady || !realtimeDb || !resolvedProfileId) return

  try {
    liveUserUnsubscribe.value = onValue(
      realtimeRef(realtimeDb, `profiles/${resolvedProfileId}`),
      (snapshot) => {
        if (!snapshot.exists()) return
        user.value = mergeUserPayload(snapshot.val() || {}, fallbackUser || user.value || null)
      },
      () => {
        unsubscribeLiveUser()
      },
    )
  } catch {
    unsubscribeLiveUser()
  }
}

function openUserModal(userId, initialUser = null) {
  unsubscribeLiveUser()
  resetImageResolutionState()
  previewState.value = {
    open: false,
    src: '',
    label: '',
  }
  previewZoom.value = 1
  actingOnUser.value = false
  const fallbackUser = initialUser && typeof initialUser === 'object'
    ? mergeUserPayload({ ...initialUser })
    : null
  const resolvedProfileId = String(
    userId
    || fallbackUser?.id
    || fallbackUser?.uid
    || fallbackUser?.firebase_uid
    || fallbackUser?.email
    || ''
  ).trim()

  if (fallbackUser) {
    user.value = fallbackUser
  } else {
    user.value = {}
  }

  showModal.value = true

  if (!resolvedProfileId) {
    if (fallbackUser) {
      subscribeLiveUser(fallbackUser.uid || fallbackUser.id, fallbackUser)
    }
    loadingUser.value = false
    return
  }

  const hydrateLatestUser = (silentFailure = false) => axios.get(`/admin/users/${resolvedProfileId}`)
    .then(res => {
      const payload = res.data?.user || res.data?.data || res.data || {}
      const resolvedId = payload.id || payload.uid || payload.firebase_uid || payload.email || fallbackUser?.id || fallbackUser?.uid || fallbackUser?.firebase_uid || fallbackUser?.email
      if (!resolvedId) {
        throw new Error('Missing user id')
      }

      user.value = mergeUserPayload(payload, fallbackUser)
      subscribeLiveUser(user.value.uid || user.value.id || resolvedId, user.value)
    })
    .catch((error) => {
      if (fallbackUser && silentFailure) {
        console.warn('Failed to fetch the latest user details. Showing the selected table row instead.', error)
        subscribeLiveUser(fallbackUser.uid || fallbackUser.id || resolvedProfileId, fallbackUser)
        return
      }

      Swal.fire('Error','Failed to fetch user data','error')
      showModal.value = false
    })
    .finally(() => {
      if (!fallbackUser) {
        loadingUser.value = false
      }
    })

  if (fallbackUser) {
    subscribeLiveUser(fallbackUser.uid || fallbackUser.id || resolvedProfileId, fallbackUser)
    loadingUser.value = false
    hydrateLatestUser(true)
    return
  }

  loadingUser.value = true
  hydrateLatestUser(false)
}

const closeModal = () => {
  dismissActionProgressToast()
  unsubscribeLiveUser()
  showModal.value = false
  user.value = {}
  loadingUser.value = false
  actingOnUser.value = false
  resetImageResolutionState()
  closeImagePreview()
}

const userFullName = computed(() => {
  if(!user.value) return ''
  const u = user.value
  const middle = u.middle_initial ? u.middle_initial + '. ' : ''
  return [u.first_name, middle, u.last_name].join(' ').replace(/\s+/g, ' ').trim() || u.email || 'Unnamed user'
})

const mapUrl = computed(() => {
  const lat = user.value?.latitude || businessRecord.value?.latitude
  const lng = user.value?.longitude || businessRecord.value?.longitude
  if (!lat || !lng) return ''
  return `https://www.google.com/maps?q=${lat},${lng}&z=18&output=embed`
})

const canManageUser = computed(() => Boolean(user.value?.id) && !loadingUser.value && !actingOnUser.value)

const openFilePreview = (value, label = 'Uploaded document', explicitUrl = '', options = {}) => {
  const src = docUrl(value, explicitUrl, options)
  if (!src) return

  if (!isImageFile(value)) {
    window.open(src, '_blank', 'noopener,noreferrer')
    return
  }

  previewState.value = {
    open: true,
    src,
    label,
  }
  previewZoom.value = 1
}

const closeImagePreview = () => {
  previewState.value = {
    open: false,
    src: '',
    label: '',
  }
  previewZoom.value = 1
}

const toggleImageZoom = () => {
  previewZoom.value = previewZoom.value > 1 ? 1 : 2
}

const handlePreviewKeydown = (event) => {
  if (!previewState.value.open) return
  if (event.key === 'Escape' || event.key === 'Esc') {
    closeImagePreview()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handlePreviewKeydown)
})

onBeforeUnmount(() => {
  unsubscribeLiveUser()
  window.removeEventListener('keydown', handlePreviewKeydown)
})

const approveUser = async () => {
  if (!canManageUser.value) {
    Swal.fire('Please wait', 'User details are still loading.', 'info')
    return
  }

  const confirm = await Swal.fire({
    title: 'Approve this user?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, approve'
  })
  if (!confirm.isConfirmed) return

  try {
    actingOnUser.value = true
    showActionProgressToast('approve')
    const res = await axios.post(`/admin/users/${user.value.id}/toggle-approval`, {}, { skipGlobalLoading: true })
    user.value = clearActiveResubmissionState(mergeUserPayload(res.data?.user || {
      ...user.value,
      is_approved: res.data.is_approved,
      status: res.data.is_approved ? 'approved' : 'pending',
      approval_status: res.data.is_approved ? 'approved' : 'pending',
    }, user.value))
    emit('user-approved', { ...user.value })
    closeModal()
    showProfessionalFeedbackToast(
      toast,
      'success',
      res.data?.message || 'User approved successfully.',
      '',
      2800,
    )
  } catch (err) {
    dismissActionProgressToast()
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Approval failed',
      err.response?.data?.message || 'Failed to approve user.',
      3600,
    )
  } finally {
    actingOnUser.value = false
  }
}

const rejectUser = async () => {
  if (!canManageUser.value) {
    Swal.fire('Please wait', 'User details are still loading.', 'info')
    return
  }

  const result = await promptAdminAccountRejection(Swal)
  if (!result) return

  try {
    actingOnUser.value = true
    showActionProgressToast('reject')
    const res = await axios.post(`/admin/users/${user.value.id}/reject`, {
      checklist: result.checklist,
      reason: result.reason,
    }, { skipGlobalLoading: true })
    user.value = clearActiveResubmissionState(mergeUserPayload(res.data?.user || {
      ...user.value,
      rejection_reason: result.reason,
      rejection_checklist: result.checklist,
      is_approved: false,
      status: 'rejected',
      approval_status: 'rejected',
    }, user.value))
    emit('user-rejected', { ...user.value })
    closeModal()
    showProfessionalFeedbackToast(
      toast,
      'success',
      'User rejected successfully.',
      '',
      2800,
    )
  } catch (err) {
    dismissActionProgressToast()
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Rejection failed',
      err.response?.data?.message || 'Failed to reject user.',
      3600,
    )
  } finally {
    actingOnUser.value = false
  }
}

defineExpose({ openUserModal })
</script>

