<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col">
      <HrTopbar @logout="logout" />

      <div class="hr-content p-6">
        <div class="flex flex-col gap-6">
          <div class="overflow-hidden rounded-2xl border-t-4 border-t-emerald-600 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm ring-1 ring-slate-200">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">HR Workspace</p>
                <h1 class="mt-1 text-4xl font-extrabold leading-none tracking-tight text-slate-900">Provider Accreditation</h1>
                <p class="mt-2 text-sm text-slate-600">Accredit external partners here, then make them available for employee and team assignment workflows.</p>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900"
                  @click="fetchServiceProviders"
                >
                  Refresh List
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:brightness-105"
                  @click="openAddProviderModal"
                >
                  Start Promotion
                </button>
              </div>
            </div>
          </div>

          <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">Accredited Partners</p>
                <p class="text-xs text-slate-500">These partners can be selected inside Employee Management and team assignment workflows.</p>
              </div>
              <div class="flex items-center gap-3">
                <input
                  v-model="providerSearch"
                  type="text"
                  placeholder="Search partners..."
                  class="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 md:w-72"
                />
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{{ filteredProviders.length }} listed</span>
              </div>
            </div>

            <div class="mt-5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table class="w-full text-sm">
                <thead class="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Name</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">Category</th>
                    <th class="px-4 py-3">Experience</th>
                    <th class="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-if="loadingProviders">
                    <td colspan="5" class="px-4 py-6 text-center text-slate-500">Loading accredited partners...</td>
                  </tr>
                  <tr v-else-if="!filteredProviders.length">
                    <td colspan="5" class="px-4 py-6 text-center text-slate-500">No accredited partners found.</td>
                  </tr>
                  <tr v-for="provider in filteredProviders" :key="provider.id" class="bg-white">
                    <td class="px-4 py-3 font-semibold text-slate-900">{{ providerDisplayName(provider) }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ provider?.user?.email || provider?.email || '-' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ provider?.category || 'General support' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ formatExperienceYears(provider?.experience_years) }}</td>
                    <td class="px-4 py-3">
                      <span class="rounded-full px-3 py-1 text-xs font-medium" :class="providerStatusClass(provider)">
                        {{ providerStatusLabel(provider) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="showAddProviderModal" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeAddProviderModal"></div>
      <div class="relative z-10 w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Provider Accreditation</h3>
          <button
            type="button"
            :disabled="creatingServiceProvider"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            @click="closeAddProviderModal"
          >
            Close
          </button>
        </div>
        <form class="mt-4 grid gap-4" @submit.prevent="addServiceProvider">
          <div class="grid gap-4 md:grid-cols-3">
            <input
              v-model="providerForm.firstName"
              type="text"
              placeholder="First Name"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              v-model="providerForm.middleInitial"
              type="text"
              placeholder="Middle Initial (Optional)"
              maxlength="1"
              @input="providerForm.middleInitial = normalizeMiddleInitial(providerForm.middleInitial)"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              v-model="providerForm.lastName"
              type="text"
              placeholder="Last Name"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <input
            v-model="providerForm.email"
            type="email"
            placeholder="Email Address"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <div class="relative">
            <input
              v-model="providerForm.password"
              :type="showProviderPassword ? 'text' : 'password'"
              placeholder="Password"
              :class="[
                'w-full rounded-xl border bg-white px-4 py-2 pr-12 text-sm text-slate-700 focus:outline-none',
                providerPasswordStrengthInputClass
              ]"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              :aria-label="showProviderPassword ? 'Hide password' : 'Show password'"
              @click="showProviderPassword = !showProviderPassword"
            >
              <svg v-if="!showProviderPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.27 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.584 10.587A2 2 0 0 0 12 16a2 2 0 0 0 1.414-.586" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.88 5.09A9.77 9.77 0 0 1 12 5c4.478 0 8.27 2.943 9.542 7a9.752 9.752 0 0 1-4.206 5.135M6.228 6.228A9.754 9.754 0 0 0 2.458 12c1.274 4.057 5.065 7 9.542 7a9.77 9.77 0 0 0 5.09-1.416" />
              </svg>
            </button>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-slate-500">Use uppercase, lowercase, number, and special character.</p>
            <p v-if="providerPasswordStrengthLabel" class="text-xs font-semibold" :class="providerPasswordStrengthClass">
              {{ providerPasswordStrengthLabel }}
            </p>
          </div>
          <p v-if="providerPasswordMissingParts.length" class="text-xs text-rose-600">
            Password must include {{ providerPasswordMissingParts.join(", ") }}.
          </p>
          <div class="grid gap-4 md:grid-cols-2">
            <select
              v-model="providerForm.category"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select Category / Specialty</option>
              <option v-for="option in providerCategories" :key="option" :value="option">{{ option }}</option>
            </select>
            <select
              v-model.number="providerForm.experienceYears"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="option in experienceOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <textarea
            v-model="providerForm.serviceDescription"
            rows="3"
            placeholder="Service Description (Optional)"
            class="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          ></textarea>
          <div class="flex flex-col gap-3 md:flex-row md:items-center">
            <div class="min-h-[20px] flex-1 text-xs font-medium text-slate-500">
              <div v-if="creatingServiceProvider" class="inline-flex items-center gap-2 text-emerald-700">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                </svg>
                Creating accredited partner account...
              </div>
            </div>
            <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="creatingServiceProvider"
              class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              @click="closeAddProviderModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="creatingServiceProvider"
            >
              <svg v-if="creatingServiceProvider" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
              </svg>
              {{ creatingServiceProvider ? "Saving Partner..." : "Save Promotion" }}
            </button>
            </div>
          </div>
          <p class="text-xs text-slate-500">This creates an accredited Service Provider account under the current HR workspace.</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import Swal from "@/lib/sweetalert-toast-shim";
import { createToastInterface, POSITION } from "vue-toastification";
import HrSidebarNav from "@/Components/HrSidebarNav.vue";
import HrTopbar from "@/Components/HrTopbar.vue";
import { confirmAndLogout } from "@/lib/auth-flow";
import { showProfessionalFeedbackToast } from "@/lib/professional-feedback-toast";

const activeMenu = ref("Provider Accreditation");
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
const loadingProviders = ref(false);
const showAddProviderModal = ref(false);
const showProviderPassword = ref(false);
const creatingServiceProvider = ref(false);
const providerSearch = ref("");
const providers = ref([]);
const providerCategories = ["Plumbing", "Siphoning"];
const experienceOptions = [
  { value: 1, label: "1 year" },
  { value: 2, label: "2 years" },
  { value: 3, label: "3 years" },
  { value: 4, label: "4 years" },
  { value: 5, label: "5 years" },
  { value: 6, label: "6 years" },
  { value: 7, label: "7 years" },
  { value: 8, label: "8 years" },
  { value: 9, label: "9 years" },
  { value: 10, label: "10+ years" },
];

const defaultProviderForm = () => ({
  firstName: "",
  middleInitial: "",
  lastName: "",
  email: "",
  password: "",
  category: "",
  experienceYears: 1,
  serviceDescription: "",
});

const providerForm = ref(defaultProviderForm());

function navigateTo(menu, url) {
  activeMenu.value = menu;
  router.visit(url);
}

const logout = async () => {
  await confirmAndLogout();
};

const normalizeMiddleInitial = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 1)
    .toUpperCase();

const getPasswordMissingParts = (passwordValue) => {
  const password = String(passwordValue || "");
  const missingParts = [];
  if (password.length < 8) missingParts.push("at least 8 characters");
  if (!/[a-z]/.test(password)) missingParts.push("at least 1 lowercase letter");
  if (!/[A-Z]/.test(password)) missingParts.push("at least 1 uppercase letter");
  if (!/\d/.test(password)) missingParts.push("at least 1 number");
  if (!/[^a-zA-Z0-9]/.test(password)) missingParts.push("at least 1 special character");
  return missingParts;
};

const providerPasswordMissingParts = computed(() => getPasswordMissingParts(providerForm.value.password));

const providerPasswordStrengthLabel = computed(() => {
  const password = String(providerForm.value.password || "");
  if (!password) return "";
  if (!providerPasswordMissingParts.value.length) return "Strong";
  if (password.length >= 8 && providerPasswordMissingParts.value.length <= 2) return "Medium";
  return "Weak";
});

const providerPasswordStrengthClass = computed(() => {
  if (providerPasswordStrengthLabel.value === "Strong") return "text-emerald-600";
  if (providerPasswordStrengthLabel.value === "Medium") return "text-amber-600";
  return "text-rose-600";
});

const providerPasswordStrengthInputClass = computed(() => {
  if (providerPasswordStrengthLabel.value === "Strong") return "border-emerald-500 ring-2 ring-emerald-200";
  if (providerPasswordStrengthLabel.value === "Medium") return "border-amber-500 ring-2 ring-amber-200";
  if (providerPasswordStrengthLabel.value === "Weak") return "border-rose-500 ring-2 ring-rose-200";
  return "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
});

const providerDisplayName = (provider) => {
  if (!provider) return "";
  const firstName = String(provider?.first_name || provider?.user?.first_name || "").trim();
  const middleInitial = String(provider?.middle_initial || provider?.user?.middle_initial || "").trim();
  const lastName = String(provider?.last_name || provider?.user?.last_name || "").trim();
  const fullName = `${firstName} ${middleInitial ? `${middleInitial}. ` : ""}${lastName}`.trim();
  if (fullName) return fullName;
  const category = String(provider?.category || "").trim();
  if (category) return category;
  return provider?.id ? `Provider #${provider.id}` : "";
};

const formatExperienceYears = (value) => {
  const years = Number(value ?? 0);
  if (!Number.isFinite(years) || years <= 0) return "0 yrs";
  if (years >= 10) return "10+ yrs";
  return `${years} yrs`;
};

const filteredProviders = computed(() => {
  const keyword = String(providerSearch.value || "").trim().toLowerCase();
  if (!keyword) return providers.value;

  return providers.value.filter((provider) => {
    const name = providerDisplayName(provider).toLowerCase();
    const email = String(provider?.user?.email || "").toLowerCase();
    const category = String(provider?.category || "").toLowerCase();
    return name.includes(keyword) || email.includes(keyword) || category.includes(keyword);
  });
});

const providerStatusLabel = (provider) => (provider?.is_available ? "Available" : "Unavailable");

const providerStatusClass = (provider) =>
  provider?.is_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";

const sortProviders = (rows) =>
  [...rows].sort((a, b) => providerDisplayName(a).localeCompare(providerDisplayName(b)));

const fetchServiceProviders = async () => {
  loadingProviders.value = true;
  try {
    const res = await axios.get("/hr/available-providers", {
      params: { _ts: Date.now() },
    });
    const rows = Array.isArray(res.data) ? res.data : [];
    providers.value = sortProviders(rows);
  } catch (error) {
    providers.value = [];
    Swal.fire({
      icon: "error",
      title: "Load failed",
      text: "Unable to load accredited partners.",
    });
  } finally {
    loadingProviders.value = false;
  }
};

const resetProviderForm = () => {
  providerForm.value = defaultProviderForm();
  showProviderPassword.value = false;
};

const openAddProviderModal = () => {
  resetProviderForm();
  showAddProviderModal.value = true;
};

const closeAddProviderModal = (force = false) => {
  if (creatingServiceProvider.value && !force) return;
  showAddProviderModal.value = false;
  creatingServiceProvider.value = false;
};

const addServiceProvider = async () => {
  const issues = [];
  const firstName = String(providerForm.value.firstName || "").trim();
  const rawMiddleInitial = String(providerForm.value.middleInitial || "").trim();
  const middleInitial = normalizeMiddleInitial(rawMiddleInitial);
  const lastName = String(providerForm.value.lastName || "").trim();
  const email = String(providerForm.value.email || "").trim();
  const password = String(providerForm.value.password || "");
  const category = String(providerForm.value.category || "").trim();
  const serviceDescription = String(providerForm.value.serviceDescription || "").trim();
  const experienceYearsRaw = Number(providerForm.value.experienceYears ?? 0);
  const experienceYears = Number.isFinite(experienceYearsRaw) ? Math.max(0, Math.floor(experienceYearsRaw)) : 0;

  if (!firstName) issues.push("First Name is required.");
  if (!lastName) issues.push("Last Name is required.");
  if (rawMiddleInitial && !/^[A-Za-z]$/.test(rawMiddleInitial)) {
    issues.push("Middle initial must be exactly 1 letter.");
  }
  if (!email) {
    issues.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push("Email must be valid.");
  }
  if (!providerCategories.includes(category)) {
    issues.push("Category must be Plumbing or Siphoning.");
  }

  const missingPasswordParts = getPasswordMissingParts(password);
  if (missingPasswordParts.length > 0) {
    missingPasswordParts.forEach((missingPart) => {
      issues.push(`Password must include ${missingPart}.`);
    });
  }

  if (issues.length > 0) {
    Swal.fire({
      icon: "warning",
      title: "Please fix the following",
      text: issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n"),
      confirmButtonColor: "#0f172a",
    });
    return;
  }

  providerForm.value.middleInitial = middleInitial;

  creatingServiceProvider.value = true;
  try {
    const res = await axios.post("/hr/service-providers", {
      first_name: firstName,
      middle_initial: middleInitial || null,
      last_name: lastName,
      email,
      password,
      category,
      service_description: serviceDescription || null,
      experience_years: experienceYears,
      valid_id: null,
      is_available: true,
    }, { skipGlobalLoading: true });

    const createdProvider = res?.data?.service_provider;
    if (createdProvider?.id) {
      providers.value = sortProviders([
        createdProvider,
        ...providers.value.filter((provider) => Number(provider?.id) !== Number(createdProvider.id)),
      ]);
    }

    // Prevent hidden results from stale search text after save.
    providerSearch.value = "";
    await fetchServiceProviders();
    window.dispatchEvent(new CustomEvent("hr:service-provider-created"));

    closeAddProviderModal(true);
    showProfessionalFeedbackToast(
      toast,
      "success",
      "Service partner accredited",
      "The provider is ready for employee linking.",
      3200
    );
  } catch (error) {
    const validationErrors = error?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === "object") {
      const messages = Object.values(validationErrors).flat().filter(Boolean);
      if (messages.length > 0) {
        showProfessionalFeedbackToast(toast, "error", "Unable to accredit provider", messages[0], 3800);
        return;
      }
    }

    const backendMessage =
      error?.response?.data?.message || error?.response?.data?.error || "Unable to create accredited partner.";
    showProfessionalFeedbackToast(toast, "error", "Unable to accredit provider", backendMessage, 3800);
  } finally {
    creatingServiceProvider.value = false;
  }
};

onMounted(() => {
  fetchServiceProviders();
});
</script>
