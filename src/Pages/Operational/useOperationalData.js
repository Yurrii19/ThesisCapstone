import { ref } from 'vue'
import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { confirmAndLogout } from '@/lib/auth-flow'
import { OPERATIONAL_DASHBOARD_CACHE_KEY } from '@/lib/dashboard-prefetch'
import { readCachedViewState, writeCachedViewState } from '@/lib/view-state-cache'
import {
  WORKFLOW_TRACKER_STEPS,
  requestWorkflowDescription,
  requestWorkflowKey,
} from '@/lib/request-workflow'

export function useOperationalData() {
  const cachedDashboardState = readCachedViewState(OPERATIONAL_DASHBOARD_CACHE_KEY, null)
  const hasCachedDashboardState = Boolean(cachedDashboardState)
  const loading = ref(!hasCachedDashboardState)
  const workingRequestId = ref(null)
  const queue = ref(Array.isArray(cachedDashboardState?.queue) ? cachedDashboardState.queue : [])
  const stats = ref({
    total_requests: 0,
    pending_review: 0,
    awaiting_materials: 0,
    job_ready: 0,
    ongoing: 0,
    completed_today: 0,
    pr_status_summary: {},
    ...(cachedDashboardState?.stats || {}),
  })
  const prSummary = ref({
    pending: 0,
    pending_finance_approval: 0,
    approved: 0,
    rejected: 0,
    in_transit: 0,
    delivered: 0,
    completed: 0,
    ...((cachedDashboardState?.stats || {}).pr_status_summary || {}),
  })

  const flowSteps = WORKFLOW_TRACKER_STEPS.map((step) => ({ ...step }))

  const prettyStatus = (status) => {
    const s = String(status || '').trim().toLowerCase()
    if (s === 'awaiting_material') return 'Awaiting Material'
    if (s === 'in_progress') return 'Ongoing'
    if (s === 'job_ready') return 'Dispatch Ready'
    if (s === 'assigned') return 'Team Assigned'
    return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'N/A'
  }

  const prettyValue = (value, fallback = 'N/A') => {
    const normalized = String(value || '').trim().toLowerCase()
    return normalized
      ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
      : fallback
  }

  const customerTypeLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'non_contract') return 'Non-Contract'
    if (normalized === 'contracted') return 'Contracted'
    return prettyValue(value)
  }

  const propertyTypeLabel = (value) => prettyValue(value)

  const truckLoadLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return 'Standard Load'
    if (normalized === 'large') return 'Large Load'
    return prettyValue(value)
  }

  const paymentTermsLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'full_before_service') return 'Full Payment Before Service'
    if (normalized === '30_percent_down_30_days') return '30% Down, Balance in 30 Days'
    return prettyValue(value)
  }

  const paymentChannelLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'gcash') return 'GCash'
    if (normalized === 'paypal') return 'PayPal'
    if (normalized === 'paymaya' || normalized === 'sm_bills' || normalized === 'lazada_shopeepay') return 'PayPal'
    return prettyValue(value)
  }

  const canPlanMaterialsForItem = (item) => {
    const workflowKey = requestWorkflowKey(item)
    const requestStatus = String(item?.status || '').trim().toLowerCase()
    const procurementStage = String(item?.procurement_stage || '').trim().toLowerCase()
    const stockStage = String(item?.stock_status || '').trim().toLowerCase()
    return workflowKey === 'materials_coordination'
      || workflowKey === 'finance_approval'
      || requestStatus === 'awaiting_material'
      || requestStatus === 'waiting_material'
      || procurementStage === 'awaiting_stock_review'
      || procurementStage === 'pending_procurement'
      || procurementStage === 'pending_finance_approval'
      || procurementStage === 'finance_approved'
      || stockStage === 'stock_unavailable'
      || stockStage === 'awaiting_delivery'
    }

  const workflowStageLabel = (item) => {
    const key = requestWorkflowKey(item)
    const activeStep = flowSteps.find((step) => step.key === key)
    if (!activeStep) return 'Step 1: CSR Intake Review'
    return `Step ${activeStep.id}: ${activeStep.title}`
  }

  const statusClass = (status) => {
    const s = String(status || '').trim().toLowerCase()
    const classes = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      accepted: 'bg-emerald-100 text-emerald-700',
      assigned: 'bg-sky-100 text-sky-700',
      awaiting_material: 'bg-orange-100 text-orange-700',
      job_ready: 'bg-cyan-100 text-cyan-700',
      in_progress: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-teal-100 text-teal-700',
      rejected: 'bg-rose-100 text-rose-700',
      cancelled: 'bg-slate-200 text-slate-700',
      warranty_pending: 'bg-amber-100 text-amber-700',
      warranty_rework: 'bg-fuchsia-100 text-fuchsia-700',
    }
    return classes[s] || 'bg-slate-100 text-slate-700'
  }

  const prettyPrStatus = (status) => {
    const s = String(status || '').trim().toLowerCase()
    return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'N/A'
  }

  const prStatusClass = (status) => {
    const s = String(status || '').trim().toLowerCase()
    const classes = {
      pending: 'bg-slate-100 text-slate-700',
      pending_finance_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
      in_transit: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-teal-100 text-teal-700',
    }
    return classes[s] || 'bg-slate-100 text-slate-700'
  }

  const detectServiceTrack = (serviceType) => {
    const value = String(serviceType || '').toLowerCase()
    if (value.includes('siphon') || value.includes('septic') || value.includes('desludg') || value.includes('jetter')) {
      return 'siphoning'
    }
    return ''
  }

  const detectMaterialTrack = (materialName) => {
    const value = String(materialName || '').toLowerCase()
    if (value.includes('siphon') || value.includes('septic') || value.includes('desludg') || value.includes('jetter') || value.includes('hose') || value.includes('vacuum')) {
      return 'siphoning'
    }
    return ''
  }

  const flowStage = (item) => {
    return workflowStageLabel(item)
  }

  const nextFlowAction = (item) => {
    const requestStatus = String(item?.status || '').toLowerCase().trim()
    const workflowStage = String(item?.workflow_stage || '').toLowerCase().trim()
    const operationsStage = String(item?.operations_stage || '').toLowerCase().trim()
    const stockStage = String(item?.stock_status || '').toLowerCase().trim()
    const procurementStage = String(item?.procurement_stage || '').toLowerCase().trim()
    const pricingStage = String(item?.pricing_stage || '').toLowerCase().trim()
    const paymentTerms = String(item?.payment_terms || '').toLowerCase().trim()
    const paymentStatus = String(item?.payment_status || '').toLowerCase().trim()
    const prStatuses = Array.isArray(item?.pr_statuses) ? item.pr_statuses.map((s) => String(s || '').toLowerCase()) : []

    if (requestStatus === 'completed' && item?.warranty_free_service) return 'Warranty repair is completed at no additional charge and the warranty has been refreshed.'
    if (requestStatus === 'completed') return 'Verify completion, close the request, and confirm that the warranty is already active.'
    if (requestStatus === 'warranty_pending') return 'Review the warranty claim, inspect the reported issue, and decide whether the job should reopen at no charge.'
    if (requestStatus === 'warranty_rework') return 'Warranty claim was approved. Reopen the job as a free follow-up repair and complete the rework cycle.'
    if (requestStatus === 'in_progress' && item?.warranty_free_service) return 'Warranty repair is currently in progress at no additional charge.'
    if (requestStatus === 'in_progress') return 'Assigned team leader should execute the service, document field updates, and upload proof of work.'
    if (requestStatus === 'job_ready') return 'All materials are ready. Operations can now dispatch the assigned team or service provider.'
    if (workflowStage === 'csr_review') return requestWorkflowDescription('csr_review')
    if (operationsStage === 'awaiting_operational_review') return requestWorkflowDescription('operations_review')
    if (stockStage === 'pending_stock_check') return 'Operations should finish team or provider assignment, then hand the request to Procurement for material preparation.'
    if (procurementStage === 'awaiting_stock_review' || procurementStage === 'pending_procurement' || procurementStage === 'finance_approved') {
      return requestWorkflowDescription('materials_coordination')
    }
    if (pricingStage === 'awaiting_pricing_review' || pricingStage === 'pricing_pending_procurement' || prStatuses.includes('pending_finance_approval')) {
      return requestWorkflowDescription('finance_approval')
    }
    if (paymentTerms === 'full_before_service' && !['paid', 'verified', 'completed'].includes(paymentStatus)) {
      return requestWorkflowDescription('finance_approval')
    }
    if (paymentTerms === '30_percent_down_30_days' && !['partial_paid', 'paid', 'verified', 'completed'].includes(paymentStatus)) {
      return requestWorkflowDescription('finance_approval')
    }
    if (prStatuses.includes('rejected')) return 'Procurement should revise PR details and resubmit to finance.'
    if (prStatuses.includes('approved') && !prStatuses.includes('in_transit') && !prStatuses.includes('delivered')) {
      return 'Procurement should place supplier order or proceed with direct hardware purchase.'
    }
    if (prStatuses.includes('in_transit')) return 'Track ETA, wait for delivery, and update PR upon receipt.'
    if (requestStatus === 'awaiting_material' || requestStatus === 'waiting_material') return 'Operations tracks PR status while waiting for materials.'
    if (requestStatus === 'assigned') return 'The employee or field team is already assigned. Confirm dispatch timing, site readiness, and proceed to service execution.'
    if (requestStatus === 'pending' || requestStatus === 'approved' || requestStatus === 'accepted') return 'Continue the CSR-to-Operations workflow, confirm the proper employee or team assignment, and complete Procurement or Finance gates before dispatch.'
    return 'Monitor queue updates.'
  }

  const requestMetaChips = (item) => {
    const chips = []
    if (item?.customer_type) chips.push(customerTypeLabel(item.customer_type))
    if (item?.property_type) chips.push(propertyTypeLabel(item.property_type))
    if (item?.truck_load_volume) chips.push(truckLoadLabel(item.truck_load_volume))
    if (item?.payment_terms) chips.push(paymentTermsLabel(item.payment_terms))
    if (item?.payment_channel) chips.push(paymentChannelLabel(item.payment_channel))
    return chips
  }

  const applyDashboardPayload = (payload = {}) => {
    stats.value = {
      ...stats.value,
      ...(payload.stats || {}),
    }
    prSummary.value = {
      ...prSummary.value,
      ...((payload.stats || {}).pr_status_summary || {}),
    }
    queue.value = Array.isArray(payload.queue)
      ? payload.queue.map((item) => ({
          ...item,
          can_plan_materials: item?.can_plan_materials ?? canPlanMaterialsForItem(item),
        }))
      : []
  }

  const fetchDashboard = async ({ background = hasCachedDashboardState } = {}) => {
    if (!background) {
      loading.value = true
    }
    try {
      const res = await axios.get('/operational/dashboard-data')
      const payload = res?.data || {}
      applyDashboardPayload(payload)
      writeCachedViewState(OPERATIONAL_DASHBOARD_CACHE_KEY, {
        stats: payload.stats || {},
        queue: queue.value,
      })
    } catch {
      if (!background) {
        Swal.fire('Error', 'Failed to load operational dashboard data.', 'error')
      }
    } finally {
      loading.value = false
    }
  }

  const reviewRequest = async (item, action = 'approve') => {
    workingRequestId.value = item.id
    try {
      if (action === 'reject') {
        const rejection = await Swal.fire({
          title: 'Reject request?',
          input: 'textarea',
          inputLabel: 'Reason',
          inputPlaceholder: 'Explain why this request cannot proceed.',
          inputAttributes: {
            'aria-label': 'Rejection reason',
          },
          showCancelButton: true,
          confirmButtonText: 'Reject Request',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!String(value || '').trim()) return 'Rejection reason is required.'
            return null
          },
        })

        if (!rejection.isConfirmed) return false

        const res = await axios.post(`/operational/service-requests/${item.id}/review`, {
          action: 'reject',
          reason: String(rejection.value || '').trim(),
        }, { skipGlobalLoading: true })
        Swal.fire('Request Rejected', res?.data?.message || 'Request rejected by Operations.', 'success')
        fetchDashboard().catch(() => {})
        return true
      }

      const confirm = await Swal.fire({
        title: 'Approve request for operations flow?',
        text: `Request #${item.id} will move past operational review and continue to materials or payment gates.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Approve Review',
        cancelButtonText: 'Cancel',
      })

      if (!confirm.isConfirmed) return false

      const res = await axios.post(`/operational/service-requests/${item.id}/review`, {
        action: 'approve',
      }, { skipGlobalLoading: true })
      Swal.fire('Operational Review Saved', res?.data?.message || 'Request approved by Operations.', 'success')
      fetchDashboard().catch(() => {})
      return true
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Failed to update operational review.', 'error')
      return false
    } finally {
      workingRequestId.value = null
    }
  }

  const assignTeamEquipment = async (item) => {
    workingRequestId.value = item.id
    try {
      const [suggestedRes, inventoryRes, templateRes] = await Promise.all([
        axios.get(`/operational/suggested-materials/${item.id}`),
        axios.get('/operational/inventory-summary'),
        axios.get('/operational/material-template-options'),
      ])

      const selectedTeam = String(item?.selected_team || '').trim()
      const safeSelectedTeam = selectedTeam
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      const suggested = Array.isArray(suggestedRes?.data)
        ? suggestedRes.data.map((row) => String(row?.material_name || '').trim()).filter(Boolean)
        : []
      const inventory = Array.isArray(inventoryRes?.data) ? inventoryRes.data : []
      const templateOptions = Array.isArray(templateRes?.data) ? templateRes.data : []
      const serviceTrack = detectServiceTrack(item?.service_type)

      const inventoryMap = new Map()
      inventory.forEach((row) => {
        const key = String(row?.material_name || '').trim()
        if (!key) return
        inventoryMap.set(key.toLowerCase(), {
          available: Number(row?.available || 0),
          unit: String(row?.unit || 'pcs').trim() || 'pcs',
          original: key,
        })
      })

      let mergedOptions = Array.from(
        new Set([
          ...templateOptions.map((row) => String(row?.material_name || '').trim()).filter(Boolean),
          ...suggested,
          ...inventory.map((row) => String(row?.material_name || '').trim()).filter(Boolean),
        ])
      )
      if (serviceTrack) {
        const filtered = mergedOptions.filter((name) => detectMaterialTrack(name) === serviceTrack)
        if (filtered.length) mergedOptions = filtered
      }

      const optionHtml = mergedOptions.map((name) => {
        const inv = inventoryMap.get(name.toLowerCase())
        const available = Number(inv?.available || 0)
        const unit = String(inv?.unit || 'pcs')
        const label = `${name} (available: ${available} ${unit})`
        return `<option value="${String(name).replace(/"/g, '&quot;')}">${String(label).replace(/</g, '&lt;')}</option>`
      }).join('')

      const inventoryPreview = inventory
        .filter((row) => {
          if (!serviceTrack) return true
          return detectMaterialTrack(row?.material_name) === serviceTrack
        })
        .slice(0, 10)
        .map((row) => `${row.material_name} (${row.unit || 'pcs'}): available ${row.available}`)
        .join('\n')
      const inventoryPreviewHtml = String(inventoryPreview || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')

      const result = await Swal.fire({
        title: 'Assign Team & Set Materials',
        width: 780,
        background: '#f8fafc',
        color: '#0f172a',
        buttonsStyling: false,
        customClass: {
          title: 'swal-om-title',
          confirmButton: 'swal-om-confirm',
          cancelButton: 'swal-om-cancel',
        },
        html: `
          <div style="display:grid;gap:12px;text-align:left">
            <div style="border:1px solid #dbeafe;background:#ffffff;border-radius:14px;padding:12px;box-shadow:0 6px 18px rgba(15,23,42,0.06)">
              <label style="display:block;font-size:11px;font-weight:800;margin:0 0 6px 0;letter-spacing:.08em;text-transform:uppercase;color:#0369a1">Team</label>
              <input id="swal-om-team" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a" value="${safeSelectedTeam}" />
            </div>
            <div style="border:1px solid #dbeafe;background:#ffffff;border-radius:14px;padding:12px;box-shadow:0 6px 18px rgba(15,23,42,0.06)">
              <label style="display:block;font-size:11px;font-weight:800;margin:0 0 6px 0;letter-spacing:.08em;text-transform:uppercase;color:#0369a1">Equipment Reservation Note</label>
              <input id="swal-om-equipment" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a" placeholder="Reserved equipment details (optional)" />
            </div>
            <div style="display:grid;gap:10px;border:1px solid #bfdbfe;background:#ffffff;border-radius:14px;padding:12px;box-shadow:0 8px 22px rgba(2,132,199,0.08)">
              <label style="display:block;font-size:11px;font-weight:800;margin:0;letter-spacing:.08em;text-transform:uppercase;color:#0369a1">
                Materials (${serviceTrack ? `${serviceTrack} only` : 'all types'})
              </label>
              <div style="display:grid;grid-template-columns:1fr 140px 120px;gap:8px">
                <select id="swal-material-name" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a">
                  ${optionHtml || '<option value="">No material template available</option>'}
                </select>
                <input id="swal-material-qty" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a" type="number" min="1" value="1" />
                <input id="swal-material-unit" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a" value="pcs" />
              </div>
              <input id="swal-material-reason" class="swal2-input" style="margin:0;width:100%;height:42px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a" placeholder="Reason / notes (optional)" />
              <button id="swal-add-material-line" type="button" style="margin:0;justify-self:start;border:0;border-radius:9px;background:#0284c7;color:#ffffff;font-size:12px;font-weight:700;padding:8px 12px;cursor:pointer;box-shadow:0 6px 16px rgba(2,132,199,0.25)">Add Material</button>
              <textarea id="swal-material-lines" class="swal2-textarea" rows="6" style="margin:0;width:100%;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;line-height:1.5" placeholder="PVC Pipe|3|pcs|Additional branch line"></textarea>
              <p style="margin:0;font-size:11px;color:#64748b">Format: Material|Qty|Unit|Reason</p>
              <div style="margin-top:2px;border:1px dashed #bfdbfe;border-radius:10px;background:#f8fbff;padding:8px 10px">
                <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#075985">Inventory Snapshot</p>
                <p style="margin:0;font-size:11px;color:#334155;line-height:1.5">${inventoryPreview ? inventoryPreviewHtml : 'No inventory records.'}</p>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Confirm & Send to Procurement Flow',
        cancelButtonText: 'Cancel',
        didOpen: () => {
          const popupEl = document.querySelector('.swal2-popup')
          const titleEl = document.querySelector('.swal2-title')
          const confirmBtn = document.querySelector('.swal2-confirm')
          const cancelBtn = document.querySelector('.swal2-cancel')
          if (popupEl) {
            popupEl.style.borderRadius = '20px'
            popupEl.style.border = '1px solid #bfdbfe'
            popupEl.style.boxShadow = '0 20px 50px rgba(15,23,42,0.28)'
          }
          if (titleEl) {
            titleEl.style.fontSize = '34px'
            titleEl.style.fontWeight = '900'
            titleEl.style.letterSpacing = '-0.02em'
            titleEl.style.color = '#0f172a'
          }
          if (confirmBtn) {
            confirmBtn.style.border = '0'
            confirmBtn.style.borderRadius = '999px'
            confirmBtn.style.padding = '12px 22px'
            confirmBtn.style.fontWeight = '800'
            confirmBtn.style.background = 'linear-gradient(135deg,#0ea5e9,#0284c7)'
            confirmBtn.style.color = '#ffffff'
            confirmBtn.style.boxShadow = '0 10px 24px rgba(2,132,199,0.35)'
          }
          if (cancelBtn) {
            cancelBtn.style.border = '1px solid #cbd5e1'
            cancelBtn.style.borderRadius = '999px'
            cancelBtn.style.padding = '12px 20px'
            cancelBtn.style.fontWeight = '700'
            cancelBtn.style.background = '#ffffff'
            cancelBtn.style.color = '#334155'
          }

          const materialSelect = document.getElementById('swal-material-name')
          const unitInput = document.getElementById('swal-material-unit')
          const qtyInput = document.getElementById('swal-material-qty')
          const addBtn = document.getElementById('swal-add-material-line')
          const linesEl = document.getElementById('swal-material-lines')
          if (!addBtn || !linesEl) return

          const syncUnitFromSelected = () => {
            const currentName = String(materialSelect?.value || '').trim().toLowerCase()
            const inv = inventoryMap.get(currentName)
            if (unitInput && inv?.unit) unitInput.value = inv.unit
          }
          materialSelect?.addEventListener('change', syncUnitFromSelected)
          syncUnitFromSelected()

          addBtn.addEventListener('click', () => {
            const name = String(document.getElementById('swal-material-name')?.value || '').trim()
            const qty = String(qtyInput?.value || '').trim()
            const unit = String(unitInput?.value || 'pcs').trim() || 'pcs'
            const reason = String(document.getElementById('swal-material-reason')?.value || '').trim()

            if (!name) {
              Swal.showValidationMessage('Select a material item first.')
              return
            }
            const qtyNum = Number(qty)
            if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
              Swal.showValidationMessage('Quantity must be greater than 0.')
              return
            }

            const line = `${name}|${Math.floor(qtyNum)}|${unit}|${reason}`
            const current = String(linesEl.value || '').trim()
            linesEl.value = current ? `${current}\n${line}` : line
            Swal.resetValidationMessage()
          })
        },
        preConfirm: () => {
          const team = String(document.getElementById('swal-om-team')?.value || '').trim()
          const equipmentNotes = String(document.getElementById('swal-om-equipment')?.value || '').trim()
          const linesText = String(document.getElementById('swal-material-lines')?.value || '').trim()
          if (!team) {
            Swal.showValidationMessage('Team is required.')
            return false
          }
          try {
            const materials = parseMaterialLines(linesText)
            if (!materials.length) {
              Swal.showValidationMessage('Add at least one material.')
              return false
            }
            return { team, equipmentNotes, materials }
          } catch (e) {
            Swal.showValidationMessage(e.message || 'Invalid materials format.')
            return false
          }
        },
      })

      if (!result.isConfirmed || !result.value) return false

      const res = await axios.post(`/operational/service-requests/${item.id}/assign-team-equipment`, {
        team: result.value.team,
        equipment_notes: result.value.equipmentNotes || null,
      }, { skipGlobalLoading: true })
      const planRes = await axios.post(`/operational/service-requests/${item.id}/plan-materials`, {
        materials: result.value.materials,
      }, { skipGlobalLoading: true })
      const planPayload = planRes?.data || {}
      Swal.fire(
        'Success',
        planPayload.message || res?.data?.message || 'Team assignment and materials were submitted.',
        planPayload.requires_procurement ? 'info' : 'success'
      )
      fetchDashboard().catch(() => {})
      return true
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Failed to assign team/equipment.', 'error')
      return false
    } finally {
      workingRequestId.value = null
    }
  }

  const parseMaterialLines = (text) => {
    const lines = String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const materials = []
    for (const line of lines) {
      const [nameRaw, qtyRaw, unitRaw, notesRaw] = line.split('|').map((v) => String(v || '').trim())
      const qty = Number(qtyRaw)
      if (!nameRaw || !Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid material line: "${line}"`)
      }

      materials.push({
        name: nameRaw,
        qty: Math.floor(qty),
        unit: unitRaw || 'pcs',
        notes: notesRaw || null,
      })
    }

    return materials
  }

  const planMaterials = async (item) => {
    workingRequestId.value = item.id
    try {
      const [suggestedRes, inventoryRes, templateRes] = await Promise.all([
        axios.get(`/operational/suggested-materials/${item.id}`),
        axios.get('/operational/inventory-summary'),
        axios.get('/operational/material-template-options'),
      ])

      const suggested = Array.isArray(suggestedRes?.data)
        ? suggestedRes.data.map((row) => String(row?.material_name || '').trim()).filter(Boolean)
        : []
      const inventory = Array.isArray(inventoryRes?.data) ? inventoryRes.data : []
      const templateOptions = Array.isArray(templateRes?.data) ? templateRes.data : []
      let mergedOptions = Array.from(
        new Set([
          ...templateOptions.map((row) => String(row?.material_name || '').trim()).filter(Boolean),
          ...suggested,
          ...inventory.map((row) => String(row?.material_name || '').trim()).filter(Boolean),
        ])
      )
      const serviceTrack = String(item?.service_type || '').toLowerCase().includes('siphon')
        ? 'siphoning'
        : ''
      const optionTrack = (name) => {
        const value = String(name || '').toLowerCase()
        if (value.includes('siphon') || value.includes('septic') || value.includes('desludg') || value.includes('jetter') || value.includes('hose') || value.includes('vacuum')) return 'siphoning'
        return ''
      }
      if (serviceTrack) {
        const filteredByTrack = mergedOptions.filter((name) => optionTrack(name) === serviceTrack)
        if (filteredByTrack.length) {
          mergedOptions = filteredByTrack
        }
      }
      const inventoryPreview = inventory.slice(0, 8).map((row) =>
        `${row.material_name} (${row.unit || 'pcs'}): available ${row.available}`
      ).join('\n')

      const prompt = await Swal.fire({
        title: `Plan Materials for #${item.id}`,
        html: `
          <div style="display:grid;gap:10px;text-align:left">
            <div>
              <label style="display:block;font-size:15px;font-weight:700;margin-bottom:6px;color:#ffffff">Material Item</label>
              <select id="swal-material-name" class="swal2-input" style="margin:0;width:100%;color:#000000;font-size:1.3rem">
                ${mergedOptions.map((name) => `<option value="${String(name).replace(/"/g, '&quot;')}">${name}</option>`).join('')}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div>
                <label style="display:block;font-size:15px;font-weight:700;margin-bottom:6px;color:#ffffff">Quantity</label>
                <input id="swal-material-qty" class="swal2-input" style="margin:0;width:100%;color:#000000;font-size:1.3rem" type="number" min="1" value="1" />
              </div>
              <div>
                <label style="display:block;font-size:15px;font-weight:700;margin-bottom:6px;color:#ffffff">Unit</label>
                <input id="swal-material-unit" class="swal2-input" style="margin:0;width:100%;color:#000000;font-size:1.3rem" value="pcs" />
              </div>
            </div>
            <div>
              <label style="display:block;font-size:15px;font-weight:700;margin-bottom:6px;color:#ffffff">Reason</label>
              <input id="swal-material-reason" class="swal2-input" style="margin:0;width:100%;color:#000000;font-size:1.3rem" placeholder="Why needed (optional)" />
            </div>
            <button id="swal-add-material-line" type="button" class="swal2-confirm swal2-styled" style="margin:0;justify-self:start;font-size:1.15rem">Add Material</button>
            <div>
              <label style="display:block;font-size:15px;font-weight:700;margin-bottom:6px;color:#ffffff">Material Lines</label>
              <textarea id="swal-material-lines" class="swal2-textarea" rows="7" style="margin:0;width:100%;color:#000000;font-size:1.3rem" placeholder="PVC Pipe|3|pcs|Additional branch line"></textarea>
            </div>
            <p style="margin:0;font-size:15px;line-height:1.5;color:#ffffff">Format: Material|Qty|Unit|Reason</p>
            <p style="margin:0;font-size:15px;line-height:1.5;color:#ffffff">${inventoryPreview ? `Inventory:\\n${inventoryPreview}`.replace(/\n/g, '<br/>') : 'Inventory: no records'}</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Plan',
        didOpen: () => {
          const addBtn = document.getElementById('swal-add-material-line')
          if (!addBtn) return

          addBtn.addEventListener('click', () => {
            const name = String(document.getElementById('swal-material-name')?.value || '').trim()
            const qty = String(document.getElementById('swal-material-qty')?.value || '').trim()
            const unit = String(document.getElementById('swal-material-unit')?.value || 'pcs').trim() || 'pcs'
            const reason = String(document.getElementById('swal-material-reason')?.value || '').trim()
            const linesEl = document.getElementById('swal-material-lines')

            if (!name) {
              Swal.showValidationMessage('Select a material item first.')
              return
            }
            const qtyNum = Number(qty)
            if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
              Swal.showValidationMessage('Quantity must be greater than 0.')
              return
            }

            const line = `${name}|${Math.floor(qtyNum)}|${unit}|${reason}`
            const current = String(linesEl?.value || '').trim()
            if (linesEl) {
              linesEl.value = current ? `${current}\n${line}` : line
            }
            Swal.resetValidationMessage()
          })
        },
        preConfirm: (value) => {
          try {
            const linesText = String(document.getElementById('swal-material-lines')?.value || '').trim()
            const materials = parseMaterialLines(linesText)
            if (!materials.length) {
              Swal.showValidationMessage('Add at least one material line.')
              return false
            }
            return materials
          } catch (e) {
            Swal.showValidationMessage(e.message || 'Invalid materials format.')
            return false
          }
        },
      })

      if (!prompt.isConfirmed || !Array.isArray(prompt.value)) {
        return false
      }

      const res = await axios.post(`/operational/service-requests/${item.id}/plan-materials`, {
        materials: prompt.value,
      }, { skipGlobalLoading: true })
      const payload = res?.data || {}
      Swal.fire('Success', payload.message || 'Materials plan submitted.', payload.requires_procurement ? 'info' : 'success')
      fetchDashboard().catch(() => {})
      return true
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit material plan.', 'error')
      return false
    } finally {
      workingRequestId.value = null
    }
  }

  const archiveRequest = async (item) => {
    const confirm = await Swal.fire({
      title: 'Archive request?',
      text: `Request #${item.id} will be removed from the live queue.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archive',
    })
    if (!confirm.isConfirmed) return

    workingRequestId.value = item.id
    try {
      const res = await axios.post(`/operational/service-requests/${item.id}/archive`, {}, { skipGlobalLoading: true })
      Swal.fire('Success', res?.data?.message || 'Request archived.', 'success')
      fetchDashboard().catch(() => {})
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Failed to archive request.', 'error')
    } finally {
      workingRequestId.value = null
    }
  }

  const logout = async () => {
    await confirmAndLogout()
  }

  return {
    loading,
    workingRequestId,
    queue,
    stats,
    prSummary,
    flowSteps,
    prettyStatus,
    statusClass,
    prettyPrStatus,
    prStatusClass,
    flowStage,
    nextFlowAction,
    customerTypeLabel,
    propertyTypeLabel,
    truckLoadLabel,
    paymentTermsLabel,
    paymentChannelLabel,
    requestMetaChips,
    fetchDashboard,
    reviewRequest,
    assignTeamEquipment,
    planMaterials,
    archiveRequest,
    logout,
  }
}

