<template>
  <aside class="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-white p-4 text-slate-900 shadow-[2px_0_10px_rgba(15,23,42,0.04)] max-[960px]:static max-[960px]:h-auto max-[960px]:w-full max-[960px]:overflow-y-visible">
    <div class="rounded-[14px] border border-slate-200 bg-white p-3.5">
      <p class="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-500">Operational Management</p>
      <h2 class="m-0 mt-1.5 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">Operations</h2>
      <p class="m-0 mt-2 text-[13px] text-slate-500">Receive CSR-endorsed requests, assign approved employees or teams, coordinate materials, and release field work for dispatch.</p>
    </div>

    <div class="rounded-[14px] border border-slate-200 bg-white px-2.5 py-3">
      <p class="mx-1 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Navigation</p>
      <nav class="flex flex-col gap-1.5">
        <Link
          v-for="item in items"
          :key="item.key"
          :href="item.href"
          prefetch
          class="flex items-center gap-2.5 rounded-xl border px-3 py-[11px] text-left text-[13px] font-semibold transition-all"
          :class="active === item.key
            ? 'border-teal-500 bg-teal-500 text-white shadow-[0_6px_16px_rgba(20,184,166,0.28)]'
            : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'"
        >
          <span
            class="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold"
            :class="active === item.key
              ? 'border border-white/35 bg-white/20 text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-600'"
          >
            {{ item.iconText }}
          </span>
          <span class="leading-[1.2]">{{ item.label }}</span>
        </Link>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({
  active: {
    type: String,
    default: 'dashboard',
  },
})

const items = [
  {
    key: 'dashboard',
    label: 'Operations Overview',
    href: '/operational',
    iconText: 'DB',
  },
  {
    key: 'queue',
    label: 'Team Planning & Dispatch',
    href: '/operational/live-queue',
    iconText: 'RD',
  },
  {
    key: 'materials',
    label: 'Materials Coordination',
    href: '/operational/material-planning',
    iconText: 'MP',
  },
  {
    key: 'flow',
    label: 'End-to-End Flow',
    href: '/operational/flow',
    iconText: 'EF',
  },
]
</script>
