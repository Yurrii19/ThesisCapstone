<template>
  <div class="min-w-0 h-full w-full space-y-6 bg-transparent p-6">

    <!-- HEADER -->
    <div class="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.85))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Account Governance</p>
        <h2 class="mt-2 text-3xl font-black text-slate-900">User Management</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review new registrations first, approve active accounts, and keep rejected records archived for later reference.</p>
      </div>

      <!-- Add User Button -->
      <div class="flex flex-wrap gap-2">
        <button
          @click="refreshFromFirebase"
          :disabled="isRefreshingUsers"
          class="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isRefreshingUsers ? 'Refreshing...' : 'Refresh from Firebase' }}
        </button>
        <button
          @click="showAddModal = true"
          class="rounded-xl bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(13,148,136,0.28)] transition hover:opacity-90"
        >
          + Add New User
        </button>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article
        v-for="stat in dashboardStats"
        :key="stat.label"
        class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
      >
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{{ stat.label }}</p>
        <div class="mt-3 flex items-end justify-between gap-4">
          <p class="text-3xl font-black tracking-[-0.05em] text-slate-900">{{ stat.value }}</p>
          <span :class="stat.badgeClass" class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">{{ stat.badge }}</span>
        </div>
        <p class="mt-3 text-xs leading-5 text-slate-500">{{ stat.copy }}</p>
      </article>
    </div>

    <!-- FILTER + SEARCH ROW -->
    <div class="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap gap-2">
        <button @click="filter='all'" :class="tabClass('all')">All</button>
        <button @click="filter='approved'" :class="tabClass('approved')">Approved</button>
        <button @click="filter='pending'" :class="tabClass('pending')">Pending</button>
        <button @click="filter='archived'" :class="tabClass('archived')">Archived</button>
      </div>
      <div class="relative w-full lg:w-80">
        <span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.3-4.3"></path>
          </svg>
        </span>
        <input
          v-model="search"
          type="text"
          placeholder="Search name, email, role, or company..."
          class="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium leading-none text-slate-700 shadow-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
        />
      </div>
    </div>

    <!-- USERS TABLE -->
    <div class="mt-4 w-full max-w-full min-w-0 overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">User records</p>
          <p class="mt-1 text-sm text-slate-600">Pending registrations stay visible first. Rejected entries are moved into archive.</p>
        </div>
        <p class="text-xs font-semibold text-slate-500">{{ filteredUsers.length }} record(s) shown</p>
      </div>
      <div class="w-full overflow-x-auto overflow-y-hidden">
      <table class="min-w-[1000px] w-full table-fixed text-sm">
        <thead class="border-b border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(240,249,255,0.92))] text-xs uppercase tracking-[0.12em] text-slate-600">
          <tr>
            <th class="w-[15%] px-6 py-3 text-left">Full Name</th>
            <th class="w-[16%] px-6 py-3 text-left">Email</th>
            <th class="w-[9%] px-6 py-3 text-left">Role</th>
            <th class="w-[15%] px-6 py-3 text-left">Workspace Classification</th>
            <th class="w-[8%] px-6 py-3 text-center">Status</th>
            <th class="w-[8%] px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="user in pagedUsers"
            :key="user.id || user.firebase_uid || user.email"
            :class="rowClass(user)"
          >
            <td class="px-6 py-4 align-top">
              <div class="flex flex-col gap-1">
                <div class="font-semibold break-words text-slate-900">{{ user.name }}</div>
                <span v-if="isFreshRegistration(user)" class="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  New registration
                </span>
              </div>
            </td>
            <td class="px-6 py-4 align-top break-words text-slate-600">{{ user.email }}</td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {{ user.role_label }}
              </span>
            </td>
            <td class="px-6 py-4 align-top">
              <div class="flex flex-col gap-1">
                <span class="inline-flex w-fit items-center rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                  {{ user.workspace_type_label }}
                </span>
                <span v-if="user.company_name" class="break-words text-xs font-medium text-slate-500">
                  {{ user.company_name }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-center align-top">
              <span
                v-if="isArchived(user)"
                class="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
              >Archived</span>
              <span
                v-else-if="isApprovedState(user)"
                class="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
              >Approved</span>
              <span
                v-else
                class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
              >Pending</span>
              <span
                v-if="isArchived(user) && isRejected(user)"
                class="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700"
              >Rejected</span>
            </td>
            <td class="px-6 py-4 text-right align-top">
              <div class="flex flex-wrap justify-end gap-2">
                <button
                  v-if="isReviewableUser(user)"
                  @click="openViewUser(user)"
                  class="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                >
                View
              </button>
                <button
                  v-if="canArchiveUser(user)"
                  @click="archiveUser(user)"
                  class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                Archive
              </button>
                <button
                  v-if="canRestoreUser(user)"
                  @click="restoreUser(user)"
                  class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                Restore
              </button>
                <button
                  v-if="canCorrectWrongEmail(user)"
                  @click="correctWrongEmail(user)"
                  class="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                Wrong Email
              </button>
              </div>
            </td>
          </tr>

          <tr v-if="pagedUsers.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-500">
                <p class="text-sm font-semibold text-slate-700">{{ isLoadingUsers ? 'Loading users...' : 'No users match the current filter.' }}</p>
                <p v-if="!isLoadingUsers" class="mt-2 text-xs text-slate-500">Try a different tab or search term.</p>
              </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div class="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs font-semibold text-slate-500">
          Page {{ resolvedCurrentPage }} of {{ totalPages }} · Showing {{ pagedUsersStart }}-{{ pagedUsersEnd }} of {{ filteredUsers.length }}
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="resolvedCurrentPage === 1"
            @click="prevPage"
          >
            Prev
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="resolvedCurrentPage === totalPages"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- ADD USER MODAL -->
    <div
      v-if="showAddModal"
      @click.self="closeAddModal"
      class="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/78 px-4 py-6 backdrop-blur-[2px]"
    >
      <div class="flex min-h-full items-start justify-center md:items-center">
      <div class="relative my-auto flex w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div class="border-b border-slate-200 bg-white px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Account Creation</p>
              <h3 class="mt-1 text-[28px] font-black tracking-tight text-slate-900">Add New User</h3>
              <p class="mt-1 text-sm text-slate-600">Assign a role, set access, and create the login credentials.</p>
            </div>
            <button
              type="button"
              @click="closeAddModal"
              :disabled="isCreatingUser"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="addUser" class="flex-1 space-y-5 overflow-y-auto bg-slate-50 px-6 py-6">
          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Account Details</p>
                <p class="mt-1 text-sm text-slate-500">{{ profileSectionDescription }}</p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Login Email</label>
                <input
                  v-model="newUser.email"
                  type="email"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="Enter a unique email that will be used to log in"
                  required
                />
                <p class="mt-2 text-xs text-slate-500">This must be a unique login email. The assigned role account will use this email to sign in.</p>
              </div>
              <div class="md:col-span-2">
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Role</label>
                <select
                  v-model="newUser.role"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  required
                >
                  <option value="hr">HR</option>
                  <option value="csr">CSR</option>
                  <option value="finance">Finance</option>
                  <option value="procurement">Procurement</option>
                  <option value="operational_management">Operational Management</option>
                </select>
              </div>
            </div>
            <div v-if="requiresBusinessAssignment" class="mt-4">
              <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">HR-Managed Company Assignment</label>
              <select
                v-model="newUser.business_id"
                class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              >
                <option :value="null" disabled>Select HR-managed company</option>
                <option v-for="business in businessOptions" :key="business.id" :value="business.id">
                  {{ business.business_name }} - {{ business.assignment_email || `company-${business.id}@no-email` }}
                </option>
              </select>
              <p class="mt-2 text-xs text-slate-500">Select the company workspace that should receive this role account. Credentials will also be copied to the linked company Gmail when available.</p>
              <div
                v-if="activeRoleConflict"
                class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <p class="font-semibold">Active {{ resolveRoleLabel(activeRoleConflict) }} account already exists for this company.</p>
                <p class="mt-1 text-xs text-rose-600">
                  Archive or use <span class="font-semibold">Wrong Email</span> on the existing account before creating another one.
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Security</p>
                <p class="mt-1 text-sm text-slate-500">{{ securitySectionDescription }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {{ passwordStrengthLabel }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Password</label>
                <div class="relative">
                  <input
                    v-model="newUser.password"
                    :type="showPassword ? 'text' : 'password'"
                    minlength="8"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-900"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword"
                  >
                    <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.27 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.584 10.587A2 2 0 0 0 12 16a2 2 0 0 0 1.414-.586" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.88 5.09A9.77 9.77 0 0 1 12 5c4.478 0 8.27 2.943 9.542 7a9.752 9.752 0 0 1-4.206 5.135M6.228 6.228A9.754 9.754 0 0 0 2.458 12c1.274 4.057 5.065 7 9.542 7a9.77 9.77 0 0 0 5.09-1.416" />
                    </svg>
                  </button>
                </div>
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="passwordStrengthClass"
                    :style="{ width: passwordStrengthWidth }"
                  ></div>
                </div>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-600">Strength: {{ passwordStrengthLabel }}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">At least 8 characters</span>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Confirm Password</label>
                <div class="relative">
                  <input
                    v-model="newUser.password_confirmation"
                    :type="showPasswordConfirmation ? 'text' : 'password'"
                    minlength="8"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-900"
                    :aria-label="showPasswordConfirmation ? 'Hide confirm password' : 'Show confirm password'"
                    @click="showPasswordConfirmation = !showPasswordConfirmation"
                  >
                    <svg v-if="!showPasswordConfirmation" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.27 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.584 10.587A2 2 0 0 0 12 16a2 2 0 0 0 1.414-.586" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.88 5.09A9.77 9.77 0 0 1 12 5c4.478 0 8.27 2.943 9.542 7a9.752 9.752 0 0 1-4.206 5.135M6.228 6.228A9.754 9.754 0 0 0 2.458 12c1.274 4.057 5.065 7 9.542 7a9.77 9.77 0 0 0 5.09-1.416" />
                    </svg>
                  </button>
                </div>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span :class="passwordMatchClass">{{ passwordMatchLabel }}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">Re-enter password</span>
                </div>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p class="font-bold uppercase tracking-wide text-slate-500">Login Email</p>
                <p class="mt-1 font-semibold" :class="isValidLoginEmail ? 'text-emerald-700' : 'text-slate-500'">
                  {{ isValidLoginEmail ? 'Ready' : 'Needs valid email' }}
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p class="font-bold uppercase tracking-wide text-slate-500">Company Assignment</p>
                <p class="mt-1 font-semibold" :class="activeRoleConflict ? 'text-rose-600' : (newUser.business_id ? 'text-emerald-700' : 'text-slate-500')">
                  {{ activeRoleConflict ? 'Existing active role found' : (newUser.business_id ? 'Selected' : 'Select company') }}
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p class="font-bold uppercase tracking-wide text-slate-500">Password Check</p>
                <p class="mt-1 font-semibold" :class="passwordsReady ? 'text-emerald-700' : 'text-slate-500'">
                  {{ passwordsReady ? 'Ready to create' : 'Complete both fields' }}
                </p>
              </div>
            </div>
            <p class="mt-3 text-xs text-slate-500">
              Recommended: at least 8 characters with uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <div class="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-slate-50 pt-4 md:flex-row md:items-center md:justify-between">
              <div class="min-h-[20px] text-xs font-medium text-slate-500">
                <div v-if="isCreatingUser" class="inline-flex items-center gap-2 text-cyan-700">
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                  </svg>
                  Provisioning account access...
                </div>
              </div>
              <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="closeAddModal"
                :disabled="isCreatingUser"
                class="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isCreatingUser"
                class="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="canSubmitNewUser ? 'bg-slate-900 hover:bg-slate-800' : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-105'"
              >
                <svg v-if="isCreatingUser" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                </svg>
                {{ isCreatingUser ? 'Provisioning...' : 'Create Account' }}
              </button>
              </div>
          </div>
        </form>
      </div>
      </div>
    </div>

    <!-- VIEW USER MODAL -->
    <ViewUser
      ref="viewUserModal"
      @user-approved="handleApproved"
      @user-rejected="handleRejected"
    />

  </div>
</template>

<script>
import axios from 'axios'
import { onValue, ref as realtimeRef } from 'firebase/database'
import Swal from '@/lib/sweetalert-toast-shim'
import { createToastInterface, POSITION } from 'vue-toastification'
import { getStoredProfileCache } from '@/lib/firebase-auth'
import { clearProfileResubmission, hasLocalResubmission } from '@/lib/profile-resubmission'
import { firebaseConfigReady, realtimeDb } from '@/firebase/client'
import ViewUser from './ViewUser.vue'

const ADMIN_TOAST_CLASS = 'admin-user-feedback-toast'
const ADMIN_TOAST_BODY_CLASS = 'admin-user-feedback-toast-body'
const ADMIN_TOAST_SUCCESS_CLASS = 'admin-user-feedback-toast-success'
const ADMIN_TOAST_ERROR_CLASS = 'admin-user-feedback-toast-error'

const toast = (typeof window !== 'undefined' && window.__appFeedbackToast)
  || createToastInterface({
    position: POSITION.TOP_RIGHT,
    timeout: 2400,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    maxToasts: 4,
    newestOnTop: true,
  })

if (typeof window !== 'undefined' && !window.__appFeedbackToast) {
  window.__appFeedbackToast = toast
}

if (typeof document !== 'undefined' && !document.getElementById('admin-user-feedback-toast-style')) {
  const style = document.createElement('style')
  style.id = 'admin-user-feedback-toast-style'
  style.textContent = `
    .${ADMIN_TOAST_CLASS} {
      min-height: 0 !important;
      border-radius: 20px !important;
      border: 1px solid rgba(148, 163, 184, 0.18) !important;
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18) !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .${ADMIN_TOAST_SUCCESS_CLASS} {
      background: linear-gradient(135deg, #f8fffd 0%, #ecfeff 52%, #f0fdf4 100%) !important;
      border-left: 4px solid #0f766e !important;
    }
    .${ADMIN_TOAST_ERROR_CLASS} {
      background: linear-gradient(135deg, #fff7ed 0%, #fff1f2 54%, #ffffff 100%) !important;
      border-left: 4px solid #dc2626 !important;
    }
    .${ADMIN_TOAST_BODY_CLASS} {
      padding: 14px 16px !important;
      white-space: pre-line !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      letter-spacing: -0.01em !important;
    }
    .${ADMIN_TOAST_BODY_CLASS}::first-line {
      color: #020617 !important;
    }
  `
  document.head.appendChild(style)
}

const showAdminFeedbackToast = (type, title, detail = '', timeout = 3600) => {
  const handler = toast?.[type]
  if (typeof handler !== 'function' || !title) return

  const toneClass = type === 'success'
    ? ADMIN_TOAST_SUCCESS_CLASS
    : ADMIN_TOAST_ERROR_CLASS

  handler(detail ? `${title}\n${detail}` : title, {
    timeout,
    icon: false,
    closeButton: false,
    hideProgressBar: true,
    toastClassName: [ADMIN_TOAST_CLASS, toneClass],
    bodyClassName: ADMIN_TOAST_BODY_CLASS,
  })
}

export default {
  components: { ViewUser },

  data() {
    return {
      users: [],
      businessOptions: [],
      filter: 'all',
      showAddModal: false,
      showPassword: false,
      showPasswordConfirmation: false,
      isCreatingUser: false,
      isRefreshingUsers: false,
      isLoadingUsers: true,
      usersFetchRequestId: 0,
      usersSyncTimer: null,
      liveUsersUnsubscribe: null,
      liveResubmissionsUnsubscribe: null,
      liveAdminReviewQueueUnsubscribe: null,
      hasLiveUsersSnapshot: false,
      pageSize: 10,
      currentPage: 1,
      newUser: {
        first_name: '',
        middle_initial: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'hr',
        business_id: null,
      },
      search: '',
      roleNames: {
        admin: 'Admin',
        hr: 'HR',
        csr: 'CSR',
        finance: 'Finance',
        procurement: 'Procurement',
        operational_management: 'Operational Management',
        user: 'User',
        business: 'Business',
        serviceprovider: 'Service Provider',
        service_provider: 'Service Provider',
        employee: 'Employee'
      }
    }
  },

  computed: {
    dashboardStats() {
      const counts = {
        active: 0,
        approved: 0,
        pending: 0,
        archived: 0,
      }

      for (const user of this.users) {
        if (this.isArchived(user)) {
          counts.archived += 1
          continue
        }

        counts.active += 1
        if (this.isApprovedState(user)) counts.approved += 1
        if (this.isPendingTabUser(user)) counts.pending += 1
      }

      return [
        {
          label: 'Active queue',
          value: counts.active,
          badge: 'Live',
          badgeClass: 'bg-slate-100 text-slate-700',
          copy: 'Only active accounts are shown in the main table.',
        },
        {
          label: 'Pending review',
          value: counts.pending,
          badge: 'New',
          badgeClass: 'bg-amber-100 text-amber-700',
          copy: 'Fresh registrations are pinned to the top of the queue.',
        },
        {
          label: 'Approved',
          value: counts.approved,
          badge: 'Ready',
          badgeClass: 'bg-emerald-100 text-emerald-700',
          copy: 'Accounts already cleared for workspace access.',
        },
        {
          label: 'Archived',
          value: counts.archived,
          badge: 'Stored',
          badgeClass: 'bg-rose-100 text-rose-700',
          copy: 'Rejected and archived users stay available for audit.',
        },
      ]
    },
    profileSectionDescription() {
      return 'Create the company-linked role account using a unique login email, role, and company assignment.'
    },
    securitySectionDescription() {
      return 'Set and confirm the password for this account.'
    },
    passwordScore() {
      const value = this.newUser.password || ''
      let score = 0
      if (value.length >= 8) score++
      if (/[A-Z]/.test(value)) score++
      if (/[a-z]/.test(value)) score++
      if (/\d/.test(value)) score++
      if (/[^A-Za-z0-9]/.test(value)) score++
      return Math.min(score, 4)
    },
    passwordStrengthWidth() {
      return `${this.passwordScore * 25}%`
    },
    passwordStrengthClass() {
      if (this.passwordScore <= 1) return 'bg-rose-500'
      if (this.passwordScore === 2) return 'bg-amber-500'
      if (this.passwordScore === 3) return 'bg-cyan-500'
      return 'bg-emerald-500'
    },
    passwordStrengthLabel() {
      if (!this.newUser.password) return 'Empty'
      if (this.passwordScore <= 1) return 'Weak'
      if (this.passwordScore === 2) return 'Fair'
      if (this.passwordScore === 3) return 'Good'
      return 'Strong'
    },
    passwordMatchLabel() {
      if (!this.newUser.password_confirmation) return 'Waiting for confirmation'
      return this.newUser.password === this.newUser.password_confirmation
        ? 'Passwords match'
        : 'Passwords do not match'
    },
    passwordMatchClass() {
      if (!this.newUser.password_confirmation) return 'font-semibold text-slate-500'
      return this.newUser.password === this.newUser.password_confirmation
        ? 'font-semibold text-emerald-700'
        : 'font-semibold text-rose-600'
    },
    passwordsReady() {
      return Boolean(
        this.newUser.password &&
        this.newUser.password_confirmation &&
        this.newUser.password === this.newUser.password_confirmation &&
        this.newUser.password.length >= 8
      )
    },
    canSubmitNewUser() {
      return Boolean(
        this.newUser.role &&
        this.newUser.email &&
        this.isValidLoginEmail &&
        this.newUser.business_id &&
        !this.activeRoleConflict &&
        this.newUser.password &&
        this.newUser.password_confirmation &&
        this.newUser.password === this.newUser.password_confirmation &&
        this.newUser.password.length >= 8
      )
    },
    requiresBusinessAssignment() {
      return true
    },
    normalizedLoginEmail() {
      return String(this.newUser.email || '').trim().toLowerCase()
    },
    isValidLoginEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.normalizedLoginEmail)
    },
    selectedBusiness() {
      return this.businessOptions.find(item => Number(item.id) === Number(this.newUser.business_id)) || null
    },
    selectedBusinessLabel() {
      return this.selectedBusiness?.assignment_email || this.selectedBusiness?.business_name || 'No company selected'
    },
    selectedBusinessName() {
      return this.selectedBusiness?.business_name || null
    },
    activeRoleConflict() {
      const businessId = Number(this.newUser.business_id || 0)
      const normalizedRole = this.normalizeRole(this.newUser.role)

      if (businessId <= 0 || !normalizedRole) {
        return null
      }

      return this.users.find((user) => (
        Number(user?.business_id || 0) === businessId
        && this.normalizeRole(user?.role) === normalizedRole
        && this.isApprovedState(user)
      )) || null
    },
    activeRoleConflictMessage() {
      if (!this.activeRoleConflict) {
        return ''
      }

      const roleLabel = this.resolveRoleLabel(this.activeRoleConflict)
      const companyLabel = this.selectedBusinessName || this.activeRoleConflict.company_name || 'this company'

      return `${companyLabel} already has an active ${roleLabel} account. Archive or correct the existing account before creating another one.`
    },
    filteredUsers() {
      let list = this.users
      if (this.filter === 'approved') list = list.filter((u) => this.isApprovedState(u))
      else if (this.filter === 'pending') list = list.filter((u) => this.isPendingTabUser(u))
      else if (this.filter === 'archived') list = list.filter((u) => this.isArchived(u))
      else list = list.filter((u) => !this.isArchived(u))

      list = this.sortUsers(list)

      const q = (this.search || '').toLowerCase().trim()
      if (!q) return list
      return list.filter(u => {
        const roleText = this.resolveRoleLabel(u).toLowerCase()
        const nameText = (u.name || '').toLowerCase()
        const emailText = (u.email || '').toLowerCase()
        const workspaceText = (u.workspace_type_label || u.workspace_type || '').toLowerCase()
        const sourceText = (u.account_source_label || u.account_source || '').toLowerCase()
        const sourceTraceText = (u.source_trace_label || '').toLowerCase()
        const sourceMissingText = (u.source_missing_label || '').toLowerCase()
        const companyText = (u.company_name || '').toLowerCase()
        return roleText.includes(q)
          || nameText.includes(q)
          || emailText.includes(q)
          || workspaceText.includes(q)
          || sourceText.includes(q)
          || sourceTraceText.includes(q)
          || sourceMissingText.includes(q)
        || companyText.includes(q)
      })
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize))
    },
    resolvedCurrentPage() {
      return Math.min(Math.max(Number(this.currentPage) || 1, 1), this.totalPages)
    },
    pagedUsers() {
      const start = (this.resolvedCurrentPage - 1) * this.pageSize
      return this.filteredUsers.slice(start, start + this.pageSize)
    },
    pagedUsersStart() {
      if (this.filteredUsers.length === 0) return 0
      return (this.resolvedCurrentPage - 1) * this.pageSize + 1
    },
    pagedUsersEnd() {
      return Math.min(this.resolvedCurrentPage * this.pageSize, this.filteredUsers.length)
    },
  },

  watch: {
    'newUser.role'(role) {
      if (!this.newUser.email) {
        this.newUser.email = ''
      }
    },
    'newUser.email'() {
      this.syncBusinessAssignmentByEmail()
    },
    showAddModal(value) {
      document.documentElement.style.overflow = value ? 'hidden' : ''
      document.body.style.overflow = value ? 'hidden' : ''
    },
    filter() {
      this.currentPage = 1
    },
    search() {
      this.currentPage = 1
    },
    filteredUsers() {
      this.clampCurrentPage()
    }
  },

  mounted() {
    const cachedUsers = this.normalizeUsers(getStoredProfileCache())
    if (cachedUsers.length > 0) {
      this.users = cachedUsers
    }
    this.fetchUsers()
    this.subscribeLiveUsers()
    this.fetchBusinesses()
    this.startUsersSync()
    window.addEventListener('focus', this.handleWindowFocus)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('storage', this.handleResubmissionStorage)
  },

  beforeUnmount() {
    this.unsubscribeLiveUsers()
    this.stopUsersSync()
    window.removeEventListener('focus', this.handleWindowFocus)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('storage', this.handleResubmissionStorage)
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  },

  methods: {
    syncGeneratedIdentity() {
      const roleLabel = this.resolveRoleLabel({
        role: this.newUser.role,
        account_source: 'admin_created',
      }) || 'User'
      const assignmentLabel = this.selectedBusinessName || 'Company'

      this.newUser.first_name = roleLabel
      this.newUser.middle_initial = ''
      this.newUser.last_name = assignmentLabel
    },
    normalizeBusinessType(value) {
      const raw = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_/-]+/g, ' ')

      if (['company', 'corporation', 'corporate'].includes(raw)) {
        return 'company'
      }

      if ([
        'individual',
        'small business',
        'smallbusiness',
        'small biz',
        'individual small business',
        'sole proprietor',
        'sole proprietorship',
      ].includes(raw)) {
        return 'individual_small_business'
      }

      return ''
    },
    managementModeForBusinessType(businessType) {
      if (businessType === 'company') return 'hr'
      if (businessType === 'individual_small_business') return 'business'
      return ''
    },
    businessAssignmentEmails(business) {
      return Array.from(new Set([
        business?.company_email,
        business?.assignment_email,
        business?.user?.email,
        business?.email,
      ]
        .map(value => String(value || '').trim().toLowerCase())
        .filter(Boolean)))
    },
    syncBusinessAssignmentByEmail() {
      const loginEmail = this.normalizedLoginEmail
      if (!loginEmail || !Array.isArray(this.businessOptions) || !this.businessOptions.length) {
        return
      }

      const matchedBusiness = this.businessOptions.find((business) => (
        this.businessAssignmentEmails(business).includes(loginEmail)
      ))

      if (matchedBusiness && Number(this.newUser.business_id || 0) !== Number(matchedBusiness.id || 0)) {
        this.newUser.business_id = matchedBusiness.id
      }
    },

    tabClass(type){
      return [
        'px-4 py-2 rounded-lg text-sm font-medium transition',
        this.filter===type
          ? 'bg-gradient-to-r from-slate-900 via-teal-800 to-cyan-700 text-white shadow-md'
          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      ]
    },

    clampCurrentPage() {
      const nextPage = Math.min(Math.max(Number(this.currentPage) || 1, 1), this.totalPages)
      if (nextPage !== this.currentPage) {
        this.currentPage = nextPage
      }
    },

    nextPage() {
      if (this.resolvedCurrentPage < this.totalPages) {
        this.currentPage = this.resolvedCurrentPage + 1
      }
    },

    prevPage() {
      if (this.resolvedCurrentPage > 1) {
        this.currentPage = this.resolvedCurrentPage - 1
      }
    },

    startUsersSync() {
      this.stopUsersSync()
      this.usersSyncTimer = window.setInterval(() => {
        if (this.liveUsersUnsubscribe || document.visibilityState !== 'visible' || this.showAddModal) return
        this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
      }, 5000)
    },

    stopUsersSync() {
      if (this.usersSyncTimer) {
        window.clearInterval(this.usersSyncTimer)
        this.usersSyncTimer = null
      }
    },

    handleWindowFocus() {
      if (this.liveUsersUnsubscribe) return
      if (this.showAddModal) return
      this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
    },

    handleVisibilityChange() {
      if (this.liveUsersUnsubscribe) return
      if (document.visibilityState !== 'visible' || this.showAddModal) return
      this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
    },
    handleResubmissionStorage(event) {
      if (!event || event.key !== 'thesis_capstone_profile_resubmissions') return
      this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
    },

    subscribeLiveUsers() {
      this.unsubscribeLiveUsers()
      this.hasLiveUsersSnapshot = false

      if (!firebaseConfigReady || !realtimeDb) return

      try {
        const profilesRef = realtimeRef(realtimeDb, 'profiles')
        const resubmissionsRef = realtimeRef(realtimeDb, 'app_data/resubmissions')
        const adminReviewQueueRef = realtimeRef(realtimeDb, 'app_data/admin_review_queue')
        this.liveUsersUnsubscribe = onValue(
          profilesRef,
          () => {
            const hadSnapshot = this.hasLiveUsersSnapshot
            this.hasLiveUsersSnapshot = true
            this.fetchUsers({
              silent: hadSnapshot,
              preserveExistingOnFailure: true,
            })
          },
          () => {
            this.unsubscribeLiveUsers()
            this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
          },
        )
        this.liveResubmissionsUnsubscribe = onValue(
          resubmissionsRef,
          () => {
            if (!this.hasLiveUsersSnapshot) return
            this.fetchUsers({
              silent: true,
              preserveExistingOnFailure: true,
            })
          },
          () => {
            if (!this.hasLiveUsersSnapshot) return
            this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
          },
        )
        this.liveAdminReviewQueueUnsubscribe = onValue(
          adminReviewQueueRef,
          () => {
            if (!this.hasLiveUsersSnapshot) return
            this.fetchUsers({
              silent: true,
              preserveExistingOnFailure: true,
            })
          },
          () => {
            if (!this.hasLiveUsersSnapshot) return
            this.fetchUsers({ silent: true, preserveExistingOnFailure: true })
          },
        )
      } catch {
        this.liveUsersUnsubscribe = null
        this.liveResubmissionsUnsubscribe = null
        this.liveAdminReviewQueueUnsubscribe = null
      }
    },

    unsubscribeLiveUsers() {
      if (typeof this.liveUsersUnsubscribe === 'function') {
        this.liveUsersUnsubscribe()
      }
      if (typeof this.liveResubmissionsUnsubscribe === 'function') {
        this.liveResubmissionsUnsubscribe()
      }
      if (typeof this.liveAdminReviewQueueUnsubscribe === 'function') {
        this.liveAdminReviewQueueUnsubscribe()
      }
      this.liveUsersUnsubscribe = null
      this.liveResubmissionsUnsubscribe = null
      this.liveAdminReviewQueueUnsubscribe = null
      this.hasLiveUsersSnapshot = false
    },

    fetchUsers(options = {}){
      const silent = Boolean(options?.silent)
      const preserveExistingOnFailure = options?.preserveExistingOnFailure !== false
      const requestId = ++this.usersFetchRequestId
      if (!silent && this.users.length === 0) {
        this.isLoadingUsers = true
      }
      axios.get('/admin/users')
        .then(res=>{
          if (requestId !== this.usersFetchRequestId) return
          const payload = res.data || {}
          const rows = Array.isArray(payload)
            ? payload
            : (payload.users || payload.rows || [])
          const normalized = this.normalizeUsers(rows)
          if (normalized.length > 0) {
            this.users = normalized
            return
          }

          const cachedUsers = this.normalizeUsers(getStoredProfileCache())
          if (cachedUsers.length > 0) {
            if (!silent || !preserveExistingOnFailure || this.users.length === 0) {
              this.users = cachedUsers
            }
            if (!silent) {
              showAdminFeedbackToast(
                'warning',
                'Loaded cached users',
                'Firebase returned no user rows, so the cached profile list was shown instead.',
                3600,
              )
            }
            return
          }

          if (!silent || !preserveExistingOnFailure) {
            this.users = []
          }
        })
        .catch((err)=>{
          if (requestId !== this.usersFetchRequestId) return
          const cachedUsers = this.normalizeUsers(getStoredProfileCache())
          if (cachedUsers.length > 0) {
            if (!silent || !preserveExistingOnFailure || this.users.length === 0) {
              this.users = cachedUsers
            }
            if (!silent) {
              showAdminFeedbackToast(
                'warning',
                'Loaded cached users',
                err.response?.data?.message || 'Firebase user list could not be loaded, so cached profiles were shown instead.',
                4200,
              )
            }
            return
          }

          if (!silent) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to fetch users', 'error')
          }
        })
        .finally(() => {
          if (requestId === this.usersFetchRequestId) {
            this.isLoadingUsers = false
          }
        })
    },

    refreshFromFirebase() {
      if (this.isRefreshingUsers) {
        return
      }

      const currentUsers = Array.isArray(this.users) ? [...this.users] : []
      this.isRefreshingUsers = true
      axios.post('/admin/users/refresh-firebase', {}, { skipGlobalLoading: true })
        .then((res) => {
          const payload = res.data || {}
          const refreshedUsers = this.normalizeUsers(payload.users || payload.rows || [])
          if (refreshedUsers.length > 0) {
            this.users = refreshedUsers
          } else if (currentUsers.length > 0) {
            this.users = currentUsers
          } else {
            this.users = refreshedUsers
          }
          showAdminFeedbackToast(
            payload.refreshed ? 'success' : 'error',
            payload.refreshed ? 'Firebase refreshed' : 'Firebase refresh returned no live users',
            payload.message || (payload.refreshed ? 'The admin table now shows the latest Firebase users.' : 'No live Firebase users were returned. Keeping the current table if available.'),
            4200,
          )
        })
        .catch((err) => {
          showAdminFeedbackToast(
            'error',
            'Firebase refresh failed',
            err.response?.data?.message || 'Could not refresh users from Firebase.',
            4200,
          )
        })
        .finally(() => {
          this.isRefreshingUsers = false
        })
    },

    fetchBusinesses() {
      axios.get('/admin/businesses')
        .then(res => {
          this.businessOptions = (res.data || [])
            .map(item => ({
              ...item,
              normalized_type: this.normalizeBusinessType(item.business_type),
              derived_management_mode: String(item.management_mode || '').trim().toLowerCase()
                || this.managementModeForBusinessType(this.normalizeBusinessType(item.business_type)),
              business_name: item.business_name || item.company_name || item.user?.business_name || `Business #${item.id}`,
              assignment_email: (
                [
                  item.company_email,
                  item.assignment_email,
                  item.user?.email,
                  item.email,
                ]
                  .map(value => String(value || '').trim())
                  .find(Boolean)
              ) || null,
            }))
            .filter(item => item.normalized_type === 'company' && item.derived_management_mode === 'hr')

          this.syncBusinessAssignmentByEmail()
        })
        .catch(() => {
          this.businessOptions = []
        })
    },

    openViewUser(userOrId){
      const selectedUser = typeof userOrId === 'object'
        ? userOrId
        : this.users.find((row) => (
            String(row?.id || row?.uid || row?.firebase_uid || row?.email || '') === String(userOrId || '')
          )) || null
      const resolvedId = selectedUser?.id || selectedUser?.uid || selectedUser?.firebase_uid || selectedUser?.email || userOrId

      if (!resolvedId) {
        showAdminFeedbackToast(
          'error',
          'User record unavailable',
          'This account is missing an identifier, so the detail modal could not be opened.',
          3400,
        )
        return
      }

      this.$refs.viewUserModal.openUserModal(resolvedId, selectedUser)

      if (selectedUser && !selectedUser.has_viewed) {
        selectedUser.has_viewed = true
        axios.post(`/admin/users/${resolvedId}/mark-viewed`, {}, { skipGlobalLoading: true }).catch(() => {})
      }
    },

    handleApproved(payload){
      clearProfileResubmission(payload)
      this.replaceUserRow(payload?.id, this.clearActiveResubmissionState({
        ...payload,
        is_approved: payload?.is_approved,
        status: payload?.is_approved ? 'approved' : 'pending',
        approval_status: payload?.is_approved ? 'approved' : 'pending',
        archived_at: null,
        rejection_reason: null,
        rejection_checklist: [],
      }))
    },

    handleRejected(payload){
      clearProfileResubmission(payload)
      this.replaceUserRow(payload?.id, this.clearActiveResubmissionState({
        ...payload,
        is_approved: false,
        status: payload?.status || 'rejected',
        approval_status: payload?.approval_status || 'rejected',
        archived_at: payload?.archived_at || payload?.latest_account_review_at || new Date().toISOString(),
      }))
    },

    canArchiveUser(user) {
      return Boolean(user?.id && this.isApprovedState(user) && !this.isArchived(user) && this.normalizeRole(user?.role) !== 'admin')
    },

    canRestoreUser(user) {
      return Boolean(user?.id && this.isArchived(user))
    },

    canCorrectWrongEmail(user) {
      return Boolean(user?.id && this.isApprovedState(user) && this.isArchived(user) && this.normalizeRole(user?.role) !== 'admin')
    },

    isRejected(user) {
      return this.normalizeStatus(user?.status) === 'rejected' || this.normalizeStatus(user?.approval_status) === 'rejected'
    },

    archiveUser(user) {
      Swal.fire({
        title: 'Archive User?',
        text: 'Archived accounts are hidden from the active list but can be restored later.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Archive',
      }).then((result) => {
        if (!result.isConfirmed) return

        axios.post(`/admin/users/${user.id}/archive`)
          .then((res) => {
            const updatedUser = res.data?.user || {}
            this.replaceUserRow(user.id, updatedUser)
            Swal.fire('Archived', res.data?.message || 'User archived successfully.', 'success')
          })
          .catch((err) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to archive user.', 'error')
          })
      })
    },

    restoreUser(user) {
      axios.post(`/admin/users/${user.id}/restore`)
        .then((res) => {
          const updatedUser = res.data?.user || {}
          this.replaceUserRow(user.id, updatedUser)
          Swal.fire('Restored', res.data?.message || 'User restored successfully.', 'success')
        })
        .catch((err) => {
          Swal.fire('Error', err.response?.data?.message || 'Failed to restore user.', 'error')
        })
    },

    correctWrongEmail(user) {
      Swal.fire({
        title: 'Remove wrong email account?',
        text: 'Use this only for an approved account that was created with the wrong email. The account must be recreated after removal.',
        icon: 'warning',
        input: 'text',
        inputLabel: 'Reason for correction',
        inputPlaceholder: 'Example: wrong login email entered during admin account creation',
        inputAttributes: {
          autocapitalize: 'off',
        },
        showCancelButton: true,
        confirmButtonText: 'Remove account',
        confirmButtonColor: '#be123c',
        preConfirm: (reason) => {
          const normalized = String(reason || '').trim()
          if (!normalized) {
            Swal.showValidationMessage('Enter a short reason for the wrong-email correction.')
            return false
          }
          return normalized
        },
      }).then((result) => {
        if (!result.isConfirmed) return

        axios.post(`/admin/users/${user.id}/wrong-email-delete`, {
          reason: result.value,
        })
          .then((res) => {
            this.users = this.users.filter((row) => Number(row.id) !== Number(user.id))
            showAdminFeedbackToast(
              'success',
              'Wrong-email account removed',
              res.data?.message || 'You can now recreate the account using the correct email.',
              4200,
            )
          })
          .catch((err) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to remove the wrong-email account.', 'error')
          })
      })
    },

    closeAddModal(force = false){
      if (this.isCreatingUser && !force) {
        return
      }
      this.showAddModal = false
      this.showPassword = false
      this.showPasswordConfirmation = false
      this.isCreatingUser = false
        this.newUser = {
          first_name: '',
          middle_initial: '',
          last_name: '',
          email: '',
          password: '',
          password_confirmation: '',
          role: 'hr',
          business_id: null,
        }
    },


    addUser(){
      if (this.isCreatingUser) {
        return
      }

      this.syncGeneratedIdentity()

      if(!this.canSubmitNewUser){
        const message = this.activeRoleConflictMessage
          ? this.activeRoleConflictMessage
          : !this.newUser.email
          ? 'Please enter the unique login email for this role account.'
          : !this.isValidLoginEmail
            ? 'Please enter a valid and unique login email before creating this account.'
            : 'Please select the company and complete the password fields before adding this role account.'
        showAdminFeedbackToast('error', 'Unable to create account', message, 3400)
        return
      }
      if (this.requiresBusinessAssignment && !this.newUser.business_id) {
        showAdminFeedbackToast('error', 'Company assignment required', 'Please select the company for this account.', 3400)
        return
      }
      if (this.activeRoleConflictMessage) {
        showAdminFeedbackToast('error', 'Role already assigned', this.activeRoleConflictMessage, 3800)
        return
      }
      this.isCreatingUser = true

      const payload = {
        role: this.newUser.role,
        business_id: this.newUser.business_id,
        first_name: this.newUser.first_name,
        middle_initial: '',
        last_name: this.newUser.last_name,
        email: this.normalizedLoginEmail,
        password: this.newUser.password,
        password_confirmation: this.newUser.password_confirmation,
      }

      axios.post('/admin/users', payload, { skipGlobalLoading: true })
        .then(res=>{
          const payload = res.data || {}
          const u = payload.user || payload
          const recipients = Array.isArray(payload.credentials_email_recipients)
            ? payload.credentials_email_recipients.filter(Boolean)
            : []
          const createdRoleLabel = this.resolveRoleLabel(u)
          const createdAssignment = u.assigned_business?.business_name || u.business?.business_name || this.selectedBusinessName || 'Not required'
          this.users.unshift(this.refreshDisplayUser({}, {
            ...u,
            company_name: u.assigned_business?.business_name || u.business?.business_name || this.selectedBusinessName || null,
            has_viewed: false,
          }))
          this.closeAddModal(true)
          const assignmentSummary = createdAssignment && createdAssignment !== 'Not required'
            ? `Assigned to ${createdAssignment}.`
            : 'No company assignment was required.'
          const deliverySummary = recipients.length > 0
            ? recipients.length > 1
              ? 'Credentials will be delivered to the assigned inboxes shortly.'
              : 'Credentials will be delivered shortly.'
            : 'Background account sync is in progress.'
          showAdminFeedbackToast(
            'success',
            `${createdRoleLabel} account created`,
            `${assignmentSummary} ${deliverySummary}`,
            4000,
          )
        })
        .catch(err=>{
          const firstError = err.response?.data?.errors
            ? Object.values(err.response.data.errors)[0][0]
            : (err.response?.data?.message || 'Failed to add user')
          showAdminFeedbackToast('error', 'Account creation failed', firstError, 3800)
        })
        .finally(() => {
          this.isCreatingUser = false
        })
    },

    normalizeRole(role){
      return String(role || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
    },
    normalizeStatus(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
    },
    clearActiveResubmissionState(user = {}) {
      return {
        ...user,
        government_id_resubmission: null,
        government_id_resubmission_url: null,
        government_id_resubmission_meta: null,
        document_resubmitted_at: null,
      }
    },
    flagValue(value) {
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (['1', 'true', 'yes', 'approved', 'active'].includes(normalized)) return true
        if (['0', 'false', 'no', '', 'pending', 'rejected', 'archived', 'deleted'].includes(normalized)) return false
      }

      return Boolean(value)
    },
    hasResubmittedDocuments(user) {
      const reviewKind = this.normalizeStatus(user?.latest_account_review_kind)
      const reviewTitle = String(user?.latest_account_review_title || '').trim().toLowerCase()
      const reviewMessage = String(user?.latest_account_review_message || '').trim().toLowerCase()
      const reviewAt = String(user?.latest_account_review_at || '').trim()
      const resubmittedAt = String(user?.document_resubmitted_at || '').trim()
      const hasStoredResubmissionFile = Boolean(
        String(user?.government_id_resubmission || user?.government_id_resubmission_url || '').trim()
      )
      const resubmittedTime = resubmittedAt ? new Date(resubmittedAt).getTime() : 0
      const reviewTime = reviewAt ? new Date(reviewAt).getTime() : 0
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
      return Boolean(
        hasReviewResubmissionSignal
        || resubmittedAfterReview
        || hasLocalResubmission(user, reviewAt)
        || (hasStoredResubmissionFile && (hasReviewResubmissionSignal || !reviewAt || resubmittedAfterReview))
      )
    },
    userState(user) {
      const status = this.normalizeStatus(user?.status)
      const approvalStatus = this.normalizeStatus(user?.approval_status)
      const resubmitted = this.hasResubmittedDocuments(user)
      const hasPendingReviewState = [status, approvalStatus]
        .some((value) => ['pending', 'pending_approval', 'pending_review', 'under_review', 'reviewing'].includes(value))

      if (status === 'rejected' || approvalStatus === 'rejected') {
        return resubmitted ? 'pending' : 'archived'
      }

      if (hasPendingReviewState) {
        return 'pending'
      }

      if (user?.archived_at || ['archived', 'deleted'].includes(status)) {
        return 'archived'
      }

      if (!this.flagValue(user?.is_approved)) {
        return 'pending'
      }

      return 'approved'
    },
    isApprovedState(user) {
      return this.userState(user) === 'approved'
    },
    isArchived(user) {
      return this.userState(user) === 'archived'
    },
    isPendingTabUser(user) {
      return this.userState(user) === 'pending'
    },
    isReviewableUser(user) {
      return Boolean(user?.id) && this.isPendingTabUser(user)
    },
    isFreshRegistration(user) {
      return Boolean(user?.id) && this.isPendingTabUser(user) && !user?.has_viewed
    },
    rowClass(user) {
      if (this.isArchived(user)) {
        return 'bg-slate-50/90 text-slate-500'
      }

      if (this.isFreshRegistration(user)) {
        return 'bg-amber-50/40 transition hover:bg-amber-50'
      }

      return 'transition hover:bg-slate-50'
    },
    userSortTimestamp(user) {
      const candidates = [
        user?.archived_at,
        user?.latest_account_review_at,
        user?.document_resubmitted_at,
        user?.updated_at,
        user?.created_at,
      ]

      for (const value of candidates) {
        const time = new Date(value).getTime()
        if (!Number.isNaN(time) && time > 0) {
          return time
        }
      }

      return 0
    },
    userSortBucket(user) {
      if (this.isArchived(user)) return 2
      if (this.isPendingTabUser(user)) return 0
      if (this.isApprovedState(user)) return 1
      return 3
    },
    sortUsers(rows) {
      return [...rows].sort((left, right) => {
        const leftBucket = this.userSortBucket(left)
        const rightBucket = this.userSortBucket(right)
        if (leftBucket !== rightBucket) return leftBucket - rightBucket

        const leftFresh = this.isPendingTabUser(left) && !left?.has_viewed ? 0 : 1
        const rightFresh = this.isPendingTabUser(right) && !right?.has_viewed ? 0 : 1
        if (leftFresh !== rightFresh) return leftFresh - rightFresh

        const leftTime = this.userSortTimestamp(left)
        const rightTime = this.userSortTimestamp(right)
        if (leftTime !== rightTime) return rightTime - leftTime

        return String(left.name || left.email || '').localeCompare(String(right.name || right.email || ''))
      })
    },
    normalizeUsers(rows) {
      return (Array.isArray(rows) ? rows : []).map(u => ({
        ...u,
        name: (
          `${u.first_name || ''} ${u.middle_initial ? u.middle_initial+'. ' : ''}${u.last_name || ''}`.trim()
          || u.display_name
          || u.email
          || 'Unnamed user'
        ),
        role_label: this.resolveRoleLabel(u),
        workspace_type_label: u.workspace_type_label || this.prettyWorkspaceType(u.workspace_type),
        account_source_label: u.account_source_label || this.prettyAccountSource(u.account_source),
        source_trace: Array.isArray(u.source_trace) ? u.source_trace : [],
        source_trace_label: u.source_trace_label || this.formatSourceTrace(u.source_trace),
        source_missing: Array.isArray(u.source_missing) ? u.source_missing : [],
        source_missing_label: u.source_missing_label || this.formatSourceTrace(u.source_missing, 'Missing: '),
        company_name: u.company_name || u.business_name || u.assigned_business?.business_name || u.business?.business_name || null,
        has_viewed: u.has_viewed || false,
      }))
    },
    prettyRole(role){
      const normalized = this.normalizeRole(role)
      if (!normalized) return 'Unknown'
      return normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    businessAccountRoleLabel(user) {
      const businessType = this.normalizeBusinessType(
        user?.business_type
        || user?.business?.business_type
        || user?.assigned_business?.business_type
      )
      const managementMode = this.normalizeRole(
        user?.management_mode
        || user?.business?.management_mode
        || user?.assigned_business?.management_mode
        || user?.workspace_type
      )
      return businessType === 'company' || managementMode === 'hr' || managementMode === 'hr_managed_company'
        ? 'Company'
        : 'Business'
    },
    resolveRoleLabel(user) {
      const role = this.normalizeRole(user?.role)
      if (role === 'business') {
        return this.businessAccountRoleLabel(user)
      }
      if (role && role !== 'user' && this.roleNames[role]) {
        return this.roleNames[role]
      }

      const firstNameRole = this.normalizeRole(user?.first_name)
      if (firstNameRole && firstNameRole !== 'user' && this.roleNames[firstNameRole]) {
        return this.roleNames[firstNameRole]
      }

      if (role === 'user') {
        const workspaceType = this.prettyWorkspaceType(user?.workspace_type)
        if (workspaceType && workspaceType !== 'General Workspace') {
          return workspaceType
        }
      }

      if (role && role !== 'user') {
        return this.prettyRole(role)
      }

      if (firstNameRole) {
        return this.prettyRole(firstNameRole)
      }

      return 'User'
    },
    prettyWorkspaceType(value){
      const normalized = this.normalizeRole(value)
      if (!normalized) return 'General Workspace'
      const labels = {
        platform_admin: 'Platform Administrator',
        business_owner: 'Business Owner',
        hr_managed_company: 'HR-Managed Company',
        company_staff: 'Company Staff',
        service_provider: 'Service Provider',
        service_team: 'Service Team',
        customer_portal: 'Customer Portal User',
      }
      return labels[normalized] || normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    prettyAccountSource(value){
      const normalized = this.normalizeRole(value)
      if (!normalized) return 'Unspecified'
      const labels = {
        admin_created: 'Admin-Created Account',
        self_registered: 'Self-Registered Account',
        offline_registered: 'Offline Registered Account',
        firestore: 'Firestore',
        firebase_auth: 'Firebase Authentication',
        auth_table: 'Auth Table',
        legacy_snapshot: 'Legacy Snapshot',
        admin_snapshot: 'Admin Snapshot',
        cache: 'Cache',
      }
      return labels[normalized] || normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    prettySourceOrigin(value){
      const normalized = String(value || '').trim().toLowerCase()
      if (!normalized) return 'Unknown'
      const labels = {
        firestore: 'Firestore',
        firebase_auth: 'Firebase Authentication',
        auth_table: 'Auth Table',
        legacy_snapshot: 'Legacy Snapshot',
        offline_registered: 'Offline Cache',
        admin_snapshot: 'Admin Snapshot',
        cache: 'Cache',
      }
      return labels[normalized] || normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    formatSourceTrace(values, prefix = 'Present: ') {
      const items = Array.isArray(values) ? values : []
      const labels = items
        .map(item => this.prettySourceOrigin(item))
        .filter(Boolean)
      if (!labels.length) {
        return prefix === 'Missing: ' ? null : `${prefix}none`
      }
      return `${prefix}${labels.join(', ')}`
    },
    refreshDisplayUser(row, updatedUser = {}) {
      const next = {
        ...(row || {}),
        ...(updatedUser || {}),
      }

      next.name = (
        `${next.first_name || ''} ${next.middle_initial ? next.middle_initial + '. ' : ''}${next.last_name || ''}`.trim()
        || next.display_name
        || next.email
        || row?.name
        || 'Unnamed user'
      )
      next.role_label = this.resolveRoleLabel(next)
      next.workspace_type_label = next.workspace_type_label || this.prettyWorkspaceType(next.workspace_type)
      next.account_source_label = next.account_source_label || this.prettyAccountSource(next.account_source)
      next.source_trace = Array.isArray(next.source_trace) ? next.source_trace : (Array.isArray(row?.source_trace) ? row.source_trace : [])
      next.source_trace_label = next.source_trace_label || this.formatSourceTrace(next.source_trace)
      next.source_missing = Array.isArray(next.source_missing) ? next.source_missing : (Array.isArray(row?.source_missing) ? row.source_missing : [])
      next.source_missing_label = next.source_missing_label || this.formatSourceTrace(next.source_missing, 'Missing: ')
      next.company_name = next.assigned_business?.business_name || next.business?.business_name || row?.company_name || null

      return next
    },
    replaceUserRow(userId, updatedUser = {}) {
      const target = String(userId || updatedUser?.id || updatedUser?.uid || updatedUser?.firebase_uid || '').trim()
      if (!target) return

      this.users = this.users.map((row) => {
        const rowId = String(row?.id || row?.uid || row?.firebase_uid || row?.email || '').trim()
        if (rowId !== target) return row
        return this.refreshDisplayUser(row, updatedUser)
      })
    },
  }
}
</script>


