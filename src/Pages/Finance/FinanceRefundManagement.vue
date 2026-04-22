

<template>
  <FinanceShell
    title="Refund Management"
    subtitle="Process and track refund decisions."
    active-path="/finance/refunds"
  >
    <div class="panel">
      <h3>Refund Requests</h3>
      <table>
        <thead>
          <tr>
            <th>Request No</th>
            <th>Invoice</th>
            <th>Reason</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in refunds" :key="item.id">
            <td>{{ item.request_no }}</td>
            <td>{{ item.invoice }}</td>
            <td>{{ item.reason }}</td>
            <td>{{ money(item.amount) }}</td>
            <td>
              <button class="ok" @click="setStatus(item, 'approved')">Approve</button>
              <button class="reject" @click="setStatus(item, 'rejected')">Reject</button>
              <span class="status">{{ item.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </FinanceShell>
</template>

<script setup>
import { ref } from 'vue'
import FinanceShell from './FinanceShell.vue'
import axios from 'axios'
import { createToastInterface, POSITION } from 'vue-toastification'

const props = defineProps({
  refunds: {
    type: Array,
    default: () => [],
  },
})

const refunds = ref(props.refunds)
const toast = createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 1800,
  closeButton: 'button',
  showCloseButtonOnHover: false,
})

async function setStatus(item, status) {
  const old = item.status
  item.status = status
  try {
    await axios.patch(`/finance/refunds/${item.id}`, { status })
    toast.success(`Refund ${status}.`)
  } catch {
    item.status = old
    toast.error('Unable to update refund status.')
  }
}

function money(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0)
}
</script>
