const normalizeStageValue = (value) => String(value || '').trim().toLowerCase()

const requestPrStatuses = (req) => (
  Array.isArray(req?.pr_statuses)
    ? req.pr_statuses.map((value) => normalizeStageValue(value)).filter(Boolean)
    : []
)

const hasAssignedTeamEvidence = (req) => {
  const operationsStage = normalizeStageValue(req?.operations_stage)
  const teamCount = Number(req?.team_members_count || 0)
  return operationsStage === 'team_assigned'
    || operationsStage === 'provider_assigned'
    || teamCount > 0
    || String(req?.assigned_team || '').trim().length > 0
    || String(req?.selected_team || '').trim().length > 0
    || String(req?.assigned_provider_id || '').trim().length > 0
    || String(req?.service_provider_id || '').trim().length > 0
    || (Array.isArray(req?.dispatch_employee_ids) && req.dispatch_employee_ids.length > 0)
}

export const WORKFLOW_TRACKER_FLOW = [
  'csr_review',
  'operations_review',
  'materials_coordination',
  'finance_approval',
  'dispatch_ready',
  'service_execution',
  'completed',
  'warranty_handling',
]

export const WORKFLOW_TRACKER_LABELS = {
  csr_review: 'CSR Intake Review',
  operations_review: 'Operations Review',
  materials_coordination: 'Materials Coordination',
  finance_approval: 'Finance Approval',
  dispatch_ready: 'Dispatch Ready',
  service_execution: 'Service In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  warranty_handling: 'Warranty Handling',
}

export const WORKFLOW_TRACKER_STEPS = [
  {
    id: 1,
    key: 'csr_review',
    title: 'CSR Intake Review',
    summary: 'CSR validates the submitted request, confirms location and notes, and forwards it for internal handling.',
  },
  {
    id: 2,
    key: 'operations_review',
    title: 'Operations Review',
    summary: 'Operations approves the request, checks the scope, and assigns the team or service provider.',
  },
  {
    id: 3,
    key: 'materials_coordination',
    title: 'Materials Coordination',
    summary: 'Procurement plans materials, checks stock, and keeps the request in awaiting material readiness until all needs are accounted for.',
  },
  {
    id: 4,
    key: 'finance_approval',
    title: 'Finance Approval',
    summary: 'If stock is missing, the purchase requisition is routed to Finance for approval or rejection, and Finance can release upfront purchasing funds before Procurement buys.',
  },
  {
    id: 5,
    key: 'dispatch_ready',
    title: 'Dispatch Ready',
    summary: 'Once all materials are received and the request is job ready, the assigned team can proceed with dispatch.',
  },
  {
    id: 6,
    key: 'service_execution',
    title: 'Service In Progress',
    summary: 'The field team performs the service and records the work progress in real time.',
  },
  {
    id: 7,
    key: 'completed',
    title: 'Completed And Warranty Active',
    summary: 'The job is completed, closed in the system, and the warranty is activated.',
  },
  {
    id: 8,
    key: 'warranty_handling',
    title: 'Warranty Handling',
    summary: 'If a defect is reported during the warranty period, the claim is surfaced back to CSR as a priority ticket and the job is reopened at no charge when the follow-up is valid.',
  },
]

export const requestWorkflowDescription = (key) => ({
  csr_review: 'CSR validates the request, confirms the service details, and forwards it for internal handling.',
  operations_review: 'Operations reviews the request, approves it, and assigns the team or service provider.',
  materials_coordination: 'Procurement checks stock, prepares the material plan, and keeps the request in awaiting material readiness.',
  finance_approval: 'Finance reviews the purchase requisition for missing materials, approves or rejects it, and releases the upfront procurement amount when approved.',
  dispatch_ready: 'All required materials are received and the request is job ready for field deployment.',
  service_execution: 'The assigned team is already performing the service and updating the job progress.',
  completed: 'Service is completed and the warranty is already active.',
  warranty_handling: 'A warranty claim was filed, surfaced back to CSR as a priority ticket, and is being reviewed for free follow-up repair when valid.',
  rejected: 'The request was rejected during the review process.',
  cancelled: 'The request was cancelled.',
}[key] || 'Status update.')

export const requestWorkflowKey = (req = {}) => {
  const status = normalizeStageValue(req?.status) === 'ongoing' ? 'in_progress' : normalizeStageValue(req?.status)
  const workflowStage = normalizeStageValue(req?.workflow_stage)
  const operationsStage = normalizeStageValue(req?.operations_stage)
  const stockStage = normalizeStageValue(req?.stock_status)
  const procurementStage = normalizeStageValue(req?.procurement_stage)
  const pricingStage = normalizeStageValue(req?.pricing_stage)
  const paymentTerms = normalizeStageValue(req?.payment_terms)
  const paymentStatus = normalizeStageValue(req?.payment_status)
  const csrStatus = normalizeStageValue(req?.csr_status)
  const warrantyStatus = normalizeStageValue(req?.warranty_status)
  const managementMode = normalizeStageValue(req?.management_mode || req?.business?.management_mode || req?.assigned_business?.management_mode)
  const businessType = normalizeStageValue(req?.business_type || req?.business?.business_type || req?.assigned_business?.business_type)
  const prStatuses = requestPrStatuses(req)
  const hasAssignedTeam = hasAssignedTeamEvidence(req)

  if (status === 'rejected' || status === 'cancelled') return status
  if (status === 'completed') return 'completed'
  if (
    ['claimed', 'rework_scheduled', 'pending', 'under_review'].includes(warrantyStatus)
    || status === 'warranty_pending'
    || status === 'warranty_rework'
  ) {
    return 'warranty_handling'
  }
  if (status === 'in_progress') return 'service_execution'
  if (status === 'job_ready') return 'dispatch_ready'

  if (
    procurementStage === 'pending_finance_approval'
    || prStatuses.includes('pending_finance_approval')
    || pricingStage === 'awaiting_pricing_review'
    || pricingStage === 'pricing_pending_procurement'
    || (
      pricingStage === 'pricing_reviewed'
      && (
        (paymentTerms === 'full_before_service' && !['paid', 'verified', 'completed'].includes(paymentStatus))
        || (paymentTerms === '30_percent_down_30_days' && !['partial_paid', 'paid', 'verified', 'completed'].includes(paymentStatus))
      )
    )
  ) {
    return 'finance_approval'
  }

  if (
    procurementStage === 'awaiting_stock_review'
    || procurementStage === 'pending_procurement'
    || procurementStage === 'finance_approved'
    || stockStage === 'stock_unavailable'
    || stockStage === 'awaiting_delivery'
    || status === 'awaiting_material'
    || status === 'waiting_material'
    || hasAssignedTeam
    || prStatuses.some((value) => ['pending', 'approved', 'rejected', 'in_transit', 'delivered', 'completed'].includes(value))
  ) {
    return 'materials_coordination'
  }

  if (
    workflowStage === 'csr_review'
    || operationsStage === 'awaiting_csr_validation'
    || (
      (managementMode === 'hr' || businessType === 'company')
      && csrStatus !== 'validated'
      && workflowStage !== 'csr_forwarded'
      && operationsStage !== 'awaiting_operational_review'
    )
  ) {
    return 'csr_review'
  }

  if (
    workflowStage === 'csr_forwarded'
    || workflowStage === 'operations_reviewed'
    || operationsStage === 'awaiting_operational_review'
    || operationsStage === 'operational_review_approved'
    || stockStage === 'pending_stock_check'
    || ['approved', 'accepted', 'pending'].includes(status)
  ) {
    return 'operations_review'
  }

  return 'csr_review'
}
