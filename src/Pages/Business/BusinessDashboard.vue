<template>
  <div class="min-h-screen flex flex-col bg-gray-100">

    <!-- NAVBAR -->
    <nav class="bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
          B
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-800 tracking-tight">Business Dashboard</h1>
          <p class="text-xs text-gray-500">Manage requests and applications</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <WorkspaceNotificationBell />
        <div class="relative business-profile-wrap">
          <button
            type="button"
            class="flex h-[38px] min-w-[38px] items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            aria-label="Profile menu"
            @click="toggleProfileMenu"
          >
            <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
              {{ profileInitials }}
            </span>
            <span class="hidden text-xs font-semibold sm:inline">Profile</span>
          </button>
          <div
            v-if="showProfileMenu"
            class="absolute right-0 z-40 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
          >
            <button
              type="button"
              class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              @click="openProfile"
            >
              Profile
            </button>
            <button
              type="button"
              class="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              @click="confirmLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex flex-1">

      <!-- SIDEBAR -->
      <aside class="sticky top-0 flex w-64 flex-col gap-3 border-r border-slate-200 bg-white p-4 text-slate-900 shadow-[2px_0_10px_rgba(15,23,42,0.04)] max-[960px]:static max-[960px]:h-auto max-[960px]:w-full">
        <div class="rounded-[14px] border border-slate-200 bg-white p-3.5">
          <p class="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-500">
            Business Workspace
          </p>
          <h2 class="m-0 mt-1.5 text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {{ businessSidebarHeading.lineOne }}<br />{{ businessSidebarHeading.lineTwo }}
          </h2>
          <p class="m-0 mt-2 text-[13px] text-slate-500">
            {{ businessSidebarHeading.copy }}
          </p>
        </div>

        <div class="rounded-[14px] border border-slate-200 bg-white px-2.5 py-3" v-for="group in businessNavGroups" :key="group.title">
          <button
            type="button"
            class="mx-0.5 mb-2 flex w-full items-center justify-between bg-transparent px-1 py-0 text-left"
            @click="toggleBusinessGroup(group.title)"
          >
            <span class="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{{ group.title }}</span>
            <span class="text-sm text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isBusinessGroupOpen(group.title) }">v</span>
          </button>
          <nav v-show="isBusinessGroupOpen(group.title)" class="flex flex-col gap-1.5">
            <button
              v-for="item in group.items"
              :key="item.section"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-xl px-3 py-[11px] text-left text-[13px] font-semibold transition-all"
              :class="[
                isBusinessItemActive(item)
                  ? 'border border-teal-500 bg-teal-500 text-white shadow-[0_6px_16px_rgba(20,184,166,0.28)] hover:border-teal-500 hover:bg-teal-500 hover:text-white'
                  : 'border border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                !isApproved ? 'opacity-50 pointer-events-none' : ''
              ]"
              @click="setSection(item.section)"
            >
              <span
                class="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold"
                :class="isBusinessItemActive(item)
                  ? 'border border-white/35 bg-white/20 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-600'"
              >
                {{ item.icon }}
              </span>
              <span class="leading-[1.2]">{{ item.label }}</span>
            </button>
          </nav>
        </div>

      </aside>

      <!-- MAIN -->
      <main class="flex-1 p-6">
        <section
          v-if="isApproved && isManagedSection && managedApiError"
          class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {{ managedApiError }}
        </section>

        <section v-if="!isApproved" class="bg-white shadow-md rounded-2xl p-6">
          <div class="flex flex-col gap-6">
            <div class="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#ecfeff_48%,#f8fafc_100%)] p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.12em] text-teal-600">Account Review</p>
                  <h2 class="mt-2 text-2xl font-bold text-gray-800">
                    {{ businessAccountReviewTitle }}
                  </h2>
                  <p class="mt-2 max-w-2xl text-sm text-slate-600">
                    {{ businessReviewSummary }}
                  </p>
                </div>
                <span
                  class="inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold"
                  :class="isBusinessCorrectionRequired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ businessAccountStatusLabel }}
                </span>
              </div>

              <div v-if="authUser.rejection_reason || businessRejectionChecklistLabels.length || latestBusinessReviewMessage" class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
                  <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Admin Reason</p>
                  <p class="mt-2 text-sm font-semibold text-slate-800">
                    {{ authUser.rejection_reason || latestBusinessReviewMessage || 'No detailed note provided.' }}
                  </p>
                  <div v-if="businessRejectionChecklistLabels.length" class="mt-3 flex flex-wrap gap-2">
                    <span
                      v-for="item in businessRejectionChecklistLabels"
                      :key="item"
                      class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                    >
                      {{ item }}
                    </span>
                  </div>
                </article>
                <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Notification</p>
                  <p class="mt-2 text-sm text-slate-600">
                    {{ latestBusinessReviewNotificationTitle || 'Account review update' }}
                  </p>
                  <p class="mt-2 text-sm font-semibold text-slate-800">
                    {{ latestBusinessReviewMessage || 'No new notification yet.' }}
                  </p>
                </article>
              </div>
              <div v-if="isBusinessCorrectionRequired && rejectionChecklistDetails.length" class="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-3">
                <p class="text-sm font-semibold text-rose-700">Required updates</p>
                <div class="mt-2 space-y-2">
                  <div v-for="item in rejectionChecklistDetails" :key="item.key" class="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
                    <p class="text-sm font-semibold text-rose-800">{{ item.label }}</p>
                    <p class="text-xs text-rose-700">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Existing Documents</p>
                    <h3 class="mt-1 text-lg font-bold text-slate-800">Previous Documents From Database</h3>
                  </div>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {{ businessStoredDocuments.length }} files
                  </span>
                </div>
                <div v-if="businessStoredDocuments.length" class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <article
                    v-for="doc in businessStoredDocuments"
                    :key="doc.key"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{{ doc.label }}</p>
                    <p class="mt-2 break-all text-sm font-semibold text-slate-800">{{ doc.name }}</p>
                    <button
                      v-if="doc.previewable"
                      type="button"
                      class="mt-2 inline-flex items-center text-sm font-semibold text-teal-700 hover:underline"
                      @click="openStoredBusinessDocument(doc.url)"
                    >
                      {{ doc.isImage ? 'Preview existing document from database' : 'Open existing document from database' }}
                    </button>
                    <p v-else class="mt-2 text-sm text-slate-400">No preview available for this file.</p>
                  </article>
                </div>
                <p v-else class="mt-4 text-sm text-slate-500">No saved business documents found on this account yet.</p>
              </article>

              <article
                v-if="canResubmitBusinessDocuments"
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">New Documents</p>
                    <h3 class="mt-1 text-lg font-bold text-slate-800">Files Ready For Resubmission</h3>
                    <p v-if="requiredDocumentLabels.length" class="mt-1 text-xs font-semibold text-slate-500">
                      Required documents: {{ requiredDocumentLabels.join(', ') }}
                    </p>
                  </div>
                  <span class="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    {{ selectedBusinessDocuments.length }} selected
                  </span>
                </div>
                <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label
                    v-for="field in resubmissionFields"
                    :key="field.key"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <span class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{{ field.label }}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                      class="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      @change="handleBusinessDocumentSelection(field.key, $event)"
                    />
                    <p class="mt-2 break-all text-sm font-semibold text-slate-800">
                      {{ selectedBusinessDocumentMap[field.key]?.name || 'No new file selected' }}
                    </p>
                  </label>
                </div>
                <div v-if="selectedBusinessDocuments.length" class="mt-4 space-y-3">
                  <article
                    v-for="doc in selectedBusinessDocuments"
                    :key="`selected-${doc.key}`"
                    class="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 p-3"
                  >
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">{{ doc.label }}</p>
                    <p class="mt-2 break-all text-sm font-semibold text-slate-800">{{ doc.name }}</p>
                    <button
                      v-if="doc.previewable"
                      type="button"
                      class="mt-2 inline-flex items-center text-sm font-semibold text-teal-700 hover:underline"
                      @click="openStoredBusinessDocument(doc.url)"
                    >
                      {{ doc.isImage ? 'Preview selected new document' : 'Open selected new document' }}
                    </button>
                  </article>
                </div>
                <div class="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!selectedBusinessDocuments.length || businessDocumentsUploading"
                    @click="submitBusinessDocuments"
                  >
                    {{ businessDocumentsUploading ? 'Uploading...' : 'Upload New Documents' }}
                  </button>
                  <button
                    v-if="selectedBusinessDocuments.length"
                    type="button"
                    class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                    @click="clearAllSelectedBusinessDocuments"
                  >
                    Clear Selected Files
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='dashboard'" class="space-y-6">
          <div class="rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-5 text-white shadow-lg">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-2xl font-bold">Dashboard Overview</h2>
                <p class="text-sm text-white/85">Track request and application performance in real time.</p>
              </div>
              <button
                type="button"
                class="self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30"
                @click="fetchRequests(); fetchApplications()"
              >
                Refresh
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white rounded-2xl shadow p-5">
              <p class="text-xs uppercase tracking-wide text-gray-400">Total Requests</p>
              <p class="text-2xl font-bold text-gray-800 mt-2">{{ stats.totalRequests }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow p-5">
              <p class="text-xs uppercase tracking-wide text-gray-400">Pending Requests</p>
              <p class="text-2xl font-bold text-amber-600 mt-2">{{ stats.pendingRequests }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow p-5">
              <p class="text-xs uppercase tracking-wide text-gray-400">Accepted Requests</p>
              <p class="text-2xl font-bold text-emerald-600 mt-2">{{ stats.acceptedRequests }}</p>
            </div>
            <div class="bg-white rounded-2xl shadow p-5">
              <p class="text-xs uppercase tracking-wide text-gray-400">Rejected Requests</p>
              <p class="text-2xl font-bold text-rose-600 mt-2">{{ stats.rejectedRequests }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-white rounded-2xl shadow p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Applications Overview</h3>
              <div class="flex items-center justify-between text-sm text-gray-600">
                <span>Total Applications</span>
                <span class="font-semibold text-gray-800">{{ stats.totalApplications }}</span>
              </div>
              <div class="flex items-center justify-between text-sm text-gray-600 mt-2">
                <span>Pending Applications</span>
                <span class="font-semibold text-gray-800">{{ stats.pendingApplications }}</span>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Performance Summary</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Approval Rate</span>
                    <span class="font-semibold text-emerald-600">{{ rates.approval }}%</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500" :style="{ width: rates.approval + '%' }"></div>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Pending Rate</span>
                    <span class="font-semibold text-amber-600">{{ rates.pending }}%</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-amber-400" :style="{ width: rates.pending + '%' }"></div>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Rejection Rate</span>
                    <span class="font-semibold text-rose-600">{{ rates.rejected }}%</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-rose-500" :style="{ width: rates.rejected + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-800">Requests Status Overview</h3>
              <span class="text-xs text-gray-500">Auto-updated</span>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="w-20 text-xs text-gray-500 uppercase">Pending</span>
                <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-400" :style="{ width: stats.totalRequests ? (stats.pendingRequests / stats.totalRequests) * 100 + '%' : '0%' }"></div>
                </div>
                <span class="w-8 text-right text-sm font-semibold text-gray-700">{{ stats.pendingRequests }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-20 text-xs text-gray-500 uppercase">Accepted</span>
                <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500" :style="{ width: stats.totalRequests ? (stats.acceptedRequests / stats.totalRequests) * 100 + '%' : '0%' }"></div>
                </div>
                <span class="w-8 text-right text-sm font-semibold text-gray-700">{{ stats.acceptedRequests }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-20 text-xs text-gray-500 uppercase">Rejected</span>
                <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500" :style="{ width: stats.totalRequests ? (stats.rejectedRequests / stats.totalRequests) * 100 + '%' : '0%' }"></div>
                </div>
                <span class="w-8 text-right text-sm font-semibold text-gray-700">{{ stats.rejectedRequests }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed'" class="space-y-6">
          <div class="rounded-2xl bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 p-5 text-white shadow-lg">
            <h2 class="text-2xl font-bold">Business-Managed Workspace</h2>
            <p class="mt-1 text-sm text-white/90">
              Employee, pricing, team monitoring, and business analytics controls.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article
              v-for="item in managedDashboardModules"
              :key="item.title"
              class="rounded-2xl border border-gray-200 bg-white p-4 shadow"
            >
              <p class="text-[11px] uppercase tracking-wide text-gray-400">Dashboard Shows</p>
              <h3 class="mt-2 text-base font-bold text-gray-800">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-gray-600">{{ item.description }}</p>
            </article>
          </div>

          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article class="rounded-2xl border border-gray-200 bg-white p-5 shadow">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-800">4. Employee Management</h3>
                <span class="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">Core</span>
              </div>
              <ul class="mt-4 space-y-2">
                <li
                  v-for="task in managedEmployeeTasks"
                  :key="task"
                  class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {{ task }}
                </li>
              </ul>
            </article>

            <article class="rounded-2xl border border-gray-200 bg-white p-5 shadow">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-800">5. Service Pricing Management</h3>
                <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Pricing</span>
              </div>
              <ul class="mt-4 space-y-2">
                <li
                  v-for="task in managedPricingTasks"
                  :key="task"
                  class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {{ task }}
                </li>
              </ul>
            </article>

            <article class="rounded-2xl border border-gray-200 bg-white p-5 shadow">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-800">6. Team / Service Overview</h3>
                <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Overview</span>
              </div>
              <ul class="mt-4 space-y-2">
                <li
                  v-for="task in managedTeamTasks"
                  :key="task"
                  class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {{ task }}
                </li>
              </ul>
            </article>

          </div>

          <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            No operational control over schedules. Scheduling is handled by HR.
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-9">
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow hover:border-teal-300 hover:text-teal-700"
              @click="setSection('managed-employees')"
            >
              Open Employee Management
            </button>
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow hover:border-teal-300 hover:text-teal-700"
              @click="setSection('managed-approval-queue')"
            >
              Open Approval Queue
            </button>
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow hover:border-teal-300 hover:text-teal-700"
              @click="setSection('managed-assign-team')"
            >
              Open Assign to Team
            </button>
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow hover:border-teal-300 hover:text-teal-700"
              @click="setSection('managed-pricing')"
            >
              Open Service Pricing
            </button>
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow hover:border-teal-300 hover:text-teal-700"
              @click="setSection('managed-teams')"
            >
              Open Team Overview
            </button>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-employees'" class="space-y-5">
          <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 p-6 text-white shadow-lg">
            <div class="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10"></div>
            <div class="absolute -bottom-10 right-24 h-24 w-24 rounded-full bg-white/10"></div>
            <div class="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 class="text-2xl font-bold">Employee / Service Provider Management</h3>
                <p class="mt-1 text-sm text-white/85">Create employee accounts, apply RBAC access checks, then approve/reject and assign to teams.</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-slate-100"
                @click="openCreateEmployeeModal"
              >
                + Add Employee
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article class="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-gray-500">Total Employees</p>
              <p class="mt-1 text-2xl font-bold text-gray-800">{{ managedEmployeeStats.total }}</p>
            </article>
            <article class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-emerald-700">Approved</p>
              <p class="mt-1 text-2xl font-bold text-emerald-700">{{ managedEmployeeStats.approved }}</p>
            </article>
            <article class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-amber-700">Pending</p>
              <p class="mt-1 text-2xl font-bold text-amber-700">{{ managedEmployeeStats.pending }}</p>
            </article>
          </div>

          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <h4 class="text-lg font-semibold text-gray-800">Employee List</h4>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  @click="openArchivedEmployeesModal"
                >
                  Archived ({{ archivedManagedEmployees.length }})
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                  @click="setSection('managed-approval-queue')"
                >
                  Open Approval Queue
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                  @click="setSection('managed-assign-team')"
                >
                  Open Assign to Team
                </button>
                <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Total: {{ activeManagedEmployees.length }}</span>
              </div>
            </div>

            <div v-if="!activeManagedEmployees.length" class="px-5 py-10">
              <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No employee accounts yet.
              </div>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Team</th>
                    <th class="px-4 py-3">Created</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="emp in pagedActiveManagedEmployees" :key="emp.id">
                    <td class="px-4 py-3">
                      <p class="font-semibold text-gray-800">{{ emp.name }}</p>
                      <p class="text-xs text-gray-500">{{ emp.contact }} | {{ emp.role }}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-1">
                        <span class="text-[10px] font-semibold text-slate-500">RBAC:</span>
                        <template v-if="rbacAnyEnabled(emp.staff_permissions)">
                          <span v-if="rbacEnabled(emp.staff_permissions, 'view')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'view')">View</span>
                          <span v-if="rbacEnabled(emp.staff_permissions, 'manage')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'manage')">Manage</span>
                          <span v-if="rbacEnabled(emp.staff_permissions, 'approve')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'approve')">Approve</span>
                        </template>
                        <span v-else class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">None</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="employeeStatusClass(emp)">
                        {{ employeeStatusLabel(emp) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-sm text-gray-700">{{ emp.team || 'Unassigned' }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-sm text-gray-600">{{ formatManagedEmployeeDate(emp.created_at) }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end">
                        <button
                          type="button"
                          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          @click="archiveManagedEmployee(emp.id)"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="archivedEmployeesModalOpen" class="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeArchivedEmployeesModal"></div>
            <div class="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
              <div class="flex items-center justify-between">
                <h4 class="text-lg font-bold text-slate-800">Archived Employees</h4>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  @click="closeArchivedEmployeesModal"
                >
                  Close
                </button>
              </div>
              <p class="mt-1 text-sm text-slate-500">Archived employees are hidden from active lists, approval queue, and team assignment.</p>

              <div v-if="!archivedManagedEmployees.length" class="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No archived employees.
              </div>

              <div v-else class="mt-5 overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th class="px-3 py-2">Employee</th>
                      <th class="px-3 py-2">Status</th>
                      <th class="px-3 py-2">Team</th>
                      <th class="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="emp in pagedArchivedManagedEmployees" :key="`archived-${emp.id}`">
                    <td class="px-3 py-3">
                      <p class="font-semibold text-slate-800">{{ emp.name }}</p>
                      <p class="text-xs text-slate-500">{{ emp.contact }} | {{ emp.role }}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-1">
                        <span class="text-[10px] font-semibold text-slate-500">RBAC:</span>
                        <template v-if="rbacAnyEnabled(emp.staff_permissions)">
                          <span v-if="rbacEnabled(emp.staff_permissions, 'view')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'view')">View</span>
                          <span v-if="rbacEnabled(emp.staff_permissions, 'manage')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'manage')">Manage</span>
                          <span v-if="rbacEnabled(emp.staff_permissions, 'approve')" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="rbacPillClass(emp.staff_permissions, 'approve')">Approve</span>
                        </template>
                        <span v-else class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">None</span>
                      </div>
                    </td>
                      <td class="px-3 py-3">
                        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="employeeStatusClass(emp)">
                          {{ employeeStatusLabel(emp) }}
                        </span>
                      </td>
                      <td class="px-3 py-3 text-slate-700">{{ emp.team || 'Unassigned' }}</td>
                      <td class="px-3 py-3 text-right">
                        <button
                          type="button"
                          class="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                          @click="restoreManagedEmployee(emp.id)"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="createEmployeeModalOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeCreateEmployeeModal"></div>
            <div class="relative w-full max-w-4xl rounded-3xl bg-white p-7 shadow-2xl">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Add Employee Record</h4>
                <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900" @click="closeCreateEmployeeModal">
                  Close
                </button>
              </div>

              <form class="mt-4" @submit.prevent="submitCreateEmployeeFromModal">
                <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500">
                  <span :class="employeeCreateStep === 1 ? 'text-slate-900' : 'text-slate-400'">Step 1 - Personal Info</span>
                  <span :class="employeeCreateStep === 2 ? 'text-slate-900' : 'text-slate-400'">Step 2 - Role And Deployment Setup</span>
                </div>

                <div v-if="employeeCreateStep === 1" class="mt-4 grid gap-4">
                  <div class="grid gap-4 md:grid-cols-3">
                    <div>
                      <input
                        v-model="employeeCreateForm.givenName"
                        type="text"
                        placeholder="Given Name"
                        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <p v-if="createGivenNameError" class="mt-1 text-xs text-rose-600">{{ createGivenNameError }}</p>
                    </div>
                    <div>
                      <input
                        v-model="employeeCreateForm.middleName"
                        type="text"
                        placeholder="Middle Name (Optional)"
                        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <p v-if="createMiddleNameError" class="mt-1 text-xs text-rose-600">{{ createMiddleNameError }}</p>
                    </div>
                    <div>
                      <input
                        v-model="employeeCreateForm.lastName"
                        type="text"
                        placeholder="Last Name"
                        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <p v-if="createLastNameError" class="mt-1 text-xs text-rose-600">{{ createLastNameError }}</p>
                    </div>
                  </div>

                  <div>
                    <input
                      v-model="employeeCreateForm.email"
                      type="email"
                      placeholder="Email Address"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <p v-if="createEmailError" class="mt-1 text-xs text-rose-600">{{ createEmailError }}</p>
                  </div>

                  <div>
                    <input
                      v-model="employeeCreateForm.contact"
                      type="text"
                      placeholder="Contact Number"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div class="relative">
                    <input
                      v-model="employeeCreateForm.password"
                      :type="showCreatePassword ? 'text' : 'password'"
                      placeholder="Password"
                      :class="[
                        'w-full rounded-xl border bg-white px-4 py-2 pr-20 text-sm text-slate-700 focus:outline-none',
                        createPasswordStrengthInputClass,
                      ]"
                    />
                    <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-slate-900" @click="showCreatePassword = !showCreatePassword">
                      {{ showCreatePassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <div class="flex items-center justify-between">
                    <p class="text-xs text-slate-500">Use letters, numbers, and special characters for a stronger password.</p>
                    <p v-if="createPasswordStrengthLabel" class="text-xs font-semibold" :class="createPasswordStrengthClass">
                      {{ createPasswordStrengthLabel }}
                    </p>
                  </div>
                  <p v-if="createPasswordRequirementError" class="text-xs text-rose-600">
                    {{ createPasswordRequirementError }}
                  </p>

                  <button type="button" class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100" @click="goToCreateEmployeeWorkStep">
                    Next: Role And Deployment Setup
                  </button>
                </div>

                <div v-else class="mt-4 grid gap-4">
                  <div class="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
                    <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role Setup</p>
                          <h4 class="mt-1 text-base font-semibold text-slate-900">Set the work track and position.</h4>
                        </div>
                        <span
                          v-if="resolvedManagedEmployeeRole"
                          class="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold text-teal-700"
                        >
                          {{ resolvedManagedEmployeeRole }}
                        </span>
                      </div>

                      <div class="mt-4 space-y-4">
                        <div>
                          <div class="flex items-center justify-between gap-3">
                            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Service Track</label>
                            <span class="text-[11px] text-slate-400">Operations uses this to separate teams.</span>
                          </div>
                          <div class="mt-2 grid gap-2 sm:grid-cols-3">
                            <button
                              v-for="track in managedServiceTrackOptions"
                              :key="track.key"
                              type="button"
                              class="rounded-2xl border px-3 py-3 text-left transition"
                              :class="employeeCreateForm.serviceTrack === track.key
                                ? 'border-teal-300 bg-teal-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'"
                              @click="employeeCreateForm.serviceTrack = track.key"
                            >
                              <p class="text-sm font-semibold text-slate-900">{{ track.label }}</p>
                              <p class="mt-1 text-xs leading-5 text-slate-500">{{ track.description }}</p>
                            </button>
                          </div>
                        </div>

                        <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div class="space-y-2">
                            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Position Template</label>
                            <select
                              v-model="employeeCreateForm.rolePreset"
                              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                              <option value="">Select role / position</option>
                              <template v-for="group in managedServiceTrackRoleGroups" :key="group.label">
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
                              <option value="__custom__">Custom role / position</option>
                            </select>
                            <p class="text-xs text-slate-500">
                              Kapag `Both` ang pinili, lalabas ang siphoning at plumbing positions dito.
                            </p>
                          </div>

                          <div class="space-y-2">
                            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Manual Override</label>
                            <input
                              v-model="employeeCreateForm.customRole"
                              type="text"
                              :placeholder="employeeCreateForm.serviceTrack === 'both'
                                ? 'Custom role. Include Siphoning or Plumbing.'
                                : 'Optional custom role / position'"
                              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                            <p class="text-xs text-slate-500">
                              Use this only if the preset list does not match the interview-based role.
                            </p>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dispatch Group Preview</p>
                              <p class="mt-1 text-sm font-semibold text-slate-900">
                                {{ managedRoleTrackSummaryLabel }}
                              </p>
                            </div>
                            <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {{ resolvedManagedEmployeeRole || 'Role not set yet' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section class="grid gap-4">
                      <div class="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 shadow-sm">
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800">Operations Handoff</p>
                        <div class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                          <p>1. Business or HR creates the employee record and sends it to approval.</p>
                          <p>2. Once approved, Operations can see the employee for team planning and dispatch scheduling.</p>
                          <p>3. Actual dispatch happens in Operations, not in the employee create modal.</p>
                        </div>
                      </div>

                      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Record Start Date</label>
                        <p class="mt-1 text-xs text-slate-500">The employee stays in approval first before Operations can assign the team.</p>
                        <div class="relative mt-3">
                          <input
                            ref="employeeStartDateInput"
                            v-model="employeeCreateForm.startDate"
                            type="date"
                            :min="employeeDateMin"
                            :max="employeeDateMax"
                            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          />
                          <button
                            type="button"
                            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            @click="openStartDatePicker"
                          >
                            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                              <path d="M16 2v4"></path>
                              <path d="M8 2v4"></path>
                              <path d="M3 10h18"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Internal Notes</label>
                    <p class="mt-1 text-xs text-slate-500">Keep this short: certification, shift note, or interview reminder.</p>
                    <textarea v-model="employeeCreateForm.notes" rows="3" placeholder="Notes (optional)" class="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"></textarea>
                  </div>
                  <div class="flex items-center gap-3">
                    <button type="button" class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900" :disabled="creatingEmployee" @click="employeeCreateStep = 1">
                      Back
                    </button>
                    <button type="submit" class="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="creatingEmployee">
                      {{ creatingEmployee ? 'Creating...' : 'Create Employee Record' }}
                    </button>
                  </div>
                  <p class="text-xs text-slate-500">Tip: Approved employees become available for Operations team assignment and dispatch planning. This modal only creates the record.</p>
                  <p class="text-xs text-slate-500">RBAC default: View only. Enable Manage or Approve later in HR settings if needed.</p>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-approval-queue'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Approval Queue</h3>
            <p class="mt-1 text-sm text-white/85">Review newly created employees and approve or reject them before Operations can assign teams or dispatch schedules.</p>
          </div>

          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h4 class="text-lg font-semibold text-slate-900">Pending Employees</h4>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Pending: {{ pendingManagedEmployees.length }}
              </span>
            </div>

            <div v-if="!pendingManagedEmployees.length" class="px-5 py-8">
              <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No employees waiting for approval.
              </div>
            </div>

            <div v-else class="divide-y divide-slate-200">
              <div
                v-for="emp in pagedPendingManagedEmployees"
                :key="`queue-${emp.id}`"
                class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p class="font-semibold text-slate-900">{{ emp.name }}</p>
                  <p class="text-xs text-slate-600">{{ emp.contact }} | {{ emp.role }}</p>
                  <p class="mt-1 text-xs text-slate-500">Created: {{ formatManagedEmployeeDate(emp.created_at) }}</p>
                  <p class="mt-1 text-xs text-slate-500">
                    RBAC ({{ emp.created_by_role || 'Business Owner' }}): {{ staffPermissionSummary(emp.staff_permissions) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    @click="updateEmployeeStatus(emp.id, 'approved')"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                    @click="updateEmployeeStatus(emp.id, 'rejected')"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-slate-500">
                Page {{ pendingManagedEmployeesPage }} of {{ pendingManagedEmployeesTotalPages }} · Showing {{ managedEmployeePageRanges.pending.start }}-{{ managedEmployeePageRanges.pending.end }} of {{ pendingManagedEmployees.length }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="pendingManagedEmployeesPage === 1"
                  @click="prevPendingManagedEmployeesPage"
                >
                  Prev
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="pendingManagedEmployeesPage === pendingManagedEmployeesTotalPages"
                  @click="nextPendingManagedEmployeesPage"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-assign-team'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-cyan-700 via-sky-700 to-blue-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Assign to Team</h3>
            <p class="mt-1 text-sm text-white/85">Only approved employees are shown. Team assignment is auto-separated by work role (Siphoning vs Plumbing), max 3 workers per team.</p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article class="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-gray-500">Approved</p>
              <p class="mt-1 text-2xl font-bold text-emerald-700">{{ approvedManagedEmployees.length }}</p>
            </article>
            <article class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-amber-700">Pending First</p>
              <p class="mt-1 text-2xl font-bold text-amber-700">{{ pendingManagedEmployees.length }}</p>
            </article>
            <article class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-sky-700">Available Teams</p>
              <p class="mt-1 text-2xl font-bold text-sky-700">{{ alphabetAssignableTeams.length }}</p>
            </article>
          </div>

          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow">
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h4 class="text-lg font-semibold text-gray-800">Approved Employees</h4>
              <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Total: {{ approvedManagedEmployees.length }}
              </span>
            </div>

            <div v-if="!approvedManagedEmployees.length" class="px-5 py-10">
              <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No approved employees available for assignment yet.
              </div>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Work / Role</th>
                    <th class="px-4 py-3">Current Team</th>
                    <th class="px-4 py-3">Assign Team</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <template v-for="group in approvedManagedEmployeesByTrack" :key="`assign-group-${group.key}`">
                    <tr class="bg-slate-50/80">
                      <td class="px-4 py-2.5" colspan="5">
                        <div class="flex flex-wrap items-center gap-2">
                          <span
                            class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            :class="group.badgeClass"
                          >
                            {{ group.label }}
                          </span>
                          <span class="text-xs text-slate-500">
                            {{ group.employees.length }} worker{{ group.employees.length > 1 ? 's' : '' }}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr v-for="emp in group.employees" :key="`assign-${group.key}-${emp.id}`">
                      <td class="px-4 py-3">
                        <p class="font-semibold text-gray-800">{{ emp.name }}</p>
                        <p class="text-xs text-gray-500">{{ emp.contact || 'No contact provided' }}</p>
                      </td>
                      <td class="px-4 py-3">
                        <p class="text-sm font-semibold text-slate-700">{{ employeeWorkLabel(emp.role) }}</p>
                        <p class="text-xs text-slate-500">{{ emp.role || 'Employee' }}</p>
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                          :class="displayManagedTeamName(emp)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'"
                        >
                          {{ displayManagedTeamName(emp) || 'Unassigned' }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <select
                            v-model="teamByEmployeeId[emp.id]"
                            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            :disabled="!canAssignEmployeeToTeam(emp)"
                          >
                            <option value="">{{ assignTeamPlaceholder(emp.role) }}</option>
                            <option
                              v-for="teamRow in assignableTeamsForEmployee(emp)"
                              :key="`${emp.id}-${teamRow.name}`"
                              :value="teamRow.name"
                              :disabled="(teamRow.isFull || teamRow.isRoleTaken) && teamByEmployeeId[emp.id] !== teamRow.name"
                            >
                              {{ teamRow.name }} ({{ teamRow.count }}/3{{ teamRow.isFull ? ' Full' : (teamRow.isRoleTaken ? ' Role exists' : '') }})
                            </option>
                          </select>
                          <p class="text-[11px] text-slate-500">{{ assignTeamHelpText(emp.role) }}</p>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            class="rounded-lg px-3 py-2 text-xs font-semibold text-white transition"
                            :class="assignButtonClass(emp)"
                            :disabled="isAssignButtonDisabled(emp)"
                            @click="assignEmployeeToTeam(emp.id)"
                          >
                            {{ assigningTeamEmployeeId === Number(emp.id) ? 'Assigning...' : 'Assign' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div class="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-gray-500">
                Page {{ approvedManagedEmployeesPage }} of {{ approvedManagedEmployeesTotalPages }} · Showing {{ managedEmployeePageRanges.approved.start }}-{{ managedEmployeePageRanges.approved.end }} of {{ approvedManagedEmployees.length }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="approvedManagedEmployeesPage === 1"
                  @click="prevApprovedManagedEmployeesPage"
                >
                  Prev
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="approvedManagedEmployeesPage === approvedManagedEmployeesTotalPages"
                  @click="nextApprovedManagedEmployeesPage"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-pricing'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 p-6 text-white shadow-lg">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 class="text-2xl font-bold">Service Pricing Management</h3>
                <p class="mt-1 text-sm text-white/85">Set base prices and dynamic modifiers used automatically in bookings.</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-slate-100"
                @click="openPricingRuleModal"
              >
                + Add Pricing Rule
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-slate-600">
              Add or update pricing rules using the modal form. Include a short guide note to explain where the price applies.
            </p>
          </div>

          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h4 class="text-lg font-semibold text-gray-800">Saved Pricing Rules</h4>
              <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{{ pricingRules.length }} services</span>
            </div>
            <div class="overflow-x-auto px-3 py-2">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-gray-500">
                    <th class="px-2 py-2 font-semibold">Service</th>
                    <th class="px-2 py-2 font-semibold">Base</th>
                    <th class="px-2 py-2 font-semibold">Distance/km</th>
                    <th class="px-2 py-2 font-semibold">Urgency</th>
                    <th class="px-2 py-2 font-semibold">Complexity (M/Md/Sv)</th>
                    <th class="px-2 py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rule in pricingRules" :key="rule.service" class="border-b border-gray-100">
                    <td class="px-2 py-2 font-medium text-gray-800">{{ rule.service }}</td>
                    <td class="px-2 py-2 text-gray-700">{{ money(rule.basePrice) }}</td>
                    <td class="px-2 py-2 text-gray-700">{{ money(rule.distanceFee) }}</td>
                    <td class="px-2 py-2 text-gray-700">+{{ rule.urgencyFeePct }}%</td>
                    <td class="px-2 py-2 text-gray-700">{{ rule.minorPct }}% / {{ rule.moderatePct }}% / {{ rule.severePct }}%</td>
                    <td class="px-2 py-2 text-gray-700">{{ rule.note || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="pricingRuleModalOpen" class="fixed inset-0 z-[78] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closePricingRuleModal"></div>
            <div class="relative w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl">
              <div class="flex items-center justify-between">
                <h4 class="text-lg font-bold text-slate-800">Save Pricing Rule</h4>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  @click="closePricingRuleModal"
                >
                  Close
                </button>
              </div>
              <p class="mt-1 text-sm text-slate-500">Fill in the service pricing values and add a clear guide note.</p>

              <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Service</p>
                  <select v-model="pricingForm.service" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                    <option v-for="service in managedServiceOptions" :key="service" :value="service">{{ service }}</option>
                  </select>
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Base Price (PHP)</p>
                  <input v-model.number="pricingForm.basePrice" type="number" min="0" step="0.01" placeholder="Base price (PHP)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Distance Fee / km (PHP)</p>
                  <input v-model.number="pricingForm.distanceFee" type="number" min="0" step="0.01" placeholder="Distance fee / km (PHP)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Urgency Fee (%)</p>
                  <input v-model.number="pricingForm.urgencyFeePct" type="number" min="0" step="0.1" placeholder="Urgency fee (%)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Minor Complexity (%)</p>
                  <input v-model.number="pricingForm.minorPct" type="number" min="0" step="0.1" placeholder="Minor complexity (%)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Moderate Complexity (%)</p>
                  <input v-model.number="pricingForm.moderatePct" type="number" min="0" step="0.1" placeholder="Moderate complexity (%)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Severe Complexity (%)</p>
                  <input v-model.number="pricingForm.severePct" type="number" min="0" step="0.1" placeholder="Severe complexity (%)" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div class="xl:col-span-4">
                  <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Guide Note (Para saan ang presyo)</p>
                  <input
                    v-model="pricingForm.note"
                    type="text"
                    placeholder="Guide note: e.g. 'Base price for Siphoning within 5km. +PHP 300 per extra km.'"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                  <p class="mt-1 text-xs text-slate-500">
                    Guide: Explain saan applicable ang price na ito (service scope, distance coverage, urgency inclusion, at ibang condition).
                  </p>
                </div>
              </div>

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  @click="closePricingRuleModal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                  @click="submitPricingRuleFromModal"
                >
                  Save Pricing Rule
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-teams'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Team / Service Overview</h3>
            <p class="mt-1 text-sm text-white/80">View teams, employee assignments, and high-level business monitoring.</p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Teams</p>
              <p class="mt-1 text-4xl font-black text-slate-800">{{ managedTeamSummary.totalTeams }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Assigned Employees</p>
              <p class="mt-1 text-4xl font-black text-slate-800">{{ managedTeamSummary.assignedEmployees }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Revenue Trend (Proxy)</p>
              <p class="mt-1 text-4xl font-black text-slate-800">{{ money(managedTeamSummary.revenueProxy) }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 class="text-lg font-semibold text-gray-800">Team Matrix</h4>
              <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span class="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Accepted</span>
                <span class="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Pending</span>
                <span class="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Reassignment</span>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <article v-for="row in managedTeamRows" :key="row.team" class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-gray-800">{{ row.team }}</p>
                    <p class="mt-0.5 text-xs text-gray-500">Work Types: {{ row.services }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{{ row.count }}/3 members</span>
                    <span
                      class="rounded-full px-2 py-1 text-xs font-semibold"
                      :class="row.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ row.isPublished ? 'Is Published' : 'Not Published' }}
                    </span>
                    <span
                      class="rounded-full px-2 py-1 text-xs font-semibold"
                      :class="row.hasLeader ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                    >
                      {{ row.hasLeader ? `Leader: ${row.leaderName}` : 'No Leader Assigned' }}
                    </span>
                  </div>
                </div>
                <div class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Schedule Publish</p>
                  <div v-if="row.count >= 3" class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input
                      v-model="teamScheduleDateByTeam[row.team]"
                      type="date"
                      :min="teamScheduleMinDate"
                      :max="teamScheduleMaxDate"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    />
                    <select
                      v-model="teamScheduleTimeFromByTeam[row.team]"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Start time</option>
                      <option v-for="slot in teamScheduleHourOptions" :key="`from-${row.team}-${slot.value}`" :value="slot.value">
                        {{ slot.label }}
                      </option>
                    </select>
                    <select
                      v-model="teamScheduleTimeToByTeam[row.team]"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">End time</option>
                      <option v-for="slot in teamScheduleHourOptions" :key="`to-${row.team}-${slot.value}`" :value="slot.value">
                        {{ slot.label }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      :disabled="!canPublishTeamSchedule(row)"
                      @click="publishTeamSchedule(row)"
                    >
                      {{ publishingTeamSchedule === row.team ? 'Publishing...' : (row.isPublished ? 'Republish' : 'Publish') }}
                    </button>
                  </div>
                  <div v-else class="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Schedule controls appear only when the team is complete (3/3 members).
                  </div>
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{ row.count < 3
                      ? 'Schedule publishing is available only when team is full (3/3).'
                      : (row.hasLeader
                        ? (row.hasActivePublishedSchedule
                          ? 'This team already has an active published schedule. You can set a new date/time after the current schedule ends.'
                          : (row.isPublished
                            ? 'Previous schedule has ended. Set new date/time and click Republish.'
                            : 'Set date and time window, then publish to notify all team members.'))
                        : 'Assign a team leader first before publishing schedule.') }}
                  </p>
                </div>
                <div class="mt-3 space-y-2">
                  <div
                    v-for="member in row.members"
                    :key="`team-member-${row.team}-${member.id}`"
                    class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div class="flex items-center gap-3">
                      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                        {{ employeeInitials(member.name) }}
                      </span>
                      <div>
                        <p class="text-sm font-semibold text-slate-800">{{ member.name }}</p>
                        <p class="text-xs text-slate-500">{{ member.role || 'Employee' }}</p>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <span class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                        {{ employeeWorkLabel(member.role) }}
                      </span>
                      <span
                        class="rounded-full px-2 py-1 text-[11px] font-semibold"
                        :class="teamAssignmentFlagClass(member.team_assignment_status)"
                      >
                        {{ teamAssignmentFlagLabel(member.team_assignment_status) }}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-payroll'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-slate-700 via-indigo-700 to-sky-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Payroll Center</h3>
            <p class="mt-1 text-sm text-white/85">
              {{ isIndividualBusiness && isBusinessManagedMode ? 'Completed-job earnings and payout tracking for individual business-managed teams.' : 'Payroll summaries and approvals for staff members.' }}
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p v-if="!(isIndividualBusiness && isBusinessManagedMode)" class="text-sm font-semibold text-slate-900">Payroll module is managed in HR workspace.</p>
            <template v-else>
              <p class="text-sm font-semibold text-slate-900">Individual business-managed payroll is paid per completed work.</p>
              <p class="mt-2 text-xs text-slate-600">
                Every completed request automatically creates a `per_job` payroll entry for the assigned provider. This keeps the same business-managed workflow as the company setup, but compensation is released job-by-job instead of fixed HR payroll cycles.
              </p>
              <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-900">
                Workflow applied here: request handling, operations, procurement, finance, team assignment, and reporting stay inside the shared business-managed workspace. The payroll difference is the salary basis: `by_work` on each completed job.
              </div>
            </template>
            <p v-if="!(isIndividualBusiness && isBusinessManagedMode)" class="mt-2 text-xs text-slate-600">
              Use HR → Payroll for full payout, deductions, and approval controls.
            </p>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-reports'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Reports / Analytics</h3>
            <p class="mt-1 text-sm text-white/85">Generate business-level snapshots for bookings, revenue, and team view.</p>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select v-model="reportType" class="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                <option value="bookings">Total bookings per service</option>
                <option value="revenue">Revenue trends</option>
                <option value="team">Employee/team overview</option>
              </select>
              <button type="button" class="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700" @click="generateReport">
                Generate Report
              </button>
              <button type="button" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!generatedReports.length" @click="exportReportsCsv">
                Export CSV
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 class="mb-3 text-lg font-semibold text-gray-800">Generated Reports</h4>
            <div v-if="!generatedReports.length" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
              No generated reports yet.
            </div>
            <div v-else class="space-y-2">
              <div v-for="report in generatedReports" :key="report.id" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="font-semibold text-gray-800">{{ report.title }}</p>
                  <span class="text-xs text-gray-500">{{ report.generatedAt }}</span>
                </div>
                <p class="mt-1 text-sm text-gray-600">{{ report.summary }}</p>
                <div v-if="report.rows?.length" class="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                  <div class="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Label</span>
                    <span class="text-right">Value</span>
                  </div>
                  <div class="mt-2 space-y-1.5">
                    <div v-for="(row, idx) in report.rows" :key="`${report.id}-${idx}`" class="grid grid-cols-2 gap-2 text-sm">
                      <span class="text-gray-700">{{ row.label }}</span>
                      <span class="text-right font-semibold text-gray-800">{{ row.value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-operations'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Business Operations Queue</h3>
            <p class="mt-1 text-sm text-white/85">Business-side operations flow: Assigned -> Awaiting Material -> Job Ready -> In Progress -> Completed.</p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">Operational Access</p>
                <h3 class="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Operational Managers</h3>
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
                  @click="fetchOperationalManagers(true)"
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
                        {{ formatOperationalManagerDate(manager.created_at) }}
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
              <div class="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-xs font-semibold text-slate-500">
                  Page {{ archivedManagedEmployeesPage }} of {{ archivedManagedEmployeesTotalPages }} · Showing {{ managedEmployeePageRanges.archived.start }}-{{ managedEmployeePageRanges.archived.end }} of {{ archivedManagedEmployees.length }}
                </p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="archivedManagedEmployeesPage === 1"
                    @click="prevArchivedManagedEmployeesPage"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="archivedManagedEmployeesPage === archivedManagedEmployeesTotalPages"
                    @click="nextArchivedManagedEmployeesPage"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-gray-500">Assigned</p>
              <p class="mt-1 text-xl font-bold text-gray-800">{{ managedOperationsStats.assigned }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-gray-500">Awaiting Material</p>
              <p class="mt-1 text-xl font-bold text-gray-800">{{ managedOperationsStats.awaiting_material }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-gray-500">Job Ready / In Progress</p>
              <p class="mt-1 text-xl font-bold text-gray-800">{{ managedOperationsStats.active_work }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-gray-500">Completed</p>
              <p class="mt-1 text-xl font-bold text-gray-800">{{ managedOperationsStats.completed }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Inventory Items</p>
              <p class="mt-1 text-xl font-bold text-slate-800">{{ managedInventorySummary.length }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700">Available Inventory</p>
              <p class="mt-1 text-xl font-bold text-emerald-800">{{ managedInventoryTotals.available_qty }}</p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-amber-700">Pending Finance PR</p>
              <p class="mt-1 text-xl font-bold text-amber-800">{{ managedPrPendingFinance }}</p>
            </div>
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-sky-700">Order Type Mix</p>
              <p class="mt-1 text-sm font-semibold text-sky-900">
                Online: {{ managedPurchaseTypeSummary.online }} | Physical: {{ managedPurchaseTypeSummary.physical }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            Team Leader flow: confirm assignment -> mark materials collected (Job Ready) -> start job -> upload proof on completion.
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">Operational Job Intake</p>
              <span class="text-xs text-slate-500">Use this to decide required materials per accepted job.</span>
            </div>
            <div v-if="!managedOperationalQueueRows.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No accepted operational jobs found.
            </div>
            <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <article
                v-for="row in managedOperationalQueueRows"
                :key="`op-intake-${row.id}`"
                class="rounded-xl border border-slate-200 bg-slate-50 p-4"
                :class="row.acceptance_locked ? 'opacity-80 border-emerald-300 bg-emerald-50/30' : ''"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-base font-bold text-slate-900">{{ row.customer_name }}</p>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {{ row.status_label }}
                    </span>
                    <span
                      v-if="row.acceptance_locked"
                      class="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                      :class="row.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-100 text-emerald-700'"
                    >
                      {{ row.is_completed ? 'Completed' : 'Sent' }}
                    </span>
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span class="font-semibold text-slate-900">Booked Type:</span> {{ row.booked_type }}</p>
                  <p><span class="font-semibold text-slate-900">Team:</span> {{ row.assigned_team }}</p>
                  <p><span class="font-semibold text-slate-900">Team Leader:</span> {{ row.team_leader }}</p>
                </div>
                <div class="mt-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
                  <div v-if="row.team_members.length" class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="member in row.team_members"
                      :key="`member-${row.id}-${member}`"
                      class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {{ member }}
                    </span>
                  </div>
                  <p v-else class="mt-1 text-sm text-slate-500">No members yet.</p>
                </div>
                <div class="mt-3 space-y-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Needed Item / Equipment</label>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_190px_auto]">
                    <div>
                      <select
                        v-model.trim="operationalNeededInputByRequestId[row.id]"
                        @change="normalizeOperationalNeededQty(row.id)"
                        :disabled="row.acceptance_locked"
                        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      >
                        <option value="" disabled>Select item/equipment</option>
                        <option
                          v-for="item in operationalInventoryOptionsForType(row.booked_type)"
                          :key="`item-opt-${row.id}-${item.name}`"
                          :value="item.name"
                        >
                          {{ item.name }}
                        </option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white">
                        <button
                          type="button"
                          class="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          :disabled="row.acceptance_locked"
                          @click="decreaseOperationalNeededQty(row.id)"
                        >
                          -
                        </button>
                        <input
                          v-model.number="operationalNeededQtyByRequestId[row.id]"
                          type="number"
                          min="1"
                          :disabled="row.acceptance_locked"
                          class="w-full border-x border-slate-200 px-2 py-2 text-center text-sm font-semibold text-slate-700 outline-none"
                          @change="normalizeOperationalNeededQty(row.id)"
                        />
                        <button
                          type="button"
                          class="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          :disabled="row.acceptance_locked"
                          @click="increaseOperationalNeededQty(row.id)"
                        >
                          +
                        </button>
                      </div>
                      <p class="text-[11px] text-slate-500">Available: {{ selectedOperationalAvailableByRequest(row.id) }}</p>
                    </div>
                    <button
                      type="button"
                      class="rounded-lg bg-slate-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="row.acceptance_locked || !operationalNeededInputByRequestId[row.id] || (operationalSelectedItemsByRequestId[row.id] || []).length >= 5"
                      @click="addOperationalNeededItem(row)"
                    >
                      Add Item
                    </button>
                  </div>
                  <div v-if="(operationalSelectedItemsByRequestId[row.id] || []).length" class="flex flex-wrap gap-2">
                    <span
                      v-for="item in operationalSelectedItemsByRequestId[row.id]"
                      :key="`needed-${row.id}-${item}`"
                      class="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800"
                    >
                      {{ item }}
                      <button
                        type="button"
                        class="text-cyan-700 hover:text-cyan-900"
                        :disabled="row.acceptance_locked"
                        @click="removeOperationalNeededItem(row.id, item)"
                      >
                        x
                      </button>
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">
                    Showing {{ operationalServiceTypeLabel(row.booked_type) }} items only. Select 1 to 5 items.
                  </p>
                </div>
                <div class="mt-3 flex justify-end">
                  <button
                    type="button"
                    class="rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    :class="row.acceptance_locked ? 'bg-emerald-600' : 'bg-cyan-600 hover:bg-cyan-700'"
                    :disabled="row.acceptance_locked || sendingServiceProviderAcceptanceId === row.id"
                    @click="sendServiceProviderAcceptance(row)"
                  >
                    {{
                      row.acceptance_locked
                        ? (row.is_completed ? 'Completed' : 'Service Provider Acceptance Sent')
                        : (sendingServiceProviderAcceptanceId === row.id ? 'Sending...' : 'Service Provider Acceptance')
                    }}
                  </button>
                </div>
              </article>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">Inventory Snapshot</p>
              <span class="text-xs text-slate-500">Low stock items: {{ managedInventoryTotals.low_stock_items }}</span>
            </div>
            <div v-if="!managedInventorySummary.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No inventory records yet for this business.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="px-3 py-2 text-left">Material</th>
                    <th class="px-3 py-2 text-right">Received</th>
                    <th class="px-3 py-2 text-right">Allocated</th>
                    <th class="px-3 py-2 text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in managedInventorySummary.slice(0, 8)" :key="`${row.material_name}-${row.unit}`" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-700">{{ row.material_name }} ({{ row.unit }})</td>
                    <td class="px-3 py-2 text-right text-slate-700">{{ row.received_qty }}</td>
                    <td class="px-3 py-2 text-right text-slate-700">{{ row.allocated_qty }}</td>
                    <td class="px-3 py-2 text-right font-semibold" :class="Number(row.available || 0) <= 5 ? 'text-rose-700' : 'text-emerald-700'">
                      {{ row.available }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-inventory'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Business Inventory</h3>
            <p class="mt-1 text-sm text-white/85">Live inventory visibility for operations, procurement, and finance-linked PR flow.</p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Inventory Items</p>
              <p class="mt-1 text-xl font-bold text-slate-800">{{ managedInventorySummary.length }}</p>
            </div>
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-sky-700">Received Qty</p>
              <p class="mt-1 text-xl font-bold text-sky-900">{{ managedInventoryTotals.received_qty }}</p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-amber-700">Allocated Qty</p>
              <p class="mt-1 text-xl font-bold text-amber-900">{{ managedInventoryTotals.allocated_qty }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700">Available Qty</p>
              <p class="mt-1 text-xl font-bold text-emerald-900">{{ managedInventoryTotals.available_qty }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">Inventory Snapshot</p>
              <span class="text-xs text-slate-500">Low stock items: {{ managedInventoryTotals.low_stock_items }}</span>
            </div>
            <div v-if="!managedInventorySummary.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No inventory records yet for this business.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="px-3 py-2 text-left">Material</th>
                    <th class="px-3 py-2 text-right">Received</th>
                    <th class="px-3 py-2 text-right">Allocated</th>
                    <th class="px-3 py-2 text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in managedInventorySummary" :key="`${row.material_name}-${row.unit}`" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-700">{{ row.material_name }} ({{ row.unit }})</td>
                    <td class="px-3 py-2 text-right text-slate-700">{{ row.received_qty }}</td>
                    <td class="px-3 py-2 text-right text-slate-700">{{ row.allocated_qty }}</td>
                    <td class="px-3 py-2 text-right font-semibold" :class="Number(row.available || 0) <= 5 ? 'text-rose-700' : 'text-emerald-700'">
                      {{ row.available }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='managed-orders'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-cyan-700 via-sky-700 to-indigo-800 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Item Orders</h3>
            <p class="mt-1 text-sm text-white/85">Record physical or online purchases. Saved entries are posted to inventory automatically.</p>
          </div>
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <article class="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-5 py-3">
                <h4 class="text-base font-bold text-emerald-900">Physical Purchase Entry</h4>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Auto Inventory</span>
              </div>
              <div class="space-y-4 p-5">
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Item Name</label>
                  <select v-model="physicalOrderForm.material_name" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                    <option value="" disabled>Select plumbing or siphoning item</option>
                    <optgroup v-for="(items, group) in itemOrderGroups" :key="`physical-${group}`" :label="group">
                      <option v-for="item in items" :key="`physical-${group}-${item}`" :value="item">
                        {{ item }}
                      </option>
                    </optgroup>
                  </select>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="space-y-1">
                    <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
                    <input v-model.number="physicalOrderForm.quantity" type="number" min="1" placeholder="1" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount (PHP)</label>
                    <input v-model.number="physicalOrderForm.amount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt Proof</label>
                  <label for="physical-receipt-upload" class="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 px-3 py-2.5 text-sm text-slate-700 transition hover:border-emerald-400">
                    <span class="truncate pr-3">{{ physicalOrderForm.receipt_image ? physicalOrderForm.receipt_image.name : 'Upload image or PDF receipt' }}</span>
                    <span class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Choose File</span>
                  </label>
                  <input id="physical-receipt-upload" type="file" accept=".jpg,.jpeg,.png,.pdf" class="hidden" @change="handlePhysicalReceiptChange" />
                </div>
                <div class="pt-1">
                  <button
                    type="button"
                    class="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="savingPhysicalOrder"
                    @click="submitPhysicalOrder"
                  >
                    {{ savingPhysicalOrder ? 'Saving...' : 'Save Physical Order' }}
                  </button>
                </div>
              </div>
            </article>

            <article class="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-cyan-100 bg-cyan-50 px-5 py-3">
                <h4 class="text-base font-bold text-cyan-900">Online Purchase Entry</h4>
                <span class="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">Auto Inventory</span>
              </div>
              <div class="space-y-4 p-5">
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Item Name</label>
                  <select v-model="onlineOrderForm.material_name" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
                    <option value="" disabled>Select plumbing or siphoning item</option>
                    <optgroup v-for="(items, group) in itemOrderGroups" :key="`online-${group}`" :label="group">
                      <option v-for="item in items" :key="`online-${group}-${item}`" :value="item">
                        {{ item }}
                      </option>
                    </optgroup>
                  </select>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="space-y-1">
                    <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
                    <input v-model.number="onlineOrderForm.quantity" type="number" min="1" placeholder="1" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount (PHP)</label>
                    <input v-model.number="onlineOrderForm.amount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Link</label>
                  <input v-model.trim="onlineOrderForm.purchase_link" type="url" placeholder="https://example.com/item-link" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                </div>
                <div class="pt-1">
                  <button
                    type="button"
                    class="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="savingOnlineOrder"
                    @click="submitOnlineOrder"
                  >
                    {{ savingOnlineOrder ? 'Saving...' : 'Save Online Order' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div>
                <h4 class="text-base font-bold text-slate-900">Recent Ordered Items</h4>
                <p class="text-xs text-slate-500">Track all submitted purchase orders with quantity, price, and proof/link.</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {{ recentOrderedItems.length }} records
              </span>
            </div>
            <div class="p-4">
              <div v-if="!recentOrderedItems.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No order records yet.
              </div>
              <div v-else class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="min-w-full text-sm">
                  <thead class="bg-gradient-to-r from-slate-50 to-cyan-50 text-slate-600">
                    <tr>
                      <th class="px-3 py-2 text-left font-semibold">Date</th>
                      <th class="px-3 py-2 text-left font-semibold">Item Name</th>
                      <th class="px-3 py-2 text-right font-semibold">Quantity</th>
                      <th class="px-3 py-2 text-right font-semibold">Price</th>
                      <th class="px-3 py-2 text-left font-semibold">Link / Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in recentOrderedItems" :key="`order-row-${row.id}`" class="border-t border-slate-100 hover:bg-slate-50/70">
                      <td class="px-3 py-2 text-xs text-slate-500">{{ formatOrderDateTime(row.created_at) }}</td>
                      <td class="px-3 py-2">
                        <p class="font-semibold text-slate-800">{{ row.material_name || 'N/A' }}</p>
                        <p class="text-xs uppercase tracking-wide text-slate-500">{{ row.order_mode }}</p>
                      </td>
                      <td class="px-3 py-2 text-right font-medium text-slate-700">{{ row.quantity }} {{ row.unit }}</td>
                      <td class="px-3 py-2 text-right font-semibold text-slate-900">{{ money(row.total_cost) }}</td>
                      <td class="px-3 py-2">
                        <div class="flex flex-wrap items-center gap-2">
                          <a
                            v-if="row.purchase_link"
                            :href="row.purchase_link"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800 no-underline hover:bg-cyan-200"
                          >
                            Open Link
                          </a>
                          <button
                            v-if="row.receipt_url"
                            type="button"
                            class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 no-underline hover:bg-emerald-200"
                            @click="openReceiptPreview(row.receipt_url)"
                          >
                            View Receipt
                          </button>
                          <span v-if="!row.purchase_link && !row.receipt_url" class="text-xs text-slate-400">No link/photo</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </section>

        <section v-if="isApproved && section==='managed-finance'" class="space-y-5">
          <div class="rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-slate-800 p-6 text-white shadow-lg">
            <h3 class="text-2xl font-bold">Finance Monitoring</h3>
            <p class="mt-1 text-sm text-white/85">Manage available fund, monitor deductions from item orders, and track PR pipeline.</p>
          </div>

          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700">Available Fund</p>
              <p class="mt-1 text-xl font-bold text-emerald-900">{{ money(financeWalletSummary.current_balance) }}</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-rose-700">Spent on Orders</p>
              <p class="mt-1 text-xl font-bold text-rose-900">{{ money(financeWalletSummary.total_spent) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Total PR</p>
              <p class="mt-1 text-xl font-bold text-slate-800">{{ managedFinanceStats.total_pr }}</p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-amber-700">Pending Finance</p>
              <p class="mt-1 text-xl font-bold text-amber-900">{{ managedFinanceStats.pending_finance }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700">Approved PR</p>
              <p class="mt-1 text-xl font-bold text-emerald-900">{{ managedFinanceStats.approved }}</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p class="text-[11px] uppercase tracking-wide text-rose-700">Rejected PR</p>
              <p class="mt-1 text-xl font-bold text-rose-900">{{ managedFinanceStats.rejected }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">Order Type Summary</p>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <p class="text-[11px] uppercase tracking-wide text-cyan-700">Online Orders</p>
                <p class="mt-1 text-xl font-bold text-cyan-900">{{ managedPurchaseTypeSummary.online }}</p>
              </div>
              <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p class="text-[11px] uppercase tracking-wide text-indigo-700">Physical Orders</p>
                <p class="mt-1 text-xl font-bold text-indigo-900">{{ managedPurchaseTypeSummary.physical }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-900">PR Status Breakdown</p>
            </div>
            <div v-if="!managedFinanceRows.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No procurement PR records yet.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="px-3 py-2 text-left">PR Status</th>
                    <th class="px-3 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in managedFinanceRows" :key="`finance-${row.key}`" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-700">{{ formatPrStatus(row.key) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-slate-900">{{ row.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <PendingApplications
          v-if="isApproved && section==='applications'"
          :applications="applications"
          :loading="loadingApplications"
          @review="reviewApplication"
          @refresh="fetchApplications"
          @view="openModal"
        />

        <section v-if="isApproved && section==='requests'" class="space-y-4">
          <div v-if="isBusinessManagedMode" class="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-800">Business-Managed Request Flow</h3>
                <p class="text-xs text-gray-500">Use the same workspace flow for requests, operations, procurement, finance, and staffing.</p>
              </div>
              <span class="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                Shared Workflow
              </span>
            </div>

            <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Total Requests</p>
                <p class="mt-1 font-semibold text-gray-800">{{ stats.totalRequests }}</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Pending Requests</p>
                <p class="mt-1 font-semibold text-gray-800">{{ stats.pendingRequests }}</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Accepted Requests</p>
                <p class="mt-1 font-semibold text-gray-800">{{ stats.acceptedRequests }}</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Rejected Requests</p>
                <p class="mt-1 font-semibold text-gray-800">{{ stats.rejectedRequests }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Operations Queue</p>
                <p class="mt-1 font-semibold text-gray-800">Operational Management</p>
                <p class="mt-2 text-xs text-gray-500">Move validated requests to dispatch review and team planning.</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Materials Gate</p>
                <p class="mt-1 font-semibold text-gray-800">Procurement</p>
                <p class="mt-2 text-xs text-gray-500">Track PR creation, orders, and item availability from the same workspace.</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-gray-500">Payment Gate</p>
                <p class="mt-1 font-semibold text-gray-800">Finance</p>
                <p class="mt-2 text-xs text-gray-500">Review wallet, PR approvals, and payment-related monitoring.</p>
              </div>
            </div>
          </div>

          <ServiceRequests
            :requests="requests"
            :loading="loadingRequests"
            @refresh="fetchRequests"
          />
        </section>

        <section v-if="isApproved && section==='settings'" class="space-y-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">RBAC Checklist</p>
                <h3 class="mt-1 text-lg font-semibold text-slate-900">Staff Permissions</h3>
                <p class="mt-2 text-sm text-slate-600">
                  Configure delegated staff permissions for employees added under this business account.
                </p>
              </div>
              <span
                class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                :class="isBusinessManagedMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-700'"
              >
                {{ isBusinessManagedMode ? 'Business-Managed Workspace' : 'Company HR Workspace' }}
              </span>
            </div>

            <div v-if="!isBusinessManagedMode" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              RBAC checklist for this account is managed in the company HR workspace. Open the HR workspace to edit employee permissions there.
            </div>

            <div v-else class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
              <div class="grid gap-4">
                <div class="rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                  <label class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Select Employee</label>
                  <select
                    v-model="rbacSelectedEmployeeId"
                    class="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-[0_6px_16px_rgba(14,116,144,0.08)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    :disabled="rbacLoadingMatrix || rbacSavingMatrix || rbacEmployeeRows.length === 0"
                    @change="rbacOpenEmployeeModal"
                  >
                    <option value="" disabled>Select employee...</option>
                    <option v-for="employee in rbacEmployeeRows" :key="`rbac-select-${employee.id}`" :value="String(employee.id)">
                      {{ formatEmployeeOptionLabel(employee) }}
                    </option>
                  </select>
                  <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Select one approved employee to load the RBAC checklist for this workspace account.
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Default for new employees: View only. Edit and Approve stay disabled until enabled here for the shared business-managed workflow.</span>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="rbacLoadingMatrix"
                    @click="rbacFetchMatrixSettings(true)"
                  >
                    {{ rbacLoadingMatrix ? 'Refreshing...' : 'Refresh' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </section>
      </main>
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
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-100">Operational Access</p>
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
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
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
                <input
                  v-model="operationalUser.password"
                  :type="showOperationalPassword ? 'text' : 'password'"
                  minlength="8"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="operationalPasswordStrengthClass"
                    :style="{ width: operationalPasswordStrengthWidth }"
                  ></div>
                </div>
                <div class="mt-1 flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-600">Strength: {{ operationalPasswordStrengthLabel }}</span>
                  <button
                    type="button"
                    class="font-semibold text-indigo-700 hover:text-indigo-800"
                    @click="showOperationalPassword = !showOperationalPassword"
                  >
                    {{ showOperationalPassword ? 'Hide' : 'Show' }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Confirm Password</label>
                <input
                  v-model="operationalUser.password_confirmation"
                  :type="showOperationalPasswordConfirm ? 'text' : 'password'"
                  minlength="8"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span :class="operationalPasswordMatchClass">{{ operationalPasswordMatchLabel }}</span>
                  <button
                    type="button"
                    class="font-semibold text-indigo-700 hover:text-indigo-800"
                    @click="showOperationalPasswordConfirm = !showOperationalPasswordConfirm"
                  >
                    {{ showOperationalPasswordConfirm ? 'Hide' : 'Show' }}
                  </button>
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

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              @click="closeOperationalModal"
              class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!canSubmitOperational || savingOperationalUser"
              class="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ savingOperationalUser ? 'Adding...' : 'Add Manager' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="rbacShowEmployeeModal"
      @click.self="rbacCloseEmployeeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div class="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div class="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-600 px-6 py-5 text-white">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">RBAC Checklist</p>
            <h3 class="mt-1 text-2xl font-extrabold">Permissions for {{ rbacSelectedEmployeeName }}</h3>
            <p class="mt-1 text-sm text-white/90">Default for each module is View only.</p>
          </div>
          <button
            type="button"
            @click="rbacCloseEmployeeModal"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div class="space-y-4 bg-gradient-to-b from-slate-50 to-white px-6 py-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
              <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">View</span>
              <span class="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">Manage</span>
              <span class="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1">Approve</span>
            </div>
            <button
              type="button"
              class="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="rbacLoadingMatrix || rbacSavingMatrix || !rbacHasMatrixChanged"
              @click="rbacSaveMatrixSettings"
            >
              {{ rbacSavingMatrix ? 'Saving...' : 'Save RBAC Checklist' }}
            </button>
          </div>

          <div v-if="rbacSelectedEmployeeId && rbacEmployeeModulePermissions[rbacSelectedEmployeeKey]" class="overflow-x-auto">
            <div class="min-w-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <table class="w-full border-collapse text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Module</th>
                    <th class="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">Can View</th>
                    <th class="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">Can Manage</th>
                    <th class="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">Can Approve</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="module in rbacModuleCatalog" :key="`rbac-modal-${module.key}`" class="bg-white transition hover:bg-slate-50/80">
                    <td class="px-4 py-3">
                      <p class="font-semibold text-slate-900">{{ module.label }}</p>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input
                        v-model="rbacEmployeeModulePermissions[rbacSelectedEmployeeKey][module.key].can_view"
                        type="checkbox"
                        class="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        :disabled="rbacLoadingMatrix || rbacSavingMatrix || !rbacSelectedEmployeeId"
                        @change="rbacEnforcePermissionRules(module.key, 'can_view')"
                      />
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input
                        v-model="rbacEmployeeModulePermissions[rbacSelectedEmployeeKey][module.key].can_manage"
                        type="checkbox"
                        class="h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        :disabled="rbacLoadingMatrix || rbacSavingMatrix || !rbacSelectedEmployeeId"
                        @change="rbacEnforcePermissionRules(module.key, 'can_manage')"
                      />
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input
                        v-model="rbacEmployeeModulePermissions[rbacSelectedEmployeeKey][module.key].can_approve"
                        type="checkbox"
                        class="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        :disabled="rbacLoadingMatrix || rbacSavingMatrix || !rbacSelectedEmployeeId"
                        @change="rbacEnforcePermissionRules(module.key, 'can_approve')"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-gray-500">
                Page {{ managedEmployeesPage }} of {{ activeManagedEmployeesTotalPages }} · Showing {{ managedEmployeePageRanges.active.start }}-{{ managedEmployeePageRanges.active.end }} of {{ activeManagedEmployees.length }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="managedEmployeesPage === 1"
                  @click="prevManagedEmployeesPage"
                >
                  Prev
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="managedEmployeesPage === activeManagedEmployeesTotalPages"
                  @click="nextManagedEmployeesPage"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="receiptPreview.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeReceiptPreview"
    >
      <div class="relative w-full max-w-xl rounded-2xl bg-white p-3 shadow-2xl">
        <button
          type="button"
          class="absolute right-2 top-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          @click="closeReceiptPreview"
        >
          Close
        </button>
        <img
          :src="receiptPreview.url"
          alt="Receipt preview"
          class="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg object-contain"
        />
      </div>
    </div>

    <!-- MODAL (NASA LOOB NA, HINDI HIWALAY FILE) -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded w-full max-w-lg relative">
        <button
          class="absolute top-2 right-2 text-xl"
          @click="modalOpen=false">
          &times;
        </button>

        <h3 class="text-xl font-bold mb-4">
          {{ selected.user_name || selected.service_name }}
        </h3>

        <!-- APPLICATION VIEW -->
        <div v-if="modalType==='application'">
          <p><strong>Category:</strong> {{ selected.category }}</p>
          <p><strong>Experience:</strong> {{ selected.experience_years || 'N/A' }} yrs</p>
          <p><strong>Description:</strong> {{ selected.service_description || 'N/A' }}</p>
        </div>

        <!-- REQUEST VIEW -->
        <div v-if="modalType==='request'">
          <p><strong>Service:</strong> {{ selected.service_name }}</p>
          <p><strong>Status:</strong> {{ selected.status }}</p>
          <p><strong>Payment:</strong> {{ paymentMethodLabel(selected.payment_method) }}</p>

          <div
            v-if="normalizeStatus(selected.status)==='pending'"
            class="flex gap-2 mt-4">
            <button
              @click="handleRequest('accept')"
              class="bg-green-600 text-white px-3 py-1 rounded">
              Accept
            </button>
            <button
              @click="handleRequest('reject')"
              class="bg-red-600 text-white px-3 py-1 rounded">
              Reject
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive, watch } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { createToastInterface, POSITION } from 'vue-toastification'
import { confirmAndLogout } from '@/lib/auth-flow'
import { formatEmployeeOptionLabel, isSelectableRbacEmployeeRow } from '@/lib/employee-rbac'
import { getDashboardPathForRole } from '@/lib/firebase-auth'
import { buildTemporaryFilePath, resolveStoredFileUrl, stripFileQuery } from '@/lib/file-url'
import { hasLocalResubmission, markProfileResubmitted } from '@/lib/profile-resubmission'
import WorkspaceNotificationBell from '@/Components/WorkspaceNotificationBell.vue'

import PendingApplications from './PendingApplications.vue'
import ServiceRequests from './ServiceRequests.vue'

/* UI */
const page = usePage()
const authUserId = computed(() => Number(page.props?.auth?.user?.id || 0))
const validSections = [
  'dashboard',
  'managed',
  'managed-employees',
  'managed-approval-queue',
  'managed-assign-team',
  'managed-pricing',
  'managed-teams',
  'managed-payroll',
  'managed-reports',
  'managed-operations',
  'managed-orders',
  'managed-finance',
  'applications',
  'requests',
  'settings',
]
const managedPrimarySections = [
  'managed',
  'managed-employees',
  'managed-approval-queue',
  'managed-assign-team',
  'managed-pricing',
  'managed-teams',
  'managed-payroll',
  'managed-reports',
  'applications',
]
const managedOpsSections = ['managed-operations']
const managedFinanceSections = ['managed-orders', 'managed-finance']
const managedSections = [...managedPrimarySections, ...managedOpsSections, ...managedFinanceSections]
const normalizeSection = (value) => {
  const next = String(value || '').trim().toLowerCase()
  return validSections.includes(next) ? next : 'dashboard'
}
const sectionFromUrl = (url = '') => {
  const raw = String(url || '')
  const query = raw.includes('?')
    ? raw.slice(raw.indexOf('?') + 1)
    : (typeof window !== 'undefined' ? window.location.search.slice(1) : '')
  const fromQuery = new URLSearchParams(query).get('section')
  return normalizeSection(fromQuery)
}
const section = ref(sectionFromUrl(page.url))
const isManagedPrimaryOpen = ref(managedPrimarySections.includes(section.value))
const isManagedOpsOpen = ref(managedOpsSections.includes(section.value))
const isManagedFinanceOpen = ref(managedFinanceSections.includes(section.value))
const active = 'font-bold text-teal-700 bg-teal-50'
const normal = 'cursor-pointer text-gray-600 hover:text-teal-700 hover:bg-teal-50'
const authUser = reactive({
  is_approved:false,
  uid: '',
  id: '',
  email: '',
  contact_number: '',
  status: '',
  approval_status: '',
  rejection_reason: '',
  rejection_checklist: [],
  latest_account_review_title: '',
  latest_account_review_message: '',
  latest_account_review_kind: '',
  latest_account_review_at: '',
  latest_account_review_seen_at: '',
  government_id: '',
  bir_registration: '',
  dti_registration: '',
  mayor_permit: '',
  business_permit: '',
  sanitary_permit: '',
})
const showProfileMenu = ref(false)
const profileInitials = computed(() => {
  const first = String(authUser.first_name || page.props?.auth?.user?.first_name || authUser.business_owner_first || '').trim()
  const last = String(authUser.last_name || page.props?.auth?.user?.last_name || authUser.business_owner_last || '').trim()
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase().trim()
  if (initials) return initials
  const businessName = String(
    authUser.business_name
      || authUser.business_name_1
      || authUser.company_name
      || page.props?.auth?.user?.business_name
      || page.props?.auth?.user?.company_name
      || authUser.business_owner
      || ''
  ).trim()
  if (businessName) {
    return businessName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
  }
  const email = String(authUser.email || page.props?.auth?.user?.email || '').trim()
  return email ? email.charAt(0).toUpperCase() : 'PR'
})
const isApproved = computed(() => !!authUser.is_approved)
const reviewNotifications = ref([])
const businessDocumentsUploading = ref(false)
const selectedBusinessDocumentMap = reactive({
  government_id: null,
  bir_registration: null,
  dti_registration: null,
  mayor_permit: null,
  business_permit: null,
  sanitary_permit: null,
})
const selectedBusinessDocumentPreviewUrls = reactive({
  government_id: '',
  bir_registration: '',
  dti_registration: '',
  mayor_permit: '',
  business_permit: '',
  sanitary_permit: '',
})
const businessContext = reactive({
  id: null,
  business_type: '',
  is_individual: false,
  management_mode: '',
  auto_assign_enabled: false,
  metrics: null,
})
const isIndividualBusiness = computed(() => !!businessContext.is_individual)
const isBusinessManagedMode = computed(
  () => String(businessContext.management_mode || '').trim().toLowerCase() === 'business'
)
const preferredBusinessDashboardPath = computed(() => {
  if (!isApproved.value) return '/Business/BusinessDashboard'
  return getDashboardPathForRole({
    ...authUser,
    role: 'business',
    business_type: businessContext.business_type || '',
    management_mode: businessContext.management_mode || '',
    is_approved: authUser.is_approved,
    status: authUser.status || authUser.approval_status || '',
    approval_status: authUser.approval_status || authUser.status || '',
  })
})
const businessSidebarHeading = computed(() => (
  isBusinessManagedMode.value
    ? {
        lineOne: 'Business',
        lineTwo: 'Manage',
        copy: 'Operations, procurement, finance, and staffing',
      }
    : {
        lineOne: 'Company',
        lineTwo: 'Oversight',
        copy: 'Owner view for requests, providers, reports, and workspace settings',
      }
))
const managementModeLabel = (mode) => {
  const value = String(mode || '').trim().toLowerCase()
  if (value === 'hr') return 'HR-Managed'
  if (value === 'business') return 'Business-Managed'
  return 'Not set'
}
const currentManagementModeLabel = computed(() => managementModeLabel(businessContext.management_mode))
const selectedManagementMode = ref('')
const updatingManagementMode = ref(false)
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
const updatingAutoAssign = ref(false)
const SLA_THRESHOLD_MINUTES = 120
const managedApiError = ref('')
const businessDocumentFields = [
  { key: 'government_id', label: 'Government ID' },
  { key: 'bir_registration', label: 'BIR Registration' },
  { key: 'dti_registration', label: 'DTI Registration' },
  { key: 'mayor_permit', label: 'Mayor Permit' },
  { key: 'business_permit', label: 'Business Permit' },
  { key: 'sanitary_permit', label: 'Sanitary Permit' },
]
const trimString = (value) => String(value || '').trim()
const resolveBusinessFileUrl = (value) => resolveStoredFileUrl(value, '')
const rejectionChecklist = computed(() => (
  Array.isArray(authUser.rejection_checklist) ? authUser.rejection_checklist.filter(Boolean) : []
))
const rejectionChecklistMap = {
  invalid_government_id: {
    label: 'Government ID issue',
    description: 'Re-upload a clear Government ID image.',
    docs: ['government_id'],
  },
  business_documents_incomplete: {
    label: 'Business documents incomplete',
    description: 'Complete the missing business permits and registrations.',
    docs: ['bir_registration', 'dti_registration', 'mayor_permit', 'business_permit', 'sanitary_permit'],
  },
  business_information_mismatch: {
    label: 'Business info mismatch',
    description: 'Update business details or upload matching documents.',
    docs: ['bir_registration', 'dti_registration', 'mayor_permit', 'business_permit', 'sanitary_permit'],
  },
  location_information_missing: {
    label: 'Location details issue',
    description: 'Update your company address/location information.',
    docs: [],
  },
  duplicate_registration: {
    label: 'Possible duplicate registration',
    description: 'Please coordinate with the admin to verify the duplicate record.',
    docs: [],
  },
  other_validation_issue: {
    label: 'Other validation issue',
    description: 'Follow the admin note and update the required details.',
    docs: [],
  },
}
const rejectionChecklistDetails = computed(() => (
  rejectionChecklist.value
    .map((key) => {
      const normalized = String(key || '').trim()
      const mapped = rejectionChecklistMap[normalized]
      if (mapped) return { key: normalized, ...mapped }
      return {
        key: normalized,
        label: normalized.replace(/_/g, ' '),
        description: 'Please review the admin note and update the required information.',
        docs: [],
      }
    })
))
const requiredDocumentKeys = computed(() => {
  const keys = new Set()
  rejectionChecklistDetails.value.forEach((item) => {
    (item.docs || []).forEach((docKey) => keys.add(docKey))
  })
  return [...keys]
})
const requiredDocumentLabels = computed(() => (
  requiredDocumentKeys.value
    .map((key) => businessDocumentFields.find((field) => field.key === key)?.label)
    .filter(Boolean)
))
const resubmissionFields = computed(() => {
  if (!requiredDocumentKeys.value.length) return businessDocumentFields
  return businessDocumentFields.filter((field) => requiredDocumentKeys.value.includes(field.key))
})
const hasResubmittedDocuments = computed(() => {
  const reviewKind = trimString(authUser.latest_account_review_kind).toLowerCase()
  const reviewTitle = trimString(authUser.latest_account_review_title).toLowerCase()
  const reviewMessage = trimString(authUser.latest_account_review_message).toLowerCase()
  const reviewAt = trimString(authUser.latest_account_review_at)
  const resubmittedAt = trimString(authUser.document_resubmitted_at)
  const hasStoredResubmissionFile = Boolean(
    trimString(authUser.government_id_resubmission || authUser.government_id_resubmission_url)
  )
  const resubmittedTime = resubmittedAt ? new Date(resubmittedAt).getTime() : 0
  const reviewTime = reviewAt ? new Date(reviewAt).getTime() : 0
  const resubmittedAfterReview = Boolean(resubmittedAt) && (
    !reviewAt
    || Number.isNaN(resubmittedTime)
    || Number.isNaN(reviewTime)
    || resubmittedTime >= reviewTime
  )
  return Boolean(
    reviewKind === 'resubmitted'
    || reviewTitle.includes('resubmitted')
    || reviewMessage.includes('resubmitted')
    || reviewMessage.includes('updated documents were submitted')
    || resubmittedAfterReview
    || hasStoredResubmissionFile
    || hasLocalResubmission(authUser, reviewAt)
  )
})
const businessAccountState = computed(() => {
  const status = trimString(authUser.status || authUser.approval_status).toLowerCase()
  if (status === 'approved' || authUser.is_approved) return 'approved'
  if (status === 'deleted') return hasResubmittedDocuments.value ? 'pending' : 'deleted'
  if (status === 'rejected') return hasResubmittedDocuments.value ? 'pending' : 'rejected'
  if (['pending', 'pending_approval'].includes(status)) return 'pending'
  if (authUser.is_approved === false) return 'pending'
  return 'pending'
})
const isBusinessCorrectionRequired = computed(() => ['rejected', 'deleted'].includes(businessAccountState.value))
const businessAccountReviewTitle = computed(() => {
  if (businessAccountState.value === 'deleted') return 'Account Deleted'
  if (businessAccountState.value === 'rejected') return 'Account Rejected'
  return 'Account Pending Approval'
})
const businessAccountStatusLabel = computed(() => {
  if (businessAccountState.value === 'approved') return 'Approved'
  if (businessAccountState.value === 'deleted') return 'Deleted'
  if (businessAccountState.value === 'rejected') return 'Rejected'
  return 'Pending Review'
})
const canResubmitBusinessDocuments = computed(() => isBusinessCorrectionRequired.value)
const businessReviewSummary = computed(() => {
  if (businessAccountState.value === 'deleted') {
    return 'Admin removed this business account from active use. Review the details below, correct the account information, then re-upload the required files to send it back for review.'
  }
  if (businessAccountState.value === 'rejected') {
    return 'Admin returned your business account for document review. Check the details below, then re-upload the required files.'
  }
  if (hasResubmittedDocuments.value) {
    return 'Documents resubmitted. Waiting for admin review.'
  }
  return 'Your business account is still under review. You can prepare updated files here in case admin asks for document changes.'
})
const rejectionChecklistLabelMap = {
  invalid_government_id: 'Government ID issue',
  location_issue: 'Location details issue',
  business_documents_incomplete: 'Business documents incomplete',
  business_information_mismatch: 'Business information mismatch',
  duplicate_registration: 'Possible duplicate registration',
  other_issue: 'Other validation issue',
}
const businessRejectionChecklistLabels = computed(() =>
  (Array.isArray(authUser.rejection_checklist) ? authUser.rejection_checklist : [])
    .map((item) => rejectionChecklistLabelMap[item] || trimString(item).replace(/_/g, ' '))
    .filter(Boolean)
)
const businessStoredDocuments = computed(() =>
  businessDocumentFields
    .map((field) => {
      const value = trimString(authUser[field.key])
      const url = resolveBusinessFileUrl(value)
      const path = stripFileQuery(value).toLowerCase()
      return {
        key: field.key,
        label: field.label,
        value,
        url,
        name: value ? stripFileQuery(value).split('/').pop() : 'No saved file',
        previewable: Boolean(url),
        isImage: path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp'),
      }
    })
    .filter((doc) => doc.value)
)
const selectedBusinessDocuments = computed(() =>
  businessDocumentFields
    .map((field) => {
      const file = selectedBusinessDocumentMap[field.key]
      if (!file) return null
      return {
        key: field.key,
        label: field.label,
        name: file.name,
        url: selectedBusinessDocumentPreviewUrls[field.key] || '',
        previewable: Boolean(selectedBusinessDocumentPreviewUrls[field.key]),
        isImage: String(file.type || '').startsWith('image/'),
      }
    })
    .filter(Boolean)
)
const latestBusinessReviewNotification = computed(() =>
  (reviewNotifications.value || []).find((note) => String(note?.type || note?.category || '').toLowerCase().includes('account_review')) || null
)
const latestBusinessReviewNotificationTitle = computed(() => trimString(latestBusinessReviewNotification.value?.title) || trimString(authUser.latest_account_review_title))
const latestBusinessReviewMessage = computed(() => trimString(latestBusinessReviewNotification.value?.message) || trimString(authUser.latest_account_review_message))
const pickManagementMode = (mode) => {
  const next = String(mode || '').trim().toLowerCase()
  if (!['hr', 'business'].includes(next)) return
  selectedManagementMode.value = next
  toast.info(
    next === 'business'
      ? 'Business-Managed selected. Click Save Management Mode to apply.'
      : 'HR-Managed selected. Click Save Management Mode to apply.'
  )
}
const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value
}
const openProfile = () => {
  showProfileMenu.value = false
  router.visit('/Profile/Profile')
}
const handleProfileMenuClick = (event) => {
  const target = event?.target
  if (!(target instanceof HTMLElement)) return
  if (!target.closest('.business-profile-wrap')) {
    showProfileMenu.value = false
  }
}

const validateBusinessDocumentFile = (file) => {
  if (!(file instanceof File)) return 'No file selected.'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const allowed = type.startsWith('image/')
    || type === 'application/pdf'
    || ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].some((ext) => name.endsWith(ext))
  if (!allowed) return 'Please select a JPG, PNG, WEBP, or PDF file.'
  if (file.size > 50 * 1024 * 1024) return 'Maximum file size is 50MB.'
  return ''
}

const clearSelectedBusinessDocument = (field) => {
  const key = trimString(field)
  if (!key || !(key in selectedBusinessDocumentMap)) return
  selectedBusinessDocumentMap[key] = null
  if (selectedBusinessDocumentPreviewUrls[key]) {
    URL.revokeObjectURL(selectedBusinessDocumentPreviewUrls[key])
    selectedBusinessDocumentPreviewUrls[key] = ''
  }
}

const clearAllSelectedBusinessDocuments = () => {
  businessDocumentFields.forEach((field) => clearSelectedBusinessDocument(field.key))
}

const handleBusinessDocumentSelection = (field, event) => {
  const file = event?.target?.files?.[0]
  if (!file) return

  const validationMessage = validateBusinessDocumentFile(file)
  if (validationMessage) {
    Swal.fire('Invalid File', validationMessage, 'warning')
    event.target.value = ''
    clearSelectedBusinessDocument(field)
    return
  }

  clearSelectedBusinessDocument(field)
  selectedBusinessDocumentMap[field] = file
  selectedBusinessDocumentPreviewUrls[field] = URL.createObjectURL(file)
}

const applyLocalResubmission = () => {
  const nowIso = new Date().toISOString()
  markProfileResubmitted(authUser, nowIso)
  authUser.document_resubmitted_at = nowIso
  authUser.latest_account_review_kind = 'resubmitted'
  authUser.latest_account_review_title = 'Documents resubmitted'
  authUser.latest_account_review_message = 'Your updated documents were submitted for review.'
  authUser.latest_account_review_at = nowIso
  authUser.latest_account_review_seen_at = null
  authUser.status = 'pending'
  authUser.approval_status = 'pending'
  authUser.is_approved = false
}

const openStoredBusinessDocument = (url) => {
  const target = trimString(url)
  if (!target) return
  window.open(target, '_blank', 'noopener')
}

const fetchReviewNotifications = async () => {
  try {
    const res = await axios.get('/user/notifications')
    reviewNotifications.value = Array.isArray(res.data) ? res.data : []
  } catch {
    reviewNotifications.value = []
  }
}

const fetchOwnProfile = async () => {
  try {
    const res = await axios.get('/user/profile')
    Object.assign(authUser, res.data || {})
    notifyBusinessReviewUpdate()
  } catch {
    // Keep business workspace usable with whatever cached auth state exists.
  }
}

const notifyBusinessReviewUpdate = () => {
  const reviewAt = trimString(authUser.latest_account_review_at)
  const message = authUser.rejection_reason || latestBusinessReviewMessage.value
  if (!reviewAt || !message) return
  if (trimString(authUser.latest_account_review_seen_at) === reviewAt) return
  if (trimString(latestBusinessReviewNotification.value?.read_at) && trimString(latestBusinessReviewNotification.value?.created_at) === reviewAt) return
  if (window.__businessLatestReviewToastAt === reviewAt) return
  window.__businessLatestReviewToastAt = reviewAt
  if (!message) return
  toast[String(authUser.latest_account_review_kind || '').toLowerCase() === 'rejected' ? 'error' : 'info'](
    message,
    { timeout: 3200 },
  )
}

const submitBusinessDocuments = async () => {
  if (!selectedBusinessDocuments.value.length || businessDocumentsUploading.value) return

  try {
    businessDocumentsUploading.value = true
    const previousDocumentValues = businessDocumentFields.reduce((accumulator, field) => {
      accumulator[field.key] = trimString(authUser[field.key])
      return accumulator
    }, {})
    const formData = new FormData()
    formData.append('_method', 'PUT')
    if (isBusinessCorrectionRequired.value) {
      formData.append('force_resubmission', '1')
    }

    businessDocumentFields.forEach((field) => {
      const file = selectedBusinessDocumentMap[field.key]
      if (file instanceof File) {
        formData.append(field.key, file)
      }
    })

    await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    await fetchOwnProfile()
    businessDocumentFields.forEach((field) => {
      const file = selectedBusinessDocumentMap[field.key]
      if (!(file instanceof File)) return
      const currentValue = trimString(authUser[field.key])
      const previousValue = trimString(previousDocumentValues[field.key])
      if (currentValue && currentValue !== previousValue) return
      authUser[field.key] = buildTemporaryFilePath('files', authUser.uid || authUser.id || 'local', file.name, selectedBusinessDocumentPreviewUrls[field.key])
    })
    applyLocalResubmission()
    await fetchReviewNotifications()
    clearAllSelectedBusinessDocuments()
    Swal.fire('Success', 'Updated documents uploaded successfully and sent back for review.', 'success')
  } catch (err) {
    const fieldErrors = err?.response?.data?.errors || {}
    const firstFieldError = Object.values(fieldErrors).flat().find(Boolean)
    Swal.fire('Error', firstFieldError || err?.response?.data?.message || 'Failed to upload new documents.', 'error')
  } finally {
    businessDocumentsUploading.value = false
  }
}

const businessManagedNavGroups = [
  {
    title: 'Core Workflow',
    items: [
      { label: 'Dashboard', section: 'dashboard', icon: 'DB' },
      { label: 'Service Requests', section: 'requests', icon: 'SR' },
      { label: 'Operational Management', section: 'managed-operations', icon: 'OM' },
      { label: 'Procurement', section: 'managed-orders', icon: 'PR' },
      { label: 'Finance', section: 'managed-finance', icon: 'FN' },
      { label: 'Service Pricing', section: 'managed-pricing', icon: 'SP' },
      { label: 'Team Overview', section: 'managed-teams', icon: 'TM' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Service Providers', section: 'applications', icon: 'SV' },
      { label: 'Employee Mgmt', section: 'managed-employees', icon: 'EM' },
      { label: 'Approval Queue', section: 'managed-approval-queue', icon: 'AQ' },
      { label: 'Linked Employees', section: 'managed-assign-team', icon: 'LE' },
      { label: 'Payroll', section: 'managed-payroll', icon: 'PY' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports', section: 'managed-reports', icon: 'RP' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Settings', section: 'settings', icon: 'ST' },
    ],
  },
]

const companyHrNavGroups = [
  {
    title: 'Owner View',
    items: [
      { label: 'Dashboard', section: 'dashboard', icon: 'DB' },
      { label: 'Service Requests', section: 'requests', icon: 'SR' },
      { label: 'Service Providers', section: 'applications', icon: 'SV' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', section: 'managed-reports', icon: 'RP' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Settings', section: 'settings', icon: 'ST' },
    ],
  },
]

const businessNavGroups = computed(() => (
  isBusinessManagedMode.value ? businessManagedNavGroups : companyHrNavGroups
))

const allowedSectionsForMode = computed(() => (
  isBusinessManagedMode.value
    ? validSections
    : ['dashboard', 'requests', 'applications', 'managed-reports', 'settings']
))

const normalizeSectionForMode = (value) => {
  const next = normalizeSection(value)
  return allowedSectionsForMode.value.includes(next) ? next : 'dashboard'
}

const openBusinessGroupTitle = ref('')
const isBusinessGroupOpen = (title) => openBusinessGroupTitle.value === title
const toggleBusinessGroup = (title) => {
  openBusinessGroupTitle.value = openBusinessGroupTitle.value === title ? '' : title
}
const isBusinessItemActive = (item) => item?.section === section.value

const resolveBusinessGroupForSection = (sectionKey) => {
  const match = businessNavGroups.value.find((group) =>
    (group.items || []).some((item) => item.section === sectionKey)
  )
  return match?.title || businessNavGroups.value[0]?.title || ''
}

/* RBAC */
const rbacModuleCatalog = [
  { key: 'service_providers', label: 'Service Providers' },
  { key: 'linked_employees', label: 'Linked Employees' },
  { key: 'employee_management', label: 'Employee Management' },
  { key: 'approval_queue', label: 'Approval Queue' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'reports', label: 'Reports' },
]
const rbacModuleDefaultRow = {
  can_view: false,
  can_manage: false,
  can_approve: false,
}
const rbacNormalizeStaffPermissionRow = (value, fallback = null) => ({
  can_view: value?.can_view ?? fallback?.can_view ?? true,
  can_manage: value?.can_manage ?? fallback?.can_manage ?? false,
  can_approve: value?.can_approve ?? fallback?.can_approve ?? false,
})
const rbacNormalizeModuleMatrix = (modules, fallbackRow = null, fallbackModules = null) => {
  const normalized = {}
  rbacModuleCatalog.forEach((module) => {
    const fallbackForModule = fallbackModules?.[module.key] || fallbackRow || rbacModuleDefaultRow
    normalized[module.key] = rbacNormalizeStaffPermissionRow(modules?.[module.key], fallbackForModule)
  })
  return normalized
}
const rbacResolveEmployeeModuleMatrix = (staffPermissions) => {
  const raw = staffPermissions || {}
  if (raw?.modules && typeof raw.modules === 'object') {
    return rbacNormalizeModuleMatrix(raw.modules)
  }
  const hasModuleKey = rbacModuleCatalog.some((module) => Object.prototype.hasOwnProperty.call(raw, module.key))
  if (hasModuleKey) {
    return rbacNormalizeModuleMatrix(raw)
  }
  return rbacNormalizeModuleMatrix(null, rbacModuleDefaultRow)
}
const rbacDefaultCreatorRoleStaffMatrix = () => ({
  business_owner: rbacNormalizeStaffPermissionRow(null),
  hr_owner: rbacNormalizeStaffPermissionRow(null),
})
const rbacCreatorRoleStaffMatrix = ref(rbacDefaultCreatorRoleStaffMatrix())
const rbacEmployeeRows = ref([])
const rbacEmployeeModulePermissions = ref({})
const rbacEmployeePermissionsSnapshot = ref('{}')
const rbacSelectedEmployeeId = ref('')
const rbacLoadingMatrix = ref(false)
const rbacSavingMatrix = ref(false)
const rbacLoadedOnce = ref(false)
const rbacShowEmployeeModal = ref(false)
let rbacRealtimeChannel = null

const rbacSelectedEmployeeKey = computed(() => String(rbacSelectedEmployeeId.value || ''))
const rbacSelectedEmployeeName = computed(() => {
  const match = rbacEmployeeRows.value.find((row) => String(row.id) === rbacSelectedEmployeeKey.value)
  return match?.name || 'Select employee'
})
const rbacHasMatrixChanged = computed(
  () => JSON.stringify(rbacEmployeeModulePermissions.value) !== rbacEmployeePermissionsSnapshot.value
)

const rbacApplyCreatorRoleStaffMatrix = (matrix) => {
  rbacCreatorRoleStaffMatrix.value = {
    business_owner: rbacNormalizeStaffPermissionRow(matrix?.business_owner),
    hr_owner: rbacNormalizeStaffPermissionRow(matrix?.hr_owner),
  }
}
const rbacNormalizeEmployeeId = (row = {}) => String(row?.id || row?.uid || row?.user_id || '').trim()

const rbacApplyEmployeeRows = (rows) => {
  const normalizedRows = []
  const normalizedPermissions = {}

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const employeeId = rbacNormalizeEmployeeId(row)
    if (!employeeId) return
    if (!isSelectableRbacEmployeeRow(row)) return

    normalizedRows.push({
      id: employeeId,
      name: String(row?.name || `Employee #${employeeId}`),
      email: String(row?.email || ''),
    })
    normalizedPermissions[String(employeeId)] = rbacResolveEmployeeModuleMatrix(row?.staff_permissions)
  })

  rbacEmployeeRows.value = normalizedRows
  rbacEmployeeModulePermissions.value = normalizedPermissions
  rbacEmployeePermissionsSnapshot.value = JSON.stringify(normalizedPermissions)

  const hasSelected = normalizedRows.some((row) => String(row.id) === String(rbacSelectedEmployeeId.value))
  if (!hasSelected) {
    rbacSelectedEmployeeId.value = ''
    rbacShowEmployeeModal.value = false
  }
}

const rbacOpenEmployeeModal = () => {
  if (!rbacSelectedEmployeeId.value) return
  rbacShowEmployeeModal.value = true
}

const rbacCloseEmployeeModal = () => {
  rbacShowEmployeeModal.value = false
}

const rbacEnforcePermissionRules = (moduleKey, field) => {
  const employeeKey = rbacSelectedEmployeeKey.value
  if (!employeeKey || !moduleKey) return
  const row = rbacEmployeeModulePermissions.value?.[employeeKey]?.[moduleKey]
  if (!row) return

  if (field === 'can_view' && row.can_view === false) {
    row.can_manage = false
    row.can_approve = false
  }

  if (field === 'can_manage' && row.can_manage === true) {
    row.can_view = true
  }

  if (field === 'can_approve' && row.can_approve === true) {
    row.can_view = true
  }
}

const rbacFetchMatrixSettings = async (force = false) => {
  if (!isApproved.value || !isBusinessManagedMode.value) return
  if (rbacLoadingMatrix.value) return
  if (!force && rbacLoadedOnce.value) return

  rbacLoadingMatrix.value = true
  try {
    const res = await axios.get('/business/settings/rbac-matrix')
    rbacApplyCreatorRoleStaffMatrix(res.data?.creator_role_staff_matrix || {})
    rbacApplyEmployeeRows(res.data?.employee_rows || [])
    rbacLoadedOnce.value = true
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to load RBAC checklist settings.')
  } finally {
    rbacLoadingMatrix.value = false
  }
}

const rbacSaveMatrixSettings = async () => {
  if (!isBusinessManagedMode.value || rbacSavingMatrix.value || !rbacHasMatrixChanged.value) return

  rbacSavingMatrix.value = true
  try {
    const normalizedEmployeePermissions = {}
    Object.entries(rbacEmployeeModulePermissions.value || {}).forEach(([employeeId, modules]) => {
      normalizedEmployeePermissions[String(employeeId)] = {
        modules: rbacNormalizeModuleMatrix(modules),
      }
    })

    const payload = {
      creator_role_staff_matrix: {
        business_owner: rbacNormalizeStaffPermissionRow(rbacCreatorRoleStaffMatrix.value.business_owner),
        hr_owner: rbacNormalizeStaffPermissionRow(rbacCreatorRoleStaffMatrix.value.hr_owner),
      },
      employee_permissions: normalizedEmployeePermissions,
    }

    const res = await axios.post('/business/settings/rbac-matrix', payload)
    rbacApplyCreatorRoleStaffMatrix(res.data?.creator_role_staff_matrix || payload.creator_role_staff_matrix)
    const fallbackRows = rbacEmployeeRows.value.map((employee) => ({
      ...employee,
      staff_permissions: normalizedEmployeePermissions[String(employee.id)] || { modules: rbacNormalizeModuleMatrix(null) },
    }))
    rbacApplyEmployeeRows(res.data?.employee_rows || fallbackRows)
    toast.success(res.data?.message || 'RBAC checklist settings updated.')
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to save RBAC checklist settings.')
  } finally {
    rbacSavingMatrix.value = false
  }
}

const rbacStartRealtime = () => {
  if (!window.Echo || authUserId.value <= 0 || rbacRealtimeChannel) return

  rbacRealtimeChannel = window.Echo.private(`users.${authUserId.value}`)
  rbacRealtimeChannel.listen('.business.rbac.updated', (payload) => {
    const creatorMatrix = payload?.creator_role_staff_matrix
    const employeeRowsPayload = payload?.employee_rows

    if (creatorMatrix && Array.isArray(employeeRowsPayload)) {
      rbacApplyCreatorRoleStaffMatrix(creatorMatrix)
      rbacApplyEmployeeRows(employeeRowsPayload)
      return
    }

    rbacFetchMatrixSettings(true)
  })
}

const rbacStopRealtime = () => {
  if (!window.Echo || authUserId.value <= 0 || !rbacRealtimeChannel) return
  window.Echo.leave(`users.${authUserId.value}`)
  rbacRealtimeChannel = null
}

const ensureRbacLoaded = (force = false) => {
  if (!isApproved.value || !isBusinessManagedMode.value) return
  rbacStartRealtime()
  rbacFetchMatrixSettings(force)
}

/* OPERATIONAL MANAGERS */
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
const operationalManagers = ref([])
const loadingOperationalManagers = ref(false)
const operationalManagersLoaded = ref(false)

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

const closeOperationalModal = () => {
  showOperationalModal.value = false
  savingOperationalUser.value = false
  showOperationalPassword.value = false
  showOperationalPasswordConfirm.value = false
  resetOperationalUser()
}

const submitOperationalUser = async () => {
  if (savingOperationalUser.value) return
  if (!canSubmitOperational.value) {
    toast.error('Complete all required fields and match the passwords.')
    return
  }

  savingOperationalUser.value = true
  try {
    await axios.post('/business/operational-management-users', operationalUser.value)
    toast.success('Operational manager account created.')
    closeOperationalModal()
    fetchOperationalManagers(true)
  } catch (error) {
    const message = error?.response?.data?.message
      || error?.response?.data?.error
      || (error?.response?.data?.errors ? Object.values(error.response.data.errors)[0][0] : null)
      || 'Failed to create operational manager account.'
    toast.error(message)
  } finally {
    savingOperationalUser.value = false
  }
}

const fetchOperationalManagers = async (force = false) => {
  if (loadingOperationalManagers.value) return
  if (!force && operationalManagersLoaded.value) return
  loadingOperationalManagers.value = true
  try {
    const res = await axios.get('/business/operational-management-users')
    operationalManagers.value = Array.isArray(res.data) ? res.data : []
    operationalManagersLoaded.value = true
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to load operational managers.')
  } finally {
    loadingOperationalManagers.value = false
  }
}

const ensureOperationalManagersLoaded = (force = false) => {
  if (!isApproved.value) return
  fetchOperationalManagers(force)
}

/* DATA */
const applications = ref([])
const requests = ref([])
const managedInventorySummary = ref([])
const managedInventoryTotals = reactive({
  received_qty: 0,
  allocated_qty: 0,
  available_qty: 0,
  low_stock_items: 0,
})
const managedPrStatusSummary = ref({})
const managedPurchaseTypeSummary = reactive({
  online: 0,
  physical: 0,
})
const recentOrderedItems = ref([])
const physicalOrderForm = reactive({
  material_name: '',
  quantity: 1,
  amount: null,
  receipt_image: null,
})
const onlineOrderForm = reactive({
  material_name: '',
  quantity: 1,
  purchase_link: '',
  amount: null,
})
const financeWalletSummary = reactive({
  current_balance: 0,
  total_spent: 0,
})
const operationalNeededInputByRequestId = reactive({})
const operationalNeededQtyByRequestId = reactive({})
const operationalSelectedItemsByRequestId = reactive({})
const sendingServiceProviderAcceptanceId = ref(null)
const savingPhysicalOrder = ref(false)
const savingOnlineOrder = ref(false)
const availableProviders = ref([])
const selectedProviderByRequest = reactive({})
const assigningRequestId = ref(null)
const receiptPreview = reactive({
  open: false,
  url: '',
})

const PLUMBING_ITEM_OPTIONS = [
  'PVC Pipe',
  'Elbow Fitting',
  'Teflon Tape',
  'Pipe Sealant',
  'Adjustable Wrench',
  'Pipe Wrench',
  'P-Trap',
  'Drain Cleaner',
]

const SIPHONING_ITEM_OPTIONS = [
  'Suction Hose',
  'Discharge Hose',
  'Septic Tank Pump',
  'Vacuum Tank Filter',
  'Protective Gloves',
  'Safety Goggles',
  'Waste Drum',
  'Deodorizer Solution',
]

const GENERIC_ITEM_OPTIONS = [
  'Safety Gloves',
  'Face Mask',
  'Disinfectant',
  'Cleaning Cloth',
]

const itemOrderGroups = computed(() => ({
  Plumbing: PLUMBING_ITEM_OPTIONS,
  Siphoning: SIPHONING_ITEM_OPTIONS,
}))

const normalizeOperationalServiceType = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.includes('plumbing')) return 'plumbing'
  if (raw.includes('siphoning')) return 'siphoning'
  return 'generic'
}

const operationalServiceTypeLabel = (value) => {
  const type = normalizeOperationalServiceType(value)
  if (type === 'plumbing') return 'plumbing'
  if (type === 'siphoning') return 'siphoning'
  return 'general'
}

const operationalItemOptionsForType = (serviceType) => {
  const type = normalizeOperationalServiceType(serviceType)
  if (type === 'plumbing') return PLUMBING_ITEM_OPTIONS
  if (type === 'siphoning') return SIPHONING_ITEM_OPTIONS
  return GENERIC_ITEM_OPTIONS
}

const inventoryAvailableByItemName = computed(() => {
  const map = {}
  ;(managedInventorySummary.value || []).forEach((row) => {
    const name = String(row?.material_name || '').trim().toLowerCase()
    if (!name) return
    map[name] = Number(row?.available || 0)
  })
  return map
})

const operationalInventoryOptionsForType = (serviceType) => {
  const baseItems = operationalItemOptionsForType(serviceType)
  const stockMap = inventoryAvailableByItemName.value || {}
  return baseItems.map((name) => ({
    name,
    available: Number(stockMap[String(name || '').trim().toLowerCase()] || 0),
  }))
}

const selectedOperationalAvailableByRequest = (requestId) => {
  const selectedName = String(operationalNeededInputByRequestId[requestId] || '').trim().toLowerCase()
  if (!selectedName) return 0
  return Number(inventoryAvailableByItemName.value[selectedName] || 0)
}

const normalizeOperationalNeededQty = (requestId) => {
  const id = Number(requestId)
  if (!id) return
  const current = Number(operationalNeededQtyByRequestId[id] || 1)
  operationalNeededQtyByRequestId[id] = Math.max(1, Math.floor(current || 1))
}

const increaseOperationalNeededQty = (requestId) => {
  const id = Number(requestId)
  if (!id) return
  const current = Number(operationalNeededQtyByRequestId[id] || 1)
  operationalNeededQtyByRequestId[id] = Math.max(1, Math.floor(current || 1) + 1)
}

const decreaseOperationalNeededQty = (requestId) => {
  const id = Number(requestId)
  if (!id) return
  const current = Number(operationalNeededQtyByRequestId[id] || 1)
  operationalNeededQtyByRequestId[id] = Math.max(1, Math.floor(current || 1) - 1)
}

const addOperationalNeededItem = (row) => {
  const requestId = Number(row?.id)
  if (!requestId) return
  const selected = String(operationalNeededInputByRequestId[requestId] || '').trim()
  if (!selected) return
  normalizeOperationalNeededQty(requestId)
  const selectedQty = Number(operationalNeededQtyByRequestId[requestId] || 1)
  const selectedLabel = `${selected} x${selectedQty}`

  if (!Array.isArray(operationalSelectedItemsByRequestId[requestId])) {
    operationalSelectedItemsByRequestId[requestId] = []
  }
  const current = operationalSelectedItemsByRequestId[requestId]
  if (current.some((item) => String(item || '').trim().toLowerCase().startsWith(`${selected.toLowerCase()} x`))) {
    Swal.fire('Duplicate Item', 'Item is already in the list.', 'info')
    return
  }
  if (current.length >= 5) {
    Swal.fire('Limit Reached', 'You can only select up to 5 items/equipment.', 'warning')
    return
  }
  current.push(selectedLabel)
  operationalNeededInputByRequestId[requestId] = ''
  operationalNeededQtyByRequestId[requestId] = 1
}

const removeOperationalNeededItem = (requestId, itemName) => {
  const id = Number(requestId)
  const name = String(itemName || '').trim()
  if (!id || !name) return
  const current = operationalSelectedItemsByRequestId[id] || []
  operationalSelectedItemsByRequestId[id] = current.filter((item) => String(item || '').trim() !== name)
}

const loadingApplications = ref(false)
const loadingRequests = ref(false)
const loadingProviders = ref(false)

const normalizeStatus = (value) => String(value || '').trim().toLowerCase()

const stats = computed(() => {
  const totalRequests = requests.value.length
  const pendingRequests = requests.value.filter(r => normalizeStatus(r.status) === 'pending').length
  const acceptedStatuses = ['accepted', 'approved', 'assigned', 'in_progress', 'completed', 'awaiting_material', 'job_ready']
  const acceptedRequests = requests.value.filter(r => acceptedStatuses.includes(normalizeStatus(r.status))).length
  const rejectedRequests = requests.value.filter(r => normalizeStatus(r.status) === 'rejected').length

  const totalApplications = applications.value.length
  const pendingApplications = applications.value.filter(a => normalizeStatus(a.status || 'pending') === 'pending').length

  return {
    totalRequests,
    pendingRequests,
    acceptedRequests,
    rejectedRequests,
    totalApplications,
    pendingApplications
  }
})

const toRate = (part, total) => total ? Math.round((part / total) * 100) : 0

const rates = computed(() => ({
  approval: toRate(stats.value.acceptedRequests, stats.value.totalRequests),
  pending: toRate(stats.value.pendingRequests, stats.value.totalRequests),
  rejected: toRate(stats.value.rejectedRequests, stats.value.totalRequests)
}))

const individualAssignableRequests = computed(() =>
  requests.value.filter((r) => {
    const status = normalizeStatus(r.status)
    return ['approved', 'accepted'].includes(status) && !r.service_provider_id
  })
)

const individualKpis = computed(() => {
  const rows = requests.value || []
  const total = rows.length
  const completed = rows.filter((r) => normalizeStatus(r.status) === 'completed').length
  const waiting = rows.filter((r) => ['approved', 'accepted'].includes(normalizeStatus(r.status)) && !r.service_provider_id)
  const breaches = waiting.filter((r) => {
    const created = r?.created_at ? new Date(r.created_at) : null
    if (!created || Number.isNaN(created.getTime())) return false
    const diffMinutes = Math.max(0, (Date.now() - created.getTime()) / 60000)
    return diffMinutes > SLA_THRESHOLD_MINUTES
  }).length

  const durations = rows
    .filter((r) => r?.assigned_at && r?.created_at)
    .map((r) => {
      const created = new Date(r.created_at)
      const assigned = new Date(r.assigned_at)
      if (Number.isNaN(created.getTime()) || Number.isNaN(assigned.getTime())) return null
      return Math.max(0, (assigned.getTime() - created.getTime()) / 60000)
    })
    .filter((v) => v !== null)

  const avgAssign = durations.length
    ? Math.round((durations.reduce((sum, v) => sum + v, 0) / durations.length) * 100) / 100
    : 0

  return {
    completion_rate: total ? Math.round((completed / total) * 10000) / 100 : 0,
    avg_assign_minutes: avgAssign,
    waiting_for_assignment: waiting.length,
    sla_breaches: breaches,
  }
})

const managedOperationalRequests = computed(() => {
  const allowed = new Set(['assigned', 'awaiting_material', 'job_ready', 'in_progress', 'completed'])
  return (requests.value || []).filter((row) => {
    const normalized = normalizeStatus(row?.status)
    if (!allowed.has(normalized)) return false
    const notesText = String(row?.notes || row?.details || '')
    const teamTag = extractWorkflowTag(notesText, 'TEAM')
    const acceptanceTag = extractWorkflowTag(notesText, 'SP_ACCEPTANCE').toLowerCase()
    const leaderConfirmationTag = extractWorkflowTag(notesText, 'TL_CONFIRMATION').toLowerCase()
    const materialsCollectedTag = extractWorkflowTag(notesText, 'MATERIALS_COLLECTED').toLowerCase()
    const hasTeamContext = String(teamTag || '').trim() !== '' || /\[team-request\]/i.test(notesText)
    const isAcceptanceFlow = acceptanceTag === 'sent'
    const isLeaderFlow = leaderConfirmationTag === 'accepted' || materialsCollectedTag === 'yes'
    return hasTeamContext || isAcceptanceFlow || isLeaderFlow
  })
})

const extractWorkflowTag = (text, tag) => {
  const source = String(text || '')
  const cleanTag = String(tag || '').trim().toUpperCase()
  if (!source || !cleanTag) return ''
  const match = source.match(new RegExp(`\\[${cleanTag}\\s*:\\s*([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim()
}

const prettyStatusLabel = (value) => String(value || '')
  .trim()
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeTeamLookupKey = (value) => String(value || '').trim().toLowerCase()

const managedTeamMetaByName = computed(() => {
  const map = {}
  managedTeamRows.value.forEach((row) => {
    const key = normalizeTeamLookupKey(row?.team)
    if (!key) return
    const leader = String(row?.leaderName || '').trim()
    const leaderKey = leader.toLowerCase()
    const members = (row?.members || [])
      .map((member) => String(member?.name || '').trim())
      .filter(Boolean)
      .filter((name) => name.toLowerCase() !== leaderKey)
    map[key] = {
      members,
      leader,
    }
  })
  return map
})

const managedOperationalQueueRows = computed(() =>
  managedOperationalRequests.value.map((row) => {
    const customerName = String(row?.user_name || '').trim() || 'Customer'
    const bookedType = String(row?.service_name || row?.service_type || 'N/A').trim()
    const notesText = String(row?.notes || row?.details || '')
    const parsedTeam = extractWorkflowTag(notesText, 'TEAM')
    const acceptanceTag = extractWorkflowTag(notesText, 'SP_ACCEPTANCE').toLowerCase()
    const leaderConfirmationTag = extractWorkflowTag(notesText, 'TL_CONFIRMATION').toLowerCase()
    const materialsCollectedTag = extractWorkflowTag(notesText, 'MATERIALS_COLLECTED').toLowerCase()
    const normalizedStatus = normalizeStatus(row?.status)
    const teamKey = normalizeTeamLookupKey(parsedTeam)
    const teamMeta = teamKey ? (managedTeamMetaByName.value[teamKey] || { members: [], leader: '' }) : { members: [], leader: '' }
    const acceptanceSent = acceptanceTag === 'sent'
    const isLeaderFlow = leaderConfirmationTag === 'accepted' || materialsCollectedTag === 'yes'
    const isCompleted = normalizedStatus === 'completed' && (acceptanceSent || isLeaderFlow)
    return {
      id: row?.id,
      customer_name: customerName,
      booked_type: bookedType,
      assigned_team: parsedTeam || 'Not yet assigned',
      team_leader: teamMeta.leader || 'No leader assigned',
      team_members: teamMeta.members,
      status_label: prettyStatusLabel(row?.status),
      is_completed: isCompleted,
      acceptance_sent: acceptanceSent,
      acceptance_locked: acceptanceSent || isCompleted,
    }
  })
)

const managedOperationsStats = computed(() => {
  const rows = managedOperationalRequests.value || []
  const assigned = rows.filter((row) => normalizeStatus(row?.status) === 'assigned').length
  const awaitingMaterial = rows.filter((row) => normalizeStatus(row?.status) === 'awaiting_material').length
  const activeWork = rows.filter((row) => ['job_ready', 'in_progress'].includes(normalizeStatus(row?.status))).length
  const completed = rows.filter((row) => normalizeStatus(row?.status) === 'completed').length
  return {
    assigned,
    awaiting_material: awaitingMaterial,
    active_work: activeWork,
    completed,
  }
})

const managedPrPendingFinance = computed(() => Number(managedPrStatusSummary.value?.pending_finance_approval || 0))

const managedFinanceRows = computed(() => {
  const map = managedPrStatusSummary.value || {}
  return Object.keys(map)
    .map((key) => ({ key, total: Number(map[key] || 0) }))
    .sort((a, b) => b.total - a.total)
})

const managedFinanceStats = computed(() => {
  const rows = managedFinanceRows.value
  const totalPr = rows.reduce((sum, row) => sum + row.total, 0)
  const pending = Number(managedPrStatusSummary.value?.pending_finance_approval || 0)
  const approved = Number(managedPrStatusSummary.value?.approved || 0)
  const rejected = Number(managedPrStatusSummary.value?.rejected || 0)
  return {
    total_pr: totalPr,
    pending_finance: pending,
    approved,
    rejected,
  }
})

const resetPhysicalOrderForm = () => {
  physicalOrderForm.material_name = ''
  physicalOrderForm.quantity = 1
  physicalOrderForm.amount = null
  physicalOrderForm.receipt_image = null
}

const resetOnlineOrderForm = () => {
  onlineOrderForm.material_name = ''
  onlineOrderForm.quantity = 1
  onlineOrderForm.purchase_link = ''
  onlineOrderForm.amount = null
}

const handlePhysicalReceiptChange = (event) => {
  const file = event?.target?.files?.[0] || null
  physicalOrderForm.receipt_image = file
}

const submitPhysicalOrder = async () => {
  if (!physicalOrderForm.material_name.trim()) {
    Swal.fire('Missing Item', 'Please enter item name.', 'warning')
    return
  }
  if (!(Number(physicalOrderForm.quantity) > 0)) {
    Swal.fire('Invalid Quantity', 'Quantity must be greater than 0.', 'warning')
    return
  }
  if (!(Number(physicalOrderForm.amount) >= 0)) {
    Swal.fire('Invalid Amount', 'Amount is required.', 'warning')
    return
  }
  if (!physicalOrderForm.receipt_image) {
    Swal.fire('Missing Receipt', 'Please upload receipt proof photo/file.', 'warning')
    return
  }

  const formData = new FormData()
  formData.append('purchase_type', 'physical')
  formData.append('material_name', physicalOrderForm.material_name.trim())
  formData.append('quantity', String(physicalOrderForm.quantity))
  formData.append('amount', String(physicalOrderForm.amount))
  formData.append('receipt_image', physicalOrderForm.receipt_image)

  savingPhysicalOrder.value = true
  try {
    await axios.post('/business/operations/inventory-order', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    Swal.fire('Saved', 'Physical purchase saved and added to inventory.', 'success')
    resetPhysicalOrderForm()
    await fetchRequests()
  } catch (err) {
    const firstError = Object.values(err?.response?.data?.errors || {})?.[0]?.[0] || ''
    Swal.fire('Error', firstError || err.response?.data?.message || 'Failed to save physical order.', 'error')
  } finally {
    savingPhysicalOrder.value = false
  }
}

const submitOnlineOrder = async () => {
  if (!onlineOrderForm.material_name.trim()) {
    Swal.fire('Missing Item', 'Please enter item name.', 'warning')
    return
  }
  if (!(Number(onlineOrderForm.quantity) > 0)) {
    Swal.fire('Invalid Quantity', 'Quantity must be greater than 0.', 'warning')
    return
  }
  if (!onlineOrderForm.purchase_link.trim()) {
    Swal.fire('Missing Link', 'Online purchase link is required.', 'warning')
    return
  }
  if (!(Number(onlineOrderForm.amount) >= 0)) {
    Swal.fire('Invalid Amount', 'Amount is required.', 'warning')
    return
  }

  savingOnlineOrder.value = true
  try {
    await axios.post('/business/operations/inventory-order', {
      purchase_type: 'online',
      material_name: onlineOrderForm.material_name.trim(),
      quantity: Number(onlineOrderForm.quantity),
      purchase_link: onlineOrderForm.purchase_link.trim(),
      amount: Number(onlineOrderForm.amount),
    })
    Swal.fire('Saved', 'Online purchase saved and added to inventory.', 'success')
    resetOnlineOrderForm()
    await fetchRequests()
  } catch (err) {
    const firstError = Object.values(err?.response?.data?.errors || {})?.[0]?.[0] || ''
    Swal.fire('Error', firstError || err.response?.data?.message || 'Failed to save online order.', 'error')
  } finally {
    savingOnlineOrder.value = false
  }
}

const sendServiceProviderAcceptance = async (row) => {
  if (row?.acceptance_sent) {
    Swal.fire('Already Sent', 'This request is already sent for service provider acceptance.', 'info')
    return
  }

  const requestId = row?.id
  const selectedItems = Array.isArray(operationalSelectedItemsByRequestId[requestId])
    ? operationalSelectedItemsByRequestId[requestId]
    : []
  if (!selectedItems.length) {
    Swal.fire('Missing Item', 'Please add at least 1 item/equipment.', 'warning')
    return
  }

  try {
    sendingServiceProviderAcceptanceId.value = requestId
    await axios.post(`/business/operations/${requestId}/service-provider-acceptance`, {
      equipment_items: selectedItems,
    })
    Swal.fire('Sent', 'Request is now visible for service provider acceptance.', 'success')
    await fetchRequests()
  } catch (err) {
    const firstError = Object.values(err?.response?.data?.errors || {})?.[0]?.[0] || ''
    Swal.fire('Error', firstError || err?.response?.data?.message || 'Failed to send to service provider.', 'error')
  } finally {
    sendingServiceProviderAcceptanceId.value = null
  }
}

const managedDashboardModules = [
  {
    title: 'Employee / Service Provider Management',
    description: 'Create, approve, and assign employees and providers per service team.',
  },
  {
    title: 'Service Pricing Management',
    description: 'Set base prices and dynamic modifiers used across all bookings.',
  },
  {
    title: 'Team Overview',
    description: 'Track teams, assigned workforce, and pricing coverage per service.',
  },
]

const managedEmployeeTasks = [
  'Create employee accounts with role, credentials, and RBAC checklist (View/Manage/Approve).',
  'Approve or reject employees for the business.',
  'Assign employees to specific teams for services.',
]

const managedPricingTasks = [
  'Select service pricing target: Siphoning, Minor Plumbing, Major Plumbing.',
  'Enter base price (example: Siphoning = PHP 5,500).',
  'Add dynamic modifiers: distance fee, urgency fee, complexity modifier.',
  'Save pricing rules and apply automatically to all bookings.',
]

const managedTeamTasks = [
  'View teams and assigned employees.',
  'View services offered and pricing applied.',
  'Monitor total bookings and revenue trends.',
]

const DEFAULT_MANAGED_TEAM_OPTIONS = []
const ALPHABET_TEAM_OPTIONS = Array.from({ length: 26 }, (_, index) => `Team ${String.fromCharCode(65 + index)}`)
const managedTeamOptions = ref([...DEFAULT_MANAGED_TEAM_OPTIONS])
const managedServiceOptions = ['Siphoning', 'Minor Plumbing', 'Major Plumbing']

const employeeCreateForm = ref({
  givenName: '',
  middleName: '',
  lastName: '',
  email: '',
  contact: '',
  serviceTrack: '',
  rolePreset: '',
  customRole: '',
  role: '',
  startDate: '',
  notes: '',
  password: '',
  staffPermissions: {
    can_view: true,
    can_manage: false,
    can_approve: false,
  },
})

const createEmployeeModalOpen = ref(false)
const creatingEmployee = ref(false)
const employeeCreateStep = ref(1)
const showCreatePassword = ref(false)
const showCreateEmailError = ref(false)
const employeeStartDateInput = ref(null)
const employeeDateMin = ref('')
const employeeDateMax = ref('')
const employeeDateToday = ref('')
const managedEmployees = ref([])
const teamByEmployeeId = reactive({})
const assigningTeamEmployeeId = ref(null)
const teamScheduleDateByTeam = reactive({})
const teamScheduleTimeFromByTeam = reactive({})
const teamScheduleTimeToByTeam = reactive({})
const publishingTeamSchedule = ref('')
const managedServiceTrackOptions = [
  {
    key: 'siphoning',
    label: 'Siphoning',
    description: 'Septic, vacuum, desludging, and tank-service crew.',
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    description: 'Pipe repair, leak correction, and plumbing field work.',
  },
  {
    key: 'both',
    label: 'Both',
    description: 'Show both position families, then choose the actual role.',
  },
]
const managedRoleTemplatesByTrack = {
  siphoning: [
    { label: 'Siphoning Field Operator', value: 'Siphoning Field Operator' },
    { label: 'Siphoning Team Leader', value: 'Siphoning Team Leader' },
    { label: 'Siphoning Vacuum Truck Operator', value: 'Siphoning Vacuum Truck Operator' },
    { label: 'Siphoning Septic Technician', value: 'Siphoning Septic Technician' },
  ],
  plumbing: [
    { label: 'Plumbing Field Technician', value: 'Plumbing Field Technician' },
    { label: 'Plumbing Team Leader', value: 'Plumbing Team Leader' },
    { label: 'Plumbing Pipe Installer', value: 'Plumbing Pipe Installer' },
    { label: 'Plumbing Leak Repair Technician', value: 'Plumbing Leak Repair Technician' },
  ],
}
const teamScheduleHourOptions = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`
  return { value, label: value }
})
const teamScheduleMinDate = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})()
const teamScheduleMaxDate = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
})()
const EMPLOYEE_ARCHIVE_STORAGE_KEY = 'business-managed-employee-archive-v1'
const MANAGED_EMPLOYEE_PAGE_SIZE = 10
const archivedManagedEmployeeIds = ref([])
const archivedEmployeesModalOpen = ref(false)
const managedEmployeesPage = ref(1)
const pendingManagedEmployeesPage = ref(1)
const archivedManagedEmployeesPage = ref(1)
const approvedManagedEmployeesPage = ref(1)
const managedServiceTrackRoleGroups = computed(() => {
  const track = String(employeeCreateForm.value.serviceTrack || '').trim().toLowerCase()
  if (track === 'siphoning') {
    return [{ label: 'Siphoning Positions', options: managedRoleTemplatesByTrack.siphoning }]
  }
  if (track === 'plumbing') {
    return [{ label: 'Plumbing Positions', options: managedRoleTemplatesByTrack.plumbing }]
  }
  if (track === 'both') {
    return [
      { label: 'Siphoning Positions', options: managedRoleTemplatesByTrack.siphoning },
      { label: 'Plumbing Positions', options: managedRoleTemplatesByTrack.plumbing },
    ]
  }
  return []
})
const resolvedManagedEmployeeRole = computed(() => {
  const track = String(employeeCreateForm.value.serviceTrack || '').trim().toLowerCase()
  const preset = String(employeeCreateForm.value.rolePreset || '').trim()
  const custom = String(employeeCreateForm.value.customRole || '').trim()

  if (custom) {
    const normalized = custom.toLowerCase()
    if (track === 'siphoning' && !normalized.includes('siphon')) return `Siphoning ${custom}`
    if (track === 'plumbing' && !normalized.includes('plumb')) return `Plumbing ${custom}`
    return custom
  }

  if (preset === '__custom__') return ''
  return preset
})
const managedRoleTrackSummaryLabel = computed(() => {
  const track = String(employeeCreateForm.value.serviceTrack || '').trim().toLowerCase()
  if (track === 'siphoning') return 'This employee will appear under Siphoning team assignment.'
  if (track === 'plumbing') return 'This employee will appear under Plumbing team assignment.'
  if (track === 'both') return 'Both role families are visible now, but save one final role for the actual dispatch group.'
  return 'Choose a service track first.'
})

const employeeNameTypeError = (value) => {
  if (!value) return ''
  const hasNumber = /\d/.test(value)
  const hasSpecial = /[^a-zA-Z\s\d]/.test(value)
  if (hasNumber && hasSpecial) return 'Numerical and special characters are not allowed.'
  if (hasNumber) return 'Numerical characters are not allowed.'
  if (hasSpecial) return 'Special characters are not allowed.'
  return ''
}

const createGivenNameError = computed(() => employeeNameTypeError(employeeCreateForm.value.givenName))
const createMiddleNameError = computed(() => employeeNameTypeError(employeeCreateForm.value.middleName))
const createLastNameError = computed(() => employeeNameTypeError(employeeCreateForm.value.lastName))
const createEmailError = computed(() => {
  if (!showCreateEmailError.value) return ''
  const value = employeeCreateForm.value.email || ''
  if (!value) return 'Email is required.'
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  return isValid ? '' : 'Email must be valid.'
})
const createPasswordStrengthLabel = computed(() => {
  const value = employeeCreateForm.value.password || ''
  if (!value) return ''
  const hasNumber = /\d/.test(value)
  const hasSpecial = /[^a-zA-Z0-9]/.test(value)
  if (value.length >= 8 && hasNumber && hasSpecial) return 'Strong'
  if (value.length >= 6 && (hasNumber || hasSpecial)) return 'Medium'
  return 'Weak'
})
const createPasswordStrengthClass = computed(() => {
  if (createPasswordStrengthLabel.value === 'Strong') return 'text-emerald-600'
  if (createPasswordStrengthLabel.value === 'Medium') return 'text-amber-600'
  return 'text-rose-600'
})
const createPasswordStrengthInputClass = computed(() => {
  if (createPasswordStrengthLabel.value === 'Strong') return 'border-emerald-500 ring-2 ring-emerald-200'
  if (createPasswordStrengthLabel.value === 'Medium') return 'border-amber-500 ring-2 ring-amber-200'
  if (createPasswordStrengthLabel.value === 'Weak') return 'border-rose-500 ring-2 ring-rose-200'
  return 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200'
})
const showCreatePasswordRequirementError = ref(false)
const createPasswordRequirementMissingParts = computed(() => {
  const value = String(employeeCreateForm.value.password || '')
  const missing = []
  if (value.length < 8) missing.push('at least 8 characters')
  if (!/\d/.test(value)) missing.push('at least 1 number')
  if (!/[^a-zA-Z0-9]/.test(value)) missing.push('at least 1 special character')
  return missing
})
const createPasswordRequirementError = computed(() => {
  if (!showCreatePasswordRequirementError.value) return ''
  const value = String(employeeCreateForm.value.password || '')
  if (!value) return 'Password is required.'
  if (!createPasswordRequirementMissingParts.value.length) return ''
  return `Password must include ${createPasswordRequirementMissingParts.value.join(', ')}.`
})

const normalizeStaffPermissions = (value) => ({
  can_view: value?.can_view ?? true,
  can_manage: value?.can_manage ?? false,
  can_approve: value?.can_approve ?? false,
})

const staffPermissionSummary = (value) => {
  const permissions = normalizeStaffPermissions(value)
  const summary = []
  if (permissions.can_view) summary.push('View')
  if (permissions.can_manage) summary.push('Manage')
  if (permissions.can_approve) summary.push('Approve')
  return summary.length ? summary.join(' / ') : 'No staff access'
}

const rbacPillClass = (value, key) => {
  const permissions = normalizeStaffPermissions(value)
  const enabled = key === 'view'
    ? permissions.can_view
    : key === 'manage'
      ? permissions.can_manage
      : permissions.can_approve
  if (!enabled) return 'bg-slate-100 text-slate-400'
  if (key === 'manage') return 'bg-sky-100 text-sky-700'
  if (key === 'approve') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-200 text-slate-700'
}

const rbacEnabled = (value, key) => {
  const permissions = normalizeStaffPermissions(value)
  if (key === 'view') return permissions.can_view
  if (key === 'manage') return permissions.can_manage
  return permissions.can_approve
}

const rbacAnyEnabled = (value) => {
  const permissions = normalizeStaffPermissions(value)
  return permissions.can_view || permissions.can_manage || permissions.can_approve
}

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const syncEmployeeDateBounds = () => {
  const now = new Date()
  const today = formatLocalDate(now)
  employeeDateToday.value = today
  employeeDateMin.value = today
  employeeDateMax.value = today
}

const resetEmployeeForm = () => {
  employeeCreateForm.value = {
    givenName: '',
    middleName: '',
    lastName: '',
    email: '',
    contact: '',
    serviceTrack: '',
    rolePreset: '',
    customRole: '',
    role: '',
    startDate: employeeDateToday.value || '',
    notes: '',
    password: '',
    staffPermissions: {
      can_view: true,
      can_manage: false,
      can_approve: false,
    },
  }
  employeeCreateStep.value = 1
  showCreatePassword.value = false
  showCreateEmailError.value = false
  showCreatePasswordRequirementError.value = false
}

watch(
  () => employeeCreateForm.value.serviceTrack,
  () => {
    employeeCreateForm.value.rolePreset = ''
    employeeCreateForm.value.customRole = ''
    employeeCreateForm.value.role = ''
  }
)

watch(
  [() => employeeCreateForm.value.rolePreset, () => employeeCreateForm.value.customRole, resolvedManagedEmployeeRole],
  () => {
    employeeCreateForm.value.role = resolvedManagedEmployeeRole.value
  }
)

const openCreateEmployeeModal = () => {
  syncEmployeeDateBounds()
  resetEmployeeForm()
  createEmployeeModalOpen.value = true
}

const openStartDatePicker = () => {
  const el = employeeStartDateInput.value
  if (!el) return
  if (typeof el.showPicker === 'function') {
    el.showPicker()
    return
  }
  el.focus()
}

const closeCreateEmployeeModal = () => {
  if (creatingEmployee.value) return
  createEmployeeModalOpen.value = false
  showCreateEmailError.value = false
  showCreatePasswordRequirementError.value = false
}

const goToCreateEmployeeWorkStep = () => {
  const issues = []
  showCreatePasswordRequirementError.value = true

  if (!employeeCreateForm.value.givenName) {
    issues.push('Given Name is required.')
  } else if (createGivenNameError.value) {
    issues.push(`Given Name: ${createGivenNameError.value}`)
  }
  if (employeeCreateForm.value.middleName && createMiddleNameError.value) {
    issues.push(`Middle Name: ${createMiddleNameError.value}`)
  }
  if (!employeeCreateForm.value.lastName) {
    issues.push('Last Name is required.')
  } else if (createLastNameError.value) {
    issues.push(`Last Name: ${createLastNameError.value}`)
  }
  showCreateEmailError.value = true
  if (!employeeCreateForm.value.email || createEmailError.value) {
    issues.push(createEmailError.value || 'Email is required.')
  }
  if (!employeeCreateForm.value.contact || !String(employeeCreateForm.value.contact).trim()) {
    issues.push('Contact is required.')
  }
  if (createPasswordRequirementError.value) {
    issues.push(createPasswordRequirementError.value)
  }

  if (issues.length) {
    Swal.fire({
      icon: 'warning',
      title: 'Please fix the following',
      text: issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n'),
      confirmButtonColor: '#0f172a',
    })
    return
  }

  showCreatePasswordRequirementError.value = false
  employeeCreateStep.value = 2
}

const archivedManagedEmployeeIdSet = computed(() => new Set(
  archivedManagedEmployeeIds.value
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
))

const activeManagedEmployees = computed(() =>
  managedEmployees.value.filter((emp) => !archivedManagedEmployeeIdSet.value.has(Number(emp.id)))
)

const archivedManagedEmployees = computed(() =>
  managedEmployees.value.filter((emp) => archivedManagedEmployeeIdSet.value.has(Number(emp.id)))
)

const employeeApprovalState = (employee) => {
  const approval = normalizeStatus(employee?.approval_status || employee?.status)
  if (approval === 'approved' || approval === 'pending' || approval === 'rejected') return approval
  if (approval === 'active') return employee?.is_approved === false ? 'pending' : 'approved'
  if (typeof employee?.is_approved === 'boolean') return employee.is_approved ? 'approved' : 'pending'
  return 'pending'
}

const managedEmployeeStats = computed(() => {
  const total = activeManagedEmployees.value.length
  const approved = activeManagedEmployees.value.filter((emp) => employeeApprovalState(emp) === 'approved').length
  const rejected = activeManagedEmployees.value.filter((emp) => employeeApprovalState(emp) === 'rejected').length
  const pending = Math.max(0, total - approved - rejected)
  return { total, approved, pending }
})

const pendingManagedEmployees = computed(() =>
  activeManagedEmployees.value.filter((emp) => employeeApprovalState(emp) === 'pending')
)
const approvedManagedEmployees = computed(() =>
  activeManagedEmployees.value
    .filter((emp) => employeeApprovalState(emp) === 'approved')
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
)

const pagedRows = (rows, page) => {
  const start = (Math.max(Number(page || 1), 1) - 1) * MANAGED_EMPLOYEE_PAGE_SIZE
  return rows.slice(start, start + MANAGED_EMPLOYEE_PAGE_SIZE)
}

const pageRangeStart = (rows, page) => {
  if (!rows.length) return 0
  return (Math.max(Number(page || 1), 1) - 1) * MANAGED_EMPLOYEE_PAGE_SIZE + 1
}

const pageRangeEnd = (rows, page) => {
  if (!rows.length) return 0
  return Math.min(Math.max(Number(page || 1), 1) * MANAGED_EMPLOYEE_PAGE_SIZE, rows.length)
}

const activeManagedEmployeesTotalPages = computed(() => Math.max(1, Math.ceil(activeManagedEmployees.value.length / MANAGED_EMPLOYEE_PAGE_SIZE)))
const pendingManagedEmployeesTotalPages = computed(() => Math.max(1, Math.ceil(pendingManagedEmployees.value.length / MANAGED_EMPLOYEE_PAGE_SIZE)))
const archivedManagedEmployeesTotalPages = computed(() => Math.max(1, Math.ceil(archivedManagedEmployees.value.length / MANAGED_EMPLOYEE_PAGE_SIZE)))
const approvedManagedEmployeesTotalPages = computed(() => Math.max(1, Math.ceil(approvedManagedEmployees.value.length / MANAGED_EMPLOYEE_PAGE_SIZE)))

const pagedActiveManagedEmployees = computed(() => pagedRows(activeManagedEmployees.value, managedEmployeesPage.value))
const pagedPendingManagedEmployees = computed(() => pagedRows(pendingManagedEmployees.value, pendingManagedEmployeesPage.value))
const pagedArchivedManagedEmployees = computed(() => pagedRows(archivedManagedEmployees.value, archivedManagedEmployeesPage.value))
const pagedApprovedManagedEmployees = computed(() => pagedRows(approvedManagedEmployees.value, approvedManagedEmployeesPage.value))

const managedEmployeePageRanges = computed(() => ({
  active: {
    start: pageRangeStart(activeManagedEmployees.value, managedEmployeesPage.value),
    end: pageRangeEnd(activeManagedEmployees.value, managedEmployeesPage.value),
  },
  pending: {
    start: pageRangeStart(pendingManagedEmployees.value, pendingManagedEmployeesPage.value),
    end: pageRangeEnd(pendingManagedEmployees.value, pendingManagedEmployeesPage.value),
  },
  archived: {
    start: pageRangeStart(archivedManagedEmployees.value, archivedManagedEmployeesPage.value),
    end: pageRangeEnd(archivedManagedEmployees.value, archivedManagedEmployeesPage.value),
  },
  approved: {
    start: pageRangeStart(approvedManagedEmployees.value, approvedManagedEmployeesPage.value),
    end: pageRangeEnd(approvedManagedEmployees.value, approvedManagedEmployeesPage.value),
  },
}))

const clampManagedEmployeePage = (pageRef, totalPages) => {
  const next = Math.min(Math.max(Number(pageRef.value) || 1, 1), totalPages.value)
  if (next !== pageRef.value) {
    pageRef.value = next
  }
}

const nextManagedEmployeesPage = () => {
  if (managedEmployeesPage.value < activeManagedEmployeesTotalPages.value) {
    managedEmployeesPage.value += 1
  }
}

const prevManagedEmployeesPage = () => {
  if (managedEmployeesPage.value > 1) {
    managedEmployeesPage.value -= 1
  }
}

const nextPendingManagedEmployeesPage = () => {
  if (pendingManagedEmployeesPage.value < pendingManagedEmployeesTotalPages.value) {
    pendingManagedEmployeesPage.value += 1
  }
}

const prevPendingManagedEmployeesPage = () => {
  if (pendingManagedEmployeesPage.value > 1) {
    pendingManagedEmployeesPage.value -= 1
  }
}

const nextArchivedManagedEmployeesPage = () => {
  if (archivedManagedEmployeesPage.value < archivedManagedEmployeesTotalPages.value) {
    archivedManagedEmployeesPage.value += 1
  }
}

const prevArchivedManagedEmployeesPage = () => {
  if (archivedManagedEmployeesPage.value > 1) {
    archivedManagedEmployeesPage.value -= 1
  }
}

const nextApprovedManagedEmployeesPage = () => {
  if (approvedManagedEmployeesPage.value < approvedManagedEmployeesTotalPages.value) {
    approvedManagedEmployeesPage.value += 1
  }
}

const prevApprovedManagedEmployeesPage = () => {
  if (approvedManagedEmployeesPage.value > 1) {
    approvedManagedEmployeesPage.value -= 1
  }
}

const isEmployeeApproved = (employee) => employeeApprovalState(employee) === 'approved'

const employeeStatusClass = (employee) => {
  const s = employeeApprovalState(employee)
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (s === 'rejected') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

const employeeStatusLabel = (employee) => {
  const s = employeeApprovalState(employee)
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Pending'
}

const formatManagedEmployeeDate = (value) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const formatOperationalManagerDate = (value) => formatManagedEmployeeDate(value)

const formatOrderDateTime = (value) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const employeeWorkLabel = (role) => {
  const value = String(role || '').toLowerCase()
  if (!value) return 'General Operations'
  if (value.includes('field operations lead') && value.includes('siphon')) return 'Siphoning'
  if (value.includes('field operations lead') && value.includes('plumb')) return 'Plumbing'
  if (value.includes('dispatch')) return 'Dispatch'
  if (value.includes('siphon') || value.includes('septic')) return 'Siphoning'
  if (
    value.includes('plumb') ||
    value.includes('pipe') ||
    value.includes('drain') ||
    value.includes('leak')
  ) return 'Plumbing'
  if (value.includes('maintenance')) return 'Maintenance'
  if (value.includes('warehouse') || value.includes('inventory')) return 'Inventory / Warehouse'
  if (value.includes('safety')) return 'Safety'
  if (value.includes('customer')) return 'Customer Support'
  return 'General Operations'
}

const employeeInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return 'NA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const employeeTeamTrackLabel = (role) => {
  const track = employeeTeamTrackKey(role)
  if (track === 'siphoning') return 'Siphoning'
  if (track === 'plumbing') return 'Plumbing'
  return ''
}

const normalizeTeamName = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const normalizeRoleKey = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()

const employeeTeamTrackKey = (role) => {
  const work = employeeWorkLabel(role)
  if (work === 'Siphoning') return 'siphoning'
  if (work === 'Plumbing') return 'plumbing'
  return ''
}

const canAssignEmployeeToTeam = (employee) => Boolean(employeeTeamTrackKey(employee?.role))

const assignTeamPlaceholder = (role) => {
  const trackLabel = employeeTeamTrackLabel(role)
  if (!trackLabel) return 'Role must be Siphoning or Plumbing'
  return `Assign to ${trackLabel} team (A-Z)`
}

const assignTeamHelpText = (role) => {
  const trackLabel = employeeTeamTrackLabel(role)
  if (!trackLabel) return 'Only Siphoning or Plumbing roles can be assigned to teams.'
  return 'Auto-separated by role. Maximum of 3 workers per team. Duplicate role in one team is not allowed.'
}

const teamLetterFromName = (value) => {
  const normalized = normalizeTeamName(value)
  if (!normalized) return ''

  const scopedMatch = /^(?:siphoning|plumbing)\s+team\s*([a-z])$/i.exec(normalized)
  if (scopedMatch) return String(scopedMatch[1] || '').toUpperCase()

  const teamMatch = /^team\s*([a-z])$/i.exec(normalized)
  if (teamMatch) return String(teamMatch[1] || '').toUpperCase()

  const letterMatch = /^([a-z])$/i.exec(normalized)
  if (letterMatch) return String(letterMatch[1] || '').toUpperCase()

  return ''
}

const scopedTeamNameForRole = (role, value) => {
  const letter = teamLetterFromName(value)
  if (!letter) return ''
  const track = employeeTeamTrackLabel(role)
  if (track === 'Siphoning') return `Siphoning Team ${letter}`
  if (track === 'Plumbing') return `Plumbing Team ${letter}`
  return ''
}

const displayManagedTeamName = (employee) =>
  scopedTeamNameForRole(employee?.role, employee?.team) || normalizeTeamName(employee?.team)

const isAssignButtonDisabled = (employee) => {
  if (assigningTeamEmployeeId.value !== null) return true
  if (!employee?.id) return true
  const selected = scopedTeamNameForRole(employee.role, teamByEmployeeId[employee.id])
  return !selected
}

const assignButtonClass = (employee) => (
  isAssignButtonDisabled(employee)
    ? 'cursor-not-allowed bg-slate-300 text-slate-100'
    : 'bg-teal-600 hover:bg-teal-700'
)

const ensureManagedTeamOption = (teamName) => {
  const normalized = normalizeTeamName(teamName)
  if (!normalized) return ''
  const existing = managedTeamOptions.value.find((team) => team.toLowerCase() === normalized.toLowerCase())
  if (existing) return existing
  managedTeamOptions.value.push(normalized)
  return normalized
}

const toAlphabetTeamName = (value) => {
  const letter = teamLetterFromName(value)
  return letter ? `Team ${letter}` : ''
}

const activeTeamAssignedEmployees = computed(() =>
  approvedManagedEmployees.value.filter((emp) => {
    const status = String(emp?.team_assignment_status || 'accepted').trim().toLowerCase()
    return status !== 'rejected'
  })
)

const teamMemberCounts = computed(() => {
  const counts = {}

  activeTeamAssignedEmployees.value.forEach((emp) => {
    const team = displayManagedTeamName(emp)
    if (!team) return
    counts[team] = Number(counts[team] || 0) + 1
  })

  return counts
})

const teamRoleCounts = computed(() => {
  const counts = {}

  activeTeamAssignedEmployees.value.forEach((emp) => {
    const team = displayManagedTeamName(emp)
    const roleKey = normalizeRoleKey(emp?.role)
    if (!team || !roleKey) return
    if (!counts[team]) counts[team] = {}
    counts[team][roleKey] = Number(counts[team][roleKey] || 0) + 1
  })

  return counts
})

const isRoleTakenInTeam = (employee, teamName) => {
  const scopedName = scopedTeamNameForRole(employee?.role, teamName)
  if (!scopedName) return false

  const roleKey = normalizeRoleKey(employee?.role)
  if (!roleKey) return false

  const taken = Number(teamRoleCounts.value?.[scopedName]?.[roleKey] || 0)
  const sameTeam = scopedTeamNameForRole(employee?.role, employee?.team)
  const effectiveTaken = sameTeam === scopedName ? Math.max(0, taken - 1) : taken

  return effectiveTaken > 0
}

const alphabetAssignableTeams = computed(() =>
  ALPHABET_TEAM_OPTIONS.map((team) => {
    const letter = teamLetterFromName(team)
    const count = Number(
      (teamMemberCounts.value[`Siphoning Team ${letter}`] || 0)
      + (teamMemberCounts.value[`Plumbing Team ${letter}`] || 0)
      + (teamMemberCounts.value[`Team ${letter}`] || 0)
    )
    return {
      name: team,
      count,
      isFull: count >= 3,
    }
  })
)

const assignableTeamsForEmployee = (employee) =>
  (!canAssignEmployeeToTeam(employee)
    ? []
    : ALPHABET_TEAM_OPTIONS.map((team) => {
    const scopedName = scopedTeamNameForRole(employee?.role, team)
    const count = Number(teamMemberCounts.value[scopedName] || 0)
    const isRoleTaken = isRoleTakenInTeam(employee, scopedName)
    return {
      name: scopedName,
      count,
      isFull: count >= 3,
      isRoleTaken,
    }
  }))

const approvedManagedEmployeesByTrack = computed(() => {
  const groups = {
    siphoning: [],
    plumbing: [],
    general: [],
  }

  pagedApprovedManagedEmployees.value.forEach((employee) => {
    const track = employeeTeamTrackKey(employee?.role)
    if (!groups[track]) {
      groups.general.push(employee)
      return
    }
    groups[track].push(employee)
  })

  return [
    {
      key: 'siphoning',
      label: 'Siphoning Team Workers',
      badgeClass: 'bg-cyan-100 text-cyan-700',
      employees: groups.siphoning,
    },
    {
      key: 'plumbing',
      label: 'Plumbing Team Workers',
      badgeClass: 'bg-indigo-100 text-indigo-700',
      employees: groups.plumbing,
    },
    {
      key: 'general',
      label: 'General Operations Workers',
      badgeClass: 'bg-slate-200 text-slate-700',
      employees: groups.general,
    },
  ].filter((group) => group.employees.length > 0)
})

watch(activeManagedEmployees, () => clampManagedEmployeePage(managedEmployeesPage, activeManagedEmployeesTotalPages), { immediate: true })
watch(pendingManagedEmployees, () => clampManagedEmployeePage(pendingManagedEmployeesPage, pendingManagedEmployeesTotalPages), { immediate: true })
watch(archivedManagedEmployees, () => clampManagedEmployeePage(archivedManagedEmployeesPage, archivedManagedEmployeesTotalPages), { immediate: true })
watch(approvedManagedEmployees, () => clampManagedEmployeePage(approvedManagedEmployeesPage, approvedManagedEmployeesTotalPages), { immediate: true })

const loadArchivedManagedEmployeeIds = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(EMPLOYEE_ARCHIVE_STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    archivedManagedEmployeeIds.value = Array.isArray(parsed) ? parsed : []
  } catch {
    archivedManagedEmployeeIds.value = []
  }
}

const persistArchivedManagedEmployeeIds = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      EMPLOYEE_ARCHIVE_STORAGE_KEY,
      JSON.stringify(archivedManagedEmployeeIds.value)
    )
  } catch {
    // Ignore localStorage write errors.
  }
}

const normalizeArchivedManagedEmployeeIds = () => {
  const unique = [...new Set(
    archivedManagedEmployeeIds.value
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  )]
  archivedManagedEmployeeIds.value = unique
  persistArchivedManagedEmployeeIds()
}

const openArchivedEmployeesModal = () => {
  archivedEmployeesModalOpen.value = true
}

const closeArchivedEmployeesModal = () => {
  archivedEmployeesModalOpen.value = false
}

const archiveManagedEmployee = async (id) => {
  const employee = managedEmployees.value.find((emp) => Number(emp.id) === Number(id))
  if (!employee) {
    Swal.fire('Error', 'Employee record is unavailable.', 'error')
    return
  }

  const confirm = await Swal.fire({
    title: 'Archive employee?',
    text: `${employee.name} will be hidden from active lists.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Archive',
    confirmButtonColor: '#334155',
  })
  if (!confirm.isConfirmed) return

  if (!archivedManagedEmployeeIdSet.value.has(Number(id))) {
    archivedManagedEmployeeIds.value = [...archivedManagedEmployeeIds.value, Number(id)]
    normalizeArchivedManagedEmployeeIds()
  }
  Swal.fire('Success', 'Employee archived.', 'success')
}

const restoreManagedEmployee = (id) => {
  archivedManagedEmployeeIds.value = archivedManagedEmployeeIds.value.filter((rowId) => Number(rowId) !== Number(id))
  normalizeArchivedManagedEmployeeIds()
  Swal.fire('Success', 'Employee restored to active list.', 'success')
}

const pricingForm = reactive({
  service: 'Siphoning',
  basePrice: 5500,
  distanceFee: 0,
  urgencyFeePct: 0,
  minorPct: 0,
  moderatePct: 0,
  severePct: 0,
  note: '',
})

const pricingRules = ref([])
const pricingRuleModalOpen = ref(false)

const reportType = ref('bookings')
const generatedReports = ref([])
const isManagedSection = computed(() => managedSections.includes(section.value))
const managedPrimarySectionActive = computed(() => managedPrimarySections.includes(section.value))
const managedOpsSectionActive = computed(() => managedOpsSections.includes(section.value))
const managedFinanceSectionActive = computed(() => managedFinanceSections.includes(section.value))
const formatPrStatus = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
const isLeadRole = (role) => {
  const value = String(role || '').toLowerCase()
  return value.includes('lead') || value.includes('leader')
}

const normalizeTeamAssignmentStatus = (status) => {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'accepted' || raw === 'pending' || raw === 'rejected') return raw
  return 'accepted'
}

const teamAssignmentFlagLabel = (status) => {
  const value = normalizeTeamAssignmentStatus(status)
  if (value === 'accepted') return 'Accepted'
  if (value === 'pending') return 'Pending'
  if (value === 'rejected') return 'Reassignment Requested'
  return 'Accepted'
}

const teamAssignmentFlagClass = (status) => {
  const value = normalizeTeamAssignmentStatus(status)
  if (value === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (value === 'pending') return 'bg-amber-100 text-amber-700'
  if (value === 'rejected') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

const selectSingleTeamLeaderMember = (members = []) => {
  const normalized = (Array.isArray(members) ? members : [])
    .filter((member) => member && Number(member.id))
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id))
  if (!normalized.length) return null

  const accepted = normalized.filter((member) => normalizeTeamAssignmentStatus(member?.team_assignment_status) === 'accepted')
  const acceptedLeads = accepted.filter((member) => isLeadRole(member?.role))
  if (acceptedLeads.length) return acceptedLeads[0]
  if (accepted.length) return accepted[0]

  const allLeads = normalized.filter((member) => isLeadRole(member?.role))
  if (allLeads.length) return allLeads[0]
  return normalized[0]
}

const parseTeamScheduleDateTime = (date, time) => {
  const dateValue = String(date || '').trim()
  const timeValue = String(time || '').trim().slice(0, 5)
  if (!dateValue || !timeValue) return null

  const stamp = new Date(`${dateValue}T${timeValue}:00`)
  return Number.isNaN(stamp.getTime()) ? null : stamp
}

const managedTeamRows = computed(() => {
  const grouped = {}

  approvedManagedEmployees.value.forEach((emp) => {
    const team = displayManagedTeamName(emp)
    if (!team) return
    if (!grouped[team]) grouped[team] = []
    grouped[team].push(emp)
  })

  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((team) => {
      const members = grouped[team]
        .slice()
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))

      const scheduleDate = members.find((member) => member?.team_schedule_date)?.team_schedule_date || ''
      const scheduleTimeFrom = members.find((member) => member?.team_schedule_time_from)?.team_schedule_time_from || ''
      const scheduleTimeTo = members.find((member) => member?.team_schedule_time_to)?.team_schedule_time_to || ''
      const leader = selectSingleTeamLeaderMember(members)
      const isPublished = Boolean(scheduleDate && scheduleTimeFrom && scheduleTimeTo)
      const scheduleEnd = parseTeamScheduleDateTime(scheduleDate, scheduleTimeTo)
      const hasActivePublishedSchedule = Boolean(isPublished && scheduleEnd && scheduleEnd.getTime() > Date.now())

      return {
        team,
        count: members.length,
        services: [...new Set(members.map((member) => employeeWorkLabel(member.role)))].join(' / '),
        members,
        hasLeader: Boolean(leader),
        leaderMemberId: Number(leader?.id || 0) || null,
        leaderName: String(leader?.name || ''),
        isPublished,
        hasActivePublishedSchedule,
        schedule_date: scheduleDate,
        schedule_time_from: scheduleTimeFrom,
        schedule_time_to: scheduleTimeTo,
      }
    })
})

const syncTeamScheduleDrafts = () => {
  const existingTeams = new Set(managedTeamRows.value.map((row) => row.team))

  managedTeamRows.value.forEach((row) => {
    if (typeof teamScheduleDateByTeam[row.team] === 'undefined') {
      teamScheduleDateByTeam[row.team] = row.schedule_date || teamScheduleMinDate
    }
    if (typeof teamScheduleTimeFromByTeam[row.team] === 'undefined') {
      teamScheduleTimeFromByTeam[row.team] = row.schedule_time_from || '06:00'
    }
    if (typeof teamScheduleTimeToByTeam[row.team] === 'undefined') {
      teamScheduleTimeToByTeam[row.team] = row.schedule_time_to || '11:00'
    }
  })

  Object.keys(teamScheduleDateByTeam).forEach((team) => {
    if (!existingTeams.has(team)) delete teamScheduleDateByTeam[team]
  })
  Object.keys(teamScheduleTimeFromByTeam).forEach((team) => {
    if (!existingTeams.has(team)) delete teamScheduleTimeFromByTeam[team]
  })
  Object.keys(teamScheduleTimeToByTeam).forEach((team) => {
    if (!existingTeams.has(team)) delete teamScheduleTimeToByTeam[team]
  })
}

watch(managedTeamRows, syncTeamScheduleDrafts, { immediate: true })

const canPublishTeamSchedule = (row) => {
  const isFull = Number(row?.count || 0) >= 3
  const hasLeader = Boolean(row?.hasLeader)
  const hasActiveSchedule = Boolean(row?.hasActivePublishedSchedule)
  const date = String(teamScheduleDateByTeam[row?.team] || '').trim()
  const timeFrom = String(teamScheduleTimeFromByTeam[row?.team] || '').trim()
  const timeTo = String(teamScheduleTimeToByTeam[row?.team] || '').trim()
  const dateInRange = date >= teamScheduleMinDate && date <= teamScheduleMaxDate
  return isFull && hasLeader && !hasActiveSchedule && date !== '' && dateInRange && timeFrom !== '' && timeTo !== '' && publishingTeamSchedule.value === ''
}

const publishTeamSchedule = async (row) => {
  if (!row?.team) return

  if (Number(row.count || 0) < 3) {
    Swal.fire('Team not full', 'Team schedule can only be published when team is full (3/3 members).', 'warning')
    return
  }
  if (!row.hasLeader) {
    Swal.fire('Leader required', 'Assign a team leader first before publishing the team schedule.', 'warning')
    return
  }
  if (row.hasActivePublishedSchedule) {
    Swal.fire('Schedule locked', 'This team already has an active published date/time. You can republish only after the current schedule ends.', 'warning')
    return
  }

  const scheduleDate = String(teamScheduleDateByTeam[row.team] || '').trim()
  const scheduleTimeFrom = String(teamScheduleTimeFromByTeam[row.team] || '').trim()
  const scheduleTimeTo = String(teamScheduleTimeToByTeam[row.team] || '').trim()

  if (!scheduleDate || !scheduleTimeFrom || !scheduleTimeTo) {
    Swal.fire('Missing schedule', 'Please set schedule date, start time, and end time.', 'warning')
    return
  }
  if (scheduleDate < teamScheduleMinDate || scheduleDate > teamScheduleMaxDate) {
    Swal.fire('Invalid date', 'Please select a date within the current month.', 'warning')
    return
  }

  if (scheduleTimeTo <= scheduleTimeFrom) {
    Swal.fire('Invalid time range', 'Schedule end time must be later than start time.', 'warning')
    return
  }

  const confirm = await Swal.fire({
    title: 'Publish team schedule?',
    text: `${row.team} will be scheduled on ${scheduleDate} from ${scheduleTimeFrom} to ${scheduleTimeTo}.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Publish',
    confirmButtonColor: '#0f766e',
    cancelButtonText: 'Cancel',
  })
  if (!confirm.isConfirmed) return

  try {
    publishingTeamSchedule.value = row.team
    const res = await axios.post('/business/managed/teams/schedule-publish', {
      team: row.team,
      schedule_date: scheduleDate,
      schedule_time_from: scheduleTimeFrom,
      schedule_time_to: scheduleTimeTo,
    })
    await fetchManagedEmployees()
    Swal.fire('Published', res?.data?.message || 'Team schedule published successfully.', 'success')
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to publish team schedule.'
    Swal.fire('Error', message, 'error')
  } finally {
    publishingTeamSchedule.value = ''
  }
}

const managedTeamSummary = computed(() => {
  const assignedEmployees = approvedManagedEmployees.value.filter((emp) => !!displayManagedTeamName(emp)).length
  const baseRevenue = pricingRules.value.reduce((sum, rule) => sum + Number(rule.basePrice || 0), 0)
  const requestFactor = stats.value.totalRequests || 1
  return {
    totalTeams: managedTeamRows.value.length,
    assignedEmployees,
    revenueProxy: baseRevenue * requestFactor,
  }
})

const money = (value) => {
  const num = Number(value || 0)
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0)
}

const fetchManagedEmployees = async () => {
  try {
    managedApiError.value = ''
    const res = await axios.get('/business/managed/employees')
    const rows = Array.isArray(res.data) ? res.data : []
    const normalizedRows = rows.map((emp) => ({
      ...emp,
      staff_permissions: normalizeStaffPermissions(emp.staff_permissions),
      created_by_role: emp.created_by_role || 'Business Owner',
    }))
    managedEmployees.value = normalizedRows
    managedTeamOptions.value = [...DEFAULT_MANAGED_TEAM_OPTIONS]

    Object.keys(teamByEmployeeId).forEach((key) => {
      delete teamByEmployeeId[key]
    })
    normalizedRows.forEach((emp) => {
      if (emp.team) {
        ensureManagedTeamOption(emp.team)
      }
      const scopedTeam = scopedTeamNameForRole(emp.role, emp.team)
      teamByEmployeeId[emp.id] = scopedTeam || ''
    })

    const rowIdSet = new Set(rows.map((emp) => Number(emp.id)))
    archivedManagedEmployeeIds.value = archivedManagedEmployeeIds.value.filter((id) => rowIdSet.has(Number(id)))
    normalizeArchivedManagedEmployeeIds()
  } catch (error) {
    console.error(error)
    const message = error?.response?.data?.message || 'Unable to load business-managed employees.'
    managedApiError.value = message
    managedEmployees.value = []
  }
}

const fetchManagedPricingRules = async () => {
  try {
    managedApiError.value = ''
    const res = await axios.get('/business/managed/pricing-rules')
    pricingRules.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error(error)
    const message = error?.response?.data?.message || 'Unable to load pricing rules.'
    managedApiError.value = message
    pricingRules.value = []
  }
}

const createEmployeeAccount = async ({ closeOnSuccess = false, payload = null } = {}) => {
  const safePayload = payload || {}
  const name = String(safePayload.name || '').trim()
  const contact = String(safePayload.contact || '').trim()
  const staffPermissions = normalizeStaffPermissions(safePayload.staff_permissions || safePayload.staffPermissions)
  if (!name || !contact) {
    Swal.fire('Required', 'Name and contact are required.', 'warning')
    return false
  }

  try {
    const res = await axios.post('/business/managed/employees', {
      name,
      email: String(safePayload.email || '').trim() || null,
      contact,
      credentials: String(safePayload.credentials || '').trim() || null,
      role: String(safePayload.role || '').trim(),
      staff_permissions: staffPermissions,
    })

    const payload = res.data || {}
    const employee = {
      id: payload.id,
      name: payload.name,
      email: payload.email || payload.issued_email || '',
      contact: payload.contact || contact,
      role: payload.role || safePayload.role,
      status: payload.status || 'pending',
      team: payload.team || null,
      staff_permissions: normalizeStaffPermissions(payload.staff_permissions || staffPermissions),
      created_by_role: payload.created_by_role || 'Business Owner',
    }
    managedEmployees.value.unshift(employee)

    Swal.fire('Success', 'Employee created and queued for approval.', 'success')

    resetEmployeeForm()
    if (closeOnSuccess) closeCreateEmployeeModal()
    return true
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to create employee.'
    Swal.fire('Error', message, 'error')
    return false
  }
}

const submitCreateEmployeeFromModal = async () => {
  if (creatingEmployee.value) return

  const issues = []
  showCreatePasswordRequirementError.value = true
  const staffPermissions = normalizeStaffPermissions(employeeCreateForm.value.staffPermissions)
  const selectedRole = String(employeeCreateForm.value.role || '').trim()
  const selectedTrack = String(employeeCreateForm.value.serviceTrack || '').trim().toLowerCase()
  if (!selectedTrack) {
    issues.push('Service Track is required.')
  }
  if (!selectedRole) {
    issues.push('Role / Specialty is required.')
  }
  if (
    selectedTrack === 'both' &&
    selectedRole &&
    !/siphon|plumb/i.test(selectedRole)
  ) {
    issues.push('When Service Track is Both, choose or type a role with Siphoning or Plumbing in the title.')
  }
  if (!employeeCreateForm.value.startDate) {
    issues.push('Start Date is required.')
  } else if (employeeCreateForm.value.startDate < employeeDateMin.value || employeeCreateForm.value.startDate > employeeDateMax.value) {
    issues.push('Start Date must be today.')
  }
  if (createPasswordRequirementError.value) {
    issues.push(createPasswordRequirementError.value)
  }
  if (issues.length) {
    Swal.fire({
      icon: 'warning',
      title: 'Please fix the following',
      text: issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n'),
      confirmButtonColor: '#0f172a',
    })
    return
  }
  showCreatePasswordRequirementError.value = false

  const fullName = [
    employeeCreateForm.value.givenName,
    employeeCreateForm.value.middleName,
    employeeCreateForm.value.lastName,
  ].filter(Boolean).join(' ')

  creatingEmployee.value = true
  try {
    await createEmployeeAccount({
      closeOnSuccess: true,
      payload: {
        name: fullName,
        email: employeeCreateForm.value.email,
        contact: employeeCreateForm.value.contact,
        credentials: employeeCreateForm.value.password,
        role: selectedRole,
        staff_permissions: staffPermissions,
      },
    })
  } finally {
    creatingEmployee.value = false
  }
}

const updateEmployeeStatus = async (id, status) => {
  const employee = managedEmployees.value.find((emp) => Number(emp.id) === Number(id))
  if (!employee) {
    Swal.fire('Not found', 'Employee record is unavailable.', 'warning')
    return
  }

  const action = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'pending'
  const actionLabel = action === 'approve'
    ? 'Approve'
    : action === 'reject'
      ? 'Reject'
      : 'Set to Pending'
  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: `${actionLabel} ${employee.name}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: actionLabel,
    confirmButtonColor: action === 'reject' ? '#dc2626' : '#0f766e',
    cancelButtonText: 'Cancel',
  })
  if (!confirm.isConfirmed) return

  try {
    const res = await axios.post(`/business/managed/employees/${id}/status`, { action })
    const updated = res.data?.data || res.data || {}
    const idx = managedEmployees.value.findIndex((emp) => Number(emp.id) === Number(id))
    if (idx >= 0) {
      managedEmployees.value[idx] = {
        ...managedEmployees.value[idx],
        ...updated,
      }
    }
    Swal.fire('Updated', res.data?.message || 'Employee status updated.', 'success')
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to update employee status.'
    Swal.fire('Error', message, 'error')
  }
}

const createManagedTeam = async () => {
  const result = await Swal.fire({
    title: 'Create Team',
    input: 'text',
    inputLabel: 'Team name',
    inputPlaceholder: 'Example: Night Dispatch Team',
    showCancelButton: true,
    confirmButtonText: 'Create',
    confirmButtonColor: '#0f766e',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => {
      if (!normalizeTeamName(value)) return 'Team name is required.'
      return undefined
    },
  })

  if (!result.isConfirmed) return ''

  const normalized = normalizeTeamName(result.value)
  const alreadyExists = managedTeamOptions.value.some((team) => team.toLowerCase() === normalized.toLowerCase())
  const team = ensureManagedTeamOption(normalized)
  Swal.fire(
    alreadyExists ? 'Team exists' : 'Team created',
    alreadyExists ? `${team} already exists and can be used for assignment.` : `${team} is ready for assignment.`,
    alreadyExists ? 'info' : 'success',
  )
  return team
}

const createTeamForEmployee = async (id) => {
  const employee = managedEmployees.value.find((emp) => Number(emp.id) === Number(id))
  if (!employee) {
    Swal.fire('Not found', 'Employee record is unavailable.', 'warning')
    return
  }
  if (!isEmployeeApproved(employee)) {
    Swal.fire('Approval required', 'Approve this employee first before team assignment.', 'warning')
    return
  }

  const createdTeam = await createManagedTeam()
  if (!createdTeam) return
  teamByEmployeeId[id] = createdTeam
  await assignEmployeeToTeam(id)
}

const assignEmployeeToTeam = async (id) => {
  if (assigningTeamEmployeeId.value !== null) return
  const employee = managedEmployees.value.find((emp) => Number(emp.id) === Number(id))
  if (!employee) {
    Swal.fire('Not found', 'Employee record is unavailable.', 'warning')
    return
  }
  if (!isEmployeeApproved(employee)) {
    Swal.fire('Approval required', 'Approve this employee first before assigning a team.', 'warning')
    return
  }

  const team = scopedTeamNameForRole(employee.role, teamByEmployeeId[id])
  if (!team) {
    if (!canAssignEmployeeToTeam(employee)) {
      Swal.fire('Invalid role', 'Only Siphoning or Plumbing roles can be assigned to teams.', 'warning')
      return
    }
    Swal.fire('Select team', `Please select a valid ${employeeTeamTrackLabel(employee.role)} team from A to Z.`, 'warning')
    return
  }

  const sameTeam = scopedTeamNameForRole(employee.role, employee.team)
  const occupied = Number(teamMemberCounts.value[team] || 0)
  const effectiveOccupied = sameTeam === team ? occupied - 1 : occupied
  if (effectiveOccupied >= 3) {
    Swal.fire('Team full', `${team} already has 3 workers. Please select another team.`, 'warning')
    return
  }

  if (isRoleTakenInTeam(employee, team)) {
    Swal.fire('Duplicate role', `${team} already has the same work role. Please assign a different role/team.`, 'warning')
    return
  }

  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: `Assign ${employee.name} to ${team}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Assign',
    confirmButtonColor: '#0f766e',
    cancelButtonText: 'Cancel',
  })
  if (!confirm.isConfirmed) return

  ensureManagedTeamOption(team)
  teamByEmployeeId[id] = team

  try {
    assigningTeamEmployeeId.value = Number(id)
    const res = await axios.post(`/business/managed/employees/${id}/assign-team`, { team })
    const updated = res.data || {}
    const idx = managedEmployees.value.findIndex((emp) => Number(emp.id) === Number(id))
    if (idx >= 0) {
      managedEmployees.value[idx] = {
        ...managedEmployees.value[idx],
        ...updated,
      }
    }
    await fetchManagedEmployees()
    Swal.fire('Assigned', `${employee.name} is now assigned to ${team}.`, 'success')
  } catch (error) {
    const teamErrors = error?.response?.data?.errors?.team
    const firstTeamError = Array.isArray(teamErrors) ? teamErrors[0] : ''
    const message = firstTeamError || error?.response?.data?.message || 'Failed to assign employee team.'
    Swal.fire('Error', message, 'error')
  } finally {
    assigningTeamEmployeeId.value = null
  }
}

const openPricingRuleModal = () => {
  pricingRuleModalOpen.value = true
}

const closePricingRuleModal = () => {
  pricingRuleModalOpen.value = false
}

const submitPricingRuleFromModal = async () => {
  const saved = await savePricingRule()
  if (saved) {
    closePricingRuleModal()
  }
}

const savePricingRule = async () => {
  const service = String(pricingForm.service || '').trim()
  if (!service) {
    Swal.fire('Error', 'Please select a service.', 'error')
    return false
  }

  try {
    const res = await axios.post('/business/managed/pricing-rules', {
      service,
      base_price: Number(pricingForm.basePrice || 0),
      distance_fee: Number(pricingForm.distanceFee || 0),
      urgency_fee_pct: Number(pricingForm.urgencyFeePct || 0),
      minor_pct: Number(pricingForm.minorPct || 0),
      moderate_pct: Number(pricingForm.moderatePct || 0),
      severe_pct: Number(pricingForm.severePct || 0),
      note: String(pricingForm.note || '').trim() || null,
    })
    pricingRules.value = Array.isArray(res.data?.rules) ? res.data.rules : pricingRules.value
    Swal.fire('Saved', res.data?.message || 'Pricing rule saved.', 'success')
    return true
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to save pricing rule.'
    Swal.fire('Error', message, 'error')
    return false
  }
}

const generateReport = async () => {
  try {
    const res = await axios.get('/business/managed/reports', {
      params: { type: reportType.value },
    })
    const report = res.data || {}
    generatedReports.value.unshift({
      id: report.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: report.title || 'Report',
      summary: report.summary || '',
      generatedAt: report.generatedAt || new Date().toISOString(),
      rows: Array.isArray(report.rows) ? report.rows : [],
    })
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to generate report.'
    Swal.fire('Error', message, 'error')
  }
}

const exportReportsCsv = () => {
  const type = encodeURIComponent(reportType.value || 'bookings')
  window.open(`/business/managed/reports/export-csv?type=${type}`, '_blank')
}


/* MODAL */
const modalOpen = ref(false)
const selected = ref({})
const modalType = ref('')

/* FETCH */
const fetchApplications = async () => {
  if(!isApproved.value) return
  loadingApplications.value = true
  const res = await axios.get('/business/provider-applications')
  applications.value = res.data
  loadingApplications.value = false
}

const fetchBusinessContext = async () => {
  if(!isApproved.value) return
  try {
    const res = await axios.get('/business/context')
    businessContext.id = res.data?.id ?? null
    businessContext.business_type = res.data?.business_type || ''
    businessContext.is_individual = !!res.data?.is_individual
    businessContext.management_mode = String(res.data?.management_mode || '').trim().toLowerCase()
    businessContext.auto_assign_enabled = !!res.data?.auto_assign_enabled
    businessContext.metrics = res.data?.metrics || null
    selectedManagementMode.value = businessContext.management_mode || selectedManagementMode.value || 'business'
    const redirectTo = getDashboardPathForRole({
      ...authUser,
      role: 'business',
      business_type: res.data?.business_type || '',
      management_mode: String(res.data?.management_mode || '').trim().toLowerCase(),
      is_approved: authUser.is_approved,
      status: authUser.status || authUser.approval_status || '',
      approval_status: authUser.approval_status || authUser.status || '',
    })
    if (redirectTo && !['/Business/BusinessDashboard', '/business/dashboard'].includes(String(redirectTo))) {
      router.replace(redirectTo)
      return
    }
  } catch (error) {
    businessContext.id = null
    businessContext.business_type = ''
    businessContext.is_individual = false
    businessContext.management_mode = ''
    businessContext.auto_assign_enabled = false
    businessContext.metrics = null
  }
}

const fetchProviders = async () => {
  if(!isApproved.value || !isIndividualBusiness.value) return
  loadingProviders.value = true
  try {
    const res = await axios.get('/business/service-providers')
    availableProviders.value = (res.data || [])
      .filter((p) => Number(p?.is_available) === 1)
      .map((p) => ({
        ...p,
        display_name: `${p?.user?.first_name || ''} ${p?.user?.middle_initial ? `${p.user.middle_initial}. ` : ''}${p?.user?.last_name || ''}`.trim() || `Provider #${p.id}`,
      }))
  } catch (error) {
    availableProviders.value = []
  } finally {
    loadingProviders.value = false
  }
}

const fetchRequests = async () => {
  if(!isApproved.value) return
  loadingRequests.value = true
  const [res, inventoryRes] = await Promise.all([
    axios.get('/business/service-requests'),
    axios.get('/business/operations/inventory-summary').catch(() => ({ data: null })),
  ])
  requests.value = (res.data || []).map(r => ({
    ...r,
    user_name: r.user_name || `${r.user?.first_name || ''} ${r.user?.middle_initial ? r.user.middle_initial + '. ' : ''}${r.user?.last_name || ''}`.trim(),
    service_name: r.service_name || r.service_type || (r.category || 'N/A'),
    details: r.details || r.notes || '',
    contact_number: r.contact_number || r.user?.contact_number || '',
    address_text: r.address_text || r.address || '',
    preferred_date: r.preferred_date || '',
    payment_method: r.payment_method || '',
  }))

  const inventoryPayload = inventoryRes?.data || {}
  managedInventorySummary.value = Array.isArray(inventoryPayload.inventory) ? inventoryPayload.inventory : []
  managedPrStatusSummary.value = inventoryPayload.pr_status_summary || {}
  const totals = inventoryPayload.totals || {}
  managedInventoryTotals.received_qty = Number(totals.received_qty || 0)
  managedInventoryTotals.allocated_qty = Number(totals.allocated_qty || 0)
  managedInventoryTotals.available_qty = Number(totals.available_qty || 0)
  managedInventoryTotals.low_stock_items = Number(totals.low_stock_items || 0)
  const wallet = inventoryPayload.finance_wallet || {}
  financeWalletSummary.current_balance = Number(wallet.current_balance || 0)
  financeWalletSummary.total_spent = Number(wallet.total_spent || 0)
  recentOrderedItems.value = Array.isArray(inventoryPayload.recent_orders) ? inventoryPayload.recent_orders : []
  const typeSummary = inventoryPayload.purchase_type_summary || {}
  managedPurchaseTypeSummary.online = Number(typeSummary.online || 0)
  managedPurchaseTypeSummary.physical = Number(typeSummary.physical || 0)

  // Fallback: infer business type from request payload when context endpoint is unavailable.
  if (!businessContext.business_type && requests.value.length) {
    const rawType = String(requests.value[0]?.business_type || '').trim()
    businessContext.business_type = rawType
    businessContext.is_individual = rawType.toLowerCase() === 'individual'
  }
  loadingRequests.value = false
}

const quickAssignProvider = async (requestId) => {
  const providerId = selectedProviderByRequest[requestId]
  if (!providerId) return

  assigningRequestId.value = requestId
  try {
    const res = await axios.post(`/business/service-requests/${requestId}/assign`, {
      service_provider_id: providerId,
    })
    Swal.fire('Assigned', res.data?.message || 'Provider assigned successfully.', 'success')
    selectedProviderByRequest[requestId] = ''
    await fetchRequests()
    await fetchProviders()
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to assign provider.'
    Swal.fire('Error', message, 'error')
  } finally {
    assigningRequestId.value = null
  }
}

const isImageReceiptUrl = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(url || ''))

const openReceiptPreview = (url) => {
  const cleanUrl = String(url || '').trim()
  if (!cleanUrl) return
  if (!isImageReceiptUrl(cleanUrl)) {
    window.open(cleanUrl, '_blank', 'noopener')
    return
  }
  receiptPreview.url = cleanUrl
  receiptPreview.open = true
}

const closeReceiptPreview = () => {
  receiptPreview.open = false
  receiptPreview.url = ''
}

const toggleAutoAssign = async () => {
  if (!isIndividualBusiness.value || updatingAutoAssign.value) return
  updatingAutoAssign.value = true
  const nextEnabled = !businessContext.auto_assign_enabled
  try {
    const res = await axios.post('/business/settings/auto-assign', { enabled: nextEnabled })
    businessContext.auto_assign_enabled = !!res.data?.auto_assign_enabled
    Swal.fire('Updated', res.data?.message || 'Auto-assign setting updated.', 'success')
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to update auto-assign setting.'
    Swal.fire('Error', message, 'error')
  } finally {
    updatingAutoAssign.value = false
  }
}

const saveManagementMode = async () => {
  const mode = String(selectedManagementMode.value || '').trim().toLowerCase()
  if (!mode || !['hr', 'business'].includes(mode) || updatingManagementMode.value) return

  const current = String(businessContext.management_mode || '').trim().toLowerCase()
  if (mode === current) {
    toast.info('Management mode is already set to this option.')
    return
  }

  const confirm = await Swal.fire({
    title: 'Switch management mode?',
    text: mode === 'hr'
      ? 'This will route your business to HR workspace.'
      : 'This will route your business to Business-Managed workspace.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, switch',
    confirmButtonColor: '#0f766e',
  })
  if (!confirm.isConfirmed) return

  updatingManagementMode.value = true
  try {
    const res = await axios.post('/business/setup/management', {
      management_mode: mode,
    })

    businessContext.management_mode = String(res.data?.management_mode || mode).trim().toLowerCase()
    const redirectTo = mode === 'business'
      ? '/Business/BusinessDashboard'
      : (res.data?.redirect_to || '/HR/HrBusinessShell')

    if (mode === 'hr') {
      toast.success('Management mode updated. Redirecting to HR workspace.')
      router.visit(redirectTo)
      return
    }

    toast.success(res.data?.message || 'Business-Managed mode activated.')
    router.visit('/Business/BusinessDashboard')
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to update management mode.'
    toast.error(message)
  } finally {
    updatingManagementMode.value = false
  }
}

const paymentMethodLabel = (method) => {
  const m = String(method || '').toLowerCase().trim()
  if (m === 'downpayment') return 'Downpayment'
  if (m === 'full' || m === 'personal') return 'Full Payment'
  return 'N/A'
}

/* ACTIONS */
const reviewApplication = async ({ id, action, reason = null }) => {
  try {
    // confirm muna
    const confirm = await Swal.fire({
      title: action === 'approve'
        ? 'Approve this application?'
        : 'Reject this application?',
      icon: 'warning',
      showCancelButton: true
    })

    if (!confirm.isConfirmed) return

    // axios call
    await axios.post(`/business/provider-applications/${id}/review`, {
      action,
      reason
    })

    // ✅ INSTANT UI UPDATE (NO REFRESH)
    applications.value = applications.value.filter(app => app.id !== id)

    Swal.fire({
      icon: 'success',
      title: action === 'approve'
        ? 'Application Approved'
        : 'Application Rejected'
    })

  } catch (error) {
    console.error(error)

    Swal.fire({
      icon: 'error',
      title: 'Action failed',
      text: error.response?.data?.message || 'Something went wrong'
    })
  }
}


const handleRequest = async (action) => {
  let payload = { action }

  if (action === 'reject') {
    const res = await Swal.fire({
      title: 'Reason for rejection',
      input: 'textarea',
      showCancelButton: true
    })
    if (!res.value) return
    payload.reason = res.value
  }

  await axios.post(
    `/business/service-requests/${selected.value.id}/review`,
    payload
  )

  modalOpen.value = false
  fetchRequests()
}

const openModal = ({ item, type }) => {
  selected.value = item
  modalType.value = type
  modalOpen.value = true
}

const confirmLogout = async () => {
  showProfileMenu.value = false
  await confirmAndLogout({
    confirmTitle: 'Log out?',
    confirmText: 'You will be signed out of your account.',
  })
}

const loadManagedDataForSection = (name) => {
  if (
    name === 'managed' ||
    name === 'managed-employees' ||
    name === 'managed-approval-queue' ||
    name === 'managed-assign-team' ||
    name === 'managed-teams'
  ) {
    fetchManagedEmployees()
  }
  if (name === 'managed' || name === 'managed-pricing') {
    fetchManagedPricingRules()
  }
}

const setSection = (name, syncUrl = true) => {
  if (!isApproved.value) return
  const next = normalizeSectionForMode(name)
  section.value = next
  isManagedPrimaryOpen.value = managedPrimarySections.includes(next)
  isManagedOpsOpen.value = managedOpsSections.includes(next)
  isManagedFinanceOpen.value = managedFinanceSections.includes(next)
  openBusinessGroupTitle.value = resolveBusinessGroupForSection(next)
  loadManagedDataForSection(next)
  if (next === 'settings') {
    ensureRbacLoaded()
  }
  if (next === 'managed-operations') {
    ensureOperationalManagersLoaded()
  }

  if (syncUrl && sectionFromUrl(page.url) !== next) {
    router.visit(`/business/dashboard?section=${encodeURIComponent(next)}`, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }
}

const toggleManagedPrimaryMenu = () => {
  if (!isApproved.value) return
  const willOpen = !isManagedPrimaryOpen.value
  isManagedPrimaryOpen.value = willOpen
  if (willOpen && !managedPrimarySectionActive.value) {
    setSection('managed-employees')
  }
}

const toggleManagedOpsMenu = () => {
  if (!isApproved.value) return
  const willOpen = !isManagedOpsOpen.value
  isManagedOpsOpen.value = willOpen
  if (willOpen && !managedOpsSectionActive.value) {
    setSection('managed-operations')
  }
}

const toggleManagedFinanceMenu = () => {
  if (!isApproved.value) return
  const willOpen = !isManagedFinanceOpen.value
  isManagedFinanceOpen.value = willOpen
  if (willOpen && !managedFinanceSectionActive.value) {
    setSection('managed-orders')
  }
}

let dashboardPoller = null
const startDashboardPolling = ()=>{
  if(dashboardPoller) return
  dashboardPoller = setInterval(() => {
    fetchRequests()
    fetchApplications()
    fetchProviders()
  }, 15000)
}
const stopDashboardPolling = ()=>{
  if(dashboardPoller){
    clearInterval(dashboardPoller)
    dashboardPoller = null
  }
}

watch(
  () => page.url,
  (url) => {
    const next = normalizeSectionForMode(sectionFromUrl(url))
    section.value = next
    isManagedPrimaryOpen.value = managedPrimarySections.includes(next)
    isManagedOpsOpen.value = managedOpsSections.includes(next)
    isManagedFinanceOpen.value = managedFinanceSections.includes(next)
    openBusinessGroupTitle.value = resolveBusinessGroupForSection(next)
    if (next === 'settings') {
      ensureRbacLoaded()
    }
    if (next === 'managed-operations') {
      ensureOperationalManagersLoaded()
    }
  },
  { immediate: true },
)

watch(
  () => businessContext.management_mode,
  (mode) => {
    const normalized = String(mode || '').trim().toLowerCase()
    if (normalized === 'business') {
      ensureRbacLoaded()
      ensureOperationalManagersLoaded()
    } else {
      rbacCloseEmployeeModal()
      rbacStopRealtime()
    }

    const next = normalizeSectionForMode(section.value)
    if (next !== section.value) {
      setSection(next)
      return
    }

    openBusinessGroupTitle.value = resolveBusinessGroupForSection(next)
  }
)

onMounted(() => {
  document.addEventListener('click', handleProfileMenuClick)
  loadArchivedManagedEmployeeIds()
  normalizeArchivedManagedEmployeeIds()
  Promise.allSettled([fetchOwnProfile(), fetchReviewNotifications()]).then(() => {
    notifyBusinessReviewUpdate()
    if(authUser.is_approved){
      fetchBusinessContext().then(() => {
        if (!['/Business/BusinessDashboard', '/business/dashboard'].includes(String(preferredBusinessDashboardPath.value))) {
          return
        }
        fetchApplications()
        fetchRequests()
        fetchProviders()
        fetchManagedEmployees()
        fetchManagedPricingRules()
      })
      startDashboardPolling()
    } else {
      fetchApplications()
      fetchRequests()
      fetchManagedEmployees()
      fetchManagedPricingRules()
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleProfileMenuClick)
  stopDashboardPolling()
  rbacStopRealtime()
  clearAllSelectedBusinessDocuments()
})
</script>


