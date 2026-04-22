<template>
  <div class="h-screen overflow-hidden bg-slate-100">
    <div class="flex h-full min-h-0 max-lg:flex-col">
      <OperationsSidebar active="queue" />

      <div class="flex min-h-0 flex-1 flex-col bg-slate-50">
        <OperationalTopbar @refresh="fetchDashboard" @logout="logout" />

        <main class="flex-1 overflow-y-auto p-3 sm:p-4">
          <div class="mx-auto max-w-6xl space-y-4">
            <section class="overflow-hidden rounded-2xl border-t-4 border-t-teal-600 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm ring-1 ring-slate-200">
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Operational Management</p>
              <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Operations Review And Dispatch Queue</h1>
              <p class="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">Review CSR-endorsed requests, check dispatch readiness, assign approved employees, and release field work when the request is ready.</p>
            </section>

            <section class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.28)]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Operations Work Queue</p>
                  <h3 class="mt-1 text-xl font-black tracking-[-0.02em] text-slate-900">Operations reviews requests and releases them for field deployment</h3>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ visibleQueue.length }} active</span>
              </div>

              <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Loading operations queue...
              </div>
              <div v-else-if="!visibleQueue.length" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No Operations review items are waiting in the queue.
              </div>
              <div v-else class="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-slate-200 text-sm">
                    <thead class="bg-slate-50">
                      <tr class="text-left">
                        <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Request</th>
                        <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Service</th>
                        <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Schedule</th>
                        <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status</th>
                        <th class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 bg-white">
                      <tr v-for="item in visibleQueue" :key="item.id" class="align-top hover:bg-slate-50/80">
                        <td class="px-4 py-4">
                          <div class="flex items-start gap-3">
                            <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-500 to-cyan-500 text-sm font-black text-white">
                              {{ operationsAvatarLabel(item) }}
                            </span>
                            <div class="min-w-0">
                              <p class="truncate font-bold text-slate-900">{{ item.business_name || 'Unassigned Business' }}</p>
                              <p class="mt-1 text-xs text-slate-500">Request #{{ item.id }}</p>
                              <p class="mt-1 text-xs text-slate-500">Customer: {{ item.customer_name || 'N/A' }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-4">
                          <p class="font-semibold text-slate-900">{{ item.service_type || 'N/A' }}</p>
                          <p class="mt-1 text-xs text-slate-500">{{ serviceSummary(item) }}</p>
                        </td>
                        <td class="px-4 py-4">
                          <p class="font-semibold text-slate-900">{{ item.preferred_date || 'Schedule pending' }}</p>
                          <p class="mt-1 text-xs text-slate-500">Updated {{ item.updated_at || 'N/A' }}</p>
                        </td>
                        <td class="px-4 py-4">
                          <div class="space-y-2">
                            <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="teamCapacityClass(item)">{{ teamCapacityLabel(item) }}</span>
                            <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="stockStatusClass(item)">{{ stockStatusLabel(item) }}</span>
                          </div>
                        </td>
                        <td class="px-4 py-4">
                          <div class="flex flex-col items-end gap-2">
                            <button
                              v-if="canOpenAssignTeam(item)"
                              type="button"
                              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              :disabled="savingAssignedTeam && assignTeamRequest?.id === item.id"
                              @click="openAssignTeamModal(item)"
                            >
                              Assign Team
                            </button>
                            <button type="button" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" @click="selectedRequest = item">View Details</button>
                            <button
                              v-if="canReviewCompletion(item)"
                              type="button"
                              class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                              :disabled="workingRequestId === item.id"
                              @click="selectedRequest = item"
                            >
                              Final Review
                            </button>
                            <button v-if="item.can_assign || item.can_plan_materials || item.can_review" type="button" class="rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="workingRequestId === item.id" @click="openMaterialWorkflow(item)">{{ operationsActionLabel(item) }}</button>
                            <button v-if="item.can_archive" type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60" :disabled="workingRequestId === item.id" @click="archiveRequest(item)">Archive</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>

    <div v-if="selectedRequest" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="selectedRequest = null">
      <div class="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
        <div class="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-3">
              <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-500 to-cyan-500 text-lg font-black text-white">{{ operationsAvatarLabel(selectedRequest) }}</span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Operations Request Review</p>
                <h3 class="truncate text-xl font-black tracking-[-0.02em] text-slate-900">{{ selectedRequest.business_name || 'Unassigned Business' }}</h3>
                <p class="mt-1 text-sm text-slate-500">Customer: {{ selectedRequest.customer_name || 'N/A' }} | Request #{{ selectedRequest.id }}</p>
              </div>
            </div>
            <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700" @click="selectedRequest = null">X</button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass(selectedRequest.status)">{{ prettyStatus(selectedRequest.status) }}</span>
            <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="readinessBadgeClass(selectedRequest)">{{ readinessBadgeLabel(selectedRequest) }}</span>
            <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{{ selectedRequest.preferred_date || 'Schedule pending' }}</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section class="space-y-4">
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Dispatch Readiness</p>
                    <p class="mt-1 text-base font-bold text-slate-900">{{ readinessHeadline(selectedRequest) }}</p>
                  </div>
                  <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="readinessBadgeClass(selectedRequest)">{{ readinessBadgeLabel(selectedRequest) }}</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(selectedRequest.status)">{{ prettyStatus(selectedRequest.status) }}</span>
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="stockStatusClass(selectedRequest)">{{ stockStatusLabel(selectedRequest) }}</span>
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="teamCapacityClass(selectedRequest)">{{ teamCapacityLabel(selectedRequest) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ readinessSupportText(selectedRequest) }}</p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Service And Setup</p>
                  <p class="mt-1.5 text-base font-bold text-slate-900">{{ selectedRequest.service_type || 'N/A' }}</p>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="chip in requestMetaChips(selectedRequest)" :key="`modal-${selectedRequest.id}-${chip}`" class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{{ chip }}</span>
                  </div>
                </div>

                <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Assigned Team</p>
                  <p class="mt-1.5 text-base font-bold text-slate-900">{{ assignedTeamSummary(selectedRequest) }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ selectedRequest.team_members_count || 0 }} member(s)<span v-if="selectedRequest.team_leader_name"> / Leader: {{ selectedRequest.team_leader_name }}</span></p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="teamCapacityClass(selectedRequest)">{{ teamCapacityLabel(selectedRequest) }}</span>
                    <span v-if="selectedRequest.team_leader_name" class="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Leader ready</span>
                  </div>
                </div>
              </div>

              <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow Notes</p>
                    <p class="mt-1.5 text-base font-bold text-slate-900">{{ flowStage(selectedRequest) }}</p>
                  </div>
                  <span class="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">Updated {{ selectedRequest.updated_at || 'N/A' }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ nextFlowAction(selectedRequest) }}</p>
                <p v-if="selectedRequest.notes" class="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-500">{{ selectedRequest.notes }}</p>
              </div>
            </section>

            <section class="space-y-4">
              <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Procurement Snapshot</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="stockStatusClass(selectedRequest)">{{ stockStatusLabel(selectedRequest) }}</span>
                  <span v-if="procurementStageLabel(selectedRequest)" class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{{ procurementStageLabel(selectedRequest) }}</span>
                  <span v-for="pr in selectedRequest.pr_statuses || []" :key="`modal-${selectedRequest.id}-${pr}`" class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="prStatusClass(pr)">{{ prettyPrStatus(pr) }}</span>
                  <span v-if="!(selectedRequest.pr_statuses || []).length" class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">No procurement action yet</span>
                </div>
                <p class="mt-3 text-sm text-slate-500">Requested schedule: {{ selectedRequest.preferred_date || 'Not set' }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-500">{{ procurementStatusNote(selectedRequest) }}</p>
              </div>

              <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Next Operations Action</p>
                <p class="mt-1.5 text-sm font-semibold text-slate-900">{{ operationsActionLabel(selectedRequest) }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ operationsActionHelp(selectedRequest) }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{{ procurementCountLabel(selectedRequest) }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    v-if="canReviewCompletion(selectedRequest)"
                    type="button"
                    class="inline-flex items-center justify-center rounded-[16px] bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="workingRequestId === selectedRequest.id"
                    @click="approveCompletionReview"
                  >
                    Close Job
                  </button>
                  <button
                    v-if="canReviewCompletion(selectedRequest)"
                    type="button"
                    class="inline-flex items-center justify-center rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="workingRequestId === selectedRequest.id"
                    @click="rejectCompletionReview"
                  >
                    Reject Report
                  </button>
                  <button
                    v-if="canOpenAssignTeam(selectedRequest)"
                    type="button"
                    class="inline-flex items-center justify-center rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="savingAssignedTeam && assignTeamRequest?.id === selectedRequest.id"
                    @click="openAssignTeamModal(selectedRequest)"
                  >
                    Assign Team
                  </button>
                  <button v-if="selectedRequest.can_assign || selectedRequest.can_plan_materials || selectedRequest.can_review" type="button" class="inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="workingRequestId === selectedRequest.id" @click="runSelectedWorkflow">{{ operationsActionLabel(selectedRequest) }}</button>
                  <button v-if="selectedRequest.can_archive" type="button" class="inline-flex items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" :disabled="workingRequestId === selectedRequest.id" @click="runSelectedArchive">Archive Record</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <div v-if="assignTeamRequest" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeAssignTeamModal">
      <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
        <div class="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Assign Team</p>
              <h3 class="mt-1 text-xl font-black tracking-[-0.02em] text-slate-900">Request #{{ assignTeamRequest.id }} Team Assignment</h3>
              <p class="mt-1 text-sm text-slate-500">
                {{ assignTeamRequest.business_name || 'Unassigned Business' }} • {{ assignTeamRequest.service_type || 'N/A' }}
              </p>
            </div>
            <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700" :disabled="savingAssignedTeam" @click="closeAssignTeamModal">X</button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ assignTeamTrackLabel }}</span>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{{ assignTeamSelectedIds.length }}/3 selected</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <div class="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-900">Eligible Field Employees</p>
              <p class="mt-1 text-xs text-slate-500">Assign approved field employees only. Maximum of 3 members per dispatch. Office roles are excluded automatically.</p>
            </div>
            <input
              v-model="assignTeamSearch"
              type="text"
              placeholder="Search employee or role..."
              class="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-80"
            />
          </div>

          <div v-if="loadingAssignableEmployees" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Loading assignable employees and item-needed options...
          </div>
          <div v-else-if="!assignableEmployees.length" class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No eligible plumbing or siphoning employee accounts found for this request.
          </div>
          <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
            <label
              v-for="employee in assignableEmployees"
              :key="`assign-${assignTeamRequest.id}-${employee.id}`"
              class="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <input
                v-model="assignTeamSelectedIds"
                type="checkbox"
                :value="employee.id"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                :disabled="!assignTeamSelectedIds.map((value) => normalizeId(value)).includes(normalizeId(employee.id)) && assignTeamSelectedIds.length >= 3"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-slate-900">{{ employee.display_name }}</p>
                  <span
                    class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="teamTrackBadgeClass(employee.team_track)"
                  >
                    {{ employee.team_track === 'plumbing' ? 'Plumbing' : 'Siphoning' }}
                  </span>
                  <span v-if="isLeadRole(employee.role)" class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    Team Leader
                  </span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{{ employee.role || 'No role set' }}</p>
                <div v-if="assignTeamSelectedIds.map((value) => normalizeId(value)).includes(normalizeId(employee.id))" class="mt-2">
                  <button
                    type="button"
                    class="rounded-full px-3 py-1 text-[11px] font-semibold transition"
                    :class="isAssignTeamLeader(employee.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'"
                    @click.prevent="setAssignTeamLeader(employee.id)"
                  >
                    {{ isAssignTeamLeader(employee.id) ? 'Dispatch Leader' : 'Set as leader' }}
                  </button>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{{ employee.team_assignment_status_label || 'Ready for dispatch' }}</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{{ employee.email || 'No email' }}</span>
                </div>
              </div>
            </label>
          </div>

          <div v-if="selectedAssignEmployees.length" class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Dispatch Leader</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ effectiveAssignTeamLeader?.display_name || 'Not selected yet' }}</p>
            <p class="mt-1 text-xs text-slate-600">Leader will handle job start, progress updates, completion, and proof photo upload for this dispatch.</p>
          </div>

          <div class="mt-5 border-t border-slate-200 pt-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">Items Needed</p>
                <p class="mt-1 text-xs text-slate-500">Add at least one required item now. If stock is kulang, this request will continue automatically to Procurement and Finance flow.</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ assignTeamMaterials.length }} item{{ assignTeamMaterials.length === 1 ? '' : 's' }}</span>
            </div>

            <div class="mt-4 grid gap-3 lg:grid-cols-[1.3fr_120px_120px_1fr_auto]">
              <div>
                <select
                  v-model="assignTeamMaterialForm.name"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  @change="syncAssignTeamMaterialUnit"
                >
                  <option disabled value="">Select equipment or item needed</option>
                  <option v-for="option in assignTeamMaterialOptions" :key="`material-opt-${assignTeamRequest.id}-${option.name}`" :value="option.name">
                    {{ option.label }}
                  </option>
                </select>
                <p v-if="selectedAssignTeamMaterialOption" class="mt-2 text-xs" :class="selectedAssignTeamMaterialStatusClass">
                  {{ selectedAssignTeamMaterialStatusText }}
                </p>
              </div>
              <input
                v-model.number="assignTeamMaterialForm.qty"
                type="number"
                min="1"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Qty"
              />
              <input
                v-model.trim="assignTeamMaterialForm.unit"
                type="text"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Unit"
              />
              <input
                v-model.trim="assignTeamMaterialForm.notes"
                type="text"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Reason or note"
              />
              <button
                type="button"
                class="rounded-full border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                @click="addAssignTeamMaterial"
              >
                Add Item
              </button>
            </div>

            <div v-if="assignTeamMaterials.length" class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="material in assignTeamMaterials"
                :key="`assign-material-${assignTeamRequest.id}-${material.name}-${material.unit}`"
                class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                :class="assignTeamMaterialAvailability(material).missing > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700'"
              >
                {{ material.name }} • {{ material.qty }} {{ material.unit }}
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  :class="assignTeamMaterialAvailability(material).missing > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ assignTeamMaterialAvailability(material).missing > 0 ? `Short ${assignTeamMaterialAvailability(material).missing} ${assignTeamMaterialAvailability(material).unit}` : 'Stock ready' }}
                </span>
                <button type="button" class="text-slate-500 hover:text-rose-600" @click="removeAssignTeamMaterial(material.name, material.unit)">x</button>
              </span>
            </div>
            <div v-else class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No items added yet.
            </div>

            <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Inventory Snapshot</p>
              <div v-if="assignTeamInventoryPreview.length" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="row in assignTeamInventoryPreview"
                  :key="`inventory-${assignTeamRequest.id}-${row.name}-${row.unit}`"
                  class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="row.available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ row.name }}: {{ row.available }} {{ row.unit }}
                </span>
              </div>
              <p v-else class="mt-2 text-sm text-slate-500">No inventory items found for this service track.</p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-slate-500">Select up to 3 employees and at least 1 needed item. Missing stock will continue automatically into Procurement and Finance flow.</p>
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingAssignedTeam" @click="closeAssignTeamModal">Cancel</button>
              <button type="button" class="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingAssignedTeam || loadingAssignableEmployees || !assignTeamSelectedIds.length || !assignTeamMaterials.length" @click="submitAssignedTeam">
                {{ savingAssignedTeam ? 'Saving...' : 'Save Team + Items' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import OperationsSidebar from './Partials/OperationsSidebar.vue'
import OperationalTopbar from './Partials/OperationalTopbar.vue'
import { useOperationalData } from './useOperationalData'

const {
  loading,
  workingRequestId,
  queue,
  prettyStatus,
  statusClass,
  prettyPrStatus,
  prStatusClass,
  flowStage,
  nextFlowAction,
  requestMetaChips,
  fetchDashboard,
  reviewRequest,
  finalReview,
  assignTeamEquipment,
  planMaterials,
  archiveRequest,
  logout,
} = useOperationalData()

const selectedRequest = ref(null)
const assignTeamRequest = ref(null)
const hrEmployees = ref([])
const loadingAssignableEmployees = ref(false)
const savingAssignedTeam = ref(false)
const assignTeamSearch = ref('')
const assignTeamSelectedIds = ref([])
const assignTeamLeaderId = ref('')
const assignTeamInventoryRows = ref([])
const assignTeamTemplateRows = ref([])
const assignTeamSuggestedRows = ref([])
const assignTeamMaterials = ref([])
const assignTeamEmployeesLoadedAt = ref(0)
const assignTeamInventoryLoadedAt = ref(0)
const assignTeamTemplateLoadedAt = ref(0)
const assignTeamMaterialForm = ref({
  name: '',
  qty: 1,
  unit: 'pcs',
  notes: '',
})
const ASSIGN_TEAM_CACHE_MS = 30 * 1000

const openMaterialWorkflow = async (item) => {
  const status = String(item?.status || '').trim().toLowerCase()
  if (canReviewCompletion(item)) {
    selectedRequest.value = item
    return
  }
  if (item?.can_review || status === 'pending') return reviewRequest(item, 'approve')
  if (item?.can_plan_materials && !item?.pricing_ready_for_assignment) return planMaterials(item)
  if (item?.can_plan_materials && !item?.payment_ready_for_assignment) return planMaterials(item)
  if (item?.can_assign || ['approved', 'accepted', 'job_ready', 'assigned'].includes(status)) return assignTeamEquipment(item)
  return planMaterials(item)
}

const runSelectedWorkflow = async () => {
  if (!selectedRequest.value) return
  await openMaterialWorkflow(selectedRequest.value)
  selectedRequest.value = null
}

const runSelectedArchive = async () => {
  if (!selectedRequest.value) return
  await archiveRequest(selectedRequest.value)
  selectedRequest.value = null
}

const normalizeValue = (value) => String(value || '').trim().toLowerCase()
const normalizeId = (value) => String(value || '').trim()

const isLeadRole = (role) => {
  const value = normalizeValue(role)
  return value.includes('lead') || value.includes('leader')
}

const requestTrackKey = (item) => {
  const value = normalizeValue(item?.service_type)
  if (value.includes('siphon') || value.includes('siphin') || value.includes('septic') || value.includes('desludg') || value.includes('jetter') || value.includes('drain') || value.includes('vacuum')) return 'siphoning'
  if (value.includes('plumb') || value.includes('pipe') || value.includes('leak') || value.includes('waterline') || value.includes('sanitary')) return 'plumbing'
  return ''
}

const materialTrackKey = (materialName) => {
  const value = normalizeValue(materialName)
  if (value.includes('siphon') || value.includes('siphin') || value.includes('septic') || value.includes('desludg') || value.includes('jetter') || value.includes('drain') || value.includes('vacuum') || value.includes('hose')) return 'siphoning'
  if (value.includes('plumb') || value.includes('pipe') || value.includes('leak') || value.includes('waterline') || value.includes('sanitary') || value.includes('faucet') || value.includes('valve')) return 'plumbing'
  return ''
}

const employeeTrackKey = (employeeOrRole) => {
  const directTrack = normalizeValue(
    typeof employeeOrRole === 'object' && employeeOrRole !== null
      ? employeeOrRole?.service_track || employeeOrRole?.serviceTrack || employeeOrRole?.workspace_category || employeeOrRole?.category
      : ''
  )
  if (directTrack === 'siphoning' || directTrack === 'plumbing') return directTrack

  const value = normalizeValue(
    typeof employeeOrRole === 'object' && employeeOrRole !== null
      ? employeeOrRole?.role
      : employeeOrRole
  )
  if (value.includes('siphon') || value.includes('siphin') || value.includes('septic') || value.includes('desludg') || value.includes('jetter') || value.includes('drain') || value.includes('vacuum')) return 'siphoning'
  if (value.includes('plumb') || value.includes('pipe') || value.includes('leak') || value.includes('waterline') || value.includes('sanitary')) return 'plumbing'
  return ''
}

const employeeDisplayName = (employee) => {
  const direct = String(employee?.name || '').trim()
  if (direct) return direct
  return [
    employee?.first_name || employee?.given_name || '',
    employee?.middle_initial ? `${employee.middle_initial}.` : '',
    employee?.last_name || '',
  ].filter(Boolean).join(' ').trim() || `Employee #${employee?.id || 'N/A'}`
}

const isApprovedAssignableEmployee = (employee) => {
  const approval = normalizeValue(employee?.approval_status)
  const status = normalizeValue(employee?.status)
  const approvedFlag = (
    employee?.is_approved === true
    || String(employee?.is_approved || '').trim().toLowerCase() === 'true'
    || String(employee?.is_approved || '').trim() === '1'
  )
  if (approval === 'approved') return employee?.is_approved === false ? false : true
  if (approval === 'active') return approvedFlag
  if (typeof employee?.is_approved === 'boolean') return employee.is_approved
  if (status === 'approved') return true
  if (status === 'active') return approvedFlag
  return false
}

const isHrCreatedEmployee = (employee) => {
  const accountSource = normalizeValue(employee?.account_source)
  const createdByRole = normalizeValue(employee?.created_by_role)
  const sourceTrace = Array.isArray(employee?.source_trace)
    ? employee.source_trace.map((value) => normalizeValue(value)).join(' ')
    : ''

  if (accountSource === 'hr_created') return true
  if (createdByRole.includes('hr')) return true
  if (sourceTrace.includes('hr workspace')) return true
  return false
}

const teamAssignmentStatusLabel = (employee) => {
  const status = normalizeValue(employee?.team_assignment_status)
  if (status === 'accepted') return 'Accepted to dispatch'
  if (status === 'pending') return 'Pending assignment reply'
  if (status === 'rejected') return 'Rejected previous team'
  return 'Ready for dispatch'
}

const isExcludedOfficeRole = (role) => {
  const value = normalizeValue(role)
  return ['csr', 'procurement', 'finance', 'operational', 'hr'].some((keyword) => value === keyword || value.includes(keyword))
}

const canOpenAssignTeam = (item) => !['completed', 'cancelled', 'rejected'].includes(normalizeValue(item?.status))
const canReviewCompletion = (item) => (
  normalizeValue(item?.status) === 'completed'
  && normalizeValue(item?.completion_review_status) !== 'approved'
)

const toTimeValue = (value) => {
  const stamp = new Date(String(value || '').trim()).getTime()
  return Number.isFinite(stamp) ? stamp : 0
}

const isStageTwoRequest = (item) => {
  const workflowStage = normalizeValue(item?.workflow_stage)
  const operationsStage = normalizeValue(item?.operations_stage)
  return workflowStage === 'csr_forwarded' || operationsStage === 'awaiting_operational_review'
}

const queueSortPriority = (item) => {
  const status = normalizeValue(item?.status)
  const stock = normalizeValue(item?.stock_status)
  const procurement = normalizeValue(item?.procurement_stage)
  const teamCount = Number(item?.team_members_count || 0)

  if (isStageTwoRequest(item)) return 0
  if (canOpenAssignTeam(item) && teamCount <= 0) return 1
  if (stock === 'pending_stock_check') return 2
  if (stock === 'stock_unavailable' || procurement === 'pending_procurement' || status === 'awaiting_material') return 3
  if (['assigned', 'job_ready', 'approved', 'accepted'].includes(status)) return 4
  if (canReviewCompletion(item)) return 5
  if (status === 'in_progress') return 6
  if (status === 'completed') return 7
  return 8
}

const queueSortTimestamp = (item) => {
  if (isStageTwoRequest(item)) {
    return toTimeValue(item?.csr_forwarded_at || item?.updated_at || item?.created_at)
  }
  return toTimeValue(
    item?.assigned_at
    || item?.materials_planned_at
    || item?.reviewed_at
    || item?.updated_at
    || item?.created_at
  )
}

const sortedQueue = computed(() =>
  [...(queue.value || [])].sort((a, b) => {
    const priorityDiff = queueSortPriority(a) - queueSortPriority(b)
    if (priorityDiff !== 0) return priorityDiff

    const timeDiff = queueSortTimestamp(b) - queueSortTimestamp(a)
    if (timeDiff !== 0) return timeDiff

    return String(b?.id || '').localeCompare(String(a?.id || ''), undefined, { numeric: true, sensitivity: 'base' })
  })
)

const queueCustomerKey = (item) => {
  const identity = normalizeValue(
    item?.user_id
    || item?.customer_name
    || item?.email
    || item?.contact_number
    || item?.business_name
  )
  const service = normalizeValue(item?.service_type)
  const preferredDate = normalizeValue(item?.preferred_date)
  const address = normalizeValue(item?.address_text)
  return [identity, service, preferredDate, address].join('|')
}

const visibleQueue = computed(() => {
  const seen = new Set()
  return sortedQueue.value.filter((item) => {
    const key = queueCustomerKey(item)
    if (!key || key === '|||') return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const eligibleAssignableEmployees = computed(() => {
  const requestTrack = requestTrackKey(assignTeamRequest.value)

  return (hrEmployees.value || [])
    .map((employee) => ({
      ...employee,
      id: normalizeId(employee?.id || employee?.uid || employee?.user_id),
      display_name: employeeDisplayName(employee),
      team_track: employeeTrackKey(employee),
      team_assignment_status_label: teamAssignmentStatusLabel(employee),
    }))
    .filter((employee) => employee.id !== '')
    .filter((employee) => isApprovedAssignableEmployee(employee))
    .filter((employee) => !isExcludedOfficeRole(employee.role))
    .filter((employee) => ['plumbing', 'siphoning'].includes(employee.team_track))
    .filter((employee) => !requestTrack || employee.team_track === requestTrack)
    .sort((a, b) => {
      const leadDiff = Number(isLeadRole(b.role)) - Number(isLeadRole(a.role))
      if (leadDiff !== 0) return leadDiff
      return a.display_name.localeCompare(b.display_name)
    })
})

const assignableEmployees = computed(() => {
  const query = normalizeValue(assignTeamSearch.value)

  return eligibleAssignableEmployees.value
    .filter((employee) => {
      if (!query) return true
      return [
        employee.display_name,
        employee.role,
        employee.email,
      ].some((value) => normalizeValue(value).includes(query))
    })
})

const selectedAssignEmployees = computed(() => {
  const selectedIds = new Set(assignTeamSelectedIds.value.map((value) => normalizeId(value)).filter(Boolean))
  return eligibleAssignableEmployees.value.filter((employee) => selectedIds.has(employee.id))
})
const effectiveAssignTeamLeader = computed(() => {
  const selected = selectedAssignEmployees.value
  if (!selected.length) return null
  const explicit = selected.find((employee) => normalizeId(employee.id) === normalizeId(assignTeamLeaderId.value))
  if (explicit) return explicit
  return selected.find((employee) => isLeadRole(employee.role)) || selected[0] || null
})
const isAssignTeamLeader = (employeeId) => normalizeId(effectiveAssignTeamLeader.value?.id) === normalizeId(employeeId)
const setAssignTeamLeader = (employeeId) => {
  assignTeamLeaderId.value = normalizeId(employeeId)
}
watch(assignTeamSelectedIds, (selectedIds) => {
  const normalizedSelectedIds = (selectedIds || []).map((value) => normalizeId(value)).filter(Boolean)
  if (!normalizedSelectedIds.length) {
    assignTeamLeaderId.value = ''
    return
  }
  if (normalizedSelectedIds.includes(normalizeId(assignTeamLeaderId.value))) return
  const fallbackLeader = selectedAssignEmployees.value.find((employee) => isLeadRole(employee.role)) || selectedAssignEmployees.value[0] || null
  assignTeamLeaderId.value = normalizeId(fallbackLeader?.id)
}, { deep: true })

const assignTeamTrackLabel = computed(() => {
  const track = requestTrackKey(assignTeamRequest.value)
  if (track === 'plumbing') return 'Plumbing roles only'
  if (track === 'siphoning') return 'Siphoning roles only'
  return 'Plumbing and Siphoning roles'
})

const teamTrackBadgeClass = (track) => (
  track === 'plumbing'
    ? 'bg-sky-50 text-sky-700'
    : 'bg-emerald-50 text-emerald-700'
)

const assignTeamInventoryMap = computed(() => new Map(
  (assignTeamInventoryRows.value || []).map((row) => [
    normalizeValue(row?.material_name),
    {
      available: Number(row?.available || 0),
      unit: String(row?.unit || 'pcs').trim() || 'pcs',
    },
  ])
))

const assignTeamMaterialOptions = computed(() => {
  const track = requestTrackKey(assignTeamRequest.value)

  const names = [
    ...(assignTeamTemplateRows.value || []).map((row) => String(row?.material_name || '').trim()),
    ...(assignTeamSuggestedRows.value || []).map((row) => String(row?.material_name || '').trim()),
    ...(assignTeamInventoryRows.value || []).map((row) => String(row?.material_name || '').trim()),
  ]

  return [...new Set(names.filter(Boolean))]
    .filter((name) => !track || materialTrackKey(name) === track)
    .map((name) => {
      const stock = assignTeamInventoryMap.value.get(normalizeValue(name))
      const available = Number(stock?.available || 0)
      const unit = String(stock?.unit || 'pcs')
      return {
        name,
        available,
        unit,
        label: `${name} (available: ${available} ${unit})`,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
})

const assignTeamMaterialAvailability = (material = {}) => {
  const name = String(material?.name || '').trim()
  const qty = Math.max(1, Math.floor(Number(material?.qty || 0) || 1))
  const stock = assignTeamInventoryMap.value.get(normalizeValue(name))
  const available = Number(stock?.available || 0)
  const unit = String(material?.unit || stock?.unit || 'pcs').trim() || 'pcs'
  return {
    available,
    unit,
    missing: Math.max(0, qty - available),
  }
}

const assignTeamInventoryPreview = computed(() => {
  const track = requestTrackKey(assignTeamRequest.value)
  return (assignTeamInventoryRows.value || [])
    .filter((row) => !track || materialTrackKey(row?.material_name) === track)
    .map((row) => ({
      name: String(row?.material_name || '').trim(),
      unit: String(row?.unit || 'pcs').trim() || 'pcs',
      available: Number(row?.available || 0),
    }))
    .filter((row) => row.name)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 12)
})

const selectedAssignTeamMaterialOption = computed(() => assignTeamMaterialOptions.value.find(
  (option) => option.name === assignTeamMaterialForm.value.name
))

const selectedAssignTeamMaterialStatus = computed(() => {
  const selected = selectedAssignTeamMaterialOption.value
  if (!selected) return null
  const qty = Math.max(1, Math.floor(Number(assignTeamMaterialForm.value.qty || 0) || 1))
  const available = Number(selected.available || 0)
  const unit = String(assignTeamMaterialForm.value.unit || selected.unit || 'pcs').trim() || 'pcs'
  const missing = Math.max(0, qty - available)
  return {
    available,
    unit,
    missing,
  }
})

const selectedAssignTeamMaterialStatusText = computed(() => {
  const status = selectedAssignTeamMaterialStatus.value
  if (!status) return ''
  if (status.missing > 0) {
    return `Only ${status.available} ${status.unit} available. Kulang ng ${status.missing} ${status.unit}; after save, lalabas ito agad sa Procurement review queue.`
  }
  return `${status.available} ${status.unit} available in stock. Ready for dispatch planning.`
})

const selectedAssignTeamMaterialStatusClass = computed(() => {
  const status = selectedAssignTeamMaterialStatus.value
  if (!status) return 'text-slate-500'
  return status.missing > 0 ? 'text-amber-700' : 'text-emerald-700'
})

const syncAssignTeamMaterialUnit = () => {
  const selected = assignTeamMaterialOptions.value.find((option) => option.name === assignTeamMaterialForm.value.name)
  if (selected?.unit) {
    assignTeamMaterialForm.value.unit = selected.unit
  }
}

const resetAssignTeamMaterialForm = () => {
  assignTeamMaterialForm.value = {
    name: assignTeamMaterialOptions.value[0]?.name || '',
    qty: 1,
    unit: assignTeamMaterialOptions.value[0]?.unit || 'pcs',
    notes: '',
  }
}

const addAssignTeamMaterial = () => {
  const name = String(assignTeamMaterialForm.value.name || '').trim()
  const qty = Math.max(1, Math.floor(Number(assignTeamMaterialForm.value.qty || 0)))
  const unit = String(assignTeamMaterialForm.value.unit || 'pcs').trim() || 'pcs'
  const notes = String(assignTeamMaterialForm.value.notes || '').trim()

  if (!name) {
    Swal.fire('Missing item', 'Select an item needed first.', 'warning')
    return
  }

  const existingIndex = assignTeamMaterials.value.findIndex((item) => (
    normalizeValue(item?.name) === normalizeValue(name)
    && normalizeValue(item?.unit) === normalizeValue(unit)
  ))

  const nextRow = { name, qty, unit, notes: notes || null }
  if (existingIndex >= 0) {
    assignTeamMaterials.value.splice(existingIndex, 1, nextRow)
  } else {
    assignTeamMaterials.value.push(nextRow)
  }

  resetAssignTeamMaterialForm()
}

const removeAssignTeamMaterial = (name, unit) => {
  assignTeamMaterials.value = assignTeamMaterials.value.filter((item) => !(
    normalizeValue(item?.name) === normalizeValue(name)
    && normalizeValue(item?.unit) === normalizeValue(unit)
  ))
}

const fetchAssignableEmployees = async ({ force = false } = {}) => {
  loadingAssignableEmployees.value = true
  try {
    const now = Date.now()
    const shouldReloadEmployees = force || !hrEmployees.value.length || (now - assignTeamEmployeesLoadedAt.value) > ASSIGN_TEAM_CACHE_MS
    const shouldReloadInventory = force || !assignTeamInventoryRows.value.length || (now - assignTeamInventoryLoadedAt.value) > ASSIGN_TEAM_CACHE_MS
    const shouldReloadTemplates = force || !assignTeamTemplateRows.value.length || (now - assignTeamTemplateLoadedAt.value) > ASSIGN_TEAM_CACHE_MS

    const [employeeRes, inventoryRes, templateRes, suggestedRes] = await Promise.all([
      shouldReloadEmployees
        ? axios.get('/operational/assignable-employees', { skipGlobalLoading: true })
        : Promise.resolve({ data: hrEmployees.value }),
      shouldReloadInventory
        ? axios.get('/operational/inventory-summary', { skipGlobalLoading: true })
        : Promise.resolve({ data: assignTeamInventoryRows.value }),
      shouldReloadTemplates
        ? axios.get('/operational/material-template-options', { skipGlobalLoading: true })
        : Promise.resolve({ data: assignTeamTemplateRows.value }),
      axios.get(`/operational/suggested-materials/${assignTeamRequest.value.id}`, { skipGlobalLoading: true }),
    ])

    hrEmployees.value = Array.isArray(employeeRes?.data) ? employeeRes.data : []
    assignTeamInventoryRows.value = Array.isArray(inventoryRes?.data) ? inventoryRes.data : []
    assignTeamTemplateRows.value = Array.isArray(templateRes?.data) ? templateRes.data : []
    assignTeamSuggestedRows.value = Array.isArray(suggestedRes?.data) ? suggestedRes.data : []
    if (shouldReloadEmployees) assignTeamEmployeesLoadedAt.value = now
    if (shouldReloadInventory) assignTeamInventoryLoadedAt.value = now
    if (shouldReloadTemplates) assignTeamTemplateLoadedAt.value = now
    resetAssignTeamMaterialForm()
  } catch (err) {
    hrEmployees.value = []
    assignTeamInventoryRows.value = []
    assignTeamTemplateRows.value = []
    assignTeamSuggestedRows.value = []
    Swal.fire('Error', err?.response?.data?.message || 'Failed to load assignable employees or item-needed data.', 'error')
  } finally {
    loadingAssignableEmployees.value = false
  }
}

const openAssignTeamModal = async (item) => {
  assignTeamRequest.value = item
  assignTeamSearch.value = ''
  assignTeamLeaderId.value = normalizeId(item?.team_leader_id || item?.assigned_employee_id || item?.employee_id)
  assignTeamSelectedIds.value = Array.isArray(item?.dispatch_employee_ids)
    ? item.dispatch_employee_ids.map((value) => normalizeId(value)).filter(Boolean)
    : []
  assignTeamMaterials.value = Array.isArray(item?.materials)
    ? item.materials.map((entry) => ({
      name: String(entry?.name || entry?.material_name || '').trim(),
      qty: Math.max(1, Math.floor(Number(entry?.qty || entry?.quantity || 1))),
      unit: String(entry?.unit || 'pcs').trim() || 'pcs',
      notes: String(entry?.notes || '').trim() || null,
    })).filter((entry) => entry.name)
    : []
  await fetchAssignableEmployees()
}

const closeAssignTeamModal = (force = false) => {
  if (savingAssignedTeam.value && !force) return
  assignTeamRequest.value = null
  assignTeamSearch.value = ''
  assignTeamSelectedIds.value = []
  assignTeamLeaderId.value = ''
  assignTeamSuggestedRows.value = []
  assignTeamMaterials.value = []
  resetAssignTeamMaterialForm()
}

const assignTeamName = (employees = [], requestId = null) => {
  const track = requestTrackKey(assignTeamRequest.value)
  if (track === 'plumbing') return `Plumbing Dispatch ${requestId ? `#${requestId}` : 'Team'}`
  if (track === 'siphoning') return `Siphoning Dispatch ${requestId ? `#${requestId}` : 'Team'}`
  return `Operations Team ${requestId || ''}`.trim()
}

const submitAssignedTeam = async () => {
  if (!assignTeamRequest.value) return
  if (selectedAssignEmployees.value.length !== 3) {
    Swal.fire('Select 3 personnel', 'Dispatch must include exactly 3 personnel: 1 team leader and 2 technicians.', 'warning')
    return
  }
  if (!assignTeamMaterials.value.length) {
    Swal.fire('Add items needed', 'Please add at least one needed item before saving.', 'warning')
    return
  }

  const selected = selectedAssignEmployees.value
  const leader = effectiveAssignTeamLeader.value || selected.find((employee) => isLeadRole(employee.role)) || selected[0]
  const teamLabel = assignTeamName(selected, assignTeamRequest.value.id)
  const payload = {
    employee_id: leader?.id || null,
    assigned_employee_id: leader?.id || null,
    assigned_employee_name: selected.map((employee) => employee.display_name).join(', '),
    dispatch_employee_ids: selected.map((employee) => employee.id),
    dispatch_employee_roles: selected.map((employee) => String(employee.role || '').trim()).filter(Boolean),
    team_members_count: selected.length,
    team_leader_id: leader?.id || null,
    team_leader_role: String(leader?.role || '').trim() || null,
    team_leader_name: leader?.display_name || null,
    assigned_team: teamLabel,
    selected_team: teamLabel,
    assigned_at: new Date().toISOString(),
  }

  savingAssignedTeam.value = true
  try {
    const dispatchRes = await axios.post(`/operational/service-requests/${assignTeamRequest.value.id}/dispatch-team`, payload, { skipGlobalLoading: true })
    const materialRes = await axios.post(`/operational/service-requests/${assignTeamRequest.value.id}/plan-materials`, {
      materials: assignTeamMaterials.value.map((item) => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes || null,
      })),
    }, { skipGlobalLoading: true })
    const nextRequest = {
      ...payload,
      ...(dispatchRes?.data?.data || {}),
      ...(materialRes?.data?.data || {}),
    }
    queue.value = (queue.value || []).map((item) => (
      item?.id === assignTeamRequest.value.id
        ? { ...item, ...nextRequest }
        : item
    ))
    if (selectedRequest.value?.id === assignTeamRequest.value.id) {
      selectedRequest.value = { ...selectedRequest.value, ...nextRequest }
    }
    closeAssignTeamModal(true)
    const requiresProcurement = Boolean(materialRes?.data?.requires_procurement)
    Swal.fire(
      requiresProcurement ? 'Sent To Procurement' : 'Assigned',
      materialRes?.data?.message
        || (requiresProcurement
          ? 'Team assignment was saved. Short materials were flagged and Procurement can now continue the request into the next Finance step.'
          : dispatchRes?.data?.message || 'Team members and items needed were saved successfully.'),
      requiresProcurement ? 'info' : 'success'
    )
    fetchDashboard().catch(() => {})
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.message || 'Failed to assign team.', 'error')
  } finally {
    savingAssignedTeam.value = false
  }
}

const approveCompletionReview = async () => {
  if (!selectedRequest.value) return
  const handled = await finalReview(selectedRequest.value, 'approve')
  if (handled) {
    selectedRequest.value = null
  }
}

const rejectCompletionReview = async () => {
  if (!selectedRequest.value) return
  const handled = await finalReview(selectedRequest.value, 'reject')
  if (handled) {
    selectedRequest.value = null
  }
}

const operationsActionLabel = (item) => {
  const status = String(item?.status || '').trim().toLowerCase()
  if (canReviewCompletion(item)) return 'Final Review'
  if (item?.can_review || status === 'pending') return 'Open Review'
  if (item?.can_plan_materials && !item?.pricing_ready_for_assignment) return 'Plan Materials'
  if (item?.can_plan_materials && !item?.payment_ready_for_assignment) return 'Open Release Checks'
  if (item?.can_assign || ['approved', 'accepted', 'job_ready', 'assigned'].includes(status)) return 'Assign / Dispatch Team'
  return 'Open Workflow'
}

const operationsActionHelp = (item) => {
  const status = String(item?.status || '').trim().toLowerCase()
  if (canReviewCompletion(item)) {
    return 'Use this to verify the field completion report, close the job, or reject the report and send it back for rework.'
  }
  if (item?.can_review || status === 'pending') {
    return 'Use this to open the Operations review workspace, confirm the request details, and decide whether the job needs inspection, materials planning, or direct dispatch.'
  }
  if (item?.can_plan_materials && !item?.pricing_ready_for_assignment) {
    return 'Use this to review required materials, check current stock, and trigger Procurement if some items are unavailable.'
  }
  if (item?.can_plan_materials && !item?.payment_ready_for_assignment) {
    return 'Use this to finish release checks and confirm the remaining payment or pricing requirements before dispatch.'
  }
  if (item?.can_assign || ['approved', 'accepted', 'job_ready', 'assigned'].includes(status)) {
    return 'Use this to assign the approved team, complete dispatch planning, and release the job for field deployment.'
  }
  return 'Use this to continue the next Operations workflow step for this request.'
}

const operationsAvatarLabel = (item) => {
  const source = String(item?.business_name || item?.customer_name || item?.service_type || 'OP').replace(/[^A-Za-z0-9 ]/g, ' ').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'OP'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const assignedTeamSummary = (item) => (
  String(item?.selected_team || item?.assigned_team || '').trim()
  || String(item?.assigned_employee_name || '').trim()
  || 'Not assigned yet'
)

const serviceSummary = (item) => {
  const summary = requestMetaChips(item)
  return summary.length ? summary.slice(0, 2).join(' • ') : 'No setup summary yet'
}

const readinessBadgeLabel = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  const procurement = String(item?.procurement_stage || '').trim().toLowerCase()
  const teamCount = Number(item?.team_members_count || 0)
  if (stock === 'stock_unavailable' || procurement === 'pending_procurement') return 'Waiting Materials'
  if (!item?.pricing_ready_for_assignment || !item?.payment_ready_for_assignment) return 'Release Checks Pending'
  if (teamCount < 3) return `Need ${3 - teamCount} More`
  return 'Dispatch Ready'
}

const readinessBadgeClass = (item) => {
  const label = readinessBadgeLabel(item)
  if (label === 'Waiting Materials') return 'bg-rose-50 text-rose-700'
  if (label === 'Release Checks Pending') return 'bg-amber-50 text-amber-700'
  if (label.startsWith('Need ')) return 'bg-sky-50 text-sky-700'
  return 'bg-emerald-50 text-emerald-700'
}

const readinessHeadline = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  const procurement = String(item?.procurement_stage || '').trim().toLowerCase()
  const teamCount = Number(item?.team_members_count || 0)
  if (stock === 'stock_unavailable' || procurement === 'pending_procurement') return 'Procurement must complete the missing materials first.'
  if (!item?.pricing_ready_for_assignment || !item?.payment_ready_for_assignment) return 'Pricing or payment gate is still blocking dispatch.'
  if (teamCount < 3) return `Team is not full yet for dispatch (${teamCount}/3).`
  return 'All checks are clear and the team can be dispatched.'
}

const readinessSupportText = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  const procurement = String(item?.procurement_stage || '').trim().toLowerCase()
  const teamCount = Number(item?.team_members_count || 0)
  if (stock === 'stock_unavailable' || procurement === 'pending_procurement') return 'Materials are still insufficient in stock, so Operations should wait for Procurement before dispatching.'
  if (!item?.pricing_ready_for_assignment || !item?.payment_ready_for_assignment) return 'Operations can continue reviewing, but dispatch should wait until release and payment gates are clear.'
  if (teamCount < 3) return 'You can continue assigning approved employees here until the team reaches the 3-member dispatch capacity.'
  return 'This request already has materials, release checks, and a full team for field deployment.'
}

const teamCapacityLabel = (item) => {
  const count = Number(item?.team_members_count || 0)
  if (count <= 0) return 'No employees assigned'
  if (count >= 3) return 'Team full for dispatch (3/3)'
  return `Need ${3 - count} more employee${3 - count > 1 ? 's' : ''}`
}

const teamCapacityClass = (item) => {
  const count = Number(item?.team_members_count || 0)
  if (count >= 3) return 'bg-emerald-50 text-emerald-700'
  if (count <= 0) return 'bg-slate-100 text-slate-600'
  return 'bg-amber-50 text-amber-700'
}

const stockStatusLabel = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  if (stock === 'stock_available') return 'Stock available'
  if (stock === 'stock_unavailable') return 'Stock unavailable'
  if (stock === 'pending_stock_check') return 'Waiting stock check'
  return item?.materials_needed ? 'Materials planned' : 'No materials planned yet'
}

const stockStatusClass = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  if (stock === 'stock_available') return 'bg-emerald-50 text-emerald-700'
  if (stock === 'stock_unavailable') return 'bg-rose-50 text-rose-700'
  if (stock === 'pending_stock_check') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

const procurementStageLabel = (item) => {
  const stage = String(item?.procurement_stage || '').trim()
  return stage ? `Procurement: ${prettyStatus(stage)}` : ''
}

const procurementStatusNote = (item) => {
  const stock = String(item?.stock_status || '').trim().toLowerCase()
  const procurement = String(item?.procurement_stage || '').trim().toLowerCase()
  const totalPr = Array.isArray(item?.pr_statuses) ? item.pr_statuses.length : 0
  if (stock === 'stock_unavailable' || procurement === 'pending_procurement') return totalPr ? 'Procurement was already triggered because stock is not enough for this request.' : 'This request needs procurement because some materials are not available in stock.'
  if (stock === 'stock_available' || procurement === 'completed') return 'Materials are already planned and available for release checks and dispatch.'
  if (stock === 'pending_stock_check') return 'Operations still needs to confirm the required materials and available stock.'
  return 'Open the workflow to set materials, check stock, and create procurement orders if needed.'
}

const procurementCountLabel = (item) => {
  const total = Array.isArray(item?.pr_statuses) ? item.pr_statuses.length : 0
  if (!total) return 'No PR items'
  return `${total} PR update${total > 1 ? 's' : ''}`
}

onMounted(() => {
  fetchDashboard()
})
</script>
