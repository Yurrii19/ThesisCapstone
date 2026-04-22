<template>
  <div class="h-screen flex flex-col bg-gray-100">

    <!-- NAVBAR -->
    <nav class="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold">
          U
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Customer Dashboard</h1>
          <p class="text-xs text-gray-500">Track bookings and service updates</p>
        </div>
      </div>
      <div class="flex items-center gap-3 relative">
        <div class="relative">
          <button
            type="button"
            class="relative h-10 w-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            @click="toggleNotificationsMenu"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" class="mx-auto h-5 w-5" aria-hidden="true">
              <path d="M15 17H9m9-2V11a6 6 0 1 0-12 0v4l-2 2h16l-2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10.5 20a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span
              v-if="unreadCount"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[18px]"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>

          <div
            v-if="showNotificationsMenu"
            class="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-semibold text-gray-800">Notifications</p>
              <button type="button" class="text-xs font-semibold text-teal-700 hover:underline" @click="fetchNotifications">
                Refresh
              </button>
            </div>
            <div class="max-h-[340px] overflow-y-auto">
              <div v-if="notifications.length === 0" class="px-4 py-6 text-sm text-gray-500">
                Loading notifications...
              </div>
              <div v-else class="divide-y divide-gray-100">
                <div
                  v-for="note in notifications"
                  :key="`nav-note-${note.id}`"
                  class="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
                  @click="handleNotificationClick(note)"
                >
                  <div class="w-2 h-2 mt-2 rounded-full" :class="note.read_at ? 'bg-gray-300' : 'bg-teal-500'"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">{{ note.title }}</p>
                    <p class="text-xs text-gray-600 mt-0.5 break-words">{{ note.message }}</p>
                    <div class="mt-1 flex items-center justify-between gap-3">
                      <p class="text-[11px] text-gray-400">{{ note.created_at }}</p>
                      <button
                        type="button"
                        class="text-[11px] font-semibold"
                        :class="note.read_at ? 'text-gray-400 cursor-default' : 'text-teal-700 hover:underline'"
                        :disabled="!!note.read_at"
                        @click.stop="markRead(note.id)"
                      >
                        {{ note.read_at ? 'Read' : 'Mark as read' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            class="h-10 min-w-10 px-3 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            @click="toggleProfileMenu"
          >
            <img
              v-if="safeProfileImageUrl"
              :src="safeProfileImageUrl"
              alt="Profile"
              class="h-7 w-7 rounded-full object-cover border border-gray-200"
              @error="handleProfileImageError"
            />
            <span v-else class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
              {{ userInitials }}
            </span>
            <span class="text-xs font-semibold hidden sm:inline">Profile</span>
          </button>

          <div
            v-if="showProfileMenu"
            class="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-xl z-50 py-1"
          >
            <button type="button" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="openProfile">
              Profile
            </button>
            <button type="button" class="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50" @click="confirmLogout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex flex-1 overflow-hidden">

      <!-- SIDEBAR -->
      <aside class="h-full w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-6">
        <div class="mb-6 px-3">
          <p class="text-xs uppercase tracking-wide text-gray-400">Navigation</p>
        </div>
        <ul class="space-y-2">
          <li @click="setSection('spProfile')" :class="[menuClass('spProfile'), isSectionLocked('spProfile') ? 'opacity-50 pointer-events-none' : '']" class="hidden">
            🏠 <span>Dashboard</span>
          </li>
          <li @click="setSection('spProfile')" :class="[menuClass('spProfile'), isSectionLocked('spProfile') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('spProfile')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <path d="M4 11.5 12 5l8 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.5 10.5V19h11v-8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">Home</p>
              <p class="mt-1 text-[11px] text-inherit/70">Browse companies</p>
            </div>
          </li>
          <li class="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Request Journey
          </li>
          <li @click="setSection('bookingRequest')" :class="[menuClass('bookingRequest'), isSectionLocked('bookingRequest') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('bookingRequest')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <path d="M8 7h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M8 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z" stroke="currentColor" stroke-width="1.8"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">New Request</p>
              <p class="mt-1 text-[11px] text-inherit/70">Submit details</p>
            </div>
          </li>
          <li @click="setSection('bookingReview')" :class="[menuClass('bookingReview'), isSectionLocked('bookingReview') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('bookingReview')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 8.5V12l2.5 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">Request Status</p>
              <p class="mt-1 text-[11px] text-inherit/70">Track updates</p>
            </div>
          </li>
          <li @click="setSection('inspectionDeployment')" :class="[menuClass('inspectionDeployment'), isSectionLocked('inspectionDeployment') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('inspectionDeployment')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <path d="M12 20s5.5-5.2 5.5-9.5A5.5 5.5 0 1 0 6.5 10.5C6.5 14.8 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <circle cx="12" cy="10.5" r="1.8" stroke="currentColor" stroke-width="1.8"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">Site Visit</p>
              <p class="mt-1 text-[11px] text-inherit/70">Schedule progress</p>
            </div>
          </li>
          <li @click="setSection('paymentDetermination')" :class="[menuClass('paymentDetermination'), isSectionLocked('paymentDetermination') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('paymentDetermination')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <rect x="4.5" y="6.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/>
                <path d="M4.5 10h15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">Payment Status</p>
              <p class="mt-1 text-[11px] text-inherit/70">Check payment</p>
            </div>
          </li>
          <li @click="setSection('warrantyHandling')" :class="[menuClass('warrantyHandling'), isSectionLocked('warrantyHandling') ? 'opacity-50 pointer-events-none' : '']" class="group px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3">
            <span :class="menuIconClass('warrantyHandling')" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border">
              <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                <path d="M12 20s-6.5-3.7-6.5-9.2V6.5L12 4l6.5 2.5v4.3C18.5 16.3 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="m9.5 12 1.6 1.6 3.4-3.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-none">Support</p>
              <p class="mt-1 text-[11px] text-inherit/70">After-service help</p>
            </div>
          </li>
          <li v-if="false" @click="setSection('notifications')" :class="[menuClass('notifications'), isSectionLocked('notifications') ? 'opacity-50 pointer-events-none' : '']" class="px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2">
            🔔 <span>Notifications</span>
            <span v-if="unreadCount" class="ml-auto text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{{ unreadCount }}</span>
          </li>
        </ul>
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
                <p class="text-sm font-semibold text-slate-800">Need help?</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">Contact support for account concerns, request updates, or schedule follow-ups.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 p-8 overflow-y-auto">

        <section v-if="!isApproved && section !== 'profile'" class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.18)]">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-600">Account Review</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">{{ userAccountReviewTitle }}</h2>
              <p class="mt-2 max-w-3xl text-sm text-slate-600">{{ userAccountReviewCopy }}</p>
            </div>
            <span class="inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold" :class="isAccountCorrectionRequired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'">
              {{ userAccountStatusLabel }}
            </span>
          </div>
          <div v-if="userAccountReviewMessage" class="mt-4 rounded-2xl border px-4 py-3 text-sm" :class="isAccountCorrectionRequired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'">
            <p class="font-semibold">Admin Note</p>
            <p class="mt-1">{{ userAccountReviewMessage }}</p>
          </div>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700"
              @click="setSection('profile')"
            >
              Open Profile
            </button>
          </div>
        </section>

        <!-- DASHBOARD -->
        <section v-if="isApproved && section==='dashboard'" class="space-y-6">
          <div class="grid grid-cols-1 gap-6">
            <div class="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl p-6 shadow-lg">
              <h2 class="text-2xl font-bold mb-2">Welcome, {{ authUser.first_name }}!</h2>
              <p class="text-sm text-emerald-100">Browse service companies and track your requests in one place.</p>
              <div class="mt-4 bg-white/15 rounded-xl p-4">
                <p v-if="!appStatus.hasApplied" class="text-white/90">Your account is ready for service booking.</p>
                <p v-else-if="appStatus.pending" class="text-yellow-100 font-semibold">
                  Your partner application is under review.
                </p>
                <p v-else-if="appStatus.rejected" class="text-red-100 font-medium">
                  Your partner application was not approved.
                  <span v-if="appStatus.reject_reason" class="block mt-1 text-xs text-white/90">
                    Reason: {{ appStatus.reject_reason }}
                  </span>
                </p>
                <p v-else-if="appStatus.approved" class="text-emerald-100 font-semibold">
                  Your partner application has been approved.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-md p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-800">Available Service Teams</h3>
                <p class="text-xs text-gray-500">Only active and published teams are available for booking.</p>
              </div>
              <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {{ bookingReadyFormedTeams.length }} teams
              </span>
            </div>

            <div v-if="formedTeamsLoading" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600">
              Loading available teams...
            </div>
            <div v-else-if="!bookingReadyFormedTeams.length" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600">
              Loading available teams...
            </div>
            <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article
                v-for="team in bookingReadyFormedTeams"
                :key="`formed-team-${team.team}`"
                class="rounded-2xl border border-gray-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      TEAM <span v-if="teamCode(team)" class="text-slate-700">{{ teamCode(team) }}</span>
                    </p>
                  </div>
                  <span class="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    {{ team.member_count }} members
                  </span>
                </div>

                <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[10px] uppercase tracking-[0.08em] text-slate-500">Schedule</p>
                  <p class="mt-1 text-xs font-semibold text-slate-700">{{ formatTeamSchedule(team) }}</p>
                </div>

                <div class="mt-3 grid grid-cols-1 gap-2">
                  <div class="rounded-lg bg-slate-50 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-[0.08em] text-slate-500">Service Type</p>
                    <p class="mt-1 text-xs font-semibold text-slate-700">{{ displayServiceTypeFromTeam(team) }}</p>
                  </div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-[0.08em] text-slate-500">Branch</p>
                    <p class="mt-1 text-xs font-semibold text-slate-700">{{ team.business_name || 'Not specified' }}</p>
                  </div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-[0.08em] text-slate-500">Fee</p>
                    <p class="mt-1 text-xs font-semibold text-slate-700">
                      {{ teamFeeLabel(team) }}
                    </p>
                    <p v-if="team.fee_notes" class="mt-1 text-[11px] text-slate-500">{{ team.fee_notes }}</p>
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  <span
                    v-for="member in team.members"
                    :key="`team-${team.team}-member-${member.id}`"
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                    :class="teamMemberPillClass(member.team_assignment_status)"
                  >
                    {{ member.name }}
                  </span>
                </div>

                <div class="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <p class="text-xs text-slate-500">
                    {{ team.business_name || 'No business mapping' }}
                  </p>
                  <button
                    type="button"
                    class="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    :class="requestLocked ? 'bg-slate-400' : 'bg-teal-600 hover:bg-teal-700'"
                    :disabled="requestLocked || !team.can_request"
                    @click="requestServiceForTeam(team)"
                  >
                    Request Service
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-if="isApproved && section==='spProfile'" class="space-y-6">
          <div class="relative overflow-hidden rounded-[28px] border border-teal-100 bg-[linear-gradient(135deg,#ffffff_0%,#ecfeff_46%,#f8fafc_100%)] p-6 shadow-[0_24px_60px_-32px_rgba(15,118,110,0.32)]">
            <div class="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-teal-200/30 blur-2xl"></div>
            <div class="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl"></div>

            <div class="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700 shadow-sm">
                  <span class="inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
                  Step 1
                </div>
                <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">Choose a Service Company</h2>
                <p class="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Browse registered companies and businesses first, then continue with your request under the service team that fits your needs.
                </p>
              </div>

              <div class="flex flex-col items-stretch gap-3 sm:flex-row xl:flex-col xl:items-end">
                <div class="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm xl:max-w-xs">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Tip</p>
                  <p class="mt-1 text-sm font-medium text-slate-700">Select a company first before opening a new request form.</p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700"
                  @click="fetchBusinesses"
                >
                  Refresh Companies
                </button>
              </div>
            </div>

            <div class="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <article class="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Available Companies</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{{ filteredBookingBusinesses.length }}</p>
                    <p class="mt-1 text-xs font-medium text-slate-500">
                      Showing {{ filteredBookingBusinesses.length }} of {{ bookingBusinesses.length }}
                    </p>
                  </div>
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                      <path d="M4 19V6.5C4 5.672 4.672 5 5.5 5h13C19.328 5 20 5.672 20 6.5V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 19V15h8v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 9h.01M12 9h.01M16 9h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </div>
              </article>
              <article class="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Active Requests</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-amber-900">{{ bookingFlowStats.active }}</p>
                  </div>
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-amber-600">
                    <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                      <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                  </span>
                </div>
              </article>
              <article class="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Completed Jobs</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-emerald-900">{{ bookingFlowStats.completed }}</p>
                  </div>
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-emerald-600">
                    <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                      <path d="m7.5 12 3 3 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                  </span>
                </div>
              </article>
            </div>
          </div>

          <div v-if="bookingBusinesses.length > 0" class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Business Filter</span>
            <button
              v-for="option in bookingBusinessFilterOptions"
              :key="`booking-filter-${option.id}`"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              :class="bookingBusinessFilter === option.id
                ? 'border-teal-200 bg-teal-50 text-teal-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700'"
              @click="bookingBusinessFilter = option.id"
            >
              <span>{{ option.label }}</span>
              <span class="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-inherit">{{ option.count }}</span>
            </button>
          </div>

          <div v-if="businessesLoading && bookingBusinesses.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Loading registered companies and businesses...
          </div>
          <div v-else-if="bookingBusinesses.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Loading registered companies and businesses...
          </div>
          <div v-else-if="filteredBookingBusinesses.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Loading {{ activeBookingFilterLabel.toLowerCase() }} businesses...
          </div>
          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="business in filteredBookingBusinesses"
              :key="`booking-business-${business.id}`"
              class="group relative h-full overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_18px_36px_-18px_rgba(13,148,136,0.45)]"
            >
              <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.16),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

              <div class="relative flex h-full flex-col">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <span
                      class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-bold text-white shadow-sm"
                    >
                      {{ businessInitials(business) }}
                    </span>
                    <div class="min-w-0">
                      <h3 class="truncate text-lg font-bold tracking-tight text-slate-900">{{ business.business_name }}</h3>
                      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{{ business.category_label }}</p>
                      <p v-if="business.owner_label !== 'N/A'" class="mt-1 text-xs font-medium text-slate-600">
                        Owner: {{ business.owner_label }}
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      :class="business.booking_flow_mode === 'hr' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ business.booking_flow_mode === 'hr' ? 'CSR First' : 'Business Managed' }}
                    </span>
                    <span class="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Open for Requests
                    </span>
                    <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="business.badgeClass">
                      {{ business.badgeLabel }}
                    </span>
                  </div>
                </div>

                <p class="mt-4 text-sm leading-6 text-slate-600">
                  Review business details, contact information, and location before you continue.
                </p>
                <p class="mt-2 text-xs font-medium text-slate-500">
                  {{ business.distanceText || business.helperText }}
                </p>

                <div class="mt-4 grid flex-1 grid-cols-1 gap-3">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 shadow-sm">
                      <div class="flex items-start gap-3">
                        <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                            <path d="M4.5 19V6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 19v-4h6v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </span>
                        <div class="min-w-0">
                          <p class="text-[10px] uppercase tracking-[0.1em] text-slate-500">Business Type</p>
                          <p class="mt-1 text-sm font-semibold text-slate-700">{{ business.type_label }}</p>
                          <p v-if="business.owner_label !== 'N/A'" class="mt-1 text-xs font-medium text-slate-500">
                            {{ business.owner_label }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 shadow-sm">
                      <div class="flex items-start gap-3">
                        <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                            <path d="M6.5 7.5h11A1.5 1.5 0 0 1 19 9v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 15V9a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="1.8"/>
                            <path d="M5 10.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                          </svg>
                        </span>
                        <div class="min-w-0">
                          <p class="text-[10px] uppercase tracking-[0.1em] text-slate-500">Contact</p>
                          <p class="mt-1 break-all text-sm font-semibold text-slate-700">{{ business.contact_label }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 shadow-sm">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[10px] uppercase tracking-[0.1em] text-slate-500">Location Map</p>
                        <p class="mt-1 text-xs font-medium text-slate-500">
                          {{ business.hasDistance ? business.helperText : (business.map_has_coordinates ? 'Pinned company location' : 'Address-based map preview') }}
                        </p>
                      </div>
                      <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="business.hasDistance ? business.badgeClass : 'bg-slate-100 text-slate-600'">
                        {{ business.hasDistance ? business.distanceText : (business.map_has_coordinates ? 'Pin Ready' : 'Search View') }}
                      </span>
                    </div>
                    <a
                      :href="business.map_link || '#'"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-3 block rounded-2xl border border-teal-100 bg-[linear-gradient(135deg,#ecfeff_0%,#f8fafc_100%)] p-2.5 transition"
                      :class="business.map_link ? 'hover:border-teal-200 hover:shadow-sm' : 'pointer-events-none opacity-70'"
                    >
                      <div class="relative overflow-hidden rounded-[18px] border border-white/80 bg-[linear-gradient(135deg,#dff7f4_0%,#eff6ff_100%)] px-3 py-4">
                        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,118,110,0.06)_1px,transparent_1px),linear-gradient(rgba(15,118,110,0.06)_1px,transparent_1px)] bg-[size:22px_22px]"></div>
                        <div class="relative flex items-center justify-between gap-3">
                          <div class="flex items-center gap-3">
                            <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
                              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                                <path d="M12 20s5.5-5.2 5.5-9.5A5.5 5.5 0 1 0 6.5 10.5C6.5 14.8 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                                <circle cx="12" cy="10.5" r="1.8" stroke="currentColor" stroke-width="1.8"/>
                              </svg>
                            </span>
                            <div class="min-w-0">
                              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
                                {{ business.map_has_coordinates ? 'Pinned Location' : 'Map Search' }}
                              </p>
                              <p class="mt-1 text-sm font-semibold text-slate-700">
                                {{ business.map_link ? 'Open in Google Maps' : 'Location not available' }}
                              </p>
                            </div>
                          </div>
                          <span v-if="business.map_link" class="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                            View
                          </span>
                        </div>
                      </div>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {{ business.address_label }}
                      </p>
                    </a>
                  </div>
                </div>

                <div class="mt-5 pt-1">
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="requestLocked"
                    @click="openBusinessBooking(business)"
                  >
                    {{ requestLocked ? 'Request Locked' : 'Choose This Company' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-if="isApproved && section==='bookingRequest'" class="space-y-6">
          <div class="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Step 2</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">New Request</h2>
                <p class="mt-1 text-sm text-slate-600">Submit your service details, location, contact info, and preferred schedule.</p>
              </div>
              <button
                type="button"
                class="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="requestLocked"
                @click="requestLocked ? Swal.fire('Request Locked', lockMessage || 'You already have an active request.', 'info') : setSection('dashboard')"
              >
                {{ requestLocked ? 'Request Locked' : 'Open Request Form' }}
              </button>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <article class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Requests</p>
                <p class="mt-1 text-2xl font-bold text-slate-900">{{ bookingFlowStats.total }}</p>
              </article>
              <article class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Active Requests</p>
                <p class="mt-1 text-2xl font-bold text-sky-900">{{ bookingFlowStats.active }}</p>
              </article>
              <article class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                <p class="mt-1 text-2xl font-bold text-emerald-900">{{ bookingFlowStats.completed }}</p>
              </article>
            </div>
          </div>

          <div v-if="latestBookingRequest" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col items-start gap-2">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Latest Booking</p>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                @click="showLatestBookingDetails = true"
              >
                <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500">i</span>
                View Details
              </button>
            </div>

            <div class="mt-4 max-w-[470px]">
              <article class="overflow-hidden rounded-[26px] border border-teal-200 bg-[linear-gradient(165deg,#ffffff_0%,#f6fffd_48%,#eefcff_100%)] p-4 shadow-[0_16px_34px_-30px_rgba(13,148,136,0.3)]">
                <div class="flex items-start justify-between gap-2.5">
                  <div class="flex min-w-0 items-start gap-3.5">
                    <span class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-teal-500 to-cyan-500 text-[1.28rem] font-bold text-white shadow-[0_14px_24px_-18px_rgba(6,182,212,0.55)]">
                      {{ businessInitials({ business_name: latestBookingRequest.business_name }) }}
                    </span>
                    <div class="min-w-0">
                      <h3 class="line-clamp-2 text-[1.08rem] font-black tracking-tight leading-tight text-slate-900">
                        {{ latestBookingRequest.business_name }}
                      </h3>
                      <p class="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {{ String(latestBookingRequest.service_type || 'Service').toUpperCase() }}
                      </p>
                    </div>
                  </div>

                  <div class="flex shrink-0 flex-col items-end gap-1.5">
                    <span class="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[0.72rem] font-semibold text-slate-700 shadow-sm">
                      Latest Booking
                    </span>
                    <span class="inline-flex rounded-full border border-teal-100 bg-emerald-50/90 px-3 py-1 text-[0.72rem] font-semibold text-emerald-700 shadow-sm">
                      View Ready
                    </span>
                    <span class="inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold shadow-sm" :class="statusClass(latestBookingRequest)">
                      {{ prettyStatus(latestBookingRequest) }}
                    </span>
                  </div>
                </div>

                <p class="mt-4 text-[0.9rem] leading-7 text-slate-600">
                  Review your latest booking details, schedule, and request progress before opening the full details.
                </p>
                <p class="mt-2 text-[0.88rem] font-medium text-slate-500">
                  {{ requestScheduleLabel(latestBookingRequest) }}
                </p>

                <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="rounded-[20px] border border-slate-100 bg-white/95 px-3 py-3.5 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.28)]">
                    <div class="flex items-start gap-3">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                          <path d="M6.5 7.5h11A1.5 1.5 0 0 1 19 9v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 15V9a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="1.8"/>
                          <path d="M5 10.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                      </span>
                      <div class="min-w-0">
                        <p class="text-[0.68rem] uppercase tracking-[0.19em] text-slate-500">Service Type</p>
                        <p class="mt-1.5 text-[0.92rem] font-semibold leading-6 text-slate-700">
                          {{ latestBookingRequest.service_type || 'N/A' }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-[20px] border border-slate-100 bg-white/95 px-3 py-3.5 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.28)]">
                    <div class="flex items-start gap-3">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" class="h-4.5 w-4.5" aria-hidden="true">
                          <path d="M7 4.75v2.5M17 4.75v2.5M4.75 9.5h14.5M6.5 6.75h11A1.75 1.75 0 0 1 19.25 8.5v9A1.75 1.75 0 0 1 17.5 19.25h-11A1.75 1.75 0 0 1 4.75 17.5v-9A1.75 1.75 0 0 1 6.5 6.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <div class="min-w-0">
                        <p class="text-[0.68rem] uppercase tracking-[0.19em] text-slate-500">Schedule</p>
                        <p class="mt-1.5 text-[0.92rem] font-semibold leading-6 text-slate-700">
                          {{ requestScheduleLabel(latestBookingRequest) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 rounded-[22px] border border-teal-100 bg-white/95 px-3.5 py-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.28)]">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[0.68rem] uppercase tracking-[0.19em] text-slate-500">Booking Status</p>
                      <p class="mt-1.5 text-[0.88rem] font-medium leading-6 text-slate-500">
                        Check the current request stage or open the full detail view for the complete timeline.
                      </p>
                    </div>
                    <span class="inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold shadow-sm" :class="statusClass(latestBookingRequest)">
                      {{ prettyStatus(latestBookingRequest) }}
                    </span>
                  </div>

                  <div class="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      class="inline-flex w-full items-center justify-center rounded-[18px] bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-[0.9rem] font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:from-teal-600 hover:to-cyan-600"
                      @click="showLatestBookingDetails = true"
                    >
                      View Details
                    </button>
                    <button
                      v-if="latestBookingRequest && canCancelActiveRequest"
                      type="button"
                      class="inline-flex w-full items-center justify-center rounded-[18px] border border-rose-200 bg-white px-4 py-2.5 text-[0.9rem] font-semibold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50"
                      @click="cancelRequest(latestBookingRequest.id)"
                    >
                      Cancel Request
                    </button>
                    <button
                      v-if="latestBookingRequest && canLeaveFeedback(latestBookingRequest)"
                      type="button"
                      class="inline-flex w-full items-center justify-center rounded-[18px] border border-amber-200 bg-white px-4 py-2.5 text-[0.9rem] font-semibold text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                      @click="openFeedbackModal(latestBookingRequest)"
                    >
                      Leave Feedback
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
              <div
                v-if="showLatestBookingDetails"
                class="fixed inset-0 z-[96] bg-slate-900/60 backdrop-blur-sm p-4"
                @click="showLatestBookingDetails = false"
              >
                <div
                  class="mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-teal-100 bg-[linear-gradient(180deg,#f9fffe_0%,#ffffff_18%,#ffffff_100%)] shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]"
                  @click.stop
                >
                  <div class="border-b border-teal-100 bg-white/80 px-5 py-4 backdrop-blur">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex min-w-0 items-start gap-3">
                        <span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-teal-500 to-cyan-500 text-lg font-bold text-white shadow-[0_16px_28px_-18px_rgba(6,182,212,0.6)]">
                          {{ businessInitials({ business_name: latestBookingRequest.business_name }) }}
                        </span>
                        <div class="min-w-0">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest Booking</p>
                          <p class="mt-1 text-lg font-bold text-slate-900">Full Details</p>
                          <p class="mt-1 line-clamp-1 text-sm text-slate-500">
                            {{ latestBookingRequest.business_name }} · {{ latestBookingRequest.service_type || 'N/A' }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="hidden rounded-full border border-teal-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
                          View Ready
                        </span>
                        <span class="hidden rounded-full px-3 py-1 text-[11px] font-semibold sm:inline-flex" :class="statusClass(latestBookingRequest)">
                          {{ prettyStatus(latestBookingRequest) }}
                        </span>
                        <button
                          type="button"
                          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                          @click="showLatestBookingDetails = false"
                          aria-label="Close"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="max-h-[78vh] overflow-auto p-5">
                    <section class="rounded-[24px] border border-teal-100 bg-[linear-gradient(160deg,#ffffff_0%,#f3fffd_50%,#edf9ff_100%)] p-5 shadow-[0_18px_40px_-34px_rgba(13,148,136,0.35)]">
                      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                              Full Booking Record
                            </span>
                            <span class="inline-flex rounded-full border border-teal-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                              Schedule Ready
                            </span>
                          </div>
                          <h3 class="mt-3 text-[1.4rem] font-black tracking-tight text-slate-900">
                            {{ latestBookingRequest.business_name }}
                          </h3>
                          <p class="mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.25em] text-slate-500">
                            {{ String(latestBookingRequest.service_type || 'Service').toUpperCase() }}
                          </p>
                          <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                            Review the booking details, assigned team or provider, procurement progress, finance approval, and dispatch readiness in one clean summary.
                          </p>
                          <p class="mt-3 text-sm font-medium text-slate-500">
                            {{ requestScheduleLabel(latestBookingRequest) }}
                          </p>
                        </div>

                        <div class="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
                          <span class="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm" :class="statusClass(latestBookingRequest)">
                            {{ prettyStatus(latestBookingRequest) }}
                          </span>
                          <span class="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                            Stage {{ userCurrentStep(latestBookingRequest) }}/{{ userTotalSteps(latestBookingRequest) }}
                          </span>
                          <span class="inline-flex rounded-full border border-teal-100 bg-white/90 px-3 py-1 text-[11px] font-semibold text-teal-700 shadow-sm">
                            {{ userProgressPercent(latestBookingRequest) }}% progress
                          </span>
                        </div>
                      </div>
                    </section>

                    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex items-start gap-3">
                          <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                              <path d="M6.5 7.5h11A1.5 1.5 0 0 1 19 9v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 15V9a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="1.8"/>
                              <path d="M5 10.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                            </svg>
                          </span>
                          <div class="min-w-0">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Service Type</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ latestBookingRequest.service_type || 'N/A' }}</p>
                          </div>
                        </div>
                      </div>

                      <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex items-start gap-3">
                          <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                              <path d="M7 4.75v2.5M17 4.75v2.5M4.75 9.5h14.5M6.5 6.75h11A1.75 1.75 0 0 1 19.25 8.5v9A1.75 1.75 0 0 1 17.5 19.25h-11A1.75 1.75 0 0 1 4.75 17.5v-9A1.75 1.75 0 0 1 6.5 6.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </span>
                          <div class="min-w-0">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestScheduleLabel(latestBookingRequest) }}</p>
                          </div>
                        </div>
                      </div>

                      <div class="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex items-start gap-3">
                          <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                              <path d="M7.25 8.75h9.5M7.25 12h9.5M7.25 15.25h5.5M6.75 4.75h10.5A1.75 1.75 0 0 1 19 6.5v11A1.75 1.75 0 0 1 17.25 19.25H6.75A1.75 1.75 0 0 1 5 17.5v-11A1.75 1.75 0 0 1 6.75 4.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </span>
                          <div class="min-w-0">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Provider</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">
                              {{ latestBookingRequest.service_provider?.name || latestBookingRequest.assigned_employee_name || requestedTeamLabel(latestBookingRequest) || 'N/A' }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="mt-4 space-y-4">
                      <section class="rounded-[24px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Request Setup</p>
                            <p class="mt-1 text-sm text-slate-600">All request information submitted during the booking form.</p>
                          </div>
                          <span class="inline-flex w-fit rounded-full border border-teal-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            Submitted Details
                          </span>
                        </div>

                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Request Category</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestCategoryLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Customer Setup</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestCustomerSetupLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Type of Place</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestPropertyClassificationLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Requested Team / Provider</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">
                              {{ latestBookingRequest.service_provider?.name || latestBookingRequest.assigned_employee_name || requestedTeamLabel(latestBookingRequest) || 'N/A' }}
                            </p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestScheduleLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Estimated Truckloads</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ Number(latestBookingRequest.estimated_truckloads || 0) > 0 ? latestBookingRequest.estimated_truckloads : 'N/A' }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Truck Load Volume</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestTruckLoadVolumeLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <div class="flex items-center justify-between gap-3">
                              <div>
                                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
                                <p class="mt-2 text-sm font-medium text-slate-500">Current request stage</p>
                              </div>
                              <span class="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold" :class="statusClass(latestBookingRequest)">
                                {{ prettyStatus(latestBookingRequest) }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section class="rounded-[24px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Summary</p>
                            <p class="mt-1 text-sm text-slate-600">Charges, settlement method, and any invoice-related payment status.</p>
                          </div>
                          <span class="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {{ paymentStatusLabel(latestBookingRequest) }}
                          </span>
                        </div>

                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Method</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ paymentMethodLabel(latestBookingRequest.payment_method) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Channel</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ latestBookingRequest.payment_channel ? paymentChannelLabel(latestBookingRequest.payment_channel) : 'Not required' }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Amount to Pay</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestAmountToPayLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Reference</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ receiptReferenceLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Downpayment Amount</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ Number(latestBookingRequest.downpayment_amount || 0) > 0 ? money(latestBookingRequest.downpayment_amount) : 'N/A' }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Remaining / Final Amount</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestFinalAmountLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Terms</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ latestBookingRequest.payment_terms ? humanizeTaggedWords(latestBookingRequest.payment_terms) : 'N/A' }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Due Days</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ Number(latestBookingRequest.payment_due_days || 0) > 0 ? `${latestBookingRequest.payment_due_days} day(s)` : 'N/A' }}</p>
                          </div>
                        </div>
                      </section>

                      <section class="rounded-[24px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Location And Contact</p>
                            <p class="mt-1 text-sm text-slate-600">Service site address, contact information, access notes, and place references.</p>
                          </div>
                          <a
                            v-if="latestBookingRequest.address_text || (latestBookingRequest.latitude && latestBookingRequest.longitude)"
                            :href="latestBookingRequest.latitude && latestBookingRequest.longitude ? mapLink(latestBookingRequest.latitude, latestBookingRequest.longitude) : searchMapLink(latestBookingRequest.address_text)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex w-fit items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Open in Google Maps
                          </a>
                        </div>

                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4 md:col-span-2 xl:col-span-4">
                            <div class="flex items-start justify-between gap-3">
                              <div>
                                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Full Service Address</p>
                                <p class="mt-2 text-sm font-semibold leading-7 text-slate-800">{{ latestBookingRequest.address_text || 'N/A' }}</p>
                              </div>
                              <span class="inline-flex rounded-full border border-teal-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                Service Site
                              </span>
                            </div>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contact Number</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ displayContactNumber(latestBookingRequest.contact_number) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Landmark</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestLandmarkLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operating Hours</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestTaggedSentenceLabel(latestBookingRequest, 'OPERATING_HOURS') }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Site Access Notes</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestTaggedSentenceLabel(latestBookingRequest, 'SITE_ACCESS_NOTES') }}</p>
                          </div>
                        </div>
                      </section>

                      <section class="rounded-[24px] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Extra Request Notes</p>
                          <p class="mt-1 text-sm text-slate-600">Supporting details captured during the request review step.</p>
                        </div>

                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contract Or Account Code</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestContractReferenceLabel(latestBookingRequest) }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Septic Tank Notes</p>
                            <p class="mt-2 text-sm font-semibold leading-6 text-slate-800">{{ requestTaggedSentenceLabel(latestBookingRequest, 'SEPTIC_TANK_CONDITION') }}</p>
                          </div>
                          <div class="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4 md:col-span-2">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Additional Notes</p>
                            <p class="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-800">{{ (cleanedRequestNotes(latestBookingRequest.notes || '') || '').trim() || 'N/A' }}</p>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div class="mt-4 rounded-[24px] border border-teal-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fffd_48%,#eefcff_100%)] p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)]">
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow Tracker</p>
                          <p class="mt-2 text-sm text-slate-600">
                            Follow how your request moves from CSR validation to Operations review, materials coordination, finance approval, dispatch readiness, and completion with active warranty.
                          </p>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            Stage {{ userCurrentStep(latestBookingRequest) }}/{{ userTotalSteps(latestBookingRequest) }}
                          </span>
                          <span class="rounded-full px-3 py-1 text-[11px] font-semibold" :class="statusClass(latestBookingRequest)">
                            {{ userProgressPercent(latestBookingRequest) }}%
                          </span>
                        </div>
                      </div>

                      <div class="mt-4">
                        <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="userProgressBarClass(latestBookingRequest)"
                            :style="{ width: `${userProgressPercent(latestBookingRequest)}%` }"
                          ></div>
                        </div>
                      </div>

                      <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        <button
                          v-for="step in userTimeline(latestBookingRequest)"
                          :key="`latest-${step.key}`"
                          type="button"
                          class="flex min-h-[54px] items-center justify-between gap-3 rounded-[18px] px-3.5 py-3 text-left text-[11px] font-semibold transition"
                          :class="timelineClass(step.state)"
                          :title="userStageDescription(step.key)"
                          @click="openUserStageInfo(step.key, latestBookingRequest)"
                        >
                          <span class="min-w-0">
                            <span class="block text-[10px] uppercase tracking-[0.16em] opacity-70">Stage {{ step.order }}</span>
                            <span class="mt-1 block text-sm font-semibold tracking-normal opacity-100">{{ step.label }}</span>
                          </span>
                          <span class="shrink-0 rounded-full border border-current/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]">
                            {{ step.state === 'done' ? 'Done' : (step.state === 'current' ? 'Now' : 'Next') }}
                          </span>
                        </button>
                      </div>
                      <p class="mt-3 text-[11px] text-slate-500">
                        Last status update: {{ formatDateTime(latestBookingRequest.updated_at || latestBookingRequest.created_at) }}
                      </p>
                    </div>

                    <div class="mt-4 flex justify-end">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        @click="showLatestBookingDetails = false"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No request submitted yet.
          </div>
        </section>

        <section v-if="isApproved && section==='bookingReview'" class="space-y-6">
          <div class="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Step 3</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">Request Status and Team Review</h2>
                <p class="mt-1 text-sm text-slate-600">Track review updates, scheduling progress, and assigned team decisions.</p>
              </div>
              <button
                type="button"
                class="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="fetchServiceRequests"
              >
                Refresh Status
              </button>
            </div>
          </div>

          <div v-if="bookingReviewRequests.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No booking review records yet.
          </div>
          <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article
              v-for="req in bookingReviewRequests.slice(0, 8)"
              :key="`review-req-${req.id}`"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ req.business_name }}</p>
                  <p class="text-xs text-slate-500">{{ req.service_type || 'N/A' }}</p>
                </div>
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(req)">
                  {{ prettyStatus(req) }}
                </span>
              </div>
              <p class="mt-2 text-xs text-slate-500">Requested at {{ formatDateTime(req.created_at) }}</p>
              <p class="mt-2 text-sm text-slate-700">{{ req.address_text || 'Address unavailable' }}</p>
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-xs text-slate-600">
                  Provider: {{ requestProviderProfile(req)?.name || 'To be assigned' }}
                </p>
                <a
                  v-if="requestLocationMapLink(req)"
                  :href="requestLocationMapLink(req)"
                  target="_blank"
                  rel="noopener"
                  class="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Open Location
                </a>
              </div>
              <p v-if="req.rejection_reason" class="mt-2 text-xs font-semibold text-rose-700">
                Reason: {{ req.rejection_reason }}
              </p>
            </article>
          </div>
        </section>

        <section v-if="isApproved && section==='inspectionDeployment'" class="space-y-6">
          <div class="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Step 4</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">Inspection Deployment</h2>
                <p class="mt-1 text-sm text-slate-600">Approved bookings dispatch linked employees to inspect and report issue severity.</p>
              </div>
              <button
                type="button"
                class="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="fetchServiceRequests"
              >
                Refresh Inspection
              </button>
            </div>
          </div>

          <div v-if="inspectionDeploymentRequests.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No dispatched inspections yet.
          </div>
          <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article
              v-for="req in inspectionDeploymentRequests.slice(0, 8)"
              :key="`inspect-req-${req.id}`"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ req.business_name }}</p>
                  <p class="text-xs text-slate-500">{{ req.service_type || 'N/A' }}</p>
                </div>
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(req)">
                  {{ prettyStatus(req) }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Assigned Employee</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ req.assigned_employee_name || 'Waiting for assignment' }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Inspection Result</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ inspectionResultLabel(req.inspection_result, req.status) }}</p>
                </div>
              </div>
              <div class="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-sky-700">Live Field Update</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ liveReportStageLabel(req) }}</p>
                <p v-if="req.completion_review_status === 'pending'" class="mt-1 text-xs text-sky-700">
                  Operations is reviewing the submitted completion report before the job is closed.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section v-if="isApproved && section==='paymentDetermination'" class="space-y-6">
          <div class="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Step 5</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">Payment Determination</h2>
                <p class="mt-1 text-sm text-slate-600">Final billing is released after inspection and service completion are recorded.</p>
              </div>
              <button
                type="button"
                class="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="fetchServiceRequests"
              >
                Refresh Payments
              </button>
            </div>
          </div>

          <div v-if="paymentDeterminationRequests.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No payment records yet.
          </div>
          <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article
              v-for="req in paymentDeterminationRequests.slice(0, 8)"
              :key="`payment-req-${req.id}`"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ req.business_name }}</p>
                  <p class="text-xs text-slate-500">{{ req.service_type || 'N/A' }}</p>
                </div>
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(req)">
                  {{ prettyStatus(req) }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Amount</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ requestFinalAmountLabel(req) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Payment Status</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ paymentStatusLabel(req) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Method</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ paymentMethodLabel(req.payment_method) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">Channel</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ paymentChannelLabel(req.payment_channel) }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-xs text-slate-500">Pay only when service is properly completed.</p>
                <a
                  v-if="canOpenInvoice(req)"
                  :href="invoiceViewUrl(req)"
                  class="text-xs font-semibold text-teal-700 hover:underline"
                  @click.prevent="openInvoice(req)"
                >
                  Open Invoice
                </a>
              </div>
            </article>
          </div>
        </section>

        <section v-if="isApproved && section==='warrantyHandling'" class="space-y-6">
          <div class="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Step 6</p>
                <h2 class="mt-1 text-2xl font-bold text-slate-900">Warranty Handling</h2>
                <p class="mt-1 text-sm text-slate-600">A two-week warranty applies after completion. Reinspection and repair are free within warranty.</p>
              </div>
              <button
                type="button"
                class="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="fetchServiceRequests"
              >
                Refresh Warranty
              </button>
            </div>
          </div>

          <div v-if="warrantyHandlingRequests.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No warranty records yet.
          </div>
          <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article
              v-for="req in warrantyHandlingRequests.slice(0, 8)"
              :key="`warranty-req-${req.id}`"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ req.business_name }}</p>
                  <p class="text-xs text-slate-500">{{ req.service_type || 'N/A' }}</p>
                </div>
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(req)">
                  {{ prettyStatus(req) }}
                </span>
              </div>
              <div class="mt-3 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-cyan-700">Warranty Status</p>
                <p class="mt-1 text-sm font-semibold text-cyan-900">{{ warrantyStatusLabel(req) }}</p>
                <p v-if="req.warranty_expires_at" class="mt-1 text-xs text-cyan-700">
                  Expires: {{ formatDateTime(req.warranty_expires_at) }} ({{ warrantyDaysLeft(req) }} day/s left)
                </p>
              </div>
              <div class="mt-3 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs text-slate-500">No additional fee is charged for valid warranty claims.</p>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      v-if="canLeaveFeedback(req)"
                      type="button"
                      class="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                      @click="openFeedbackModal(req)"
                    >
                      Leave Feedback
                    </button>
                    <button
                      v-if="canClaimWarranty(req)"
                      type="button"
                      class="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
                      @click="claimWarranty(req)"
                    >
                      Claim Warranty
                    </button>
                  </div>
                </div>
                <div v-if="req.feedback" class="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Customer Feedback</p>
                  <p class="mt-1 text-sm font-semibold text-slate-900">{{ Number(req.feedback.rating || 0) }}/5 rating</p>
                  <p v-if="req.feedback.feedback" class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{{ req.feedback.feedback }}</p>
                  <p class="mt-1 text-[11px] text-amber-700">Submitted {{ formatDateTime(req.feedback.submitted_at) }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- PROFILE -->
        <section v-if="isApproved && section==='notifications'" class="space-y-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Notifications</h2>
            <button @click="fetchNotifications" class="text-xs font-semibold text-teal-700 hover:underline">
              Refresh
            </button>
          </div>
          <div v-if="notifications.length === 0" class="bg-white rounded-2xl shadow-md p-6 text-gray-500">
            Loading notifications...
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="n in notifications"
              :key="n.id"
              class="bg-white rounded-xl shadow-sm border p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
              @click="handleNotificationClick(n)"
            >
              <div class="w-2 h-2 mt-2 rounded-full" :class="n.read_at ? 'bg-gray-300' : 'bg-teal-500'"></div>
              <div class="flex-1">
                <p class="font-semibold text-gray-800">{{ n.title }}</p>
                <p class="text-sm text-gray-600">{{ n.message }}</p>
                <p v-if="n.rejection_reason" class="mt-1 text-xs font-semibold text-rose-700">
                  Reason: {{ n.rejection_reason }}
                </p>
                <div class="mt-1 flex items-center justify-between gap-3">
                  <p class="text-xs text-gray-400">{{ n.created_at }}</p>
                  <button
                    type="button"
                    class="text-xs font-semibold"
                    :class="n.read_at ? 'text-gray-400 cursor-default' : 'text-teal-700 hover:underline'"
                    :disabled="!!n.read_at"
                    @click.stop="markRead(n.id)"
                  >
                    {{ n.read_at ? 'Read' : 'Mark as read' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="section==='profile'" class="space-y-6">
          <div class="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 p-6 shadow-[0_24px_60px_-28px_rgba(13,148,136,0.55)]">
            <div class="absolute -top-6 -right-10 h-32 w-32 rounded-full bg-white/20"></div>
            <div class="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/15"></div>
            <div class="relative flex flex-col gap-6 text-white md:flex-row md:items-center">
              <img
                v-if="safeProfileImageUrl"
                :src="safeProfileImageUrl"
                alt="Profile"
                class="h-20 w-20 rounded-2xl border border-white/30 bg-white/20 object-cover"
                @error="handleProfileImageError"
              />
              <div v-else class="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
                {{ userInitials }}
              </div>
              <div class="flex-1">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">
                  Customer Account
                </div>
                <h2 class="mt-3 text-2xl font-bold tracking-tight">My Profile</h2>
                <p class="mt-1 max-w-xl text-sm text-white/85">Manage your account details, review your contact information, and track your partner application status in one place.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-if="appStatus.pending" class="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">Pending</span>
                <span v-else-if="appStatus.rejected" class="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">Rejected</span>
                <span v-else-if="appStatus.approved" class="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">Approved</span>
                <span v-else class="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">Ready to Update</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)]">
              <div class="flex items-center gap-4">
                <div class="relative h-20 w-20 shrink-0">
                  <img
                    :src="profileCardImageUrl"
                    class="h-20 w-20 cursor-zoom-in rounded-2xl border border-gray-100 object-cover shadow-sm"
                    @error="handleProfileImageError"
                    @click="openImageZoom(profileCardImageUrl)"
                  />
                  <button
                    type="button"
                    class="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white shadow hover:bg-sky-700 disabled:opacity-60"
                    :disabled="cardPhotoUploading"
                    @click="triggerCardPhotoPicker"
                    title="Change profile photo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true">
                      <path d="M4 8h3l1.2-2h7.6L17 8h3v10H4V8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                      <circle cx="12" cy="13" r="3.5" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                  </button>
                  <input
                    ref="cardPhotoInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleCardProfilePhotoUpload"
                  />
                </div>
                <div>
                  <h3 class="text-2xl font-bold tracking-tight text-gray-800">{{ authUser.first_name }} {{ authUser.last_name }}</h3>
                  <p class="text-sm font-medium text-teal-700">Customer Account</p>
                  <p class="mt-1 text-xs text-gray-400">Click the image to zoom. Use the camera icon to upload a new photo.</p>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Account Type</p>
                  <p class="mt-1 text-sm font-semibold text-slate-800">Customer</p>
                </article>
                <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Profile Status</p>
                  <p class="mt-1 text-sm font-semibold" :class="userAccountStatusClass">
                    {{ userAccountStatusLabel }}
                  </p>
                </article>
                <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Partner Status</p>
                  <p class="mt-1 text-sm font-semibold text-slate-800">
                    {{ appStatus.pending ? 'Pending Review' : appStatus.rejected ? 'Rejected' : appStatus.approved ? 'Approved' : 'Optional' }}
                  </p>
                </article>
              </div>

              <div class="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p class="text-xs text-gray-400">Contact Number</p>
                  <p class="mt-1 font-semibold text-gray-800">{{ displayContactNumber(authUser.contact_number) }}</p>
                </div>
                <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p class="text-xs text-gray-400">Email</p>
                  <p class="mt-1 font-semibold text-gray-800">{{ authUser.email || 'N/A' }}</p>
                </div>
                <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2">
                  <div v-if="userAccountReviewMessage" class="mb-4 rounded-2xl border px-4 py-3 text-sm" :class="isAccountCorrectionRequired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'">
                    <p class="font-semibold">Account Review Note</p>
                    <p class="mt-1">{{ userAccountReviewMessage }}</p>
                  </div>
                  <div v-if="isAccountCorrectionRequired" class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Upload a new valid Government ID below. Once submitted, your account goes back to pending review and appears again in the admin review table.
                  </div>
                  <div v-else-if="hasAccountResubmission && !isApproved" class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Your latest replacement Government ID is already under review. You can upload another file only if the admin rejects this review again.
                  </div>
                  <p class="text-base font-bold text-gray-800">Submit Document</p>
                  <p class="mt-1 text-sm text-gray-500">
                    {{ canSubmitGovernmentIdReplacement
                      ? 'Upload an updated Government ID here if your account needs another document review.'
                      : 'The latest replacement file is already queued for admin review. Upload stays locked until the account is rejected again.' }}
                  </p>
                  <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Existing Document</p>
                      <p class="mt-3 text-sm text-slate-500">Government ID stored on the account right now.</p>
                      <p class="mt-3 break-all font-semibold text-slate-800">{{ currentGovernmentIdName }}</p>
                      <button
                        v-if="idPreviewUrl && isIdImage"
                        type="button"
                        class="mt-3 inline-flex items-center text-sm font-semibold text-teal-700 hover:underline"
                        @click="openImageZoom(idPreviewUrl)"
                      >
                        Preview existing document from database
                      </button>
                      <p v-else class="mt-3 text-sm text-slate-400">No image preview available for the existing file.</p>
                    </article>
                    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">New Document</p>
                      <p class="mt-3 text-sm text-slate-500">
                        {{ selectedGovernmentId ? 'Attach the new Government ID you want to submit for review.' : activeNewGovernmentIdName ? 'This is the latest Government ID you submitted for review in this session.' : 'Attach the new Government ID you want to submit for review.' }}
                      </p>
                      <p class="mt-3 break-all font-semibold text-slate-800">{{ activeNewGovernmentIdName || 'No new document selected yet' }}</p>
                      <button
                        v-if="activeNewGovernmentIdPreviewUrl"
                        type="button"
                        class="mt-3 inline-flex items-center text-sm font-semibold text-teal-700 hover:underline"
                        @click="openImageZoom(activeNewGovernmentIdPreviewUrl)"
                      >
                        {{ selectedGovernmentId ? 'Preview selected new document' : 'Preview last submitted document' }}
                      </button>
                      <p v-else class="mt-3 text-sm text-slate-400">Select a new image document to preview it here.</p>
                    </article>
                  </div>
                  <div v-if="canSubmitGovernmentIdReplacement" class="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      ref="governmentIdInput"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                      class="hidden"
                      @change="handleGovernmentIdSelection"
                    />
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-white px-4 py-2.5 font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
                      @click="triggerGovernmentIdPicker"
                    >
                      Attach Document
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="!selectedGovernmentId || governmentIdUploading"
                      @click="submitGovernmentId"
                    >
                      {{ governmentIdUploading ? 'Uploading...' : isAccountCorrectionRequired ? 'Resubmit Government ID' : 'Upload Document' }}
                    </button>
                    <button
                      v-if="selectedGovernmentId"
                      type="button"
                      class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                      @click="clearSelectedGovernmentId"
                    >
                      Clear Selected File
                    </button>
                  </div>
                  <div v-else class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Admin is reviewing the latest Government ID you submitted. You can send another replacement only after the admin rejects this current review.
                  </div>
                </div>
                <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2">
                  <p class="text-xs text-gray-400">Location</p>
                  <a :href="mapLink(authUser.latitude, authUser.longitude)" target="_blank" class="mt-1 inline-block font-semibold text-teal-700 hover:underline">
                    View Location
                  </a>
                </div>
              </div>

              <div class="mt-6 flex flex-col gap-3 md:flex-row">
                <button @click="openAccountModal" class="inline-flex flex-1 items-center justify-center rounded-2xl bg-teal-600 py-3 text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700 font-semibold">
                  Edit Profile
                </button>
                <button v-if="!appStatus.pending && (!appStatus.hasApplied || appStatus.rejected)"
                        @click="openApplyModal"
                        class="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-500 py-3 text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-600 font-semibold">
                  Apply as Accredited Partner
                </button>
              </div>
            </div>

            <div class="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)]">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Application</p>
                <h4 class="mt-1 text-xl font-semibold tracking-tight text-gray-800">Accredited Partner Status</h4>
                <p class="mt-1 text-sm text-gray-500">This section is optional and only applies if you want to join as an external accredited partner.</p>
              </div>

              <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p class="text-xs text-gray-400">Status</p>
                <p v-if="appStatus.pending" class="mt-1 font-semibold text-amber-600">Pending Review</p>
                <p v-else-if="appStatus.rejected" class="mt-1 font-semibold text-rose-600">Rejected</p>
                <p v-else-if="appStatus.approved" class="mt-1 font-semibold text-emerald-600">Approved</p>
                <p v-else class="mt-1 font-semibold text-gray-600">No application yet</p>
                <p v-if="appStatus.rejected && appStatus.reject_reason" class="mt-2 text-sm text-gray-600">
                  Reason: {{ appStatus.reject_reason }}
                </p>
              </div>

              <div v-if="appStatus.hasApplied" class="rounded-2xl border border-gray-100 bg-white p-4">
                <p class="text-xs text-gray-400">Category</p>
                <p class="font-semibold text-gray-800 mt-1 capitalize">{{ spDetails.category || 'N/A' }}</p>
                <p class="text-xs text-gray-400 mt-3">Experience</p>
                <p class="font-semibold text-gray-800 mt-1">{{ spDetails.experience_years || '0' }} years</p>
                <p class="text-xs text-gray-400 mt-3">Description</p>
                <p class="text-sm text-gray-700 mt-1">{{ spDetails.service_description || 'N/A' }}</p>
              </div>

              <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p class="text-sm font-semibold text-slate-700">No active partner application</p>
                <p class="mt-1 text-sm leading-6 text-slate-500">
                  You can keep using your customer account as usual. Apply only if you want to be reviewed as an accredited external partner.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div
      v-if="showImageZoom && zoomImageUrl"
      class="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
      @click="closeImageZoom"
    >
      <button
        type="button"
        class="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/15 text-white hover:bg-white/25 text-xl leading-none"
        @click.stop="closeImageZoom"
      >
        &times;
      </button>
      <img
        :src="zoomImageUrl"
        alt="Profile zoom"
        class="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
        @click.stop
      />
    </div>

      <div v-if="showServiceRequestModal" class="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4">
      <div class="mx-auto flex h-full w-full max-w-4xl flex-col">
        <div class="mb-1 flex justify-end">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white hover:bg-white/30"
            @click="closeServiceRequestModal"
            aria-label="Close request form"
          >
            &times;
          </button>
        </div>
        <div class="flex-1 overflow-y-auto rounded-3xl shadow-2xl">
          <ServiceRequest
            :team-context="serviceRequestContext"
            :embedded="true"
            @close="closeServiceRequestModal"
            @submitted="handleEmbeddedRequestSubmitted"
          />
        </div>
      </div>
    </div>

    <!-- ACCOUNT MODAL -->
    <div v-if="showAccountModal" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm sm:items-center">
      <div class="relative my-4 w-full max-w-xl rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.42)] sm:max-h-[92vh] sm:overflow-y-auto">
        <button
          class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-gray-400 transition hover:bg-slate-200 hover:text-gray-700"
          @click="closeAccountModal"
        >
          &times;
        </button>
        <div class="mb-5">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Profile Settings</p>
          <h3 class="mt-1 text-2xl font-bold tracking-tight text-gray-800">Edit Profile</h3>
          <p class="text-sm text-gray-500">Update your basic account details and choose a profile photo if needed.</p>
        </div>
        <form @submit.prevent="updateProfile" class="space-y-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="flex flex-col sm:col-span-2">
              <label class="mb-1 text-sm font-medium text-gray-600">First Name</label>
              <input v-model="authUser.first_name" placeholder="First Name" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" />
            </div>
            <div class="flex flex-col">
              <label class="mb-1 text-sm font-medium text-gray-600">M.I.</label>
              <input v-model="authUser.middle_initial" maxlength="1" placeholder="M" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-teal-100 focus:border-teal-500" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col">
              <label class="mb-1 text-sm font-medium text-gray-600">Last Name</label>
              <input v-model="authUser.last_name" placeholder="Last Name" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" />
            </div>
            <div class="flex flex-col">
              <label class="mb-1 text-sm font-medium text-gray-600">Contact Number</label>
              <input v-model="authUser.contact_number" placeholder="Contact Number" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" />
            </div>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label class="mb-2 block text-sm font-medium text-gray-600">Email (read-only)</label>
            <input v-model="authUser.email" disabled class="w-full cursor-not-allowed rounded-xl border border-gray-100 bg-white px-3 py-2 text-gray-500" />
          </div>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label class="mb-2 block text-sm font-medium text-gray-600">Profile Photo (optional)</label>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label class="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100">
                Choose Image
                <input type="file" accept="image/*" @change="handleProfilePhotoUpload" class="hidden" />
              </label>
              <span class="break-all text-sm text-gray-500">
                {{ selectedProfilePhotoName }}
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-500">Use an image file up to 50MB. The selected photo will be uploaded when you save your profile changes.</p>
            <div class="mt-3 flex items-center gap-3">
              <img
                v-if="selectedProfilePreviewUrl"
                :src="selectedProfilePreviewUrl"
                alt="Selected profile"
                class="h-20 w-20 rounded-2xl border border-gray-200 object-cover"
              />
              <img
                v-else-if="safeProfileImageUrl"
                :src="safeProfileImageUrl"
                alt="Current profile"
                class="h-20 w-20 rounded-2xl border border-gray-200 object-cover"
                @error="handleProfileImageError"
              />
              <div v-if="selectedProfilePreviewUrl || safeProfileImageUrl" class="text-sm text-slate-500">
                Preview your current image before saving changes.
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeAccountModal" class="rounded-xl bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200">Cancel</button>
            <button type="submit" :disabled="isSavingProfile" class="rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
              {{ isSavingProfile ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- APPLY MODAL -->
    <div v-if="showApplyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div class="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.42)]">
        <button
          class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-gray-400 transition hover:bg-slate-200 hover:text-gray-700"
          @click="closeApplyModal"
        >
          &times;
        </button>
        <div class="mb-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Optional Application</p>
          <h3 class="mt-1 text-xl font-bold text-gray-800">Apply as Accredited Partner</h3>
          <p class="text-sm text-gray-500">Fill in the details below if you want your account reviewed as an external partner.</p>
        </div>
        <form @submit.prevent="submitServiceProvider" class="space-y-4">
          <div>
            <label class="text-sm text-gray-600 mb-1 block">Select Business</label>
            <select v-model="spForm.business_id" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required>
              <option value="" disabled>Select Your Business</option>
              <option v-for="b in businesses" :key="b.id" :value="b.id">{{ b.business_name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600 mb-1 block">Category</label>
              <input
                :value="selectedBusinessCategoryLabel || 'Select business first'"
                type="text"
                readonly
                class="w-full border border-gray-100 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label class="text-sm text-gray-600 mb-1 block">Experience (years)</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="adjustExperience(-1)"
                  class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  readonly
                  v-model="spForm.experience_years"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                  required
                />
                <button
                  type="button"
                  @click="adjustExperience(1)"
                  class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700"
                >
                  +
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-1">Use the + / - buttons to set years.</p>
            </div>
          </div>
          <div>
            <label class="text-sm text-gray-600 mb-1 block">Service Description</label>
            <textarea v-model="spForm.service_description" rows="4" class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-100 focus:border-teal-500" required></textarea>
          </div>
          <div>
            <label class="text-sm text-gray-600 mb-1 block">Valid ID (Read-only)</label>
            <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm text-gray-700">
                  {{ idFileName || 'No uploaded ID found' }}
                </span>
                <a
                  v-if="idPreviewUrl"
                  :href="idPreviewUrl"
                  target="_blank"
                  class="text-xs font-semibold text-teal-700 hover:underline"
                >
                  View File
                </a>
              </div>
              <img
                v-if="idPreviewUrl && isIdImage"
                :src="idPreviewUrl"
                alt="Valid ID"
                class="mt-2 h-24 w-auto rounded border border-gray-200 object-cover"
              />
            </div>
            <p class="text-xs text-gray-400 mt-1">ID file is fixed and cannot be edited here.</p>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeApplyModal" class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">Submit Application</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import Swal from '@/lib/sweetalert-toast-shim'
import { resolveStoredFileUrl, stripFileQuery } from '@/lib/file-url'
import { router } from '@inertiajs/vue3'
import { onAuthStateChanged } from 'firebase/auth'
import { onValue, ref as realtimeRef } from 'firebase/database'
import { firebaseAuth, firebaseConfigReady, realtimeDb } from '@/firebase/client'
import L from 'leaflet'
import { createToastInterface, POSITION } from 'vue-toastification'
import { confirmAndLogout } from '@/lib/auth-flow'
import { CAVITE_BARANGAYS_BY_CODE } from '@/data/caviteBarangaysFallback'
import { clearProfileResubmission, hasLocalResubmission, markProfileResubmitted } from '@/lib/profile-resubmission'
import {
  WORKFLOW_TRACKER_FLOW,
  WORKFLOW_TRACKER_LABELS,
  requestWorkflowDescription,
  requestWorkflowKey,
} from '@/lib/request-workflow'
import ServiceRequest from '@/Pages/User/ServiceRequest.vue'

/* STATE */
const allowedSections = [
  'dashboard',
  'spProfile',
  'bookingRequest',
  'bookingReview',
  'inspectionDeployment',
  'paymentDetermination',
  'warrantyHandling',
  'notifications',
  'profile',
]
const normalizeSection = (value) => {
  const next = String(value || '').trim()
  if (next === 'myRequests') return 'bookingRequest'
  return allowedSections.includes(next) ? next : 'spProfile'
}
const getSectionFromUrl = () => {
  if (typeof window === 'undefined') return 'spProfile'
  const params = new URLSearchParams(window.location.search)
  return normalizeSection(params.get('section'))
}
const normalizeStatusKey = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
const normalizeApprovalFlag = (value) => {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'approved', 'active'].includes(normalized)) return true
  if (['0', 'false', 'no', '', 'pending', 'rejected', 'archived', 'deleted'].includes(normalized)) return false
  return Boolean(value)
}
const trimReviewText = (value) => String(value ?? '').trim()
const classifyAccountReviewKind = (value = {}) => {
  const explicitKind = normalizeStatusKey(value.latest_account_review_kind || value.kind || '')
  if (['approved', 'rejected', 'deleted', 'resubmitted'].includes(explicitKind)) return explicitKind

  const title = trimReviewText(value.latest_account_review_title || value.title).toLowerCase()
  const message = trimReviewText(value.latest_account_review_message || value.message).toLowerCase()
  const text = `${title}\n${message}`

  if (!text.trim()) return ''
  if (
    text.includes('resubmitted')
    || text.includes('submitted for review')
    || text.includes('updated government id was submitted')
    || text.includes('updated documents were submitted')
    || text.includes('submitted updated documents for review')
  ) {
    return 'resubmitted'
  }
  if (text.includes('deleted')) return 'deleted'
  if (text.includes('rejected')) return 'rejected'
  if (text.includes('approved') || text.includes('unlocked')) return 'approved'
  return ''
}
const hasServerResubmissionSignalForProfile = (profile = {}) => {
  const reviewAt = trimReviewText(profile.latest_account_review_at)
  const reviewKind = classifyAccountReviewKind(profile)
  const reviewTitle = trimReviewText(profile.latest_account_review_title || profile.title).toLowerCase()
  const reviewMessage = trimReviewText(profile.latest_account_review_message || profile.message).toLowerCase()
  const resubmittedAt = trimReviewText(profile.document_resubmitted_at)
  const hasStoredResubmissionFile = Boolean(
    trimReviewText(profile.government_id_resubmission || profile.government_id_resubmission_url)
  )
  const resubmittedTime = resubmittedAt ? new Date(resubmittedAt).getTime() : NaN
  const reviewTime = reviewAt ? new Date(reviewAt).getTime() : NaN
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
    || reviewMessage.includes('updated government id')
    || reviewMessage.includes('updated documents were submitted')
    || reviewMessage.includes('submitted for review')
    || resubmittedAfterReview
    || hasStoredResubmissionFile
  )
}
const hasAccountResubmissionSignalForProfile = (profile = {}) => {
  const reviewAt = trimReviewText(profile.latest_account_review_at)
  return hasServerResubmissionSignalForProfile(profile) || hasLocalResubmission(profile, reviewAt)
}
const syncLocalResubmissionState = (profile = {}) => {
  if (hasServerResubmissionSignalForProfile(profile)) {
    const timestamp = trimReviewText(profile.document_resubmitted_at || profile.latest_account_review_at)
    if (timestamp) {
      markProfileResubmitted(profile, timestamp)
    }
    return
  }
  clearProfileResubmission(profile)
}
const computeAccountApprovalStateForProfile = (profile = {}) => {
  const status = normalizeStatusKey(profile.status || profile.approval_status)
  const hasResubmission = hasAccountResubmissionSignalForProfile(profile)

  if (status === 'deleted') return hasResubmission ? 'pending' : 'deleted'
  if (status === 'rejected') return hasResubmission ? 'pending' : 'rejected'
  if (['pending', 'pending_approval'].includes(status)) return 'pending'
  if (status === 'approved') return 'approved'
  return normalizeApprovalFlag(profile.is_approved) ? 'approved' : 'pending'
}
const hasValidAccountReviewPayload = (profile = {}) => {
  const createdAt = trimReviewText(profile.latest_account_review_at)
  const title = trimReviewText(profile.latest_account_review_title || profile.title)
  const message = trimReviewText(profile.latest_account_review_message || profile.message)
  const reviewKind = classifyAccountReviewKind(profile)
  const accountState = computeAccountApprovalStateForProfile(profile)
  const hasResubmission = hasAccountResubmissionSignalForProfile(profile)

  if (!createdAt || !title || !message || !reviewKind) return false
  if (accountState === 'approved') return reviewKind === 'approved'
  if (accountState === 'rejected') return reviewKind === 'rejected'
  if (accountState === 'deleted') return reviewKind === 'deleted'
  if (accountState === 'pending') return hasResubmission && reviewKind === 'resubmitted'
  return false
}
const sanitizeDashboardProfile = (profile = {}) => {
  const nextProfile = {
    ...profile,
    rejection_reason: trimReviewText(profile.rejection_reason),
    rejection_checklist: Array.isArray(profile.rejection_checklist) ? profile.rejection_checklist.filter(Boolean) : [],
    latest_account_review_title: trimReviewText(profile.latest_account_review_title),
    latest_account_review_message: trimReviewText(profile.latest_account_review_message),
    latest_account_review_kind: trimReviewText(profile.latest_account_review_kind),
    latest_account_review_at: trimReviewText(profile.latest_account_review_at),
    latest_account_review_seen_at: trimReviewText(profile.latest_account_review_seen_at),
    document_resubmitted_at: trimReviewText(profile.document_resubmitted_at),
  }

  const accountState = computeAccountApprovalStateForProfile(nextProfile)

  if (!['rejected', 'deleted'].includes(accountState)) {
    nextProfile.rejection_reason = ''
    nextProfile.rejection_checklist = []
  }

  if (!hasValidAccountReviewPayload(nextProfile)) {
    nextProfile.latest_account_review_title = ''
    nextProfile.latest_account_review_message = ''
    nextProfile.latest_account_review_kind = ''
    nextProfile.latest_account_review_at = ''
    nextProfile.latest_account_review_seen_at = ''
  }

  return nextProfile
}
const isAccountReviewNotification = (note = {}) => (
  String(note?.type || note?.category || '').toLowerCase().includes('account_review')
)
const isRelevantAccountReviewNotification = (note, profile = {}) => {
  if (!isAccountReviewNotification(note)) return true
  return hasValidAccountReviewPayload({
    ...sanitizeDashboardProfile(profile),
    latest_account_review_title: trimReviewText(note?.title),
    latest_account_review_message: trimReviewText(note?.message),
    latest_account_review_kind: trimReviewText(note?.kind),
    latest_account_review_at: trimReviewText(note?.created_at),
    latest_account_review_seen_at: trimReviewText(note?.read_at),
  })
}
const setSectionInUrl = (name) => {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (name === 'spProfile') {
    url.searchParams.delete('section')
  } else {
    url.searchParams.set('section', name)
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

const section = ref(getSectionFromUrl())
const businesses = ref([])
const businessesLoading = ref(true)
const formedTeams = ref([])
const formedTeamsLoading = ref(false)
const serviceProviders = ref([])
const failedProviderAvatarIds = ref(new Set())
const serviceRequests = ref([])
const localPendingRequest = ref(null)
const showLatestBookingDetails = ref(false)
const initialStoredAuthIdentity = (() => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem('thesis_capstone_auth_profile')
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
})()
const initialDashboardProfile = (() => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem('thesis_capstone_user_dashboard_profile')
    const parsed = raw ? JSON.parse(raw) : {}
    const cache = parsed && typeof parsed === 'object' ? parsed : {}
    const authId = String(initialStoredAuthIdentity.uid || initialStoredAuthIdentity.id || '').trim().toLowerCase()
    const authEmail = String(initialStoredAuthIdentity.email || '').trim().toLowerCase()
    const cachedId = String(cache.uid || cache.id || '').trim().toLowerCase()
    const cachedEmail = String(cache.email || '').trim().toLowerCase()

    if (!authId && !authEmail) return cache
    if ((authId && cachedId && authId === cachedId) || (authEmail && cachedEmail && authEmail === cachedEmail)) {
      return cache
    }
  } catch {
    return {}
  }
  return {}
})()
const authUser = reactive({
  id: initialDashboardProfile.id || initialDashboardProfile.uid || initialStoredAuthIdentity.id || initialStoredAuthIdentity.uid || null,
  uid: initialDashboardProfile.uid || initialDashboardProfile.id || initialStoredAuthIdentity.uid || initialStoredAuthIdentity.id || '',
  first_name: initialDashboardProfile.first_name || initialStoredAuthIdentity.first_name || '',
  middle_initial: initialDashboardProfile.middle_initial || initialStoredAuthIdentity.middle_initial || '',
  last_name: initialDashboardProfile.last_name || initialStoredAuthIdentity.last_name || '',
  email: initialDashboardProfile.email || initialStoredAuthIdentity.email || '',
  contact_number: initialDashboardProfile.contact_number || initialStoredAuthIdentity.contact_number || '',
  latitude: initialDashboardProfile.latitude ?? initialStoredAuthIdentity.latitude ?? null,
  longitude: initialDashboardProfile.longitude ?? initialStoredAuthIdentity.longitude ?? null,
  government_id: initialDashboardProfile.government_id || initialStoredAuthIdentity.government_id || '',
  government_id_url: initialDashboardProfile.government_id_url || initialStoredAuthIdentity.government_id_url || '',
  government_id_meta: initialDashboardProfile.government_id_meta || initialStoredAuthIdentity.government_id_meta || null,
  government_id_resubmission: initialDashboardProfile.government_id_resubmission || initialStoredAuthIdentity.government_id_resubmission || '',
  government_id_resubmission_url: initialDashboardProfile.government_id_resubmission_url || initialStoredAuthIdentity.government_id_resubmission_url || '',
  government_id_resubmission_meta: initialDashboardProfile.government_id_resubmission_meta || initialStoredAuthIdentity.government_id_resubmission_meta || null,
  government_id_last_submitted_at: initialDashboardProfile.government_id_last_submitted_at || initialStoredAuthIdentity.government_id_last_submitted_at || '',
  government_id_last_submitted_name: initialDashboardProfile.government_id_last_submitted_name || initialStoredAuthIdentity.government_id_last_submitted_name || '',
  profile_photo: initialDashboardProfile.profile_photo || initialStoredAuthIdentity.profile_photo || '',
  profile_photo_url: initialDashboardProfile.profile_photo_url || initialStoredAuthIdentity.profile_photo_url || '',
  is_approved: normalizeApprovalFlag(initialDashboardProfile.is_approved ?? initialStoredAuthIdentity.is_approved ?? false),
  status: initialDashboardProfile.status || initialStoredAuthIdentity.status || '',
  approval_status: initialDashboardProfile.approval_status || initialStoredAuthIdentity.approval_status || '',
  rejection_reason: initialDashboardProfile.rejection_reason || initialStoredAuthIdentity.rejection_reason || '',
  rejection_checklist: Array.isArray(initialDashboardProfile.rejection_checklist)
    ? initialDashboardProfile.rejection_checklist
    : (Array.isArray(initialStoredAuthIdentity.rejection_checklist) ? initialStoredAuthIdentity.rejection_checklist : []),
  document_resubmitted_at: initialDashboardProfile.document_resubmitted_at || initialStoredAuthIdentity.document_resubmitted_at || '',
  latest_account_review_title: initialDashboardProfile.latest_account_review_title || initialStoredAuthIdentity.latest_account_review_title || '',
  latest_account_review_message: initialDashboardProfile.latest_account_review_message || initialStoredAuthIdentity.latest_account_review_message || '',
  latest_account_review_kind: initialDashboardProfile.latest_account_review_kind || initialStoredAuthIdentity.latest_account_review_kind || '',
  latest_account_review_at: initialDashboardProfile.latest_account_review_at || initialStoredAuthIdentity.latest_account_review_at || '',
  latest_account_review_seen_at: initialDashboardProfile.latest_account_review_seen_at || initialStoredAuthIdentity.latest_account_review_seen_at || '',
})
Object.assign(authUser, sanitizeDashboardProfile(authUser))
syncLocalResubmissionState(authUser)
const hasAccountResubmission = computed(() => {
  return hasAccountResubmissionSignalForProfile(authUser)
})
const accountApprovalState = computed(() => computeAccountApprovalStateForProfile(authUser))
const isAccountCorrectionRequired = computed(() => ['rejected', 'deleted'].includes(accountApprovalState.value))
const isApproved = computed(() => accountApprovalState.value === 'approved')
const governmentIdResubmissionLocked = computed(() => (
  accountApprovalState.value === 'pending' && hasAccountResubmission.value
))
const canSubmitGovernmentIdReplacement = computed(() => {
  if (accountApprovalState.value === 'approved') return false
  return !governmentIdResubmissionLocked.value
})
const userAccountStatusLabel = computed(() => {
  if (accountApprovalState.value === 'approved') return 'Active'
  if (accountApprovalState.value === 'deleted') return 'Deleted'
  if (accountApprovalState.value === 'rejected') return 'Rejected'
  return 'Pending Review'
})
const userAccountStatusClass = computed(() => {
  if (accountApprovalState.value === 'approved') return 'text-emerald-700'
  if (isAccountCorrectionRequired.value) return 'text-rose-700'
  return 'text-amber-700'
})
const userAccountReviewMessage = computed(() => {
  if (isAccountCorrectionRequired.value) {
    return trimReviewText(authUser.rejection_reason || authUser.latest_account_review_message)
  }
  if (hasAccountResubmission.value) {
    return trimReviewText(authUser.latest_account_review_message)
  }
  return ''
})
const userAccountReviewTitle = computed(() => {
  if (accountApprovalState.value === 'deleted') return 'Account Deleted'
  if (accountApprovalState.value === 'rejected') return 'Account Rejected'
  if (hasAccountResubmission.value) return 'Documents Resubmitted'
  return 'Account Pending Review'
})
const userAccountReviewCopy = computed(() => {
  if (accountApprovalState.value === 'deleted') {
    return 'Your customer account was removed from active use. Review the admin note, correct the profile details if needed, then upload a new valid Government ID to send the account back for review.'
  }
  if (accountApprovalState.value === 'rejected') {
    return 'Your customer account can still sign in, but booking modules stay locked until you upload a new valid Government ID from Profile and the admin reviews it again.'
  }
  if (hasAccountResubmission.value) {
    return 'Your updated Government ID was submitted again. The dashboard stays locked while the admin reviews your resubmission.'
  }
  return 'Your customer account can sign in before approval, but booking modules stay locked until the submitted Government ID is approved.'
})

const appStatus = reactive({ hasApplied:false, pending:false, rejected:false, approved:false, reject_reason:null })
const spForm = reactive({ business_id:null, category:'', experience_years:'', service_description:'' })
const spDetails = reactive({ category:'', experience_years:'', service_description:'' })
const TEAM_REQUEST_MIN_AMOUNT = 500
const TEAM_REQUEST_MAX_AMOUNT = 999999
const REQUEST_TOAST_CONTAINER_CLASS = 'request-modal-toast-container'
const REQUEST_TOAST_CLASS = 'request-modal-toast'
const REQUEST_TOAST_BODY_CLASS = 'request-modal-toast-body'
const ACCOUNT_REVIEW_NOTIFICATION_CACHE_KEY = 'thesis_capstone_account_review_notifications'
const USER_NOTIFICATION_CACHE_KEY = 'thesis_capstone_user_notifications'
const USER_DASHBOARD_PROFILE_CACHE_KEY = 'thesis_capstone_user_dashboard_profile'
const USER_DASHBOARD_BUSINESSES_CACHE_KEY = 'thesis_capstone_user_dashboard_businesses'
const AUTH_PROFILE_STORAGE_KEY = 'thesis_capstone_auth_profile'
const toast = createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  closeButton: 'button',
  showCloseButtonOnHover: false,
  pauseOnHover: true,
  containerClassName: REQUEST_TOAST_CONTAINER_CLASS,
  toastClassName: REQUEST_TOAST_CLASS,
  bodyClassName: REQUEST_TOAST_BODY_CLASS,
})
if (typeof document !== 'undefined' && !document.getElementById('request-toast-zindex-style')) {
  const style = document.createElement('style')
  style.id = 'request-toast-zindex-style'
  style.textContent = `
    .${REQUEST_TOAST_CONTAINER_CLASS} {
      z-index: 25000 !important;
    }
    .${REQUEST_TOAST_CLASS} {
      background: #111827 !important;
      color: #f8fafc !important;
      opacity: 1 !important;
      filter: none !important;
      backdrop-filter: none !important;
      transform: none !important;
      animation: none !important;
      transition: none !important;
      will-change: auto !important;
      box-shadow: 0 10px 28px rgba(2, 6, 23, 0.5) !important;
      border: 1px solid rgba(148, 163, 184, 0.35) !important;
    }
    .${REQUEST_TOAST_BODY_CLASS} {
      white-space: pre-line !important;
      font-size: 13px !important;
      line-height: 1.45 !important;
      font-weight: 600 !important;
      color: #f8fafc !important;
      opacity: 1 !important;
    }
  `
  document.head.appendChild(style)
}
const showFeedbackToast = (type, message, timeout = 2600) => {
  const handler = toast?.[type]
  if (typeof handler !== 'function' || !message) return
  if (typeof toast?.clear === 'function') {
    toast.clear()
  } else if (typeof toast?.dismiss === 'function') {
    toast.dismiss()
  }
  handler(message, {
    timeout,
    toastClassName: REQUEST_TOAST_CLASS,
    bodyClassName: REQUEST_TOAST_BODY_CLASS,
    hideProgressBar: true,
  })
}

const showToastifyAlert = (message, type = 'info') => {
  const text = String(message || '').trim()
  if (!text) return

  const backgrounds = {
    success: 'linear-gradient(135deg, #22c55e, #16a34a)',
    error: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    warning: 'linear-gradient(135deg, #f97316, #ea580c)',
    info: 'linear-gradient(135deg, #38bdf8, #2563eb)',
  }

  Toastify({
    text,
    duration: type === 'error' ? 3200 : 2400,
    gravity: 'top',
    position: 'right',
    close: true,
    stopOnFocus: true,
    style: {
      background: backgrounds[type] || backgrounds.info,
      color: '#fff',
    },
  }).showToast()
}

const isPermissionDeniedError = (error) => {
  const message = String(error?.response?.data?.error || error?.response?.data?.message || error?.message || '').toLowerCase()
  return message.includes('permission denied')
}

const readAccountReviewNotificationCache = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ACCOUNT_REVIEW_NOTIFICATION_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeAccountReviewNotificationCache = (cache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACCOUNT_REVIEW_NOTIFICATION_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // Ignore cache write failures.
  }
}

const readUserNotificationCache = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(USER_NOTIFICATION_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeUserNotificationCache = (cache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_NOTIFICATION_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // Ignore cache write failures.
  }
}

const readUserDashboardProfileCache = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(USER_DASHBOARD_PROFILE_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeUserDashboardProfileCache = (cache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_DASHBOARD_PROFILE_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // Ignore cache write failures.
  }
}

const readUserBusinessesCache = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(USER_DASHBOARD_BUSINESSES_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeUserBusinessesCache = (cache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_DASHBOARD_BUSINESSES_CACHE_KEY, JSON.stringify(Array.isArray(cache) ? cache : []))
  } catch {
    // Ignore cache write failures.
  }
}

const readStoredAuthIdentity = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const persistResolvedDashboardProfile = (profile = {}) => {
  const nextProfile = sanitizeDashboardProfile({
    id: profile.id || profile.uid || authUser.id || authUser.uid || '',
    uid: profile.uid || profile.id || authUser.uid || authUser.id || '',
    first_name: profile.first_name ?? authUser.first_name ?? '',
    middle_initial: profile.middle_initial ?? authUser.middle_initial ?? '',
    last_name: profile.last_name ?? authUser.last_name ?? '',
    email: profile.email ?? authUser.email ?? '',
    contact_number: profile.contact_number ?? authUser.contact_number ?? '',
    latitude: profile.latitude ?? authUser.latitude ?? null,
    longitude: profile.longitude ?? authUser.longitude ?? null,
    government_id: profile.government_id ?? authUser.government_id ?? '',
    government_id_url: profile.government_id_url ?? authUser.government_id_url ?? '',
    government_id_meta: profile.government_id_meta ?? authUser.government_id_meta ?? null,
    government_id_resubmission: profile.government_id_resubmission ?? authUser.government_id_resubmission ?? '',
    government_id_resubmission_url: profile.government_id_resubmission_url ?? authUser.government_id_resubmission_url ?? '',
    government_id_resubmission_meta: profile.government_id_resubmission_meta ?? authUser.government_id_resubmission_meta ?? null,
    government_id_last_submitted_at: profile.government_id_last_submitted_at ?? authUser.government_id_last_submitted_at ?? '',
    government_id_last_submitted_name: profile.government_id_last_submitted_name ?? authUser.government_id_last_submitted_name ?? '',
    profile_photo: profile.profile_photo ?? authUser.profile_photo ?? '',
    profile_photo_url: profile.profile_photo_url ?? authUser.profile_photo_url ?? '',
    is_approved: normalizeApprovalFlag(profile.is_approved ?? authUser.is_approved ?? false),
    status: profile.status ?? authUser.status ?? '',
    approval_status: profile.approval_status ?? authUser.approval_status ?? '',
    rejection_reason: profile.rejection_reason ?? authUser.rejection_reason ?? '',
    rejection_checklist: Array.isArray(profile.rejection_checklist)
      ? profile.rejection_checklist
      : (Array.isArray(authUser.rejection_checklist) ? authUser.rejection_checklist : []),
    document_resubmitted_at: profile.document_resubmitted_at ?? authUser.document_resubmitted_at ?? '',
    latest_account_review_title: profile.latest_account_review_title ?? authUser.latest_account_review_title ?? '',
    latest_account_review_message: profile.latest_account_review_message ?? authUser.latest_account_review_message ?? '',
    latest_account_review_kind: profile.latest_account_review_kind ?? authUser.latest_account_review_kind ?? '',
    latest_account_review_at: profile.latest_account_review_at ?? authUser.latest_account_review_at ?? '',
    latest_account_review_seen_at: profile.latest_account_review_seen_at ?? authUser.latest_account_review_seen_at ?? '',
  })
  writeUserDashboardProfileCache(nextProfile)
}

const applyResolvedDashboardProfile = (profile = {}, { syncNotifications = false } = {}) => {
  const previousReviewAt = trimReviewText(authUser.latest_account_review_at)
  const previousStatus = normalizeStatusKey(authUser.status || authUser.approval_status)
  const nextProfile = sanitizeDashboardProfile({
    ...authUser,
    ...(profile || {}),
  })

  Object.assign(authUser, nextProfile)
  syncLocalResubmissionState(nextProfile)
  persistResolvedDashboardProfile(nextProfile)
  profileImageFailed.value = false
  notifications.value = mergeNotificationRows(mergeProfileReviewNotification(notifications.value || []))
  notifyProfileReviewUpdate()

  if (!syncNotifications) return

  const nextReviewAt = trimReviewText(nextProfile.latest_account_review_at)
  const nextStatus = normalizeStatusKey(nextProfile.status || nextProfile.approval_status)
  if (nextReviewAt !== previousReviewAt || nextStatus !== previousStatus) {
    fetchNotifications().catch(() => {})
  }
}

const bookingReadyFormedTeams = computed(() =>
  (formedTeams.value || []).filter((team) => {
    const members = Array.isArray(team?.members) ? team.members : []
    const totalMembers = Number(team?.member_count || members.length || 0)
    const acceptedCount = Number(
      team?.accepted_count
      ?? members.filter((member) => String(member?.team_assignment_status || '').trim().toLowerCase() === 'accepted').length
    )
    const pendingCount = Number(
      team?.pending_count
      ?? members.filter((member) => String(member?.team_assignment_status || '').trim().toLowerCase() === 'pending').length
    )
    const hasRejected = members.some(
      (member) => String(member?.team_assignment_status || '').trim().toLowerCase() === 'rejected'
    )
    return totalMembers >= 3 && acceptedCount === totalMembers && pendingCount === 0 && !hasRejected
  })
)

const showAccountModal = ref(false)
const showApplyModal = ref(false)
const showServiceRequestModal = ref(false)
const serviceRequestContext = ref({})
const notifications = ref([])
const lastAccountReviewToastId = ref('')
const lastProfileReviewToastAt = ref('')
const showProfileMenu = ref(false)
const showNotificationsMenu = ref(false)
const selectedProfilePhoto = ref(null)
const selectedProfilePreviewUrl = ref('')
const isSavingProfile = ref(false)
const cardPhotoInput = ref(null)
const cardPhotoUploading = ref(false)
const governmentIdInput = ref(null)
const selectedGovernmentId = ref(null)
const governmentIdUploading = ref(false)
const selectedGovernmentIdPreviewUrl = ref('')
const submittedGovernmentIdName = ref('')
const submittedGovernmentIdPreviewUrl = ref('')
const showImageZoom = ref(false)
const zoomImageUrl = ref('')
let requestPoller = null
let realtimeChannel = null
let firebaseSessionUnsubscribe = null
let liveProfileUnsubscribe = null
const requestDrivenSections = new Set([
  'bookingReview',
  'inspectionDeployment',
  'paymentDetermination',
  'warrantyHandling',
])

/* HELPERS */
const mapLink = (lat,lng)=>`https://www.google.com/maps?q=${lat},${lng}`
const searchMapLink = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(query || '').trim())}`
const requestLocationMapLink = (req) => {
  const lat = toFiniteNumber(req?.latitude)
  const lng = toFiniteNumber(req?.longitude)
  if (lat !== null && lng !== null) return mapLink(lat, lng)
  const address = String(req?.address_text || '').trim()
  return address ? searchMapLink(address) : ''
}
const serviceProviderFullName = (provider) => {
  const first = String(provider?.first_name || '').trim()
  const middleInitial = String(provider?.middle_initial || '').trim()
  const last = String(provider?.last_name || '').trim()
  const middle = middleInitial ? `${middleInitial}.` : ''
  return [first, middle, last].filter(Boolean).join(' ').trim() || 'N/A'
}
const serviceProviderCategoryLabel = (provider) => {
  const raw = String(provider?.category || '').trim()
  if (!raw) return 'General Service'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
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

const businessInitials = (business) => {
  const name = String(business?.business_name || '').trim()
  if (!name) return 'BU'
  const parts = name.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  return initials || name.charAt(0).toUpperCase()
}
const businessOwnerLabel = (business) => {
  const direct = String(business?.owner_name || '').trim()
  if (direct) return direct

  const first = String(business?.first_name || '').trim()
  const middleInitial = String(business?.middle_initial || '').trim()
  const last = String(business?.last_name || '').trim()
  const middle = middleInitial ? `${middleInitial}.` : ''
  const fullName = [first, middle, last].filter(Boolean).join(' ').trim()
  return fullName || 'N/A'
}
const businessIdentity = (value) => String(value ?? '').trim()

const INVOICE_LOADING_DELAY_MS = 600
const invoiceViewUrl = (req) => {
  if (!canShowInvoiceAmount(req)) return '#'
  const id = req?.latest_invoice?.id
  return id ? `/payment/return?invoice_id=${encodeURIComponent(id)}` : '#'
}
const canOpenInvoice = (req) => Boolean(req?.latest_invoice?.invoice_url) && canShowInvoiceAmount(req)
const openInvoice = (req) => {
  const url = invoiceViewUrl(req)
  if (!url || url === '#') return
  window.__appGlobalLoader?.start?.()
  setTimeout(() => window.location.assign(url), INVOICE_LOADING_DELAY_MS)
}
const resolveStorageUrl = (value) => {
  return resolveStoredFileUrl(value, '')
}

const providerInitials = (provider) => {
  const first = String(provider?.first_name || '').trim().charAt(0)
  const last = String(provider?.last_name || '').trim().charAt(0)
  const joined = `${first}${last}`.toUpperCase()
  if (joined) return joined
  const byName = String(provider?.name || serviceProviderFullName(provider) || '').trim()
  return byName ? byName.charAt(0).toUpperCase() : 'SP'
}

const providerAvatarUrl = (provider) => {
  const id = Number(provider?.id || 0)
  const primary = resolveStorageUrl(provider?.profile_photo)
  return primary && (!id || !failedProviderAvatarIds.value.has(id)) ? primary : ''
}

const handleProviderAvatarError = (provider) => {
  const id = Number(provider?.id || 0)
  if (!id) return
  const next = new Set(failedProviderAvatarIds.value)
  next.add(id)
  failedProviderAvatarIds.value = next
}

const normalizeCategory = (value) => {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'plumbing' || v === 'siphoning' || v === 'both') return v
  return ''
}

const normalizeServiceTypeLabel = (value) => {
  const v = String(value || '').trim().toLowerCase()
  if (v.includes('plumb')) return 'Plumbing'
  if (v.includes('siphon')) return 'Siphoning'
  return ''
}

const selectedBusiness = computed(() =>
  businesses.value.find((b) => String(b.id) === String(spForm.business_id)) || null
)
const bookingBusinessFilter = ref('all')
const bookingBusinessFilterMatch = (business, filter = bookingBusinessFilter.value) => {
  const normalizedFilter = String(filter || 'all').trim().toLowerCase()
  const category = normalizeCategory(business?.service_filter_key || business?.category || business?.category_label)

  if (normalizedFilter === 'all') return true
  if (normalizedFilter === 'plumbing') return category === 'plumbing' || category === 'both'
  if (normalizedFilter === 'siphoning') return category === 'siphoning' || category === 'both'
  if (normalizedFilter === 'both') return category === 'both'
  return true
}

const selectedBusinessCategoryLabel = computed(() => {
  const raw = selectedBusiness.value?.category
  if (!raw) return ''
  const normalized = normalizeCategory(raw)
  if (!normalized) return raw
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
})

const idFilePath = computed(() => authUser.government_id_url || authUser.government_id || '')
const idFileName = computed(() => {
  const metaName = String(authUser.government_id_meta?.name || '').trim()
  if (metaName) return metaName
  if (!idFilePath.value) return ''
  const parts = stripFileQuery(String(idFilePath.value)).split('/')
  return parts[parts.length - 1]
})
const idPreviewUrl = computed(() => {
  if (!idFilePath.value) return ''
  return resolveStorageUrl(idFilePath.value)
})
const isIdImage = computed(() => {
  const path = stripFileQuery(String(idFilePath.value || '')).toLowerCase()
  return path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')
})
const currentGovernmentIdName = computed(() => idFileName.value || 'No document uploaded yet')
const selectedGovernmentIdName = computed(() => selectedGovernmentId.value?.name || '')
const submittedGovernmentIdPath = computed(() => authUser.government_id_resubmission_url || authUser.government_id_resubmission || '')
const submittedGovernmentIdNameFromServer = computed(() => {
  const metaName = String(authUser.government_id_resubmission_meta?.name || '').trim()
  if (metaName) return metaName
  const fallbackName = String(authUser.government_id_last_submitted_name || '').trim()
  if (fallbackName) return fallbackName
  const path = String(submittedGovernmentIdPath.value || '').trim()
  if (!path) return ''
  const parts = stripFileQuery(path).split('/')
  return parts[parts.length - 1]
})
const submittedGovernmentIdPreviewUrlFromServer = computed(() => {
  if (!submittedGovernmentIdPath.value) return ''
  return resolveStorageUrl(submittedGovernmentIdPath.value)
})
const activeNewGovernmentIdName = computed(() => selectedGovernmentId.value?.name || submittedGovernmentIdNameFromServer.value || submittedGovernmentIdName.value || '')
const activeNewGovernmentIdPreviewUrl = computed(() => selectedGovernmentIdPreviewUrl.value || submittedGovernmentIdPreviewUrlFromServer.value || submittedGovernmentIdPreviewUrl.value || '')
const selectedProfilePhotoName = computed(() => selectedProfilePhoto.value?.name || 'No file chosen')
const userInitials = computed(() => {
  const first = String(authUser.first_name || '').trim().charAt(0)
  const last = String(authUser.last_name || '').trim().charAt(0)
  const initials = `${first}${last}`.toUpperCase()
  return initials || 'U'
})
const profileImageUrl = computed(() => resolveStorageUrl(authUser.profile_photo))
const profileImageFailed = ref(false)
const safeProfileImageUrl = computed(() => (profileImageFailed.value ? '' : profileImageUrl.value))
const profileCardImageUrl = computed(() => {
  if (selectedProfilePreviewUrl.value) return selectedProfilePreviewUrl.value
  if (safeProfileImageUrl.value) return safeProfileImageUrl.value
  const name = encodeURIComponent(`${authUser.first_name || 'User'} ${authUser.last_name || ''}`.trim())
  return `https://ui-avatars.com/api/?name=${name}&background=ddd&color=555&size=256`
})

const handleProfileImageError = () => {
  profileImageFailed.value = true
}

const currentAccountReviewCacheKey = computed(() => (
  String(
    authUser.uid
    || authUser.id
    || authUser.email
    || readStoredAuthIdentity().uid
    || readStoredAuthIdentity().id
    || readStoredAuthIdentity().email
    || '',
  ).trim().toLowerCase()
))

const readCachedProfileReviewNotification = () => {
  const cacheKey = currentAccountReviewCacheKey.value
  if (!cacheKey) return null
  const cache = readAccountReviewNotificationCache()
  const entry = cache?.[cacheKey]
  if (!entry || typeof entry !== 'object') return null
  return isRelevantAccountReviewNotification(entry, authUser) ? entry : null
}

const writeCachedProfileReviewNotification = (notification) => {
  const cacheKey = currentAccountReviewCacheKey.value
  if (!cacheKey || !notification) return
  const cache = readAccountReviewNotificationCache()
  cache[cacheKey] = notification
  writeAccountReviewNotificationCache(cache)
}

const normalizeNotificationEntry = (note) => {
  const title = String(note?.title || '').trim()
  const message = String(note?.message || '').trim()
  const createdAt = String(note?.created_at || '').trim()
  const id = String(note?.id || `${title}-${createdAt}` || '').trim()
  if (!id || !title || !message || !createdAt) return null
  return {
    ...note,
    id,
    title,
    message,
    created_at: createdAt,
    read_at: note?.read_at || null,
    type: String(note?.type || '').trim(),
    category: String(note?.category || '').trim(),
    synthetic: Boolean(note?.synthetic),
  }
}

const sortNotificationsNewest = (rows = []) => (
  [...rows].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime()
    const bTime = new Date(b?.created_at || 0).getTime()
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
  })
)

const readCachedUserNotifications = () => {
  const cacheKey = currentAccountReviewCacheKey.value
  if (!cacheKey) return []
  const cache = readUserNotificationCache()
  const rows = Array.isArray(cache?.[cacheKey]) ? cache[cacheKey].map(normalizeNotificationEntry).filter(Boolean) : []
  const filtered = rows.filter((note) => isRelevantAccountReviewNotification(note, authUser))
  if (filtered.length !== rows.length) {
    const nextCache = readUserNotificationCache()
    nextCache[cacheKey] = filtered
    writeUserNotificationCache(nextCache)
  }
  return filtered
}

const writeCachedUserNotifications = (rows = []) => {
  const cacheKey = currentAccountReviewCacheKey.value
  if (!cacheKey) return
  const cache = readUserNotificationCache()
  cache[cacheKey] = sortNotificationsNewest(rows.map(normalizeNotificationEntry).filter(Boolean)).slice(0, 50)
  writeUserNotificationCache(cache)
}

const mergeNotificationRows = (rows = []) => {
  const merged = new Map()
  const pushRow = (note) => {
    const normalized = normalizeNotificationEntry(note)
    if (!normalized) return
    if (!isRelevantAccountReviewNotification(normalized, authUser)) return
    const existing = merged.get(normalized.id)
    merged.set(normalized.id, existing ? { ...existing, ...normalized } : normalized)
  }

  readCachedUserNotifications().forEach(pushRow)
  ;(Array.isArray(rows) ? rows : []).forEach(pushRow)

  const nextRows = sortNotificationsNewest([...merged.values()])
  writeCachedUserNotifications(nextRows)
  return nextRows
}

const toCachedReviewNotification = (note) => {
  const createdAt = String(note?.created_at || authUser.latest_account_review_at || '').trim()
  const title = String(note?.title || '').trim()
  const message = String(note?.message || '').trim()
  if (!createdAt || !title || !message) return null
  return {
    id: String(note?.id || `profile-review-${createdAt}`),
    title,
    message,
    created_at: createdAt,
    read_at: note?.read_at || null,
  }
}

const buildProfileReviewNotification = () => {
  const createdAt = String(authUser.latest_account_review_at || '').trim()
  const title = String(authUser.latest_account_review_title || '').trim()
  const message = String(authUser.latest_account_review_message || '').trim()
  if (createdAt && title && message) {
    const cached = readCachedProfileReviewNotification()
    const cachedReadAt = (
      cached
      && String(cached.created_at || '').trim() === createdAt
      && String(cached.title || '').trim() === title
      && String(cached.message || '').trim() === message
    )
      ? String(cached.read_at || '').trim()
      : ''
    const notification = toCachedReviewNotification({
      id: `profile-review-${createdAt}`,
      title,
      message,
      created_at: createdAt,
      read_at: String(authUser.latest_account_review_seen_at || '').trim() || cachedReadAt || null,
    })
    if (!notification || !isRelevantAccountReviewNotification({
      ...notification,
      type: 'account_review',
      category: 'account_review',
    }, authUser)) return null
    writeCachedProfileReviewNotification(notification)
    return notification
  }

  const cached = readCachedProfileReviewNotification()
  if (!cached?.id || !cached?.title || !cached?.message || !cached?.created_at) return null
  return {
    ...cached,
    synthetic: true,
    type: 'account_review',
    category: 'account_review',
  }
}

const mergeProfileReviewNotification = (rows = []) => {
  const list = Array.isArray(rows) ? [...rows] : []
  const synthetic = buildProfileReviewNotification()
  if (!synthetic) return list

  const exists = list.some((note) =>
    String(note?.type || note?.category || '').toLowerCase().includes('account_review')
    && String(note?.title || '').trim() === synthetic.title
    && String(note?.message || '').trim() === synthetic.message
  )
  if (!exists) {
    list.unshift(synthetic)
  }
  return list
}

const syncNotificationCache = () => {
  writeCachedUserNotifications(notifications.value || [])
}

const markProfileReviewSeen = async () => {
  const synthetic = notifications.value.find((note) => note?.synthetic)
  const reviewAt = String(authUser.latest_account_review_at || synthetic?.created_at || '').trim()
  if (!reviewAt) return
  if (String(authUser.latest_account_review_seen_at || '').trim() === reviewAt && synthetic?.read_at) return

  authUser.latest_account_review_seen_at = reviewAt
  if (synthetic) synthetic.read_at = reviewAt
  persistResolvedDashboardProfile({ latest_account_review_seen_at: reviewAt })
  writeCachedProfileReviewNotification({
    ...(synthetic || buildProfileReviewNotification() || {}),
    id: synthetic?.id || `profile-review-${reviewAt}`,
    created_at: reviewAt,
    read_at: reviewAt,
  })
  syncNotificationCache()

  try {
    const formData = new FormData()
    formData.append('_method', 'PUT')
    formData.append('latest_account_review_seen_at', reviewAt)
    await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch {
    // Keep the local seen state even if the profile sync fails.
  }
}

const notifyProfileReviewUpdate = () => {
  const reviewAt = String(authUser.latest_account_review_at || '').trim()
  if (!reviewAt || reviewAt === lastProfileReviewToastAt.value) return
  lastProfileReviewToastAt.value = reviewAt
}

const adjustExperience = (delta) => {
  const current = Number(spForm.experience_years || 0)
  const next = Math.max(0, current + delta)
  spForm.experience_years = next
}

watch(
  () => spForm.business_id,
  () => {
    spForm.category = normalizeCategory(selectedBusiness.value?.category)
  }
)
watch(
  () => authUser.profile_photo,
  () => {
    profileImageFailed.value = false
  }
)
watch(
  governmentIdResubmissionLocked,
  (locked) => {
    if (locked && selectedGovernmentId.value) {
      clearSelectedGovernmentId()
    }
  }
)

/* FETCHERS */
const fetchProfile = async ()=>{
  try{
    const res = await axios.get('/user/profile')
    applyResolvedDashboardProfile(res.data || {})
  } catch(err){ console.error(err) }
}
const fetchBusinesses = async ()=>{
  businessesLoading.value = true
  const cachedBusinesses = readUserBusinessesCache()
  if (cachedBusinesses.length) {
    businesses.value = cachedBusinesses
  }
  try{
    const res = await axios.get('/user/all-businesses', { params: { _ts: Date.now() }, skipGlobalLoading: true })
    businesses.value = Array.isArray(res.data) ? res.data : []
    writeUserBusinessesCache(businesses.value)
  } catch(err){
    if (!cachedBusinesses.length) {
      businesses.value = []
    }
  } finally {
    businessesLoading.value = false
  }
}
const fetchFormedTeams = async ()=>{
  formedTeamsLoading.value = true
  try{
    const res = await axios.get('/user/formed-teams')
    formedTeams.value = Array.isArray(res.data) ? res.data : []
  } catch(err){
    formedTeams.value = []
  } finally {
    formedTeamsLoading.value = false
  }
}
const fetchServiceProviders = async () => {
  try {
    const res = await axios.get('/user/service-providers')
    serviceProviders.value = Array.isArray(res.data) ? res.data : []
    failedProviderAvatarIds.value = new Set()
  } catch {
    serviceProviders.value = []
    failedProviderAvatarIds.value = new Set()
  }
}
const fetchServiceRequests = async ()=>{
  try {
    const res = await axios.get('/user/service-requests')
    serviceRequests.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    if (isPermissionDeniedError(err)) return
    // Keep current list so optimistic/local request card does not disappear on transient API errors.
    showFeedbackToast('error', err?.response?.data?.error || err?.response?.data?.message || 'Unable to refresh requests right now.', 2800)
  }
}
const fetchNotifications = async ()=>{
  try{
    const res = await axios.get('/user/notifications')
    notifications.value = mergeNotificationRows(mergeProfileReviewNotification(res.data || []))
    const reviewNotification = (notifications.value || []).find((note) =>
      String(note?.type || note?.category || '').toLowerCase().includes('account_review')
    )
    const cachedReviewNotification = toCachedReviewNotification(reviewNotification)
    if (cachedReviewNotification?.id) {
      writeCachedProfileReviewNotification(cachedReviewNotification)
      if (!String(authUser.latest_account_review_at || '').trim()) {
        authUser.latest_account_review_title = cachedReviewNotification.title
        authUser.latest_account_review_message = cachedReviewNotification.message
        authUser.latest_account_review_at = cachedReviewNotification.created_at
        authUser.latest_account_review_seen_at = String(cachedReviewNotification.read_at || '').trim()
      }
      lastAccountReviewToastId.value = cachedReviewNotification.id
    }
  }catch{
    notifications.value = mergeNotificationRows(mergeProfileReviewNotification([]))
  }
}
const fetchApplicationStatus = async ()=>{
  try{
    const res = await axios.get('/user/application-status')
    const data = res.data
    appStatus.hasApplied = data.hasApplied
    appStatus.pending = data.pending
    appStatus.approved = data.approved
    appStatus.rejected = data.rejected
    appStatus.reject_reason = data.provider?.reject_reason || null

    if(appStatus.rejected && appStatus.reject_reason){
      Swal.fire({icon:'info',title:'Application Rejected',html:`Reason: <strong>${appStatus.reject_reason}</strong>`})
    }

    if(appStatus.approved){ router.visit('/service-provider/dashboard') }

  }catch(err){ console.error(err) }
}
const fetchSPDetails = async ()=>{
  if(!appStatus.hasApplied) return
  try{ const res = await axios.get('/user/service-provider-details'); Object.assign(spDetails,res.data) }catch(err){ console.error(err) }
}

const formatTeamSchedule = (team) => {
  const date = String(team?.team_schedule_date || '').trim()
  const from = String(team?.team_schedule_time_from || '').trim().slice(0, 5)
  const to = String(team?.team_schedule_time_to || '').trim().slice(0, 5)
  if (!date && !from && !to) return 'Not set yet'
  if (!date) return `${from}${to ? ` - ${to}` : ''}`.trim()
  if (!from && !to) return date
  if (!to) return `${date} ${from}`
  return `${date} ${from} - ${to}`
}

const teamCode = (team) => {
  const raw = String(team?.team || '').trim()
  const match = raw.match(/team\s+([a-z])$/i)
  return match ? String(match[1] || '').toUpperCase() : ''
}

const displayServiceTypeFromTeam = (team) => {
  const track = inferTeamTrack(team)
  if (track === 'plumbing') return 'Plumbing'
  if (track === 'siphoning') return 'Siphoning'

  const fallback = String(team?.service_type || '').trim().toLowerCase()
  if (fallback.includes('plumb')) return 'Plumbing'
  if (fallback.includes('siphon')) return 'Siphoning'
  return 'General Service'
}

const inferTeamTrack = (team) => {
  const normalizedTeam = String(team?.team || '').trim().toLowerCase()
  if (normalizedTeam.includes('plumbing')) return 'plumbing'
  if (normalizedTeam.includes('siphoning')) return 'siphoning'

  const members = Array.isArray(team?.members) ? team.members : []
  let plumbingCount = 0
  let siphoningCount = 0
  members.forEach((member) => {
    const role = String(member?.role || '').trim().toLowerCase()
    if (!role) return
    if (role.includes('siphon') || role.includes('septic') || role.includes('desludg') || role.includes('sewer') || role.includes('jetter') || role.includes('drain')) {
      siphoningCount += 1
      return
    }
    if (role.includes('plumb') || role.includes('pipe') || role.includes('leak') || role.includes('waterline') || role.includes('sanitary')) {
      plumbingCount += 1
    }
  })
  if (siphoningCount > plumbingCount) return 'siphoning'
  if (plumbingCount > siphoningCount) return 'plumbing'

  const fallbackType = String(team?.service_type || '').trim().toLowerCase()
  if (fallbackType.includes('siphon')) return 'siphoning'
  if (fallbackType.includes('plumb')) return 'plumbing'
  return ''
}

const teamMemberPillClass = (status) => {
  const value = String(status || '').toLowerCase().trim()
  if (value === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (value === 'pending') return 'bg-amber-100 text-amber-700'
  if (value === 'rejected') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
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
const CAVITE_BARANGAY_FALLBACK = {
  'bacoor': ['Alima', 'Aniban I', 'Aniban II', 'Aniban III', 'Aniban IV', 'Aniban V', 'Banalo', 'Bayanan', 'Habay I', 'Habay II', 'Kaingin', 'Ligas I', 'Ligas II', 'Ligas III', 'Mabolo I', 'Mabolo II', 'Mabolo III', 'Maliksi I', 'Maliksi II', 'Maliksi III', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Niog I', 'Niog II', 'Niog III', 'Panapaan I', 'Panapaan II', 'Panapaan III', 'P.F. Espiritu I', 'P.F. Espiritu II', 'P.F. Espiritu III', 'P.F. Espiritu IV', 'P.F. Espiritu V', 'P.F. Espiritu VI', 'P.F. Espiritu VII', 'P.F. Espiritu VIII', 'P.F. Espiritu IX', 'Poblacion', 'Real I', 'Real II', 'Salinas I', 'Salinas II', 'Salinas III', 'Salinas IV', 'San Nicolas I', 'San Nicolas II', 'San Nicolas III', 'Sineguelasan', 'Talaba I', 'Talaba II', 'Talaba III', 'Talaba IV', 'Talaba V', 'Talaba VI', 'Talaba VII', 'Zapote I', 'Zapote II', 'Zapote III', 'Zapote IV', 'Zapote V'],
  'dasmarinas': ['Burol I', 'Burol II', 'Burol III', 'Datu Esmael', 'Emmanuel Bergado I', 'Emmanuel Bergado II', 'Fatima I', 'Fatima II', 'Fatima III', 'H-2', 'Langkaan I', 'Langkaan II', 'Luzviminda I', 'Luzviminda II', 'Paliparan I', 'Paliparan II', 'Paliparan III', 'Sabang', 'Salawag', 'Sampaloc I', 'Sampaloc II', 'Sampaloc III', 'Sampaloc IV', 'San Agustin I', 'San Agustin II', 'San Agustin III', 'San Andres I', 'San Andres II', 'San Antonio De Padua I', 'San Antonio De Padua II', 'San Dionisio', 'San Esteban', 'San Francisco I', 'San Francisco II', 'San Isidro Labrador I', 'San Isidro Labrador II', 'San Jose', 'San Juan I', 'San Juan II', 'San Lorenzo Ruiz I', 'San Lorenzo Ruiz II', 'San Luis I', 'San Luis II', 'San Manuel I', 'San Manuel II', 'San Mateo', 'San Miguel', 'San Nicolas I', 'San Nicolas II', 'San Roque', 'San Simon', 'Santa Cristina I', 'Santa Cristina II', 'Santa Cruz I', 'Santa Cruz II', 'Santa Fe', 'Santa Lucia', 'Santa Maria', 'Santo Cristo', 'Santo Nino I', 'Santo Nino II', 'Victoria Reyes'],
  'general trias': ['Bacao I', 'Bacao II', 'Bagumbayan', 'Biclatan', 'Buenavista I', 'Buenavista II', 'Buenavista III', 'Corregidor', 'Dulong Bayan', 'Gov. Ferrer', 'Javalera', 'Manggahan', 'Navarro', 'Panungyanan', 'Pasong Camachile I', 'Pasong Camachile II', 'Pasong Kawayan I', 'Pasong Kawayan II', 'Pinagtipunan', 'Prinza', 'San Francisco', 'San Gabriel', 'San Juan I', 'San Juan II', 'San Vicente', 'Santiago', 'Tapia', 'Tejero'],
  'imus': ['Alapan I-A', 'Alapan I-B', 'Alapan I-C', 'Alapan II-A', 'Alapan II-B', 'Anabu I-A', 'Anabu I-B', 'Anabu I-C', 'Anabu I-D', 'Anabu I-E', 'Anabu I-F', 'Anabu I-G', 'Anabu II-A', 'Anabu II-B', 'Anabu II-C', 'Anabu II-D', 'Anabu II-E', 'Anabu II-F', 'Bagong Silang', 'Bayan Luma I', 'Bayan Luma II', 'Bayan Luma III', 'Bayan Luma IV', 'Bayan Luma V', 'Bucandala I', 'Bucandala II', 'Bucandala III', 'Bucandala IV', 'Carsadang Bago I', 'Carsadang Bago II', 'Magdalo', 'Maharlika', 'Malagasang I-A', 'Malagasang I-B', 'Malagasang I-C', 'Malagasang I-D', 'Malagasang I-E', 'Malagasang I-F', 'Malagasang I-G', 'Malagasang II-A', 'Malagasang II-B', 'Malagasang II-C', 'Malagasang II-D', 'Medicion I-A', 'Medicion I-B', 'Medicion I-C', 'Medicion I-D', 'Medicion II-A', 'Medicion II-B', 'Medicion II-C', 'Medicion II-D', 'Pag-asa I', 'Pag-asa II', 'Pag-asa III', 'Poblacion I-A', 'Poblacion I-B', 'Poblacion I-C', 'Poblacion II-A', 'Poblacion II-B', 'Poblacion III-A', 'Poblacion III-B', 'Poblacion IV-A', 'Poblacion IV-B', 'Poblacion IV-C', 'Poblacion IV-D', 'Tanzang Luma I', 'Tanzang Luma II', 'Tanzang Luma III', 'Tanzang Luma IV'],
  'indang': ['Bancod', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Bunton', 'Calumpang Cerca', 'Calumpang Lejos I', 'Calumpang Lejos II', 'Daine I', 'Daine II', 'Guyam Malaki', 'Guyam Munti', 'Harasan', 'Kayquit I', 'Kayquit II', 'Kayquit III', 'Kaytambog', 'Limbon', 'Lumampong Balagbag', 'Lumampong Halayhay', 'Mataas na Lupa', 'Palo-Palo', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Pulo', 'Tambo Kulit', 'Tambo Malaki', 'Tambo Munti'],
  'naic': ['Bagumbayan', 'Balsahan', 'Bancaan', 'Bucana Malaki', 'Bucana Sasahan', 'Calubcob', 'Capt. C. Nazareno', 'Gomez-Zamora', 'Halang', 'Humbac', 'Ibayo Estacion', 'Ibayo Silangan', 'Kanluran', 'Labac', 'Latoria', 'Mabolo', 'Makina', 'Malainen Bago', 'Malainen Luma', 'Molino', 'Munting Mapino', 'Muzon', 'Palangue I', 'Palangue II', 'Sabang', 'San Roque', 'Santulan', 'Sapa', 'Timalan Balsahan', 'Timalan Concepcion', 'Timalan Naic', 'Timalan Valencia']
}
const extractBarangayName = (row) => {
  if (typeof row === 'string') return row
  if (!row || typeof row !== 'object') return ''
  return String(
    row.name || row.barangay || row.barangay_name || row.brgy || row.brgy_name || row.BRGY_NM || ''
  )
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
const fetchBarangaysByLgu = async (lgu) => {
  if (!lgu?.code) return []

  const fallbackNames = mergeBarangayNames(
    CAVITE_BARANGAYS_BY_CODE[String(lgu.code)] || [],
    CAVITE_BARANGAY_FALLBACK[normalizeKey(lgu.name)] || []
  )

  try {
    const res = await axios.get(`/user/cavite/barangays/${lgu.code}`, {
      params: { type: lgu.type },
    })
    const names = mergeBarangayNames(Array.isArray(res.data) ? res.data : [], fallbackNames)
    if (names.length) return names
  } catch {}

  try {
    const segment = lgu.type === 'city' ? 'cities' : 'municipalities'
    const res = await axios.get(`https://psgc.gitlab.io/api/${segment}/${lgu.code}/barangays/`)
    const names = mergeBarangayNames(Array.isArray(res.data) ? res.data : [], fallbackNames)
    if (names.length) return names
  } catch {}

  return mergeBarangayNames(fallbackNames)
}

const normalizePricingRules = (rules) => {
  if (!Array.isArray(rules)) return []
  return rules
    .map((rule) => ({
      service: String(rule?.service || '').trim(),
      basePrice: Number(rule?.basePrice ?? rule?.base_price ?? 0),
      distanceFee: Number(rule?.distanceFee ?? rule?.distance_fee ?? 0),
      urgencyFeePct: Number(rule?.urgencyFeePct ?? rule?.urgency_fee_pct ?? 0),
      minorPct: Number(rule?.minorPct ?? rule?.minor_pct ?? 0),
      moderatePct: Number(rule?.moderatePct ?? rule?.moderate_pct ?? 0),
      severePct: Number(rule?.severePct ?? rule?.severe_pct ?? 0),
      note: String(rule?.note || '').trim(),
    }))
    .filter((rule) => rule.service)
}

const toFiniteNumber = (value) => {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (raw === '') return null
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : null
}

const distanceBetweenKm = (lat1, lng1, lat2, lng2) => {
  const aLat = toFiniteNumber(lat1)
  const aLng = toFiniteNumber(lng1)
  const bLat = toFiniteNumber(lat2)
  const bLng = toFiniteNumber(lng2)
  if (aLat === null || aLng === null || bLat === null || bLng === null) return 0

  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians(bLat - aLat)
  const deltaLng = toRadians(bLng - aLng)
  const originLat = toRadians(aLat)
  const destinationLat = toRadians(bLat)
  const haversine = (Math.sin(deltaLat / 2) ** 2)
    + (Math.cos(originLat) * Math.cos(destinationLat) * (Math.sin(deltaLng / 2) ** 2))
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return Math.max(0, earthRadiusKm * centralAngle)
}

const formatDistanceLabel = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return '0.5 km away'
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`
  return `${Math.round(distanceKm)} km away`
}

const businessDistanceMeta = (business) => {
  const userLat = toFiniteNumber(authUser.latitude)
  const userLng = toFiniteNumber(authUser.longitude)
  const businessLat = toFiniteNumber(business?.latitude)
  const businessLng = toFiniteNumber(business?.longitude)

  if (userLat === null || userLng === null || businessLat === null || businessLng === null) {
    return {
      hasDistance: false,
      distanceKm: Number.POSITIVE_INFINITY,
      badgeLabel: 'Location Pending',
      badgeClass: 'bg-slate-100 text-slate-600',
      distanceText: '',
      helperText: 'Distance will appear when your saved location and the company pin are both available.',
    }
  }

  const distanceKm = distanceBetweenKm(userLat, userLng, businessLat, businessLng)

  if (distanceKm <= 5) {
    return {
      hasDistance: true,
      distanceKm,
      badgeLabel: 'Nearest',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      distanceText: formatDistanceLabel(distanceKm),
      helperText: 'Closest match from your saved location.',
    }
  }

  if (distanceKm <= 15) {
    return {
      hasDistance: true,
      distanceKm,
      badgeLabel: 'Near',
      badgeClass: 'bg-cyan-100 text-cyan-700',
      distanceText: formatDistanceLabel(distanceKm),
      helperText: 'A nearby option based on your saved location.',
    }
  }

  return {
    hasDistance: true,
    distanceKm,
    badgeLabel: 'Far',
    badgeClass: 'bg-amber-100 text-amber-700',
    distanceText: formatDistanceLabel(distanceKm),
    helperText: 'Farther from your saved location, but still available.',
  }
}

const teamBasePriceStart = (team) => {
  const direct = Number(team?.starting_price)
  if (Number.isFinite(direct) && direct > 0) return direct

  const basePrices = normalizePricingRules(team?.pricing_rules)
    .map((rule) => Number(rule.basePrice || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (!basePrices.length) return null

  return Math.min(...basePrices)
}

const teamFeeLabel = (team) => {
  const fixedPrice = Number(team?.fixed_price)
  if (Number.isFinite(fixedPrice) && fixedPrice > 0) {
    return money(fixedPrice)
  }

  const mode = String(team?.management_mode || '').trim().toLowerCase()
  if (mode === 'business') {
    const start = teamBasePriceStart(team)
    if (start !== null) {
      return `Starts at ${money(start)} + distance`
    }
  }

  return (team?.pricing_rules || []).length ? 'See breakdown on booking' : 'For quotation'
}

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const requestServiceForTeam = async (team) => {
  if (requestLocked.value) {
    Swal.fire('Request Locked', lockMessage.value || 'You already have an active request.', 'info')
    return
  }
  if (!team?.can_request || !team?.business_id) {
    Swal.fire('Unavailable', 'This team is not linked to a requestable business yet.', 'warning')
    return
  }

  const safeContact = displayContactNumber(authUser.contact_number) === 'N/A'
    ? ''
    : displayContactNumber(authUser.contact_number)
  const managementMode = String(team?.management_mode || '').trim().toLowerCase()
  const isHrManagedTeam = managementMode === 'hr'
  const isBusinessManagedTeam = managementMode === 'business'
  const isManagedTeam = isHrManagedTeam || isBusinessManagedTeam
  if (!isManagedTeam) {
    Swal.fire('Unavailable', 'Team management mode is not configured yet.', 'warning')
    return
  }

  const pricingRules = isBusinessManagedTeam ? normalizePricingRules(team?.pricing_rules) : []
  const hasPricingRules = pricingRules.length > 0
  const serviceOptionSet = new Set()
  if (hasPricingRules) {
    pricingRules.forEach((rule) => serviceOptionSet.add(rule.service))
  } else {
    const declaredType = String(team?.service_type || '').trim()
    if (declaredType) serviceOptionSet.add(declaredType)
    if (isHrManagedTeam) {
      serviceOptionSet.add('Plumbing')
      serviceOptionSet.add('Siphoning')
    }
    if (isBusinessManagedTeam) {
      serviceOptionSet.add('Minor Plumbing')
      serviceOptionSet.add('Major Plumbing')
      serviceOptionSet.add('Siphoning')
    }
  }
  const teamTrack = inferTeamTrack(team)
  const matchesTeamTrack = (service) => {
    const value = String(service || '').trim().toLowerCase()
    if (!teamTrack) return true
    if (teamTrack === 'plumbing') return value.includes('plumbing')
    if (teamTrack === 'siphoning') return value.includes('siphon')
    return true
  }

  let serviceOptions = Array.from(serviceOptionSet).filter(Boolean)
  if (teamTrack) {
    serviceOptions = serviceOptions.filter((service) => matchesTeamTrack(service))
  }
  if (!serviceOptions.length && teamTrack === 'siphoning') {
    serviceOptions = ['Siphoning']
  }
  if (!serviceOptions.length && teamTrack === 'plumbing') {
    serviceOptions = ['Minor Plumbing', 'Major Plumbing']
  }
  if (!serviceOptions.length) {
    Swal.fire('Unavailable', 'No service type is configured for this team yet.', 'warning')
    return
  }

  const teamFixedPrice = Number(team?.fixed_price)
  const fixedManagedAmount = Number.isFinite(teamFixedPrice) && teamFixedPrice >= TEAM_REQUEST_MIN_AMOUNT
    ? teamFixedPrice
    : (isHrManagedTeam ? 3500 : 3000)
  const defaultEstimate = hasPricingRules
    ? Math.max(TEAM_REQUEST_MIN_AMOUNT, Number(pricingRules[0]?.basePrice || TEAM_REQUEST_MIN_AMOUNT))
    : fixedManagedAmount
  const userLatitude = toFiniteNumber(authUser.latitude)
  const userLongitude = toFiniteNumber(authUser.longitude)
  const businessLatitude = toFiniteNumber(team?.business_latitude)
  const businessLongitude = toFiniteNumber(team?.business_longitude)
  const canComputeDistance = userLatitude !== null
    && userLongitude !== null
    && businessLatitude !== null
    && businessLongitude !== null
  const autoDistanceKm = canComputeDistance
    ? distanceBetweenKm(userLatitude, userLongitude, businessLatitude, businessLongitude)
    : 0
  const serviceOptionsHtml = serviceOptions
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    .join('')

  const labelStyle = 'font-size:12px;font-weight:700;color:#334155;letter-spacing:.02em;margin-bottom:4px;display:block'
  const controlStyle = 'margin:0;width:100%;border-radius:12px;border:1px solid #cbd5e1;background:#ffffff;padding:10px 12px;color:#0f172a'
  const controlDisabledStyle = `${controlStyle};background:#f8fafc;color:#475569`

  const cityOptionsHtml = CAVITE_LGUS
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.name}">${item.name}</option>`)
    .join('')

  const scheduleDate = String(team?.team_schedule_date || '').trim()
  const scheduleFrom = String(team?.team_schedule_time_from || '').trim().slice(0, 5)
  const scheduleTo = String(team?.team_schedule_time_to || '').trim().slice(0, 5)
  const fixedAvailableTimeSlots = Array.from({ length: 24 }, (_, index) => `${String((index + 1) % 24).padStart(2, '0')}:00`)

  const toMinutes = (value) => {
    const [h, m] = String(value || '').split(':').map((v) => Number(v))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    return (h * 60) + m
  }

  const formatMinutes = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const fromMin = toMinutes(scheduleFrom)
  const toMin = toMinutes(scheduleTo)
  const hasScheduleWindow = Number.isFinite(fromMin) && Number.isFinite(toMin) && toMin > fromMin
  const timeSlots = [...fixedAvailableTimeSlots]

  const timeOptionsHtml = timeSlots.map((t) => `<option value="${t}">${t}</option>`).join('')

  if (!scheduleDate || !timeSlots.length) {
    Swal.fire('Schedule Required', 'Team schedule date is not fully set yet. Please ask HR to set the date first.', 'warning')
    return
  }

  const scheduleWindowText = hasScheduleWindow ? `${scheduleFrom} - ${scheduleTo}` : '01:00 - 13:00'

  let geoMap = null
  let geoRouteAbortController = null
  const result = await Swal.fire({
    title: `Submit Request - ${team.team}`,
    width: 720,
    background: '#ffffff',
    color: '#0f172a',
    showIcon: false,
    customClass: { popup: 'swalx-light' },
    showCancelButton: true,
    confirmButtonText: 'Submit Request',
    cancelButtonText: 'Cancel',
    focusConfirm: false,
    html: `
      <div style="max-height:60vh;overflow-y:auto;padding:0;margin:0;width:100%;box-sizing:border-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;border:1px solid #dbe3ee;border-radius:14px;background:#ffffff;padding:12px;width:100%;box-sizing:border-box">
        <div style="grid-column:1 / -1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
          <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700">Team Schedule</p>
          <p style="margin:3px 0 0 0;font-size:13px;color:#0f172a;font-weight:700">${scheduleDate} | ${scheduleWindowText}</p>
        </div>
        <div style="grid-column:1 / -1">
          <label style="${labelStyle}">Service Type</label>
          <select id="swal-team-service-type" class="swal2-input" style="${controlStyle}">
            <option value="">Select Service</option>${serviceOptionsHtml}
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Service Time</label>
          <select id="swal-team-time" class="swal2-input" style="${controlStyle}">
            <option value="">Select Available Time</option>
            ${timeOptionsHtml}
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Payment Method</label>
          <select id="swal-team-payment-choice" class="swal2-input" style="${controlStyle}">
            <option value="">Select Payment Method</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="e_wallet">E-wallet</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Downpayment (Optional)</label>
          <select id="swal-team-downpayment-opt-in" class="swal2-input" style="${controlStyle}">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div id="swal-team-downpayment-wrap" style="display:none">
          <label style="${labelStyle}">Downpayment Amount (PHP)</label>
          <input id="swal-team-downpayment-amount" type="number" class="swal2-input" min="1" max="${TEAM_REQUEST_MAX_AMOUNT}" step="0.01" placeholder="Enter downpayment amount" style="${controlStyle}">
        </div>
        <div>
          <label style="${labelStyle}">Estimated Cost (PHP)</label>
          <input id="swal-team-amount" type="number" class="swal2-input" min="${TEAM_REQUEST_MIN_AMOUNT}" max="${TEAM_REQUEST_MAX_AMOUNT}" step="0.01" value="${defaultEstimate.toFixed(2)}" style="${controlDisabledStyle}" disabled>
        </div>
        <div style="grid-column:1 / -1;border:1px solid #cfe7ef;background:#f8fdff;border-radius:12px;padding:10px 12px">
          <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;font-weight:700">Geo Map Route</p>
          ${canComputeDistance
            ? `<div id="swal-team-geo-map" style="margin-top:8px;height:160px;border-radius:10px;border:1px solid #bae6fd;overflow:hidden"></div>`
            : `<p style="margin:8px 0 0 0;font-size:12px;color:#475569">Map preview is unavailable because user/business location is missing.</p>`}
        </div>
        ${hasPricingRules ? `
        <div>
          <label style="${labelStyle}">Urgency</label>
          <select id="swal-team-urgency" class="swal2-input" style="${controlStyle}">
            <option value="standard">Standard</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Complexity</label>
          <select id="swal-team-complexity" class="swal2-input" style="${controlStyle}">
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
        <div style="grid-column:1 / -1;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:10px 12px">
          <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#155e75;font-weight:700">Price Breakdown (Estimate Only)</p>
          <div id="swal-team-breakdown" style="margin-top:6px;font-size:12px;color:#164e63;line-height:1.55"></div>
        </div>
        ` : ''}
        <div style="grid-column:1 / -1">
          <label style="${labelStyle}">House No. / Street</label>
          <input id="swal-team-house-street" type="text" class="swal2-input" placeholder="House No., Street, Subdivision" style="${controlStyle}">
        </div>
        <div>
          <label style="${labelStyle}">City (Cavite)</label>
          <select id="swal-team-city" class="swal2-input" style="${controlStyle}">
            <option value="">Select City</option>
            ${cityOptionsHtml}
          </select>
        </div>
        <div>
          <label style="${labelStyle}">Barangay</label>
          <select id="swal-team-barangay" class="swal2-input" style="${controlStyle}" disabled>
            <option value="">Select Barangay</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle}">ZIP Code</label>
          <input id="swal-team-zip" type="text" class="swal2-input" placeholder="Auto-filled" style="${controlDisabledStyle}" disabled>
        </div>
        <div>
          <label style="${labelStyle}">Contact Number</label>
          <input id="swal-team-contact" type="text" class="swal2-input" value="${safeContact}" placeholder="09XXXXXXXXX" style="${controlDisabledStyle}" disabled>
        </div>
        <div style="grid-column:1 / -1">
          <label style="${labelStyle}">Problem Description</label>
          <textarea id="swal-team-problem" class="swal2-textarea" placeholder="Describe the issue for survey/inspection" style="${controlStyle};min-height:96px;resize:vertical"></textarea>
        </div>
        <div style="grid-column:1 / -1">
          <label style="${labelStyle}">Notes / Landmark (Optional)</label>
          <textarea id="swal-team-notes" class="swal2-textarea" placeholder="Landmark or extra details" style="${controlStyle};min-height:86px;resize:vertical"></textarea>
        </div>
        <div style="grid-column:1 / -1">
          <label style="${labelStyle}">Photo Attachment (Optional)</label>
          <input id="swal-team-photos" type="file" class="swal2-file" accept="image/*" multiple style="${controlStyle}">
          <p style="margin:4px 0 0 0;font-size:11px;color:#64748b">Upload up to 5 photos for initial survey reference.</p>
        </div>
        <div style="grid-column:1 / -1;margin-top:2px">
          <p style="margin:0;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px">
            Survey-first booking flow: downpayment is optional. Final billing is confirmed after inspection.
          </p>
        </div>
      </div>
      </div>
    `,
    didOpen: () => {
      const cityInput = document.getElementById('swal-team-city')
      const barangayInput = document.getElementById('swal-team-barangay')
      const zipInput = document.getElementById('swal-team-zip')
      const serviceTypeInput = document.getElementById('swal-team-service-type')
      const amountInput = document.getElementById('swal-team-amount')
      const paymentChoiceInput = document.getElementById('swal-team-payment-choice')
      const downpaymentOptInInput = document.getElementById('swal-team-downpayment-opt-in')
      const downpaymentWrap = document.getElementById('swal-team-downpayment-wrap')
      const urgencyInput = document.getElementById('swal-team-urgency')
      const complexityInput = document.getElementById('swal-team-complexity')
      const breakdownNode = document.getElementById('swal-team-breakdown')
      const geoMapNode = document.getElementById('swal-team-geo-map')

      if (serviceTypeInput && serviceOptions.length) {
        serviceTypeInput.value = serviceOptions[0]
      }
      if (paymentChoiceInput) paymentChoiceInput.value = 'cash'
      if (downpaymentOptInInput) downpaymentOptInInput.value = 'no'

      const syncDownpaymentUi = () => {
        if (!downpaymentWrap || !downpaymentOptInInput) return
        downpaymentWrap.style.display = downpaymentOptInInput.value === 'yes' ? 'block' : 'none'
      }
      syncDownpaymentUi()

      const resolveRule = (serviceType) => {
        const key = normalizeKey(serviceType)
        const matched = pricingRules.find((rule) => normalizeKey(rule.service) === key)
        return matched || pricingRules[0] || null
      }

      const toEstimate = () => {
        if (!hasPricingRules) {
          const total = Math.max(TEAM_REQUEST_MIN_AMOUNT, Number(fixedManagedAmount || TEAM_REQUEST_MIN_AMOUNT))
          return { total, lines: [] }
        }

        const selectedService = String(serviceTypeInput?.value || serviceOptions[0] || '').trim()
        const rule = resolveRule(selectedService)
        if (!rule) {
          return { total: TEAM_REQUEST_MIN_AMOUNT, lines: ['No pricing rule matched.'] }
        }

        const distanceKm = Math.max(0, Number(autoDistanceKm || 0))
        const urgencyMode = String(urgencyInput?.value || 'standard').toLowerCase()
        const complexity = String(complexityInput?.value || 'minor').toLowerCase()
        const complexityPct = complexity === 'severe'
          ? Number(rule.severePct || 0)
          : (complexity === 'moderate' ? Number(rule.moderatePct || 0) : Number(rule.minorPct || 0))

        const basePrice = Math.max(0, Number(rule.basePrice || 0))
        const distanceCost = Math.max(0, distanceKm * Math.max(0, Number(rule.distanceFee || 0)))
        const complexityCost = (basePrice + distanceCost) * (Math.max(0, complexityPct) / 100)
        const preUrgency = basePrice + distanceCost + complexityCost
        const urgencyCost = urgencyMode === 'urgent'
          ? preUrgency * (Math.max(0, Number(rule.urgencyFeePct || 0)) / 100)
          : 0
        const computed = preUrgency + urgencyCost
        const total = Math.max(TEAM_REQUEST_MIN_AMOUNT, Math.round(computed * 100) / 100)

        const lines = [
          `Base: ${money(basePrice)}`,
          `Distance (${distanceKm.toFixed(1)} km @ ${money(rule.distanceFee)} / km): ${money(distanceCost)}`,
          `Complexity (${complexityPct}%): ${money(complexityCost)}`,
          `Urgency (${urgencyMode === 'urgent' ? `${Number(rule.urgencyFeePct || 0)}%` : '0%'}): ${money(urgencyCost)}`,
        ]
        if (!canComputeDistance) {
          lines.push('Distance charge currently not applied because user/business location is missing.')
        }
        if (rule.note) lines.push(`Note: ${escapeHtml(rule.note)}`)

        return { total, lines }
      }

      const syncEstimateUi = () => {
        const estimate = toEstimate()
        if (amountInput) amountInput.value = estimate.total.toFixed(2)
        if (breakdownNode) {
          breakdownNode.innerHTML = estimate.lines.length
            ? estimate.lines.map((line) => `<p style="margin:0 0 2px 0">${line}</p>`).join('')
            : '<p style="margin:0">Fixed managed estimate applies for this team.</p>'
        }
      }

      syncEstimateUi()

      if (canComputeDistance && geoMapNode) {
        const userPoint = [userLatitude, userLongitude]
        const businessPoint = [businessLatitude, businessLongitude]
        geoMap = L.map(geoMapNode, {
          zoomControl: true,
          attributionControl: false,
        })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(geoMap)

        const drawRoadRoute = async () => {
          geoRouteAbortController = new AbortController()
          try {
            const response = await axios.get('/user/route-preview', {
              params: {
                from_lat: userLatitude,
                from_lng: userLongitude,
                to_lat: businessLatitude,
                to_lng: businessLongitude,
              },
              signal: geoRouteAbortController.signal,
              timeout: 8000,
            })

            const latLngs = Array.isArray(response?.data?.points)
              ? response.data.points
                .map((point) => [Number(point?.[0]), Number(point?.[1])])
                .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
              : []
            if (!latLngs.length) throw new Error('Invalid route points')

            const routeLine = L.polyline(latLngs, {
              color: '#2563eb',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(geoMap)
            geoMap.fitBounds(routeLine.getBounds(), { padding: [26, 26] })
          } catch {
            geoMap.setView(userPoint, 15)
          }
        }

        drawRoadRoute()
        setTimeout(() => geoMap?.invalidateSize(), 40)
      }

      const setBarangaysLoading = () => {
        if (!barangayInput) return
        barangayInput.innerHTML = '<option value="">Loading barangays...</option>'
        barangayInput.disabled = true
      }

      const syncCity = async () => {
        if (!cityInput || !barangayInput || !zipInput) return

        const cityName = String(cityInput.value || '').trim()
        const selected = CAVITE_LGUS.find((item) => normalizeKey(item.name) === normalizeKey(cityName))

        if (!selected) {
          barangayInput.innerHTML = '<option value="">Select Barangay</option>'
          barangayInput.disabled = true
          zipInput.value = ''
          return
        }

        zipInput.value = selected.zip
        setBarangaysLoading()
        const names = await fetchBarangaysByLgu(selected)

        if (!names.length) {
          barangayInput.innerHTML = '<option value="">No barangay available</option>'
          barangayInput.disabled = true
          return
        }

        barangayInput.innerHTML = '<option value="">Select Barangay</option>' +
          names.map((brgy) => `<option value="${brgy}">${brgy}</option>`).join('')
        barangayInput.disabled = false
      }

      cityInput?.addEventListener('change', syncCity)
      serviceTypeInput?.addEventListener('change', syncEstimateUi)
      downpaymentOptInInput?.addEventListener('change', syncDownpaymentUi)
      urgencyInput?.addEventListener('change', syncEstimateUi)
      complexityInput?.addEventListener('change', syncEstimateUi)
    },
    willClose: () => {
      if (geoRouteAbortController) {
        geoRouteAbortController.abort()
        geoRouteAbortController = null
      }
      if (geoMap) {
        geoMap.remove()
        geoMap = null
      }
    },
    preConfirm: () => {
      const serviceType = document.getElementById('swal-team-service-type')?.value
      const preferredTime = document.getElementById('swal-team-time')?.value
      const paymentChoice = String(document.getElementById('swal-team-payment-choice')?.value || '').trim()
      const downpaymentOptIn = String(document.getElementById('swal-team-downpayment-opt-in')?.value || 'no').toLowerCase() === 'yes'
      const downpaymentAmountRaw = document.getElementById('swal-team-downpayment-amount')?.value
      const amountRaw = document.getElementById('swal-team-amount')?.value
      const houseStreet = document.getElementById('swal-team-house-street')?.value?.trim()
      const city = document.getElementById('swal-team-city')?.value
      const barangay = document.getElementById('swal-team-barangay')?.value
      const zip = document.getElementById('swal-team-zip')?.value
      const contact = safeContact
      const problemDescription = document.getElementById('swal-team-problem')?.value?.trim()
      const notes = document.getElementById('swal-team-notes')?.value?.trim()
      const photoFiles = Array.from(document.getElementById('swal-team-photos')?.files || [])
      const finalBarangay = String(barangay || '').trim()
      const urgencyRaw = String(document.getElementById('swal-team-urgency')?.value || 'standard').toLowerCase()
      const complexityRaw = String(document.getElementById('swal-team-complexity')?.value || 'minor').toLowerCase()
      const pricingUrgency = urgencyRaw === 'urgent' ? 'urgent' : 'standard'
      const pricingComplexity = ['minor', 'moderate', 'severe'].includes(complexityRaw)
        ? complexityRaw
        : 'minor'

      const fieldChecks = [
        { id: 'swal-team-service-type', valid: !!serviceType, message: 'Service Type is required.' },
        { id: 'swal-team-time', valid: !!preferredTime, message: 'Service Time is required.' },
        { id: 'swal-team-payment-choice', valid: !!paymentChoice, message: 'Payment Method is required.' },
        { id: 'swal-team-house-street', valid: !!houseStreet, message: 'House No. / Street is required.' },
        { id: 'swal-team-city', valid: !!city, message: 'City (Cavite) is required.' },
        { id: 'swal-team-barangay', valid: !!finalBarangay, message: 'Barangay is required.' },
        { id: 'swal-team-zip', valid: !!zip, message: 'ZIP Code is required.' },
        { id: 'swal-team-contact', valid: !!contact, message: 'Contact Number is required.' },
        { id: 'swal-team-problem', valid: !!problemDescription, message: 'Problem Description is required.' },
      ]

      const markFieldError = (id, invalid) => {
        const el = document.getElementById(id)
        if (!el) return
        if (invalid) {
          el.style.borderColor = '#ef4444'
          el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.18)'
          return
        }
        el.style.borderColor = '#cbd5e1'
        el.style.boxShadow = 'none'
      }

      fieldChecks.forEach((field) => markFieldError(field.id, !field.valid))
      const issues = fieldChecks.filter((field) => !field.valid).map((field) => field.message)
      if (issues.length) {
        showFeedbackToast(
          'error',
          `Please complete these required fields:\n• ${issues.join('\n• ')}`,
          5600
        )
        const firstInvalid = fieldChecks.find((field) => !field.valid)
        if (firstInvalid?.id) {
          const input = document.getElementById(firstInvalid.id)
          input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
          input?.focus?.()
        }
        return false
      }

      const amount = Number(amountRaw)
      if (!Number.isFinite(amount) || amount < TEAM_REQUEST_MIN_AMOUNT || amount > TEAM_REQUEST_MAX_AMOUNT) {
        showFeedbackToast(
          'error',
          `Invalid service amount (${String(amountRaw || '').trim() || 'empty'}). Allowed range is PHP ${TEAM_REQUEST_MIN_AMOUNT} to PHP ${TEAM_REQUEST_MAX_AMOUNT.toLocaleString()}.`,
          3200
        )
        return false
      }
      if (downpaymentOptIn) {
        const downpaymentAmount = Number(downpaymentAmountRaw)
        if (!Number.isFinite(downpaymentAmount) || downpaymentAmount <= 0 || downpaymentAmount > TEAM_REQUEST_MAX_AMOUNT) {
          showFeedbackToast(
            'error',
            `Downpayment amount is required and must be between PHP 1 and PHP ${TEAM_REQUEST_MAX_AMOUNT.toLocaleString()}.`,
            3600
          )
          return false
        }
      }
      if (photoFiles.length > 5) {
        showFeedbackToast('error', 'You can upload up to 5 photos only.', 3200)
        return false
      }

      const pricingMeta = hasPricingRules
        ? ` [DISTANCE_KM:${autoDistanceKm.toFixed(2)}] [URGENCY:${pricingUrgency.toUpperCase()}] [COMPLEXITY:${pricingComplexity.toUpperCase()}]`
        : ''
      const paymentMethod = downpaymentOptIn ? 'downpayment' : 'personal'
      const paymentChannelMap = { cash: null, card: 'bank_transfer', e_wallet: 'gcash' }
      const paymentMethodLabelMap = { cash: 'Cash', card: 'Card', e_wallet: 'E-wallet' }
      const paymentLabel = paymentMethodLabelMap[paymentChoice] || paymentChoice
      const downpaymentAmount = downpaymentOptIn ? Number(downpaymentAmountRaw) : 0
      const paymentMeta = downpaymentOptIn
        ? `[PAYMENT:DOWNPAYMENT] [PAYMENT_CHOICE:${String(paymentLabel).toUpperCase()}] [DOWNPAYMENT:${downpaymentAmount.toFixed(2)}]`
        : `[PAYMENT:PERSONAL] [PAYMENT_CHOICE:${String(paymentLabel).toUpperCase()}]`
      const metaTags = `[TEAM-REQUEST] [TEAM:${team.team}] [DATE:${scheduleDate}] [TIME:${preferredTime}] [ESTIMATE:${amount.toFixed(2)}] ${paymentMeta}${pricingMeta}`
      const composedNotes = `Problem: ${problemDescription}\n${String(notes || '').trim()}\n${metaTags}`.trim()

      return {
        service_type: serviceType,
        preferred_date: scheduleDate,
        preferred_time: preferredTime,
        payment_method: paymentMethod,
        payment_choice: paymentChoice,
        payment_channel: downpaymentOptIn ? paymentChannelMap[paymentChoice] : null,
        downpayment_amount: downpaymentOptIn ? downpaymentAmount : 0,
        total_amount: amount,
        pricing_urgency: hasPricingRules ? pricingUrgency : null,
        pricing_complexity: hasPricingRules ? pricingComplexity : null,
        address_text: `${houseStreet}, Brgy. ${finalBarangay}, ${city}, Cavite ${zip}`.trim(),
        contact_number: contact,
        notes: composedNotes,
        photos: photoFiles,
      }
    },
  })

  if (!result.isConfirmed || !result.value) return

  try {
    const payload = {
      ...result.value,
      business_id: team.business_id,
      business_name: team.business_name || team.company_name || '',
      company_name: team.company_name || team.business_name || '',
      business_type: team.business_type || '',
      management_mode: team.management_mode || '',
      latitude: authUser.latitude,
      longitude: authUser.longitude,
    }
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'photos') return
      if (value === null || value === undefined) return
      formData.append(key, String(value))
    })
    ;(payload.photos || []).slice(0, 5).forEach((file) => formData.append('photos[]', file))
    const res = await axios.post('/user/service-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const submitted = res?.data || {}
    if (submitted.invoice_url) {
      window.location.assign('/User/UserDashboard?section=bookingRequest')
      return
    }
    Swal.fire('Success', submitted.message || 'Service request submitted.', 'success')
    await handleRequestSubmitted(submitted, payload, team)
  } catch (err) {
    const apiErrors = err?.response?.data?.errors
    const firstFieldError = apiErrors && typeof apiErrors === 'object'
      ? Object.values(apiErrors).flat().find((msg) => typeof msg === 'string' && msg.trim() !== '')
      : ''
    const message = firstFieldError
      || err?.response?.data?.error
      || err?.response?.data?.message
      || 'Failed to submit request.'
    showFeedbackToast('error', String(message), 3200)
  }
}

/* ACTIONS */
const submitServiceProvider = async () => {
  try {
    if (!spForm.category) {
      Swal.fire('Missing Category', 'Category is auto-set from the selected business. Please pick a valid business first.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('business_id', spForm.business_id);
    formData.append('category', spForm.category);
    formData.append('service_description', spForm.service_description);
    formData.append('experience_years', spForm.experience_years);
    formData.append('latitude', authUser.latitude ?? '');
    formData.append('longitude', authUser.longitude ?? '');

    const res = await axios.post('/user/apply-service-provider', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    Swal.fire('Success', res.data.message || 'Application submitted!', 'success');
    closeApplyModal();

    await fetchApplicationStatus();
    await fetchSPDetails();
  } catch (err) {
    console.error("Submit failed", err);
    const msg = err.response?.data?.error 
                || Object.values(err.response?.data?.errors || {}).flat().join(', ') 
                || 'Failed to submit application';
    Swal.fire('Error', msg, 'error');
  }
}



const confirmLogout = ()=>{
  logout()
}
const logout = async ()=>{
  await confirmAndLogout()
}

const closeMenus = () => {
  showProfileMenu.value = false
  showNotificationsMenu.value = false
}

const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value
  if (showProfileMenu.value) showNotificationsMenu.value = false
}

const toggleNotificationsMenu = async () => {
  const next = !showNotificationsMenu.value
  showNotificationsMenu.value = next
  if (next) {
    showProfileMenu.value = false
    await fetchNotifications()
  }
}

const openProfile = () => {
  closeMenus()
  setSection('profile')
}

const handleDocumentClick = (event) => {
  const nav = event.target?.closest?.('nav')
  if (!nav) closeMenus()
}

const handleGlobalKeydown = (event) => {
  if (event.key === 'Escape' && showLatestBookingDetails.value) {
    showLatestBookingDetails.value = false
  }
}

const clearSelectedProfilePhoto = () => {
  selectedProfilePhoto.value = null
  if (selectedProfilePreviewUrl.value) {
    URL.revokeObjectURL(selectedProfilePreviewUrl.value)
    selectedProfilePreviewUrl.value = ''
  }
}

const validateProfilePhotoFile = (file) => {
  if (!file) return 'No file selected.'
  if (!String(file.type || '').startsWith('image/')) {
    return 'Please select an image file.'
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'Maximum file size is 50MB.'
  }
  return ''
}

const validateGovernmentIdFile = (file) => {
  if (!file) return 'No file selected.'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const allowed = type.startsWith('image/')
    || type === 'application/pdf'
    || ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].some((ext) => name.endsWith(ext))
  if (!allowed) {
    return 'Please select a JPG, PNG, WEBP, or PDF file.'
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'Maximum file size is 50MB.'
  }
  return ''
}

const setSelectedProfilePreview = (file) => {
  if (selectedProfilePreviewUrl.value) {
    URL.revokeObjectURL(selectedProfilePreviewUrl.value)
  }
  selectedProfilePhoto.value = file
  selectedProfilePreviewUrl.value = URL.createObjectURL(file)
}

const saveProfilePhoto = async (file) => {
  try {
    const formData = new FormData()
    formData.append('first_name', authUser.first_name || '')
    formData.append('middle_initial', authUser.middle_initial || '')
    formData.append('last_name', authUser.last_name || '')
    formData.append('contact_number', authUser.contact_number || '')
    formData.append('_method', 'PUT')
    formData.append('profile_photo', file)

    const res = await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.data?.profile_photo) authUser.profile_photo = res.data.profile_photo
    await fetchProfile()
    profileImageFailed.value = false
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}

const handleProfilePhotoUpload = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const validationMessage = validateProfilePhotoFile(file)
  if (validationMessage) {
    Swal.fire('Invalid File', validationMessage, 'warning')
    e.target.value = ''
    clearSelectedProfilePhoto()
    return
  }

  setSelectedProfilePreview(file)
}

const triggerCardPhotoPicker = () => {
  cardPhotoInput.value?.click()
}

const triggerGovernmentIdPicker = () => {
  if (!canSubmitGovernmentIdReplacement.value) {
    Swal.fire('Document Already Submitted', 'Your latest resubmitted Government ID is already under review. Wait for admin rejection before uploading another replacement.', 'info')
    return
  }
  governmentIdInput.value?.click()
}

const clearSelectedGovernmentId = () => {
  selectedGovernmentId.value = null
  if (selectedGovernmentIdPreviewUrl.value && selectedGovernmentIdPreviewUrl.value !== submittedGovernmentIdPreviewUrl.value) {
    URL.revokeObjectURL(selectedGovernmentIdPreviewUrl.value)
  }
  selectedGovernmentIdPreviewUrl.value = ''
  if (governmentIdInput.value) {
    governmentIdInput.value.value = ''
  }
}

const handleCardProfilePhotoUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const validationMessage = validateProfilePhotoFile(file)
  if (validationMessage) {
    Swal.fire('Invalid File', validationMessage, 'warning')
    e.target.value = ''
    return
  }

  setSelectedProfilePreview(file)
  cardPhotoUploading.value = true
  const ok = await saveProfilePhoto(file)
  cardPhotoUploading.value = false
  e.target.value = ''

  if (ok) {
    clearSelectedProfilePhoto()
    Swal.fire('Saved', 'Profile photo updated.', 'success')
  } else {
    Swal.fire('Error', 'Failed to update profile photo', 'error')
  }
}

const handleGovernmentIdSelection = (e) => {
  if (!canSubmitGovernmentIdReplacement.value) {
    e.target.value = ''
    showToastifyAlert('Your latest resubmitted Government ID is already under review. Wait for admin rejection before uploading another replacement.', 'info')
    return
  }

  const file = e.target.files?.[0]
  if (!file) return

  const validationMessage = validateGovernmentIdFile(file)
  if (validationMessage) {
    showToastifyAlert(validationMessage, 'warning')
    e.target.value = ''
    clearSelectedGovernmentId()
    return
  }

  submittedGovernmentIdName.value = ''
  if (submittedGovernmentIdPreviewUrl.value) {
    URL.revokeObjectURL(submittedGovernmentIdPreviewUrl.value)
    submittedGovernmentIdPreviewUrl.value = ''
  }
  if (selectedGovernmentIdPreviewUrl.value) {
    URL.revokeObjectURL(selectedGovernmentIdPreviewUrl.value)
    selectedGovernmentIdPreviewUrl.value = ''
  }
  selectedGovernmentId.value = file
  if (String(file.type || '').startsWith('image/')) {
    selectedGovernmentIdPreviewUrl.value = URL.createObjectURL(file)
  }
}

const openImageZoom = (src) => {
  if (!src) return
  zoomImageUrl.value = src
  showImageZoom.value = true
}

const closeImageZoom = () => {
  showImageZoom.value = false
  zoomImageUrl.value = ''
}

const submitGovernmentId = async () => {
  if (!selectedGovernmentId.value || governmentIdUploading.value) return
  if (!canSubmitGovernmentIdReplacement.value) {
    showToastifyAlert('Your latest resubmitted Government ID is already under review. Wait for admin rejection before uploading another replacement.', 'info')
    clearSelectedGovernmentId()
    return
  }

  const validationMessage = validateGovernmentIdFile(selectedGovernmentId.value)
  if (validationMessage) {
    showToastifyAlert(validationMessage, 'warning')
    clearSelectedGovernmentId()
    return
  }

  try {
    governmentIdUploading.value = true
    const wasUnderReview = accountApprovalState.value !== 'approved'
    const localResubmittedAt = new Date().toISOString()
    const uploadedFile = selectedGovernmentId.value
    const uploadedFileName = String(uploadedFile?.name || '').trim()
    const uploadedPreviewUrl = selectedGovernmentIdPreviewUrl.value
    const formData = new FormData()
    formData.append('first_name', authUser.first_name || '')
    formData.append('middle_initial', authUser.middle_initial || '')
    formData.append('last_name', authUser.last_name || '')
    formData.append('contact_number', authUser.contact_number || '')
    formData.append('_method', 'PUT')
    if (isAccountCorrectionRequired.value) {
      formData.append('force_resubmission', '1')
    }
    formData.append('government_id', uploadedFile)

    const response = await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    let committedGovernmentIdName = uploadedFileName
    let committedGovernmentIdPreviewUrl = uploadedPreviewUrl
    if (response?.data && typeof response.data === 'object') {
      const nextProfile = sanitizeDashboardProfile({
        ...authUser,
        ...response.data,
      })
      Object.assign(authUser, nextProfile)
      persistResolvedDashboardProfile(nextProfile)
      committedGovernmentIdName = String(response.data?.government_id_meta?.name || uploadedFileName || '').trim()

      const committedPath = String(
        response.data?.government_id_resubmission_url
        || response.data?.government_id_resubmission
        || response.data?.government_id_url
        || response.data?.government_id
        || ''
      ).trim()
      const committedResolvedUrl = committedPath ? resolveStorageUrl(committedPath) : ''
      if (committedResolvedUrl) {
        committedGovernmentIdPreviewUrl = committedResolvedUrl
      }
      committedGovernmentIdName = String(
        response.data?.government_id_resubmission_meta?.name
        || response.data?.government_id_last_submitted_name
        || response.data?.government_id_meta?.name
        || committedGovernmentIdName
        || uploadedFileName
      ).trim()
    }

    if (wasUnderReview) {
      markProfileResubmitted(authUser, localResubmittedAt)
      authUser.document_resubmitted_at = localResubmittedAt
      authUser.latest_account_review_title = 'Documents resubmitted'
      authUser.latest_account_review_message = 'Your updated Government ID was submitted for review.'
      authUser.latest_account_review_kind = 'resubmitted'
      authUser.latest_account_review_at = localResubmittedAt
      authUser.latest_account_review_seen_at = null
      authUser.status = 'pending'
      authUser.approval_status = 'pending'
      authUser.is_approved = false
      persistResolvedDashboardProfile(authUser)
    }

    submittedGovernmentIdName.value = committedGovernmentIdName
    submittedGovernmentIdPreviewUrl.value = committedGovernmentIdPreviewUrl
    await fetchNotifications()
    await fetchProfile()
    clearSelectedGovernmentId()
    showToastifyAlert('Government ID uploaded successfully and sent back for review.', 'success')
  } catch (err) {
    console.error(err)
    const fieldErrors = err?.response?.data?.errors || {}
    const governmentIdError = Array.isArray(fieldErrors.government_id) ? fieldErrors.government_id[0] : ''
    const message = governmentIdError || err?.response?.data?.message || 'Failed to upload Government ID.'
    showToastifyAlert(message, 'error')
  } finally {
    governmentIdUploading.value = false
  }
}

const openAccountModal = ()=>showAccountModal.value=true
const closeAccountModal = ()=>{
  showAccountModal.value=false
  clearSelectedProfilePhoto()
}
const openApplyModal = ()=>showApplyModal.value=true
const closeApplyModal = ()=>showApplyModal.value=false
const closeServiceRequestModal = () => {
  showServiceRequestModal.value = false
  serviceRequestContext.value = {}
}
const handleEmbeddedRequestSubmitted = (payload = {}) => {
  const message = String(payload?.message || 'Service request submitted.').trim()
  closeServiceRequestModal()
  if (message) {
    showFeedbackToast('success', message, 2200)
  }
  handleRequestSubmitted(
    payload?.request || {},
    payload?.submittedPayload || null,
    payload?.selectedTeam || null,
  )
}

const updateProfile = async ()=>{
  if (isSavingProfile.value) return

  try{
    isSavingProfile.value = true
    const formData = new FormData()
    formData.append('first_name', authUser.first_name || '')
    formData.append('middle_initial', authUser.middle_initial || '')
    formData.append('last_name', authUser.last_name || '')
    formData.append('contact_number', authUser.contact_number || '')
    formData.append('_method', 'PUT')
    if (selectedProfilePhoto.value) {
      formData.append('profile_photo', selectedProfilePhoto.value)
    }
    await axios.post('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await fetchProfile()
    Swal.fire('Success','Profile updated','success')
    closeAccountModal()
  }
  catch(err){
    console.error(err)
    const fieldErrors = err?.response?.data?.errors || {}
    const profilePhotoError = Array.isArray(fieldErrors.profile_photo) ? fieldErrors.profile_photo[0] : ''
    const firstNameError = Array.isArray(fieldErrors.first_name) ? fieldErrors.first_name[0] : ''
    const lastNameError = Array.isArray(fieldErrors.last_name) ? fieldErrors.last_name[0] : ''
    const contactError = Array.isArray(fieldErrors.contact_number) ? fieldErrors.contact_number[0] : ''
    const message = profilePhotoError || firstNameError || lastNameError || contactError || err?.response?.data?.message || 'Failed to update profile'
    Swal.fire('Error', message, 'error')
  } finally {
    isSavingProfile.value = false
  }
}

const isSectionLocked = (name) => !isApproved.value && name !== 'profile'
const menuClass = (name) => (
  section.value === name
    ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm'
    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
)
const menuIconClass = (name) => (
  section.value === name
    ? 'border-teal-200 bg-white text-teal-700'
    : 'border-gray-200 bg-gray-50 text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700'
)
const setSection = (name)=>{
  const next = normalizeSection(name)
  if(isSectionLocked(next)) return
  closeMenus()
  section.value = next
  setSectionInUrl(next)
  if(next === 'notifications') fetchNotifications()
  if(next === 'spProfile') fetchBusinesses()
}
const openProviderBooking = (provider) => {
  if (requestLocked.value) {
    Swal.fire('Request Locked', lockMessage.value || 'You already have an active request.', 'info')
    return
  }
  const businessId = businessIdentity(provider?.business_id)
  if (!businessId) {
    Swal.fire('Unavailable', 'This provider is not linked to a business yet.', 'warning')
    return
  }

  const fixed = Number(provider?.fixed_price)
  const context = {
    team: String(provider?.name || 'Service Provider'),
    service_provider_id: Number(provider?.id || 0) || null,
    business_id: businessId,
    business_name: String(provider?.business_name || provider?.name || 'Provider Business'),
    business_type: String(provider?.business_type || ''),
    management_mode: String(provider?.management_mode || 'business'),
  }
  const autoServiceType = normalizeServiceTypeLabel(provider?.category || provider?.category_label)
  if (autoServiceType) {
    context.service_type = autoServiceType
  }
  if (Number.isFinite(fixed) && fixed > 0) {
    context.fixed_price = fixed
  }
  serviceRequestContext.value = context
  showServiceRequestModal.value = true
}

const openBusinessBooking = (business) => {
  if (requestLocked.value) {
    Swal.fire('Request Locked', lockMessage.value || 'You already have an active request.', 'info')
    return
  }

  const businessId = businessIdentity(business?.id)
  if (!businessId) {
    Swal.fire('Unavailable', 'This business is not ready for booking yet.', 'warning')
    return
  }

  const context = {
    team: String(business?.business_name || 'Business Workspace'),
    service_provider_id: null,
    business_id: businessId,
    business_name: String(business?.business_name || 'Business Workspace'),
    business_type: String(business?.business_type || ''),
    management_mode: String(business?.management_mode || 'business'),
    category: String(business?.category || ''),
    category_label: String(business?.category_label || business?.category || 'General Service'),
    type_label: String(business?.type_label || business?.business_type || 'Business'),
    address_label: String(business?.address_label || ''),
    contact_label: String(business?.contact_label || ''),
    address_street: String(business?.address_street || business?.address || ''),
    address_barangay: String(business?.address_barangay || ''),
    address_city: String(business?.address_city || ''),
    address_province: String(business?.address_province || ''),
    address_postal: String(business?.address_postal || ''),
    business_latitude: business?.latitude ?? null,
    business_longitude: business?.longitude ?? null,
  }

  serviceRequestContext.value = context
  showServiceRequestModal.value = true
}
const unreadCount = computed(()=> notifications.value.filter(n=>!n.read_at).length)
const markRead = async (id)=>{
  if (!id) return
  const target = notifications.value.find(x=>x.id===id)
  if (!target || target?.read_at) {
    syncNotificationCache()
    return
  }
  if (target?.synthetic) {
    await markProfileReviewSeen()
    syncNotificationCache()
    return
  }
  try{
    await axios.post(`/user/notifications/${id}/read`)
    const n = notifications.value.find(x=>x.id===id)
    if(n) n.read_at = new Date().toISOString()
    syncNotificationCache()
  }catch{
    const n = notifications.value.find(x=>x.id===id)
    if (n) n.read_at = new Date().toISOString()
    syncNotificationCache()
  }
}

const markAllNotificationsRead = async () => {
  const unread = (notifications.value || []).filter((n) => !n.read_at)
  if (!unread.length) return
  await Promise.all(unread.map((n) => markRead(n.id)))
}

const handleNotificationClick = async (note) => {
  if (!note?.read_at && note?.id) {
    await markRead(note.id)
  }
}

const isCompletionReviewPending = (req) => (
  String(req?.status || '').trim().toLowerCase() === 'completed'
  && String(req?.completion_review_status || '').trim().toLowerCase() === 'pending'
)

const prettyStatus = (input)=>{
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if(s === 'pending') return 'Pending'
  if(s === 'approved' || s === 'accepted') return 'Approved'
  if(s === 'assigned') return 'Team Assigned'
  if(s === 'in_progress' || s === 'ongoing') return 'Work in Progress'
  if(s === 'completed' && isCompletionReviewPending(req)) return 'Awaiting OM Verification'
  if(s === 'completed') return 'Completed'
  if(s === 'rejected') return 'Rejected'
  if(s === 'cancelled') return 'Cancelled'
  if(s === 'awaiting_material') return 'Awaiting Materials'
  if(s === 'job_ready') return 'Dispatch Ready'
  return req?.status || input || 'Unknown'
}

const paymentMethodLabel = (method) => {
  const m = String(method || '').toLowerCase().trim()
  if (m === 'downpayment') return 'Downpayment'
  if (m === 'full') return 'Full Payment'
  if (m === 'personal') return 'Pay On Site'
  return 'N/A'
}

const paymentChannelLabel = (channel) => {
  const value = String(channel || '').toLowerCase().trim()
  if (value === 'gcash') return 'GCash'
  if (value === 'paypal') return 'PayPal'
  if (value === 'paymaya' || value === 'sm_bills' || value === 'lazada_shopeepay') return 'PayPal'
  return value ? value.replace(/_/g, ' ') : 'N/A'
}

const noteTagValue = (notes, key) => {
  const text = String(notes || '')
  const match = text.match(new RegExp(`\\[${key}:([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim()
}

const PROPERTY_CLASSIFICATION_LABELS = Object.freeze({
  house: 'House',
  apartment: 'Apartment',
  condominium: 'Condominium',
  restaurant: 'Restaurant',
  office: 'Office',
  store: 'Store',
  hotel: 'Hotel',
  school: 'School',
  warehouse: 'Warehouse',
  factory: 'Factory',
  plant: 'Plant',
  facility: 'Facility',
})

const humanizeTaggedWords = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const taggedTextValue = (req, key) => noteTagValue(req?.notes, key)

const requestCategoryLabel = (req) => {
  const value = String(req?.property_type || taggedTextValue(req, 'PROPERTY_TYPE') || '').trim().toLowerCase()
  if (value === 'residential') return 'Residential'
  if (value === 'commercial') return 'Commercial'
  if (value === 'industrial') return 'Industrial'
  return 'N/A'
}

const requestCustomerSetupLabel = (req) => {
  const value = String(req?.customer_type || taggedTextValue(req, 'CUSTOMER_TYPE') || '').trim().toLowerCase()
  if (value === 'non_contract') return 'Standard Client'
  if (value === 'contracted') return 'Contract Client'
  return 'N/A'
}

const requestPropertyClassificationLabel = (req) => {
  const value = String(req?.property_classification || taggedTextValue(req, 'PROPERTY_CLASSIFICATION') || '').trim().toLowerCase()
  if (!value) return 'N/A'
  return PROPERTY_CLASSIFICATION_LABELS[value] || humanizeTaggedWords(value)
}

const requestTruckLoadVolumeLabel = (req) => {
  const value = String(req?.truck_load_volume || taggedTextValue(req, 'TRUCK_LOAD_VOLUME') || '').trim().toLowerCase()
  if (value === 'standard') return 'Standard Load'
  if (value === 'large') return 'Large Load'
  return value ? humanizeTaggedWords(value) : 'N/A'
}

const requestTaggedSentenceLabel = (req, key) => {
  const value = String(taggedTextValue(req, key) || '').trim()
  return value ? humanizeTaggedWords(value) : 'N/A'
}

const requestContractReferenceLabel = (req) => {
  const value = String(taggedTextValue(req, 'CONTRACT_REFERENCE') || '').trim()
  return value ? value.replace(/_/g, ' ') : 'N/A'
}

const requestLandmarkLabel = (req) => {
  const tagged = String(taggedTextValue(req, 'LANDMARK') || '').trim()
  if (tagged) return tagged.replace(/_/g, ' ')
  const address = String(req?.address_text || '').trim()
  const match = address.match(/Landmark:\s*([^,]+)/i)
  return String(match?.[1] || '').trim() || 'N/A'
}

const inspectionQuoteAmount = (req) => {
  const tagged = Number(noteTagValue(req?.notes, 'INSPECTION_QUOTE'))
  if (Number.isFinite(tagged) && tagged > 0) return tagged
  return 0
}

const hasInspectionQuote = (req) => inspectionQuoteAmount(req) > 0

const requestServiceTrack = (req) => {
  const raw = String(
    req?.service_track
    || req?.service_type
    || req?.category
    || req?.category_label
    || taggedTextValue(req, 'SERVICE_TRACK')
    || ''
  ).trim().toLowerCase()

  if (/(siphon|septic|desludg|vacuum|jetter)/.test(raw)) return 'siphoning'
  return raw
}

const inspectionBillingNotice = 'Inspection required before final billing'

const hasCompletedInspection = (req) => {
  const result = String(req?.inspection_result || '').trim().toLowerCase()
  if (['minor', 'major'].includes(result)) return true
  const status = String(req?.status || '').trim().toLowerCase()
  return ['completed', 'warranty_pending', 'warranty_rework'].includes(status)
}

const isInspectionBillingRequired = (req) => requestServiceTrack(req) === 'siphoning'

const canShowInvoiceAmount = (req) => {
  if (!isInspectionBillingRequired(req)) return true
  if (hasCompletedInspection(req)) return true
  const invoicePhase = String(req?.latest_invoice?.phase || '').trim().toLowerCase()
  const paymentMethod = String(req?.payment_method || '').trim().toLowerCase()
  return invoicePhase === 'downpayment' || paymentMethod === 'downpayment'
}

const canShowFinalBillingAmount = (req) => {
  if (!isInspectionBillingRequired(req)) return true
  return hasCompletedInspection(req)
}

const quoteApprovalValue = (req) =>
  String(noteTagValue(req?.notes, 'QUOTE_APPROVAL') || '').trim().toLowerCase()

const quoteRejectionReason = (req) =>
  String(noteTagValue(req?.notes, 'QUOTE_REJECTION_REASON') || '').trim()

const quoteApprovalLabel = (req) => {
  const value = quoteApprovalValue(req)
  if (value === 'approved') return 'Approved by assigned team'
  if (value === 'rejected') return 'Declined by assigned team'
  if (value === 'pending') return 'Waiting for assigned team review'
  return 'Waiting for assigned team review'
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

const teamRecordFromRequest = (req) => {
  const all = formedTeams.value || []
  const businessId = businessIdentity(req?.business_id || req?.business?.id)
  const requestedTeam = String(noteTagValue(req?.notes, 'TEAM') || '').trim().toLowerCase()

  let candidates = all
  if (businessId) {
    const byBusiness = all.filter((team) => businessIdentity(team?.business_id) === businessId)
    if (byBusiness.length) candidates = byBusiness
  }

  if (requestedTeam) {
    const byRequested = candidates.find((team) => String(team?.team || '').trim().toLowerCase() === requestedTeam)
    if (byRequested) return byRequested
  }

  return candidates[0] || null
}

const requestServiceTimeLabel = (req) => {
  const taggedTime = noteTagValue(req?.notes, 'TIME')
  if (taggedTime) return normalizeTimeText(taggedTime)
  const text = String(req?.notes || '')
  const fallback = text.match(/\b([0-1]?\d:[0-5]\d\s?(?:AM|PM))\b/i)
  if (fallback?.[1]) return String(fallback[1]).trim()
  const team = teamRecordFromRequest(req)
  const from = normalizeTimeText(team?.team_schedule_time_from)
  const to = normalizeTimeText(team?.team_schedule_time_to)
  if (from && to) return `${from} - ${to}`
  if (from) return from
  return 'N/A'
}

const requestScheduleLabel = (req) => {
  const datePart = formatDate(req?.preferred_date)
  const timePart = requestServiceTimeLabel(req)
  if (timePart && timePart !== 'N/A') {
    return `${datePart} | ${timePart}`
  }
  return datePart
}

const requestedTeamLabel = (req) => {
  const taggedTeam = noteTagValue(req?.notes, 'TEAM')
  if (taggedTeam) return taggedTeam
  const text = String(req?.notes || '')
  const legacy = text.match(/Requested\s+for\s+([^\[]+)/i)
  return String(legacy?.[1] || '').trim() || 'N/A'
}

const inferredTeamByBusiness = (req) => {
  const team = teamRecordFromRequest(req)
  return String(team?.team || '').trim() || 'N/A'
}

const assignedTeamDisplay = (req) => {
  const assigned = String(req?.assigned_team || '').trim()
  if (assigned) return assigned
  const requested = requestedTeamLabel(req)
  if (requested !== 'N/A') return requested
  const inferred = inferredTeamByBusiness(req)
  return inferred !== 'N/A' ? inferred : 'Not assigned yet'
}

const cleanedRequestNotes = (notes) => {
  const text = String(notes || '').trim()
  if (!text) return 'N/A'
  const cleaned = text
    .replace(/\[TEAM-REQUEST\]/ig, '')
    .replace(/\[TEAM:[^\]]+\]/ig, '')
    .replace(/\[DATE:[^\]]+\]/ig, '')
    .replace(/\[TIME:[^\]]+\]/ig, '')
    .replace(/\[ROUTED_TO:[^\]]+\]/ig, '')
    .replace(/\[TEAM_TYPE:[^\]]+\]/ig, '')
    .replace(/\[TL_CONFIRMATION:[^\]]+\]/ig, '')
    .replace(/\[MATERIALS_COLLECTED:[^\]]+\]/ig, '')
    .replace(/\[(?:PAYMENT|ESTIMATE|DISTANCE_KM|URGENCY|COMPLEXITY|PRICING_SERVICE|PRICING_DISTANCE_KM|PRICING_COMPLEXITY|PRICING_URGENCY|PRICING_TOTAL):[^\]]+\]/ig, '')
    .replace(/\[[A-Z0-9_ -]+:[^\]]+\]/ig, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'N/A'
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

const requestAmountToPayValue = (req) => {
  if (!canShowInvoiceAmount(req)) return null
  const phase = String(req?.latest_invoice?.phase || '').trim().toLowerCase()
  if (phase === 'downpayment') {
    const downpayment = Number(req?.latest_invoice?.amount || req?.downpayment_amount || 0)
    if (Number.isFinite(downpayment) && downpayment > 0) return downpayment
  }
  const invoiceAmount = Number(req?.latest_invoice?.amount)
  if (Number.isFinite(invoiceAmount) && invoiceAmount > 0) return invoiceAmount
  const direct = Number(req?.total_amount)
  if (Number.isFinite(direct) && direct > 0) return direct
  const finalAmount = Number(req?.final_amount)
  if (Number.isFinite(finalAmount) && finalAmount > 0) return finalAmount
  const tagged = Number(noteTagValue(req?.notes, 'ESTIMATE'))
  if (Number.isFinite(tagged) && tagged > 0) return tagged
  return 0
}

const requestAmountToPayLabel = (req) => {
  if (!canShowInvoiceAmount(req)) return inspectionBillingNotice
  const value = requestAmountToPayValue(req)
  if (value > 0) return money(value)
  return 'N/A'
}

const requestFinalAmountLabel = (req) => {
  if (!canShowFinalBillingAmount(req)) return inspectionBillingNotice
  const value = Number(req?.final_amount || 0)
  if (Number.isFinite(value) && value > 0) return money(value)
  const quote = inspectionQuoteAmount(req)
  if (Number.isFinite(quote) && quote > 0) return money(quote)
  return 'N/A'
}

const inspectionResultLabel = (value, status) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'minor') return 'Minor issue'
  if (normalized === 'major') return 'Major issue'
  const state = String(status || '').trim().toLowerCase()
  if (['assigned', 'awaiting_material', 'job_ready', 'in_progress', 'completed'].includes(state)) {
    return 'Inspection pending update'
  }
  return 'Not inspected yet'
}

const liveReportStageLabel = (req) => {
  const stage = String(req?.live_report_stage || '').trim().toLowerCase()
  if (stage === 'arrived') return 'Status 1: Team arrived at the location'
  if (stage === 'work_in_progress') return 'Status 2: Work in progress with before photos uploaded'
  if (stage === 'completed' && String(req?.completion_review_status || '').trim().toLowerCase() === 'pending') {
    return 'Status 3: Work completed, waiting for OM final verification'
  }
  if (stage === 'completed') return 'Status 3: Work completed'
  if (String(req?.status || '').trim().toLowerCase() === 'job_ready') return 'Dispatch ready, waiting for team arrival'
  return 'Waiting for live field update'
}

const receiptReferenceLabel = (req) => {
  const reference = String(req?.latest_invoice?.reference || '').trim()
  if (reference) return reference
  const invoiceId = Number(req?.latest_invoice?.id || 0)
  if (invoiceId > 0) return `Invoice #${invoiceId}`
  if (String(req?.payment_status || '').trim().toLowerCase() === 'paid') return 'Paid (reference unavailable)'
  return 'Not generated yet'
}

const money = (value, currency = 'PHP') => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
  }).format(amountValue(value))
}

const paymentStatusLabel = (req) => {
  const method = String(req?.payment_method || '').toLowerCase().trim()
  const reqStatus = String(req?.payment_status || '').toLowerCase().trim()
  const invPhase = String(req?.latest_invoice?.phase || '').toLowerCase().trim()
  const invStatus = String(req?.latest_invoice?.status || '').toLowerCase().trim()

  if (method === 'downpayment') {
    if (reqStatus === 'paid' || (invPhase === 'final' && invStatus === 'paid')) return 'Fully Paid'
    if (reqStatus === 'partial_paid' || (invPhase === 'downpayment' && invStatus === 'paid')) return 'Downpayment Paid (Partial)'
    if (invStatus === 'expired') return 'Downpayment Expired'
    if (invStatus === 'failed') return 'Downpayment Failed'
    return 'Downpayment Pending'
  }

  if (method === 'personal') {
    if (reqStatus === 'paid') return 'Paid on Site'
    if (String(req?.status || '').toLowerCase().trim() === 'completed') return 'Awaiting On-Site Payment'
    return 'Pay on Completion'
  }

  if (reqStatus === 'paid') return 'Paid'
  if (reqStatus === 'unpaid') return 'Unpaid'
  return reqStatus ? prettyStatus(reqStatus) : 'Pending'
}

const normalizeRequestStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'accepted') return 'approved'
  if (s === 'ongoing') return 'in_progress'
  return s
}

const userStatusFlow = WORKFLOW_TRACKER_FLOW
const userStatusLabel = WORKFLOW_TRACKER_LABELS

const userTimeline = (req) => {
  const current = requestWorkflowKey(req)

  if (current === 'rejected' || current === 'cancelled') {
    return [
      { key: 'csr_review', label: userStatusLabel.csr_review, state: 'done', order: 1 },
      { key: current, label: userStatusLabel[current], state: 'current', order: 2 }
    ]
  }

  const idx = userStatusFlow.indexOf(current)
  if (idx === -1) {
    return [{ key: current || 'unknown', label: prettyStatus(req), state: 'current', order: 1 }]
  }

  return userStatusFlow.map((key, i) => ({
    key,
    label: userStatusLabel[key] || key,
    state: i < idx ? 'done' : (i === idx ? 'current' : 'todo'),
    order: i + 1,
  }))
}

const userProgressPercent = (req) => {
  const current = requestWorkflowKey(req)
  if (current === 'rejected' || current === 'cancelled') return 100
  const idx = userStatusFlow.indexOf(current)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / userStatusFlow.length) * 100)
}

const userCurrentStep = (req) => {
  const current = requestWorkflowKey(req)
  if (current === 'rejected' || current === 'cancelled') return 2
  const idx = userStatusFlow.indexOf(current)
  return idx === -1 ? 1 : (idx + 1)
}

const userTotalSteps = (req) => {
  const current = requestWorkflowKey(req)
  if (current === 'rejected' || current === 'cancelled') return 2
  return userStatusFlow.length
}

const userProgressBarClass = (req) => {
  const s = requestWorkflowKey(req)
  if (s === 'rejected') return 'bg-rose-500'
  if (s === 'cancelled') return 'bg-slate-500'
  if (s === 'csr_review') return 'bg-amber-500'
  if (s === 'operations_review') return 'bg-sky-500'
  if (s === 'materials_coordination') return 'bg-orange-500'
  if (s === 'finance_approval') return 'bg-violet-500'
  if (s === 'dispatch_ready') return 'bg-cyan-500'
  if (s === 'service_execution') return 'bg-indigo-500'
  if (s === 'completed') return 'bg-emerald-500'
  return 'bg-amber-500'
}

const userStageDescription = (key) => requestWorkflowDescription(key)

const openUserStageInfo = (key, req) => {
  Swal.fire({
    title: userStatusLabel[key] || prettyStatus(req),
    text: userStageDescription(key),
    footer: `Current status: ${prettyStatus(req)} | Last update: ${formatDateTime(req.updated_at || req.created_at)}`,
    icon: 'info',
    confirmButtonText: 'OK'
  })
}

const timelineClass = (state) => {
  if (state === 'done') return 'border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:brightness-95'
  if (state === 'current') return 'border border-sky-500 bg-sky-600 text-white shadow-sm'
  return 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
}

const statusToast = (status)=>{
  const s = String(status || '').toLowerCase()
  if(s === 'rejected') return { icon: 'error', title: 'Request Rejected' }
  if(s === 'completed') return { icon: 'success', title: 'Request Completed' }
  if(s === 'in_progress' || s === 'ongoing') return { icon: 'info', title: 'Work in Progress' }
  if(s === 'assigned') return { icon: 'info', title: 'Team Assigned' }
  if(s === 'approved' || s === 'accepted') return { icon: 'success', title: 'Request Approved' }
  if(s === 'pending') return { icon: 'warning', title: 'Request Pending' }
  if(s === 'cancelled') return { icon: 'info', title: 'Request Cancelled' }
  return { icon: 'info', title: 'Request Updated' }
}

const showToast = ({ icon = 'info', title = '', text = '' })=>{
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    text,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true
  })
}

const statusClass = (input)=>{
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if(s === 'completed' && isCompletionReviewPending(req)) return 'bg-sky-50 text-sky-700'
  if(s === 'pending') return 'bg-amber-50 text-amber-700'
  if(s === 'approved' || s === 'accepted') return 'bg-emerald-50 text-emerald-700'
  if(s === 'assigned') return 'bg-sky-50 text-sky-700'
  if(s === 'in_progress' || s === 'ongoing') return 'bg-indigo-50 text-indigo-700'
  if(s === 'completed') return 'bg-teal-50 text-teal-700'
  if(s === 'rejected') return 'bg-rose-50 text-rose-700'
  if(s === 'cancelled') return 'bg-slate-100 text-slate-600'
  if(s === 'awaiting_material') return 'bg-orange-50 text-orange-700'
  if(s === 'job_ready') return 'bg-cyan-50 text-cyan-700'
  return 'bg-gray-100 text-gray-700'
}

const cardAccentClass = (input) => {
  const req = input && typeof input === 'object' ? input : null
  const s = String(req?.status ?? input ?? '').toLowerCase()
  if (s === 'rejected') return 'border-l-rose-500'
  if (s === 'cancelled') return 'border-l-slate-400'
  if (s === 'completed' && isCompletionReviewPending(req)) return 'border-l-sky-500'
  if (s === 'completed') return 'border-l-emerald-500'
  if (s === 'in_progress' || s === 'ongoing') return 'border-l-indigo-500'
  if (s === 'awaiting_material') return 'border-l-orange-500'
  if (s === 'job_ready') return 'border-l-cyan-500'
  if (s === 'assigned') return 'border-l-sky-500'
  if (s === 'approved' || s === 'accepted') return 'border-l-emerald-500'
  return 'border-l-amber-500'
}

const formatDate = (value)=>{
  if(!value) return 'N/A'
  const d = new Date(value)
  if(Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const formatDateTime = (value)=>{
  if(!value) return 'N/A'
  const d = new Date(value)
  if(Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const timeAgo = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

const mappedRequests = computed(() => {
  const base = serviceRequests.value.map(r => ({
    ...r,
    business_name: r.business?.business_name || r.business_name || 'N/A',
    rejection_reason: r.rejection_reason || r.reject_reason || null
  }))
  if (localPendingRequest.value) {
    const exists = base.some(r => String(r.id) === String(localPendingRequest.value.id))
    if (!exists) {
      base.unshift(localPendingRequest.value)
    }
  }
  return base
})

const flowSortDateValue = (value) => {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

const flowRequests = computed(() =>
  [...mappedRequests.value].sort((a, b) => flowSortDateValue(b.updated_at || b.created_at) - flowSortDateValue(a.updated_at || a.created_at))
)

const providerProfiles = computed(() =>
  (serviceProviders.value || []).map((provider) => ({
    ...provider,
    name: serviceProviderFullName(provider),
    category_label: serviceProviderCategoryLabel(provider),
    contact_label: displayContactNumber(provider?.contact_number),
    email_label: String(provider?.email || '').trim() || 'N/A',
  }))
)

const bookingBusinesses = computed(() =>
  (businesses.value || [])
    .filter((business) => {
      if (String(business?.source_kind || '').trim().toLowerCase() === 'profile_registration') {
        return true
      }
      const approval = String(business?.status || business?.approval_status || '').trim().toLowerCase()
      const approvedFlag = business?.is_approved
      if (approvedFlag === true) return true
      if (approval) return approval === 'approved'
      return true
    })
    .map((business) => {
      const addressLabel = [
        business?.address,
        business?.address_barangay,
        business?.address_city,
        business?.address_province,
      ].filter(Boolean).join(', ') || 'Address not available'
      const distanceMeta = businessDistanceMeta(business)
      const normalizedCategory = normalizeCategory(business?.category || business?.category_label)
      const categoryLabel = normalizedCategory === 'both'
        ? 'Plumbing & Siphoning'
        : normalizedCategory === 'plumbing'
          ? 'Plumbing'
          : normalizedCategory === 'siphoning'
            ? 'Siphoning'
            : (String(business?.category || business?.category_label || 'General Service').trim() || 'General Service')

      return {
        ...business,
        booking_flow_mode: String(business?.management_mode || '').trim().toLowerCase() === 'hr' ? 'hr' : 'business',
        service_filter_key: normalizedCategory,
        category_label: categoryLabel,
        type_label: String(business?.business_type || 'Business').trim() || 'Business',
        owner_label: businessOwnerLabel(business),
        contact_label: displayContactNumber(business?.contact_number),
        address_label: addressLabel,
        map_has_coordinates: toFiniteNumber(business?.latitude) !== null && toFiniteNumber(business?.longitude) !== null,
        map_link:
          toFiniteNumber(business?.latitude) !== null && toFiniteNumber(business?.longitude) !== null
            ? mapLink(business?.latitude, business?.longitude)
            : (addressLabel && addressLabel !== 'Address not available' ? searchMapLink(addressLabel) : ''),
        ...distanceMeta,
      }
    })
    .sort((a, b) => {
      if (a.hasDistance !== b.hasDistance) return a.hasDistance ? -1 : 1
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm
      return String(a.business_name || '').localeCompare(String(b.business_name || ''))
    })
)

const bookingBusinessFilterOptions = computed(() => {
  const rows = bookingBusinesses.value || []
  return [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'plumbing', label: 'Plumbing', count: rows.filter((business) => bookingBusinessFilterMatch(business, 'plumbing')).length },
    { id: 'siphoning', label: 'Siphoning', count: rows.filter((business) => bookingBusinessFilterMatch(business, 'siphoning')).length },
    { id: 'both', label: 'Both', count: rows.filter((business) => bookingBusinessFilterMatch(business, 'both')).length },
  ]
})

const activeBookingFilterLabel = computed(() => (
  bookingBusinessFilterOptions.value.find((option) => option.id === bookingBusinessFilter.value)?.label || 'All'
))

const filteredBookingBusinesses = computed(() =>
  bookingBusinesses.value.filter((business) => bookingBusinessFilterMatch(business, bookingBusinessFilter.value))
)

const providerById = computed(() => {
  const map = new Map()
  providerProfiles.value.forEach((provider) => {
    const id = Number(provider?.id || 0)
    if (id > 0) map.set(id, provider)
  })
  return map
})

const requestProviderProfile = (req) => {
  const embedded = req?.service_provider
  if (embedded && typeof embedded === 'object') {
    const embeddedName = String(embedded.name || '').trim()
    const embeddedCategory = String(embedded.category || '').trim()
    return {
      id: Number(embedded.id || 0) || null,
      name: embeddedName || 'N/A',
      category_label: embeddedCategory ? serviceProviderCategoryLabel({ category: embeddedCategory }) : 'General Service',
      email_label: String(embedded.email || '').trim() || 'N/A',
      contact_label: displayContactNumber(embedded.contact_number),
      is_available: !!embedded.is_available,
    }
  }
  const providerId = Number(req?.service_provider_id || 0)
  return providerById.value.get(providerId) || null
}

const bookingReviewRequests = computed(() =>
  flowRequests.value.filter((req) => {
    const status = String(req?.status || '').trim().toLowerCase()
    return ['pending', 'approved', 'accepted', 'rejected', 'cancelled'].includes(status)
  })
)

const inspectionDeploymentRequests = computed(() =>
  flowRequests.value.filter((req) => {
    const status = String(req?.status || '').trim().toLowerCase()
    if (['assigned', 'awaiting_material', 'job_ready', 'in_progress', 'ongoing', 'completed'].includes(status)) return true
    return !!String(req?.assigned_employee_name || '').trim()
  })
)

const paymentDeterminationRequests = computed(() =>
  flowRequests.value.filter((req) => {
    const method = String(req?.payment_method || '').trim().toLowerCase()
    const status = String(req?.payment_status || '').trim().toLowerCase()
    if (method === 'personal') {
      return status === 'paid'
    }
    if (method === 'downpayment' || method === 'full') {
      return true
    }
    return status === 'paid'
  })
)

const warrantyHandlingRequests = computed(() =>
  flowRequests.value.filter((req) => {
    const status = String(req?.status || '').trim().toLowerCase()
    const warranty = String(req?.warranty_status || '').trim().toLowerCase()
    return (
      status === 'completed'
      || status === 'warranty_pending'
      || status === 'warranty_rework'
      || warranty === 'active'
      || warranty === 'claimed'
      || warranty === 'rework_scheduled'
      || warranty === 'rejected'
      || warranty === 'expired'
    )
  })
)

const bookingFlowStats = computed(() => {
  const rows = flowRequests.value
  return {
    total: rows.length,
    pending: rows.filter((req) => String(req?.status || '').trim().toLowerCase() === 'pending').length,
    active: rows.filter((req) => {
      const status = String(req?.status || '').trim().toLowerCase()
      if (['rejected', 'cancelled'].includes(status)) return false
      if (status === 'completed' && !isCompletionReviewPending(req)) return false
      return true
    }).length,
    completed: rows.filter((req) => String(req?.status || '').trim().toLowerCase() === 'completed' && !isCompletionReviewPending(req)).length,
  }
})

const latestBookingRequest = computed(() =>
  flowRequests.value[0]
  || mappedRequests.value[0]
  || serviceRequests.value[0]
  || localPendingRequest.value
  || null
)

const pendingRequest = computed(() =>
  mappedRequests.value.find(r => String(r.status || '').trim().toLowerCase() === 'pending') || null
)

const sortDateValue = (value) => {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

const activeRequest = computed(() => {
  const activeRows = mappedRequests.value.filter((r) => {
    const status = String(r?.status || '').trim().toLowerCase()
    return !['rejected', 'cancelled', 'completed'].includes(status)
  })
  if (!activeRows.length) return null
  const latestActive = [...activeRows].sort((a, b) => {
    const aTime = sortDateValue(a.updated_at || a.created_at)
    const bTime = sortDateValue(b.updated_at || b.created_at)
    return bTime - aTime
  })[0]
  return latestActive || null
})

const requestLocked = computed(() => {
  return !!activeRequest.value
})

const activeRequestStatus = computed(() =>
  String(activeRequest.value?.status || '').trim().toLowerCase()
)
const activeRequestProviderId = computed(() =>
  Number(activeRequest.value?.service_provider_id || 0)
)
const activeRequestBusinessId = computed(() =>
  businessIdentity(activeRequest.value?.business_id || activeRequest.value?.business?.id)
)
const canCancelActiveRequest = computed(() => {
  if (!activeRequest.value) return false
  return ['pending', 'approved', 'assigned'].includes(activeRequestStatus.value)
})

const canCancelForProvider = (provider) => {
  if (!canCancelActiveRequest.value) return false
  const providerId = Number(provider?.id || 0)
  const providerBusinessId = businessIdentity(provider?.business_id)
  if (activeRequestProviderId.value > 0) {
    return providerId > 0 && providerId === activeRequestProviderId.value
  }
  if (activeRequestBusinessId.value) {
    return !!providerBusinessId && providerBusinessId === activeRequestBusinessId.value
  }
  return false
}

const lockMessage = computed(() => {
  if (!activeRequest.value) return ''
  const status = prettyStatus(activeRequest.value)
  const name = activeRequest.value.business_name || 'a business'
  if (String(activeRequest.value.status || '').trim().toLowerCase() === 'pending') {
    return `You already requested ${name}. Cancel it before requesting another.`
  }
  return `You have an active request with ${name} (${status}). Please wait until it finishes.`
})

const markRequestCancelledLocally = (id) => {
  if (!id) return
  const targetId = String(id)
  serviceRequests.value = (serviceRequests.value || []).map((r) =>
    String(r.id) === targetId
      ? {
          ...r,
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }
      : r
  )
  if (localPendingRequest.value && String(localPendingRequest.value.id) === targetId) {
    localPendingRequest.value = null
  }
}

const feedbackStars = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating) || 0))
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`
}

const hasFeedback = (req) => {
  const feedback = req?.feedback || null
  if (!feedback) return false
  const rating = Number(feedback.rating || 0)
  const text = String(feedback.feedback || '').trim()
  const submittedAt = String(feedback.submitted_at || '').trim()
  return Boolean(rating > 0 || text || submittedAt)
}

const canLeaveFeedback = (req) => {
  const status = String(req?.status || '').trim().toLowerCase()
  return status === 'completed' && !hasFeedback(req)
}

const isCancelableRequest = (req) => {
  const status = String(req?.status || '').trim().toLowerCase()
  return !['completed', 'cancelled', 'rejected'].includes(status)
}

const warrantyDaysLeft = (req) => {
  const exp = req?.warranty_expires_at ? new Date(req.warranty_expires_at) : null
  if (!exp || Number.isNaN(exp.getTime())) return 0
  const diff = exp.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

const warrantyStatusLabel = (req) => {
  const raw = String(req?.warranty_status || '').trim().toLowerCase()
  if (raw === 'active') return 'Warranty active (14 days)'
  if (raw === 'claimed') return 'Warranty case filed'
  if (raw === 'warranty_pending') return 'Warranty under review'
  if (raw === 'rework_scheduled') return 'Warranty approved for free repair'
  if (raw === 'rejected') return 'Warranty claim rejected'
  if (raw === 'completed') return 'Warranty completed'
  if (raw === 'expired') return 'Warranty expired'
  if (raw === 'pending') return 'Warranty under review'
  if (raw === 'none' && String(req?.status || '').trim().toLowerCase() === 'completed') return 'Warranty available'
  return raw ? prettyStatus(raw) : 'Not available'
}

const canClaimWarranty = (req) => {
  const status = String(req?.status || '').trim().toLowerCase()
  if (status !== 'completed') return false
  const paymentStatus = String(req?.payment_status || '').trim().toLowerCase()
  if (paymentStatus !== 'paid') return false
  const warrantyStatus = String(req?.warranty_status || '').trim().toLowerCase()
  if (warrantyStatus !== 'active') return false
  return warrantyDaysLeft(req) > 0
}

const claimWarranty = async (req) => {
  if (!req?.id) return
  const confirm = await Swal.fire({
    title: 'File warranty case?',
    text: 'This will send the request back for warranty review and free repair if the issue is valid.',
    icon: 'question',
    input: 'textarea',
    inputLabel: 'Issue details (optional)',
    inputPlaceholder: 'Describe the issue...',
    showCancelButton: true,
    confirmButtonText: 'Submit claim',
  })
  if (!confirm.isConfirmed) return

  try {
    await axios.post(`/user/service-requests/${req.id}/warranty-claim`, {
      notes: String(confirm.value || '').trim() || null,
    })
    Swal.fire('Submitted', 'Warranty claim was submitted. The provider will review it for a free repair if valid.', 'success')
    await fetchServiceRequests()
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit warranty claim.', 'error')
  }
}

const openFeedbackModal = async (req) => {
  if (!req?.id) return

  const html = `
    <div style="display:grid;gap:10px;text-align:left">
      <div>
        <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Rating</label>
        <select id="swal-feedback-rating" class="swal2-input" style="margin:0;width:100%;border-radius:10px;border:1px solid #cbd5e1;padding:10px">
          <option value="">Select rating</option>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very Good</option>
          <option value="3">3 - Good</option>
          <option value="2">2 - Fair</option>
          <option value="1">1 - Poor</option>
        </select>
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Feedback (optional)</label>
        <textarea id="swal-feedback-text" class="swal2-textarea" placeholder="Share your experience..." style="margin:0;width:100%;min-height:90px;border-radius:10px;border:1px solid #cbd5e1;padding:10px;resize:vertical"></textarea>
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Photos (optional, up to 5)</label>
        <input id="swal-feedback-files" type="file" accept="image/png,image/jpeg,image/webp" multiple style="display:block;width:100%" />
      </div>
    </div>
  `

  const result = await Swal.fire({
    title: 'Rate Completed Service',
    html,
    showCancelButton: true,
    confirmButtonText: 'Submit Feedback',
    focusConfirm: false,
    preConfirm: () => {
      const ratingRaw = document.getElementById('swal-feedback-rating')?.value
      const feedbackText = document.getElementById('swal-feedback-text')?.value?.trim() || ''
      const files = Array.from(document.getElementById('swal-feedback-files')?.files || [])

      const rating = Number(ratingRaw)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        Swal.showValidationMessage('Please select a rating from 1 to 5.')
        return false
      }
      if (files.length > 5) {
        Swal.showValidationMessage('You can upload up to 5 photos only.')
        return false
      }

      return { rating, feedbackText, files }
    },
  })

  if (!result.isConfirmed || !result.value) return

  try {
    const formData = new FormData()
    formData.append('rating', String(result.value.rating))
    if (result.value.feedbackText) formData.append('feedback', result.value.feedbackText)
    ;(result.value.files || []).forEach((file) => formData.append('attachments[]', file))

    await axios.post(`/user/service-requests/${req.id}/feedback`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    Swal.fire('Success', 'Feedback submitted successfully.', 'success')
    await fetchServiceRequests()
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit feedback.', 'error')
  }
}

const cancelRequest = async (id) => {
  const confirm = await Swal.fire({
    title: 'Cancel request?',
    text: 'Before dispatch: free. After dispatch: cancellation fee may apply.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel',
  })
  if (!confirm.isConfirmed) return
  try {
    const res = await axios.post(`/user/service-requests/${id}/cancel`)
    markRequestCancelledLocally(id)
    const fee = Number(res?.data?.cancellation_fee_amount || 0)
    const comp = Number(res?.data?.travel_allowance_compensation || 0)
    const details = fee > 0
      ? `Cancellation fee applied: PHP ${fee.toFixed(2)}${comp > 0 ? ` • Travel compensation: PHP ${comp.toFixed(2)}` : ''}`
      : 'No cancellation fee applied.'
    Swal.fire({
      icon: 'success',
      title: 'Cancelled',
      text: details,
      timer: 1000,
      showConfirmButton: false,
    })
    fetchServiceRequests()
  } catch (err) {
    Swal.fire('Error', err.response?.data?.error || 'Failed to cancel request', 'error')
  }
}

const handleRequestSubmitted = (newRequest, submittedPayload = null, selectedTeam = null) => {
  const fallbackBusinessName = selectedTeam?.business_name || selectedTeam?.business || 'N/A'
  const fallbackTeam = selectedTeam?.team || null
  const mergedNotes = String(submittedPayload?.notes || '').trim()
  const optimisticId = newRequest?.id || `tmp-${Date.now()}`
  localPendingRequest.value = {
    ...newRequest,
    id: optimisticId,
    status: String(newRequest?.status || 'pending').trim().toLowerCase() || 'pending',
    created_at: newRequest?.created_at || new Date().toISOString(),
    updated_at: newRequest?.updated_at || new Date().toISOString(),
    business_name: newRequest?.business?.business_name || newRequest?.business_name || fallbackBusinessName,
    service_type: newRequest?.service_type || submittedPayload?.service_type || 'N/A',
    address_text: newRequest?.address_text || submittedPayload?.address_text || 'N/A',
    contact_number: newRequest?.contact_number || submittedPayload?.contact_number || 'N/A',
    notes: newRequest?.notes || (mergedNotes !== '' ? mergedNotes : 'N/A'),
    assigned_team: newRequest?.assigned_team || fallbackTeam,
    management_mode: newRequest?.management_mode || selectedTeam?.management_mode || null,
  }
  section.value = 'bookingRequest'
  setSectionInUrl('bookingRequest')
  fetchServiceRequests().catch(() => {})
}

const handleRequestCancelled = async (payload = null) => {
  const cancelledId = payload?.id
  if (cancelledId) {
    markRequestCancelledLocally(cancelledId)
  } else {
    localPendingRequest.value = null
  }
  fetchServiceRequests()
  section.value = 'bookingRequest'
  setSectionInUrl('bookingRequest')
}

const applyRequestUpdate = (payload)=>{
  const idx = serviceRequests.value.findIndex(r => r.id === payload.id)
  if (idx === -1) {
    fetchServiceRequests()
    return
  }
  const prevStatus = serviceRequests.value[idx]?.status
  serviceRequests.value[idx] = {
    ...serviceRequests.value[idx],
    status: payload.status,
    preferred_date: payload.preferred_date || serviceRequests.value[idx].preferred_date,
    payment_method: payload.payment_method || serviceRequests.value[idx].payment_method,
    payment_channel: payload.payment_channel || serviceRequests.value[idx].payment_channel,
    payment_status: payload.payment_status || serviceRequests.value[idx].payment_status,
    rejection_reason: payload.rejection_reason || serviceRequests.value[idx].rejection_reason || null,
    updated_at: payload.updated_at
  }
  if (prevStatus && prevStatus !== payload.status) {
    const req = serviceRequests.value[idx]
    const businessName = req.business?.business_name || req.business_name || 'Business'
    const toast = statusToast(payload.status)
    const text = payload.rejection_reason
      ? `Reason: ${payload.rejection_reason}`
      : `${businessName} • ${prettyStatus(payload.status)}`
    showToast({ ...toast, text })
  }
}

const startRealtime = ()=>{
  if(!window.Echo || !authUser.id || realtimeChannel) return
  realtimeChannel = window.Echo.private(`users.${authUser.id}`)
  realtimeChannel.listen('.user.notification', (e)=>{
    if(e?.notification){
      notifications.value = mergeNotificationRows([e.notification, ...notifications.value])
      showToast({
        icon: 'info',
        title: e.notification.title || 'New Notification',
        text: e.notification.message || ''
      })
    } else {
      fetchNotifications()
    }
  })
  realtimeChannel.listen('.service-request.updated', (e)=>{
    if(e?.id){
      applyRequestUpdate(e)
    } else {
      fetchServiceRequests()
    }
  })
}

const stopRealtime = ()=>{
  if(!window.Echo || !authUser.id || !realtimeChannel) return
  window.Echo.leave(`users.${authUser.id}`)
  realtimeChannel = null
}

const unsubscribeLiveProfile = () => {
  if (typeof liveProfileUnsubscribe === 'function') {
    liveProfileUnsubscribe()
  }
  liveProfileUnsubscribe = null
}

const subscribeLiveProfile = (profileId) => {
  unsubscribeLiveProfile()

  const resolvedProfileId = String(profileId || '').trim()
  if (!firebaseConfigReady || !realtimeDb || !resolvedProfileId) return

  try {
    liveProfileUnsubscribe = onValue(
      realtimeRef(realtimeDb, `profiles/${resolvedProfileId}`),
      (snapshot) => {
        if (!snapshot.exists()) return
        applyResolvedDashboardProfile(snapshot.val() || {}, { syncNotifications: true })
      },
      () => {
        unsubscribeLiveProfile()
      },
    )
  } catch {
    unsubscribeLiveProfile()
  }
}

const startRequestPolling = ()=>{
  if(requestPoller) return
  requestPoller = setInterval(fetchServiceRequests, 1000)
}
const stopRequestPolling = ()=>{
  if(requestPoller){
    clearInterval(requestPoller)
    requestPoller = null
  }
}

/* INIT */
onMounted(async ()=>{
  await fetchProfile()
  subscribeLiveProfile(authUser.uid || authUser.id)
  notifications.value = mergeNotificationRows(mergeProfileReviewNotification(notifications.value || []))
  if (firebaseAuth && typeof onAuthStateChanged === 'function') {
    firebaseSessionUnsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser?.uid) {
        unsubscribeLiveProfile()
        return
      }
      subscribeLiveProfile(firebaseUser.uid)
      await fetchProfile()
      await fetchNotifications()
    })
  }
  if (isSectionLocked(section.value)) {
    section.value = 'profile'
    setSectionInUrl('profile')
  } else {
    setSectionInUrl(section.value)
  }
  await Promise.allSettled([
    fetchApplicationStatus(),
    fetchBusinesses(),
    fetchFormedTeams(),
    fetchServiceProviders(),
    fetchServiceRequests(),
    fetchNotifications(),
  ])
  if (appStatus.hasApplied) {
    fetchSPDetails()
  }
  if(requestDrivenSections.has(section.value)) startRequestPolling()
  startRealtime()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(()=>{
  stopRequestPolling()
  stopRealtime()
  unsubscribeLiveProfile()
  if (typeof firebaseSessionUnsubscribe === 'function') {
    firebaseSessionUnsubscribe()
    firebaseSessionUnsubscribe = null
  }
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleGlobalKeydown)
  document.body.style.overflow = ''
  if (selectedProfilePreviewUrl.value) {
    URL.revokeObjectURL(selectedProfilePreviewUrl.value)
  }
  if (selectedGovernmentIdPreviewUrl.value) {
    URL.revokeObjectURL(selectedGovernmentIdPreviewUrl.value)
  }
  if (submittedGovernmentIdPreviewUrl.value && submittedGovernmentIdPreviewUrl.value.startsWith('blob:') && submittedGovernmentIdPreviewUrl.value !== selectedGovernmentIdPreviewUrl.value) {
    URL.revokeObjectURL(submittedGovernmentIdPreviewUrl.value)
  }
})

watch(section, (name)=>{
  if(requestDrivenSections.has(name)){
    fetchServiceRequests()
    startRequestPolling()
  }else if(name === 'dashboard'){
    fetchFormedTeams()
    stopRequestPolling()
  }else{
    stopRequestPolling()
  }
  if(name === 'spProfile') fetchBusinesses()
  if(name === 'notifications') fetchNotifications()
})

watch(showServiceRequestModal, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(() => authUser.id, (id) => {
  if (id) {
    startRealtime()
    subscribeLiveProfile(authUser.uid || id)
    return
  }
  unsubscribeLiveProfile()
})

</script>





