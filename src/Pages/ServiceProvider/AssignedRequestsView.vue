<template>
  <section class="space-y-6">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-5 text-white shadow-lg">
      <div class="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/15"></div>
      <div class="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-white/10"></div>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">{{ title }}</h2>
          <p class="text-sm text-white/85">{{ subtitle }}</p>
        </div>
        <button
          @click="emitRefresh"
          class="self-start sm:self-auto px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-gray-500">Loading assigned requests...</div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">
          <p class="text-xs text-teal-600 uppercase tracking-wide">Total</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.total }}</p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
          <p class="text-xs text-amber-700 uppercase tracking-wide">Active</p>
          <p class="text-2xl font-bold text-amber-800 mt-1">{{ stats.open }}</p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <p class="text-xs text-emerald-700 uppercase tracking-wide">Completed</p>
          <p class="text-2xl font-bold text-emerald-800 mt-1">{{ stats.completed }}</p>
        </div>
      </div>

    <div class="bg-gray-100/95 py-1">
        <div class="bg-white rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in filterOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
            :class="statusFilter === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
            @click="statusFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <select
          v-model="sortMode"
          class="w-full md:w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="status">Status</option>
        </select>
        <select
          v-model="businessFilter"
          class="w-full md:w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
        >
          <option value="all">All Businesses</option>
          <option v-for="biz in businessOptions" :key="`biz-${biz}`" :value="biz">
            {{ biz }}
          </option>
        </select>
        <input
          v-model.trim="searchText"
          type="text"
          placeholder="Search customer or business..."
          class="md:ml-auto w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
        />
        <label class="inline-flex items-center gap-2 text-sm text-gray-600">
          <input v-model="showArchived" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          Show archived
        </label>
        <button
          type="button"
          class="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          @click="clearFilters"
        >
          Reset
        </button>
      </div>
      <div v-if="props.allowArchiveActions" class="mt-2 bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          @click="selectAllVisible"
        >
          Select Visible
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          @click="clearSelection"
        >
          Clear Selection
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
          :disabled="!selectedArchiveCount"
          @click="archiveSelected"
        >
          Archive Selected ({{ selectedArchiveCount }})
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
          :disabled="!selectableIds.length"
          @click="archiveAllVisible"
        >
          Archive All Visible ({{ selectableIds.length }})
        </button>
      </div>
      </div>

      <div v-if="sortedAssignedRequests.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="req in sortedAssignedRequests"
          :key="req.id"
          class="bg-white p-5 rounded-2xl shadow-md border border-gray-100 border-l-4"
          :class="cardAccentClass(req.status)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-gray-400">{{ primaryEntityLabel(req) }}</p>
              <p class="text-lg font-semibold text-gray-800">
                {{ primaryEntityName(req) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-if="props.allowArchiveActions && canArchive(req)"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                :checked="isSelected(req)"
                @change="toggleSelected(req)"
              />
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize" :class="statusClass(req.status)">
                {{ prettyStatus(req.status) }}
              </span>
            </div>
          </div>
          <p v-if="req.archived_at" class="mt-2 text-xs font-semibold text-slate-500">
            Archived on {{ formatDateTime(req.archived_at) }}
          </p>

          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Service Type</p>
              <p class="font-semibold text-gray-800 mt-1">{{ req.service_type || 'N/A' }}</p>
              <p v-if="req.business_name" class="text-[11px] text-gray-500 mt-0.5">Business: {{ req.business_name }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Dispatch Team</p>
              <div v-if="dispatchTeamNames(req).length" class="mt-1 flex flex-wrap gap-1.5">
                <span
                  v-for="(name, idx) in dispatchTeamNames(req)"
                  :key="`dispatch-name-${req.id}-${idx}`"
                  class="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200"
                >
                  {{ name }}
                </span>
              </div>
              <p v-else class="font-semibold text-gray-800 mt-1">{{ dispatchTeamLabel(req) }}</p>
              <p v-if="dispatchTeamSubLabel(req)" class="text-[11px] text-gray-500 mt-0.5">
                {{ dispatchTeamSubLabel(req) }}
              </p>
            </div>
            <div v-if="props.allowUserRequestActions" class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Assigned Team</p>
              <p class="font-semibold text-gray-800 mt-1">{{ req.assigned_team || 'Not assigned yet' }}</p>
              <p v-if="req.assigned_employee_name" class="text-[11px] text-gray-500 mt-0.5">
                Member: {{ req.assigned_employee_name }}
              </p>
            </div>
            <div v-if="props.allowUserRequestActions" class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Management Flow</p>
              <p class="font-semibold text-gray-800 mt-1">{{ managementModeLabel(req.management_mode) }}</p>
              <p v-if="req.fixed_price !== null && req.fixed_price !== undefined" class="text-[11px] text-teal-700 mt-0.5 font-semibold">
                Fixed Price: {{ money(req.fixed_price) }}
              </p>
            </div>
            <div v-if="shouldShowPaymentType(req)" class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Payment Type</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {{ paymentTypeLabel(req) }}
                </span>
                <span v-if="req.total_amount" class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  Est. {{ money(req.total_amount || 0) }}
                </span>
              </div>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Service Time</p>
              <p class="font-semibold text-gray-800 mt-1">{{ serviceTimeLabel(req) }}</p>
              <p class="text-[11px] text-gray-500 mt-0.5">Customer-selected time</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Booked At</p>
              <p class="font-semibold text-gray-800 mt-1">{{ formatDateTime(req.created_at) }}</p>
              <p class="text-[11px] text-gray-500 mt-0.5">{{ timeAgo(req.created_at) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Contact Number</p>
              <p class="font-semibold text-gray-800 mt-1">{{ displayContactNumber(req.contact_number) }}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Address</p>
              <p class="font-semibold text-gray-800 mt-1">{{ req.address_text || 'N/A' }}</p>
              <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <span class="font-semibold text-slate-700">House/Street:</span> {{ addressParts(req).house || 'N/A' }}
                </div>
                <div class="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <span class="font-semibold text-slate-700">Barangay:</span> {{ addressParts(req).barangay || 'N/A' }}
                </div>
                <div class="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <span class="font-semibold text-slate-700">City:</span> {{ addressParts(req).city || 'N/A' }}
                </div>
                <div class="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <span class="font-semibold text-slate-700">ZIP:</span> {{ addressParts(req).zip || 'N/A' }}
                </div>
              </div>
              <a
                v-if="mapSearchUrl(req)"
                :href="mapSearchUrl(req)"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-flex text-[11px] font-semibold text-sky-700 hover:underline"
              >
                Open location map
              </a>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Work Journey</p>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                  Step {{ providerCurrentStep(req.status) }}/{{ providerTotalSteps(req.status) }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="statusClass(req.status)">
                  {{ providerProgressPercent(req.status) }}%
                </span>
              </div>
            </div>

            <div class="mb-2">
              <div class="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/70">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="providerProgressBarClass(req.status)"
                  :style="{ width: `${providerProgressPercent(req.status)}%` }"
                ></div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="step in providerTimeline(req.status)"
                :key="`${req.id}-${step.key}`"
                type="button"
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition"
                :class="timelineClass(step.state)"
                :title="providerStageDescription(step.key)"
                @click="openProviderStageInfo(step.key, req)"
              >
                {{ step.label }}
              </button>
            </div>
          </div>
          <p class="mt-2 text-[11px] text-gray-500">
            Last status update: {{ lastStatusLabel(req) }}
          </p>

          <div
            v-if="isTeamWorkflowRequest(req)"
            class="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3"
          >
            <p class="text-[11px] uppercase tracking-wide text-cyan-700">Team Leader Confirmation</p>
            <p class="mt-1 text-sm font-semibold text-cyan-900">{{ teamLeaderConfirmationLabel(req) }}</p>
            <p class="mt-1 text-xs text-cyan-800">
              Materials Collected: {{ req.materials_collected ? 'Yes' : 'No' }}
            </p>
          </div>

          <div
            v-if="isTeamWorkflowRequest(req)"
            class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3"
          >
            <p class="text-[11px] uppercase tracking-wide text-emerald-700">Materials to Collect</p>
            <div v-if="shouldShowMaterialsList(req) && requestMaterials(req).length" class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="material in requestMaterials(req)"
                :key="`material-${req.id}-${material.id || material.name}`"
                class="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800"
              >
                {{ material.name }} x{{ material.quantity }} {{ material.unit }}
              </span>
            </div>
            <p v-else-if="!shouldShowMaterialsList(req)" class="mt-1 text-xs text-emerald-800">
              Item list will appear after clicking "Materials Collected by Leader".
            </p>
            <p v-else class="mt-1 text-xs text-emerald-800">
              No materials listed yet for this request.
            </p>
          </div>

          <div v-if="props.allowUserRequestActions" class="mt-4 flex items-center justify-between gap-3">
            <button
              v-if="isStatus(req, 'pending')"
              type="button"
              class="text-xs font-semibold text-rose-600 hover:underline"
              @click="cancelRequest(req)"
            >
              Cancel Request
            </button>
            <span v-else class="text-xs text-gray-400"></span>

            <a
              v-if="req.latest_invoice?.invoice_url"
              :href="invoiceViewUrl(req)"
              @click.prevent="openInvoice(req)"
              class="inline-flex rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              Open Invoice
            </a>
          </div>

          <div v-if="isStatus(req, 'completed')" class="mt-4">
            <p class="text-sm font-semibold text-emerald-700">Job Completed</p>
            <div v-if="req.proofs && req.proofs.length" class="mt-2">
              <p class="text-xs uppercase tracking-wide text-gray-400">Proofs</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="proof in req.proofs"
                  :key="`proof-${req.id}-${proof.id}`"
                  type="button"
                  class="group relative rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm hover:shadow"
                  @click="openProof(proof)"
                >
                  <img
                    v-if="isImage(proof.url)"
                    :src="proof.url"
                    :alt="proof.filename || 'Proof'"
                    class="h-16 w-16 rounded-md object-cover"
                  />
                  <div v-else class="flex h-16 w-16 items-center justify-center rounded-md bg-slate-50 text-[10px] font-semibold text-slate-600">
                    FILE
                  </div>
                  <span class="mt-1 block max-w-[72px] truncate text-[10px] text-slate-500">
                    {{ proof.filename || 'Proof' }}
                  </span>
                </button>
              </div>
            </div>
            <p v-else class="mt-2 text-xs text-slate-500">No proofs uploaded.</p>

            <div v-if="props.allowPaymentLogging" class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="text-[11px] uppercase tracking-wide text-emerald-700">Payment & Revenue Split</p>
                  <p class="text-xs text-emerald-900 mt-1">
                    Channel: <span class="font-semibold">{{ paymentChannelLabel(req) }}</span>
                    <span class="mx-1">|</span>
                    Gross: <span class="font-semibold">{{ money(req.total_amount || 0) }}</span>
                  </p>
                  <p class="text-xs text-emerald-900 mt-1">
                    Method: <span class="font-semibold">{{ paymentMethodLabel(req) }}</span>
                    <span class="mx-1">|</span>
                    Receipt Ref: <span class="font-semibold">{{ paymentReceiptReference(req) }}</span>
                  </p>
                </div>
                <span
                  v-if="isPaymentLogged(req)"
                  class="inline-flex rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                >
                  Logged
                </span>
                <button
                  v-else
                  type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  :disabled="loggingPaymentId === Number(req.id)"
                  @click="logPayment(req)"
                >
                  {{ loggingPaymentId === Number(req.id) ? 'Logging...' : 'Log Payment' }}
                </button>
              </div>
              <p class="mt-2 text-[11px] text-emerald-900/80">
                System split: 60% employees, 40% business. Payment status should be logged by the assigned team leader.
              </p>
              <p v-if="isPaymentLogged(req)" class="mt-1 text-[11px] font-semibold text-emerald-800">
                Receipt generated and earnings posted.
              </p>
            </div>
          </div>

          <div v-if="isStatus(req, 'rejected') && req.notes" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p class="text-[11px] uppercase tracking-wide text-rose-500">Rejection Note</p>
            <p class="text-sm text-rose-700 font-medium mt-1">{{ req.notes }}</p>
          </div>

          <div v-if="isStatus(req, 'warranty_pending')" class="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-fuchsia-600">Warranty Claim</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">Customer reported a follow-up issue within warranty.</p>
              </div>
              <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700">
                {{ warrantyStatusText(req) }}
              </span>
            </div>
            <div v-if="req.warranty_claim?.notes || req.notes" class="mt-3 rounded-lg border border-fuchsia-200 bg-white/80 p-3 text-sm text-slate-700">
              <p class="text-[11px] uppercase tracking-wide text-fuchsia-500">Claim Notes</p>
              <p class="mt-1 whitespace-pre-wrap">{{ req.warranty_claim?.notes || req.notes }}</p>
            </div>
            <div class="mt-3 flex flex-wrap gap-2" v-if="props.allowDecisionActions">
              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                @click="resolveWarrantyClaim(req, 'approve')"
              >
                Approve Free Repair
              </button>
              <button
                type="button"
                class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
                @click="resolveWarrantyClaim(req, 'reject')"
              >
                Reject Claim
              </button>
            </div>
            <p v-else class="mt-3 text-sm font-medium text-fuchsia-700">
              Warranty claim is pending review.
            </p>
          </div>

          <div v-else-if="isStatus(req, 'warranty_rework')" class="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-sky-600">Warranty Repair</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">Claim approved. Reopen the job as a free follow-up repair.</p>
              </div>
              <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                {{ warrantyStatusText(req) }}
              </span>
            </div>
            <p class="mt-3 text-sm text-slate-600">
              This repair should not create a new customer charge.
            </p>
            <div v-if="props.showStartJob" class="mt-3">
              <button
                type="button"
                @click="startJob(req)"
                class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Start Free Repair
              </button>
            </div>
            <p v-else class="mt-3 text-sm font-medium text-slate-600">
              Free repair is approved and waiting for the assigned lead to start.
            </p>
          </div>

          <div v-if="isStatus(req, 'assigned') && !props.allowDecisionActions" class="mt-4 text-sm text-sky-700 font-medium">
            This request is assigned. Status updates are view-only here.
          </div>

          <div
            v-else-if="isStatus(req, 'assigned') && props.allowDecisionActions && isTeamWorkflowRequest(req) && !canTeamLeaderAct(req)"
            class="mt-4 text-sm text-amber-700 font-medium"
          >
            Waiting for team leader confirmation.
          </div>

          <div v-else-if="isStatus(req, 'assigned') && props.allowDecisionActions && !isTeamWorkflowRequest(req)" class="mt-4 flex items-center gap-2">
            <button
              @click="confirmUpdate(req, 'awaiting_material')"
              class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              {{ isTeamWorkflowRequest(req) ? 'Leader Accept' : 'Accept & Start Materials Pickup' }}
            </button>
            <button
              v-if="isTeamWorkflowRequest(req)"
              @click="requestReassignment(req)"
              class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Request Reassignment
            </button>
            <button
              v-else
              @click="confirmUpdate(req, 'rejected')"
              class="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Reject
            </button>
          </div>

          <div v-else-if="canMarkMaterialsCollected(req)" class="mt-4">
            <button
              type="button"
              @click="markMaterialsCollected(req)"
              class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Materials Collected by Leader
            </button>
          </div>

          <div v-else-if="canMarkMaterialsCollectedByProvider(req)" class="mt-4">
            <button
              type="button"
              @click="markMaterialsCollected(req)"
              class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Materials Collected
            </button>
          </div>

          <div v-else-if="canDispatchAssign(req)" class="mt-4">
            <button
              type="button"
              @click="dispatchTeam(req)"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Assign Dispatch Team
            </button>
            <p class="mt-2 text-[11px] text-slate-500">
              Select 3 linked employees for this inspection dispatch.
            </p>
          </div>

          <div v-else-if="isStatus(req, 'awaiting_material')" class="mt-4 text-sm text-purple-600 font-medium">
            {{ awaitingMaterialMessage(req) }}
          </div>

          <div v-else-if="isStatus(req, 'job_ready') && props.showStartJob" class="mt-4">
            <div class="rounded-xl border border-sky-100 bg-sky-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Status 1</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">Arrived at Location</p>
              <p class="mt-1 text-xs text-slate-600">Confirm arrival after materials and equipment are ready.</p>
              <button
                type="button"
                @click="startJob(req)"
                class="mt-3 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
              >
                Mark Arrived
              </button>
            </div>
          </div>

          <div v-else-if="isStatus(req, 'job_ready') && !props.showStartJob" class="mt-4 text-slate-600 text-sm font-medium">
            Job is ready. Awaiting HR queue action.
          </div>

          <div v-else-if="isStatus(req, 'in_progress') && props.showCompleteJob" class="mt-4 space-y-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Live Field Status</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{{ liveReportStageLabel(req) }}</p>
            </div>

            <div v-if="showWorkInProgressForm(req)" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Status 2</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">Work in Progress</p>
              <p class="mt-1 text-xs text-slate-600">Upload before photos first, then mark the work as in progress.</p>
              <div class="mt-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Upload Before Photos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  @change="onBeforeFileChange($event, req)"
                  class="block w-full text-sm text-gray-500"
                />
                <p class="text-xs text-gray-400 mt-1">
                  At least one before photo is required.
                </p>
                <div v-if="uploadedBeforeFiles(req).length" class="mt-2 space-y-1">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] uppercase tracking-wide text-gray-400">Before Photos</p>
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-rose-600 hover:underline"
                      @click="clearUploadedBeforeFiles(req)"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul class="space-y-1 text-xs text-gray-600">
                    <li
                      v-for="(file, idx) in uploadedBeforeFiles(req)"
                      :key="`${req.id}-before-file-${idx}`"
                      class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1"
                    >
                      <span class="truncate">{{ file.name }}</span>
                      <button
                        type="button"
                        class="shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                        @click="removeUploadedBeforeFile(req, idx)"
                      >
                        Remove
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                @click="markWorkInProgress(req)"
                class="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
              >
                Mark Work in Progress
              </button>
            </div>

            <div v-if="showCompletionForm(req)">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Upload After Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                @change="onFileChange($event, req)"
                class="block w-full text-sm text-gray-500"
              />
              <p class="text-xs text-gray-400 mt-1">
                Upload the final after photos before submitting the completion report.
              </p>
              <div v-if="uploadedFiles(req).length" class="mt-2 space-y-1">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] uppercase tracking-wide text-gray-400">After Photos</p>
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-rose-600 hover:underline"
                    @click="clearUploadedFiles(req)"
                  >
                    Clear all
                  </button>
                </div>
                <ul class="space-y-1 text-xs text-gray-600">
                  <li
                    v-for="(file, idx) in uploadedFiles(req)"
                    :key="`${req.id}-file-${idx}`"
                    class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
                  >
                    <span class="truncate">{{ file.name }}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                      @click="removeUploadedFile(req, idx)"
                    >
                      Remove
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Materials Used
              </label>
              <textarea
                v-model.trim="completionFields(req).materials_used"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows="3"
                placeholder="List the materials consumed during this job"
              ></textarea>
            </div>

            <div class="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Condition
                </label>
                <input
                  v-model.trim="completionFields(req).equipment_condition"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Good, Needs Maintenance"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Inspection Result
                </label>
                <select
                  v-model="completionFields(req).inspection_result"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select result</option>
                  <option value="minor">Minor Issue</option>
                  <option value="major">Major Issue</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Completion Time
                </label>
                <input
                  v-model="completionFields(req).completion_time"
                  type="datetime-local"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              @click="completeJob(req)"
              class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Status 3: Work Completed
            </button>
            </div>
          </div>

          <div v-else-if="isStatus(req, 'in_progress') && !props.showCompleteJob" class="mt-4 text-slate-600 text-sm font-medium">
            Job is in progress. Completion is handled in HR queue.
          </div>

          <div v-if="canArchive(req) || canRestore(req)" class="mt-4 flex items-center gap-2">
            <button
              v-if="canArchive(req)"
              type="button"
              class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold"
              @click="archiveRequest(req)"
            >
              Archive
            </button>
            <button
              v-if="canRestore(req)"
              type="button"
              class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold"
              @click="restoreRequest(req)"
            >
              Restore
            </button>
          </div>

        </div>
      </div>

      <div v-else-if="props.assignedRequests.length" class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p class="text-base font-semibold text-gray-700">No requests matched your filter</p>
        <p class="text-sm text-gray-500 mt-1">{{ emptyStateText }}</p>
      </div>
      <p v-else class="text-gray-500 italic mt-4">
        No assigned requests found.
      </p>
    </div>

    <div v-if="showProofModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/60" @click="closeProofModal"></div>
      <div class="relative mx-4 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <p class="text-sm font-semibold text-slate-800">{{ activeProof?.filename || 'Proof' }}</p>
          <button type="button" class="text-slate-500 hover:text-slate-700" @click="closeProofModal">Close</button>
        </div>
        <div class="mt-4 flex items-center justify-center">
          <img v-if="activeProof && isImage(activeProof.url)" :src="activeProof.url" class="max-h-[70vh] w-auto rounded-lg" />
          <a
            v-else-if="activeProof?.url"
            :href="activeProof.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:underline"
          >
            Open File
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineProps, defineEmits, reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'

const props = defineProps({
  assignedRequests: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  title: { type: String, default: 'Service Requests' },
  subtitle: { type: String, default: 'Track every stage in one place.' },
  forcedStatuses: { type: Array, default: () => [] },
  allowDecisionActions: { type: Boolean, default: false },
  showStartJob: { type: Boolean, default: false },
  showCompleteJob: { type: Boolean, default: false },
  allowArchiveActions: { type: Boolean, default: false },
  allowUserRequestActions: { type: Boolean, default: false },
  allowPaymentLogging: { type: Boolean, default: false },
  allowDispatchAssign: { type: Boolean, default: false },
  dispatchEmployees: { type: Array, default: () => [] },
})

const emit = defineEmits(['refresh-data', 'archive-request', 'restore-request', 'archive-many', 'request-cancelled', 'request-accepted', 'dispatch-assigned'])
const statusFilter = ref('all')
const searchText = ref('')
const sortMode = ref('latest')
const businessFilter = ref('all')
const showArchived = ref(false)
const selectedIds = ref([])
const loggingPaymentId = ref(null)
const loggedPaymentRequestIds = ref(new Set())
const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

const emitRefresh = () => emit('refresh-data')

const isStatus = (req, status) => String(req.status || '').toLowerCase() === status
const isTeamWorkflowRequest = (req) => {
  if (!req || typeof req !== 'object') return false
  if (Boolean(req.has_team_context)) return true
  if (Boolean(req.pending_team_leader_confirmation)) return true
  return String(req.team_leader_confirmation_status || '').trim() !== ''
}
const canTeamLeaderAct = (req) => {
  if (!props.allowDecisionActions) return false
  if (!isTeamWorkflowRequest(req)) return true
  if (req?.current_user_is_team_leader === true) return true
  return Boolean(props.showStartJob)
}
const canMarkMaterialsCollected = (req) =>
  (isStatus(req, 'awaiting_material') || isStatus(req, 'assigned'))
  && isTeamWorkflowRequest(req)
  && canTeamLeaderAct(req)
  && !Boolean(req?.materials_collected)

const canMarkMaterialsCollectedByProvider = (req) =>
  isStatus(req, 'awaiting_material')
  && !isTeamWorkflowRequest(req)
  && !Boolean(req?.materials_collected)
const requestMaterials = (req) => {
  if (!Array.isArray(req?.materials)) return []
  return req.materials
    .map((material) => ({
      id: material?.id || null,
      name: String(material?.name || '').trim(),
      quantity: Math.max(1, Number(material?.quantity || 1)),
      unit: String(material?.unit || 'pcs').trim() || 'pcs',
      notes: String(material?.notes || '').trim(),
    }))
    .filter((material) => material.name !== '')
}
const shouldShowMaterialsList = (req) => {
  const status = String(req?.status || '').toLowerCase()
  if (['job_ready', 'in_progress', 'completed'].includes(status)) return true
  return Boolean(req?.materials_collected)
}
const teamLeaderConfirmationLabel = (req) => {
  const value = String(req?.team_leader_confirmation_status || '').trim().toLowerCase()
  if (value === 'pending') return 'Pending Team Leader Decision'
  if (value === 'accepted') return 'Accepted by Team Leader'
  if (value === 'reassignment_requested') return 'Reassignment Requested'
  return 'Not required'
}
const awaitingMaterialMessage = (req) => {
  if (isTeamWorkflowRequest(req) && !canTeamLeaderAct(req)) {
    return 'Team leader needs to confirm material collection first.'
  }
  if (Boolean(req?.materials_collected)) {
    return 'Materials collected. Proceeding to arrival and inspection.'
  }
  return 'Picking up required materials for inspection.'
}

const hasAssignedInspector = (req) => {
  const employeeId = Number(req?.employee_id || 0)
  if (Number.isFinite(employeeId) && employeeId > 0) return true
  if (Array.isArray(req?.dispatch_employee_ids) && req.dispatch_employee_ids.length) return true
  if (String(req?.assigned_employee_name || '').trim()) return true
  if (String(req?.assigned_team || '').trim()) return true
  return false
}

const dispatchTeamNames = (req) => {
  const raw = String(req?.assigned_employee_name || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
}

const dispatchTeamLabel = (req) => {
  const names = dispatchTeamNames(req)
  if (names.length) return names.join(', ')
  return 'Auto-assign queued'
}

const dispatchTeamSubLabel = (req) => {
  const names = dispatchTeamNames(req)
  if (!names.length) return 'Will assign 3 linked employees after accept.'
  return 'Assigned — ready to dispatch'
}

const shouldShowPaymentType = (req) => {
  if (!isStatus(req, 'completed')) return false
  const paymentStatus = String(req?.payment_status || '').trim().toLowerCase()
  const invoiceStatus = String(req?.latest_invoice?.status || '').trim().toLowerCase()
  if (paymentStatus === 'paid' || invoiceStatus === 'paid') return true
  return isPaymentLogged(req)
}

const canDispatchAssign = (req) => {
  if (!props.allowDispatchAssign) return false
  if (!isStatus(req, 'awaiting_material')) return false
  return !hasAssignedInspector(req)
}

const dispatchTeam = async (req) => {
  const rawEmployees = Array.isArray(props.dispatchEmployees) ? props.dispatchEmployees : []
  const availableEmployees = rawEmployees
    .map((emp) => ({
      id: Number(emp?.id || 0),
      name: String(emp?.name || '').trim() || 'Employee',
      role: String(emp?.role || '').trim() || 'staff',
      active_jobs: Number(emp?.active_jobs || 0),
    }))
    .filter((emp) => Number.isFinite(emp.id) && emp.id > 0)

  if (availableEmployees.length < 3) {
    Swal.fire('Not enough employees', 'You need at least 3 linked employees to dispatch.', 'info')
    return
  }

  const listHtml = availableEmployees.map((emp) => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0">
      <input type="checkbox" name="dispatch-emp" value="${emp.id}" />
      <span style="font-size:13px;color:#0f172a">
        ${emp.name} <span style="color:#64748b;font-size:11px">(${emp.role}, active: ${emp.active_jobs})</span>
      </span>
    </label>
  `).join('')

  const popup = await Swal.fire({
    title: 'Assign dispatch team',
    html: `
      <div style="text-align:left">
        <p style="font-size:12px;color:#64748b;margin:0 0 8px">Select exactly 3 employees for this inspection.</p>
        <div style="max-height:260px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;padding:8px">
          ${listHtml}
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Dispatch Team',
    preConfirm: () => {
      const checked = Array.from(document.querySelectorAll('input[name="dispatch-emp"]:checked'))
        .map((el) => Number(el.value))
        .filter((id) => Number.isFinite(id) && id > 0)
      if (checked.length !== 3) {
        Swal.showValidationMessage('Please select exactly 3 employees.')
        return false
      }
      return checked
    },
  })

  if (!popup.isConfirmed || !popup.value) return

  try {
    await axios.post(`/service-provider/service-requests/${req.id}/dispatch-team`, {
      employee_ids: popup.value,
    })
    Swal.fire('Dispatched', 'Team assigned. This request will appear in Service Requests as Materials Pickup.', 'success')
    emitRefresh()
    emit('dispatch-assigned', req)
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to dispatch team.', 'error')
  }
}
const INVOICE_LOADING_DELAY_MS = 600

const invoiceViewUrl = (req) => {
  const invoice = req?.latest_invoice
  if (invoice?.id) return `/payment/return?invoice_id=${encodeURIComponent(invoice.id)}`
  return invoice?.invoice_url || '#'
}
const openInvoice = (req) => {
  const url = invoiceViewUrl(req)
  if (!url || url === '#') return
  window.__appGlobalLoader?.start?.()
  setTimeout(() => window.location.assign(url), INVOICE_LOADING_DELAY_MS)
}

const normalizedRequests = computed(() => {
  const base = (props.assignedRequests || []).filter((r) => {
    if (!props.forcedStatuses?.length) return true
    const s = String(r.status || '').toLowerCase()
    return props.forcedStatuses.map(x => String(x).toLowerCase()).includes(s)
  })
  return base.map(r => ({
    ...r,
    customer_name: fullName(r),
    business_name: String(r?.business_name || r?.business?.business_name || '').trim(),
  }))
})

const businessOptions = computed(() =>
  [...new Set(
    normalizedRequests.value
      .map(r => r.business_name)
      .filter(name => !!name && name !== 'N/A')
  )].sort((a, b) => a.localeCompare(b))
)

const filteredAssignedRequests = computed(() => {
  const keyword = searchText.value.toLowerCase()
  return normalizedRequests.value.filter((r) => {
    const s = String(r.status || '').toLowerCase()
    const archived = !!r.archived_at
    if (!showArchived.value && archived) return false
    if (statusFilter.value === 'active' && ['completed', 'rejected', 'cancelled'].includes(s)) return false
    if (statusFilter.value === 'completed' && s !== 'completed') return false
    if (statusFilter.value === 'rejected' && s !== 'rejected') return false
    if (businessFilter.value !== 'all' && String(r.business_name || '') !== businessFilter.value) return false
    if (!keyword) return true
    const customerMatch = String(r.customer_name || '').toLowerCase().includes(keyword)
    const businessMatch = String(r.business_name || '').toLowerCase().includes(keyword)
    return customerMatch || businessMatch
  })
})

const parseTime = (value) => {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

const sortedAssignedRequests = computed(() => {
  const list = [...filteredAssignedRequests.value]
  if (sortMode.value === 'oldest') {
    return list.sort((a, b) => parseTime(a.created_at) - parseTime(b.created_at))
  }
  if (sortMode.value === 'status') {
    return list.sort((a, b) => prettyStatus(a.status).localeCompare(prettyStatus(b.status)))
  }
  return list.sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at))
})

const emptyStateText = computed(() => {
  const label = filterOptions.find(x => x.value === statusFilter.value)?.label || 'All'
  if (searchText.value) return `No "${searchText.value}" result found under ${label}.`
  if (businessFilter.value !== 'all') return `No requests found for ${businessFilter.value}.`
  return 'Try another filter or click Refresh.'
})

const stats = computed(() => {
  const total = normalizedRequests.value.length
  const open = normalizedRequests.value.filter(r => !['completed', 'rejected', 'cancelled'].includes(String(r.status || '').toLowerCase())).length
  const completed = normalizedRequests.value.filter(r => String(r.status || '').toLowerCase() === 'completed').length
  return { total, open, completed }
})

const fullName = (req) => {
  const middle = req.middle_initial ? `${req.middle_initial}. ` : ''
  return `${req.first_name || ''} ${middle}${req.last_name || ''}`.trim()
}

const primaryEntityLabel = (req) => {
  if (String(req?.business_name || '').trim() && String(req?.business_name || '').trim() !== 'N/A') {
    return 'Business'
  }
  return 'Customer'
}

const primaryEntityName = (req) => {
  if (primaryEntityLabel(req) === 'Business') return req.business_name
  return fullName(req)
}

const clearFilters = () => {
  statusFilter.value = 'all'
  businessFilter.value = 'all'
  sortMode.value = 'latest'
  searchText.value = ''
  showArchived.value = false
  selectedIds.value = []
}

const cancelRequest = async (req) => {
  const confirm = await Swal.fire({
    title: 'Cancel request?',
    text: 'You can only cancel while it is still pending.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel',
  })
  if (!confirm.isConfirmed) return

  try {
    await axios.post(`/user/service-requests/${req.id}/cancel`)
    Swal.fire({
      icon: 'success',
      title: 'Cancelled',
      text: 'Your request was cancelled.',
      timer: 1000,
      showConfirmButton: false,
    })
    emit('request-cancelled', { id: req.id, status: 'cancelled' })
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err.response?.data?.error || 'Failed to cancel request', 'error')
  }
}

const canArchive = (req) => {
  if (!props.allowArchiveActions) return false
  if (req?.archived_at) return false
  const status = String(req?.status || '').toLowerCase()
  return ['completed', 'cancelled', 'rejected'].includes(status)
}

const canRestore = (req) => props.allowArchiveActions && !!req?.archived_at

const archiveRequest = (req) => emit('archive-request', req)
const restoreRequest = (req) => emit('restore-request', req)
const archiveMany = (ids) => emit('archive-many', ids)

const selectableIds = computed(() =>
  sortedAssignedRequests.value.filter((r) => canArchive(r)).map((r) => Number(r.id))
)

const selectedArchiveCount = computed(() =>
  selectedIds.value.filter((id) => selectableIds.value.includes(Number(id))).length
)

const isSelected = (req) => selectedIds.value.includes(Number(req.id))

const toggleSelected = (req) => {
  const id = Number(req.id)
  if (!canArchive(req)) return
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
    return
  }
  selectedIds.value = [...selectedIds.value, id]
}

const selectAllVisible = () => {
  selectedIds.value = [...new Set([...selectedIds.value, ...selectableIds.value])]
}

const clearSelection = () => {
  selectedIds.value = []
}

const archiveSelected = () => {
  if (!selectedArchiveCount.value) return
  archiveMany(selectedIds.value.filter((id) => selectableIds.value.includes(Number(id))))
  selectedIds.value = []
}

const archiveAllVisible = () => {
  if (!selectableIds.value.length) return
  archiveMany(selectableIds.value)
  selectedIds.value = []
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const normalizeTimeText = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match24) return raw
  const h24 = Number(match24[1])
  const min = String(match24[2]).padStart(2, '0')
  if (!Number.isFinite(h24)) return raw
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${String(h12).padStart(2, '0')}:${min} ${suffix}`
}

const serviceTimeLabel = (req) => {
  const raw = String(req?.service_time || '').trim()
  if (!raw || raw === 'N/A') return 'N/A'
  return normalizeTimeText(raw)
}


const managementModeLabel = (mode) => {
  const m = String(mode || '').toLowerCase().trim()
  if (m === 'hr') return 'HR-Managed'
  if (m === 'business') return 'Business-Managed'
  return 'Not set'
}

const amountValue = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const money = (value, currency = 'PHP') => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
  }).format(amountValue(value))
}

const displayContactNumber = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'N/A'
  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw
  if (digits.startsWith('63') && digits.length >= 11) return `0${digits.slice(2)}`
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`
  if (digits.startsWith('0')) return digits
  return raw
}

const addressParts = (req) => {
  const raw = String(req?.address_text || '').trim()
  if (!raw) return { house: '', barangay: '', city: '', zip: '' }
  const segments = raw.split(',').map((part) => part.trim()).filter(Boolean)
  const house = segments[0] || ''
  const barangayRaw = segments.find((part) => /brgy/i.test(part)) || ''
  const barangay = barangayRaw.replace(/brgy\.?/i, '').trim()
  const zipMatch = raw.match(/\b\d{4}\b/)
  const zip = zipMatch ? zipMatch[0] : ''
  let city = ''
  const caviteIndex = segments.findIndex((part) => /cavite/i.test(part))
  if (caviteIndex > 0) {
    city = segments[caviteIndex - 1] || ''
  } else if (segments.length >= 2) {
    city = segments[segments.length - 2] || ''
  }
  return { house, barangay, city, zip }
}

const paymentChannelLabel = (req) => {
  const raw = String(req?.payment_channel || '').trim().toLowerCase()
  if (raw === 'e_wallet') return 'E-Wallet'
  if (raw === 'card') return 'Card'
  if (raw === 'cash') return 'Cash'
  return 'Not logged'
}

const paymentMethodLabel = (req) => {
  const raw = String(req?.payment_method || '').trim().toLowerCase()
  if (raw === 'gcash') return 'GCash'
  if (raw === 'bank_transfer') return 'Bank Transfer'
  if (raw === 'cash' || raw === 'personal') return 'Cash'
  return 'Cash'
}

const paymentTypeLabel = (req) => {
  const method = String(req?.payment_method || '').trim().toLowerCase()
  const channel = String(req?.payment_channel || '').trim().toLowerCase()
  if (channel === 'gcash') return 'GCash'
  if (channel === 'bank_transfer') return 'Bank Transfer'
  if (method === 'gcash') return 'GCash'
  if (method === 'bank_transfer') return 'Bank Transfer'
  if (method === 'cash' || method === 'personal') return 'Cash'
  if (['downpayment', 'full'].includes(method)) {
    return channel === 'gcash' ? 'GCash'
      : channel === 'bank_transfer'
        ? 'Bank Transfer'
        : 'Cash'
  }
  return 'Cash'
}

const paymentReceiptReference = (req) => {
  const direct = String(req?.receipt_reference || req?.payment_reference || '').trim()
  if (direct) return direct
  const invoice = req?.latest_invoice || {}
  return String(invoice?.reference || invoice?.external_id || invoice?.id || '').trim() || 'Pending'
}

const mapSearchUrl = (req) => {
  const address = String(req?.address_text || '').trim()
  if (!address) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const isPaymentLogged = (req) => {
  const id = Number(req?.id)
  if (!Number.isFinite(id) || id <= 0) return false
  const status = String(req?.payment_status || '').trim().toLowerCase()
  if (status === 'paid') return true
  return loggedPaymentRequestIds.value.has(id)
}

const logPayment = async (req) => {
  const requestId = Number(req?.id)
  if (!Number.isFinite(requestId) || requestId <= 0) return
  if (isPaymentLogged(req)) return

  const popup = await Swal.fire({
    title: 'Log customer payment',
    html: `
      <div style="display:grid;gap:10px;text-align:left">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Amount</label>
          <input id="swal-payment-amount" type="number" min="0" step="0.01" value="${amountValue(req?.total_amount || 0)}"
            style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Payment Type</label>
          <select id="swal-payment-channel" style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px">
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Employee Split</label>
          <select id="swal-split-mode" style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px">
            <option value="equal">Equal</option>
            <option value="weighted">Weighted</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Save payment',
    preConfirm: () => {
      const amountRaw = document.getElementById('swal-payment-amount')?.value
      const channel = document.getElementById('swal-payment-channel')?.value
      const splitMode = document.getElementById('swal-split-mode')?.value
      const amount = Number(amountRaw)
      if (!Number.isFinite(amount) || amount <= 0) {
        Swal.showValidationMessage('Enter a valid amount greater than zero.')
        return false
      }
      if (!['cash', 'gcash', 'bank_transfer'].includes(String(channel || ''))) {
        Swal.showValidationMessage('Select a valid payment type.')
        return false
      }
      if (!['equal', 'weighted'].includes(String(splitMode || ''))) {
        Swal.showValidationMessage('Select a valid split mode.')
        return false
      }
      return { amount, channel, splitMode }
    },
  })

  if (!popup.isConfirmed || !popup.value) return

  loggingPaymentId.value = requestId
  try {
    const res = await axios.post(`/service-provider/service-requests/${requestId}/log-payment`, {
      amount: popup.value.amount,
      channel: popup.value.channel,
      split_mode: popup.value.splitMode,
    })
    loggedPaymentRequestIds.value.add(requestId)
    const payload = res?.data?.data || {}
    Swal.fire(
      'Payment logged',
      `Business share: ${money(payload.business_share_amount || 0)} | Employee pool: ${money(payload.employee_pool_amount || 0)}`,
      'success'
    )
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to log payment.', 'error')
  } finally {
    loggingPaymentId.value = null
  }
}

const formatDateTime = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const lastStatusLabel = (req) => {
  const stamp = req.updated_at || req.created_at
  if (!stamp) return 'Just now'
  const label = formatDateTime(stamp)
  if (label === 'N/A') return 'Just now'
  return `${label} (${timeAgo(stamp)})`
}

const prettyStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'awaiting_material') return 'Awaiting Materials'
  if (s === 'in_progress') return 'Work in Progress'
  if (s === 'job_ready') return 'Ready for Dispatch'
  if (s === 'assigned') return 'Awaiting Acceptance'
  return status || 'N/A'
}

const liveReportStage = (req) => String(req?.live_report_stage || '').trim().toLowerCase()
const liveReportStageLabel = (req) => {
  const stage = liveReportStage(req)
  if (stage === 'arrived') return 'Status 1: Arrived at Location'
  if (stage === 'work_in_progress') return 'Status 2: Work in Progress'
  if (stage === 'completed') return 'Status 3: Work Completed'
  if (normalizeStatus(req?.status) === 'job_ready') return 'Waiting for arrival confirmation'
  return 'Preparing field update'
}

const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'accepted') return 'approved'
  if (s === 'ongoing') return 'in_progress'
  return s
}

const providerFlow = ['assigned', 'awaiting_material', 'job_ready', 'in_progress', 'completed']
const providerLabel = {
  assigned: 'Awaiting Acceptance',
  awaiting_material: 'Awaiting Materials',
  job_ready: 'Ready for Dispatch',
  in_progress: 'Work in Progress',
  completed: 'Completed',
  rejected: 'Rejected'
}

const providerTimeline = (status) => {
  const current = normalizeStatus(status)

  if (current === 'rejected') {
    return [
      { key: 'assigned', label: providerLabel.assigned, state: 'done' },
      { key: 'rejected', label: providerLabel.rejected, state: 'current' }
    ]
  }

  const idx = providerFlow.indexOf(current)
  if (idx === -1) {
    return [{ key: current || 'unknown', label: prettyStatus(status), state: 'current' }]
  }

  return providerFlow.map((key, i) => ({
    key,
    label: providerLabel[key] || key,
    state: i < idx ? 'done' : (i === idx ? 'current' : 'todo')
  }))
}

const providerProgressPercent = (status) => {
  const current = normalizeStatus(status)
  if (current === 'rejected') return 100
  const idx = providerFlow.indexOf(current)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / providerFlow.length) * 100)
}

const providerCurrentStep = (status) => {
  const current = normalizeStatus(status)
  if (current === 'rejected') return 2
  const idx = providerFlow.indexOf(current)
  return idx === -1 ? 1 : (idx + 1)
}

const providerTotalSteps = (status) => {
  const current = normalizeStatus(status)
  if (current === 'rejected') return 2
  return providerFlow.length
}

const providerProgressBarClass = (status) => {
  const s = normalizeStatus(status)
  if (s === 'rejected') return 'bg-rose-500'
  if (s === 'completed') return 'bg-emerald-500'
  if (s === 'in_progress') return 'bg-indigo-500'
  if (s === 'job_ready') return 'bg-cyan-500'
  if (s === 'awaiting_material') return 'bg-orange-500'
  return 'bg-sky-500'
}

const providerStageDescription = (key) => ({
  assigned: 'Request is assigned to you. Accept it first so materials pickup and readiness checks can begin.',
  awaiting_material: 'Required materials are still being prepared before dispatch.',
  job_ready: 'Materials and payment gates are cleared. Dispatch can proceed.',
  in_progress: 'Work is now being performed after inspection.',
  completed: 'Job is finished and submitted as complete.',
  rejected: 'You rejected this assignment.'
}[key] || 'Status update.')

const openProviderStageInfo = (key, req) => {
  Swal.fire({
    title: providerLabel[key] || prettyStatus(req.status),
    text: providerStageDescription(key),
    footer: `Current status: ${prettyStatus(req.status)} | Last update: ${formatDateTime(req.updated_at || req.created_at)}`,
    icon: 'info',
    confirmButtonText: 'OK'
  })
}

const timelineClass = (state) => {
  if (state === 'done') return 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm hover:brightness-95'
  if (state === 'current') return 'bg-sky-600 text-white border border-sky-600 shadow-sm animate-pulse'
  return 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
}

const statusClass = (status) => {
  const s = String(status || '').toLowerCase()
  return {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    assigned: 'bg-blue-50 text-blue-700',
    awaiting_material: 'bg-purple-50 text-purple-700',
    job_ready: 'bg-teal-50 text-teal-700',
    in_progress: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    cancelled: 'bg-slate-100 text-slate-600',
    warranty_pending: 'bg-fuchsia-50 text-fuchsia-700',
    warranty_rework: 'bg-sky-50 text-sky-700',
  }[s] || 'bg-gray-100 text-gray-700'
}

const isImage = (url) => {
  if (!url) return false
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)
}

const showProofModal = ref(false)
const activeProof = ref(null)

const openProof = (proof) => {
  activeProof.value = proof
  showProofModal.value = true
}

const closeProofModal = () => {
  showProofModal.value = false
  activeProof.value = null
}

const cardAccentClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'rejected') return 'border-l-rose-500'
  if (s === 'cancelled') return 'border-l-slate-400'
  if (s === 'pending') return 'border-l-amber-500'
  if (s === 'approved' || s === 'accepted') return 'border-l-emerald-500'
  if (s === 'completed') return 'border-l-emerald-500'
  if (s === 'in_progress') return 'border-l-indigo-500'
  if (s === 'job_ready') return 'border-l-cyan-500'
  if (s === 'awaiting_material') return 'border-l-orange-500'
  if (s === 'warranty_pending') return 'border-l-fuchsia-500'
  if (s === 'warranty_rework') return 'border-l-sky-500'
  return 'border-l-sky-500'
}

const providerNow = new Date()
const warrantyStatusText = (req) => {
  const status = String(req?.warranty_status || '').trim().toLowerCase()
  if (status === 'claimed') return 'Warranty claim filed'
  if (status === 'rework_scheduled') return 'Free repair scheduled'
  if (status === 'rejected') return 'Warranty claim rejected'
  if (status === 'active') return 'Warranty active'
  return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Warranty'
}

const resolveWarrantyClaim = async (req, decision) => {
  const action = String(decision || '').toLowerCase() === 'reject' ? 'reject' : 'approve'
  let reason = null

  if (action === 'approve') {
    const prompt = await Swal.fire({
      title: 'Approve warranty repair?',
      text: 'This reopens the request as a free follow-up repair.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve repair',
    })
    if (!prompt.isConfirmed) return
  } else {
    const prompt = await Swal.fire({
      title: 'Reject warranty claim?',
      text: 'Please explain why the issue is outside warranty coverage.',
      input: 'textarea',
      inputPlaceholder: 'Reason for rejection',
      showCancelButton: true,
      confirmButtonText: 'Reject claim',
      inputValidator: (value) => {
        if (!String(value || '').trim()) return 'Reason is required'
        return null
      },
    })
    if (!prompt.isConfirmed) return
    reason = String(prompt.value || '').trim()
  }

  try {
    await axios.post(`/service-requests/${req.id}/warranty-claim/resolve`, {
      action,
      reason,
    })
    Swal.fire(
      'Saved',
      action === 'approve'
        ? 'Warranty approved. The request is now reopened for free repair.'
        : 'Warranty claim rejected.',
      'success'
    )
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.message || 'Failed to resolve warranty claim.', 'error')
  }
}

const confirmUpdate = async (req, status) => {
  const actionLabel = status === 'rejected' ? 'Reject' : 'Accept'
  let rejectionReason = null

  if (status === 'accepted' || status === 'awaiting_material') {
    const confirmAccept = await Swal.fire({
      title: 'Accept request and continue readiness flow?',
      text: 'This will move the request into materials pickup and dispatch readiness.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Accept request',
    })
    if (!confirmAccept.isConfirmed) return
  }

  if (status === 'rejected') {
    const reasonPrompt = await Swal.fire({
      title: 'Reject request?',
      text: 'Please provide a reason for rejection.',
      input: 'textarea',
      inputPlaceholder: 'Enter rejection reason',
      showCancelButton: true,
      confirmButtonText: 'Reject request',
      inputValidator: (value) => {
        if (!String(value || '').trim()) return 'Reason is required'
        return null
      },
    })
    if (!reasonPrompt.isConfirmed) return
    rejectionReason = String(reasonPrompt.value || '').trim()
  }

  if (status === 'rejected') {
    const result = await Swal.fire({
      title: `${actionLabel} request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionLabel.toLowerCase()}`,
    })
    if (!result.isConfirmed) return
  }
  await updateRequest(req, status, null, rejectionReason)
}

const updateRequest = async (req, status, preferredDate = null, reason = null) => {
  try {
    const payload = { status }
    if (preferredDate) payload.preferred_date = preferredDate
    if (reason) payload.reason = reason
    const res = await axios.post(`/service-provider/update-request/${req.id}`, payload)
    Swal.fire('Success', `Status updated to "${res.data.status}"`, 'success')
    emitRefresh()
    if (['accepted', 'awaiting_material'].includes(String(status || '').toLowerCase())) {
      emit('request-accepted', req)
    }
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || err.response?.data?.error || 'Update failed', 'error')
  }
}

const requestReassignment = async (req) => {
  const prompt = await Swal.fire({
    title: 'Request reassignment?',
    text: 'Provide a short reason for reassignment.',
    input: 'text',
    inputPlaceholder: 'e.g. One member unavailable',
    showCancelButton: true,
    confirmButtonText: 'Submit',
    inputValidator: (value) => {
      if (!String(value || '').trim()) return 'Reason is required'
      return null
    },
  })
  if (!prompt.isConfirmed) return
  await updateRequest(req, 'rejected', null, String(prompt.value || '').trim())
}

const markMaterialsCollected = async (req) => {
  const confirmation = await Swal.fire({
    title: 'Mark materials as collected?',
    text: 'This will unlock the Start Job step.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Mark as Collected',
  })
  if (!confirmation.isConfirmed) return
  await updateRequest(req, 'job_ready')
}

const nowTick = ref(Date.now())
let nowInterval = null

const timeAgo = (value) => {
  nowTick.value
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = nowTick.value - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

onMounted(() => {
  nowInterval = setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
})

onBeforeUnmount(() => {
  if (nowInterval) clearInterval(nowInterval)
})

const beforePhotosByRequest = reactive({})
const photosByRequest = reactive({})
const completionFieldsByRequest = reactive({})

const uploadedBeforeFiles = (req) => beforePhotosByRequest[req.id] || []
const uploadedFiles = (req) => photosByRequest[req.id] || []
const showWorkInProgressForm = (req) => liveReportStage(req) !== 'work_in_progress' && liveReportStage(req) !== 'completed'
const showCompletionForm = (req) => liveReportStage(req) === 'work_in_progress' || liveReportStage(req) === 'completed'
const completionFields = (req) => {
  if (!completionFieldsByRequest[req.id]) {
    const now = new Date()
    now.setSeconds(0, 0)
    completionFieldsByRequest[req.id] = {
      materials_used: '',
      equipment_condition: '',
      inspection_result: '',
      completion_time: now.toISOString().slice(0, 16),
    }
  }
  return completionFieldsByRequest[req.id]
}

const onBeforeFileChange = (event, req) => {
  const next = Array.from(event.target.files || [])
  if (!next.length) return
  const existing = beforePhotosByRequest[req.id] || []
  beforePhotosByRequest[req.id] = [...existing, ...next]
  event.target.value = ''
}

const removeUploadedBeforeFile = (req, index) => {
  const existing = beforePhotosByRequest[req.id] || []
  if (index < 0 || index >= existing.length) return
  const next = existing.filter((_, i) => i !== index)
  if (next.length) {
    beforePhotosByRequest[req.id] = next
  } else {
    delete beforePhotosByRequest[req.id]
  }
}

const clearUploadedBeforeFiles = (req) => {
  delete beforePhotosByRequest[req.id]
}

const onFileChange = (event, req) => {
  const next = Array.from(event.target.files || [])
  if (!next.length) return
  const existing = photosByRequest[req.id] || []
  photosByRequest[req.id] = [...existing, ...next]
  event.target.value = ''
}

const removeUploadedFile = (req, index) => {
  const existing = photosByRequest[req.id] || []
  if (index < 0 || index >= existing.length) return
  const next = existing.filter((_, i) => i !== index)
  if (next.length) {
    photosByRequest[req.id] = next
  } else {
    delete photosByRequest[req.id]
  }
}

const clearUploadedFiles = (req) => {
  delete photosByRequest[req.id]
}

const startJob = async (req) => {
  const isWarrantyRepair = isStatus(req, 'warranty_rework')
  const confirmation = await Swal.fire({
    title: isWarrantyRepair ? 'Warranty Repair Confirmation' : 'Pre-Job Confirmation',
    html: `
      <div style="text-align:left;display:grid;gap:10px">
        <label style="display:flex;align-items:center;gap:8px">
          <input id="swal-materials-ready" type="checkbox" />
          <span>${isWarrantyRepair ? 'Repair materials are complete and ready' : 'Materials are complete and ready'}</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px">
          <input id="swal-equipment-ready" type="checkbox" />
          <span>${isWarrantyRepair ? 'Repair equipment is available and ready' : 'Equipment is available and ready'}</span>
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: isWarrantyRepair ? 'Start Free Repair' : 'Start Job',
    preConfirm: () => {
      const materialsReady = document.getElementById('swal-materials-ready')?.checked === true
      const equipmentReady = document.getElementById('swal-equipment-ready')?.checked === true
      if (!materialsReady || !equipmentReady) {
        Swal.showValidationMessage('Confirm both materials and equipment readiness before starting.')
        return false
      }
      return { materialsReady, equipmentReady }
    },
  })

  if (!confirmation.isConfirmed || !confirmation.value) return

  try {
    await axios.post(`/service-provider/update-request/${req.id}`, {
      status: 'in_progress',
      pre_job_materials_ready: true,
      pre_job_equipment_ready: true,
      live_report_stage: 'arrived',
    })
    Swal.fire('Updated', 'Arrival status saved successfully.', 'success')
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to start job', 'error')
  }
}

const markWorkInProgress = async (req) => {
  const beforePhotos = beforePhotosByRequest[req.id] || []
  if (!beforePhotos.length) {
    Swal.fire('Required', 'Please upload at least one before photo first.', 'warning')
    return
  }

  const formData = new FormData()
  beforePhotos.forEach((file) => formData.append('before_photos[]', file))
  formData.append('status', 'in_progress')
  formData.append('live_report_stage', 'work_in_progress')

  try {
    await axios.post(
      `/service-provider/update-request/${req.id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    Swal.fire('Updated', 'Work in progress status saved successfully.', 'success')
    delete beforePhotosByRequest[req.id]
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err.response?.data?.message || 'Failed to update the work-in-progress status.', 'error')
  }
}

const completeJob = async (req) => {
  const photos = photosByRequest[req.id] || []
  const fields = completionFields(req)
  if (!photos.length) {
    Swal.fire('Required', 'Please upload at least one file as proof', 'warning')
    return
  }
  if (!fields.materials_used) {
    Swal.fire('Required', 'Please enter materials used before completing the job.', 'warning')
    return
  }
  if (!fields.equipment_condition) {
    Swal.fire('Required', 'Please enter equipment condition before completing the job.', 'warning')
    return
  }
  if (!['minor', 'major'].includes(String(fields.inspection_result || '').toLowerCase())) {
    Swal.fire('Required', 'Please select inspection result (Minor or Major).', 'warning')
    return
  }

  const formData = new FormData()
  photos.forEach(file => formData.append('photos[]', file))
  formData.append('materials_used', fields.materials_used)
  formData.append('equipment_condition', fields.equipment_condition)
  formData.append('inspection_result', String(fields.inspection_result).toLowerCase())
  if (fields.completion_time) {
    formData.append('completion_time', fields.completion_time)
  }

  try {
    await axios.post(
      `/service-provider/complete-job/${req.id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    Swal.fire('Submitted', 'Completion report submitted. Operations will verify it before closing the job.', 'success')
    delete beforePhotosByRequest[req.id]
    delete photosByRequest[req.id]
    delete completionFieldsByRequest[req.id]
    emitRefresh()
  } catch (err) {
    Swal.fire('Error', err.response?.data?.error || err.response?.data?.message || 'Completion failed', 'error')
  }
}
</script>

