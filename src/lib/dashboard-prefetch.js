import axios from 'axios'
import { employeeSidebarItems, normalizeStaffPermissions } from '@/lib/employee-rbac'
import { writeCachedViewState } from '@/lib/view-state-cache'

export const CSR_DASHBOARD_CACHE_KEY = 'csr-dashboard-data'
export const OPERATIONAL_DASHBOARD_CACHE_KEY = 'operational-dashboard-data'
export const EMPLOYEE_DASHBOARD_CACHE_KEY = 'employee-dashboard-data'
export const FINANCE_DASHBOARD_CACHE_KEY = 'finance-dashboard-data'
export const HR_DASHBOARD_CACHE_KEY = 'hr-dashboard-data'

const PROCUREMENT_OVERVIEW_CACHE_KEY = 'procurement-overview'
const PROCUREMENT_REQUESTS_CACHE_KEY = 'procurement-requests'
const PROCUREMENT_STOCK_CACHE_KEY = 'procurement-stock-orders'
const PROCUREMENT_SCM_CACHE_KEY = 'procurement-scm'

const inflightPrefetches = new Map()

const normalizeRole = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
)

const rememberPrefetch = (key, runner) => {
  const existing = inflightPrefetches.get(key)
  if (existing) return existing

  const task = Promise.resolve()
    .then(runner)
    .finally(() => {
      inflightPrefetches.delete(key)
    })

  inflightPrefetches.set(key, task)
  return task
}

const toArray = (value) => (Array.isArray(value) ? value : [])

export const buildFinanceDashboardState = ({ invoices = [], payouts = [], refunds = [] } = {}) => {
  const invoiceRows = toArray(invoices)
  const payoutRows = toArray(payouts)
  const refundRows = toArray(refunds)

  const totalAmount = (rows, matcher = () => true) => rows.reduce((sum, row) => {
    if (!matcher(row)) return sum
    const amount = Number(
      row?.amount
      ?? row?.total_amount
      ?? row?.invoice_amount
      ?? row?.released_amount
      ?? row?.refund_amount
      ?? 0,
    )
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  const statusOf = (row) => String(
    row?.status
    ?? row?.payment_status
    ?? row?.release_status
    ?? row?.settlement_status
    ?? '',
  ).trim().toLowerCase()

  const recentInvoices = [...invoiceRows]
    .sort((left, right) => {
      const leftTime = new Date(left?.created_at || left?.invoice_date || left?.due_date || 0).getTime()
      const rightTime = new Date(right?.created_at || right?.invoice_date || right?.due_date || 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, 6)
    .map((row, index) => ({
      id: row?.id || row?.invoice_no || `invoice-${index}`,
      invoice_no: row?.invoice_no || row?.reference_no || row?.id || `INV-${index + 1}`,
      client: row?.client || row?.customer_name || row?.business_name || 'Walk-in Client',
      status: String(statusOf(row) || 'pending'),
      amount: Number(row?.amount ?? row?.total_amount ?? row?.invoice_amount ?? 0) || 0,
    }))

  return {
    cards: [
      { label: 'Total Invoices', value: invoiceRows.length },
      { label: 'Collected Revenue', value: totalAmount(invoiceRows, (row) => ['paid', 'posted', 'released', 'verified'].includes(statusOf(row))) },
      { label: 'Pending Collections', value: totalAmount(invoiceRows, (row) => !['paid', 'posted', 'released', 'verified'].includes(statusOf(row))) },
      { label: 'Pending Approvals', value: payoutRows.filter((row) => statusOf(row) === 'pending').length + refundRows.filter((row) => statusOf(row) === 'pending').length },
    ],
    recentInvoices,
  }
}

const warmCsrDashboardData = () => rememberPrefetch('dashboard:csr', async () => {
  const response = await axios.get('/csr/dashboard-data', { skipGlobalLoading: true })
  const payload = response?.data || {}
  writeCachedViewState(CSR_DASHBOARD_CACHE_KEY, payload)
  return payload
})

const warmOperationalDashboardData = () => rememberPrefetch('dashboard:operational', async () => {
  const response = await axios.get('/operational/dashboard-data', { skipGlobalLoading: true })
  const payload = response?.data || {}
  writeCachedViewState(OPERATIONAL_DASHBOARD_CACHE_KEY, payload)
  return payload
})

const warmEmployeeDashboardData = () => rememberPrefetch('dashboard:employee', async () => {
  const response = await axios.get('/employee/dashboard-data', { skipGlobalLoading: true })
  const payload = response?.data || {}
  writeCachedViewState(EMPLOYEE_DASHBOARD_CACHE_KEY, payload)
  return payload
})

const warmProcurementDashboardData = () => rememberPrefetch('dashboard:procurement', async () => {
  const [requestsRes, inventoryRes, ordersRes, materialOptionsRes] = await Promise.all([
    axios.get('/procurement/requests-awaiting-material', { skipGlobalLoading: true }),
    axios.get('/procurement/inventory-summary', { skipGlobalLoading: true }),
    axios.get('/procurement/stock-orders', { skipGlobalLoading: true }),
    axios.get('/procurement/material-template-options', { skipGlobalLoading: true }),
  ])

  const requests = toArray(requestsRes?.data)
  const inventory = toArray(inventoryRes?.data)
  const orders = toArray(ordersRes?.data)
  const materialOptions = toArray(materialOptionsRes?.data)

  writeCachedViewState(PROCUREMENT_OVERVIEW_CACHE_KEY, {
    requests,
    inventory,
    orders,
  })

  writeCachedViewState(PROCUREMENT_REQUESTS_CACHE_KEY, {
    requests,
    inventorySummary: inventory,
  })

  writeCachedViewState(PROCUREMENT_STOCK_CACHE_KEY, {
    orders,
  })

  writeCachedViewState(PROCUREMENT_SCM_CACHE_KEY, {
    awaitingRequests: requests,
    stockOrders: orders,
    materialOptions,
    inventoryRows: inventory,
  })

  return {
    requests,
    inventory,
    orders,
    materialOptions,
  }
})

const warmFinanceDashboardData = () => rememberPrefetch('dashboard:finance', async () => {
  const [invoicesRes, payoutsRes, refundsRes] = await Promise.all([
    axios.get('/finance/invoices', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
    axios.get('/finance/payouts', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
    axios.get('/finance/refunds', { skipGlobalLoading: true }).catch(() => ({ data: [] })),
  ])

  const payload = buildFinanceDashboardState({
    invoices: invoicesRes?.data,
    payouts: payoutsRes?.data,
    refunds: refundsRes?.data,
  })

  writeCachedViewState(FINANCE_DASHBOARD_CACHE_KEY, payload)
  return payload
})

const warmHrDashboardData = () => rememberPrefetch('dashboard:hr', async () => {
  const response = await axios.get('/hr/dashboard-data', { skipGlobalLoading: true })
  const payload = response?.data || {}
  writeCachedViewState(HR_DASHBOARD_CACHE_KEY, payload)
  return payload
})

const workspaceRoutesForRole = (profile = {}) => {
  const role = normalizeRole(profile?.role || profile)

  if (role === 'csr') {
    return ['/CSR/Dashboard']
  }

  if (role === 'operational' || role === 'operational_management') {
    return [
      '/operational',
      '/operational/live-queue',
      '/operational/material-planning',
      '/operational/flow',
    ]
  }

  if (role === 'procurement') {
    return ['/Procurement/ProcurementDashboard']
  }

  if (role === 'finance') {
    return [
      '/finance',
      '/finance/invoice',
      '/finance/payment-process',
      '/finance/payment-verify',
      '/finance/payment-approvals',
      '/finance/refunds',
      '/finance/procurement-approvals',
      '/finance/payouts',
      '/finance/revenue-reports',
      '/finance/service-earnings',
      '/finance/technician-earnings',
      '/finance/health',
      '/finance/profile',
    ]
  }

  if (role === 'hr') {
    return [
      '/HR/HrDashboard',
      '/hr/recruitment',
      '/hr/linked-employees',
      '/hr/service-providers',
      '/hr/payroll',
      '/hr/reports',
    ]
  }

  if (role === 'employee') {
    const staffPermissions = normalizeStaffPermissions(profile?.employee_rbac || profile?.staff_permissions, { hasEmployee: true })
    return employeeSidebarItems(staffPermissions).map((item) => item.path)
  }

  return []
}

export const prefetchWorkspaceRoutes = async (profile, router) => {
  if (!router || typeof router.prefetch !== 'function') return []
  const routes = workspaceRoutesForRole(profile)
  return Promise.allSettled(routes.map((route) => router.prefetch(route)))
}

export const warmRoleDashboardData = async (profile = {}) => {
  const role = normalizeRole(profile?.role || profile)

  if (role === 'csr') return await warmCsrDashboardData()
  if (role === 'operational' || role === 'operational_management') return await warmOperationalDashboardData()
  if (role === 'procurement') return await warmProcurementDashboardData()
  if (role === 'finance') return await warmFinanceDashboardData()
  if (role === 'hr') return await warmHrDashboardData()
  if (role === 'employee') return await warmEmployeeDashboardData()

  return null
}
