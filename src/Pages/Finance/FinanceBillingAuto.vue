<template>
  <FinanceShell
    title="Billing Automation"
    subtitle="Configure collection and billing rules."
    active-path="/finance/billing-auto"
  >
    <div class="panel">
      <h3>Automation Rules</h3>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Description</th>
            <th>Enabled</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule.id">
            <td>{{ rule.name }}</td>
            <td>{{ rule.description }}</td>
            <td>
              <input type="checkbox" v-model="rule.enabled" @change="toggleRule(rule)" />
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
  rules: {
    type: Array,
    default: () => [],
  },
})

const rules = ref(props.rules.map((row) => ({ ...row, enabled: Boolean(row.enabled) })))
const toast = createToastInterface({
  position: POSITION.TOP_RIGHT,
  timeout: 1800,
  closeButton: 'button',
  showCloseButtonOnHover: false,
})

async function toggleRule(rule) {
  try {
    await axios.patch(`/finance/billing-auto/${rule.id}`, {
      enabled: rule.enabled,
    })
    toast.success('Billing rule updated.')
  } catch {
    rule.enabled = !rule.enabled
    toast.error('Unable to update billing rule.')
  }
}
</script>
