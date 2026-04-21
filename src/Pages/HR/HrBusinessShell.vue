<template>
  <div class="flex min-h-screen bg-slate-50">
    <HrSidebarNav :active-menu="activeMenu" :locked="isWorkspaceLocked" @navigate="navigateTo" />

    <div class="flex flex-1 flex-col bg-slate-50">
      <HrTopbar @logout="logout" />

      <div class="hr-content p-6 max-md:p-4">
        <div class="rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-700 p-6 text-white shadow-lg">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{{ workspaceHeroEyebrow }}</p>
              <h1 class="mt-1 text-3xl font-black tracking-tight">{{ workspaceHeroTitle }}</h1>
              <p class="mt-2 max-w-3xl text-sm text-white/85">
                {{ workspaceHeroCopy }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
              <p class="font-semibold">{{ workspaceBadgeTitle }}</p>
              <p class="mt-1 text-white/80">{{ workspaceBadgeCopy }}</p>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <section v-if="isWorkspaceLocked" class="space-y-6">
            <div class="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#ecfeff_48%,#f8fafc_100%)] p-6 shadow-sm">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-teal-600">Account Review</p>
                  <h2 class="mt-2 text-2xl font-bold text-slate-900">
                    {{ businessAccountStatusLabel === 'Rejected' ? 'Company Account Rejected' : 'Company Account Pending Approval' }}
                  </h2>
                  <p class="mt-2 max-w-3xl text-sm text-slate-600">
                    {{ businessAccountStatusLabel === 'Rejected'
                      ? 'Your company account was returned for document correction. Upload updated files below so the record goes back to admin review while the HR modules stay locked.'
                      : 'Company accounts can log in before approval. You can upload updated documents below while HR-managed tabs stay locked until admin approval.' }}
                  </p>
                </div>
                <span
                  class="inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold"
                  :class="businessAccountStatusLabel === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ businessAccountStatusLabel }}
                </span>
              </div>

              <div v-if="authUser.rejection_reason || businessRejectionChecklistLabels.length || latestBusinessReviewMessage" class="mt-5 grid gap-4 xl:grid-cols-3">
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
            </div>

            <div class="grid gap-4 xl:grid-cols-2">
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Existing Documents</p>
                    <h3 class="mt-1 text-lg font-bold text-slate-800">Saved Company Files</h3>
                  </div>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {{ businessStoredDocuments.length }} files
                  </span>
                </div>
                <div v-if="businessStoredDocuments.length" class="mt-4 grid gap-3 md:grid-cols-2">
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
                      {{ doc.isImage ? 'Preview saved document' : 'Open saved document' }}
                    </button>
                    <p v-else class="mt-2 text-sm text-slate-400">No preview available for this file.</p>
                  </article>
                </div>
                <p v-else class="mt-4 text-sm text-slate-500">No saved company documents found on this account yet.</p>
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
          </section>

          <section v-else-if="activeSection === 'dashboard'" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Business Type" :value="businessTypeLabel" />
              <MetricCard title="Active Providers" :value="activeProviders.length" />
              <MetricCard title="Pending Applications" :value="pendingApplications.length" />
              <MetricCard title="Finance Balance" :value="formatCurrency(finance.current_balance)" />
            </div>

            <div class="grid gap-4 xl:grid-cols-2">
              <Panel title="Workspace Summary">
                <div class="grid gap-3 md:grid-cols-2">
                  <SummaryItem label="Operations Queue" :value="openOperationsCount" />
                  <SummaryItem label="Procurement Inventory" :value="inventory.available_qty" />
                  <SummaryItem label="Low Stock Items" :value="inventory.low_stock_items" />
                  <SummaryItem label="Total Spent" :value="formatCurrency(finance.total_spent)" />
                </div>
              </Panel>

              <Panel title="Recent Work Requests">
                <div v-if="loadingRequests" class="text-sm text-slate-500">Loading work requests...</div>
                <div v-else-if="!recentRequests.length" class="text-sm text-slate-500">No work requests found.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="request in recentRequests"
                    :key="request.id"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-slate-900">{{ request.user_name }}</p>
                        <p class="text-xs text-slate-500">{{ request.service_name }} - Request #{{ request.id }}</p>
                      </div>
                      <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="statusClass(request.status)">
                        {{ request.status }}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div class="grid gap-4">
            </div>
          </section>

          <section v-else-if="activeSection === 'providers'" class="space-y-4">
            <div class="grid gap-4 xl:grid-cols-2">
              <Panel title="Pending Provider Applications">
                <template #actions>
                  <button class="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700" @click="fetchPendingApplications">
                    Refresh
                  </button>
                </template>
                <div v-if="loadingPendingProviders" class="text-sm text-slate-500">Loading applications...</div>
                <div v-else-if="!pendingApplications.length" class="text-sm text-slate-500">No pending applications.</div>
                <div v-else class="space-y-3">
                  <div
                    v-for="provider in pendingApplications"
                    :key="provider.id"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p class="font-semibold text-slate-900">{{ providerName(provider) }}</p>
                    <p class="mt-1 text-xs text-slate-500">{{ provider.category || 'General service' }}</p>
                    <div class="mt-3 flex gap-2">
                      <button
                        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        :disabled="reviewingProviderId === provider.id"
                        @click="reviewProvider(provider.id, 'approve')"
                      >
                        Approve
                      </button>
                      <button
                        class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        :disabled="reviewingProviderId === provider.id"
                        @click="reviewProvider(provider.id, 'reject')"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Accredited Partners">
                <template #actions>
                  <button class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800" @click="fetchActiveProviders">
                    Refresh
                  </button>
                </template>
                <div v-if="loadingProviders" class="text-sm text-slate-500">Loading active providers...</div>
                <div v-else-if="!activeProviders.length" class="text-sm text-slate-500">No approved providers yet.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="provider in activeProviders"
                    :key="provider.id"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-slate-900">{{ providerName(provider) }}</p>
                        <p class="text-xs text-slate-500">{{ provider.category || 'General service' }}</p>
                      </div>
                      <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </section>

          <section v-else-if="activeSection === 'operations'" class="space-y-4">
            <Panel title="Operations Request Queue">
              <template #actions>
                <button class="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700" @click="fetchRequests">
                  Refresh
                </button>
              </template>
              <div v-if="loadingRequests" class="text-sm text-slate-500">Loading work requests...</div>
              <div v-else-if="!requests.length" class="text-sm text-slate-500">No work requests available.</div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th class="px-3 py-2">Request</th>
                      <th class="px-3 py-2">Customer</th>
                      <th class="px-3 py-2">Service</th>
                      <th class="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="request in requests" :key="request.id">
                      <td class="px-3 py-2 font-semibold text-slate-900">#{{ request.id }}</td>
                      <td class="px-3 py-2 text-slate-700">{{ request.user_name }}</td>
                      <td class="px-3 py-2 text-slate-700">{{ request.service_name }}</td>
                      <td class="px-3 py-2">
                        <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="statusClass(request.status)">
                          {{ request.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <section v-else-if="activeSection === 'procurement'" class="space-y-4">
            <Panel title="Procurement Inventory Summary">
              <template #actions>
                <button class="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700" @click="fetchInventorySummary">
                  Refresh
                </button>
              </template>
              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Received Qty" :value="inventory.received_qty" />
                <MetricCard title="Allocated Qty" :value="inventory.allocated_qty" />
                <MetricCard title="Available Qty" :value="inventory.available_qty" />
                <MetricCard title="Low Stock Items" :value="inventory.low_stock_items" />
              </div>
            </Panel>

            <div class="grid gap-4 xl:grid-cols-2">
              <Panel title="Inventory Items">
                <div v-if="loadingInventory" class="text-sm text-slate-500">Loading inventory...</div>
                <div v-else-if="!inventoryRows.length" class="text-sm text-slate-500">No inventory records yet.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="row in inventoryRows.slice(0, 10)"
                    :key="`${row.material_name}-${row.unit}`"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p class="font-semibold text-slate-900">{{ row.material_name }}</p>
                    <p class="text-xs text-slate-500">{{ row.available }} {{ row.unit }} available</p>
                  </div>
                </div>
              </Panel>

              <Panel title="Recent Orders">
                <div v-if="loadingInventory" class="text-sm text-slate-500">Loading orders...</div>
                <div v-else-if="!recentOrders.length" class="text-sm text-slate-500">No procurement orders yet.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="order in recentOrders.slice(0, 10)"
                    :key="order.id"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p class="font-semibold text-slate-900">{{ order.material_name }}</p>
                    <p class="text-xs text-slate-500">{{ order.quantity }} {{ order.unit }} - {{ formatCurrency(order.total_cost) }}</p>
                  </div>
                </div>
              </Panel>
            </div>
          </section>

          <section v-else class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <MetricCard title="Current Balance" :value="formatCurrency(finance.current_balance)" />
              <MetricCard title="Total Spent" :value="formatCurrency(finance.total_spent)" />
            </div>

            <Panel title="Record Business Purchase">
              <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitInventoryOrder">
                <label class="text-sm font-semibold text-slate-700">
                  Purchase Type
                  <select v-model="inventoryOrder.purchase_type" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                    <option value="online">Online</option>
                    <option value="physical">Physical</option>
                  </select>
                </label>
                <label class="text-sm font-semibold text-slate-700">
                  Material Name
                  <input v-model.trim="inventoryOrder.material_name" type="text" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800" required />
                </label>
                <label class="text-sm font-semibold text-slate-700">
                  Quantity
                  <input v-model.number="inventoryOrder.quantity" type="number" min="1" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800" required />
                </label>
                <label class="text-sm font-semibold text-slate-700">
                  Amount
                  <input v-model.number="inventoryOrder.amount" type="number" min="0" step="0.01" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800" required />
                </label>
                <label class="text-sm font-semibold text-slate-700">
                  Unit
                  <input v-model.trim="inventoryOrder.unit" type="text" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800" placeholder="pcs" />
                </label>
                <label v-if="inventoryOrder.purchase_type === 'online'" class="text-sm font-semibold text-slate-700">
                  Purchase Link
                  <input v-model.trim="inventoryOrder.purchase_link" type="url" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800" placeholder="https://example.com/item" />
                </label>
                <label v-else class="text-sm font-semibold text-slate-700">
                  Receipt / Proof
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" class="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800" @change="onReceiptSelected" />
                </label>
                <div class="md:col-span-2 flex justify-end gap-2">
                  <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="resetInventoryOrderForm">Reset</button>
                  <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300" :disabled="savingInventoryOrder">
                    {{ savingInventoryOrder ? 'Saving...' : 'Save Purchase' }}
                  </button>
                </div>
              </form>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showCreateUserModal" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeCreateUserModal"></div>
    <div class="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">HR Workspace</p>
          <h3 class="mt-1 text-lg font-semibold text-slate-900">Create User Account</h3>
          <p class="mt-1 text-xs text-slate-500">Create staff access for Operations, Finance, CSR, or Procurement teams.</p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          @click="closeCreateUserModal"
        >
          Close
        </button>
      </div>

      <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="createUserAccount">
        <label class="text-sm font-semibold text-slate-700 md:col-span-2">
          Department
          <select v-model="userAccountForm.department" class="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" required>
            <option value="" disabled>Select department</option>
            <option v-for="dept in departmentOptions" :key="dept.value" :value="dept.value">{{ dept.label }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">Department office account ito, kaya automatic approved na agad pagkatapos ma-create.</p>
        </label>
        <label class="text-sm font-semibold text-slate-700 md:col-span-2">
          Email Address
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
          <p
            v-if="accountEmailMessage"
            class="mt-1 text-xs"
            :class="availabilityMessageClass(accountEmailStatus)"
          >
            {{ accountEmailMessage }}
          </p>
        </label>
        <label class="text-sm font-semibold text-slate-700 md:col-span-2">
          Password
          <div class="relative mt-1">
            <input
              v-model.trim="userAccountForm.password"
              :type="showAccountPassword ? 'text' : 'password'"
              class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 pr-12 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              required
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              :aria-label="showAccountPassword ? 'Hide password' : 'Show password'"
              @click="showAccountPassword = !showAccountPassword"
            >
              <svg v-if="!showAccountPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
          <div v-if="userAccountForm.password" class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-slate-500">Password Strength</span>
              <span :class="accountPasswordStrengthClass">{{ accountPasswordStrengthLabel }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full transition-all duration-200"
                :class="accountPasswordStrengthBarClass"
                :style="{ width: `${accountPasswordStrengthPercent}%` }"
              />
            </div>
            <div class="grid gap-1 text-xs">
              <p :class="accountPasswordPolicy.minLength ? 'text-emerald-600' : 'text-rose-600'">At least 8 characters</p>
              <p :class="accountPasswordPolicy.uppercase ? 'text-emerald-600' : 'text-rose-600'">At least 1 uppercase letter</p>
              <p :class="accountPasswordPolicy.lowercase ? 'text-emerald-600' : 'text-rose-600'">At least 1 lowercase letter</p>
              <p :class="accountPasswordPolicy.number ? 'text-emerald-600' : 'text-rose-600'">At least 1 number</p>
              <p :class="accountPasswordPolicy.special ? 'text-emerald-600' : 'text-rose-600'">At least 1 special character</p>
            </div>
          </div>
          <p v-if="userAccountPasswordError" class="mt-2 text-xs text-rose-600">{{ userAccountPasswordError }}</p>
        </label>
        <div class="md:col-span-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            :disabled="creatingUserAccount || checkingAccountEmail"
            @click="resetUserAccountForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="creatingUserAccount || checkingAccountEmail"
          >
            {{ creatingUserAccount ? 'Creating...' : 'Create User Account' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import HrSidebarNav from '@/Components/HrSidebarNav.vue'
import HrTopbar from '@/Components/HrTopbar.vue'
import { confirmAndLogout } from '@/lib/auth-flow'
import { getDashboardPathForRole } from '@/lib/firebase-auth'
import { resolveStoredFileUrl, stripFileQuery } from '@/lib/file-url'
import { markProfileResubmitted } from '@/lib/profile-resubmission'

const Panel = {
  props: ['title'],
  template: `
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
        <slot name="actions" />
      </div>
      <div class="space-y-2 text-sm text-slate-700">
        <slot />
      </div>
    </div>
  `,
}

const MetricCard = {
  props: ['title', 'value'],
  template: `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{{ title }}</p>
      <p class="mt-2 text-2xl font-bold text-slate-900">{{ value }}</p>
    </div>
  `,
}

const SummaryItem = {
  props: ['label', 'value'],
  template: `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{{ label }}</p>
      <p class="mt-2 text-lg font-bold text-slate-900">{{ value }}</p>
    </div>
  `,
}

const props = defineProps({
  section: { type: String, default: 'dashboard' },
})

const sectionConfig = {
  dashboard: 'Dashboard',
  providers: 'Provider Accreditation',
  operations: 'Operations',
  procurement: 'Procurement',
  finance: 'Finance',
}

const activeSection = computed(() => (sectionConfig[props.section] ? props.section : 'dashboard'))
const activeMenu = computed(() => sectionConfig[activeSection.value])
const page = usePage()
const trimString = (value) => String(value || '').trim()
const normalizeApprovalFlag = (value) => {
  if (typeof value === 'boolean') return value
  const normalized = trimString(value).toLowerCase()
  if (['1', 'true', 'yes', 'approved', 'active'].includes(normalized)) return true
  if (['0', 'false', 'no', '', 'pending', 'rejected', 'archived', 'deleted'].includes(normalized)) return false
  return Boolean(value)
}

const authUserDefaults = {
  is_approved: false,
  uid: '',
  id: '',
  email: '',
  role: 'business',
  business_type: '',
  management_mode: '',
  contact_number: '',
  status: '',
  approval_status: '',
  rejection_reason: '',
  rejection_checklist: [],
  business_modules: [],
  latest_account_review_title: '',
  latest_account_review_message: '',
  latest_account_review_kind: '',
  latest_account_review_at: '',
  latest_account_review_seen_at: '',
  document_resubmitted_at: '',
  government_id: '',
  bir_registration: '',
  dti_registration: '',
  mayor_permit: '',
  business_permit: '',
  sanitary_permit: '',
}

const normalizeEmailCandidate = (value) => trimString(value).toLowerCase().replace(/\s+/g, '')
const ACCOUNT_NAME_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/
const ACCOUNT_MIDDLE_INITIAL_REGEX = /^[A-Za-z]$/
const ACCOUNT_PASSWORD_POLICY_REGEX = {
  minLength: /^.{8,}$/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
}
const sanitizeAccountName = (value) => String(value || '').replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ').trimStart()
const sanitizeAccountMiddleInitial = (value) => String(value || '').replace(/[^A-Za-z]/g, '').slice(0, 1)

const departmentOptions = [
  { value: 'operational', label: 'Operational management' },
  { value: 'finance', label: 'Finance' },
  { value: 'csr', label: 'CSR' },
  { value: 'procurement', label: 'Procurement' },
]
const userAccountForm = reactive({
  email: '',
  password: '',
  department: '',
})
const checkingAccountEmail = ref(false)
const accountEmailChecked = ref(false)
const accountEmailStatus = ref('')
const accountEmailMessage = ref('')
const creatingUserAccount = ref(false)
const showAccountPassword = ref(false)
const showCreateUserModal = ref(false)
let userAccountEmailTimer = null
const workspaceContextLoaded = ref(false)
const availabilityMessageClass = (status) => {
  if (status === 'success') return 'text-emerald-600'
  if (status === 'checking') return 'text-slate-500'
  return 'text-rose-600'
}
const DEPARTMENT_ACCOUNT_SUFFIX = 'Department'
const buildDepartmentAccountDraft = (department, email) => {
  const label = trimString(department?.label || 'Department')
  const displayName = `${label} ${DEPARTMENT_ACCOUNT_SUFFIX}`.trim()
  return {
    name: displayName,
    first_name: label,
    given_name: label,
    middle_name: null,
    middle_initial: null,
    last_name: DEPARTMENT_ACCOUNT_SUFFIX,
    email: normalizeEmailCandidate(email),
  }
}
const userAccountFirstNameError = computed(() => {
  const value = trimString(userAccountForm.first_name)
  if (!value) return ''
  return ACCOUNT_NAME_REGEX.test(value) ? '' : 'First name must contain letters only.'
})
const userAccountMiddleInitialError = computed(() => {
  const value = trimString(userAccountForm.middle_initial)
  if (!value) return ''
  return ACCOUNT_MIDDLE_INITIAL_REGEX.test(value) ? '' : 'Middle initial must be a single letter.'
})
const userAccountLastNameError = computed(() => {
  const value = trimString(userAccountForm.last_name)
  if (!value) return ''
  return ACCOUNT_NAME_REGEX.test(value) ? '' : 'Last name must contain letters only.'
})
const accountPasswordPolicy = computed(() => {
  const password = String(userAccountForm.password || '')
  return {
    minLength: ACCOUNT_PASSWORD_POLICY_REGEX.minLength.test(password),
    uppercase: ACCOUNT_PASSWORD_POLICY_REGEX.uppercase.test(password),
    lowercase: ACCOUNT_PASSWORD_POLICY_REGEX.lowercase.test(password),
    number: ACCOUNT_PASSWORD_POLICY_REGEX.number.test(password),
    special: ACCOUNT_PASSWORD_POLICY_REGEX.special.test(password),
  }
})
const accountPasswordStrengthScore = computed(() =>
  Object.values(accountPasswordPolicy.value).filter(Boolean).length
)
const accountPasswordStrengthLabel = computed(() => {
  if (!userAccountForm.password) return ''
  if (accountPasswordStrengthScore.value === 5) return 'Strong'
  if (accountPasswordStrengthScore.value >= 3) return 'Medium'
  return 'Weak'
})
const accountPasswordStrengthPercent = computed(() => {
  if (!userAccountForm.password) return 0
  return Math.max(20, (accountPasswordStrengthScore.value / 5) * 100)
})
const accountPasswordStrengthClass = computed(() => {
  if (accountPasswordStrengthLabel.value === 'Strong') return 'text-emerald-600'
  if (accountPasswordStrengthLabel.value === 'Medium') return 'text-amber-600'
  return 'text-rose-600'
})
const accountPasswordStrengthBarClass = computed(() => {
  if (accountPasswordStrengthLabel.value === 'Strong') return 'bg-emerald-500'
  if (accountPasswordStrengthLabel.value === 'Medium') return 'bg-amber-500'
  return 'bg-rose-500'
})
const userAccountPasswordError = computed(() => {
  if (!userAccountForm.password) return ''
  return accountPasswordStrengthScore.value === 5
    ? ''
    : 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
})

const ACCOUNT_EMAIL_PROBE_MAX_AGE_MS = 2 * 60 * 1000
const accountEmailProbeCache = new Map()

const readAccountEmailProbe = (email) => {
  const key = normalizeEmailCandidate(email)
  if (!key) return null

  const cached = accountEmailProbeCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.savedAt > ACCOUNT_EMAIL_PROBE_MAX_AGE_MS) {
    accountEmailProbeCache.delete(key)
    return null
  }

  return cached
}

const writeAccountEmailProbe = (email, result) => {
  const key = normalizeEmailCandidate(email)
  if (!key) return

  accountEmailProbeCache.set(key, {
    savedAt: Date.now(),
    ...result,
  })
}

const openCreateUserModal = () => {
  showCreateUserModal.value = true
}

const closeCreateUserModal = () => {
  if (creatingUserAccount.value || checkingAccountEmail.value) return
  if (userAccountEmailTimer) {
    window.clearTimeout(userAccountEmailTimer)
    userAccountEmailTimer = null
  }
  showCreateUserModal.value = false
}

const pageHasOpenCreateUserFlag = () => {
  const rawUrl = String(page.url || '')
  const query = rawUrl.includes('?') ? rawUrl.split('?')[1] || '' : ''
  const params = new URLSearchParams(query)
  return ['1', 'true', 'yes'].includes(String(params.get('open_create_user') || '').trim().toLowerCase())
}

watch(
  () => userAccountForm.email,
  () => {
    if (userAccountEmailTimer) {
      window.clearTimeout(userAccountEmailTimer)
      userAccountEmailTimer = null
    }
    accountEmailChecked.value = false
    accountEmailStatus.value = ''
    accountEmailMessage.value = ''
    const normalizedEmail = normalizeEmailCandidate(userAccountForm.email)
    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return
    }
    userAccountEmailTimer = window.setTimeout(() => {
      verifyAccountEmail({ silent: true })
    }, 120)
  }
)

const authUser = reactive({ ...authUserDefaults })
const syncAuthUserFromPage = () => {
  Object.assign(authUser, authUserDefaults, page.props?.auth?.user || {})
}
syncAuthUserFromPage()

const businessContext = reactive({
  business_type: trimString(authUser.business_type) || '',
  management_mode: trimString(authUser.management_mode).toLowerCase(),
})
const businessDocumentFields = [
  { key: 'government_id', label: 'Government ID' },
  { key: 'bir_registration', label: 'BIR Registration' },
  { key: 'dti_registration', label: 'DTI Registration' },
  { key: 'mayor_permit', label: 'Mayor Permit' },
  { key: 'business_permit', label: 'Business Permit' },
  { key: 'sanitary_permit', label: 'Sanitary Permit' },
]
const requests = ref([])
const activeProviders = ref([])
const pendingApplications = ref([])
const inventoryRows = ref([])
const recentOrders = ref([])
const loadingRequests = ref(false)
const loadingProviders = ref(false)
const loadingPendingProviders = ref(false)
const loadingInventory = ref(false)
const savingInventoryOrder = ref(false)
const reviewingProviderId = ref(null)
const receiptFile = ref(null)
const inventory = reactive({
  received_qty: 0,
  allocated_qty: 0,
  available_qty: 0,
  low_stock_items: 0,
})
const finance = reactive({
  current_balance: 0,
  total_spent: 0,
})
const inventoryOrder = reactive({
  purchase_type: 'online',
  material_name: '',
  quantity: 1,
  amount: '',
  unit: 'pcs',
  purchase_link: '',
})
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

const isApproved = computed(() => {
  const status = trimString(authUser.status || authUser.approval_status).toLowerCase()
  if (['pending', 'rejected', 'archived', 'deleted'].includes(status)) return false
  return normalizeApprovalFlag(authUser.is_approved)
})
const isWorkspaceLocked = computed(() => !isApproved.value)
const businessTypeLabel = computed(() => trimString(businessContext.business_type || authUser.business_type || 'Company') || 'Company')
const businessAccountStatusLabel = computed(() => {
  const status = trimString(authUser.status || authUser.approval_status).toLowerCase()
  if (status === 'rejected') return 'Rejected'
  if (status === 'approved' || isApproved.value) return 'Approved'
  return 'Pending Review'
})
const workspaceHeroEyebrow = computed(() => (isWorkspaceLocked.value ? 'Company HR Workspace' : 'HR Workspace'))
const workspaceHeroTitle = computed(() => (
  isWorkspaceLocked.value
    ? 'Account Review'
    : 'Business Modules'
))
const workspaceHeroCopy = computed(() => (
  isWorkspaceLocked.value
    ? 'Company accounts land here even before approval. The workspace stays visible, but HR-managed modules remain locked until admin approval.'
    : 'The dashboard stays inside HR workspace while the sidebar switches to business modules. RBAC roles, CRUD enforcement, and middleware checks stay unchanged.'
))
const workspaceBadgeTitle = computed(() => (isWorkspaceLocked.value ? 'Workspace Status' : 'HR Workspace'))
const workspaceBadgeCopy = computed(() => (
  isWorkspaceLocked.value
    ? businessAccountStatusLabel.value
    : 'Business modules inside HR workspace'
))
const recentRequests = computed(() => requests.value.slice(0, 5))
const openOperationsCount = computed(() =>
  requests.value.filter((request) => {
    const status = String(request.status || '').trim().toLowerCase()
    return ['pending', 'approved', 'accepted', 'assigned', 'in_progress'].includes(status)
  }).length
)
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
  (Array.isArray(authUser.rejection_checklist) ? authUser.rejection_checklist : [])
    .map((key) => {
      const normalized = trimString(key)
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
    ;(item.docs || []).forEach((docKey) => keys.add(docKey))
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
  )
})
const businessAccountState = computed(() => {
  const status = trimString(authUser.status || authUser.approval_status).toLowerCase()
  if (status === 'approved' || isApproved.value) return 'approved'
  if (status === 'rejected') return hasResubmittedDocuments.value ? 'pending' : 'rejected'
  return 'pending'
})
const canResubmitBusinessDocuments = computed(() => businessAccountState.value === 'rejected')
const resolveBusinessFileUrl = (value) => resolveStoredFileUrl(value, '')
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
const notifyBusinessReviewUpdate = () => {
  const reviewAt = trimString(authUser.latest_account_review_at)
  const message = trimString(authUser.rejection_reason || latestBusinessReviewMessage.value)
  if (!reviewAt || !message) return
  if (trimString(authUser.latest_account_review_seen_at) === reviewAt) return
  if (trimString(latestBusinessReviewNotification.value?.read_at) && trimString(latestBusinessReviewNotification.value?.created_at) === reviewAt) return
  if (window.__hrBusinessLatestReviewToastAt === reviewAt) return
  window.__hrBusinessLatestReviewToastAt = reviewAt
  Swal.fire({
    icon: trimString(authUser.latest_account_review_kind).toLowerCase() === 'rejected' ? 'error' : 'info',
    title: latestBusinessReviewNotificationTitle.value || 'Account review update',
    text: message,
    timer: 3200,
    showConfirmButton: false,
  })
}

const navigateTo = (menu, url) => {
  if (isWorkspaceLocked.value) {
    Swal.fire('Workspace locked', 'Your company account can log in, but HR-managed tabs stay locked until admin approval.', 'info')
    return
  }
  router.visit(url)
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
    Object.assign(authUser, authUserDefaults, page.props?.auth?.user || {}, res.data || {})
    if (!businessContext.business_type) {
      businessContext.business_type = trimString(authUser.business_type)
    }
    if (!businessContext.management_mode) {
      businessContext.management_mode = trimString(authUser.management_mode).toLowerCase()
    }
    notifyBusinessReviewUpdate()
  } catch {
    syncAuthUserFromPage()
  }
}

const submitBusinessDocuments = async () => {
  if (!selectedBusinessDocuments.value.length || businessDocumentsUploading.value) return

  try {
    businessDocumentsUploading.value = true
    const wasUnderReview = !isApproved.value
    const localResubmittedAt = new Date().toISOString()
    const formData = new FormData()
    formData.append('_method', 'PUT')
    if (trimString(authUser.status || authUser.approval_status).toLowerCase() === 'rejected') {
      formData.append('force_resubmission', '1')
    }

    businessDocumentFields.forEach((field) => {
      const file = selectedBusinessDocumentMap[field.key]
      if (file instanceof File) {
        formData.append(field.key, file)
      }
    })

    const response = await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipGlobalLoading: true,
    })

    if (response?.data && typeof response.data === 'object') {
      Object.assign(authUser, authUserDefaults, authUser, response.data)
    }
    if (wasUnderReview) {
      markProfileResubmitted(authUser, localResubmittedAt)
      authUser.document_resubmitted_at = trimString(authUser.document_resubmitted_at || localResubmittedAt)
      authUser.latest_account_review_title = trimString(authUser.latest_account_review_title || 'Documents resubmitted')
      authUser.latest_account_review_message = trimString(
        authUser.latest_account_review_message || 'Your updated documents were submitted for review.'
      )
      authUser.latest_account_review_kind = trimString(authUser.latest_account_review_kind || 'resubmitted')
      authUser.latest_account_review_at = trimString(authUser.latest_account_review_at || authUser.document_resubmitted_at || localResubmittedAt)
      authUser.latest_account_review_seen_at = null
      authUser.status = trimString(authUser.status || 'pending') || 'pending'
      authUser.approval_status = trimString(authUser.approval_status || 'pending') || 'pending'
      authUser.is_approved = false
    }

    clearAllSelectedBusinessDocuments()
    Swal.fire('Success', 'Updated company documents were uploaded successfully and sent back for review.', 'success')
    Promise.all([fetchOwnProfile(), fetchReviewNotifications()]).catch(() => {})
  } catch (error) {
    const fieldErrors = error?.response?.data?.errors || {}
    const firstFieldError = Object.values(fieldErrors).flat().find(Boolean)
    Swal.fire('Error', firstFieldError || error?.response?.data?.message || 'Failed to upload new documents.', 'error')
  } finally {
    businessDocumentsUploading.value = false
  }
}

const resetUserAccountForm = () => {
  userAccountForm.email = ''
  userAccountForm.password = ''
  userAccountForm.department = ''
  accountEmailChecked.value = false
  accountEmailStatus.value = ''
  accountEmailMessage.value = ''
  showAccountPassword.value = false
}

const verifyAccountEmail = async ({ silent = false } = {}) => {
  if (checkingAccountEmail.value) return
  const normalizedEmail = normalizeEmailCandidate(userAccountForm.email)
  if (!normalizedEmail) {
    accountEmailStatus.value = 'error'
    accountEmailMessage.value = 'Email is required.'
    accountEmailChecked.value = false
    return
  }

  const cachedProbe = readAccountEmailProbe(normalizedEmail)
  if (cachedProbe) {
    accountEmailStatus.value = cachedProbe.status
    accountEmailMessage.value = cachedProbe.message
    accountEmailChecked.value = cachedProbe.status === 'success'
    return
  }

  checkingAccountEmail.value = true
  accountEmailStatus.value = 'checking'
  accountEmailMessage.value = 'Checking if this email already exists...'

  try {
    const res = await axios.post('/check-email', { email: normalizedEmail }, { skipGlobalLoading: true, timeout: 2500 })
    const exists = Boolean(res?.data?.exists)
    if (exists) {
      accountEmailStatus.value = 'error'
      accountEmailMessage.value = 'This email is already registered.'
      accountEmailChecked.value = false
      writeAccountEmailProbe(normalizedEmail, {
        status: 'error',
        message: 'This email is already registered.',
      })
      if (!silent) Swal.fire('Email Taken', 'This email is already registered.', 'error')
      return
    }
    accountEmailStatus.value = 'success'
    accountEmailMessage.value = 'Email is available.'
    accountEmailChecked.value = true
    writeAccountEmailProbe(normalizedEmail, {
      status: 'success',
      message: 'Email is available.',
    })
  } catch (error) {
    const message = error?.response?.data?.message || 'Unable to verify email right now.'
    accountEmailStatus.value = 'error'
    accountEmailMessage.value = message
    accountEmailChecked.value = false
    if (!silent) Swal.fire('Email Check Failed', message, 'error')
  } finally {
    checkingAccountEmail.value = false
  }
}

const createUserAccount = async () => {
  if (creatingUserAccount.value) return

  const issues = []
  if (!userAccountForm.email) issues.push('Email is required.')
  if (!userAccountForm.password) issues.push('Password is required.')
  if (userAccountPasswordError.value) issues.push(userAccountPasswordError.value)
  if (!userAccountForm.department) issues.push('Department is required.')

  if (issues.length) {
    Swal.fire('Please complete the form', issues.join('\n'), 'warning')
    return
  }

  if (!accountEmailChecked.value || accountEmailStatus.value === 'error') {
    await verifyAccountEmail({ silent: false })
    if (!accountEmailChecked.value) return
  }

  const department = departmentOptions.find((option) => option.value === userAccountForm.department)
  if (!department) {
    Swal.fire('Missing Department', 'Please select a department.', 'warning')
    return
  }

  creatingUserAccount.value = true
  try {
    const normalizedEmail = normalizeEmailCandidate(userAccountForm.email)
    const identity = buildDepartmentAccountDraft(department, normalizedEmail)
    const res = await axios.post('/hr/employees', {
      name: identity.name,
      email: normalizedEmail,
      password: userAccountForm.password,
      first_name: identity.first_name,
      given_name: identity.given_name,
      middle_name: identity.middle_name,
      middle_initial: identity.middle_initial,
      last_name: identity.last_name,
      role: department.value,
      team: department.label,
      requested_status: 'Active',
      auto_approve: true,
      account_source: 'hr_department_account',
    }, { skipGlobalLoading: true })

    resetUserAccountForm()
    Swal.fire('Account Created', res?.data?.message || 'Department account created successfully.', 'success')
    showCreateUserModal.value = false
  } catch (error) {
    const message = error?.response?.data?.message || 'Unable to create user account.'
    if (message.toLowerCase().includes('already registered')) {
      accountEmailStatus.value = 'error'
      accountEmailMessage.value = 'This email is already registered.'
      accountEmailChecked.value = false
    }
    Swal.fire('Create Failed', message, 'error')
  } finally {
    creatingUserAccount.value = false
  }
}

const normalizeRequests = (rows) =>
  (rows || []).map((request) => ({
    ...request,
    user_name: request.user_name || `${request.user?.first_name || ''} ${request.user?.middle_initial ? `${request.user.middle_initial}. ` : ''}${request.user?.last_name || ''}`.trim() || 'Customer',
    service_name: request.service_name || request.service_type || request.category || 'N/A',
  }))

const providerName = (provider) =>
  `${provider?.user?.first_name || ''} ${provider?.user?.middle_initial ? `${provider.user.middle_initial}. ` : ''}${provider?.user?.last_name || ''}`.trim() || `Provider #${provider?.id || ''}`

const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`
const statusClass = (status) => {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized === 'pending') return 'bg-amber-100 text-amber-700'
  if (normalized === 'approved' || normalized === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'assigned' || normalized === 'in_progress') return 'bg-sky-100 text-sky-700'
  if (normalized === 'completed') return 'bg-teal-100 text-teal-700'
  if (normalized === 'rejected' || normalized === 'cancelled') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

const fetchBusinessContext = async () => {
  const res = await axios.get('/business/context')
  businessContext.business_type = trimString(res.data?.business_type || authUser.business_type || 'Company')
  businessContext.management_mode = trimString(res.data?.management_mode || authUser.management_mode).toLowerCase()
  workspaceContextLoaded.value = true
  const redirectTo = getDashboardPathForRole({
    ...authUser,
    role: 'business',
    business_type: businessContext.business_type,
    management_mode: businessContext.management_mode,
    is_approved: authUser.is_approved,
    status: authUser.status || authUser.approval_status || '',
    approval_status: authUser.approval_status || authUser.status || '',
  })
  if (redirectTo && !['/HR/HrBusinessShell', '/hr/hrbusinessshell'].includes(String(redirectTo))) {
    router.replace(redirectTo)
  }
}

const fetchRequests = async () => {
  loadingRequests.value = true
  try {
    const res = await axios.get('/business/service-requests')
    requests.value = normalizeRequests(res.data)
  } finally {
    loadingRequests.value = false
  }
}

const fetchActiveProviders = async () => {
  loadingProviders.value = true
  try {
    const res = await axios.get('/business/service-providers')
    activeProviders.value = Array.isArray(res.data) ? res.data : []
  } finally {
    loadingProviders.value = false
  }
}

const fetchPendingApplications = async () => {
  loadingPendingProviders.value = true
  try {
    const res = await axios.get('/business/provider-applications')
    pendingApplications.value = Array.isArray(res.data) ? res.data : []
  } finally {
    loadingPendingProviders.value = false
  }
}

const fetchInventorySummary = async () => {
  loadingInventory.value = true
  try {
    const res = await axios.get('/business/operations/inventory-summary')
    inventoryRows.value = Array.isArray(res.data?.inventory) ? res.data.inventory : []
    recentOrders.value = Array.isArray(res.data?.recent_orders) ? res.data.recent_orders : []
    inventory.received_qty = Number(res.data?.totals?.received_qty || 0)
    inventory.allocated_qty = Number(res.data?.totals?.allocated_qty || 0)
    inventory.available_qty = Number(res.data?.totals?.available_qty || 0)
    inventory.low_stock_items = Number(res.data?.totals?.low_stock_items || 0)
    finance.current_balance = Number(res.data?.finance_wallet?.current_balance || 0)
    finance.total_spent = Number(res.data?.finance_wallet?.total_spent || 0)
  } finally {
    loadingInventory.value = false
  }
}

const reviewProvider = async (providerId, action) => {
  if (reviewingProviderId.value) return

  let reason = null
  if (action === 'reject') {
    const result = await Swal.fire({
      title: 'Reject application',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      showCancelButton: true,
      inputValidator: (value) => (!String(value || '').trim() ? 'Reason is required' : null),
    })
    if (!result.isConfirmed) return
    reason = String(result.value || '').trim()
  }

  reviewingProviderId.value = providerId
  try {
    await axios.post(`/business/provider-applications/${providerId}/review`, {
      action,
      reason,
    }, { skipGlobalLoading: true })
    pendingApplications.value = pendingApplications.value.filter((row) => row.id !== providerId)
    Swal.fire('Updated', `Provider application ${action}d successfully.`, 'success')
    Promise.all([fetchPendingApplications(), fetchActiveProviders()]).catch(() => {})
  } catch (error) {
    Swal.fire('Error', error?.response?.data?.message || 'Failed to review provider application.', 'error')
  } finally {
    reviewingProviderId.value = null
  }
}

const resetInventoryOrderForm = () => {
  inventoryOrder.purchase_type = 'online'
  inventoryOrder.material_name = ''
  inventoryOrder.quantity = 1
  inventoryOrder.amount = ''
  inventoryOrder.unit = 'pcs'
  inventoryOrder.purchase_link = ''
  receiptFile.value = null
}

const onReceiptSelected = (event) => {
  receiptFile.value = event?.target?.files?.[0] || null
}

const submitInventoryOrder = async () => {
  if (savingInventoryOrder.value) return
  savingInventoryOrder.value = true
  try {
    const formData = new FormData()
    formData.append('purchase_type', inventoryOrder.purchase_type)
    formData.append('material_name', inventoryOrder.material_name)
    formData.append('quantity', String(Number(inventoryOrder.quantity || 0)))
    formData.append('amount', String(Number(inventoryOrder.amount || 0)))
    formData.append('unit', inventoryOrder.unit || 'pcs')
    if (inventoryOrder.purchase_type === 'online') {
      formData.append('purchase_link', inventoryOrder.purchase_link || '')
    } else if (receiptFile.value) {
      formData.append('receipt_image', receiptFile.value)
    }

    const res = await axios.post('/business/operations/inventory-order', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipGlobalLoading: true,
    })
    resetInventoryOrderForm()
    Swal.fire('Saved', res.data?.message || 'Business purchase recorded.', 'success')
    fetchInventorySummary().catch(() => {})
  } catch (error) {
    Swal.fire('Error', error?.response?.data?.message || 'Failed to record business purchase.', 'error')
  } finally {
    savingInventoryOrder.value = false
  }
}

const loadSectionData = async (section, { includeContext = true } = {}) => {
  if (includeContext && !workspaceContextLoaded.value) {
    await fetchBusinessContext()
  }

  if (isWorkspaceLocked.value) {
    return
  }

  const tasks = []

  if (section === 'dashboard') {
    tasks.push(fetchRequests(), fetchActiveProviders(), fetchPendingApplications(), fetchInventorySummary())
  } else if (section === 'providers') {
    tasks.push(fetchActiveProviders(), fetchPendingApplications())
  } else if (section === 'operations') {
    tasks.push(fetchRequests())
  } else if (section === 'procurement' || section === 'finance') {
    tasks.push(fetchInventorySummary())
  }

  if (tasks.length) {
    await Promise.all(tasks)
  }
}

watch(
  () => activeSection.value,
  async (section) => {
    await loadSectionData(section)
  },
  { immediate: false }
)

watch(
  () => page.props?.auth?.user,
  () => {
    syncAuthUserFromPage()
  },
  { deep: true }
)

watch(
  () => page.url,
  () => {
    if (!isWorkspaceLocked.value && pageHasOpenCreateUserFlag()) {
      openCreateUserModal()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await Promise.allSettled([
    fetchOwnProfile(),
    fetchReviewNotifications(),
    fetchBusinessContext(),
  ])
  notifyBusinessReviewUpdate()
  await loadSectionData(activeSection.value, { includeContext: false })
})

const logout = async () => {
  await confirmAndLogout()
}
</script>


