import { EMPLOYEE_DASHBOARD_CACHE_KEY } from '@/lib/dashboard-prefetch'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'

export const readEmployeeDashboardCache = () => (
  readCachedViewState(EMPLOYEE_DASHBOARD_CACHE_KEY, null)
)

export const writeEmployeeDashboardCache = (payload) => {
  writeCachedViewState(EMPLOYEE_DASHBOARD_CACHE_KEY, payload || {})
}

