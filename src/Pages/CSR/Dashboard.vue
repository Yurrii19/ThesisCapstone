<template>
  <div class="h-screen flex flex-col bg-gray-100 text-slate-900">
    <nav class="sticky top-0 z-40 flex items-center justify-between bg-white px-6 py-4 shadow-md max-sm:px-4">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-sm font-black text-white shadow-[0_14px_30px_rgba(14,165,233,0.28)]">
          CS
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">CSR Workspace</h1>
          <p class="text-xs text-gray-500">Validate requests before release to Operations</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <div class="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-right md:block">
          <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Assigned Scope</p>
          <p class="text-xs font-semibold text-slate-700">{{ scope.business_name || 'All HR-managed businesses' }}</p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="fetchDashboard"
        >
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
          @click="logout"
        >
          Logout
        </button>
      </div>
    </nav>

    <div class="flex flex-1 overflow-hidden max-lg:flex-col">
      <aside class="h-full w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-lg:h-auto max-lg:w-full max-lg:border-b max-lg:border-r-0">
        <div class="mb-6 px-3">
          <p class="text-xs uppercase tracking-wide text-gray-400">Navigation</p>
        </div>

        <ul class="space-y-2">
          <li class="px-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            CSR Journey
          </li>
          <li v-for="item in tabs" :key="item.key">
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
              :class="activeTab === item.key
                ? 'border border-cyan-200 bg-cyan-50 text-cyan-800 shadow-[0_10px_24px_rgba(34,211,238,0.14)]'
                : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-white'"
              @click="setActiveTab(item.key)"
            >
              <span
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[13px] font-black"
                :class="activeTab === item.key
                  ? 'border-cyan-500 bg-cyan-500 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600'"
              >
                {{ item.icon }}
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold leading-none">{{ item.label }}</span>
                <span class="mt-1 block text-[11px] text-inherit/70">{{ item.hint }}</span>
              </span>
            </button>
          </li>
        </ul>

        <div class="mt-8 px-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Assigned Scope</p>
            <p class="mt-2 text-sm font-semibold text-slate-900">{{ scope.business_name || 'All HR-managed businesses' }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ authUser?.email || fullName }}</p>
          </div>
        </div>

        <div class="mt-8 px-3">
          <div class="rounded-2xl border border-teal-100 bg-[linear-gradient(145deg,#ffffff_0%,#f0fdfa_100%)] p-4 shadow-sm">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                  <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M9.75 9.5a2.25 2.25 0 1 1 3.56 1.84c-.9.63-1.31 1.1-1.31 2.16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="12" cy="16.4" r=".9" fill="currentColor"/>
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-slate-800">CSR help</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">Use the interview sheet, payment rule, and request details before approving release.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto p-8 max-lg:p-4">
        <div class="mx-auto max-w-6xl space-y-4">
          <section class="overflow-hidden rounded-[26px] border border-cyan-100 bg-[linear-gradient(135deg,#ffffff_0%,#f3fcff_55%,#f8fbff_100%)] p-5 shadow-[0_18px_42px_-38px_rgba(8,145,178,0.4)]">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">{{ activeTabLabel }}</p>
                <h2 class="mt-2 max-w-4xl text-[2rem] font-black leading-tight tracking-[-0.04em] text-slate-900 sm:text-[2.4rem]">{{ activeTabTitle }}</h2>
                <p class="mt-2.5 max-w-3xl text-sm leading-7 text-slate-600">{{ activeTabDescription }}</p>
              </div>
              <div class="max-w-lg rounded-[22px] border border-cyan-200 bg-white/90 px-4 py-3.5 shadow-[0_16px_34px_-32px_rgba(8,145,178,0.45)]">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow Rule</p>
                <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">
                  CSR validates the submitted request against the intake interview details first, then endorses it to Operations. Procurement or Finance only join when materials or payment rules require a gate.
                </p>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article class="rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.28)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Pending Intake</p>
                  <p class="mt-1.5 text-[2rem] font-black leading-none text-slate-900">{{ stats.pending_intake }}</p>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">IQ</span>
              </div>
              <p class="mt-2.5 text-xs leading-5 text-slate-500">Requests waiting for CSR validation.</p>
            </article>
            <article class="rounded-[22px] border border-amber-200 bg-[linear-gradient(135deg,#fffdf5_0%,#fff7dd_100%)] p-3.5 shadow-[0_16px_30px_-30px_rgba(217,119,6,0.3)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.16em] text-amber-700">Payment Gate</p>
                  <p class="mt-1.5 text-[2rem] font-black leading-none text-amber-800">{{ stats.pending_payment_gate }}</p>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-amber-700">PG</span>
              </div>
              <p class="mt-2.5 text-xs leading-5 text-amber-700/80">Needs full-payment or downpayment confirmation.</p>
            </article>
            <article class="rounded-[22px] border border-cyan-200 bg-[linear-gradient(135deg,#f3fdff_0%,#e6fbff_100%)] p-3.5 shadow-[0_16px_30px_-30px_rgba(8,145,178,0.3)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.16em] text-cyan-700">Forwarded</p>
                  <p class="mt-1.5 text-[2rem] font-black leading-none text-cyan-800">{{ stats.forwarded_requests }}</p>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-cyan-700">OH</span>
              </div>
              <p class="mt-2.5 text-xs leading-5 text-cyan-700/80">Already endorsed by CSR to Operations.</p>
            </article>
            <article class="rounded-[22px] border border-indigo-200 bg-[linear-gradient(135deg,#f5f7ff_0%,#ecefff_100%)] p-3.5 shadow-[0_16px_30px_-30px_rgba(79,70,229,0.26)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.16em] text-indigo-700">Residential</p>
                  <p class="mt-1.5 text-[2rem] font-black leading-none text-indigo-800">{{ stats.residential }}</p>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-indigo-700">RS</span>
              </div>
              <p class="mt-2.5 text-xs leading-5 text-indigo-700/80">Home-based service requests in scope.</p>
            </article>
            <article class="rounded-[22px] border border-emerald-200 bg-[linear-gradient(135deg,#f3fff8_0%,#e9fff4_100%)] p-3.5 shadow-[0_16px_30px_-30px_rgba(5,150,105,0.28)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.16em] text-emerald-700">Commercial</p>
                  <p class="mt-1.5 text-[2rem] font-black leading-none text-emerald-800">{{ stats.commercial }}</p>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-emerald-700">CM</span>
              </div>
              <p class="mt-2.5 text-xs leading-5 text-emerald-700/80">Business or company service requests.</p>
            </article>
          </section>

          <section v-if="activeTab === 'overview'" class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Current Intake Queue</p>
                  <h3 class="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">Requests waiting on CSR</h3>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {{ intakeQueue.length }} item{{ intakeQueue.length === 1 ? '' : 's' }}
                </span>
              </div>

              <div v-if="loading" class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Loading CSR overview...
              </div>

              <div v-else-if="!intakeQueue.length" class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No new requests are waiting for CSR review.
              </div>

              <div v-else class="mt-5 space-y-3">
                <article
                  v-for="item in intakeQueue.slice(0, 3)"
                  :key="item.id"
                  class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">#{{ item.id }}</span>
                    <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{{ prettyValue(item.service_type) }}</span>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="paymentGateClass(item.payment_gate_status)">
                      {{ item.payment_gate_status }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-bold text-slate-900">{{ item.customer_name }}</h4>
                  <p class="mt-1 text-sm text-slate-500">{{ item.business_name || 'No business' }}</p>
                  <p class="mt-2 text-sm text-slate-600">{{ item.address_text || 'No address provided' }}</p>
                </article>
              </div>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Workflow Snapshot</p>
              <h3 class="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">Interview-ready flow</h3>
              <div class="mt-5 space-y-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">1. Client request is received through hotline, Messenger, or walk-in registration.</div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">2. CSR validates the client details against the intake interview, service site, urgency, and payment rule before release.</div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">3. Operations decides whether to dispatch directly or perform an inspection or on-site assessment first.</div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">4. Procurement enters only when stock is insufficient or additional materials are required.</div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">5. Finance confirms the payment gate, especially full payment or the required 30% down payment.</div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">6. Operations dispatches the team, secures completion proof, and closes the work order.</div>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'intake'" class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.28)]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Intake Queue</p>
                <h3 class="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">CSR validates the request before release</h3>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {{ intakeQueue.length }} pending
              </span>
            </div>

            <div v-if="!intakeQueue.length" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No requests are waiting in the CSR intake queue.
            </div>

            <div v-else class="mt-4 grid gap-4 xl:grid-cols-2">
              <article
                v-for="item in intakeQueue"
                :key="item.id"
                class="overflow-hidden rounded-[26px] border border-cyan-100 bg-[linear-gradient(135deg,#ffffff_0%,#f6fdff_52%,#f8fbff_100%)] p-5 shadow-[0_18px_36px_-34px_rgba(8,145,178,0.28)]"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex min-w-0 items-start gap-3.5">
                    <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-cyan-500 to-teal-500 text-xl font-black text-white shadow-[0_16px_28px_-18px_rgba(8,145,178,0.45)]">
                      {{ requestAvatarLabel(item) }}
                    </span>
                    <div class="min-w-0">
                      <h4 class="truncate text-[1.05rem] font-black tracking-[-0.02em] text-slate-900">{{ item.customer_name }}</h4>
                      <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{{ prettyValue(item.service_type) }}</p>
                    </div>
                  </div>

                  <div class="flex shrink-0 flex-col items-end gap-2">
                    <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">CSR Intake</span>
                    <span v-if="isWarrantyPriorityTicket(item)" class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      Priority Ticket
                    </span>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="paymentGateClass(item.payment_gate_status)">
                      {{ item.payment_gate_status }}
                    </span>
                  </div>
                </div>

                <p class="mt-5 text-sm leading-7 text-slate-600">
                  {{ isWarrantyPriorityTicket(item)
                    ? 'Customer filed a warranty claim within the active coverage window. Review the ticket as priority visibility for CSR and coordinate the next handoff.'
                    : 'Review the interview answers, request setup, and payment rule before forwarding this request to Operations.' }}
                </p>

                <p class="mt-3 text-sm text-slate-500">
                  {{ item.preferred_date || 'Schedule pending' }}
                </p>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Customer Setup</p>
                    <p class="mt-2 text-base font-bold text-slate-900">{{ customerSetupLabel(item.customer_type) }}</p>
                    <p class="mt-1 text-sm text-slate-500">{{ prettyValue(item.property_type, 'No category') }}<span v-if="hasMeaningfulValue(item.property_classification)"> / {{ prettyValue(item.property_classification) }}</span></p>
                  </div>
                  <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Schedule</p>
                    <p class="mt-2 text-base font-bold text-slate-900">{{ item.preferred_date || 'Not set' }}</p>
                    <p class="mt-1 text-sm text-slate-500">Truck/load: {{ prettyValue(item.truck_load_volume, 'Standard') }}</p>
                  </div>
                </div>

                <div class="mt-4 rounded-[24px] border border-cyan-100 bg-white px-4 py-4 shadow-[0_16px_28px_-28px_rgba(8,145,178,0.28)]">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Booking Status</p>
                      <p class="mt-2 text-sm leading-7 text-slate-600">Open the full intake review and compare it with the interview sheet before approval.</p>
                    </div>
                    <span class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" :class="paymentGateClass(item.payment_gate_status)">
                      {{ item.payment_gate_status }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="mt-4 w-full rounded-[18px] bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-teal-400"
                    @click="openIntakeReview(item)"
                  >
                    Review Intake
                  </button>
                </div>
              </article>
            </div>

            <div
              v-if="showIntakeReviewModal && selectedIntakeRequest"
              class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
              @click.self="closeIntakeReview"
            >
            <div class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-cyan-100 bg-white shadow-[0_28px_64px_-32px_rgba(15,23,42,0.45)]">
              <div class="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6fdff_52%,#f8fbff_100%)] px-5 py-5 sm:px-6">
                <div class="flex min-w-0 items-start gap-3.5">
                  <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-cyan-500 to-teal-500 text-xl font-black text-white shadow-[0_16px_28px_-18px_rgba(8,145,178,0.45)]">
                    {{ requestAvatarLabel(selectedIntakeRequest) }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">CSR Intake Review</p>
                    <h3 class="mt-1 text-xl font-black tracking-[-0.03em] text-slate-900 sm:text-2xl">{{ selectedIntakeRequest.customer_name }}</h3>
                    <p class="mt-1 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{{ prettyValue(selectedIntakeRequest.service_type) }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <div class="hidden flex-wrap justify-end gap-2 sm:flex">
                    <span class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">Request #{{ selectedIntakeRequest.id }}</span>
                    <span v-if="isWarrantyPriorityTicket(selectedIntakeRequest)" class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Priority Ticket</span>
                    <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{{ csrStageLabel(selectedIntakeRequest) }}</span>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="paymentGateClass(selectedIntakeRequest.payment_gate_status)">
                      {{ selectedIntakeRequest.payment_gate_status }}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Close review"
                    class="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-transparent transition hover:bg-slate-50"
                    @click="closeIntakeReview"
                  >
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Close</span>
                    ×
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div class="space-y-4">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Customer Contact</p>
                      <p class="mt-2 text-sm font-bold text-slate-900">{{ selectedIntakeRequest.customer_name }}</p>
                      <p class="mt-1 text-sm text-slate-500">{{ selectedIntakeRequest.customer_email || 'No login email on file' }}</p>
                      <p class="mt-1 text-sm text-slate-500">{{ selectedIntakeRequest.contact_number || 'No contact number' }}</p>
                    </div>

                    <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Request Setup</p>
                      <p class="mt-2 text-sm font-bold text-slate-900">{{ prettyValue(selectedIntakeRequest.service_type) }}</p>
                      <p class="mt-1 text-sm text-slate-500">Customer setup: {{ customerSetupLabel(selectedIntakeRequest.customer_type) }}</p>
                      <p class="mt-1 text-sm text-slate-500">Requested date: {{ selectedIntakeRequest.preferred_date || 'Not set' }}</p>
                      <p class="mt-1 text-sm text-slate-500">Truck/load: {{ prettyValue(selectedIntakeRequest.truck_load_volume, 'Standard') }}</p>
                    </div>
                  </div>

                  <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Interview Validation Checklist</p>
                        <p class="mt-2 text-sm leading-6 text-slate-600">Review the submitted request against the intake interview before endorsing it to Operations.</p>
                      </div>
                      <span class="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                        {{ completedChecklistCount(selectedIntakeRequest) }}/{{ intakeChecklist(selectedIntakeRequest).length }} checks complete
                      </span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <span
                        v-for="check in intakeChecklist(selectedIntakeRequest)"
                        :key="`${selectedIntakeRequest.id}-${check.label}`"
                        class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                        :class="check.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'"
                      >
                        {{ check.ok ? 'Ready:' : 'Check:' }} {{ check.label }}
                      </span>
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Service Address</p>
                      <p class="mt-2 text-sm leading-7 text-slate-700">{{ selectedIntakeRequest.address_text || 'No address provided' }}</p>
                      <p v-if="hasMeaningfulValue(selectedIntakeRequest.landmark)" class="mt-2 text-sm text-slate-500">Landmark: {{ prettyValue(selectedIntakeRequest.landmark) }}</p>
                      <p v-if="hasMeaningfulValue(selectedIntakeRequest.site_access_notes)" class="mt-1 text-sm text-slate-500">Access notes: {{ prettyValue(selectedIntakeRequest.site_access_notes) }}</p>
                      <p v-if="hasMeaningfulValue(selectedIntakeRequest.operating_hours)" class="mt-1 text-sm text-slate-500">Operating hours: {{ prettyValue(selectedIntakeRequest.operating_hours) }}</p>
                    </div>

                    <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Details</p>
                      <p class="mt-2 text-sm font-bold text-slate-900">{{ paymentTermsLabel(selectedIntakeRequest) }}</p>
                      <p class="mt-1 text-sm text-slate-500">Method: {{ prettyValue(selectedIntakeRequest.payment_method, 'Not set') }}</p>
                      <p class="mt-1 text-sm text-slate-500">Channel: {{ prettyValue(selectedIntakeRequest.payment_channel, 'Not required') }}</p>
                      <p class="mt-1 text-sm text-slate-500">Amount: {{ requestAmountLabel(selectedIntakeRequest) }}</p>
                      <p v-if="Number(selectedIntakeRequest.downpayment_amount || 0) > 0" class="mt-1 text-sm text-slate-500">Downpayment: {{ money(selectedIntakeRequest.downpayment_amount) }}</p>
                      <p v-if="Number(selectedIntakeRequest.final_amount || 0) > 0" class="mt-1 text-sm text-slate-500">Remaining balance: {{ money(selectedIntakeRequest.final_amount) }}</p>
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                    <div v-if="hasRequestSupportingDetails(selectedIntakeRequest)" class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Supporting Intake Details</p>
                      <div class="mt-3 grid gap-2 sm:grid-cols-2">
                        <p v-if="hasMeaningfulValue(selectedIntakeRequest.contract_reference)" class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Contract code:</span> {{ prettyValue(selectedIntakeRequest.contract_reference) }}</p>
                        <p v-if="hasMeaningfulValue(selectedIntakeRequest.septic_tank_condition)" class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Septic notes:</span> {{ prettyValue(selectedIntakeRequest.septic_tank_condition) }}</p>
                        <p v-if="hasMeaningfulValue(selectedIntakeRequest.notes)" class="text-sm text-slate-600 sm:col-span-2"><span class="font-semibold text-slate-800">Additional notes:</span> {{ selectedIntakeRequest.notes }}</p>
                      </div>
                    </div>

                    <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.28)]">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Request Snapshot</p>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <span class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">{{ customerSetupLabel(selectedIntakeRequest.customer_type) }}</span>
                        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{{ prettyValue(selectedIntakeRequest.property_type, 'No category') }}</span>
                        <span v-if="hasMeaningfulValue(selectedIntakeRequest.property_classification)" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{{ prettyValue(selectedIntakeRequest.property_classification) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-cyan-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7fdff_100%)] px-4 py-4 shadow-[0_18px_34px_-32px_rgba(8,145,178,0.3)]">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Final CSR Decision</p>
                    <h5 class="mt-2 text-lg font-black tracking-[-0.02em] text-slate-900">
                      {{ isWarrantyPriorityTicket(selectedIntakeRequest) ? 'Priority warranty visibility' : 'Choose the final intake decision' }}
                    </h5>
                    <p class="mt-2 text-sm leading-7 text-slate-600">
                      {{ isWarrantyPriorityTicket(selectedIntakeRequest)
                        ? 'This ticket came from a warranty claim and is surfaced back to CSR as a priority item. Use the dashboard for visibility and coordination while the warranty flow continues.'
                        : 'Approve this request when the intake interview, submitted details, and payment rule all match. Reject it only when the request cannot proceed and provide a clear reason.' }}
                    </p>

                    <div class="mt-4 grid gap-3 sm:grid-cols-3">
                      <div class="rounded-[18px] border border-slate-100 bg-white/90 px-4 py-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Gate</p>
                        <p class="mt-2 text-sm font-semibold text-slate-900">{{ selectedIntakeRequest.payment_gate_status }}</p>
                      </div>
                      <div class="rounded-[18px] border border-slate-100 bg-white/90 px-4 py-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Requested Date</p>
                        <p class="mt-2 text-sm font-semibold text-slate-900">{{ selectedIntakeRequest.preferred_date || 'Not set' }}</p>
                      </div>
                      <div class="rounded-[18px] border border-slate-100 bg-white/90 px-4 py-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Updated</p>
                        <p class="mt-2 text-sm font-semibold text-slate-900">{{ formatDateTime(selectedIntakeRequest.updated_at) }}</p>
                      </div>
                    </div>

                    <div v-if="!isWarrantyPriorityTicket(selectedIntakeRequest)" class="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="workingRequestId === selectedIntakeRequest.id"
                        @click="rejectRequest(selectedIntakeRequest)"
                      >
                        {{ workingRequestId === selectedIntakeRequest.id ? 'Processing...' : 'Reject Request' }}
                      </button>

                      <button
                        type="button"
                        class="rounded-[18px] bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="workingRequestId === selectedIntakeRequest.id"
                        @click="forwardToOperations(selectedIntakeRequest)"
                      >
                        {{ workingRequestId === selectedIntakeRequest.id ? 'Forwarding to Operations...' : 'Approve And Forward To Operations' }}
                      </button>
                    </div>

                    <p class="mt-3 text-xs leading-6 text-slate-500">
                      {{ isWarrantyPriorityTicket(selectedIntakeRequest)
                        ? 'Priority warranty tickets stay visible here so CSR can monitor and coordinate the customer follow-up.'
                        : 'Approve goes directly to Operations. Reject requires a reason and sends the request back as rejected.' }}
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'payments'" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Payment Gate</p>
                <h3 class="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">Requests blocked by payment rules</h3>
              </div>
              <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {{ paymentQueue.length }} awaiting verification
              </span>
            </div>

            <div class="mt-5 overflow-hidden rounded-3xl border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                  <tr class="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th class="px-4 py-3">Request</th>
                    <th class="px-4 py-3">Customer</th>
                    <th class="px-4 py-3">Terms</th>
                    <th class="px-4 py-3">Gate Status</th>
                    <th class="px-4 py-3">Current Stage</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-for="item in paymentQueue" :key="item.id" class="text-sm text-slate-700">
                    <td class="px-4 py-3">
                      <p class="font-semibold text-slate-900">#{{ item.id }}</p>
                      <p class="text-xs text-slate-500">{{ prettyValue(item.service_type) }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-semibold text-slate-900">{{ item.customer_name }}</p>
                      <p class="text-xs text-slate-500">{{ item.business_name || 'N/A' }}</p>
                    </td>
                    <td class="px-4 py-3">{{ prettyValue(item.payment_terms, 'Standard flow') }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" :class="paymentGateClass(item.payment_gate_status)">
                        {{ item.payment_gate_status }}
                      </span>
                    </td>
                    <td class="px-4 py-3">{{ csrStageLabel(item) }}</td>
                  </tr>
                  <tr v-if="!paymentQueue.length">
                    <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-500">
                      No requests are currently blocked by payment verification.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Forwarded Log</p>
                <h3 class="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">Recently endorsed to Operations</h3>
              </div>
              <span class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                {{ forwardedQueue.length }} recent
              </span>
            </div>

            <div class="mt-5 space-y-3">
              <article v-for="item in forwardedQueue" :key="item.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">#{{ item.id }}</span>
                      <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{{ prettyValue(item.service_type) }}</span>
                      <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{{ csrStageLabel(item) }}</span>
                    </div>
                    <p class="mt-3 text-sm font-bold text-slate-900">{{ item.customer_name }} - {{ item.business_name || 'N/A' }}</p>
                    <p class="mt-1 text-sm text-slate-500">{{ item.address_text || 'No address provided' }}</p>
                  </div>
                  <div class="text-sm text-slate-500">
                    Forwarded / updated {{ formatDateTime(item.updated_at) }}
                  </div>
                </div>
              </article>

              <div v-if="!forwardedQueue.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No forwarded CSR requests yet.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { confirmAndLogout } from '@/lib/auth-flow'
import { CSR_DASHBOARD_CACHE_KEY } from '@/lib/dashboard-prefetch'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'

const page = usePage()
const authUser = computed(() => page.props.auth?.user || null)
const cachedDashboardState = readCachedViewState(CSR_DASHBOARD_CACHE_KEY, null)
const hasCachedDashboardState = Boolean(cachedDashboardState)

const tabs = [
  { key: 'overview', label: 'Flow Overview', icon: 'FO', hint: 'CSR-first summary and department handoff' },
  { key: 'intake', label: 'CSR Intake Queue', icon: 'IQ', hint: 'Validate and endorse requests to Operations' },
  { key: 'payments', label: 'Payment Rule Gate', icon: 'PG', hint: 'Requests still blocked by policy or verification' },
  { key: 'forwarded', label: 'Operations Handoff', icon: 'OH', hint: 'Requests already endorsed by CSR' },
]

const activeTab = ref('overview')
const loading = ref(!hasCachedDashboardState)
const workingRequestId = ref(null)
const scope = ref(cachedDashboardState?.scope || {
  business_id: null,
  business_name: null,
})
const stats = ref({
  pending_intake: 0,
  pending_payment_gate: 0,
  forwarded_requests: 0,
  residential: 0,
  commercial: 0,
  ...(cachedDashboardState?.stats || {}),
})
const intakeQueue = ref(Array.isArray(cachedDashboardState?.intake_queue) ? cachedDashboardState.intake_queue : [])
const paymentQueue = ref(Array.isArray(cachedDashboardState?.payment_queue) ? cachedDashboardState.payment_queue : [])
const forwardedQueue = ref(Array.isArray(cachedDashboardState?.forwarded_queue) ? cachedDashboardState.forwarded_queue : [])
const showIntakeReviewModal = ref(false)
const selectedIntakeRequest = ref(null)

const fullName = computed(() => {
  const user = authUser.value || {}
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ').trim() || 'CSR User'
})

const activeTabMeta = computed(() => {
  const map = {
    overview: {
      label: 'CSR Flow Overview',
      title: 'Customer request validation starts here',
      description: 'CSR is the first official receiving point. This workspace compares the submitted request with the intake interview details, flags payment-rule blockers, and releases validated requests to Operations.',
    },
    intake: {
      label: 'CSR Intake Queue',
      title: 'Validate interview answers before the request leaves CSR',
      description: 'CSR checks the customer interview details, site coverage, request setup, payment rule, and completeness before handing the request to Operations.',
    },
    payments: {
      label: 'Payment Rule Gate',
      title: 'Track payment requirements before release',
      description: 'Requests stay blocked when full payment, down payment, or verification requirements are still incomplete.',
    },
    forwarded: {
      label: 'Operations Handoff',
      title: 'Monitor what CSR has already released',
      description: 'Use this log to show that requests move from CSR into Operations only after validation and intake checks are complete.',
    },
  }

  return map[activeTab.value] || map.overview
})

const activeTabLabel = computed(() => activeTabMeta.value.label)
const activeTabTitle = computed(() => activeTabMeta.value.title)
const activeTabDescription = computed(() => activeTabMeta.value.description)

function setActiveTab(key) {
  activeTab.value = key
  sessionStorage.setItem('csr-active-tab', key)
}

function openIntakeReview(item) {
  selectedIntakeRequest.value = item
  showIntakeReviewModal.value = true
}

function closeIntakeReview() {
  showIntakeReviewModal.value = false
  selectedIntakeRequest.value = null
}

function prettyValue(value, fallback = 'N/A') {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized
    ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    : fallback
}

function hasMeaningfulValue(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return false
  return normalized.toLowerCase() !== 'n/a'
}

function customerSetupLabel(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'non_contract') return 'Standard Client'
  if (normalized === 'contracted') return 'Contract Client'
  return prettyValue(value, 'Standard Client')
}

function requestAvatarLabel(item) {
  const raw = String(item?.customer_name || item?.business_name || 'RQ').trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'RQ'
}

function paymentTermsLabel(item) {
  const value = String(item?.payment_terms || '').trim().toLowerCase()
  if (value === 'full_before_service') return 'Full payment before service'
  if (value === '30_percent_down_30_days') return '30% down payment, balance within 30 days'
  const method = String(item?.payment_method || '').trim().toLowerCase()
  if (method === 'full') return 'Full payment flow'
  if (method === 'downpayment') return 'Downpayment flow'
  if (method === 'personal') return 'Physical or on-site settlement'
  return 'Standard validation flow'
}

function requestAmountLabel(item) {
  const total = Number(item?.total_amount || 0)
  const downpayment = Number(item?.downpayment_amount || 0)
  const finalAmount = Number(item?.final_amount || 0)
  if (total > 0) return money(total)
  if (downpayment > 0 && finalAmount > 0) return `${money(downpayment)} down / ${money(finalAmount)} balance`
  if (downpayment > 0) return money(downpayment)
  if (finalAmount > 0) return money(finalAmount)
  return 'To be confirmed'
}

function intakeChecklist(item) {
  return [
    { label: 'Customer identity and contact', ok: hasMeaningfulValue(item?.customer_name) && hasMeaningfulValue(item?.contact_number) },
    { label: 'Address and service site', ok: hasMeaningfulValue(item?.address_text) },
    { label: 'Request category and place type', ok: hasMeaningfulValue(item?.property_type) && hasMeaningfulValue(item?.property_classification) },
    { label: 'Payment rule matched', ok: hasMeaningfulValue(item?.payment_terms) || hasMeaningfulValue(item?.payment_method) },
    { label: 'Interview notes or access guidance', ok: hasMeaningfulValue(item?.notes) || hasMeaningfulValue(item?.site_access_notes) || hasMeaningfulValue(item?.landmark) || hasMeaningfulValue(item?.septic_tank_condition) },
  ]
}

function completedChecklistCount(item) {
  return intakeChecklist(item).filter((check) => check.ok).length
}

function hasRequestSupportingDetails(item) {
  return hasMeaningfulValue(item?.contract_reference)
    || hasMeaningfulValue(item?.operating_hours)
    || hasMeaningfulValue(item?.septic_tank_condition)
    || hasMeaningfulValue(item?.notes)
}

function money(value, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function paymentGateClass(status) {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized.includes('verified')) return 'bg-emerald-100 text-emerald-700'
  if (normalized.includes('pending')) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function csrStageLabel(item) {
  const workflowStage = String(item?.workflow_stage || '').trim().toLowerCase()
  const operationsStage = String(item?.operations_stage || '').trim().toLowerCase()
  const procurementStage = String(item?.procurement_stage || '').trim().toLowerCase()
  const pricingStage = String(item?.pricing_stage || '').trim().toLowerCase()

  if (workflowStage === 'csr_review') return 'CSR Intake Review'
  if (workflowStage === 'csr_forwarded') return 'Forwarded to Operations'
  if (procurementStage === 'pending_procurement') return 'Pending Procurement'
  if (pricingStage === 'awaiting_pricing_review') return 'Pricing Review'
  if (pricingStage === 'pricing_pending_procurement') return 'Pricing Waiting On Procurement'
  if (operationsStage === 'awaiting_operational_review') return 'Awaiting Operational Review'
  return prettyValue(workflowStage || operationsStage || procurementStage || pricingStage, 'In Workflow')
}

function isWarrantyPriorityTicket(item) {
  const status = String(item?.status || '').trim().toLowerCase()
  const workflowStage = String(item?.workflow_stage || '').trim().toLowerCase()
  const warrantyStatus = String(item?.warranty_status || '').trim().toLowerCase()
  return status === 'warranty_pending'
    || workflowStage === 'warranty_priority_ticket'
    || workflowStage === 'warranty_priority_forwarded'
    || warrantyStatus === 'claimed'
}

function applyDashboardPayload(payload = {}) {
  scope.value = payload.scope || { business_id: null, business_name: null }
  stats.value = {
    ...stats.value,
    ...(payload.stats || {}),
  }
  intakeQueue.value = Array.isArray(payload.intake_queue) ? payload.intake_queue : []
  paymentQueue.value = Array.isArray(payload.payment_queue) ? payload.payment_queue : []
  forwardedQueue.value = Array.isArray(payload.forwarded_queue) ? payload.forwarded_queue : []
}

async function fetchDashboard({ background = hasCachedDashboardState } = {}) {
  if (!background) {
    loading.value = true
  }
  try {
    const res = await axios.get('/csr/dashboard-data')
    const payload = res?.data || {}
    applyDashboardPayload(payload)
    writeCachedViewState(CSR_DASHBOARD_CACHE_KEY, payload)
  } catch {
    if (!background) {
      Swal.fire('Error', 'Failed to load CSR dashboard data.', 'error')
    }
  } finally {
    loading.value = false
  }
}

async function forwardToOperations(item) {
  const confirm = await Swal.fire({
    title: 'Approve this CSR intake and forward it?',
    text: `Request #${item.id} will leave the CSR intake queue after interview-based validation.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Approve and Forward',
  })
  if (!confirm.isConfirmed) return

  workingRequestId.value = item.id
  try {
    await axios.post(`/csr/requests/${item.id}/forward`, {}, { skipGlobalLoading: true })
    intakeQueue.value = intakeQueue.value.filter((entry) => entry.id !== item.id)
    forwardedQueue.value = [{ ...item, workflow_stage: 'csr_forwarded', csr_status: 'validated' }, ...forwardedQueue.value]
    if (selectedIntakeRequest.value?.id === item.id) {
      closeIntakeReview()
    }
    if (activeTab.value === 'intake' && !intakeQueue.value.length) {
      setActiveTab('forwarded')
    }
    Swal.fire('Approved And Forwarded', 'CSR validated the request and sent it to Operations successfully.', 'success')
    fetchDashboard().catch(() => {})
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to forward request.'
    Swal.fire('Error', message, 'error')
  } finally {
    workingRequestId.value = null
  }
}

async function rejectRequest(item) {
  const decision = await Swal.fire({
    title: 'Reject this CSR intake?',
    input: 'textarea',
    inputLabel: 'Rejection reason',
    inputPlaceholder: 'Explain why this request cannot proceed from CSR review.',
    inputAttributes: {
      maxlength: '500',
      'aria-label': 'Rejection reason',
    },
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Reject Request',
    confirmButtonColor: '#dc2626',
    preConfirm: (value) => {
      const reason = String(value || '').trim()
      if (!reason) {
        Swal.showValidationMessage('Please enter a rejection reason.')
        return false
      }

      return reason
    },
  })

  if (!decision.isConfirmed) return

  workingRequestId.value = item.id
  try {
    await axios.post(`/csr/requests/${item.id}/reject`, {
      reason: decision.value,
    }, { skipGlobalLoading: true })
    intakeQueue.value = intakeQueue.value.filter((entry) => entry.id !== item.id)
    if (selectedIntakeRequest.value?.id === item.id) {
      closeIntakeReview()
    }
    Swal.fire('Rejected', 'CSR rejected the request and saved the reason successfully.', 'success')
    fetchDashboard().catch(() => {})
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to reject request.'
    Swal.fire('Error', message, 'error')
  } finally {
    workingRequestId.value = null
  }
}

async function logout() {
  await confirmAndLogout({
    confirmText: 'Do you want to end this CSR session?',
    confirmButtonText: 'Logout',
  })
}

onMounted(() => {
  const savedTab = sessionStorage.getItem('csr-active-tab')
  if (tabs.some((item) => item.key === savedTab)) {
    activeTab.value = savedTab
  }
  fetchDashboard({ background: hasCachedDashboardState })
})
</script>
