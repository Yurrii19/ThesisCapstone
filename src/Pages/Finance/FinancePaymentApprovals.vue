<template>
  <FinanceShell
    title="Payment Review Queue"
    subtitle="Approve or reject reviewed payment records before release and assignment."
    active-path="/finance/payment-approvals"
  >
    <div class="panel">
      <h3>Payment Review Queue</h3>
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Invoice</th>
            <th>Issue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in approvals" :key="item.id">
            <td>{{ item.ref }}</td>
            <td>{{ item.invoice }}</td>
            <td>{{ item.issue }}</td>
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
  approvals: {
    type: Array,
    default: () => [],
  },
})

const approvals = ref(props.approvals)
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
    await axios.patch(`/finance/payment-approvals/${item.id}`, { status })
    toast.success(`Payment ${status}.`)
  } catch {
    item.status = old
    toast.error('Unable to update approval status.')
  }
}
</script>
