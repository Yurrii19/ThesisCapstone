<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col bg-slate-50">
      <HrTopbar @logout="logout" />

      <div class="hr-content mx-auto w-full max-w-[1680px] space-y-6 p-6 max-md:p-4">
        <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
          <div class="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-6 py-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Workspace</p>
              <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">RBAC Checklist</h1>
              <p class="mt-2 text-sm text-slate-600">
                Configure staff permissions for employees added under this account.
              </p>
            </div>
            <span
              class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-sm"
              :class="canManageRbac ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'"
            >
              {{ canManageRbac ? 'Company account in HR workspace' : 'HR account' }}
            </span>
          </div>
          </div>

          <div class="p-6">
          <div v-if="!canManageRbac" class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">
              RBAC checklist is not available for this account.
            </p>
            <p class="mt-1 text-xs text-slate-600">
              This setting is only for company-managed workspaces that have employee records under the same business.
            </p>
          </div>

          <div v-else class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-700">RBAC Checklist</p>
                <p class="mt-1 text-base font-bold text-slate-900">Staff Permissions by Employee</p>
                <p class="mt-1 text-xs text-slate-600">
                  Shows employees currently under this HR workspace account.
                </p>
                <p class="mt-1 text-xs text-slate-600">
                  Default for new employees: View only (Manage/Approve disabled until enabled here).
                </p>
              </div>
            </div>

            <div v-if="employeeRows.length === 0" class="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              <p class="font-semibold text-slate-900">No employees found yet.</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">Create employee records first, then their permissions will appear here for RBAC setup.</p>
            </div>

            <div class="mt-5 grid gap-4">
              <div class="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                <div class="grid gap-4 xl:grid-cols-[0.72fr_1.28fr] xl:items-end">
                  <div>
                    <label class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Select Employee</label>
                    <p class="mt-2 text-sm font-semibold text-slate-900">Choose one employee to open the checklist.</p>
                    <p class="mt-1 text-xs leading-5 text-slate-500">Company-linked employees appear here for RBAC setup, including newly created pending records.</p>
                  </div>
                  <div>
                    <select
                      v-model="selectedEmployeeId"
                      class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-[0_6px_14px_rgba(15,23,42,0.05)] focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                      :disabled="loadingRbacMatrix || savingRbacMatrix || employeeRows.length === 0"
                    >
                      <option value="" disabled>Select employee...</option>
                      <option v-for="employee in employeeRows" :key="`rbac-select-${employee.id}`" :value="String(employee.id)">
                        {{ formatEmployeeOptionLabel(employee, { statusLabel: employeeRbacStatusLabel(employee) }) }}
                      </option>
                    </select>
                    <div class="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      Checklist changes apply only to the selected employee.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedEmployeeId" class="mt-5 space-y-5">
              <section class="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Delegated HR Access</p>
                      <p class="mt-1 text-lg font-extrabold text-slate-900">{{ selectedEmployeeName }}</p>
                      <p class="mt-1 text-sm text-slate-500">{{ selectedEmployeeEmail || 'No email on file' }}</p>
                      <p class="mt-2 text-xs font-medium text-slate-500">Control what this employee can view, edit, or approve inside the HR workspace.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                        {{ selectedEmployeeAccessLevel }}
                      </span>
                      <span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                        {{ selectedEmployeeStatusLabel }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Enabled Modules</p>
                      <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ selectedEmployeePermissionStats.enabled }}</p>
                    </div>
                    <div class="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 shadow-sm">
                      <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Edit Modules</p>
                      <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ selectedEmployeePermissionStats.editors }}</p>
                    </div>
                    <div class="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 shadow-sm">
                      <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">Approval Modules</p>
                      <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ selectedEmployeePermissionStats.approvers }}</p>
                    </div>
                  </div>
                </div>

                <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Permission Rules</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">View</span>
                    <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">Edit</span>
                    <span class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">Approve</span>
                  </div>
                  <div class="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                    <p><span class="font-semibold text-slate-900">Approve</span> includes Edit and View.</p>
                    <p><span class="font-semibold text-slate-900">Edit</span> includes View.</p>
                    <p><span class="font-semibold text-slate-900">Connected modules</span> keep required base access.</p>
                    <p><span class="font-semibold text-slate-900">Sensitive modules</span> should stay with trusted staff.</p>
                  </div>
                  <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Policy Note</p>
                    <p class="mt-1 text-sm leading-6 text-slate-600">Use Approve only for staff who should perform formal HR validation tasks.</p>
                  </div>
                </div>
              </section>

              <section class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Presets</p>
                    <p class="mt-1 text-sm text-slate-600">Apply a preset, then fine-tune module access below.</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(8,145,178,0.18)] transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="loadingRbacMatrix || savingRbacMatrix || !hasRbacMatrixChanged"
                    @click="saveRbacMatrixSettings"
                  >
                    {{ savingRbacMatrix ? 'Saving...' : 'Save RBAC Checklist' }}
                  </button>
                </div>

                <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <button
                    v-for="preset in rbacPresetOptions"
                    :key="`rbac-preset-inline-${preset.key}`"
                    type="button"
                    class="group min-h-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50/60 hover:shadow-sm"
                    :disabled="loadingRbacMatrix || savingRbacMatrix || !selectedEmployeeId"
                    @click="applyRbacPreset(preset.key)"
                  >
                    <p class="text-sm font-bold text-slate-900 transition group-hover:text-cyan-800">{{ preset.label }}</p>
                    <p class="mt-1 text-xs leading-5 text-slate-500">{{ preset.description }}</p>
                  </button>
                </div>
              </section>

              <div class="overflow-x-auto">
                <div class="min-w-[920px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Permission Matrix</p>
                      <p class="mt-1 text-sm text-slate-600">Checklist-based module access with clear approval hierarchy.</p>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                      <span class="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      Changes affect only the selected employee
                    </div>
                  </div>

                  <table class="w-full border-collapse text-sm">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="border-b border-slate-200 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Module</th>
                        <th class="border-b border-slate-200 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Purpose</th>
                        <th class="border-b border-slate-200 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Access Level</th>
                        <th class="border-b border-slate-200 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Can View</th>
                        <th class="border-b border-slate-200 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Can Edit</th>
                        <th class="border-b border-slate-200 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Can Approve</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      <tr
                        v-for="module in moduleCatalog"
                        :key="`rbac-inline-${module.key}`"
                        class="bg-white transition hover:bg-cyan-50/25"
                      >
                        <td class="px-5 py-4 align-top">
                          <div class="flex items-center gap-2">
                            <p class="font-semibold text-slate-900">{{ module.label }}</p>
                            <span
                              v-if="moduleDependencies[module.key]?.length"
                              class="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700"
                            >
                              Connected
                            </span>
                            <span
                              v-if="module.sensitivity === 'sensitive'"
                              class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700"
                            >
                              Sensitive
                            </span>
                          </div>
                          <p
                            v-if="moduleDependencies[module.key]?.length"
                            class="mt-1 text-xs font-medium text-cyan-700"
                          >
                            Requires {{ moduleDependencies[module.key].map((dependencyKey) => moduleLabelByKey(dependencyKey)).join(', ') }}
                          </p>
                        </td>
                        <td class="px-5 py-4 align-top text-sm leading-6 text-slate-600">
                          {{ module.hint }}
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span
                            class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                            :class="moduleAccessClass(employeeModulePermissions[selectedEmployeeKey][module.key])"
                          >
                            {{ moduleAccessLabel(employeeModulePermissions[selectedEmployeeKey][module.key]) }}
                          </span>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <input
                            v-model="employeeModulePermissions[selectedEmployeeKey][module.key].can_view"
                            type="checkbox"
                            class="h-5 w-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            :disabled="loadingRbacMatrix || savingRbacMatrix || !selectedEmployeeId"
                            @change="enforcePermissionRules(module.key, 'can_view')"
                          />
                        </td>
                        <td class="px-5 py-4 text-center">
                          <input
                            v-model="employeeModulePermissions[selectedEmployeeKey][module.key].can_manage"
                            type="checkbox"
                            class="h-5 w-5 rounded-md border-slate-300 text-amber-500 focus:ring-amber-400"
                            :disabled="loadingRbacMatrix || savingRbacMatrix || !selectedEmployeeId"
                            @change="enforcePermissionRules(module.key, 'can_manage')"
                          />
                        </td>
                        <td class="px-5 py-4 text-center">
                          <input
                            v-model="employeeModulePermissions[selectedEmployeeKey][module.key].can_approve"
                            type="checkbox"
                            class="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            :disabled="loadingRbacMatrix || savingRbacMatrix || !selectedEmployeeId"
                            @change="enforcePermissionRules(module.key, 'can_approve')"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section v-if="isHrRole" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">Operations Access</p>
              <h2 class="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Operational Managers</h2>
              <p class="mt-2 text-sm text-slate-600">
                Create accounts for operational managers who will handle dispatch, materials pickup, and job flow updates.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/20"
              @click="openOperationalModal"
            >
              Add Operational Manager
            </button>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">What They Can Do</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">Dispatch &amp; Materials</p>
              <p class="mt-1 text-xs text-slate-600">Assign teams and confirm materials pickup during job flow.</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Account Status</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">Auto-approved</p>
              <p class="mt-1 text-xs text-slate-600">Operational managers are approved upon creation.</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Security</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">Credentialed Access</p>
              <p class="mt-1 text-xs text-slate-600">Set a password for secure login.</p>
            </div>
          </div>

          <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Operational Managers</p>
                <p class="text-sm font-semibold text-slate-900">Current operational accounts</p>
              </div>
              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="loadingOperationalManagers"
                @click="fetchOperationalManagers"
              >
                {{ loadingOperationalManagers ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-[600px] w-full border-collapse text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="border-y border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                    <th class="border-y border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th class="border-y border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th class="border-y border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="manager in operationalManagers" :key="`op-${manager.id}`" class="bg-white">
                    <td class="border-y border-slate-200 px-4 py-3 font-semibold text-slate-900">
                      {{ manager.name }}
                    </td>
                    <td class="border-y border-slate-200 px-4 py-3 text-slate-600">
                      {{ manager.email || 'No email' }}
                    </td>
                    <td class="border-y border-slate-200 px-4 py-3">
                      <span
                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                        :class="manager.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                      >
                        {{ manager.is_approved ? 'Approved' : 'Pending' }}
                      </span>
                    </td>
                    <td class="border-y border-slate-200 px-4 py-3 text-slate-500">
                      {{ formatDate(manager.created_at) }}
                    </td>
                  </tr>
                  <tr v-if="!loadingOperationalManagers && operationalManagers.length === 0">
                    <td colspan="4" class="border-y border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      No operational managers yet.
                    </td>
                  </tr>
                  <tr v-if="loadingOperationalManagers">
                    <td colspan="4" class="border-y border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      Loading operational managers...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="showOperationalModal"
      @click.self="closeOperationalModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div class="bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 px-6 py-6 text-white">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-100">HR Action</p>
              <h3 class="mt-1 text-2xl font-extrabold">Add Operational Manager</h3>
              <p class="mt-1 text-sm text-indigo-100/95">Create a dedicated operations account for dispatch control.</p>
            </div>
            <div class="rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100/90">Live Preview</p>
              <p class="mt-1 truncate font-bold">{{ operationalNamePreview }}</p>
              <p class="truncate text-indigo-100/90">{{ operationalUser.email || 'email@example.com' }}</p>
              <p class="mt-1 text-indigo-100/90">Role: <span class="font-semibold text-white">Operational Manager</span></p>
            </div>
            <button
              type="button"
              @click="closeOperationalModal"
              :disabled="savingOperationalUser"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="submitOperationalUser" class="space-y-5 bg-gradient-to-b from-slate-50 to-white px-6 py-6">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Profile Information</p>
            <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-12">
              <div class="md:col-span-5">
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">First Name</label>
                <input
                  v-model.trim="operationalUser.first_name"
                  type="text"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>
              <div class="md:col-span-2">
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Middle</label>
                <input
                  v-model.trim="operationalUser.middle_initial"
                  type="text"
                  maxlength="1"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-center text-sm font-semibold uppercase text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <div class="md:col-span-5">
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Last Name</label>
                <input
                  v-model.trim="operationalUser.last_name"
                  type="text"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>
            </div>
            <div class="mt-4">
              <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Email</label>
              <input
                v-model.trim="operationalUser.email"
                type="email"
                class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                required
              />
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Security</p>
            <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Password</label>
                <div class="relative">
                  <input
                    v-model="operationalUser.password"
                    :type="showOperationalPassword ? 'text' : 'password'"
                    minlength="8"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-50 hover:text-indigo-900"
                    :aria-label="showOperationalPassword ? 'Hide password' : 'Show password'"
                    @click="showOperationalPassword = !showOperationalPassword"
                  >
                    <svg v-if="!showOperationalPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="operationalPasswordStrengthClass"
                    :style="{ width: operationalPasswordStrengthWidth }"
                  ></div>
                </div>
                <div class="mt-1 flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-600">Strength: {{ operationalPasswordStrengthLabel }}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">At least 8 characters</span>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Confirm Password</label>
                <div class="relative">
                  <input
                    v-model="operationalUser.password_confirmation"
                    :type="showOperationalPasswordConfirm ? 'text' : 'password'"
                    minlength="8"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-50 hover:text-indigo-900"
                    :aria-label="showOperationalPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'"
                    @click="showOperationalPasswordConfirm = !showOperationalPasswordConfirm"
                  >
                    <svg v-if="!showOperationalPasswordConfirm" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span :class="operationalPasswordMatchClass">{{ operationalPasswordMatchLabel }}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">Re-enter password</span>
                </div>
              </div>
            </div>
            <p class="mt-3 text-xs text-slate-500">
              Recommended: at least 8 characters with uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-indigo-50/70 px-4 py-3">
            <p class="text-xs text-slate-600">
              Selected access:
              <span class="font-bold text-slate-800">Operational Manager</span>
            </p>
          </div>

          <div class="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
            <div class="min-h-[20px] text-xs font-medium text-slate-500">
              <div v-if="savingOperationalUser" class="inline-flex items-center gap-2 text-indigo-700">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
                </svg>
                Creating operational manager account...
              </div>
            </div>
            <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="closeOperationalModal"
              :disabled="savingOperationalUser"
              class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!canSubmitOperational || savingOperationalUser"
              class="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg v-if="savingOperationalUser" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" class="opacity-20" stroke="currentColor" stroke-width="3"></circle>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
              </svg>
              {{ savingOperationalUser ? 'Creating Manager...' : 'Add Manager' }}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import axios from 'axios'
import { createToastInterface, POSITION } from 'vue-toastification'
import HrSidebarNav from '@/Components/HrSidebarNav.vue'
import HrTopbar from '@/Components/HrTopbar.vue'
import { confirmAndLogout } from '@/lib/auth-flow'
import { formatEmployeeOptionLabel, isSelectableRbacEmployeeRow } from '@/lib/employee-rbac'
import { getStoredProfileCache, upsertStoredProfileCache } from '@/lib/firebase-auth'
import { showProfessionalFeedbackToast } from '@/lib/professional-feedback-toast'

const page = usePage()
const activeMenu = ref('Settings')
const loadingRbacMatrix = ref(false)
const savingRbacMatrix = ref(false)
const moduleCatalog = [
  {
    key: 'service_providers',
    label: 'Provider Accreditation',
    hint: 'Review provider records and accreditation details.',
    sensitivity: 'standard',
  },
  {
    key: 'linked_employees',
    label: 'Team Assignment',
    hint: 'View and coordinate employee team placement.',
    sensitivity: 'standard',
  },
  {
    key: 'employee_management',
    label: 'Employee Management',
    hint: 'Create, update, and maintain employee records.',
    sensitivity: 'standard',
  },
  {
    key: 'approval_queue',
    label: 'Approval Queue',
    hint: 'Approve or reject employee records before Operations release.',
    sensitivity: 'sensitive',
  },
  {
    key: 'payroll',
    label: 'Payroll',
    hint: 'Access salary, payout, and compensation records.',
    sensitivity: 'sensitive',
  },
  {
    key: 'reports',
    label: 'Reports',
    hint: 'View workforce summaries and HR reporting outputs.',
    sensitivity: 'standard',
  },
]
const moduleDependencies = {
  linked_employees: ['employee_management'],
  approval_queue: ['employee_management'],
  payroll: ['employee_management'],
}
const moduleDefaultRow = {
  can_view: false,
  can_manage: false,
  can_approve: false,
}
const trimString = (value) => String(value || '').trim()
const normalizeBusinessType = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/[_/-]+/g, ' ')
  if (
    ['company', 'corporation', 'corporate'].includes(raw)
    || (raw.includes('hr') && raw.includes('managed') && raw.includes('company'))
    || (raw.includes('company') && raw.includes('managed'))
  ) return 'company'
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
const normalizeManagementMode = (value) => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '_')
const employeeRbacStatusKey = (row = {}) => String(row?.approval_status || row?.status || '').trim().toLowerCase()
const employeeRbacStatusLabel = (row = {}) => {
  const status = employeeRbacStatusKey(row)
  if (status === 'approved' || status === 'active') return 'Approved'
  if (status === 'pending' || status === 'created' || status === 'new' || status === 'draft') return 'Pending'
  if (status === 'rejected') return 'Rejected'
  if (status === 'archived' || status === 'inactive' || status === 'disabled') return 'Archived'
  if (!status) return ''
  return status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
const employeeRbacIsVisible = (row = {}) => !['rejected', 'archived', 'inactive', 'disabled', 'deleted'].includes(employeeRbacStatusKey(row))
const normalizeStaffPermissionRow = (value, fallback = null) => ({
  can_view: value?.can_view ?? fallback?.can_view ?? true,
  can_manage: value?.can_manage ?? fallback?.can_manage ?? false,
  can_approve: value?.can_approve ?? fallback?.can_approve ?? false,
})
const normalizeModuleMatrix = (modules, fallbackRow = null, fallbackModules = null) => {
  const normalized = {}
  moduleCatalog.forEach((module) => {
    const fallbackForModule = fallbackModules?.[module.key] || fallbackRow || moduleDefaultRow
    normalized[module.key] = normalizeStaffPermissionRow(modules?.[module.key], fallbackForModule)
  })
  return normalized
}
const resolveEmployeeModuleMatrix = (staffPermissions) => {
  const raw = staffPermissions || {}
  if (raw?.modules && typeof raw.modules === 'object') {
    return normalizeModuleMatrix(raw.modules)
  }
  const hasModuleKey = moduleCatalog.some((module) => Object.prototype.hasOwnProperty.call(raw, module.key))
  if (hasModuleKey) {
    return normalizeModuleMatrix(raw)
  }
  return normalizeModuleMatrix(null, moduleDefaultRow)
}
const workspaceEmployeeRoles = new Set(['employee', 'hr', 'finance', 'procurement', 'operational', 'operational_management', 'csr'])
const defaultCreatorRoleStaffMatrix = () => ({
  business_owner: normalizeStaffPermissionRow(null),
  hr_owner: normalizeStaffPermissionRow(null),
})
const creatorRoleStaffMatrix = ref(defaultCreatorRoleStaffMatrix())
const employeeRows = ref([])
const employeeModulePermissions = ref({})
const employeePermissionsSnapshot = ref('{}')
const selectedEmployeeId = ref('')
const toast = (typeof window !== 'undefined' && window.__appFeedbackToast)
  || createToastInterface({
    position: POSITION.TOP_RIGHT,
    timeout: 2200,
    closeButton: 'button',
    showCloseButtonOnHover: false,
  })
if (typeof window !== 'undefined' && !window.__appFeedbackToast) {
  window.__appFeedbackToast = toast
}

const authUser = reactive({ ...(page.props?.auth?.user || {}) })
const syncAuthUserFromPage = () => {
  Object.assign(authUser, page.props?.auth?.user || {})
}
syncAuthUserFromPage()

const businessContext = reactive({
  business_type: '',
  management_mode: '',
  workspace_type: '',
})
const businessContextLoading = ref(false)

const normalizedRole = computed(
  () => String(page.props?.auth?.user?.role || '').trim().toLowerCase().replace(/\s+/g, '_')
)
const workspaceBusinessType = computed(() => normalizeBusinessType(
  businessContext.business_type
  || authUser.business_type
  || authUser.business?.business_type
  || authUser.assigned_business?.business_type
))
const workspaceManagementMode = computed(() => normalizeManagementMode(
  businessContext.management_mode
  || authUser.management_mode
  || authUser.business?.management_mode
  || authUser.assigned_business?.management_mode
))
const workspaceType = computed(() => normalizeManagementMode(
  businessContext.workspace_type
  || authUser.workspace_type
))
const isHrRole = computed(() => normalizedRole.value === 'hr')
const canManageRbac = computed(() => (
  workspaceBusinessType.value === 'company'
  || workspaceManagementMode.value === 'hr'
  || isHrRole.value
))
const authUserId = computed(() => Number(page.props?.auth?.user?.id || 0))
let realtimeChannel = null
const selectedEmployeeKey = computed(() => String(selectedEmployeeId.value || ''))
const selectedEmployeeName = computed(() => {
  const match = employeeRows.value.find((row) => String(row.id) === selectedEmployeeKey.value)
  return match?.name || 'Select employee'
})
const selectedEmployeeEmail = computed(() => {
  const match = employeeRows.value.find((row) => String(row.id) === selectedEmployeeKey.value)
  return match?.email || ''
})
const selectedEmployeeStatusLabel = computed(() => {
  const match = employeeRows.value.find((row) => String(row.id) === selectedEmployeeKey.value)
  return employeeRbacStatusLabel(match) || 'Unknown'
})
const selectedEmployeeModules = computed(() => employeeModulePermissions.value?.[selectedEmployeeKey.value] || {})
const selectedEmployeePermissionStats = computed(() => {
  const modules = selectedEmployeeModules.value
  let enabled = 0
  let editors = 0
  let approvers = 0

  moduleCatalog.forEach((module) => {
    const row = modules?.[module.key]
    if (!row) return
    if (row.can_view || row.can_manage || row.can_approve) enabled += 1
    if (row.can_manage || row.can_approve) editors += 1
    if (row.can_approve) approvers += 1
  })

  return {
    enabled,
    editors,
    approvers,
  }
})
const selectedEmployeeAccessLevel = computed(() => {
  const { approvers, editors, enabled } = selectedEmployeePermissionStats.value
  if (approvers > 0) return 'Approver'
  if (editors > 0) return 'Editor'
  if (enabled > 0) return 'Viewer'
  return 'No Access'
})
const rbacPresetOptions = [
  {
    key: 'viewer',
    label: 'Viewer',
    description: 'View-only access for selected modules.',
  },
  {
    key: 'recruitment_staff',
    label: 'Recruitment Staff',
    description: 'Employee records and reports, no approvals.',
  },
  {
    key: 'payroll_staff',
    label: 'Payroll Staff',
    description: 'Payroll-focused access with report visibility.',
  },
  {
    key: 'hr_manager',
    label: 'HR Manager',
    description: 'Full access including approvals.',
  },
]

const showOperationalModal = ref(false)
const savingOperationalUser = ref(false)
const showOperationalPassword = ref(false)
const showOperationalPasswordConfirm = ref(false)
const operationalUser = ref({
  first_name: '',
  middle_initial: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const operationalNamePreview = computed(() => {
  return [
    operationalUser.value.first_name || '',
    operationalUser.value.middle_initial ? `${operationalUser.value.middle_initial}.` : '',
    operationalUser.value.last_name || '',
  ].join(' ').replace(/\s+/g, ' ').trim() || 'No name yet'
})

const operationalPasswordScore = computed(() => {
  const value = operationalUser.value.password || ''
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
})

const operationalPasswordStrengthWidth = computed(() => `${operationalPasswordScore.value * 25}%`)

const operationalPasswordStrengthClass = computed(() => {
  if (operationalPasswordScore.value <= 1) return 'bg-rose-500'
  if (operationalPasswordScore.value === 2) return 'bg-amber-500'
  if (operationalPasswordScore.value === 3) return 'bg-cyan-500'
  return 'bg-emerald-500'
})

const operationalPasswordStrengthLabel = computed(() => {
  if (!operationalUser.value.password) return 'Empty'
  if (operationalPasswordScore.value <= 1) return 'Weak'
  if (operationalPasswordScore.value === 2) return 'Fair'
  if (operationalPasswordScore.value === 3) return 'Good'
  return 'Strong'
})

const operationalPasswordMatchLabel = computed(() => {
  if (!operationalUser.value.password_confirmation) return 'Waiting for confirmation'
  return operationalUser.value.password === operationalUser.value.password_confirmation
    ? 'Passwords match'
    : 'Passwords do not match'
})

const operationalPasswordMatchClass = computed(() => {
  if (!operationalUser.value.password_confirmation) return 'font-semibold text-slate-500'
  return operationalUser.value.password === operationalUser.value.password_confirmation
    ? 'font-semibold text-emerald-700'
    : 'font-semibold text-rose-600'
})

const canSubmitOperational = computed(() => {
  return Boolean(
    operationalUser.value.first_name &&
    operationalUser.value.last_name &&
    operationalUser.value.email &&
    operationalUser.value.password &&
    operationalUser.value.password_confirmation &&
    operationalUser.value.password === operationalUser.value.password_confirmation &&
    operationalUser.value.password.length >= 8
  )
})

const operationalManagers = ref([])
const loadingOperationalManagers = ref(false)

const hasRbacMatrixChanged = computed(
  () => JSON.stringify(employeeModulePermissions.value) !== employeePermissionsSnapshot.value
)

const resetOperationalUser = () => {
  operationalUser.value = {
    first_name: '',
    middle_initial: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  }
}

const openOperationalModal = () => {
  resetOperationalUser()
  showOperationalModal.value = true
}

const closeOperationalModal = (force = false) => {
  if (savingOperationalUser.value && !force) return
  showOperationalModal.value = false
  savingOperationalUser.value = false
  showOperationalPassword.value = false
  showOperationalPasswordConfirm.value = false
  resetOperationalUser()
}

const ensureEmployeeModuleRow = (employeeKey, moduleKey) => {
  if (!employeeKey || !moduleKey) return null

  if (!employeeModulePermissions.value[employeeKey]) {
    employeeModulePermissions.value[employeeKey] = normalizeModuleMatrix(null, moduleDefaultRow)
  }

  if (!employeeModulePermissions.value[employeeKey][moduleKey]) {
    employeeModulePermissions.value[employeeKey][moduleKey] = normalizeStaffPermissionRow(null, moduleDefaultRow)
  }

  return employeeModulePermissions.value[employeeKey][moduleKey]
}

const moduleLabelByKey = (moduleKey) => {
  const match = moduleCatalog.find((module) => module.key === moduleKey)
  return match?.label || moduleKey
}

const moduleHasAnyPermission = (row) => Boolean(row?.can_view || row?.can_manage || row?.can_approve)

const clearModulePermissions = (row) => {
  if (!row) return
  row.can_view = false
  row.can_manage = false
  row.can_approve = false
}

const applyModuleDependencyRules = (employeeKey, changedModuleKey) => {
  const modules = employeeModulePermissions.value[employeeKey]
  if (!modules) return

  const changedRow = ensureEmployeeModuleRow(employeeKey, changedModuleKey)
  const requiredDependencies = moduleDependencies[changedModuleKey] || []

  if (moduleHasAnyPermission(changedRow) && requiredDependencies.length) {
    requiredDependencies.forEach((dependencyKey) => {
      const dependencyRow = ensureEmployeeModuleRow(employeeKey, dependencyKey)
      if (dependencyRow) {
        dependencyRow.can_view = true
      }
    })
  }

  Object.entries(moduleDependencies).forEach(([moduleKey, dependencies]) => {
    if (!dependencies.includes(changedModuleKey)) return

    const dependentRow = ensureEmployeeModuleRow(employeeKey, moduleKey)
    const hasAllDependencies = dependencies.every((dependencyKey) => {
      const dependencyRow = ensureEmployeeModuleRow(employeeKey, dependencyKey)
      return Boolean(dependencyRow?.can_view)
    })

    if (!hasAllDependencies && moduleHasAnyPermission(dependentRow)) {
      clearModulePermissions(dependentRow)
    }
  })
}

const moduleAccessLabel = (row) => {
  if (row?.can_approve) return 'Approver'
  if (row?.can_manage) return 'Editor'
  if (row?.can_view) return 'Viewer'
  return 'Hidden'
}

const moduleAccessClass = (row) => {
  if (row?.can_approve) return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (row?.can_manage) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (row?.can_view) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-slate-200 bg-slate-100 text-slate-500'
}

const enforcePermissionRules = (moduleKey, field) => {
  const employeeKey = selectedEmployeeKey.value
  if (!employeeKey || !moduleKey) return
  const row = ensureEmployeeModuleRow(employeeKey, moduleKey)
  if (!row) return

  if (field === 'can_view' && row.can_view === false) {
    row.can_manage = false
    row.can_approve = false
  }

  if (field === 'can_manage' && row.can_manage === true) {
    row.can_view = true
  }

  if (field === 'can_manage' && row.can_manage === false) {
    row.can_approve = false
  }

  if (field === 'can_approve' && row.can_approve === true) {
    row.can_manage = true
    row.can_view = true
  }

  if (field === 'can_approve' && row.can_approve === false && row.can_manage === false) {
    row.can_view = row.can_view
  }

  applyModuleDependencyRules(employeeKey, moduleKey)
}

const applyRbacPreset = (presetKey) => {
  const employeeKey = selectedEmployeeKey.value
  if (!employeeKey) return

  const modules = normalizeModuleMatrix(null, moduleDefaultRow)

  const setViewOnly = (key) => {
    modules[key].can_view = true
    modules[key].can_manage = false
    modules[key].can_approve = false
  }
  const setEditor = (key) => {
    modules[key].can_view = true
    modules[key].can_manage = true
    modules[key].can_approve = false
  }
  const setApprover = (key) => {
    modules[key].can_view = true
    modules[key].can_manage = true
    modules[key].can_approve = true
  }

  if (presetKey === 'viewer') {
    moduleCatalog.forEach((module) => setViewOnly(module.key))
  }

  if (presetKey === 'recruitment_staff') {
    setEditor('employee_management')
    setViewOnly('linked_employees')
    setViewOnly('approval_queue')
    setViewOnly('reports')
  }

  if (presetKey === 'payroll_staff') {
    setEditor('payroll')
    setViewOnly('reports')
    setViewOnly('employee_management')
  }

  if (presetKey === 'hr_manager') {
    moduleCatalog.forEach((module) => setApprover(module.key))
  }

  employeeModulePermissions.value[employeeKey] = modules

  Object.keys(moduleDependencies).forEach((moduleKey) => {
    applyModuleDependencyRules(employeeKey, moduleKey)
  })
}

const submitOperationalUser = async () => {
  if (savingOperationalUser.value) return
  if (!canSubmitOperational.value) {
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Operational manager setup incomplete',
      'Complete all required fields and make sure the passwords match.',
      3400,
    )
    return
  }

  savingOperationalUser.value = true
  try {
    await axios.post('/hr/operational-management-users', operationalUser.value, { skipGlobalLoading: true })
    showProfessionalFeedbackToast(
      toast,
      'success',
      'Operational manager account created',
      'The new manager can now access the HR operations workspace.',
      3200,
    )
    closeOperationalModal(true)
    fetchOperationalManagers()
  } catch (error) {
    const message = error?.response?.data?.message
      || error?.response?.data?.error
      || (error?.response?.data?.errors ? Object.values(error.response.data.errors)[0][0] : null)
      || 'Failed to create operational manager account.'
    showProfessionalFeedbackToast(toast, 'error', 'Unable to create operational manager', message, 3800)
  } finally {
    savingOperationalUser.value = false
  }
}

const fetchOperationalManagers = async () => {
  if (!isHrRole.value) return
  loadingOperationalManagers.value = true
  try {
    const res = await axios.get('/hr/operational-management-users')
    operationalManagers.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Unable to load operational managers',
      error?.response?.data?.message || 'Please refresh and try again.',
      3400,
    )
  } finally {
    loadingOperationalManagers.value = false
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const applyCreatorRoleStaffMatrix = (matrix) => {
  creatorRoleStaffMatrix.value = {
    business_owner: normalizeStaffPermissionRow(matrix?.business_owner),
    hr_owner: normalizeStaffPermissionRow(matrix?.hr_owner),
  }
}

const resolveRbacEmployeeName = (row = {}) => {
  const directName = trimString(row?.name || row?.fullName)
  if (directName) return directName

  return [
    row?.first_name || row?.given_name || '',
    row?.middle_initial || row?.middle_name || '',
    row?.last_name || '',
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || `Employee #${row?.id || row?.uid || '0'}`
}

const resolveRbacEmployeeRole = (row = {}) => trimString(
  row?.role
  || row?.staff_role
  || row?.position
  || row?.job_title
  || row?.designation
  || ''
)

const resolveRbacEmployeeWorkspaceType = (row = {}) => trimString(
  row?.workspace_type
  || row?.workspaceType
  || row?.account_source
  || ''
).toLowerCase()

const resolveRbacEmployeeCompanyName = (row = {}) => trimString(
  row?.company_name
  || row?.business_name
  || row?.assigned_business?.business_name
  || row?.business?.business_name
  || ''
)

const resolveRbacWorkspaceBusinessIds = () => [
  businessContext.business_id,
  authUser.business_id,
  authUser.business?.id,
  authUser.assigned_business?.id,
  authUser.business?.business_id,
].map(trimString).filter(Boolean)

const resolveRbacWorkspaceCompanyNames = () => [
  authUser.company_name,
  authUser.business_name,
  authUser.business?.business_name,
  authUser.assigned_business?.business_name,
].map((value) => trimString(value).toLowerCase()).filter(Boolean)

const isWorkspaceEmployeeProfile = (row = {}) => {
  const role = resolveRbacEmployeeRole(row).toLowerCase()
  const workspaceType = resolveRbacEmployeeWorkspaceType(row)
  return workspaceEmployeeRoles.has(role)
    || workspaceType === 'company_staff'
    || workspaceType === 'hr_managed_company'
    || workspaceType === 'hr_created'
}

const profileMatchesRbacWorkspace = (row = {}) => {
  const scopeIds = new Set(resolveRbacWorkspaceBusinessIds())
  const scopeNames = new Set(resolveRbacWorkspaceCompanyNames())

  const rowIds = [
    row?.business_id,
    row?.business?.id,
    row?.assigned_business?.id,
    row?.created_by_business_id,
  ].map(trimString).filter(Boolean)
  if (scopeIds.size && rowIds.some((id) => scopeIds.has(id))) {
    return true
  }

  const rowNames = [
    resolveRbacEmployeeCompanyName(row),
    row?.business?.business_name,
    row?.assigned_business?.business_name,
  ].map((value) => trimString(value).toLowerCase()).filter(Boolean)
  if (scopeNames.size && rowNames.some((name) => scopeNames.has(name))) {
    return true
  }

  if (!scopeIds.size && !scopeNames.size) {
    return true
  }

  const createdBy = trimString(row?.created_by || row?.created_by_uid || '')
  const currentUserId = trimString(page.props?.auth?.user?.uid || page.props?.auth?.user?.id || '')
  if (createdBy && currentUserId && createdBy === currentUserId) {
    return true
  }

  return false
}

const normalizeRbacEmployeeId = (row = {}) => trimString(row?.id || row?.uid || row?.user_id || '')

const normalizeRbacEmployeeRow = (row = {}) => {
  const employeeId = normalizeRbacEmployeeId(row)
  return {
    id: employeeId,
    uid: trimString(row?.uid || row?.id || employeeId || ''),
    name: resolveRbacEmployeeName(row),
    email: trimString(row?.email || ''),
    role: resolveRbacEmployeeRole(row),
    business_id: row?.business_id || row?.business?.id || row?.assigned_business?.id || null,
    business: row?.business || null,
    assigned_business: row?.assigned_business || null,
    company_name: resolveRbacEmployeeCompanyName(row),
    workspace_type: trimString(row?.workspace_type || 'company_staff'),
    account_source: trimString(row?.account_source || 'hr_created'),
    staff_permissions: row?.staff_permissions || null,
    approval_status: trimString(row?.approval_status || row?.status || ''),
    status: trimString(row?.status || row?.approval_status || ''),
    created_at: trimString(row?.created_at || row?.updated_at || ''),
    updated_at: trimString(row?.updated_at || row?.created_at || ''),
  }
}

const syncRbacEmployeeCache = (rows = []) => {
  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row?.id) return
    upsertStoredProfileCache({
      ...row,
      id: String(row.id),
      uid: String(row.uid || row.id),
      role: row.role || 'employee',
      workspace_type: row.workspace_type || 'company_staff',
      account_source: row.account_source || 'hr_created',
    })
  })
}

const readCachedRbacEmployees = () => getStoredProfileCache()
  .filter((row) => isWorkspaceEmployeeProfile(row) && profileMatchesRbacWorkspace(row) && isSelectableRbacEmployeeRow(row))
  .map((row) => normalizeRbacEmployeeRow(row))
  .filter((row) => row.id && row.name)

const seedEmployeeRowsFromCache = () => {
  const cachedRows = readCachedRbacEmployees()
  if (cachedRows.length > 0) {
    applyEmployeeRows(cachedRows)
  }
}

const applyEmployeeRows = (rows) => {
  const normalizedRows = []
  const normalizedPermissions = {}

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const employeeId = normalizeRbacEmployeeId(row)
    if (!employeeId) return

    const normalizedRow = normalizeRbacEmployeeRow(row)
    if (!isSelectableRbacEmployeeRow(normalizedRow)) return
    normalizedRows.push(normalizedRow)
    normalizedPermissions[String(employeeId)] = resolveEmployeeModuleMatrix(normalizedRow.staff_permissions)
  })

  normalizedRows.sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime()
    const rightTime = new Date(right.created_at || 0).getTime()
    if (rightTime !== leftTime) return rightTime - leftTime
    return left.name.localeCompare(right.name)
  })

  syncRbacEmployeeCache(normalizedRows)
  employeeRows.value = normalizedRows
  employeeModulePermissions.value = normalizedPermissions
  employeePermissionsSnapshot.value = JSON.stringify(normalizedPermissions)

  const hasSelected = normalizedRows.some((row) => String(row.id) === String(selectedEmployeeId.value))
  if (!hasSelected) {
    selectedEmployeeId.value = normalizedRows.length > 0 ? String(normalizedRows[0].id) : ''
  }
}

const fetchWorkspaceEmployeesForRbac = async () => {
  try {
    const res = await axios.get('/hr/employees', {
      params: { _ts: Date.now() },
      skipGlobalLoading: true,
    })
    const rows = (Array.isArray(res.data) ? res.data : [])
      .filter((row) => employeeRbacIsVisible(row))
      .filter((row) => isSelectableRbacEmployeeRow(row))
      .map((row) => normalizeRbacEmployeeRow(row))
      .filter((row) => row.id && row.name)

    if (rows.length > 0) {
      applyEmployeeRows(rows)
      return true
    }
  } catch (error) {
    // Keep the RBAC page usable even if the employee-list fallback fails.
  }

  const cachedRows = readCachedRbacEmployees()
  if (cachedRows.length > 0) {
    applyEmployeeRows(cachedRows)
    return true
  }

  return false
}

const fetchBusinessContext = async () => {
  businessContextLoading.value = true
  try {
    const res = await axios.get('/business/context', { skipGlobalLoading: true })
    businessContext.business_type = trimString(
      res.data?.business_type
      || authUser.business_type
      || authUser.assigned_business?.business_type
      || ''
    )
    businessContext.management_mode = normalizeManagementMode(
      res.data?.management_mode
      || authUser.management_mode
      || authUser.assigned_business?.management_mode
      || ''
    )
    businessContext.workspace_type = normalizeManagementMode(
      authUser.workspace_type
      || res.data?.workspace_type
      || ''
    )
    return true
  } catch (error) {
    businessContext.business_type = trimString(authUser.business_type || authUser.assigned_business?.business_type || '')
    businessContext.management_mode = normalizeManagementMode(authUser.management_mode || authUser.assigned_business?.management_mode || '')
    businessContext.workspace_type = normalizeManagementMode(authUser.workspace_type || '')
    return false
  } finally {
    businessContextLoading.value = false
  }
}

const fetchRbacMatrixSettings = async () => {
  if (!canManageRbac.value) return

  loadingRbacMatrix.value = true
  const workspaceEmployeesPromise = fetchWorkspaceEmployeesForRbac()
  try {
    const res = await axios.get('/business/settings/rbac-matrix', { skipGlobalLoading: true })
    applyCreatorRoleStaffMatrix(res.data?.creator_role_staff_matrix || {})
    const liveRows = Array.isArray(res.data?.employee_rows) ? res.data.employee_rows : []
    if (liveRows.length > 0) {
      applyEmployeeRows(liveRows)
    } else {
      await workspaceEmployeesPromise
    }
  } catch (error) {
    const hadRowsBeforeFallback = employeeRows.value.length > 0
    const recoveredFromFallback = await workspaceEmployeesPromise
    if (recoveredFromFallback || hadRowsBeforeFallback) {
      return
    }
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Unable to load RBAC checklist settings',
      error?.response?.data?.message || 'Please refresh and try again.',
      3400,
    )
  } finally {
    loadingRbacMatrix.value = false
  }
}

const saveRbacMatrixSettings = async () => {
  if (!canManageRbac.value || savingRbacMatrix.value || !hasRbacMatrixChanged.value) return

  savingRbacMatrix.value = true
  try {
    const normalizedEmployeePermissions = {}
    Object.entries(employeeModulePermissions.value || {}).forEach(([employeeId, modules]) => {
      normalizedEmployeePermissions[String(employeeId)] = {
        modules: normalizeModuleMatrix(modules),
      }
    })

    const payload = {
      creator_role_staff_matrix: {
        business_owner: normalizeStaffPermissionRow(creatorRoleStaffMatrix.value.business_owner),
        hr_owner: normalizeStaffPermissionRow(creatorRoleStaffMatrix.value.hr_owner),
      },
      employee_permissions: normalizedEmployeePermissions,
    }

    const res = await axios.post('/business/settings/rbac-matrix', payload)
    applyCreatorRoleStaffMatrix(res.data?.creator_role_staff_matrix || payload.creator_role_staff_matrix)
    const fallbackRows = employeeRows.value.map((employee) => ({
      ...employee,
      staff_permissions: normalizedEmployeePermissions[String(employee.id)] || { modules: normalizeModuleMatrix(null) },
    }))
    applyEmployeeRows(res.data?.employee_rows || fallbackRows)
    showProfessionalFeedbackToast(
      toast,
      'success',
      'RBAC checklist updated',
      res.data?.message || 'The permission defaults have been saved successfully.',
      3200,
    )
  } catch (error) {
    showProfessionalFeedbackToast(
      toast,
      'error',
      'Unable to save RBAC checklist settings',
      error?.response?.data?.message || 'Please review the changes and try again.',
      3600,
    )
  } finally {
    savingRbacMatrix.value = false
  }
}

seedEmployeeRowsFromCache()
watch(
  canManageRbac,
  (allowed) => {
    if (!allowed) return
    void fetchRbacMatrixSettings()
  },
  { immediate: true },
)


const startRealtime = () => {
  if (!canManageRbac.value) return
  if (!window.Echo || authUserId.value <= 0 || realtimeChannel) return

  realtimeChannel = window.Echo.private(`users.${authUserId.value}`)
  realtimeChannel.listen('.business.rbac.updated', (payload) => {
    const creatorMatrix = payload?.creator_role_staff_matrix
    const employeeRowsPayload = payload?.employee_rows

    if (creatorMatrix && Array.isArray(employeeRowsPayload)) {
      applyCreatorRoleStaffMatrix(creatorMatrix)
      applyEmployeeRows(employeeRowsPayload)
      return
    }

    fetchRbacMatrixSettings()
  })
}

const stopRealtime = () => {
  if (!window.Echo || authUserId.value <= 0 || !realtimeChannel) return
  window.Echo.leave(`users.${authUserId.value}`)
  realtimeChannel = null
}

function navigateTo(menu, url) {
  activeMenu.value = menu
  router.visit(url)
}

onMounted(() => {
  fetchBusinessContext()
  startRealtime()
  fetchOperationalManagers()
})

onUnmounted(() => {
  stopRealtime()
})

const logout = async () => {
  await confirmAndLogout()
}
</script>

