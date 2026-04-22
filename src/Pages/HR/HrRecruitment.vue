<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <!-- Main -->
    <div class="flex flex-1 flex-col">
      <HrTopbar @logout="logout" />

      <div class="hr-content p-4 sm:p-5">
        <div class="flex flex-col gap-4">
            <div class="overflow-hidden rounded-2xl border-t-4 border-t-emerald-600 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">HR Workspace</p>
                <h1 class="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-slate-900">Employee Management &amp; Onboarding</h1>
                <p class="mt-1.5 text-sm text-slate-600">Create employee records, route them through HR approval, and prepare them for Operations assignment.</p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button type="button"
                        class="rounded-full border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:brightness-105"
                        @click="exportHiringList">
                  Export Employee List
                </button>
                <button type="button"
                        class="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900"
                        @click="openPublishModal">
                  Publish Open Role
                </button>
              </div>
            </div>

            <!-- Employee Management -->
            <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Employee Management</h2>
                  <p class="text-sm text-slate-500">Add employees and prepare them for HR approval before Operations team assignment.</p>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button"
                            class="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900"
                            @click="goToServiceProviders">
                      Provider Accounts (Optional)
                    </button>
                    <button type="button"
                            class="inline-flex items-center rounded-full border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:brightness-105"
                            @click="openAddModal">
                      Add Employee
                    </button>
                    <button type="button"
                            class="inline-flex items-center rounded-full border border-teal-600 bg-white px-4 py-2.5 text-xs font-bold text-teal-700 shadow-md shadow-teal-900/10 transition hover:-translate-y-0.5 hover:border-teal-700 hover:bg-teal-50"
                            @click="openCreateUserModal">
                      Create User Account
                    </button>
                    <button type="button"
                            class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-md shadow-indigo-900/10 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100"
                            @click="openApprovalQueue">
                      Open Approval Queue
                      <span class="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">{{ pendingApprovalCount }}</span>
                    </button>
                  </div>
                </div>
                <form class="flex flex-wrap items-center gap-3" autocomplete="off" @submit.prevent="applyFilters">
                  <input v-model="pendingSearch"
                    type="text"
                    placeholder="Search employees..."
                    class="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 lg:w-64" />
                  <select v-model="pendingDepartment"
                          class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="">All Teams</option>
                    <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
                  </select>
                  <button type="submit"
                          class="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900">
                    Search
                  </button>
                </form>
              </div>

              <div class="mt-6">
                <div class="mb-4 grid gap-3 md:grid-cols-2">
                  <article class="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
                    <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Approval Queue</p>
                    <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ pendingApprovalCount }}</p>
                    <p class="mt-1 text-sm text-slate-600">Employees waiting for HR approval before they are released to Operations.</p>
                  </article>
                  <article class="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 shadow-sm">
                    <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Operations Ready</p>
                    <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ approvedEmployeeCount }}</p>
                    <p class="mt-1 text-sm text-slate-600">Approved employees ready for Operational Management team or service assignment.</p>
                  </article>
                </div>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-slate-900">Employees</p>
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{{ filteredEmployees.length }} listed</span>
                  </div>
                  <div v-if="pagedEmployees.length > 0" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-left">
                        <thead class="bg-slate-50">
                          <tr class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <th class="px-5 py-3">Employee</th>
                            <th class="px-5 py-3">Position</th>
                            <th class="px-5 py-3">Service</th>
                            <th class="px-5 py-3">Start Date</th>
                            <th class="px-5 py-3">Approval</th>
                            <th class="px-5 py-3">Status</th>
                            <th class="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                          <tr
                            v-for="employee in pagedEmployees"
                            :key="employee.id"
                            class="align-top"
                          >
                            <td class="px-5 py-4">
                              <div class="flex items-start gap-3">
                                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 text-sm font-extrabold text-white shadow-[0_16px_28px_-18px_rgba(14,165,233,0.8)]">
                                  {{ employeeInitials(employee.fullName) }}
                                </div>
                                <div>
                                  <p class="text-sm font-bold leading-snug text-slate-900">{{ employee.fullName }}</p>
                                  <p class="mt-1 text-xs text-slate-500">Pending HR record for Operations release after approval.</p>
                                </div>
                              </div>
                            </td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-900">
                              {{ employee.role || 'Role not set' }}
                            </td>
                            <td class="px-5 py-4 text-sm text-slate-600">
                              {{ employeeServiceLabel(employee.serviceTrack || employee.role) }}
                            </td>
                            <td class="px-5 py-4 text-sm text-slate-600">
                              {{ employee.startDate || 'TBD' }}
                            </td>
                            <td class="px-5 py-4">
                              <span :class="approvalBadgeClass(employee.approvalStatus)" class="inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                                {{ approvalStatusLabel(employee.approvalStatus) }}
                              </span>
                            </td>
                            <td class="px-5 py-4">
                              <span :class="statusBadgeClass(employee.status)" class="inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                                {{ employee.status }}
                              </span>
                            </td>
                            <td class="px-5 py-4">
                              <div class="flex flex-wrap justify-end gap-2">
                                <button
                                  class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                  :disabled="employee.approvalStatus !== 'approved'"
                                  @click="toggleStatus(employee.id)"
                                >
                                  Toggle
                                </button>
                                <button
                                  class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                  @click="confirmRemove(employee.id)"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    {{ loadingEmployees ? 'Loading employees...' : 'Loading employees...' }}
                  </div>
                  <div class="flex items-center justify-between pt-2">
                    <p class="text-xs text-slate-500">
                      Page {{ currentPage }} of {{ totalPages }}
                    </p>
                    <div class="flex items-center gap-2">
                      <button type="button"
                              class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                              :disabled="currentPage === 1"
                              @click="prevPage">
                        Prev
                      </button>
                      <button type="button"
                              class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                              :disabled="currentPage === totalPages"
                              @click="nextPage">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
              <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeAddModal"></div>
              <div class="relative z-10 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Add Employee Record</h3>
                  <button type="button"
                          :disabled="savingEmployee"
                          class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="closeAddModal">
                    Close
                  </button>
                </div>
                <form class="mt-4" @submit.prevent="addEmployee">
                  <div
                    v-if="!publishOnlyMode"
                    class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500"
                  >
                    <span :class="wizardStep === 1 ? 'text-slate-900' : 'text-slate-400'">Step 1 - Personal Info</span>
                    <span :class="wizardStep === 2 ? 'text-slate-900' : 'text-slate-400'">Step 2 - Role And Deployment Setup</span>
                  </div>
<div v-if="wizardStep === 1" class="mt-4 grid gap-4">
                    <div class="grid gap-4 md:grid-cols-3">
                      <div>
                        <input v-model="employeeForm.givenName"
                               type="text"
                               placeholder="Given Name"
                               class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                        <p v-if="givenNameError" class="text-xs text-rose-600 mt-1">{{ givenNameError }}</p>
                      </div>
                      <div>
                        <input v-model="employeeForm.middleName"
                               type="text"
                               placeholder="Middle Name (Optional)"
                               class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                        <p v-if="middleNameError" class="text-xs text-rose-600 mt-1">{{ middleNameError }}</p>
                      </div>
                      <div>
                        <input v-model="employeeForm.lastName"
                               type="text"
                               placeholder="Last Name"
                               class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                        <p v-if="lastNameError" class="text-xs text-rose-600 mt-1">{{ lastNameError }}</p>
                      </div>
                    </div>
                    <div>
                      <input v-model="employeeForm.email"
                             type="email"
                             placeholder="Email Address"
                             class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                      <p v-if="emailError" class="text-xs text-rose-600 mt-1">{{ emailError }}</p>
                      <p
                        v-if="emailAvailabilityMessage"
                        class="text-xs mt-1"
                        :class="availabilityMessageClass(emailAvailabilityStatus)"
                      >
                        {{ emailAvailabilityMessage }}
                      </p>
                    </div>
                    <div class="relative">
                      <input v-model="employeeForm.password"
                             :type="showPassword ? 'text' : 'password'"
                             placeholder="Password"
                             :class="[
                               'w-full rounded-xl border bg-white px-4 py-2 pr-12 text-sm text-slate-700 focus:outline-none',
                               passwordStrengthInputClass
                             ]" />
                      <button
                        type="button"
                        class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        :aria-label="showPassword ? 'Hide password' : 'Show password'"
                        @click="showPassword = !showPassword"
                      >
                        <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
                      <p class="text-xs text-slate-500">
                        For stronger passwords, use a mix of letters, numbers, and special characters.
                      </p>
                      <p v-if="passwordStrengthLabel" class="text-xs font-semibold" :class="passwordStrengthClass">
                        {{ passwordStrengthLabel }}
                      </p>
                    </div>
                    <p v-if="passwordRequirementError" class="text-xs text-rose-600">
                      {{ passwordRequirementError }}
                    </p>
                    <button
                      type="button"
                      class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="checkingEmail"
                      @click="goToWorkStep"
                    >
                      {{ checkingEmail ? 'Checking email...' : 'Next: Role And Deployment Setup' }}
                    </button>
                  </div>
                  <div v-else class="mt-4 grid gap-4">
                    <template v-if="publishOnlyMode">
                      <input
                        v-model="employeeForm.role"
                        type="text"
                        placeholder="Enter Role / Position"
                        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </template>
                    <template v-else>
                      <div class="grid gap-4">
                        <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                          <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role Setup</p>
                              <h4 class="mt-1 text-base font-semibold text-slate-900">Choose the service and position.</h4>
                              <p class="mt-1 text-xs text-slate-500">Company-enabled services lang ang lalabas dito.</p>
                            </div>
                            <span
                              v-if="workspaceCategoryLabel"
                              class="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-700"
                            >
                              {{ workspaceCategoryLabel }}
                            </span>
                          </div>

                          <div class="mt-4 space-y-4">
                            <div class="space-y-2">
                              <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company Service</label>

                              <div
                                v-if="serviceTrackOptions.length === 1"
                                class="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3"
                              >
                                <p class="text-sm font-semibold text-slate-900">{{ serviceTrackOptions[0].label }}</p>
                                <p class="mt-1 text-xs text-slate-500">{{ singleTrackHelperText }}</p>
                              </div>

                              <div v-else class="grid gap-2 sm:grid-cols-2">
                                <button
                                  v-for="track in serviceTrackOptions"
                                  :key="track.key"
                                  type="button"
                                  class="rounded-2xl border px-3 py-3 text-left transition"
                                  :class="employeeForm.serviceTrack === track.key
                                    ? 'border-teal-300 bg-teal-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'"
                                  @click="employeeForm.serviceTrack = track.key"
                                >
                                  <p class="text-sm font-semibold text-slate-900">{{ track.label }}</p>
                                  <p class="mt-1 text-xs leading-5 text-slate-500">{{ track.description }}</p>
                                </button>
                              </div>
                            </div>

                            <div class="space-y-2">
                              <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Position</label>
                              <select
                                v-model="employeeForm.rolePreset"
                                :disabled="!employeeForm.serviceTrack"
                                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                <option value="">{{ employeeForm.serviceTrack ? 'Select role / position' : 'Select service first' }}</option>
                                <template v-for="group in serviceTrackRoleGroups" :key="group.label">
                                  <optgroup :label="group.label">
                                    <option
                                      v-for="option in group.options"
                                      :key="`${group.label}-${option.value}`"
                                      :value="option.value"
                                    >
                                      {{ option.label }}
                                    </option>
                                  </optgroup>
                                </template>
                              </select>
                              <p class="text-xs text-slate-500">{{ roleSelectionHelperText }}</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    </template>
                    <div v-if="false" class="grid gap-2">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <p class="text-xs font-medium text-slate-700">Linked Service Provider Account</p>
                          <span
                            v-if="selectedProviderIsFull"
                            class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700"
                          >
                            Full
                          </span>
                        </div>
                        <button type="button"
                                class="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
                                @click="goToServiceProviders">
                          Manage Provider Accounts
                        </button>
                      </div>
                      <select v-model="employeeForm.serviceProviderId"
                              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
                        <option value="">Select Linked Service Provider</option>
                        <option
                          v-for="provider in serviceProviders"
                          :key="provider.id"
                          :value="String(provider.id)"
                          :disabled="providerIsFull(provider)"
                        >
                          {{ providerOptionLabel(provider) }}
                        </option>
                      </select>
                      <p
                        v-if="selectedServiceProvider"
                        class="text-xs"
                        :class="selectedProviderIsFull ? 'text-rose-600' : 'text-slate-500'"
                      >
                        Capacity: {{ selectedProviderCapacityLabel }}
                        <span v-if="selectedProviderRemaining !== null">· Slots left: {{ selectedProviderRemaining }}</span>
                        <span v-if="selectedProviderIsFull"> (full)</span>
                      </p>
                      <div
                        v-if="selectedProviderIsFull"
                        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        This service provider already has 3 employees. Please choose another provider.
                      </div>
                      <p class="text-xs text-slate-500">Link this employee record to the accredited provider account used for Operations assignment and dispatch planning.</p>
                      <p class="text-xs text-slate-500">Maximum of 3 employees per accredited provider. Full providers cannot accept more employee records.</p>
                      <div v-if="!serviceProviders.length" class="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p class="text-xs font-medium text-amber-700">No accredited provider accounts yet.</p>
                        <button
                          type="button"
                          class="text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
                          @click="goToServiceProviders"
                        >
                          Create one
                        </button>
                      </div>
                    </div>
                    <div class="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Record Start Date</label>
                        <p class="mt-1 text-xs text-slate-500">HR approval muna bago magamit sa Operations.</p>
                        <input v-model="employeeForm.startDate"
                               type="date"
                               :min="yearStart"
                               :max="yearEnd"
                               required
                               class="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                      </div>
                      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Internal Notes</label>
                        <p class="mt-1 text-xs text-slate-500">Optional lang: certification, shift note, or reminder.</p>
                        <textarea v-model="employeeForm.notes"
                                  rows="3"
                                  placeholder="Notes (optional)"
                                  class="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"></textarea>
                      </div>
                    </div>
                    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div class="min-h-[20px] flex-1 text-xs font-medium text-slate-500">
                        <div v-if="savingEmployee" class="inline-flex items-center gap-2 text-emerald-700">
                          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                          </svg>
                          Creating employee record...
                        </div>
                        <p v-else class="text-xs text-slate-500">
                          This company can create multiple employee records. Approved employees will appear in Operations for team assignment and dispatch.
                        </p>
                      </div>
                      <div class="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row sm:items-center">
                      <button v-if="!publishOnlyMode"
                              type="button"
                              :disabled="savingEmployee"
                              class="inline-flex min-w-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              @click="wizardStep = 1">
                        Back
                      </button>
                      <button v-if="publishOnlyMode"
                              type="button"
                              class="inline-flex min-w-[200px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              :disabled="!employeeForm.role"
                              @click="publishOpenRole">
                        Publish Open Role
                      </button>
                      <button v-if="!publishOnlyMode"
                              type="submit"
                              :disabled="savingEmployee"
                              class="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(14,165,233,0.75)] transition hover:from-cyan-600 hover:via-sky-600 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
                        <svg v-if="savingEmployee" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                        </svg>
                        {{ savingEmployee ? "Creating Employee..." : "Create Employee Record" }}
                      </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div v-if="showCreateUserModal" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
              <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeCreateUserModal"></div>
              <div class="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">HR Workspace</p>
                    <h3 class="mt-2 text-2xl font-bold text-slate-900">Create User Account</h3>
                    <p class="mt-2 text-sm text-slate-500">Create staff access for Operations, Finance, CSR, or Procurement teams.</p>
                  </div>
                  <button type="button"
                          :disabled="creatingUserAccount || checkingAccountEmail"
                          class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="closeCreateUserModal">
                    Close
                  </button>
                </div>

                <form class="mt-6 grid gap-4 md:grid-cols-2" @submit.prevent="createUserAccount">
                  <div class="md:col-span-2">
                    <label class="text-sm font-semibold text-slate-700">Department</label>
                    <select v-model="userAccountForm.department" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" required>
                      <option value="" disabled>Select department</option>
                      <option v-for="dept in departmentOptions" :key="dept.value" :value="dept.value">{{ dept.label }}</option>
                    </select>
                    <p class="mt-1 text-xs text-slate-500">Department office account ito, so automatic approved na agad after create.</p>
                  </div>

                  <div class="md:col-span-2">
                    <label class="text-sm font-semibold text-slate-700">Email Address</label>
                    <div class="relative mt-1">
                      <input
                        v-model.trim="userAccountForm.email"
                        type="email"
                        class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 pr-28 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="name@company.com"
                        required
                      />
                      <span
                        v-if="checkingAccountEmail"
                        class="absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-slate-500"
                      >
                        Checking...
                      </span>
                      <span
                        v-else-if="accountEmailStatus === 'success'"
                        class="absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-emerald-600"
                      >
                        Available
                      </span>
                      <span
                        v-else-if="accountEmailStatus === 'error' && accountEmailMessage"
                        class="absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-rose-600"
                      >
                        Not available
                      </span>
                    </div>
                    <p v-if="accountEmailMessage" class="mt-1 text-xs" :class="availabilityMessageClass(accountEmailStatus)">{{ accountEmailMessage }}</p>
                  </div>

                  <div class="md:col-span-2">
                    <label class="text-sm font-semibold text-slate-700">Password</label>
                    <div class="relative mt-1">
                      <input
                        v-model.trim="userAccountForm.password"
                        :type="showAccountPassword ? 'text' : 'password'"
                        class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 pr-12 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        required
                      />
                      <button type="button"
                              class="absolute inset-y-0 right-2 inline-flex items-center rounded-lg px-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              @click="showAccountPassword = !showAccountPassword">
                        {{ showAccountPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>

                    <div v-if="userAccountForm.password" class="mt-3 space-y-2">
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-semibold text-slate-600">Password strength</span>
                        <span :class="accountPasswordStrengthClass" class="font-semibold">{{ accountPasswordStrengthLabel }}</span>
                      </div>
                      <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div class="h-full rounded-full transition-all duration-300" :class="accountPasswordStrengthBarClass" :style="{ width: `${accountPasswordStrengthPercent}%` }"></div>
                      </div>
                      <p v-if="userAccountPasswordError" class="text-xs text-rose-600">{{ userAccountPasswordError }}</p>
                    </div>
                  </div>

                  <div class="md:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button type="button"
                            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="creatingUserAccount || checkingAccountEmail"
                            @click="resetUserAccountForm">
                      Reset
                    </button>
                    <button type="submit"
                            class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            :disabled="creatingUserAccount || checkingAccountEmail">
                      {{ creatingUserAccount ? 'Creating...' : 'Create User Account' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import Swal from "@/lib/sweetalert-toast-shim";
import { createToastInterface, POSITION } from "vue-toastification";
import HrSidebarNav from "@/Components/HrSidebarNav.vue";
import HrTopbar from '@/Components/HrTopbar.vue'
import { confirmAndLogout } from '@/lib/auth-flow'
import { showProfessionalFeedbackToast } from '@/lib/professional-feedback-toast'

const activeMenu = ref("Employee Management");
const page = usePage();
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
  const isHrManager = computed(() => Boolean(page.props?.auth?.flags?.is_hr_manager));
  const hrBasePath = computed(() =>
    String(page.props?.auth?.user?.role || '').trim().toLowerCase() === 'employee'
      ? '/employee/hr'
      : '/hr'
  )

function navigateTo(menu, url) {
  activeMenu.value = menu;
  router.visit(url);
}

function openApprovalQueue() {
  router.visit(`${hrBasePath.value}/approval-queue`);
}

  function goToServiceProviders() {
    router.visit(`${hrBasePath.value}/service-providers`);
  }

const showCreateUserModal = ref(false);
const checkingAccountEmail = ref(false);
const accountEmailChecked = ref(false);
const accountEmailStatus = ref("");
const accountEmailMessage = ref("");
const creatingUserAccount = ref(false);
const showAccountPassword = ref(false);
let userAccountEmailTimer = null;
const loadingEmployees = ref(true);

function openCreateUserModal() {
  showCreateUserModal.value = true;
}

function closeCreateUserModal() {
  if (creatingUserAccount.value || checkingAccountEmail.value) return;
  if (userAccountEmailTimer) {
    window.clearTimeout(userAccountEmailTimer);
    userAccountEmailTimer = null;
  }
  showCreateUserModal.value = false;
}

const logout = async () => {
  await confirmAndLogout()
};

let publishProgressTimer = null;

const departments = ref([
  "Field Operations",
  "Siphoning Team",
  "Plumbing Installations",
  "Dispatch & Scheduling",
  "Safety & Compliance",
  "Customer Service",
]);

const normalizeStaffPermissions = (value) => ({
  can_view: value?.can_view ?? true,
  can_manage: value?.can_manage ?? false,
  can_approve: value?.can_approve ?? false,
});

const defaultStaffPermissions = () => ({
  can_view: true,
  can_manage: false,
  can_approve: false,
});

const normalizeWorkspaceCategory = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "siphoning" || normalized === "plumbing" || normalized === "both") {
    return normalized;
  }
  return "both";
};

const serviceTrackCatalog = {
  siphoning: {
    key: "siphoning",
    label: "Siphoning",
    description: "Septic, vacuum, desludging, and tank-service crew.",
  },
  plumbing: {
    key: "plumbing",
    label: "Plumbing",
    description: "Pipe repair, leak correction, and plumbing field work.",
  },
};

const roleTemplatesByTrack = {
  siphoning: [
    { label: "Siphoning Field Operator", value: "Siphoning Field Operator" },
    { label: "Siphoning Team Leader", value: "Siphoning Team Leader" },
    { label: "Siphoning Vacuum Truck Operator", value: "Siphoning Vacuum Truck Operator" },
    { label: "Siphoning Septic Technician", value: "Siphoning Septic Technician" },
  ],
  plumbing: [
    { label: "Plumbing Field Technician", value: "Plumbing Field Technician" },
    { label: "Plumbing Team Leader", value: "Plumbing Team Leader" },
    { label: "Plumbing Pipe Installer", value: "Plumbing Pipe Installer" },
    { label: "Plumbing Leak Repair Technician", value: "Plumbing Leak Repair Technician" },
  ],
};

const defaultEmployeeForm = () => ({
  givenName: "",
  middleName: "",
  lastName: "",
  email: "",
  serviceTrack: "",
  rolePreset: "",
  customRole: "",
  role: "",
  serviceProviderId: "",
  startDate: "",
  notes: "",
  password: "",
  staffPermissions: defaultStaffPermissions(),
});

const employeeForm = ref(defaultEmployeeForm());
const pageSize = ref(10);
const currentPage = ref(1);
const wizardStep = ref(1);
const showAddModal = ref(false);
const showPassword = ref(false);
const savingEmployee = ref(false);
const publishOnlyMode = ref(false);
const yearStart = ref("");
const yearEnd = ref("");
const workspaceContext = ref({
  business_id: null,
  business_name: "",
  category: "both",
  category_label: "Siphoning And Plumbing",
});

const workspaceCategoryLabel = computed(() => String(workspaceContext.value?.category_label || "").trim());

const serviceTrackOptions = computed(() => {
  const category = normalizeWorkspaceCategory(workspaceContext.value?.category);
  if (category === "siphoning") return [serviceTrackCatalog.siphoning];
  if (category === "plumbing") return [serviceTrackCatalog.plumbing];
  return [serviceTrackCatalog.siphoning, serviceTrackCatalog.plumbing];
});

const singleTrackHelperText = computed(() => {
  const onlyTrack = serviceTrackOptions.value[0];
  if (!onlyTrack) return "";
  return `Itong company ay naka-set sa ${onlyTrack.label} lang, so iyon lang ang puwedeng role group dito.`;
});

const serviceTrackRoleGroups = computed(() => {
  const track = String(employeeForm.value.serviceTrack || "").trim().toLowerCase();
  if (track === "siphoning") {
    return [{ label: "Siphoning Positions", options: roleTemplatesByTrack.siphoning }];
  }
  if (track === "plumbing") {
    return [{ label: "Plumbing Positions", options: roleTemplatesByTrack.plumbing }];
  }
  return [];
});

const roleSelectionHelperText = computed(() => {
  if (!employeeForm.value.serviceTrack) {
    return "Piliin muna ang service para lumabas ang tamang position list.";
  }

  return employeeForm.value.serviceTrack === "siphoning"
    ? "Siphoning positions lang ang lalabas para sa company service na ito."
    : "Plumbing positions lang ang lalabas para sa company service na ito.";
});

const resolvedEmployeeRole = computed(() => {
  if (publishOnlyMode.value) return String(employeeForm.value.role || "").trim();
  const preset = String(employeeForm.value.rolePreset || "").trim();
  return preset;
});

const serviceProviders = ref([]);

const employeeSearch = ref("");
const departmentFilter = ref("");
const pendingSearch = ref("");
const pendingDepartment = ref("");

const employees = ref([]);
const HR_EMPLOYEES_CACHE_KEY = "thesis_capstone_hr_employees_cache";
const ACCOUNT_NAME_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const ACCOUNT_MIDDLE_INITIAL_REGEX = /^[A-Za-z]$/;
const ACCOUNT_PASSWORD_POLICY_REGEX = {
  minLength: /^.{8,}$/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
};

const departmentOptions = [
  { value: "operational", label: "Operational management" },
  { value: "finance", label: "Finance" },
  { value: "csr", label: "CSR" },
  { value: "procurement", label: "Procurement" },
];

const userAccountForm = ref({
  email: "",
  password: "",
  department: "",
});

const trimString = (value) => String(value || "").trim();
const normalizeEmailCandidate = (value) => String(value || "").trim().toLowerCase();
const sanitizeAccountName = (value) => String(value || "").replace(/[^A-Za-z\\s]/g, "").replace(/\\s{2,}/g, " ").trimStart();
const sanitizeAccountMiddleInitial = (value) => String(value || "").replace(/[^A-Za-z]/g, "").slice(0, 1);
const DEPARTMENT_ACCOUNT_SUFFIX = "Department";

const buildDepartmentAccountDraft = (department, email) => {
  const label = String(department?.label || "Department").trim();
  const displayName = `${label} ${DEPARTMENT_ACCOUNT_SUFFIX}`.trim();
  return {
    name: displayName,
    first_name: label,
    given_name: label,
    middle_name: null,
    middle_initial: null,
    last_name: DEPARTMENT_ACCOUNT_SUFFIX,
    email: normalizeEmailCandidate(email),
  };
};

const userAccountFirstNameError = computed(() => {
  const value = trimString(userAccountForm.value.first_name);
  if (!value) return "";
  return ACCOUNT_NAME_REGEX.test(value) ? "" : "First name must contain letters only.";
});

const userAccountMiddleInitialError = computed(() => {
  const value = trimString(userAccountForm.value.middle_initial);
  if (!value) return "";
  return ACCOUNT_MIDDLE_INITIAL_REGEX.test(value) ? "" : "Middle initial must be a single letter.";
});

const userAccountLastNameError = computed(() => {
  const value = trimString(userAccountForm.value.last_name);
  if (!value) return "";
  return ACCOUNT_NAME_REGEX.test(value) ? "" : "Last name must contain letters only.";
});

const accountPasswordPolicy = computed(() => {
  const password = String(userAccountForm.value.password || "");
  return {
    minLength: ACCOUNT_PASSWORD_POLICY_REGEX.minLength.test(password),
    uppercase: ACCOUNT_PASSWORD_POLICY_REGEX.uppercase.test(password),
    lowercase: ACCOUNT_PASSWORD_POLICY_REGEX.lowercase.test(password),
    number: ACCOUNT_PASSWORD_POLICY_REGEX.number.test(password),
    special: ACCOUNT_PASSWORD_POLICY_REGEX.special.test(password),
  };
});

const accountPasswordStrengthScore = computed(() =>
  Object.values(accountPasswordPolicy.value).filter(Boolean).length
);
const accountPasswordStrengthLabel = computed(() => {
  if (!userAccountForm.value.password) return "";
  if (accountPasswordStrengthScore.value === 5) return "Strong";
  if (accountPasswordStrengthScore.value >= 3) return "Medium";
  return "Weak";
});
const accountPasswordStrengthPercent = computed(() => {
  if (!userAccountForm.value.password) return 0;
  return Math.max(20, (accountPasswordStrengthScore.value / 5) * 100);
});
const accountPasswordStrengthClass = computed(() => {
  if (accountPasswordStrengthLabel.value === "Strong") return "text-emerald-600";
  if (accountPasswordStrengthLabel.value === "Medium") return "text-amber-600";
  return "text-rose-600";
});
const accountPasswordStrengthBarClass = computed(() => {
  if (accountPasswordStrengthLabel.value === "Strong") return "bg-emerald-500";
  if (accountPasswordStrengthLabel.value === "Medium") return "bg-amber-500";
  return "bg-rose-500";
});
const userAccountPasswordError = computed(() => {
  if (!userAccountForm.value.password) return "";
  return accountPasswordStrengthScore.value === 5
    ? ""
    : "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
});

const readEmployeeCache = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HR_EMPLOYEES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEmployeeCache = (rows = []) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HR_EMPLOYEES_CACHE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {
    // Ignore cache write failures.
  }
};

const ACCOUNT_EMAIL_PROBE_MAX_AGE_MS = 2 * 60 * 1000;
const accountEmailProbeCache = new Map();

const readAccountEmailProbe = (email) => {
  const key = normalizeEmailCandidate(email);
  if (!key) return null;

  const cached = accountEmailProbeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > ACCOUNT_EMAIL_PROBE_MAX_AGE_MS) {
    accountEmailProbeCache.delete(key);
    return null;
  }

  return cached;
};

const writeAccountEmailProbe = (email, result) => {
  const key = normalizeEmailCandidate(email);
  if (!key) return;

  accountEmailProbeCache.set(key, {
    savedAt: Date.now(),
    ...result,
  });
};

const resolveEmployeeFullName = (employee) => {
  const direct = trimString(employee?.name || employee?.fullName);
  if (direct) return direct;
  return [
    employee?.given_name || employee?.first_name || "",
    employee?.middle_name || employee?.middle_initial || "",
    employee?.last_name || "",
  ].filter(Boolean).join(" ").replace(/\\s+/g, " ").trim() || "Employee";
};

const resolveEmployeeRole = (employee) => {
  const candidates = [
    employee?.role,
    employee?.position,
    employee?.job_title,
    employee?.designation,
    employee?.rolePreset,
    employee?.role_preset,
    employee?.staff_role,
    employee?.title,
  ].map((value) => trimString(value)).filter(Boolean);

  if (candidates.length) return candidates[0];

  const track = normalizeWorkspaceCategory(
    employee?.serviceTrack || employee?.service_track || employee?.category || employee?.workspace_category
  );
  if (track === "siphoning") return "Siphoning Field Operator";
  if (track === "plumbing") return "Plumbing Field Technician";
  return "";
};

const resolveEmployeeDepartment = (employee) =>
  trimString(employee?.team || employee?.department || employee?.service_team) || "Unassigned";

const filteredEmployees = computed(() => {
  return employees.value.filter((employee) => {
    const fullName = String(employee.fullName || "").toLowerCase();
    const role = String(employee.role || "").toLowerCase();
    const matchesSearch =
      fullName.includes(employeeSearch.value.toLowerCase()) ||
      role.includes(employeeSearch.value.toLowerCase());
    const matchesDepartment = departmentFilter.value
      ? employee.department === departmentFilter.value
      : true;
    return matchesSearch && matchesDepartment;
  });
});

const resolveApprovalStatus = (employee) => {
  const approval = String(employee?.approval_status || employee?.approvalStatus || "").trim().toLowerCase();
  if (approval === "approved" || approval === "pending" || approval === "rejected") {
    return approval;
  }

  const status = String(employee?.status || "").trim().toLowerCase();
  if (status === "pending approval") return "pending";
  if (status === "rejected") return "rejected";
  return "approved";
};

const resolveEmployeeStatus = (employee) => {
  const requestedStatus = trimString(employee?.requested_status || employee?.requestedStatus || employee?.employment_status);
  if (requestedStatus) {
    return requestedStatus;
  }

  const rawStatus = trimString(employee?.status);
  if (rawStatus) {
    const normalized = rawStatus.toLowerCase();
    if (normalized === "approved") return "Active";
    if (normalized === "pending") return "Pending Approval";
    return rawStatus;
  }

  const approvalStatus = resolveApprovalStatus(employee);
  if (approvalStatus === "approved") return "Active";
  if (approvalStatus === "pending") return "Pending Approval";
  if (approvalStatus === "rejected") return "Rejected";
  return "Not set";
};

const mapEmployeeRow = (employee) => ({
  id: employee.id,
  fullName: resolveEmployeeFullName(employee),
  role: resolveEmployeeRole(employee),
  serviceTrack: trimString(employee?.service_track || employee?.serviceTrack || employee?.workspace_category || employee?.category),
  department: resolveEmployeeDepartment(employee),
  serviceProviderName: employee.service_provider_name
    || (employee.service_provider_id ? `Provider #${employee.service_provider_id}` : "Unlinked"),
  status: resolveEmployeeStatus(employee),
  approvalStatus: resolveApprovalStatus(employee),
  requestedStatus: employee.requested_status || null,
  startDate: employee.start_date || employee.startDate || "TBD",
  notes: employee.notes,
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

const providerEmployeeLimit = (provider) => {
  const raw = Number(provider?.employee_limit ?? 3);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
};

const providerEmployeeCount = (provider) => {
  const raw = Number(provider?.employee_count ?? 0);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
};

const providerIsFull = (provider) => {
  const limit = providerEmployeeLimit(provider);
  const count = providerEmployeeCount(provider);
  return count >= limit;
};

const providerCapacityLabel = (provider) => {
  if (provider?.employee_count === undefined && provider?.employee_limit === undefined) return "";
  const limit = providerEmployeeLimit(provider);
  const count = providerEmployeeCount(provider);
  return `${count}/${limit}`;
};

const selectedServiceProvider = computed(() => {
  const selectedId = Number(employeeForm.value.serviceProviderId || 0);
  if (!selectedId) return null;
  return serviceProviders.value.find((provider) => Number(provider?.id) === selectedId) || null;
});

const selectedProviderCapacityLabel = computed(() => {
  if (!selectedServiceProvider.value) return "";
  const limit = providerEmployeeLimit(selectedServiceProvider.value);
  const count = providerEmployeeCount(selectedServiceProvider.value);
  return `${count}/${limit}`;
});

watch(
  () => employeeForm.value.serviceTrack,
  () => {
    if (publishOnlyMode.value) return;
    employeeForm.value.rolePreset = "";
    employeeForm.value.role = "";
  }
);

watch(
  [() => employeeForm.value.rolePreset, resolvedEmployeeRole, publishOnlyMode],
  () => {
    if (publishOnlyMode.value) return;
    employeeForm.value.role = resolvedEmployeeRole.value;
  }
);

watch(
  serviceTrackOptions,
  (tracks) => {
    if (publishOnlyMode.value) return;

    const validKeys = tracks.map((track) => track.key);
    if (tracks.length === 1) {
      employeeForm.value.serviceTrack = tracks[0].key;
      return;
    }

    if (!validKeys.includes(employeeForm.value.serviceTrack)) {
      employeeForm.value.serviceTrack = "";
    }
  },
  { immediate: true }
);

const selectedProviderIsFull = computed(() => {
  if (!selectedServiceProvider.value) return false;
  return providerIsFull(selectedServiceProvider.value);
});

const selectedProviderRemaining = computed(() => {
  if (!selectedServiceProvider.value) return null;
  const raw = Number(selectedServiceProvider.value?.employee_slots_remaining);
  if (Number.isFinite(raw)) return Math.max(raw, 0);
  const limit = providerEmployeeLimit(selectedServiceProvider.value);
  const count = providerEmployeeCount(selectedServiceProvider.value);
  return Math.max(limit - count, 0);
});

const providerOptionLabel = (provider) => {
  const base = providerDisplayName(provider) || `Provider #${provider?.id || ""}`;
  const category = String(provider?.category || "").trim();
  const label = category && !base.includes(category) ? `${base} (${category})` : base;
  const capacity = providerCapacityLabel(provider);
  if (!capacity) return label;
  return `${label} · ${capacity}${providerIsFull(provider) ? " full" : ""}`;
};

const applyFilters = () => {
  employeeSearch.value = pendingSearch.value;
  departmentFilter.value = pendingDepartment.value;
};

const invalidTypeMessage = (value) => {
  if (!value) return "";
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^a-zA-Z\s\d]/.test(value);
  if (hasNumber && hasSpecial) return "Numerical and special characters are not allowed.";
  if (hasNumber) return "Numerical characters are not allowed.";
  if (hasSpecial) return "Special characters are not allowed.";
  return "";
};

const givenNameError = computed(() => invalidTypeMessage(employeeForm.value.givenName));
const middleNameError = computed(() => invalidTypeMessage(employeeForm.value.middleName));
const lastNameError = computed(() => invalidTypeMessage(employeeForm.value.lastName));
const showEmailError = ref(false);
const checkingEmail = ref(false);
const emailAvailabilityMessage = ref("");
const emailAvailabilityStatus = ref("");
const emailChecked = ref(false);
const verifiedEmployeeEmail = ref("");
const availabilityMessageClass = (status) => {
  if (status === "success") return "text-emerald-600";
  if (status === "checking") return "text-slate-500";
  return "text-rose-600";
};
const emailError = computed(() => {
  if (!showEmailError.value) return "";
  const value = employeeForm.value.email || "";
  if (!value) return "Email is required.";
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return isValid ? "" : "Email must be valid.";
});
const passwordStrengthLabel = computed(() => {
  const value = employeeForm.value.password || "";
  if (!value) return "";
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^a-zA-Z0-9]/.test(value);
  if (value.length >= 8 && hasNumber && hasSpecial) return "Strong";
  if (value.length >= 6 && (hasNumber || hasSpecial)) return "Medium";
  return "Weak";
});

const passwordStrengthClass = computed(() => {
  if (passwordStrengthLabel.value === "Strong") return "text-emerald-600";
  if (passwordStrengthLabel.value === "Medium") return "text-amber-600";
  return "text-rose-600";
});
const passwordStrengthInputClass = computed(() => {
  if (passwordStrengthLabel.value === "Strong") return "border-emerald-500 ring-2 ring-emerald-200";
  if (passwordStrengthLabel.value === "Medium") return "border-amber-500 ring-2 ring-amber-200";
  if (passwordStrengthLabel.value === "Weak") return "border-rose-500 ring-2 ring-rose-200";
  return "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
});
const showPasswordRequirementError = ref(false);
const passwordRequirementMissingParts = computed(() => {
  const value = String(employeeForm.value.password || "");
  const missing = [];
  if (value.length < 8) missing.push("at least 8 characters");
  if (!/\d/.test(value)) missing.push("at least 1 number");
  if (!/[^a-zA-Z0-9]/.test(value)) missing.push("at least 1 special character");
  return missing;
});
const passwordRequirementError = computed(() => {
  if (!showPasswordRequirementError.value) return "";
  const value = String(employeeForm.value.password || "");
  if (!value) return "Password is required.";
  if (!passwordRequirementMissingParts.value.length) return "";
  return `Password must include ${passwordRequirementMissingParts.value.join(", ")}.`;
});
watch(
  () => employeeForm.value.email,
  () => {
    const normalizedEmail = normalizeEmailCandidate(employeeForm.value.email);
    if (
      normalizedEmail
      && normalizedEmail === verifiedEmployeeEmail.value
      && emailChecked.value
      && emailAvailabilityStatus.value === "success"
    ) {
      return;
    }
    emailAvailabilityMessage.value = "";
    emailAvailabilityStatus.value = "";
    emailChecked.value = false;
    if (normalizedEmail !== verifiedEmployeeEmail.value) {
      verifiedEmployeeEmail.value = "";
    }
  }
);
watch(
  () => userAccountForm.value.email,
  () => {
    if (userAccountEmailTimer) {
      window.clearTimeout(userAccountEmailTimer);
      userAccountEmailTimer = null;
    }
    accountEmailChecked.value = false;
    accountEmailStatus.value = "";
    accountEmailMessage.value = "";
    const normalizedEmail = normalizeEmailCandidate(userAccountForm.value.email);
    if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      return;
    }
    userAccountEmailTimer = window.setTimeout(() => {
      verifyAccountEmail({ silent: true });
    }, 120);
  }
);

const isDateValid = (value) => {
  if (!value) return false;
  return value >= yearStart.value && value <= yearEnd.value;
};

const publishStep1Disabled = computed(() => {
  return !!(
    (employeeForm.value.givenName && employeeForm.value.givenName.trim() !== "") ||
    (employeeForm.value.middleName && employeeForm.value.middleName.trim() !== "") ||
    (employeeForm.value.lastName && employeeForm.value.lastName.trim() !== "") ||
    (employeeForm.value.password && employeeForm.value.password.trim() !== "")
  );
});

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const syncTodayDateBounds = () => {
  const now = new Date();
  const dateString = formatLocalDate(now);
  yearStart.value = dateString;
  yearEnd.value = dateString;
  if (!employeeForm.value.startDate || employeeForm.value.startDate < dateString || employeeForm.value.startDate > dateString) {
    employeeForm.value.startDate = dateString;
  }
};

const applyWorkspaceTrackDefault = () => {
  if (publishOnlyMode.value) return;

  const tracks = serviceTrackOptions.value;
  if (tracks.length === 1) {
    employeeForm.value.serviceTrack = tracks[0].key;
    return;
  }

  const validKeys = tracks.map((track) => track.key);
  if (!validKeys.includes(employeeForm.value.serviceTrack)) {
    employeeForm.value.serviceTrack = "";
  }
};

const resetWizard = () => {
  wizardStep.value = 1;
  showPassword.value = false;
  showEmailError.value = false;
  showPasswordRequirementError.value = false;
  publishOnlyMode.value = false;
};

const openAddModal = () => {
  syncTodayDateBounds();
  resetWizard();
  employeeForm.value = defaultEmployeeForm();
  employeeForm.value.startDate = yearStart.value || "";
  publishOnlyMode.value = false;
  applyWorkspaceTrackDefault();
  showAddModal.value = true;
};

const openPublishModal = () => {
  syncTodayDateBounds();
  resetWizard();
  employeeForm.value = defaultEmployeeForm();
  employeeForm.value.startDate = yearStart.value || "";
  wizardStep.value = 2;
  publishOnlyMode.value = true;
  applyWorkspaceTrackDefault();
  showAddModal.value = true;
};

const closeAddModal = (force = false) => {
  if (savingEmployee.value && !force) return;
  showAddModal.value = false;
  showEmailError.value = false;
  showPasswordRequirementError.value = false;
  verifiedEmployeeEmail.value = "";
};

const proceedToWorkStepWithConfirmedEmail = async () => {
  wizardStep.value = 2;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Email is available",
    text: "You can now proceed to Step 2.",
    timer: 850,
    showConfirmButton: false,
  });
};

const goToWorkStep = async () => {
  if (checkingEmail.value) return;
  const issues = [];
  showPasswordRequirementError.value = true;
  if (!employeeForm.value.givenName) {
    issues.push("Given Name is required.");
  } else if (givenNameError.value) {
    issues.push(`Given Name: ${givenNameError.value}`);
  }

  if (employeeForm.value.middleName && middleNameError.value) {
    issues.push(`Middle Name: ${middleNameError.value}`);
  }

  if (!employeeForm.value.lastName) {
    issues.push("Last Name is required.");
  } else if (lastNameError.value) {
    issues.push(`Last Name: ${lastNameError.value}`);
  }
  showEmailError.value = true;
  if (!employeeForm.value.email || emailError.value) {
    issues.push(emailError.value || "Email is required.");
  }
  if (passwordRequirementError.value) {
    issues.push(passwordRequirementError.value);
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
  showPasswordRequirementError.value = false;

  const normalizedEmail = String(employeeForm.value.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  if (
    emailChecked.value
    && emailAvailabilityStatus.value === "success"
    && verifiedEmployeeEmail.value === normalizedEmail
  ) {
    await proceedToWorkStepWithConfirmedEmail();
    return;
  }

  checkingEmail.value = true;
  emailAvailabilityStatus.value = "checking";
  emailAvailabilityMessage.value = "Checking if this email already exists...";

  try {
      const res = await axios.post(
        "/check-email",
        { email: normalizedEmail },
        { skipGlobalLoading: true }
      );

    const exists = Boolean(res?.data?.exists);
    const verified = res?.data?.verified !== false;
    if (!verified) {
      const message = res?.data?.message || "Unable to verify email right now. Please try again.";
      emailAvailabilityMessage.value = message;
      emailAvailabilityStatus.value = "error";
      emailChecked.value = false;
      verifiedEmployeeEmail.value = "";
      showEmailError.value = true;
      Swal.fire("Email Check Failed", message, "error");
      return;
    }

    if (exists) {
      const message = res?.data?.message || "This email is already registered.";
      emailAvailabilityMessage.value = message;
      emailAvailabilityStatus.value = "error";
      emailChecked.value = false;
      verifiedEmployeeEmail.value = "";
      showEmailError.value = true;
      Swal.fire("Email Taken", message, "error");
      return;
    }

    emailAvailabilityMessage.value = "Email is available.";
    emailAvailabilityStatus.value = "success";
    emailChecked.value = true;
    verifiedEmployeeEmail.value = normalizedEmail;
    await proceedToWorkStepWithConfirmedEmail();
  } catch (error) {
    const message =
      error?.response?.data?.message
      || error?.response?.data?.error
      || "Unable to verify email right now.";
    emailAvailabilityMessage.value = message;
    emailAvailabilityStatus.value = "error";
    emailChecked.value = false;
    verifiedEmployeeEmail.value = "";
    Swal.fire("Email Check Failed", message, "error");
  } finally {
    checkingEmail.value = false;
  }
};

const goToPublishStep = () => {
  wizardStep.value = 2;
};

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize.value));
});
const pendingApprovalCount = computed(() =>
  employees.value.filter((employee) => employee.approvalStatus === "pending").length
);
const approvedEmployeeCount = computed(() =>
  employees.value.filter((employee) => employee.approvalStatus === "approved").length
);

const pagedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredEmployees.value.slice(start, start + pageSize.value);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
};

watch([employeeSearch, departmentFilter, employees], () => {
  currentPage.value = 1;
});

const fetchServiceProviders = async () => {
  try {
    const res = await axios.get("/hr/available-providers", { skipGlobalLoading: true });
    const rows = Array.isArray(res.data) ? res.data : [];
    serviceProviders.value = rows.sort((a, b) => providerOptionLabel(a).localeCompare(providerOptionLabel(b)));
  } catch (error) {
    serviceProviders.value = [];
    Swal.fire({
      icon: "error",
      title: "Load failed",
      text: "Unable to load service providers.",
    });
  }
};

const fetchWorkspaceContext = async () => {
  try {
    const res = await axios.get("/hr/workspace-context", { skipGlobalLoading: true });

    workspaceContext.value = {
      business_id: Number(res.data?.business_id || 0) || null,
      business_name: String(res.data?.business_name || "").trim(),
      category: normalizeWorkspaceCategory(res.data?.category),
      category_label: String(res.data?.category_label || "").trim() || "Siphoning And Plumbing",
    };
    applyWorkspaceTrackDefault();
  } catch (error) {
    workspaceContext.value = {
      business_id: null,
      business_name: "",
      category: "both",
      category_label: "Siphoning And Plumbing",
    };
    applyWorkspaceTrackDefault();
  }
};

const addEmployee = async () => {
  if (savingEmployee.value) return;
  const issues = [];
  const staffPermissions = normalizeStaffPermissions(employeeForm.value.staffPermissions);
  const selectedRole = String(employeeForm.value.role || "").trim();
  const selectedTrack = String(employeeForm.value.serviceTrack || "").trim().toLowerCase();
  showPasswordRequirementError.value = true;

  if (!publishOnlyMode.value) {
    if (!emailChecked.value || emailAvailabilityStatus.value === "error") {
      Swal.fire("Email Check Required", "Please click Next to verify the email first.", "warning");
      return;
    }
    const normalizedEmail = normalizeEmailCandidate(employeeForm.value.email);
    if (!normalizedEmail || verifiedEmployeeEmail.value !== normalizedEmail) {
      Swal.fire("Email Check Required", "Please verify the current email before creating the employee record.", "warning");
      return;
    }
  }

  if (!employeeForm.value.givenName) {
    issues.push("Given Name is required.");
  } else if (givenNameError.value) {
    issues.push(`Given Name: ${givenNameError.value}`);
  }
  if (employeeForm.value.middleName && middleNameError.value) {
    issues.push(`Middle Name: ${middleNameError.value}`);
  }
  if (!employeeForm.value.lastName) {
    issues.push("Last Name is required.");
  } else if (lastNameError.value) {
    issues.push(`Last Name: ${lastNameError.value}`);
  }

  showEmailError.value = true;
  if (!employeeForm.value.email || emailError.value) {
    issues.push(emailError.value || "Email is required.");
  }
  if (!publishOnlyMode.value && !selectedTrack) {
    issues.push("Service Track is required.");
  }
  if (!selectedRole) {
    issues.push("Role / Position is required.");
  }

  if (passwordRequirementError.value) {
    issues.push(passwordRequirementError.value);
  }

  if (!employeeForm.value.startDate) {
    issues.push("Start Date is required.");
  } else if (!isDateValid(employeeForm.value.startDate)) {
    issues.push("Start Date must be today.");
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
  showPasswordRequirementError.value = false;

  const fullName = [employeeForm.value.givenName, employeeForm.value.middleName, employeeForm.value.lastName]
    .filter(Boolean)
    .join(" ");

  savingEmployee.value = true;
  try {
    const res = await axios.post("/hr/employees", {
      name: fullName,
      email: employeeForm.value.email,
      given_name: employeeForm.value.givenName,
      middle_name: employeeForm.value.middleName || null,
      last_name: employeeForm.value.lastName,
      password: employeeForm.value.password,
      role: selectedRole,
      service_track: selectedTrack || null,
      workspace_category: selectedTrack || workspaceContext.value.category || null,
      service_provider_id: null,
      start_date: employeeForm.value.startDate || null,
      notes: employeeForm.value.notes || null,
      staff_permissions: staffPermissions,
    }, { skipGlobalLoading: true });

    const linkedProviderName = res.data.service_provider_name || "Employee-first flow";

    employees.value.unshift(mapEmployeeRow({
      ...res.data,
      service_provider_name: linkedProviderName,
      start_date: res.data.start_date || employeeForm.value.startDate || "TBD",
    }));
    writeEmployeeCache(employees.value);
  } catch (error) {
    const backendMessage = error?.response?.data?.message
      || error?.response?.data?.error
      || "Unable to save employee to the database.";
    if (String(backendMessage).toLowerCase().includes("already registered")) {
      emailAvailabilityMessage.value = "This email is already registered.";
      emailAvailabilityStatus.value = "error";
      emailChecked.value = false;
      verifiedEmployeeEmail.value = "";
      wizardStep.value = 1;
      showEmailError.value = true;
    }
    showProfessionalFeedbackToast(toast, 'error', 'Unable to create employee account', backendMessage, 3800);
    return;
  } finally {
    savingEmployee.value = false;
  }
  employeeForm.value = defaultEmployeeForm();
  employeeForm.value.startDate = yearStart.value || "";
  closeAddModal(true);

  showProfessionalFeedbackToast(
    toast,
    'success',
    'Employee account created',
    employees.value[0]?.approvalStatus === "pending"
      ? 'The record is waiting for HR approval.'
      : 'The record is active and approved.',
    3200,
  );
};

const confirmRemove = async (employeeId) => {
  const result = await Swal.fire({
    title: "Remove employee?",
    text: "This action will remove the employee from the list.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#0f172a",
    confirmButtonText: "Yes, remove",
  });

  if (!result.isConfirmed) return;

  const previousEmployees = [...employees.value];
  employees.value = employees.value.filter((employee) => employee.id !== employeeId);
  writeEmployeeCache(employees.value);

  try {
    await axios.delete(`/hr/employees/${employeeId}`, { skipGlobalLoading: true });
    Swal.fire({
      icon: "success",
      title: "Removed",
      text: "Employee was removed from the list.",
      timer: 900,
      showConfirmButton: false,
    });
  } catch {
    employees.value = previousEmployees;
    writeEmployeeCache(employees.value);
    Swal.fire({
      icon: "error",
      title: "Remove failed",
      text: "Unable to remove the employee.",
    });
  }
};

const toggleStatus = (employeeId) => {
  const target = employees.value.find((employee) => employee.id === employeeId);
  if (!target) return;
  if (target.approvalStatus !== "approved") {
    Swal.fire({
      icon: "warning",
      title: "Approval required",
      text: "HR approval is required before status updates.",
    });
    return;
  }
  const nextStatus = target.status === "Active" ? "On Leave" : "Active";

  axios
    .patch(`/hr/employees/${employeeId}`, { requested_status: nextStatus })
    .then(() => {
      employees.value = employees.value.map((employee) => {
        if (employee.id !== employeeId) return employee;
        return { ...employee, status: nextStatus, requestedStatus: nextStatus };
      });
      writeEmployeeCache(employees.value);
    })
    .catch(() => {
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: "Unable to update employee status.",
      });
    });
};

const statusBadgeClass = (status) => {
  if (status === "Active") return "bg-emerald-50 text-emerald-600";
  if (status === "Probation") return "bg-amber-50 text-amber-600";
  if (status === "Pending Approval") return "bg-amber-50 text-amber-700";
  if (status === "Rejected") return "bg-rose-50 text-rose-700";
  return "bg-rose-50 text-rose-600";
};

const approvalBadgeClass = (approvalStatus) => {
  if (approvalStatus === "approved") return "bg-emerald-50 text-emerald-600";
  if (approvalStatus === "pending") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
};

const approvalStatusLabel = (approvalStatus) => {
  if (approvalStatus === "approved") return "Approved";
  if (approvalStatus === "pending") return "Pending Approval";
  if (approvalStatus === "rejected") return "Rejected";
  return "Unknown";
};

const employeeServiceLabel = (role) => {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole.includes("siphon") && normalizedRole.includes("plumb")) {
    return "Siphoning / Plumbing";
  }
  if (normalizedRole.includes("plumb")) {
    return "Plumbing";
  }
  if (normalizedRole.includes("siphon")) {
    return "Siphoning";
  }

  return "Company-based";
};

const employeeInitials = (fullName) => {
  const value = String(fullName || "").trim();
  if (!value) return "EM";

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const exportHiringList = () => {
  try {
    const lines = [
      ["Full Name", "Role", "Team", "Service Provider", "Status", "Start Date", "Notes"],
      ...employees.value.map((employee) => [
        employee.fullName,
        employee.role,
        employee.department,
        employee.serviceProviderName || "Unlinked",
        employee.status,
        employee.startDate,
        employee.notes || "",
      ]),
    ];
    const csv = lines.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-list.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    Swal.fire({
      icon: "success",
      title: "Exported",
      text: "Employee list downloaded.",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Export failed",
      text: "Unable to download the hiring list.",
    });
  }
};

const publishOpenRole = () => {
  const selectedRole = String(employeeForm.value.role || "").trim();
  if (!selectedRole || !employeeForm.value.department) {
    Swal.fire({
      icon: "warning",
      title: "Missing details",
      text: "Please enter a role and select a team to publish.",
      confirmButtonColor: "#0f172a",
    });
    return;
  }
  if (!employeeForm.value.startDate) {
    Swal.fire({
      icon: "warning",
      title: "Missing start date",
      text: "Please select a start date to publish.",
      confirmButtonColor: "#0f172a",
    });
    return;
  }

  router.post(
    "/hr/recruitment/publish",
    {
      role: selectedRole,
      team: employeeForm.value.department,
      status: employeeForm.value.status,
      preferred_start_date: employeeForm.value.startDate || null,
      notes: employeeForm.value.notes || null,
    },
    {
      onStart: () => {
        let progressValue = 0;
        Swal.fire({
          title: "Publishing...",
          html:
            '<div style="font-size:12px;color:#64748b;">Please wait while we post the open role.</div>' +
            '<div style="height:8px;background:#e2e8f0;border-radius:999px;margin-top:12px;overflow:hidden;">' +
            '<div id="publish-progress-bar" style="height:8px;width:0%;background:#0f172a;border-radius:999px;"></div>' +
            "</div>" +
            '<div id="publish-progress-text" style="margin-top:8px;font-size:12px;color:#64748b;">0%</div>',
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (publishProgressTimer) {
          clearInterval(publishProgressTimer);
        }
        publishProgressTimer = setInterval(() => {
          progressValue = Math.min(progressValue + 8, 92);
          const container = Swal.getHtmlContainer();
          const bar = container?.querySelector("#publish-progress-bar");
          const text = container?.querySelector("#publish-progress-text");
          if (bar) bar.style.width = `${progressValue}%`;
          if (text) text.textContent = `${progressValue}%`;
        }, 200);
      },
      onSuccess: () => {
        if (publishProgressTimer) {
          clearInterval(publishProgressTimer);
          publishProgressTimer = null;
        }
        Swal.fire({
          icon: "success",
          title: "Published",
          text: "Open role posted and notification sent successfully.",
          timer: 1400,
          showConfirmButton: false,
        });
      },
      onError: () => {
        if (publishProgressTimer) {
          clearInterval(publishProgressTimer);
          publishProgressTimer = null;
        }
        Swal.fire({
          icon: "error",
          title: "Publish failed",
          text: "Unable to publish the open role.",
        });
      },
      onFinish: () => {
        if (publishProgressTimer) {
          clearInterval(publishProgressTimer);
          publishProgressTimer = null;
        }
      },
    }
  );
};

const fetchEmployees = async () => {
  loadingEmployees.value = true;
  const cachedRows = readEmployeeCache();
  if (cachedRows.length) {
    employees.value = cachedRows;
  }

  try {
    const res = await axios.get("/hr/employees", { skipGlobalLoading: true });
    const rows = Array.isArray(res.data) ? res.data.map(mapEmployeeRow) : [];
    employees.value = rows;
    writeEmployeeCache(rows);
  } catch (error) {
    if (!cachedRows.length) {
      employees.value = [];
      Swal.fire({
        icon: "error",
        title: "Load failed",
        text: "Unable to load employees.",
      });
    }
  } finally {
    loadingEmployees.value = false;
  }
};

const resetUserAccountForm = () => {
  userAccountForm.value = {
    email: "",
    password: "",
    department: "",
  };
  accountEmailChecked.value = false;
  accountEmailStatus.value = "";
  accountEmailMessage.value = "";
  showAccountPassword.value = false;
};

const verifyAccountEmail = async ({ silent = false } = {}) => {
  if (checkingAccountEmail.value) return;
  const normalizedEmail = normalizeEmailCandidate(userAccountForm.value.email);
  if (!normalizedEmail) {
    accountEmailStatus.value = "error";
    accountEmailMessage.value = "Email is required.";
    accountEmailChecked.value = false;
    return;
  }

  const cachedProbe = readAccountEmailProbe(normalizedEmail);
  if (cachedProbe) {
    accountEmailStatus.value = cachedProbe.status;
    accountEmailMessage.value = cachedProbe.message;
    accountEmailChecked.value = cachedProbe.status === "success";
    return;
  }

  checkingAccountEmail.value = true;
  accountEmailStatus.value = "checking";
  accountEmailMessage.value = "Checking if this email already exists...";

  try {
    const res = await axios.post("/check-email", { email: normalizedEmail }, { skipGlobalLoading: true, timeout: 2500 });
    if (Boolean(res?.data?.exists)) {
      accountEmailStatus.value = "error";
      accountEmailMessage.value = "This email is already registered.";
      accountEmailChecked.value = false;
      writeAccountEmailProbe(normalizedEmail, {
        status: "error",
        message: "This email is already registered.",
      });
      if (!silent) Swal.fire("Email Taken", "This email is already registered.", "error");
      return;
    }
    accountEmailStatus.value = "success";
    accountEmailMessage.value = "Email is available.";
    accountEmailChecked.value = true;
    writeAccountEmailProbe(normalizedEmail, {
      status: "success",
      message: "Email is available.",
    });
  } catch (error) {
    const message = error?.response?.data?.message || "Unable to verify email right now.";
    accountEmailStatus.value = "error";
    accountEmailMessage.value = message;
    accountEmailChecked.value = false;
    if (!silent) Swal.fire("Email Check Failed", message, "error");
  } finally {
    checkingAccountEmail.value = false;
  }
};

const createUserAccount = async () => {
  if (creatingUserAccount.value) return;

  const issues = [];
  if (!userAccountForm.value.email) issues.push("Email is required.");
  if (!userAccountForm.value.password) issues.push("Password is required.");
  if (userAccountPasswordError.value) issues.push(userAccountPasswordError.value);
  if (!userAccountForm.value.department) issues.push("Department is required.");

  if (issues.length) {
    Swal.fire("Please complete the form", issues.join("\n"), "warning");
    return;
  }

  if (!accountEmailChecked.value || accountEmailStatus.value === "error") {
    await verifyAccountEmail({ silent: false });
    if (!accountEmailChecked.value) return;
  }

  const department = departmentOptions.find((option) => option.value === userAccountForm.value.department);
  if (!department) {
    Swal.fire("Missing Department", "Please select a department.", "warning");
    return;
  }

  creatingUserAccount.value = true;
  try {
    const normalizedEmail = normalizeEmailCandidate(userAccountForm.value.email);
    const identity = buildDepartmentAccountDraft(department, normalizedEmail);
    const res = await axios.post("/hr/employees", {
      name: identity.name,
      email: normalizedEmail,
      password: userAccountForm.value.password,
      first_name: identity.first_name,
      given_name: identity.given_name,
      middle_name: identity.middle_name,
      middle_initial: identity.middle_initial,
      last_name: identity.last_name,
      role: department.value,
      team: department.label,
      requested_status: "Active",
      auto_approve: true,
      account_source: "hr_department_account",
    }, { skipGlobalLoading: true });

    const nextRow = mapEmployeeRow({
      ...(res?.data?.data || {}),
      name: res?.data?.data?.name || identity.name,
      first_name: res?.data?.data?.first_name || identity.first_name,
      given_name: res?.data?.data?.given_name || identity.given_name,
      last_name: res?.data?.data?.last_name || identity.last_name,
      role: res?.data?.data?.role || department.value,
      team: res?.data?.data?.team || department.label,
      email: normalizedEmail,
      approval_status: res?.data?.data?.approval_status || "approved",
      status: res?.data?.data?.status || "approved",
      is_approved: res?.data?.data?.is_approved ?? true,
      requested_status: res?.data?.data?.requested_status || "Active",
    });
    employees.value = [nextRow, ...employees.value.filter((row) => row.id !== nextRow.id)];
    writeEmployeeCache(employees.value);
    resetUserAccountForm();
    showCreateUserModal.value = false;
    Swal.fire("Account Created", res?.data?.message || "Department account created successfully.", "success");
    fetchEmployees().catch(() => {});
  } catch (error) {
    const message = error?.response?.data?.message || "Unable to create user account.";
    if (String(message).toLowerCase().includes("already registered")) {
      accountEmailStatus.value = "error";
      accountEmailMessage.value = "This email is already registered.";
      accountEmailChecked.value = false;
    }
    Swal.fire("Create Failed", message, "error");
  } finally {
    creatingUserAccount.value = false;
  }
};

onMounted(() => {
  fetchWorkspaceContext();
  fetchEmployees();
});
</script>
