<template>
  <div :class="props.embedded ? 'bg-slate-100 px-2 py-2 sm:px-3 sm:py-3' : 'min-h-screen bg-slate-100 px-4 py-6 sm:px-6'">
    <div :class="props.embedded ? 'w-full max-w-[860px] mx-auto' : 'mx-auto w-full max-w-4xl'">
      <div v-if="!props.embedded" class="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="goBack"
        >
          Back
        </button>
        <p class="text-xs text-slate-500">Service Request Form</p>
      </div>

      <section :class="props.embedded ? 'rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4' : 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'">
        <div v-if="activeFormStep === 1" :class="props.embedded ? 'mb-3 flex items-start gap-2' : 'mb-5 flex items-start gap-3'">
          <div :class="props.embedded ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold' : 'flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 font-bold'">!</div>
          <div class="min-w-0 flex-1">
            <h1 :class="props.embedded ? 'text-2xl font-black tracking-tight text-slate-900 leading-tight' : 'text-4xl font-black tracking-tight text-slate-900'">Service Request Submission</h1>
            <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-500'">
              Selected business: <span class="font-semibold text-slate-700">{{ businessLabel }}</span>.
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {{ companyCategoryLabel }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="!hasBusinessId" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          This service option is not linked to a company yet. Please go back and choose another team.
        </div>

        <form v-else class="space-y-5" @submit.prevent="submitRequest">
          <div
            class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60"
            role="dialog"
            aria-labelledby="service-request-wizard-title"
          >
            <div class="flex flex-col overflow-hidden">
                <div class="flex items-start justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef8ff_100%)] px-4 pb-4 pt-4 sm:px-5 sm:pb-4 sm:pt-4.5">
                  <div class="flex min-w-0 items-start gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#dbeafe_0%,#bfdbfe_100%)] text-[1.05rem] font-black text-sky-700 shadow-sm shadow-sky-100">!</div>
                    <div class="min-w-0">
                      <h2 id="service-request-wizard-title" class="text-[1.35rem] font-extrabold leading-[1.1] text-slate-900 sm:text-[1.55rem]">{{ currentFormStepItem.title }}</h2>
                      <p class="mt-1 text-[0.88rem] leading-6 text-slate-600">Complete the request one stage at a time with the required details, address, route preview, and final review.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-[1.5rem] leading-none text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="submitting"
                    aria-label="Close wizard"
                    @click="closeWizardModal"
                  >
                    &times;
                  </button>
                </div>

                <div ref="wizardScrollHost" class="bg-[linear-gradient(180deg,rgba(244,247,255,0.98)_0%,rgba(234,241,252,0.98)_100%)] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                  <div class="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(244,247,255,0.98)_0%,rgba(234,241,252,0.98)_100%)] px-4 pb-3 pt-1 shadow-[0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur sm:-mx-5 sm:px-5">
                  <div class="mx-auto mb-3 flex w-full max-w-[820px] items-center justify-between gap-3">
                    <div>
                      <p class="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Request Progress</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900">{{ currentFormStepItem.title }}</p>
                    </div>
                    <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.74rem] font-semibold text-slate-600 shadow-sm shadow-slate-100">
                      Step {{ activeFormStep }} of {{ formStepItems.length }}
                    </span>
                  </div>
                  <div class="mx-auto flex w-full max-w-[820px] items-center gap-2 rounded-[22px] border border-[rgba(148,163,184,0.16)] bg-white/95 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div class="flex flex-1 items-center gap-2">
              <template v-for="item in formStepItems" :key="item.id">
                <button
                  type="button"
                  :class="stepCircleClass(item)"
                  @click="setActiveFormStep(item.id)"
                >
                  <svg
                    v-if="item.status === 'Ready' && hasVisitedStep(item.id) && activeFormStep !== item.id"
                    viewBox="0 0 20 20"
                    fill="none"
                    class="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 10.5 8.2 13.7 15 7"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span v-else>{{ item.id }}</span>
                </button>
                <div
                  v-if="item.id < formStepItems.length"
                  :class="stepConnectorClass(item.id)"
                  class="relative h-[3px] min-w-[12px] flex-1 overflow-hidden rounded-full after:absolute after:inset-0 after:origin-left after:rounded-full after:transition-transform after:duration-300 max-sm:h-[2px]"
                ></div>
              </template>
            </div>
          </div>
                  </div>

          <div ref="wizardSectionsHost" class="mx-auto mt-3 grid w-full max-w-[820px] grid-cols-1 gap-3.5 sm:grid-cols-2">
            <section v-show="activeFormStep === 1" data-form-step="1" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' : 'sm:col-span-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60'">
              <div class="mb-5">
                <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'">Service Information</p>
                <h2 :class="props.embedded ? 'mt-1 text-lg font-bold tracking-tight text-slate-900' : 'mt-1 text-xl font-bold tracking-tight text-slate-900'">Request Classification</h2>
                <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-600'">Provide the service and site details.</p>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="sm:col-span-2 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-sm shadow-slate-100/70">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Request Category</p>
                    <span class="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                      Required
                    </span>
                  </div>
                  <p class="mt-2 text-base font-bold text-slate-900">Select service category</p>
                  <p class="mt-1 text-sm text-slate-600">Choose Residential or Commercial first. The payment rule will be applied automatically from the interview flow.</p>
                  <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      :class="requestCategoryClass('residential')"
                      @click="form.property_type = 'residential'"
                    >
                      <span class="block text-sm font-semibold">Residential</span>
                      <span class="mt-1 block text-[11px] text-inherit/80">Full payment is required before service release</span>
                    </button>
                    <button
                      type="button"
                      :class="requestCategoryClass('commercial')"
                      @click="form.property_type = 'commercial'"
                    >
                      <span class="block text-sm font-semibold">Commercial</span>
                      <span class="mt-1 block text-[11px] text-inherit/80">Automatically assigned to full payment or 30% down payment</span>
                    </button>
                  </div>
                  <p v-if="!requestCategorySelected" class="mt-3 text-xs font-semibold text-rose-600">
                    Select one category first before continuing.
                  </p>
                </div>

                <div class="sm:col-span-2">
                  <label :class="labelClass">Service Type</label>
                  <template v-if="isCompanyHrManaged">
                    <input value="Siphoning" disabled readonly type="text" :class="controlDisabledClass" />
                    <p class="mt-1 text-[11px] text-slate-500">BP Waterworks accepts septic tank siphoning requests only in the company workflow.</p>
                  </template>
                  <template v-else-if="serviceSelectionRequired">
                    <select
                      v-model="form.service_type"
                      :class="controlClass"
                    >
                      <option value="">Select Service</option>
                      <option v-for="option in availableServiceOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                    <p class="mt-1 text-[11px] text-slate-500">Choose the exact service because this company accepts multiple service types.</p>
                  </template>
                  <template v-else>
                    <input :value="form.service_type || serviceAutoLabel" disabled readonly type="text" :class="controlDisabledClass" />
                    <p class="mt-1 text-[11px] text-slate-500">Service type is automatically set from the selected company offering.</p>
                  </template>
                </div>

                <div v-if="isCompanyHrManaged" :class="isSiphoningService ? 'sm:col-span-2 grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr,0.9fr]' : 'sm:col-span-2'">
                  <section class="rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf7_100%)] p-3.5 shadow-sm shadow-emerald-100/70">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <label :class="labelClass">Customer Setup</label>
                        <p class="mt-1 text-[0.95rem] font-semibold text-slate-900">Pick the client arrangement for this request.</p>
                      </div>
                      <span class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        Default Ready
                      </span>
                    </div>

                    <div class="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        :class="clientTypeClass('non_contract')"
                        @click="form.customer_type = 'non_contract'"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/85 text-emerald-700 shadow-sm shadow-emerald-100">
                            <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                              <path d="M10 3.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm-7 13a7.8 7.8 0 0 1 14 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </div>
                          <span class="rounded-full border border-current/15 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-inherit/80">
                            Recommended
                          </span>
                        </div>
                        <div class="mt-3">
                          <span class="block text-[1.05rem] font-bold">Standard Client</span>
                          <span class="mt-1.5 block text-[12px] leading-6 text-inherit/85">Use this for regular customers with no contract or account code.</span>
                        </div>
                        <span v-if="form.customer_type === 'non_contract'" class="mt-3 inline-flex w-fit rounded-full border border-emerald-200 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Selected
                        </span>
                      </button>

                      <button
                        type="button"
                        :class="clientTypeClass('contracted')"
                        @click="form.customer_type = 'contracted'"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/85 text-cyan-700 shadow-sm shadow-cyan-100">
                            <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                              <path d="M6 5.5h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 14 16.5H6A1.5 1.5 0 0 1 4.5 15V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" stroke-width="1.8" />
                              <path d="M7.5 4.5h5M7.5 9.5h5M7.5 12.5h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                          </div>
                          <span class="rounded-full border border-current/15 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-inherit/80">
                            Special Case
                          </span>
                        </div>
                        <div class="mt-3">
                          <span class="block text-[1.05rem] font-bold">Contract Client</span>
                          <span class="mt-1.5 block text-[12px] leading-6 text-inherit/85">Use this only if the customer gave a real contract or account code.</span>
                        </div>
                        <span v-if="form.customer_type === 'contracted'" class="mt-3 inline-flex w-fit rounded-full border border-sky-200 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                          Selected
                        </span>
                      </button>
                    </div>

                    <div class="mt-2.5 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2.5 text-[11.5px] leading-6 text-slate-600 shadow-sm shadow-emerald-100/50">
                      <span class="font-semibold text-slate-900">Quick guide:</span>
                      Choose <span class="font-semibold text-emerald-700">Standard Client</span> by default. Pick <span class="font-semibold text-sky-700">Contract Client</span> only when the customer has an actual BP Waterworks contract or account code.
                    </div>
                  </section>

                  <section v-if="isSiphoningService" class="rounded-[24px] border border-sky-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3faff_100%)] p-3.5 shadow-sm shadow-sky-100/70">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <label :class="labelClass">{{ propertyClassificationLabel }}</label>
                        <p class="mt-1 text-[0.95rem] font-semibold text-slate-900">Choose the exact kind of service site.</p>
                      </div>
                      <span class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Site Detail
                      </span>
                    </div>

                    <select v-model="form.property_classification" :class="`${controlClass} mt-2.5`">
                      <option value="">{{ propertyClassificationPlaceholder }}</option>
                      <option v-for="option in propertyClassificationOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>

                    <div class="mt-2.5 rounded-2xl border border-sky-100 bg-white/80 px-3 py-2.5 shadow-sm shadow-sky-100/50">
                      <p class="text-[11.5px] leading-6 text-slate-600">{{ propertyClassificationHelpText }}</p>
                      <div v-if="propertyClassificationOptions.length" class="mt-2.5 flex flex-wrap gap-1.5">
                        <span
                          v-for="option in propertyClassificationOptions"
                          :key="`classification-pill-${option.value}`"
                          class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-medium text-slate-600"
                        >
                          {{ option.label }}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>

                <div v-if="isSiphoningService" class="sm:col-span-2">
                  <label :class="labelClass">Septic Tank Notes</label>
                  <textarea
                    v-model.trim="form.septic_tank_condition"
                    rows="2"
                    placeholder="Add any septic tank details, overflow note, odor concern, or access reminder."
                    :class="controlClass"
                  ></textarea>
                  <p class="mt-1 text-[11px] text-slate-500">Optional: add a short note about the septic tank status or access situation.</p>
                </div>

                <div v-if="showSepticProofPhotos" class="sm:col-span-2">
                  <label :class="labelClass">Septic Condition Photos</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    :class="controlClass"
                    @change="handleSepticPhotoSelection"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">Optional: upload up to 5 photos showing the current septic tank condition.</p>
                  <div v-if="selectedSepticPhotoNames.length" class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="name in selectedSepticPhotoNames"
                      :key="name"
                      class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {{ name }}
                    </span>
                  </div>
                </div>

                <div v-if="showContractReference">
                  <label :class="labelClass">Contract or Account Code</label>
                  <input
                    v-model.trim="form.contract_reference"
                    type="text"
                    placeholder="Enter the contract number or account code only if provided"
                    :class="controlClass"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">Leave this blank unless the customer gave you a confirmed contract number or account code.</p>
                </div>

                <div v-if="isCommercialProperty" class="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-[24px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm shadow-amber-100/60">
                  <div>
                    <label :class="labelClass">Company Name</label>
                    <input
                      v-model.trim="form.client_company_name"
                      type="text"
                      placeholder="Enter the commercial client company name"
                      :class="controlClass"
                    />
                  </div>
                  <div>
                    <label :class="labelClass">Purchase Order Number</label>
                    <input
                      v-model.trim="form.purchase_order_number"
                      type="text"
                      placeholder="Enter the PO number"
                      :class="controlClass"
                    />
                  </div>
                  <p class="sm:col-span-2 text-[11px] leading-6 text-amber-800">
                    Commercial requests need the client company name and purchase order number before the schedule can be confirmed.
                  </p>
                </div>

                <div v-if="showOperatingHours">
                  <label :class="labelClass">Operating Hours</label>
                  <input
                    v-model.trim="form.operating_hours"
                    type="text"
                    placeholder="Ex. 8:00 AM - 5:00 PM"
                    :class="controlClass"
                  />
                </div>

                <div v-if="showSiteAccessNotes" class="sm:col-span-2">
                  <label :class="labelClass">{{ siteAccessLabel }}</label>
                  <textarea
                    v-model.trim="form.site_access_notes"
                    rows="2"
                    :placeholder="siteAccessPlaceholder"
                    :class="controlClass"
                  ></textarea>
                </div>
                <div class="sm:col-span-2 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    class="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                    :class="stepAdvanceButtonClass(classificationStepReady)"
                    @click="proceedFromClassificationStep"
                  >
                    Continue to Schedule
                  </button>
                </div>
              </div>
            </section>

            <div v-if="isCompanyHrManaged && activeFormStep === 1" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900' : 'sm:col-span-2 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-4 text-sm text-sky-900 shadow-sm shadow-sky-100/80'">
              <div :class="props.embedded ? 'space-y-2' : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'">
                <div>
                  <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700'">Request Review Process</p>
                  <p :class="props.embedded ? 'mt-1 text-xs leading-5 text-sky-950' : 'mt-2 text-sm leading-6 text-sky-950'">
                    Requests undergo initial CSR review before scheduling, operational coordination, and payment confirmation.
                  </p>
                </div>
                <span v-if="!props.embedded" class="inline-flex rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-sky-700">
                  Initial Review
                </span>
              </div>
            </div>

            <section v-show="activeFormStep === 2" data-form-step="2" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' : 'sm:col-span-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60'">
              <div class="mb-5">
                <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'">Scheduling And Payment</p>
                <h2 :class="props.embedded ? 'mt-1 text-lg font-bold tracking-tight text-slate-900' : 'mt-1 text-xl font-bold tracking-tight text-slate-900'">Schedule Details</h2>
                <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-600'">Set the preferred service schedule and payment terms.</p>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="sm:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-sky-50/60 px-4 py-4 shadow-sm shadow-slate-100/80">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Applied Request Rule</p>
                      <p class="mt-2 text-sm font-semibold text-slate-900">{{ paymentRuleSummaryTitle }}</p>
                      <p class="mt-1 text-[11px] leading-5 text-slate-500">{{ paymentRuleSummaryText }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-if="form.property_type"
                        class="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold text-sky-700"
                      >
                        {{ form.property_type === 'residential' ? 'Residential' : 'Commercial' }}
                      </span>
                      <span :class="paymentRuleBadgeClass" class="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                        {{ paymentRuleBadgeText }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Next Action</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{{ paymentNextStepTitle }}</p>
                    <p class="mt-1 text-[11px] leading-5 text-slate-500">{{ paymentNextStepText }}</p>
                  </div>
                </div>

                <div class="sm:col-span-2 rounded-2xl border border-cyan-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fbff_100%)] px-4 py-4 shadow-sm shadow-cyan-100/70">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Service Window</p>
                      <p class="mt-2 text-sm font-semibold text-slate-900">{{ serviceDurationLabel }} default service time</p>
                      <p class="mt-1 text-[11px] leading-5 text-slate-500">
                        Every booking keeps a 1-hour travel buffer after the service window so the next truck can safely move.
                      </p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <span class="inline-flex rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-semibold text-cyan-700">
                        {{ nextAvailableSlot ? `Next open slot: ${nextAvailableSlot}` : 'No open slot yet' }}
                      </span>
                      <span class="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        {{ emergencyStatusLabel }}
                      </span>
                    </div>
                  </div>
                  <p class="mt-3 text-[11px] leading-5 text-slate-500">
                    {{ form.service_time ? `Selected service ends around ${serviceWindowEndPreview} and clears the buffer by ${serviceWindowBufferPreview}.` : 'Choose a service time to see the end time and buffer preview.' }}
                  </p>
                </div>

                <div>
                  <label :class="labelClass">Preferred Date</label>
                  <input v-model="form.preferred_date" :min="minDate" :max="maxDate" type="date" :class="controlClass" />
                </div>
                <div v-if="requiresCommercialTruckloads">
                  <label :class="labelClass">Estimated Truckloads</label>
                  <input
                    v-model.number="form.estimated_truckloads"
                    min="1"
                    max="100"
                    step="1"
                    type="number"
                    :class="controlClass"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{ estimatedTruckloadHelpText }}
                  </p>
                </div>
                <div>
                  <label :class="labelClass">Payment Terms</label>
                  <input
                    :value="paymentSelectionLocked ? (truckloadSelectionPending ? 'Enter estimated truckloads first' : 'Select request category first') : paymentMethodLabel"
                    disabled
                    readonly
                    type="text"
                    :class="controlDisabledClass"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{
                      paymentSelectionLocked
                        ? truckloadSelectionPending
                          ? 'Truckloads decide between Full Payment and the 30% Down Payment rule. After that, choose your payment channel below.'
                          : 'Select Residential or Commercial first.'
                        : requiresLargeLoadDownpayment
                        ? '30% down payment is required for 10 or more truckloads.'
                        : requiresCommercialFullPayment
                          ? 'Full payment is required before service scheduling.'
                          : isResidentialProperty
                            ? 'Residential requests follow the truckload-based payment policy before service release.'
                            : 'Payment terms are based on company policy.'
                    }}
                  </p>
                </div>

                <div>
                  <label :class="labelClass">Service Time</label>
                  <select v-model="form.service_time" :class="controlClass">
                    <option value="">Select Available Time</option>
                    <option v-for="slot in timeSlots" :key="slot" :value="slot" :disabled="isSlotBlocked(slot)">
                      {{ slot }}{{ isSlotBlocked(slot) ? ' (Disabled)' : '' }}
                    </option>
                  </select>
                  <p v-if="blockedTimesLoading" class="mt-1 text-xs text-slate-500">Checking availability...</p>
                  <p v-else-if="blockedTimes.length" class="mt-1 text-xs text-rose-600">Some time slots are already booked or capped by fleet capacity.</p>
                  <p v-if="form.preferred_date && nextAvailableSlot" class="mt-1 text-xs text-slate-500">Next available slot for this date: {{ nextAvailableSlot }}.</p>
                </div>

                <div class="sm:col-span-2 rounded-2xl border border-rose-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-4 py-4 shadow-sm shadow-rose-100/60">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Emergency / Urgent</p>
                      <p class="mt-2 text-sm font-semibold text-slate-900">Enable the emergency booking flow</p>
                      <p class="mt-1 text-[11px] leading-5 text-slate-500">
                        This is only available when your saved location is within 15 km of the business. It adds a 20% surcharge and limits the response window to 2 hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      :class="isEmergencyRequested ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                      :disabled="!emergencyToggleAvailable"
                      @click="form.is_emergency = !form.is_emergency"
                    >
                      <span class="inline-flex h-3.5 w-3.5 rounded-full" :class="isEmergencyRequested ? 'bg-white' : 'bg-rose-400'"></span>
                      {{ isEmergencyRequested ? 'Emergency ON' : 'Emergency OFF' }}
                    </button>
                  </div>
                  <p class="mt-3 text-[11px] leading-5" :class="emergencyToggleAvailable ? 'text-slate-500' : 'text-rose-700'">
                    {{
                      emergencyToggleAvailable
                        ? 'Geofence verified. You can turn on emergency mode for this request.'
                        : 'Emergency mode is disabled until the selected address is within the 15 km radius.'
                    }}
                  </p>
                </div>

                <div v-if="!isEmergencyRequested">
                  <label :class="labelClass">Urgency</label>
                  <select v-model="form.pricing_urgency" :class="controlClass">
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <p class="mt-1 text-[11px] text-slate-500">Mark urgent only if the request needs faster review and scheduling.</p>
                </div>

                <div v-else class="sm:col-span-2 rounded-2xl border border-rose-200 bg-white px-4 py-4 shadow-sm shadow-rose-100/40">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Urgency Locked</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">Emergency bookings are automatically treated as urgent.</p>
                  <p class="mt-1 text-[11px] leading-5 text-slate-500">The regular urgency selector is locked while emergency mode is active.</p>
                </div>

                <div v-if="isEmergencyRequested" class="sm:col-span-2">
                  <label :class="labelClass">Emergency Photo / Video Proof</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.m4v,.avi,image/jpeg,image/png,image/webp,video/*"
                    multiple
                    :class="controlClass"
                    @change="handleEmergencyProofSelection"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">Required: upload at least one photo or video so the emergency request can be verified.</p>
                  <div v-if="selectedEmergencyProofNames.length" class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="name in selectedEmergencyProofNames"
                      :key="name"
                      class="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-700"
                    >
                      {{ name }}
                    </span>
                  </div>
                </div>

                <div v-if="showUrgencyPhotos" class="sm:col-span-2">
                  <label :class="labelClass">Urgent Proof Photos</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    :class="controlClass"
                    @change="handleUrgencyPhotoSelection"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">Upload up to 5 photos for urgent review.</p>
                  <div v-if="selectedUrgencyPhotoNames.length" class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="name in selectedUrgencyPhotoNames"
                      :key="name"
                      class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {{ name }}
                    </span>
                  </div>
                </div>

                <div v-if="requiresCompanyChannel">
                  <label :class="labelClass">Payment Channel</label>
                  <select
                    v-model="form.payment_channel"
                    :disabled="paymentSelectionLocked"
                    :class="paymentSelectionLocked ? controlDisabledClass : controlClass"
                  >
                    <option value="">Select Channel</option>
                    <option v-for="item in paymentChannelOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                  <p class="mt-1 text-[11px] text-slate-500">Choose whether you will settle through a physical payment arrangement or an online payment channel.</p>
                </div>

                <div v-if="isCompanyHrManaged && isSiphoningService" class="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs leading-6 text-emerald-900 shadow-sm shadow-emerald-100/80">
                  <span class="font-semibold text-emerald-800">Estimated Base Price:</span>
                  {{ estimatedAmountText }}
                </div>

                <div v-if="isDownpaymentSelected" class="sm:col-span-2">
                  <label :class="labelClass">Required Down Payment (PHP)</label>
                  <input
                    v-model.number="form.downpayment_amount"
                    min="1"
                    :max="form.total_amount || 9999"
                    step="0.01"
                    type="number"
                    :class="controlClass"
                  />
                  <p class="mt-1 text-[11px] text-slate-500">
                    Remaining balance: PHP {{ remainingBalance.toFixed(2) }}
                  </p>
                </div>
                <div class="sm:col-span-2 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    class="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    @click="goToPrevFormStep"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                    :class="stepAdvanceButtonClass(scheduleStepReady)"
                    @click="proceedFromScheduleStep"
                  >
                    Continue to Address
                  </button>
                </div>
              </div>
            </section>

            <section v-show="activeFormStep === 3" data-form-step="3" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' : 'sm:col-span-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60'">
              <div class="mb-5">
                <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'">Location Information</p>
                <h2 :class="props.embedded ? 'mt-1 text-lg font-bold tracking-tight text-slate-900' : 'mt-1 text-xl font-bold tracking-tight text-slate-900'">Service Location Details</h2>
                <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-600'">Enter the complete service address in Cavite.</p>
              </div>

              <div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label :class="labelClass">House No. / Street</label>
                    <input v-model.trim="form.house_street" type="text" placeholder="House No., Street, Subdivision, or nearby landmark" :class="controlClass" />
                  </div>
                  <div class="sm:col-span-2">
                    <label :class="labelClass">Landmark</label>
                    <input v-model.trim="form.landmark" type="text" placeholder="Nearest landmark, gate color, corner store, or access note" :class="controlClass" />
                  </div>
                  <div>
                    <label :class="labelClass">Service City In Cavite</label>
                    <select v-model="form.city" :class="controlClass">
                      <option value="">Select City</option>
                      <option v-for="item in serviceAreaLgus" :key="item.code" :value="item.name">{{ item.name }}</option>
                    </select>
                    <p class="mt-1 text-xs text-slate-500">Choose the city or municipality in Cavite where the service site is located.</p>
                  </div>
                  <div>
                    <label :class="labelClass">Barangay</label>
                    <select v-model="form.barangay" :disabled="!barangayOptions.length" :class="controlClass">
                      <option value="">Select Barangay</option>
                      <option v-for="name in barangayOptions" :key="name" :value="name">{{ name }}</option>
                    </select>
                    <p v-if="barangayLoading" class="mt-1 text-xs text-slate-500">Loading all barangays...</p>
                    <p v-else-if="form.city && !barangayOptions.length" class="mt-1 text-xs text-amber-600">No barangay data found for selected city.</p>
                  </div>

                  <div>
                    <label :class="labelClass">Contact Number</label>
                    <input
                      v-model.trim="form.contact_number"
                      type="tel"
                      inputmode="numeric"
                      placeholder="Enter your contact number"
                      :class="controlClass"
                    />
                    <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <p>Contact on file for request updates.</p>
                      <a
                        v-if="!props.embedded"
                        href="/profile"
                        class="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                      >
                        Edit Profile
                      </a>
                    </div>
                  </div>
                  <div>
                    <label :class="labelClass">ZIP Code</label>
                    <input :value="form.zip_code" disabled type="text" :class="controlDisabledClass" />
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    class="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    @click="goToPrevFormStep"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                    :class="stepAdvanceButtonClass(addressStepReady)"
                    @click="proceedFromAddressStep"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            </section>

            <section v-show="activeFormStep === 4" data-form-step="4" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' : 'sm:col-span-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60'">
              <div class="mb-5">
                <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'">Location Preview</p>
                <h2 :class="props.embedded ? 'mt-1 text-lg font-bold tracking-tight text-slate-900' : 'mt-1 text-xl font-bold tracking-tight text-slate-900'">Check Route Preview</h2>
                <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-600'">Review the route preview and any final notes before moving to the last review step.</p>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label :class="labelClass">Notes (Optional)</label>
                  <textarea v-model.trim="form.notes" :rows="props.embedded ? 3 : 4" placeholder="Describe the issue, exact spot, landmarks, or any special instructions." :class="controlClass"></textarea>
                </div>

                <div :class="props.embedded ? 'rounded-2xl border border-cyan-200 bg-cyan-50/60 p-3' : 'rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm shadow-cyan-100/80'">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Location Preview</p>
                      <p class="mt-2 text-sm font-semibold text-slate-800">{{ geoStatusTitle }}</p>
                      <p class="mt-1 text-xs leading-6 text-cyan-950">{{ geoStatusShortText }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <a
                        v-if="userLocationLink"
                        :href="userLocationLink"
                        target="_blank"
                        rel="noopener"
                        class="rounded-full border border-cyan-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                      >
                        Open My Location
                      </a>
                      <a
                        v-if="businessLocationLink"
                        :href="businessLocationLink"
                        target="_blank"
                        rel="noopener"
                        class="rounded-full border border-cyan-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                      >
                        Open Company Location
                      </a>
                    </div>
                  </div>
                  <p :class="props.embedded ? 'mt-2 text-[11px] leading-5 text-slate-600' : 'mt-3 text-xs leading-6 text-slate-600'">{{ geoPreviewNote }}</p>
                  <div
                    v-if="canShowGeoMap"
                    ref="finalGeoMapHost"
                    :class="props.embedded ? 'mt-3 h-40 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-inner' : 'mt-3 h-56 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-inner'"
                  ></div>
                  <p v-else class="mt-3 rounded-2xl border border-dashed border-cyan-200 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-600">
                    Map preview is unavailable because the selected company does not yet have a usable saved map location.
                  </p>
                </div>

                <div class="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    class="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    @click="goToPrevFormStep"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    @click="proceedFromPreviewStep"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            </section>

            <section v-show="activeFormStep === 5" data-form-step="5" :class="props.embedded ? 'sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' : 'sm:col-span-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60'">
              <div class="mb-5">
                <p :class="props.embedded ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500' : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'">Final Review</p>
                <h2 :class="props.embedded ? 'mt-1 text-lg font-bold tracking-tight text-slate-900' : 'mt-1 text-xl font-bold tracking-tight text-slate-900'">Review And Submit</h2>
                <p :class="props.embedded ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-600'">Review your details one last time, then submit the request.</p>
              </div>

              <div class="flex flex-col gap-4">
                <div class="min-w-0">
                  <p :class="props.embedded ? 'mt-1 text-base font-bold text-slate-900' : 'mt-2 text-lg font-bold text-slate-900'">Review the details below</p>
                  <p :class="props.embedded ? 'mt-1 max-w-xl text-xs leading-5 text-slate-500' : 'mt-2 max-w-xl text-sm leading-6 text-slate-600'">
                    {{ submitReminderText }}
                  </p>
                </div>

                <div class="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-sm shadow-slate-100/80 sm:px-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Submission Review</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900">Confirm the request details before final submission.</p>
                      <p class="mt-1 text-xs leading-5 text-slate-500">Review each section below. Use the pencil icon to jump back to the exact step if you need to update any detail.</p>
                    </div>
                    <span class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      Final check
                    </span>
                  </div>
                </div>

                <div class="space-y-4">
                  <article class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-100/70 sm:px-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Step 1</p>
                        <h3 class="mt-1 text-base font-bold text-slate-900">Service Details</h3>
                      </div>
                      <span class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">Editable request details</span>
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <div v-for="item in serviceReviewEntries" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <p class="w-full shrink-0 text-[12px] font-semibold leading-5 text-slate-700 sm:w-[148px]">{{ item.label }}</p>
                          <div class="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner shadow-slate-100/80" :class="item.placeholder ? 'italic text-slate-400' : 'text-slate-900'">
                            {{ item.value }}
                          </div>
                          <button
                            v-if="item.editStep"
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-100 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                            :aria-label="`Edit ${item.label}`"
                            @click="setActiveFormStep(item.editStep)"
                          >
                            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                              <path d="M13.9 3.6a1.75 1.75 0 0 1 2.48 2.48L8 14.46l-3.22.74.74-3.22L13.9 3.6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                              <path d="M12.5 5 15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>

                  <article class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-100/70 sm:px-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Step 2</p>
                        <h3 class="mt-1 text-base font-bold text-slate-900">Schedule And Payment</h3>
                      </div>
                      <span class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">Scheduling summary</span>
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <div v-for="item in scheduleReviewEntries" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <p class="w-full shrink-0 text-[12px] font-semibold leading-5 text-slate-700 sm:w-[148px]">{{ item.label }}</p>
                          <div class="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner shadow-slate-100/80" :class="item.placeholder ? 'italic text-slate-400' : 'text-slate-900'">
                            {{ item.value }}
                          </div>
                          <button
                            v-if="item.editStep"
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-100 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                            :aria-label="`Edit ${item.label}`"
                            @click="setActiveFormStep(item.editStep)"
                          >
                            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                              <path d="M13.9 3.6a1.75 1.75 0 0 1 2.48 2.48L8 14.46l-3.22.74.74-3.22L13.9 3.6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                              <path d="M12.5 5 15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>

                  <article class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-100/70 sm:px-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Step 3</p>
                        <h3 class="mt-1 text-base font-bold text-slate-900">Location And Contact</h3>
                      </div>
                      <span class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">Address summary</span>
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div v-for="item in locationReviewEntries" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <p class="w-full shrink-0 text-[12px] font-semibold leading-5 text-slate-700 sm:w-[148px]">{{ item.label }}</p>
                            <div class="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner shadow-slate-100/80" :class="item.placeholder ? 'italic text-slate-400' : 'text-slate-900'">
                              {{ item.value }}
                            </div>
                            <button
                              v-if="item.editStep"
                              type="button"
                              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-100 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                              :aria-label="`Edit ${item.label}`"
                              @click="setActiveFormStep(item.editStep)"
                            >
                              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                                <path d="M13.9 3.6a1.75 1.75 0 0 1 2.48 2.48L8 14.46l-3.22.74.74-3.22L13.9 3.6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                <path d="M12.5 5 15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                    </div>
                  </article>

                  <article class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-100/70 sm:px-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Step 4</p>
                        <h3 class="mt-1 text-base font-bold text-slate-900">Attachments And Notes</h3>
                      </div>
                      <span class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">Final optional details</span>
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <div v-for="item in attachmentReviewEntries" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <p class="w-full shrink-0 text-[12px] font-semibold leading-5 text-slate-700 sm:w-[148px]">{{ item.label }}</p>
                          <div class="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner shadow-slate-100/80" :class="item.placeholder ? 'italic text-slate-400' : 'text-slate-900'">
                            {{ item.value }}
                          </div>
                          <button
                            v-if="item.editStep"
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-100 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                            :aria-label="`Edit ${item.label}`"
                            @click="setActiveFormStep(item.editStep)"
                          >
                            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                              <path d="M13.9 3.6a1.75 1.75 0 0 1 2.48 2.48L8 14.46l-3.22.74.74-3.22L13.9 3.6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                              <path d="M12.5 5 15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>

                  <article class="rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white px-4 py-4 shadow-sm shadow-cyan-100/80 sm:px-5">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Location Map</p>
                        <h3 class="mt-1 text-base font-bold text-slate-900">{{ geoStatusTitle }}</h3>
                        <p class="mt-1 text-sm leading-6 text-slate-600">{{ geoStatusShortText }}</p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <a
                          v-if="userLocationLink"
                          :href="userLocationLink"
                          target="_blank"
                          rel="noopener"
                          class="rounded-full border border-cyan-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                        >
                          My Location
                        </a>
                        <a
                          v-if="businessLocationLink"
                          :href="businessLocationLink"
                          target="_blank"
                          rel="noopener"
                          class="rounded-full border border-cyan-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                        >
                          Business Location
                        </a>
                      </div>
                    </div>
                    <p class="mt-3 text-xs leading-6 text-slate-600">{{ geoPreviewNote }}</p>
                    <div
                      v-if="canShowGeoMap"
                      ref="reviewGeoMapHost"
                      class="mt-3 h-72 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-inner"
                    ></div>
                    <p v-else class="mt-3 rounded-2xl border border-dashed border-cyan-200 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-600">
                      Map preview is unavailable because the selected company does not yet have a usable saved map location.
                    </p>
                  </article>
                </div>

                <div class="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    class="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    @click="goToPrevFormStep"
                  >
                    Previous
                  </button>
                  <div class="flex items-center gap-2">
                    <button
                      :disabled="submitting || !bookingReadyToConfirm"
                      type="submit"
                      class="min-w-[180px] rounded-full bg-slate-900 px-7 py-3 text-center font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {{ submitting ? 'Confirming...' : 'Confirm Booking' }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            </div>
          </div>
        </div>
      </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { router } from '@inertiajs/vue3'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { queueAppToast } from '@/lib/app-toast'
import L from 'leaflet'
import { CAVITE_BARANGAYS_BY_CODE } from '@/data/caviteBarangaysFallback'

const props = defineProps({
  teamContext: {
    type: Object,
    default: () => ({}),
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['close', 'submitted'])

const labelClass = computed(() => (
  props.embedded
    ? 'text-[11px] font-semibold uppercase tracking-wide text-slate-600'
    : 'text-xs font-semibold uppercase tracking-wide text-slate-600'
))

const controlClass = computed(() => (
  props.embedded
    ? 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-100/70 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600'
    : 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-800 shadow-sm shadow-slate-100/70 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600'
))

const controlDisabledClass = computed(() => (
  props.embedded
    ? 'mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-sm shadow-slate-100/70'
    : 'mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-slate-600 shadow-sm shadow-slate-100/70'
))

const requestCategoryClass = (value) => {
  const active = String(form.property_type || '') === value
  return active
    ? 'rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-left text-sky-800 shadow-sm shadow-sky-100/80 transition'
    : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-700 shadow-sm shadow-slate-100/70 transition hover:border-slate-300 hover:bg-slate-50'
}

const clientTypeClass = (value) => {
  const active = String(form.customer_type || '') === value
  return active
    ? 'min-h-[132px] rounded-[22px] border border-emerald-300 bg-[linear-gradient(180deg,#ecfdf5_0%,#dff7ee_100%)] px-3.5 py-3.5 text-left text-emerald-900 shadow-[0_12px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-200/70 transition'
    : 'min-h-[132px] rounded-[22px] border border-slate-200 bg-white px-3.5 py-3.5 text-left text-slate-700 shadow-sm shadow-slate-100/70 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)]'
}

const TEAM_REQUEST_MIN_AMOUNT = 500
const SIPHONING_TRUCKLOAD_RATE = 7500
const BULK_TRUCKLOAD_THRESHOLD = 10
const MAX_REASONABLE_ROUTE_KM = 150
const EMERGENCY_GEOFENCE_KM = 15
const SERVICE_TRAVEL_BUFFER_HOURS = 1
const PROPERTY_SERVICE_DURATIONS = {
  residential: 2,
  commercial: 4,
}
const COMPANY_SERVICE_AREAS = [
  'Alfonso',
  'Amadeo',
  'Bacoor',
  'Carmona',
  'Cavite City',
  'Dasmarinas',
  'General Emilio Aguinaldo',
  'General Trias',
  'Imus',
  'Indang',
  'Kawit',
  'Magallanes',
  'Maragondon',
  'Mendez',
  'Naic',
  'Noveleta',
  'Rosario',
  'Silang',
  'Tagaytay',
  'Tanza',
  'Ternate',
  'Trece Martires',
  'General Mariano Alvarez',
]
const formatLocalDate = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const minDate = formatLocalDate(new Date())
const maxDate = formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
const timeSlots = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
const PROPERTY_CLASSIFICATION_OPTIONS = {
  residential: [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'condominium', label: 'Condominium' },
  ],
  commercial: [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'office', label: 'Office' },
    { value: 'store', label: 'Store' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'school', label: 'School' },
  ],
  industrial: [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'factory', label: 'Factory' },
    { value: 'plant', label: 'Plant' },
    { value: 'facility', label: 'Facility' },
  ],
}

const to24Hour = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const direct = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (direct) {
    const hours = Number(direct[1])
    const minutes = Number(direct[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i)
  if (ampm) {
    let hours = Number(ampm[1])
    const minutes = ampm[2] ? Number(ampm[2]) : 0
    const suffix = String(ampm[3]).toLowerCase()
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      if (suffix === 'am') {
        hours = hours === 12 ? 0 : hours
      } else {
        hours = hours === 12 ? 12 : hours + 12
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }
  return ''
}
const parseLocalDateTime = (dateValue, timeValue) => {
  const dateText = String(dateValue || '').trim()
  const timeText = to24Hour(timeValue)
  if (!dateText || !timeText) return null
  const [year, month, day] = dateText.split('-').map((part) => Number(part))
  const [hours, minutes] = timeText.split(':').map((part) => Number(part))
  if (![year, month, day, hours, minutes].every((part) => Number.isFinite(part))) return null
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}
const addHoursToDate = (source, hours) => {
  if (!(source instanceof Date) || Number.isNaN(source.getTime())) return null
  const next = new Date(source.getTime())
  next.setHours(next.getHours() + Number(hours || 0))
  return next
}
const formatTimeLabel = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return ''
  return `${String(dateValue.getHours()).padStart(2, '0')}:${String(dateValue.getMinutes()).padStart(2, '0')}`
}
const parseBooleanFlag = (value) => ['1', 'true', 'yes', 'y', 'on'].includes(String(value || '').trim().toLowerCase())

const normalizeServiceType = (value) => {
  const v = String(value || '').trim().toLowerCase()
  if (v.includes('plumb')) return 'Plumbing'
  if (v.includes('siphon')) return 'Siphoning'
  return ''
}

const normalizeCategoryType = (value) => {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'both' || (v.includes('plumb') && v.includes('siphon'))) return 'both'
  if (v.includes('plumb')) return 'plumbing'
  if (v.includes('siphon')) return 'siphoning'
  return ''
}

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^city of\s+/i, '')
    .replace(/[.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const CAVITE_LGUS = [
  { code: '042101000', type: 'municipality', name: 'Alfonso', zip: '4123' },
  { code: '042102000', type: 'municipality', name: 'Amadeo', zip: '4119' },
  { code: '042103000', type: 'city', name: 'Bacoor', zip: '4102' },
  { code: '042104000', type: 'municipality', name: 'Carmona', zip: '4116' },
  { code: '042105000', type: 'city', name: 'Cavite City', zip: '4100' },
  { code: '042106000', type: 'city', name: 'Dasmarinas', zip: '4114' },
  { code: '042107000', type: 'municipality', name: 'General Emilio Aguinaldo', zip: '4124' },
  { code: '042108000', type: 'city', name: 'General Trias', zip: '4107' },
  { code: '042109000', type: 'city', name: 'Imus', zip: '4103' },
  { code: '042110000', type: 'municipality', name: 'Indang', zip: '4122' },
  { code: '042111000', type: 'municipality', name: 'Kawit', zip: '4104' },
  { code: '042112000', type: 'municipality', name: 'Magallanes', zip: '4113' },
  { code: '042113000', type: 'municipality', name: 'Maragondon', zip: '4112' },
  { code: '042114000', type: 'municipality', name: 'Mendez', zip: '4121' },
  { code: '042115000', type: 'municipality', name: 'Naic', zip: '4110' },
  { code: '042116000', type: 'municipality', name: 'Noveleta', zip: '4105' },
  { code: '042117000', type: 'municipality', name: 'Rosario', zip: '4106' },
  { code: '042118000', type: 'municipality', name: 'Silang', zip: '4118' },
  { code: '042119000', type: 'city', name: 'Tagaytay', zip: '4120' },
  { code: '042120000', type: 'municipality', name: 'Tanza', zip: '4108' },
  { code: '042121000', type: 'municipality', name: 'Ternate', zip: '4111' },
  { code: '042122000', type: 'city', name: 'Trece Martires', zip: '4109' },
  { code: '042123000', type: 'municipality', name: 'General Mariano Alvarez', zip: '4117' },
]

const extractBarangayName = (row) => {
  if (typeof row === 'string') return row
  if (!row || typeof row !== 'object') return ''
  return String(row.name || row.barangay || row.barangay_name || row.brgy || row.brgy_name || '').trim()
}

const mergeBarangayNames = (...batches) => {
  const seen = new Set()
  const names = []
  batches.flat().forEach((row) => {
    const label = extractBarangayName(row).trim()
    if (!label) return
    const key = normalizeKey(label)
    if (seen.has(key)) return
    seen.add(key)
    names.push(label)
  })
  return names.sort((a, b) => a.localeCompare(b))
}

const teamLabel = computed(() => String(props.teamContext?.team || '').trim() || 'Team')
const businessLabel = computed(() => String(props.teamContext?.business_name || '').trim() || 'Assigned team business')
const companyCategoryRaw = computed(() =>
  String(
    props.teamContext?.category
    || props.teamContext?.category_label
    || props.teamContext?.service_type
    || ''
  ).trim()
)
const companyCategoryType = computed(() => normalizeCategoryType(companyCategoryRaw.value))
const companyCategoryLabel = computed(() => {
  if (isCompanyHrManaged.value) return 'Siphoning Only'
  if (companyCategoryType.value === 'plumbing') return 'Plumbing'
  if (companyCategoryType.value === 'siphoning') return 'Siphoning'
  if (companyCategoryType.value === 'both') return 'Plumbing & Siphoning'
  return String(props.teamContext?.category_label || '').trim() || 'Service Booking'
})
const companyStreet = computed(() => String(props.teamContext?.address_street || '').trim())
const companyBarangay = computed(() => String(props.teamContext?.address_barangay || '').trim())
const companyCity = computed(() => String(props.teamContext?.address_city || '').trim())
const companyProvince = computed(() => String(props.teamContext?.address_province || '').trim())
const companyPostal = computed(() => String(props.teamContext?.address_postal || '').trim())
const currentBusinessId = computed(() => String(props.teamContext?.business_id ?? '').trim())
const hasBusinessId = computed(() => currentBusinessId.value !== '')
const isHrManaged = computed(() => String(props.teamContext?.management_mode || '').trim().toLowerCase() === 'hr')
const businessType = computed(() => String(props.teamContext?.business_type || '').trim().toLowerCase())
const isCompanyHrManaged = computed(() => isHrManaged.value && businessType.value === 'company')
const serviceAreaLgus = computed(() => (
  isCompanyHrManaged.value
    ? CAVITE_LGUS.filter((item) => COMPANY_SERVICE_AREAS.includes(item.name))
    : CAVITE_LGUS
))
const estimatedTruckloadsCount = computed(() => {
  const count = Number(form.estimated_truckloads || 0)
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0
})
const propertyClassificationOptions = computed(() => (
  PROPERTY_CLASSIFICATION_OPTIONS[String(form.property_type || '').trim().toLowerCase()] || []
))
const propertyClassificationLabel = computed(() => {
  const propertyType = String(form.property_type || '').trim().toLowerCase()
  if (propertyType === 'residential') return 'Type of Place'
  if (propertyType === 'commercial') return 'Type of Place'
  return 'Type of Place'
})
const propertyClassificationPlaceholder = computed(() => {
  const propertyType = String(form.property_type || '').trim().toLowerCase()
  if (propertyType === 'residential') return 'Select Type of Place'
  if (propertyType === 'commercial') return 'Select Type of Place'
  return 'Select Type of Place'
})
const propertyClassificationHelpText = computed(() => {
  const propertyType = String(form.property_type || '').trim().toLowerCase()
  if (propertyType === 'residential') return 'If this is residential, choose the exact place like House, Apartment, or Condominium.'
  if (propertyType === 'commercial') return 'If this is commercial, choose the exact place like Office, Store, Restaurant, Hotel, or School.'
  return 'Choose the exact type of place for the service site.'
})
const isResidentialProperty = computed(() => String(form.property_type || '').trim().toLowerCase() === 'residential')
const isCommercialProperty = computed(() => String(form.property_type || '').trim().toLowerCase() === 'commercial')
const isIndustrialProperty = computed(() => String(form.property_type || '').trim().toLowerCase() === 'industrial')
const isBusinessProperty = computed(() => isCommercialProperty.value || isIndustrialProperty.value)
const isEmergencyRequested = computed(() => parseBooleanFlag(form.is_emergency))
const defaultServiceDurationHours = computed(() => (
  isCommercialProperty.value
    ? PROPERTY_SERVICE_DURATIONS.commercial
    : PROPERTY_SERVICE_DURATIONS.residential
))
const serviceDurationHours = computed(() => (
  isEmergencyRequested.value ? 2 : defaultServiceDurationHours.value
))
const serviceDurationLabel = computed(() => (
  `${serviceDurationHours.value} hour${serviceDurationHours.value === 1 ? '' : 's'}`
))
const requiredLeadTimeHours = computed(() => (
  isEmergencyRequested.value
    ? 2
    : isCommercialProperty.value
      ? 24
      : 4
))
const scheduleStartDateTime = computed(() => parseLocalDateTime(form.preferred_date, form.service_time))
const leadTimeThresholdDateTime = computed(() => addHoursToDate(new Date(currentTimeTick.value), requiredLeadTimeHours.value))
const emergencyDistanceKm = computed(() => (
  Number.isFinite(Number(geoDistanceKm.value))
    ? Number(geoDistanceKm.value)
    : null
))
const emergencyToggleAvailable = computed(() => (
  userLocationReady.value
  && businessLocationReady.value
  && emergencyDistanceKm.value !== null
  && emergencyDistanceKm.value <= EMERGENCY_GEOFENCE_KM
))
const emergencyStatusLabel = computed(() => {
  if (!isEmergencyRequested.value) return 'Standard booking'
  if (!emergencyToggleAvailable.value) return 'Not eligible'
  if (!selectedEmergencyProofNames.value.length) return 'Proof required'
  return 'Verified'
})
const emergencyProofRequired = computed(() => isEmergencyRequested.value)
const emergencyBookingReady = computed(() => (
  !isEmergencyRequested.value
  || (emergencyToggleAvailable.value && selectedEmergencyProofNames.value.length > 0)
))
const showContractReference = computed(() => isCompanyHrManaged.value && isContractedCustomer.value)
const showOperatingHours = computed(() => isCompanyHrManaged.value && isCommercialProperty.value)
const showSiteAccessNotes = computed(() => isSiphoningService.value || isCommercialProperty.value)
const siteAccessLabel = computed(() => {
  if (isResidentialProperty.value) return 'Home Access Notes'
  if (isCommercialProperty.value) return 'Commercial Access Notes'
  if (isIndustrialProperty.value) return 'Industrial Access Notes'
  return 'Site Access Notes'
})
const siteAccessPlaceholder = computed(() => {
  if (isResidentialProperty.value) return 'Ex. Narrow street, hose distance, gate access, or nearby parked vehicles'
  if (isCommercialProperty.value) return 'Ex. Loading bay access, truck clearance, best entry time, or gate pass note'
  return 'Add any truck access, gate, hose, or entry note'
})
const baseAmount = computed(() => {
  if (isCompanyHrManaged.value && isSiphoningService.value) {
    const loadCount = estimatedTruckloadsCount.value > 0 ? estimatedTruckloadsCount.value : 1
    return loadCount * SIPHONING_TRUCKLOAD_RATE
  }
  if (isCommercialProperty.value && isSiphoningService.value && estimatedTruckloadsCount.value > 0) {
    return estimatedTruckloadsCount.value * SIPHONING_TRUCKLOAD_RATE
  }
  if (isHrManaged.value) return 3500
  const raw = Number(props.teamContext?.fixed_price || TEAM_REQUEST_MIN_AMOUNT)
  return Number.isFinite(raw) && raw >= TEAM_REQUEST_MIN_AMOUNT ? raw : TEAM_REQUEST_MIN_AMOUNT
})
const emergencySurchargeAmount = computed(() => (
  isEmergencyRequested.value
    ? Math.max(0, Math.round((baseAmount.value * 0.2) * 100) / 100)
    : 0
))
const totalRequestAmount = computed(() => (
  Math.max(0, Math.round((baseAmount.value + emergencySurchargeAmount.value) * 100) / 100)
))
const serviceWindowEndPreview = computed(() => {
  const start = scheduleStartDateTime.value
  if (!start) return ''
  const end = addHoursToDate(start, serviceDurationHours.value)
  return formatTimeLabel(end)
})
const serviceWindowBufferPreview = computed(() => {
  const start = scheduleStartDateTime.value
  if (!start) return ''
  const end = addHoursToDate(start, serviceDurationHours.value + SERVICE_TRAVEL_BUFFER_HOURS)
  return formatTimeLabel(end)
})
const availableServiceOptions = computed(() => {
  if (isCompanyHrManaged.value) return ['Siphoning']
  if (companyCategoryType.value === 'both') return ['Plumbing', 'Siphoning']
  if (companyCategoryType.value === 'plumbing') return ['Plumbing']
  if (companyCategoryType.value === 'siphoning') return ['Siphoning']
  const derived = normalizeServiceType(props.teamContext?.service_type)
  return derived ? [derived] : ['Plumbing', 'Siphoning']
})
const serviceSelectionRequired = computed(() => availableServiceOptions.value.length > 1)
const serviceAutoLabel = computed(() => availableServiceOptions.value[0] || '')
const initialServiceType = computed(() =>
  serviceSelectionRequired.value ? '' : serviceAutoLabel.value
)
const paymentChannelOptions = [
  { value: 'physical', label: 'Physical - On-Site Payment' },
  { value: 'gcash', label: 'Online - GCash' },
  { value: 'paypal', label: 'Online - PayPal' },
]

const form = reactive({
  service_type: initialServiceType.value,
  customer_type: 'non_contract',
  property_type: '',
  property_classification: '',
  client_company_name: '',
  purchase_order_number: '',
  estimated_truckloads: '',
  truck_load_volume: 'standard',
  septic_tank_condition: '',
  contract_reference: '',
  operating_hours: '',
  site_access_notes: '',
  pricing_urgency: 'standard',
  is_emergency: false,
  preferred_date: minDate,
  service_time: '',
  payment_method: '',
  payment_channel: '',
  total_amount: TEAM_REQUEST_MIN_AMOUNT,
  downpayment_amount: null,
  house_street: '',
  landmark: '',
  city: '',
  barangay: '',
  zip_code: '',
  contact_number: '',
  notes: '',
  latitude: null,
  longitude: null,
})

const submitting = ref(false)
const activeFormStep = ref(1)
const wizardModalOpen = ref(true)
const wizardScrollHost = ref(null)
const wizardSectionsHost = ref(null)
const blockedTimes = ref([])
const blockedTimesLoading = ref(false)
const barangayOptions = ref([])
const barangayLoading = ref(false)
const finalGeoMapHost = ref(null)
const reviewGeoMapHost = ref(null)
const currentTimeTick = ref(Date.now())
let geoMap = null
let geoRouteLine = null
let geoRouteAbortController = null
let barangayLoadSeq = 0
let currentTimeInterval = null
const businessCoords = reactive({ lat: null, lng: null, ready: false })
const toFiniteCoord = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const hasValidLatLng = (lat, lng) => (
  Number.isFinite(Number(lat))
  && Number.isFinite(Number(lng))
  && Math.abs(Number(lat)) <= 90
  && Math.abs(Number(lng)) <= 180
)

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

const userLat = computed(() => toFiniteCoord(form.latitude))
const userLng = computed(() => toFiniteCoord(form.longitude))
const businessLat = computed(() => toFiniteCoord(businessCoords.lat))
const businessLng = computed(() => toFiniteCoord(businessCoords.lng))
const userLocationReady = computed(() => hasValidLatLng(userLat.value, userLng.value))
const businessLocationReady = computed(() => hasValidLatLng(businessLat.value, businessLng.value))
const geoDistanceKm = computed(() => {
  if (!userLocationReady.value || !businessLocationReady.value) return null
  const km = haversineKm(userLat.value, userLng.value, businessLat.value, businessLng.value)
  return Number.isFinite(km) ? km : null
})
const hasPlausibleGeoDistance = computed(() =>
  geoDistanceKm.value !== null && geoDistanceKm.value <= MAX_REASONABLE_ROUTE_KM
)
const userLocationLink = computed(() => (
  userLocationReady.value ? `https://www.google.com/maps?q=${userLat.value},${userLng.value}` : ''
))
const businessLocationLink = computed(() => (
  businessLocationReady.value ? `https://www.google.com/maps?q=${businessLat.value},${businessLng.value}` : ''
))
const mapPreviewMode = computed(() => {
  if (userLocationReady.value && businessLocationReady.value && hasPlausibleGeoDistance.value) return 'route'
  if (businessLocationReady.value) return 'company'
  return 'hidden'
})
const selectedUrgencyPhotos = ref([])
const selectedSepticPhotos = ref([])
const selectedEmergencyProofs = ref([])
const visitedFormSteps = ref(new Set([1]))
const selectedUrgencyPhotoNames = computed(() => selectedUrgencyPhotos.value.map((file) => file?.name).filter(Boolean))
const selectedSepticPhotoNames = computed(() => selectedSepticPhotos.value.map((file) => file?.name).filter(Boolean))
const selectedEmergencyProofNames = computed(() => selectedEmergencyProofs.value.map((file) => file?.name).filter(Boolean))
const reviewDisplayValue = (value, fallback = 'Not provided') => {
  const normalized = String(value ?? '').trim()
  return {
    value: normalized || fallback,
    placeholder: !normalized,
  }
}
const isDownpaymentSelected = computed(() => String(form.payment_method || '') === 'downpayment')
const isFullPaymentSelected = computed(() => String(form.payment_method || '') === 'full')
const isSiphoningService = computed(() => normalizeServiceType(form.service_type) === 'Siphoning')
const isContractedCustomer = computed(() => String(form.customer_type || '').trim().toLowerCase() === 'contracted')
const showUrgencyPhotos = computed(() => String(form.pricing_urgency || '').trim().toLowerCase() === 'urgent' && !isEmergencyRequested.value)
const showSepticProofPhotos = computed(() => isSiphoningService.value)
const requiresCommercialTruckloads = computed(() => isCompanyHrManaged.value && isSiphoningService.value)
const truckloadSelectionPending = computed(() => requiresCommercialTruckloads.value && estimatedTruckloadsCount.value <= 0)
const paymentSelectionLocked = computed(() => !String(form.property_type || '').trim() || truckloadSelectionPending.value)
const hasBulkTruckloads = computed(() => estimatedTruckloadsCount.value >= BULK_TRUCKLOAD_THRESHOLD)
const requiresLargeLoadDownpayment = computed(() =>
  isCompanyHrManaged.value
  && isSiphoningService.value
  && hasBulkTruckloads.value
)
const requiresCommercialFullPayment = computed(() =>
  isCompanyHrManaged.value
  && isSiphoningService.value
  && !requiresLargeLoadDownpayment.value
)
const requiresCompanyChannel = computed(() => isDownpaymentSelected.value || isFullPaymentSelected.value)
const availablePaymentMethods = computed(() => {
  if (paymentSelectionLocked.value) {
    return []
  }

  if (requiresLargeLoadDownpayment.value) {
    return [{ value: 'downpayment', label: '30% Down Payment Before Mobilization' }]
  }

  if (isResidentialProperty.value) {
    return [{ value: 'full', label: 'Full Payment (Online or Physical)' }]
  }

  if (requiresCommercialFullPayment.value) {
    return [{ value: 'full', label: 'Full Payment Before Service' }]
  }

  if (isSiphoningService.value) {
    if (requiresLargeLoadDownpayment.value) {
      return [{ value: 'downpayment', label: '30% Down Payment' }]
    }

    return [{ value: 'full', label: 'Full Payment Before Service' }]
  }

  return [
    { value: 'personal', label: 'Pay on Site' },
    { value: 'downpayment', label: 'Downpayment' },
    { value: 'full', label: 'Full Payment' },
  ]
})
const suggestedDownpaymentAmount = computed(() => {
  const amount = Number(form.total_amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const rate = requiresLargeLoadDownpayment.value ? 0.3 : 0.5
  return Math.max(1, Math.round((amount * rate) * 100) / 100)
})
const remainingBalance = computed(() => {
  const total = Number(form.total_amount || 0)
  const downpayment = Number(form.downpayment_amount || 0)
  if (!Number.isFinite(total) || total <= 0) return 0
  if (!Number.isFinite(downpayment) || downpayment <= 0) return total
  return Math.max(0, Math.round((total - downpayment) * 100) / 100)
})
const paymentMethodLabel = computed(() => {
  const method = availablePaymentMethods.value.find((option) => option.value === form.payment_method)?.label
  return method || 'Payment terms will appear here'
})
const paymentPolicyTitle = computed(() => {
  if (paymentSelectionLocked.value) return 'Payment Policy'
  if (requiresLargeLoadDownpayment.value) return 'Large-Volume Payment Policy'
  if (requiresCommercialFullPayment.value) return 'Full-Payment Policy'
  if (isResidentialProperty.value) return 'Residential Payment Policy'
  return 'Payment Reminder'
})
const paymentPolicyText = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value
      ? 'Payment terms depend on the estimated truckload count. Enter the truckloads first.'
      : 'Select the request category first. Payment terms will load automatically after selection.'
  }
  if (requiresLargeLoadDownpayment.value) {
    return 'For requests involving 10 or more truckloads, a 30% down payment is required before mobilization and the remaining balance is due within 30 days after completion.'
  }
  if (requiresCommercialFullPayment.value) {
    return 'Requests below 10 truckloads require full payment before service execution. Full payment may be settled online or through physical payment.'
  }
  if (isResidentialProperty.value) {
    return 'Residential requests still follow the truckload-based policy, with full payment before service unless the bulk threshold is reached.'
  }
  return 'The request remains under review until pricing, scheduling, and payment confirmation are completed.'
})
const userLocationLabel = computed(() => {
  if (form.city && form.barangay) return `${form.barangay}, ${form.city}`
  if (form.city) return form.city
  if (form.house_street) return form.house_street
  return 'Address not completed yet'
})
const userLocationSubtextDisplay = computed(() => {
  const parts = [
    form.house_street,
    form.landmark ? `Landmark: ${form.landmark}` : '',
    form.zip_code ? `ZIP ${form.zip_code}` : '',
  ].filter(Boolean)
  return parts.join(' | ') || 'Add house, city, barangay, and ZIP to complete the service address.'
})
const userLocationSubtext = computed(() => {
  const parts = [
    form.house_street,
    form.landmark ? `Landmark: ${form.landmark}` : '',
    form.zip_code ? `ZIP ${form.zip_code}` : '',
  ].filter(Boolean)
  return parts.join(' • ') || 'Add house, city, barangay, and ZIP to complete the service address.'
})
const companyLocationLabel = computed(() => {
  if (companyBarangay.value && companyCity.value) return `${companyBarangay.value}, ${companyCity.value}`
  if (companyCity.value) return companyCity.value
  return businessLabel.value
})
const companyLocationSubtextDisplay = computed(() => {
  const parts = [
    companyStreet.value,
    companyProvince.value,
    companyPostal.value ? `ZIP ${companyPostal.value}` : '',
    !companyStreet.value && !companyBarangay.value && !companyCity.value ? String(props.teamContext?.address_label || '').trim() : '',
  ].filter(Boolean)
  return parts.join(' | ') || 'Coverage is limited to Bacoor and Imus based on the interview workflow.'
})
const companyLocationSubtext = computed(() => {
  const parts = [
    companyStreet.value,
    companyProvince.value,
    companyPostal.value ? `ZIP ${companyPostal.value}` : '',
    !companyStreet.value && !companyBarangay.value && !companyCity.value ? String(props.teamContext?.address_label || '').trim() : '',
  ].filter(Boolean)
  return parts.join(' • ') || 'Coverage is limited to Bacoor and Imus based on the interview workflow.'
})
const estimatedTruckloadHelpText = computed(() => {
  if (estimatedTruckloadsCount.value <= 0) {
    return 'Enter the expected truckloads to apply the correct payment rule.'
  }
  if (estimatedTruckloadsCount.value >= BULK_TRUCKLOAD_THRESHOLD) {
    return '10 or more truckloads follow the 30% down payment rule before mobilization.'
  }
  return '1 to 9 truckloads follow the standard full-payment-before-service rule.'
})
const estimatedAmountText = computed(() => {
  if (!estimatedTruckloadsCount.value) return 'Waiting for truckload estimate.'
  const amount = totalRequestAmount.value
  const formatted = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
  if (isEmergencyRequested.value) {
    return `${formatted} including the 20% emergency surcharge and 1-hour travel buffer.`
  }
  if (estimatedTruckloadsCount.value >= BULK_TRUCKLOAD_THRESHOLD) {
    return `${formatted} preliminary amount at PHP 7,500 per truckload. Final quotation may still be reviewed for large-volume or contract cases.`
  }
  return `${formatted} based on PHP 7,500 per truckload.`
})
const schedulePreviewLabel = computed(() => {
  if (!form.preferred_date && !form.service_time) return 'Not set yet'
  if (!form.preferred_date || !form.service_time) return 'Incomplete schedule'
  return `${form.preferred_date} • ${form.service_time}`
})
const paymentPreviewLabel = computed(() => {
  if (paymentSelectionLocked.value) return 'Pending request category'
  const method = paymentMethodLabel.value
  if (!method) return 'Not selected yet'
  if (requiresCompanyChannel.value && form.payment_channel) {
    const channel = paymentChannelOptions.find((option) => option.value === form.payment_channel)?.label
    return channel ? `${method} • ${channel}` : method
  }
  return method
})
const scheduleValidationIssue = computed(() => {
  if (!form.preferred_date || !form.service_time) return 'Choose both a preferred date and service time.'
  if (!scheduleStartDateTime.value) return 'Choose a valid service time.'
  if (scheduleStartDateTime.value < leadTimeThresholdDateTime.value) {
    if (isEmergencyRequested.value) {
      return 'Emergency bookings still need at least a 2-hour lead time.'
    }
    return isCommercialProperty.value
      ? 'Commercial bookings need at least 24 hours lead time.'
      : 'Residential bookings need at least 4 hours lead time.'
  }
  if (isEmergencyRequested.value && !emergencyToggleAvailable.value) {
    return 'Emergency booking is only available when you are within 15 km of the business.'
  }
  if (isEmergencyRequested.value && !selectedEmergencyProofNames.value.length) {
    return 'Emergency bookings need a valid photo or video upload.'
  }
  if (isSlotBlocked(form.service_time)) {
    return 'That time slot is already disabled or full.'
  }
  return ''
})
const scheduleReviewStatus = computed(() => {
  if (!form.preferred_date || !form.service_time) return 'Pending'
  if (scheduleValidationIssue.value) return 'Incomplete'
  return 'Ready'
})
const paymentReviewStatus = computed(() => {
  if (paymentSelectionLocked.value) return 'Pending'
  if (requiresCompanyChannel.value && !form.payment_channel) return 'Incomplete'
  return 'Ready'
})
const paymentFooterSupportText = computed(() => {
  if (paymentSelectionLocked.value) return 'Select the request category first so the system can load the correct payment rule.'
  if (requiresCompanyChannel.value && !form.payment_channel) return 'Choose the final settlement channel before submission.'
  if (requiresLargeLoadDownpayment.value) return 'The 30% down payment rule is already applied for this request.'
  if (requiresCommercialFullPayment.value) return 'This request follows the full-payment-before-service policy.'
  if (isResidentialProperty.value) return 'This request allows either physical or online full payment.'
  return 'Payment terms are ready for submission.'
})
const submissionStatusBadgeClass = (status) => {
  if (status === 'Ready') return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'Incomplete') return 'border border-amber-200 bg-amber-50 text-amber-700'
  return 'border border-slate-200 bg-slate-100 text-slate-600'
}
const submissionOverallLabel = computed(() => {
  if (addressPreviewStatus.value !== 'Ready' || scheduleReviewStatus.value !== 'Ready' || paymentReviewStatus.value !== 'Ready') {
    return 'Needs Review'
  }
  return 'Ready to Submit'
})
const submissionOverallBadgeClass = computed(() => (
  submissionOverallLabel.value === 'Ready to Submit'
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-amber-200 bg-amber-50 text-amber-700'
))
const bookingReadyToConfirm = computed(() => (
  submissionOverallLabel.value === 'Ready to Submit'
  && emergencyBookingReady.value
  && !scheduleValidationIssue.value
))
const paymentRuleSummaryTitle = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value ? 'Truckload Estimate Required' : 'Waiting for Request Category'
  }
  if (isEmergencyRequested.value) return 'Emergency Booking Surcharge'
  if (requiresLargeLoadDownpayment.value) return '30% Down Payment Before Mobilization'
  if (requiresCommercialFullPayment.value) return 'Full Payment Before Service'
  if (isResidentialProperty.value) return 'Full Payment with Channel Choice'
  return 'Company Payment Policy'
})
const paymentRuleSummaryText = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value
      ? 'Enter the estimated truckloads first so the system can decide between full payment and 30% down payment.'
      : 'Select the request category first so the payment terms can load automatically.'
  }
  if (isEmergencyRequested.value) {
    return 'Emergency bookings add a 20% surcharge to the base amount and require a verified 2-hour response window within 15 km of the business.'
  }
  if (requiresLargeLoadDownpayment.value) return 'Requests with 10 or more truckloads require a 30% initial payment, with the balance settled within the agreed 30-day term after completion.'
  if (requiresCommercialFullPayment.value) return 'Requests below the bulk threshold require full payment before service scheduling proceeds.'
  if (isResidentialProperty.value) return 'Residential requests still follow the truckload-based policy and require full payment before service unless they qualify for the bulk rule.'
  return 'Payment terms follow the configured company policy.'
})
const paymentRuleBadgeText = computed(() => {
  if (paymentSelectionLocked.value) return 'Pending'
  if (requiresLargeLoadDownpayment.value) return '30%'
  if (requiresCommercialFullPayment.value || isResidentialProperty.value) return 'Full'
  return 'Policy'
})
const paymentRuleBadgeClass = computed(() => {
  if (paymentSelectionLocked.value) return 'border border-slate-200 bg-slate-100 text-slate-600'
  if (requiresLargeLoadDownpayment.value) return 'border border-amber-200 bg-amber-50 text-amber-700'
  if (requiresCommercialFullPayment.value) return 'border border-sky-200 bg-sky-50 text-sky-700'
  if (isResidentialProperty.value) return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border border-slate-200 bg-slate-100 text-slate-600'
})
const paymentNextStepTitle = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value ? 'Enter Truckloads' : 'Select Category'
  }
  if (requiresCompanyChannel.value && !form.payment_channel) return 'Choose Payment Channel'
  if (requiresLargeLoadDownpayment.value && isDownpaymentSelected.value) return 'Confirm Down Payment'
  if (!form.preferred_date || !form.service_time) return 'Set Schedule'
  return 'Review Before Submission'
})
const paymentNextStepText = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value
      ? 'Use your best estimate for truckloads. The final service record can still confirm the actual count later.'
      : 'Choose whether the request is Residential or Commercial to trigger the correct payment setup.'
  }
  if (requiresCompanyChannel.value && !form.payment_channel) return 'Select whether you will settle through an online channel or physical/on-site payment.'
  if (requiresLargeLoadDownpayment.value && isDownpaymentSelected.value) return 'The system already applied the 30% rule. Review the amount and continue with your preferred channel.'
  if (!form.preferred_date || !form.service_time) return 'Complete the preferred date and service time so the request is ready for submission.'
  return 'The payment rule is already applied. CSR will still validate the request details before release to Operations.'
})
const addressPreviewStatus = computed(() => {
  if (form.house_street && form.city && form.barangay && form.zip_code) return 'Ready'
  if (form.city || form.barangay || form.house_street) return 'Incomplete'
  return 'Not filled yet'
})
const submitReminderText = computed(() => {
  if (paymentSelectionLocked.value) {
    return truckloadSelectionPending.value
      ? 'Enter the estimated truckloads first so the correct payment terms can be applied.'
      : 'Select the request category first so the correct payment terms can be applied.'
  }
  if (addressPreviewStatus.value !== 'Ready') {
    return 'Complete the address first.'
  }
  if (scheduleValidationIssue.value) {
    return scheduleValidationIssue.value
  }
  if (requiresLargeLoadDownpayment.value) {
    return 'This request follows the 30% down payment rule before mobilization.'
  }
  if (requiresCommercialFullPayment.value) {
    return 'This request requires full payment before service.'
  }
  if (isResidentialProperty.value) {
    return 'This residential request still follows the interview payment policy before service release.'
  }
  if (isCompanyHrManaged.value) {
    return 'This request will be reviewed by CSR first before scheduling.'
  }
  return 'Review your details one last time before sending.'
})
const clientTypeReviewLabel = computed(() => (
  String(form.customer_type || '').trim().toLowerCase() === 'contracted' ? 'Contract Client' : 'Standard Client'
))
const septicConditionReviewLabel = computed(() => String(form.septic_tank_condition || '').trim() || 'No septic note added')
const urgencyReviewLabel = computed(() => (
  String(form.pricing_urgency || '').trim().toLowerCase() === 'urgent' ? 'Urgent' : 'Standard'
))
const serviceReviewTitle = computed(() => {
  const service = form.service_type || serviceAutoLabel.value || 'Service not selected'
  const category = form.property_type ? (form.property_type === 'residential' ? 'Residential' : 'Commercial') : 'Category pending'
  return `${service} | ${category}`
})
const serviceReviewSubtext = computed(() => {
  const details = [
    isCompanyHrManaged.value ? `Customer Setup: ${clientTypeReviewLabel.value}` : '',
    isCommercialProperty.value && form.client_company_name ? `Company Name: ${form.client_company_name}` : '',
    isCommercialProperty.value && form.purchase_order_number ? `Purchase Order Number: ${form.purchase_order_number}` : '',
    form.property_classification
      ? `${propertyClassificationLabel.value}: ${propertyClassificationOptions.value.find((option) => option.value === form.property_classification)?.label || form.property_classification}`
      : '',
    form.contract_reference ? `Contract or Account Code: ${form.contract_reference}` : '',
    isSiphoningService.value ? `Septic notes: ${septicConditionReviewLabel.value}` : '',
    form.site_access_notes ? `Access notes: ${form.site_access_notes}` : '',
  ].filter(Boolean)
  return details.join(' | ') || 'Service details will appear here after completion.'
})
const schedulePaymentReviewSubtext = computed(() => {
  const details = [
    `Payment: ${paymentPreviewLabel.value}`,
    `Urgency: ${urgencyReviewLabel.value}`,
    `Duration: ${serviceDurationLabel.value}`,
    form.estimated_truckloads ? `Truckloads: ${form.estimated_truckloads}` : '',
    isEmergencyRequested.value ? `Emergency surcharge: PHP ${emergencySurchargeAmount.value.toFixed(2)}` : '',
    Number(form.downpayment_amount || 0) > 0 ? `Down payment: PHP ${Number(form.downpayment_amount).toFixed(2)}` : '',
  ].filter(Boolean)
  return details.join(' | ')
})
const locationReviewSubtext = computed(() => {
  const details = [
    form.contact_number ? `Contact: ${form.contact_number}` : 'Contact: No contact number yet',
    form.house_street || '',
    form.landmark ? `Landmark: ${form.landmark}` : '',
    form.zip_code ? `ZIP ${form.zip_code}` : '',
  ].filter(Boolean)
  return details.join(' | ')
})
const attachmentReviewTitle = computed(() => {
  const parts = [
    isEmergencyRequested.value ? `${selectedEmergencyProofNames.value.length} emergency proof file${selectedEmergencyProofNames.value.length === 1 ? '' : 's'}` : '',
    showUrgencyPhotos.value ? `${selectedUrgencyPhotoNames.value.length} urgent photo${selectedUrgencyPhotoNames.value.length === 1 ? '' : 's'}` : '',
    showSepticProofPhotos.value ? `${selectedSepticPhotoNames.value.length} septic photo${selectedSepticPhotoNames.value.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  return parts.join(' | ') || 'No optional attachments added'
})
const attachmentReviewSubtext = computed(() => {
  if (String(form.notes || '').trim()) return form.notes
  return 'No additional notes provided.'
})
const serviceReviewEntries = computed(() => {
  const classificationOption = propertyClassificationOptions.value.find((option) => option.value === form.property_classification)?.label || form.property_classification
  return [
    { label: 'Service Type', editStep: serviceSelectionRequired.value ? 1 : null, ...reviewDisplayValue(form.service_type || serviceAutoLabel.value, 'Not selected yet') },
    { label: 'Request Category', editStep: 1, ...reviewDisplayValue(form.property_type ? (form.property_type === 'residential' ? 'Residential' : 'Commercial') : '', 'Not selected yet') },
    ...(isCommercialProperty.value
      ? [
          { label: 'Company Name', editStep: 1, ...reviewDisplayValue(form.client_company_name, 'Not provided') },
          { label: 'Purchase Order Number', editStep: 1, ...reviewDisplayValue(form.purchase_order_number, 'Not provided') },
        ]
      : []),
    ...(isCompanyHrManaged.value
      ? [{ label: 'Customer Setup', editStep: 1, ...reviewDisplayValue(form.customer_type ? clientTypeReviewLabel.value : '', 'Not provided') }]
      : []),
    ...(form.property_classification || isCompanyHrManaged.value
      ? [{ label: propertyClassificationLabel.value, editStep: 1, ...reviewDisplayValue(classificationOption, 'Not provided') }]
      : []),
    ...(form.contract_reference
      ? [{ label: 'Contract or Account Code', editStep: 1, ...reviewDisplayValue(form.contract_reference, 'Not provided') }]
      : []),
    ...(isSiphoningService.value
      ? [{ label: 'Septic Tank Notes', editStep: 1, ...reviewDisplayValue(form.septic_tank_condition, 'No septic notes provided') }]
      : []),
    { label: 'Site Access Notes', editStep: 1, ...reviewDisplayValue(form.site_access_notes, 'No access notes provided') },
    { label: 'Service Duration', editStep: null, ...reviewDisplayValue(serviceDurationLabel.value, '2 hours') },
    { label: 'Emergency Status', editStep: null, ...reviewDisplayValue(emergencyStatusLabel.value, 'Standard booking') },
    ...(showSepticProofPhotos.value
      ? [{ label: 'Septic Condition Photos', editStep: 1, ...reviewDisplayValue(selectedSepticPhotoNames.value.join(', '), 'No files added') }]
      : []),
  ]
})
const scheduleReviewEntries = computed(() => ([
  { label: 'Preferred Date', editStep: 2, ...reviewDisplayValue(form.preferred_date, 'Not set yet') },
  { label: 'Service Time', editStep: 2, ...reviewDisplayValue(form.service_time, 'Not set yet') },
  { label: 'Service Duration', editStep: null, ...reviewDisplayValue(serviceDurationLabel.value, '2 hours') },
  { label: 'Payment Terms', editStep: null, ...reviewDisplayValue(paymentRuleSummaryTitle.value, 'Waiting for payment setup') },
  { label: 'Payment Method', editStep: paymentSelectionLocked.value ? null : 2, ...reviewDisplayValue(paymentMethodLabel.value && paymentMethodLabel.value !== 'Payment terms will appear here' ? paymentMethodLabel.value : '', 'Not selected yet') },
  {
    label: 'Payment Channel',
    editStep: requiresCompanyChannel.value ? 2 : null,
    ...reviewDisplayValue(
      paymentChannelOptions.find((option) => option.value === form.payment_channel)?.label || (requiresCompanyChannel.value ? '' : 'Not required for this request'),
      requiresCompanyChannel.value ? 'Not selected yet' : 'Not required for this request',
    ),
  },
  { label: 'Urgency', editStep: 2, ...reviewDisplayValue(urgencyReviewLabel.value, 'Standard') },
  { label: 'Emergency Status', editStep: 2, ...reviewDisplayValue(emergencyStatusLabel.value, 'Standard booking') },
  ...(isEmergencyRequested.value
    ? [{ label: 'Emergency Surcharge', editStep: null, ...reviewDisplayValue(`PHP ${emergencySurchargeAmount.value.toFixed(2)}`, 'PHP 0.00') }]
    : []),
  ...(form.estimated_truckloads ? [{ label: 'Estimated Truckloads', editStep: 2, ...reviewDisplayValue(form.estimated_truckloads) }] : []),
  ...(Number(form.downpayment_amount || 0) > 0 ? [{ label: 'Down Payment', editStep: 2, ...reviewDisplayValue(`PHP ${Number(form.downpayment_amount).toFixed(2)}`) }] : []),
]))
const locationReviewEntries = computed(() => ([
  {
    label: 'Request Location',
    editStep: 3,
    ...reviewDisplayValue(
      form.city || form.barangay || form.house_street ? userLocationLabel.value : '',
      'Address not completed yet',
    ),
  },
  {
    label: 'Request Details',
    editStep: 3,
    ...reviewDisplayValue(
      form.house_street || form.landmark || form.zip_code ? userLocationSubtextDisplay.value : '',
      'Add the full service location details',
    ),
  },
  { label: 'Selected Business', editStep: null, ...reviewDisplayValue(businessLabel.value, 'No business selected') },
  { label: 'Business Location', editStep: null, ...reviewDisplayValue(companyLocationLabel.value, 'Business location unavailable') },
  { label: 'Business Details', editStep: null, ...reviewDisplayValue(companyLocationSubtextDisplay.value, 'Business address is not available yet') },
  { label: 'Contact Number', editStep: null, ...reviewDisplayValue(form.contact_number, 'No contact number yet') },
  { label: 'Street Address', editStep: 3, ...reviewDisplayValue(form.house_street, 'Not provided') },
  { label: 'Barangay', editStep: 3, ...reviewDisplayValue(form.barangay, 'Not selected yet') },
  { label: 'City', editStep: 3, ...reviewDisplayValue(form.city, 'Not selected yet') },
  { label: 'Landmark', editStep: 3, ...reviewDisplayValue(form.landmark, 'No landmark provided') },
  { label: 'ZIP Code', editStep: null, ...reviewDisplayValue(form.zip_code, 'Not assigned yet') },
]))
const attachmentReviewEntries = computed(() => {
  const entries = [
    { label: 'Additional Notes', editStep: 4, ...reviewDisplayValue(form.notes, 'No additional notes provided') },
  ]
  if (isEmergencyRequested.value) {
    entries.push({
      label: 'Emergency Proof Files',
      editStep: 2,
      ...reviewDisplayValue(selectedEmergencyProofNames.value.join(', '), 'No files added'),
    })
  }
  if (showUrgencyPhotos.value) {
    entries.push({
      label: 'Urgent Proof Photos',
      editStep: 2,
      ...reviewDisplayValue(selectedUrgencyPhotoNames.value.join(', '), 'No files added'),
    })
  }
  return entries
})
const classificationStepReady = computed(() => {
  if (!String(form.property_type || '').trim()) return false
  if (!String(form.service_type || '').trim()) return false
  if (isCommercialProperty.value) {
    if (!String(form.client_company_name || '').trim()) return false
    if (!String(form.purchase_order_number || '').trim()) return false
  }
  if (isCompanyHrManaged.value && isSiphoningService.value && !String(form.property_classification || '').trim()) return false
  return true
})
const scheduleStepReady = computed(() => (
  scheduleReviewStatus.value === 'Ready' && paymentReviewStatus.value === 'Ready'
))
const addressStepReady = computed(() => addressPreviewStatus.value === 'Ready')
const classificationStepStatus = computed(() => classificationStepReady.value ? 'Ready' : 'In progress')
const scheduleStepStatus = computed(() => {
  if (!classificationStepReady.value) return 'Locked'
  if (scheduleStepReady.value) return 'Ready'
  return activeFormStep.value === 2 ? 'In progress' : 'Needs details'
})
const addressStepStatus = computed(() => {
  if (!classificationStepReady.value || !scheduleStepReady.value) return 'Locked'
  if (addressStepReady.value) return 'Ready'
  return activeFormStep.value === 3 ? 'In progress' : 'Needs details'
})
const reviewStepStatus = computed(() => {
  if (!classificationStepReady.value || !scheduleStepReady.value || !addressStepReady.value) return 'Locked'
  return activeFormStep.value === 4 ? 'In progress' : 'Ready'
})
const finalPreviewStepStatus = computed(() => {
  if (!classificationStepReady.value || !scheduleStepReady.value || !addressStepReady.value) return 'Locked'
  return activeFormStep.value === 5 ? 'In progress' : 'Ready'
})
const maxAccessibleFormStep = computed(() => {
  if (!classificationStepReady.value) return 1
  if (!scheduleStepReady.value) return 2
  if (!addressStepReady.value) return 3
  if (!hasVisitedStep(4) && activeFormStep.value < 4) return 4
  return 5
})
const canAccessFormStep = (step) => Number(step || 0) >= 1 && Number(step || 0) <= maxAccessibleFormStep.value
const markStepVisited = (step) => {
  const normalized = Number(step || 0)
  if (normalized < 1) return
  const next = new Set(visitedFormSteps.value)
  next.add(normalized)
  visitedFormSteps.value = next
}
const hasVisitedStep = (step) => visitedFormSteps.value.has(Number(step || 0))
const setActiveFormStep = (step) => {
  const normalized = Number(step || 1)
  if (canAccessFormStep(normalized)) {
    activeFormStep.value = normalized
  }
}
const stepAdvanceButtonClass = (isReady) => (
  isReady
    ? 'bg-slate-900 text-white hover:bg-slate-800'
    : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
)
const showStepValidationAlert = (title, text) => Swal.fire({
  icon: 'warning',
  title,
  text,
  confirmButtonColor: '#0f172a',
})
const proceedToFormStep = (step) => {
  if (canAccessFormStep(step)) {
    activeFormStep.value = step
  }
}
const proceedFromClassificationStep = () => {
  if (!String(form.property_type || '').trim()) {
    return showStepValidationAlert('Request category required', 'Select whether this request is residential or commercial before continuing.')
  }
  if (!String(form.service_type || '').trim()) {
    return showStepValidationAlert('Service type required', 'Select the service type before continuing.')
  }
  if (isCommercialProperty.value && !String(form.client_company_name || '').trim()) {
    return showStepValidationAlert('Company name required', 'Enter the commercial client company name before continuing.')
  }
  if (isCommercialProperty.value && !String(form.purchase_order_number || '').trim()) {
    return showStepValidationAlert('Purchase order required', 'Enter the purchase order number before continuing.')
  }
  if (isCompanyHrManaged.value && isSiphoningService.value && !String(form.property_classification || '').trim()) {
    return showStepValidationAlert('Property classification required', 'Choose the property classification before moving to scheduling.')
  }
  proceedToFormStep(2)
}
const goToPrevFormStep = () => {
  if (activeFormStep.value > 1) {
    activeFormStep.value -= 1
  }
}
const goToNextFormStep = () => {
  const nextStep = activeFormStep.value + 1
  if (canAccessFormStep(nextStep)) {
    activeFormStep.value = nextStep
  }
}
const proceedFromScheduleStep = () => {
  if (!String(form.preferred_date || '').trim()) {
    return showStepValidationAlert('Schedule date required', 'Choose a preferred service date before continuing.')
  }
  if (!String(form.service_time || '').trim()) {
    return showStepValidationAlert('Service time required', 'Choose an available service time before continuing.')
  }
  if (scheduleValidationIssue.value) {
    return showStepValidationAlert('Schedule unavailable', scheduleValidationIssue.value)
  }
  if (paymentSelectionLocked.value) {
    return showStepValidationAlert('Payment setup pending', paymentFooterSupportText.value)
  }
  if (requiresCompanyChannel.value && !String(form.payment_channel || '').trim()) {
    return showStepValidationAlert('Payment channel required', 'Choose how this request will be settled before continuing.')
  }
  proceedToFormStep(3)
}
const proceedFromAddressStep = () => {
  if (!addressStepReady.value) {
    return showStepValidationAlert('Address incomplete', 'Complete the full service address before moving to the review step.')
  }
  proceedToFormStep(4)
}
const proceedFromPreviewStep = () => {
  proceedToFormStep(5)
}
const formStepItems = computed(() => ([
  {
    id: 1,
    title: 'Classification',
    caption: classificationStepReady.value ? 'Service details are ready.' : 'Choose request type and service details.',
    status: classificationStepStatus.value,
    enabled: true,
  },
  {
    id: 2,
    title: 'Schedule',
    caption: scheduleStepReady.value ? 'Schedule and payment are ready.' : 'Set the date, time, and payment setup.',
    status: scheduleStepStatus.value,
    enabled: canAccessFormStep(2),
  },
  {
    id: 3,
    title: 'Address',
    caption: addressStepReady.value ? 'Service address is complete.' : 'Add the full service location.',
    status: addressStepStatus.value,
    enabled: canAccessFormStep(3),
  },
  {
    id: 4,
    title: 'Preview',
    caption: maxAccessibleFormStep.value >= 4 ? 'Check the route preview and notes.' : 'Unlocks after the address is complete.',
    status: reviewStepStatus.value,
    enabled: canAccessFormStep(4),
  },
  {
    id: 5,
    title: 'Review',
    caption: maxAccessibleFormStep.value >= 5 ? 'Review the completed request and submit.' : 'Unlocks after preview.',
    status: finalPreviewStepStatus.value,
    enabled: canAccessFormStep(5),
  },
]))
const currentFormStepItem = computed(() => (
  formStepItems.value.find((item) => item.id === activeFormStep.value) || formStepItems.value[0]
))
const requestCategorySelected = computed(() => !!String(form.property_type || '').trim())
const wizardLauncherTitle = computed(() => (
  !requestCategorySelected.value
    ? 'Select a request category first'
    : wizardModalOpen.value
      ? 'Wizard is currently open'
      : `Current stage: ${currentFormStepItem.value.title}`
))
const wizardLauncherButtonLabel = computed(() => (
  !requestCategorySelected.value
    ? 'Select Category First'
    : activeFormStep.value > 1 || classificationStepReady.value
      ? 'Resume Wizard'
      : 'Open Wizard'
))
const wizardProgressPercent = computed(() => {
  const totalSteps = Math.max(formStepItems.value.length, 1)
  return Math.round((activeFormStep.value / totalSteps) * 100)
})
const stepStatusBadgeClass = (status) => {
  if (status === 'Ready') return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'Active' || status === 'In progress') return 'border border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'Needs details') return 'border border-amber-200 bg-amber-50 text-amber-700'
  return 'border border-slate-200 bg-slate-100 text-slate-600'
}
const stepCircleClass = (item) => {
  if (!item.enabled) {
    return 'inline-flex h-[2.05rem] w-[2.05rem] flex-none items-center justify-center rounded-full border border-[#cbd5e1] bg-[#e2e8f0] text-[0.84rem] font-bold leading-none text-[#64748b] transition-[background-color,color,border-color,box-shadow,transform] duration-200 max-sm:h-[1.72rem] max-sm:w-[1.72rem] max-sm:text-[0.74rem]'
  }
  if (item.status === 'Ready' && hasVisitedStep(item.id) && activeFormStep.value !== item.id) {
    return 'inline-flex h-[2.05rem] w-[2.05rem] flex-none items-center justify-center rounded-full border border-[#0f766e] bg-[linear-gradient(180deg,#0f766e,#0e9f6e)] text-[0.84rem] font-bold leading-none text-white shadow-[0_6px_14px_rgba(15,118,110,0.2)] transition-[background-color,color,border-color,box-shadow,transform] duration-200 max-sm:h-[1.72rem] max-sm:w-[1.72rem] max-sm:text-[0.74rem]'
  }
  if (activeFormStep.value === item.id) {
    return 'inline-flex h-[2.05rem] w-[2.05rem] flex-none items-center justify-center rounded-full border border-[#0e7490] bg-[linear-gradient(180deg,#06b6d4,#0891b2)] text-[0.84rem] font-bold leading-none text-white shadow-[0_0_0_3px_rgba(14,165,233,0.14),0_7px_14px_rgba(8,145,178,0.22)] transition-[background-color,color,border-color,box-shadow,transform] duration-200 max-sm:h-[1.72rem] max-sm:w-[1.72rem] max-sm:text-[0.74rem]'
  }
  return 'inline-flex h-[2.05rem] w-[2.05rem] flex-none items-center justify-center rounded-full border border-[#cbd5e1] bg-[#e2e8f0] text-[0.84rem] font-bold leading-none text-[#64748b] transition-[background-color,color,border-color,box-shadow,transform] duration-200 hover:border-slate-400 max-sm:h-[1.72rem] max-sm:w-[1.72rem] max-sm:text-[0.74rem]'
}
const stepConnectorClass = (stepId) => {
  if (hasVisitedStep(stepId + 1) || activeFormStep.value > stepId) {
    return 'bg-[#c3e7e3] after:scale-x-100 after:bg-[linear-gradient(90deg,#14b8a6,#0ea5e9)]'
  }
  return 'bg-[#dbe3f0] after:scale-x-0 after:bg-[linear-gradient(90deg,#14b8a6,#0ea5e9)]'
}
const sectionStatusBadgeClass = (status) => stepStatusBadgeClass(status)
const scrollToActiveFormStep = async () => {
  await nextTick()
  const scrollHost = wizardScrollHost.value
  if (scrollHost) {
    if (typeof scrollHost.scrollTo === 'function') {
      scrollHost.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      scrollHost.scrollTop = 0
    }
  }
  const host = wizardSectionsHost.value
  if (!host?.querySelector) return
  const target = host.querySelector(`[data-form-step="${activeFormStep.value}"]`)
  if (!target?.scrollIntoView) return
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  })
}
const syncBodyScrollLock = () => {
  return
}
const openWizardModal = async () => {
  await scrollToActiveFormStep()
}
const closeWizardModal = () => {
  goBack()
}
const handleWizardKeydown = (event) => {
  if (event.key === 'Escape') {
    closeWizardModal()
  }
}

watch(maxAccessibleFormStep, (maxStep) => {
  if (activeFormStep.value > maxStep) {
    activeFormStep.value = maxStep
  }
  const next = new Set(Array.from(visitedFormSteps.value).filter((step) => step <= maxStep))
  next.add(1)
  visitedFormSteps.value = next
})

watch(activeFormStep, () => {
  markStepVisited(activeFormStep.value)
  if (wizardModalOpen.value) {
    scrollToActiveFormStep()
  }
  drawGeoMap()
})

const blockedTimesSet = computed(() => new Set(blockedTimes.value))
const isSlotBeforeLeadTime = (slot) => {
  const slotDateTime = parseLocalDateTime(form.preferred_date, slot)
  if (!slotDateTime || !leadTimeThresholdDateTime.value) return false
  return slotDateTime < leadTimeThresholdDateTime.value
}
const isSlotBlocked = (slot) => {
  const normalized = to24Hour(slot)
  return normalized !== '' && (blockedTimesSet.value.has(normalized) || isSlotBeforeLeadTime(normalized))
}
const nextAvailableSlot = computed(() => {
  if (!form.preferred_date) return ''
  return timeSlots.find((slot) => !isSlotBlocked(slot)) || ''
})
let blockedLoadedOnce = false
const fetchBlockedTimes = async () => {
  if (!hasBusinessId.value || !form.preferred_date) {
    blockedTimes.value = []
    return
  }
  blockedTimesLoading.value = true
  try {
    const res = await axios.get('/user/service-requests/blocked-times', {
      params: {
        business_id: currentBusinessId.value,
        service_provider_id: Number(props.teamContext?.service_provider_id || 0) || null,
        preferred_date: form.preferred_date,
        property_type: form.property_type,
        pricing_urgency: form.pricing_urgency,
        is_emergency: form.is_emergency ? '1' : '0',
        service_duration_hours: serviceDurationHours.value,
        latitude: form.latitude,
        longitude: form.longitude,
        provider_label: teamLabel.value,
      },
      timeout: 10000,
    })
    const times = Array.isArray(res?.data?.times) ? res.data.times : []
    blockedTimes.value = times.filter(Boolean)
  } catch {
    blockedTimes.value = []
  } finally {
    blockedTimesLoading.value = false
    if (form.service_time && isSlotBlocked(form.service_time)) {
      form.service_time = ''
      if (blockedLoadedOnce) {
        Swal.fire('Time Unavailable', 'Selected time is already booked. Please choose another slot.', 'warning')
      }
    }
    blockedLoadedOnce = true
  }
}

const findLguByCity = (city) => {
  const key = normalizeKey(city)
  return CAVITE_LGUS.find((item) => normalizeKey(item.name) === key) || null
}

const fetchBarangaysByLgu = async (lgu) => {
  if (!lgu?.code) return []
  const fallback = mergeBarangayNames(CAVITE_BARANGAYS_BY_CODE[String(lgu.code)] || [])

  try {
    const res = await axios.get(`/user/cavite/barangays/${lgu.code}`, {
      params: { type: lgu.type },
      timeout: 10000,
    })
    const names = mergeBarangayNames(Array.isArray(res.data) ? res.data : [], fallback)
    if (names.length) return names
  } catch {}

  return fallback
}

watch(
  () => form.city,
  async (city) => {
    const requestId = ++barangayLoadSeq
    const selected = findLguByCity(city)
    if (!selected) {
      barangayOptions.value = []
      form.barangay = ''
      form.zip_code = ''
      barangayLoading.value = false
      return
    }

    form.zip_code = selected.zip || ''
    form.barangay = ''
    barangayLoading.value = true

    const names = await fetchBarangaysByLgu(selected)
    if (requestId !== barangayLoadSeq) return
    barangayOptions.value = names
    barangayLoading.value = false
  }
)

watch(
  [() => form.property_type, propertyClassificationOptions],
  () => {
    const allowed = propertyClassificationOptions.value.map((option) => option.value)
    if (!allowed.includes(form.property_classification)) {
      form.property_classification = ''
    }
    if (paymentSelectionLocked.value) {
      form.payment_method = ''
      form.payment_channel = ''
      form.downpayment_amount = null
    }
  },
  { immediate: true }
)

watch(
  [() => form.customer_type, () => form.property_type, () => form.service_type, () => form.pricing_urgency, () => form.is_emergency],
  () => {
    if (!isCommercialProperty.value) {
      form.client_company_name = ''
      form.purchase_order_number = ''
    }
    if (!showContractReference.value) {
      form.contract_reference = ''
    }
    if (!showOperatingHours.value) {
      form.operating_hours = ''
    }
    if (!showSiteAccessNotes.value) {
      form.site_access_notes = ''
    }
    if (!isSiphoningService.value) {
      form.septic_tank_condition = ''
    }
    if (!showUrgencyPhotos.value) {
      selectedUrgencyPhotos.value = []
    }
    if (!isEmergencyRequested.value) {
      selectedEmergencyProofs.value = []
    }
    if (!showSepticProofPhotos.value) {
      selectedSepticPhotos.value = []
    }
    if (!requiresCommercialTruckloads.value) {
      form.estimated_truckloads = ''
    }
  },
  { immediate: true }
)

watch(
  () => form.is_emergency,
  (value) => {
    if (parseBooleanFlag(value)) {
      form.pricing_urgency = 'urgent'
    }
  },
  { immediate: true }
)

watch(
  emergencyToggleAvailable,
  (available) => {
    if (!available && parseBooleanFlag(form.is_emergency)) {
      form.is_emergency = false
    }
  },
  { immediate: true }
)

watch(
  [baseAmount, estimatedTruckloadsCount, isCompanyHrManaged, isSiphoningService],
  () => {
    form.total_amount = totalRequestAmount.value
    if (isCompanyHrManaged.value && isSiphoningService.value) {
      form.truck_load_volume = hasBulkTruckloads.value ? 'large' : 'standard'
    }
  },
  { immediate: true }
)

watch(
  [serviceSelectionRequired, serviceAutoLabel],
  () => {
    if (serviceSelectionRequired.value) {
      if (!availableServiceOptions.value.includes(form.service_type)) {
        form.service_type = ''
      }
      return
    }
    form.service_type = serviceAutoLabel.value
  },
  { immediate: true }
)

watch(
  () => form.payment_method,
  (value) => {
    const method = String(value || '').trim().toLowerCase()
    if (method === 'downpayment') {
      const downpayment = Number(form.downpayment_amount || 0)
      if (!Number.isFinite(downpayment) || downpayment <= 0) {
        form.downpayment_amount = suggestedDownpaymentAmount.value
      }
      return
    }
    if (method === 'full') {
      form.downpayment_amount = null
      return
    }
    form.payment_channel = ''
    form.downpayment_amount = null
  },
  { immediate: true }
)

watch(
  [() => form.service_type, () => form.customer_type, () => form.property_type, () => form.estimated_truckloads],
  () => {
    const allowedValues = availablePaymentMethods.value.map((option) => option.value)
    if (paymentSelectionLocked.value) {
      form.payment_method = ''
    } else if (!allowedValues.includes(form.payment_method)) {
      form.payment_method = allowedValues[0] || ''
    }
    if (isDownpaymentSelected.value) {
      form.downpayment_amount = suggestedDownpaymentAmount.value
      return
    }
    form.downpayment_amount = null
  },
  { immediate: true }
)

watch(
  () => form.total_amount,
  () => {
    if (!isDownpaymentSelected.value) return
    const total = Number(form.total_amount || 0)
    const downpayment = Number(form.downpayment_amount || 0)
    if (!Number.isFinite(total) || total <= 0) return
    if (!Number.isFinite(downpayment) || downpayment <= 0 || downpayment > total) {
      form.downpayment_amount = suggestedDownpaymentAmount.value
    }
  }
)

watch(
  [
    () => form.preferred_date,
    () => form.property_type,
    () => form.service_type,
    () => form.pricing_urgency,
    () => form.is_emergency,
    defaultServiceDurationHours,
    () => props.teamContext?.service_provider_id,
    () => teamLabel.value,
  ],
  () => {
    fetchBlockedTimes()
  },
  { immediate: true }
)

const goBack = () => {
  if (props.embedded) {
    emit('close')
    return
  }
  router.visit('/user/dashboard')
}

const canShowGeoMap = computed(() => mapPreviewMode.value !== 'hidden')
const geoStatusTitle = computed(() => {
  if (mapPreviewMode.value === 'route') return 'Route Preview Ready'
  if (mapPreviewMode.value === 'company') return 'Company Pin Ready'
  return 'Map Unavailable'
})
const geoStatusShortText = computed(() => {
  if (mapPreviewMode.value === 'route') return `Approx. ${geoDistanceKm.value.toFixed(2)} km between your saved pin and the company pin.`
  if (mapPreviewMode.value === 'company') return 'Showing the selected company location while your route preview is not yet ready.'
  if (!userLocationReady.value) return 'Your saved profile coordinates are missing or incomplete.'
  if (!businessLocationReady.value) return 'The selected company has no valid saved coordinates yet.'
  return `Approx. ${geoDistanceKm.value.toFixed(2)} km between your saved pin and the company pin.`
})
const geoStatusText = computed(() => {
  if (mapPreviewMode.value === 'route') return `Approx. ${geoDistanceKm.value.toFixed(2)} km from your saved location to the selected company.`
  if (mapPreviewMode.value === 'company' && !userLocationReady.value) return 'Showing the selected company location while your saved profile location is still missing.'
  if (mapPreviewMode.value === 'company' && !hasPlausibleGeoDistance.value) return 'Showing the selected company location only because your saved route preview looks unrealistic for this local booking.'
  if (mapPreviewMode.value === 'company') return 'Showing the selected company location while your route preview is not yet available.'
  return 'Map preview is waiting for a valid company location.'
})
const geoPreviewNote = computed(() => {
  if (mapPreviewMode.value === 'route') {
    return 'Use this as a quick check before submitting.'
  }
  if (mapPreviewMode.value === 'company' && !userLocationReady.value) {
    return 'Update your profile location to show the route to the company.'
  }
  if (mapPreviewMode.value === 'company' && !hasPlausibleGeoDistance.value) {
    return 'Your saved coordinates may be outdated, so only the company pin is shown for now.'
  }
  if (!businessLocationReady.value) return 'The company has no saved map pin yet.'
  return 'Map preview is limited until valid coordinates are available.'
})
const geoBadgeClass = (ready) => (
  ready
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-amber-200 bg-amber-50 text-amber-700'
)
const normalizeSelectedFiles = (event) => Array.from(event?.target?.files || []).slice(0, 5)

const handleUrgencyPhotoSelection = (event) => {
  selectedUrgencyPhotos.value = normalizeSelectedFiles(event)
}

const handleSepticPhotoSelection = (event) => {
  selectedSepticPhotos.value = normalizeSelectedFiles(event)
}

const handleEmergencyProofSelection = (event) => {
  selectedEmergencyProofs.value = Array.from(event?.target?.files || []).slice(0, 5)
}
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const mapPopupHtml = (title, subtitle) => `
  <div style="min-width:180px">
    <div style="font-weight:700;color:#0f172a">${escapeHtml(title)}</div>
    <div style="margin-top:4px;font-size:12px;line-height:1.4;color:#475569">${escapeHtml(subtitle)}</div>
  </div>
`
const distanceLabel = computed(() => {
  if (mapPreviewMode.value === 'route') return `Approx. ${geoDistanceKm.value.toFixed(2)} km from your location to team business.`
  if (mapPreviewMode.value === 'company') return 'Company location preview is available.'
  return 'Waiting for location coordinates...'
})
const activeGeoMapHostKey = computed(() => {
  if (activeFormStep.value === 4) return 'final'
  if (activeFormStep.value === 5) return 'review'
  return ''
})
const resolveGeoMapHost = () => {
  if (activeGeoMapHostKey.value === 'final') return finalGeoMapHost.value
  if (activeGeoMapHostKey.value === 'review') return reviewGeoMapHost.value
  return null
}

const destroyGeoMap = () => {
  if (geoRouteAbortController) {
    geoRouteAbortController.abort()
    geoRouteAbortController = null
  }
  if (geoMap) {
    geoMap.remove()
    geoMap = null
  }
  geoRouteLine = null
}

const drawGeoMap = async () => {
  if (!canShowGeoMap.value || !activeGeoMapHostKey.value) {
    destroyGeoMap()
    return
  }
  await nextTick()
  const host = resolveGeoMapHost()
  if (!host) return

  if (!geoMap || geoMap._container !== host) {
    destroyGeoMap()
    geoMap = L.map(host, { zoomControl: true, attributionControl: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(geoMap)
  } else {
    geoMap.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) geoMap.removeLayer(layer)
    })
  }

  const businessPoint = [businessLat.value, businessLng.value]
  L.marker(businessPoint)
    .addTo(geoMap)
    .bindPopup(mapPopupHtml(businessLabel.value, companyLocationLabel.value))

  if (mapPreviewMode.value === 'company') {
    geoMap.setView(businessPoint, 14)
    if (typeof geoMap.invalidateSize === 'function') {
      setTimeout(() => geoMap?.invalidateSize?.(), 0)
    }
    return
  }

  const userPoint = [userLat.value, userLng.value]
  L.marker(userPoint)
    .addTo(geoMap)
    .bindPopup(mapPopupHtml('Your Service Address', userLocationLabel.value))

  if (geoRouteAbortController) geoRouteAbortController.abort()
  geoRouteAbortController = new AbortController()

  try {
    const response = await axios.get('/user/route-preview', {
      params: {
        from_lat: userLat.value,
        from_lng: userLng.value,
        to_lat: businessLat.value,
        to_lng: businessLng.value,
      },
      signal: geoRouteAbortController.signal,
      timeout: 8000,
    })

    const points = Array.isArray(response?.data?.points)
      ? response.data.points
          .map((point) => [Number(point?.[0]), Number(point?.[1])])
          .filter((point) => hasValidLatLng(point[0], point[1]))
      : []

    if (points.length) {
      geoRouteLine = L.polyline(points, { color: '#0ea5e9', weight: 5, opacity: 0.9 }).addTo(geoMap)
      geoMap.fitBounds(geoRouteLine.getBounds(), { padding: [20, 20] })
      return
    }
  } catch (err) {
    // fallback straight-line rendering below
  }

  geoRouteLine = L.polyline([userPoint, businessPoint], { color: '#0ea5e9', weight: 4, opacity: 0.9 }).addTo(geoMap)
  geoMap.fitBounds(geoRouteLine.getBounds(), { padding: [20, 20] })
  if (typeof geoMap.invalidateSize === 'function') {
    setTimeout(() => geoMap?.invalidateSize?.(), 0)
  }
}

const loadBusinessCoordinates = async () => {
  const businessId = currentBusinessId.value
  if (!businessId) return
  try {
    const res = await axios.get('/user/all-businesses')
    const list = Array.isArray(res?.data) ? res.data : []
    const business = list.find((item) => String(item?.id ?? '').trim() === businessId)
    if (!business) return
    businessCoords.lat = toFiniteCoord(business?.latitude)
    businessCoords.lng = toFiniteCoord(business?.longitude)
    businessCoords.ready = true
  } catch {
    businessCoords.ready = false
  }
}

const submitRequest = async () => {
  if (!hasBusinessId.value) {
    Swal.fire('Error', 'Team business is missing.', 'error')
    return
  }
  if (!form.service_type) return Swal.fire('Validation', 'Please select service type.', 'warning')
  if (isCompanyHrManaged.value && !form.customer_type) return Swal.fire('Validation', 'Please select client type.', 'warning')
  if (!form.property_type) return Swal.fire('Validation', 'Please select request category.', 'warning')
  if (isCommercialProperty.value && !String(form.client_company_name || '').trim()) {
    return Swal.fire('Validation', 'Please enter the commercial company name.', 'warning')
  }
  if (isCommercialProperty.value && !String(form.purchase_order_number || '').trim()) {
    return Swal.fire('Validation', 'Please enter the purchase order number.', 'warning')
  }
  if (isCompanyHrManaged.value && isSiphoningService.value && !form.property_classification) {
    return Swal.fire('Validation', 'Please select property classification.', 'warning')
  }
  if (requiresCommercialTruckloads.value && estimatedTruckloadsCount.value <= 0) {
    return Swal.fire('Validation', 'Please enter estimated truckloads.', 'warning')
  }
  if (!form.preferred_date) return Swal.fire('Validation', 'Please select preferred date.', 'warning')
  if (!form.service_time) return Swal.fire('Validation', 'Please select service time.', 'warning')
  if (scheduleValidationIssue.value) {
    return Swal.fire('Validation', scheduleValidationIssue.value, 'warning')
  }
  if (requiresCompanyChannel.value && !form.payment_channel) {
    return Swal.fire('Validation', 'Please select payment channel.', 'warning')
  }
  if (!form.house_street || !form.city || !form.barangay || !form.zip_code) {
    return Swal.fire('Validation', 'Please complete your address fields.', 'warning')
  }
  if (isCompanyHrManaged.value && !COMPANY_SERVICE_AREAS.includes(String(form.city || '').trim())) {
    return Swal.fire('Validation', 'Please choose a valid city or municipality in Cavite.', 'warning')
  }
  if (!form.contact_number) return Swal.fire('Validation', 'Please enter contact number.', 'warning')
  if (selectedUrgencyPhotos.value.length > 5) return Swal.fire('Validation', 'You can upload up to 5 urgent photos only.', 'warning')
  if (selectedSepticPhotos.value.length > 5) return Swal.fire('Validation', 'You can upload up to 5 septic proof photos only.', 'warning')
  if (isEmergencyRequested.value) {
    if (!emergencyToggleAvailable.value) {
      return Swal.fire('Validation', 'Emergency booking is only available when your location is within 15 km of the business.', 'warning')
    }
    if (!selectedEmergencyProofs.value.length) {
      return Swal.fire('Validation', 'Emergency bookings require at least one photo or video proof.', 'warning')
    }
  }
  if (showUrgencyPhotos.value && selectedUrgencyPhotos.value.length === 0) {
    return Swal.fire('Validation', 'Please upload at least one urgent photo for urgent requests.', 'warning')
  }

  const amount = Number(totalRequestAmount.value || form.total_amount || 0)
  if (!Number.isFinite(amount) || amount < TEAM_REQUEST_MIN_AMOUNT || amount > 999999) {
    return Swal.fire('Validation', 'Invalid service amount.', 'warning')
  }

  if (isResidentialProperty.value && form.payment_method !== 'full') {
    return Swal.fire('Validation', 'Residential requests require the full payment flow before service release.', 'warning')
  }

  if (requiresCommercialFullPayment.value && form.payment_method !== 'full') {
    return Swal.fire('Validation', 'Requests below 10 truckloads require full payment before service.', 'warning')
  }

  if (requiresLargeLoadDownpayment.value && form.payment_method !== 'downpayment') {
    return Swal.fire('Validation', 'Requests with 10 or more truckloads require the 30% down payment flow.', 'warning')
  }

  const downpaymentAmount = isDownpaymentSelected.value
    ? Number(form.downpayment_amount || suggestedDownpaymentAmount.value || 0)
    : null
  if (isDownpaymentSelected.value) {
    if (!Number.isFinite(downpaymentAmount) || downpaymentAmount <= 0) {
      return Swal.fire('Validation', 'Please enter a valid downpayment amount.', 'warning')
    }
    if (downpaymentAmount >= amount) {
      return Swal.fire('Validation', 'Downpayment must be lower than total service amount.', 'warning')
    }
  }

  const syncProfileRequest = axios.post('/user/profile', {
    _method: 'PUT',
    contact_number: form.contact_number,
  }, { skipGlobalLoading: true }).catch(() => {
    // Best effort: continue with request submission.
  })

  const companyMetaTags = [
    isCommercialProperty.value && form.client_company_name
      ? ` [CLIENT_COMPANY_NAME:${String(form.client_company_name).toUpperCase()}]`
      : '',
    isCommercialProperty.value && form.purchase_order_number
      ? ` [PURCHASE_ORDER_NUMBER:${String(form.purchase_order_number).toUpperCase()}]`
      : '',
    isCompanyHrManaged.value ? ` [CLIENT_TYPE:${String(form.customer_type).toUpperCase()}]` : '',
    ` [PROPERTY_TYPE:${String(form.property_type).toUpperCase()}]`,
    isSiphoningService.value && form.property_classification
      ? ` [PROPERTY_CLASSIFICATION:${String(form.property_classification).toUpperCase()}]`
      : '',
    isSiphoningService.value && estimatedTruckloadsCount.value > 0
      ? ` [ESTIMATED_TRUCKLOADS:${String(estimatedTruckloadsCount.value)}]`
      : '',
    isSiphoningService.value ? ` [TRUCK_LOAD_VOLUME:${String(form.truck_load_volume).toUpperCase()}]` : '',
    isCompanyHrManaged.value ? ` [PRICING_URGENCY:${String(form.pricing_urgency).toUpperCase()}]` : '',
    form.landmark ? ` [LANDMARK:${String(form.landmark).toUpperCase()}]` : '',
    form.septic_tank_condition ? ` [SEPTIC_TANK_CONDITION:${String(form.septic_tank_condition).toUpperCase()}]` : '',
    form.contract_reference ? ` [CONTRACT_REFERENCE:${String(form.contract_reference).toUpperCase()}]` : '',
    form.operating_hours ? ` [OPERATING_HOURS:${String(form.operating_hours).toUpperCase()}]` : '',
    form.site_access_notes ? ` [SITE_ACCESS_NOTES:${String(form.site_access_notes).toUpperCase()}]` : '',
  ].filter(Boolean).join('')
  const emergencyMetaTags = isEmergencyRequested.value
    ? ` [EMERGENCY:TRUE] [EMERGENCY_DISTANCE:${emergencyDistanceKm.value !== null ? emergencyDistanceKm.value.toFixed(2) : 'NA'}] [EMERGENCY_SURCHARGE:${emergencySurchargeAmount.value.toFixed(2)}]`
    : ''
  const metaTags = `[PROVIDER:${teamLabel.value}] [DATE:${form.preferred_date}] [TIME:${form.service_time}]${companyMetaTags}${emergencyMetaTags}`
  const composedNotes = `${String(form.notes || '').trim()} ${metaTags}`.trim()

  const addressText = [
    form.house_street,
    form.landmark ? `Landmark: ${form.landmark}` : '',
    `Brgy. ${form.barangay}`,
    `${form.city}, Cavite ${form.zip_code}`,
  ].filter(Boolean).join(', ')
  const submittedPayload = {
    service_type: form.service_type,
    address_text: addressText,
    contact_number: form.contact_number,
    notes: composedNotes,
    preferred_date: form.preferred_date,
    preferred_time: to24Hour(form.service_time),
    payment_method: form.payment_method,
    total_amount: amount,
  }
  const selectedTeam = {
    ...props.teamContext,
    team: teamLabel.value,
  }

  const payload = new FormData()
  payload.append('business_id', currentBusinessId.value)
  payload.append('business_name', String(props.teamContext?.business_name || props.teamContext?.company_name || ''))
  payload.append('company_name', String(props.teamContext?.company_name || props.teamContext?.business_name || ''))
  payload.append('business_type', String(props.teamContext?.business_type || ''))
  payload.append('management_mode', String(props.teamContext?.management_mode || ''))
  const serviceProviderId = Number(props.teamContext?.service_provider_id || 0) || null
  if (serviceProviderId) payload.append('service_provider_id', String(serviceProviderId))
  payload.append('service_type', form.service_type)
  if (isCompanyHrManaged.value) payload.append('customer_type', form.customer_type)
  payload.append('property_type', form.property_type)
  if (isCommercialProperty.value) {
    payload.append('client_company_name', form.client_company_name)
    payload.append('purchase_order_number', form.purchase_order_number)
  }
  if (isCompanyHrManaged.value && form.property_classification) payload.append('property_classification', form.property_classification)
  if (requiresCommercialTruckloads.value) payload.append('estimated_truckloads', String(estimatedTruckloadsCount.value))
  if (isCompanyHrManaged.value) payload.append('truck_load_volume', form.truck_load_volume)
  if (isCompanyHrManaged.value) payload.append('pricing_urgency', form.pricing_urgency)
  payload.append('is_emergency', isEmergencyRequested.value ? '1' : '0')
  if (form.septic_tank_condition) payload.append('septic_tank_condition', form.septic_tank_condition)
  payload.append('preferred_date', form.preferred_date)
  payload.append('preferred_time', to24Hour(form.service_time))
  payload.append('payment_method', form.payment_method)
  if (requiresCompanyChannel.value) {
    const normalizedPaymentChannel = form.payment_channel === 'paypal' ? 'paymaya' : form.payment_channel
    payload.append('payment_channel', normalizedPaymentChannel)
  }
  payload.append('total_amount', String(amount))
  payload.append('service_duration_hours', String(serviceDurationHours.value))
  payload.append('travel_buffer_hours', String(SERVICE_TRAVEL_BUFFER_HOURS))
  payload.append('emergency_surcharge_amount', String(emergencySurchargeAmount.value))
  if (isDownpaymentSelected.value) payload.append('downpayment_amount', String(downpaymentAmount))
  payload.append('address_text', addressText)
  payload.append('contact_number', form.contact_number)
  payload.append('notes', composedNotes)
  if (form.latitude !== null && form.latitude !== undefined) payload.append('latitude', String(form.latitude))
  if (form.longitude !== null && form.longitude !== undefined) payload.append('longitude', String(form.longitude))
  if (form.landmark) payload.append('landmark', form.landmark)
  if (form.contract_reference) payload.append('contract_reference', form.contract_reference)
  if (form.operating_hours) payload.append('operating_hours', form.operating_hours)
  if (form.site_access_notes) payload.append('site_access_notes', form.site_access_notes)
  selectedUrgencyPhotos.value.forEach((file) => payload.append('urgency_photos[]', file))
  selectedSepticPhotos.value.forEach((file) => payload.append('septic_photos[]', file))
  selectedEmergencyProofs.value.forEach((file) => payload.append('emergency_proofs[]', file))

  submitting.value = true
  try {
    const res = await axios.post('/user/service-requests', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const submitted = res?.data || {}
    const submittedMessage = submitted.message || 'Service request submitted.'
    if (submitted.invoice_url) {
      queueAppToast({
        type: 'success',
        message: submittedMessage,
        timeout: 2200,
      })
      window.location.assign('/User/UserDashboard?section=bookingRequest')
      return
    }
    if (props.embedded) {
      emit('submitted', {
        request: submitted,
        submittedPayload,
        selectedTeam,
        message: submittedMessage,
      })
      return
    }
    queueAppToast({
      type: 'success',
      message: submittedMessage,
      timeout: 2200,
    })
    router.visit('/user/dashboard?section=bookingRequest')
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || 'Failed to submit request.', 'error')
  } finally {
    submitting.value = false
    void syncProfileRequest
  }
}

onMounted(async () => {
  currentTimeInterval = setInterval(() => {
    currentTimeTick.value = Date.now()
  }, 30000)
  try {
    const res = await axios.get('/user/profile')
    const user = res?.data || {}
    form.contact_number = String(user.contact_number || '').trim()
    form.latitude = user.latitude ?? null
    form.longitude = user.longitude ?? null
  } catch {
    // no-op
  }
  await loadBusinessCoordinates()
  await drawGeoMap()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWizardKeydown)
  }
})

watch(canShowGeoMap, async () => {
  await drawGeoMap()
})

onBeforeUnmount(() => {
  if (currentTimeInterval) {
    clearInterval(currentTimeInterval)
    currentTimeInterval = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWizardKeydown)
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  destroyGeoMap()
})
</script>


