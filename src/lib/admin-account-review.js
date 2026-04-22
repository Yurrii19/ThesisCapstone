export const ADMIN_ACCOUNT_REJECTION_OPTIONS = [
  { value: 'invalid_government_id', label: 'Government ID is unclear, invalid, or missing' },
  { value: 'location_information_missing', label: 'Location details are missing or inconsistent' },
  { value: 'business_information_mismatch', label: 'Business information does not match the uploaded documents' },
  { value: 'duplicate_registration', label: 'Possible duplicate or existing registration' },
  { value: 'other_validation_issue', label: 'Other validation issue' },
]

export const promptAdminAccountRejection = async (Swal, options = {}) => {
  let modalElement = null
  const title = String(options?.title || 'Why did you reject this user?').trim()
  const confirmButtonText = String(options?.confirmButtonText || 'Reject').trim()
  const reasonLabel = String(options?.reasonLabel || 'Additional reason (Optional)').trim()
  const reasonPlaceholder = String(
    options?.reasonPlaceholder || 'Add a concise explanation for the rejection (optional).',
  ).trim()
  const introCopy = String(
    options?.introCopy || 'Select all issues that apply, then add a short explanation for the user record if needed.',
  ).trim()

  const result = await Swal.fire({
    title,
    html: `
      <div class="text-left">
        <p class="mb-3 text-lg text-white">${introCopy}</p>
        <div data-reject-checklist class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          ${ADMIN_ACCOUNT_REJECTION_OPTIONS.map((option) => `
            <label class="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-lg text-slate-700 shadow-sm">
              <input type="checkbox" value="${option.value}" class="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-200" />
              <span>${option.label}</span>
            </label>
          `).join('')}
        </div>
        <label for="reject-user-reason" class="mt-4 block text-lg font-semibold text-white">${reasonLabel}</label>
        <textarea
          id="reject-user-reason"
          rows="4"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          placeholder="${reasonPlaceholder}"
        ></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText,
    focusConfirm: false,
    didOpen: (popup) => {
      modalElement = popup
      popup.querySelector('#reject-user-reason')?.focus()
    },
    preConfirm: () => {
      const checklistInputs = [...(modalElement?.querySelectorAll('[data-reject-checklist] input[type="checkbox"]') || [])]
      const selected = checklistInputs
        .filter((input) => input.checked)
        .map((input) => input.value)
      const reason = String(modalElement?.querySelector('#reject-user-reason')?.value || '').trim()

      if (!selected.length) {
        Swal.showValidationMessage('Select at least one reason from the checklist.')
        return false
      }

      return { checklist: selected, reason }
    },
  })

  if (!result.isConfirmed || !result.value) {
    return null
  }

  return result.value
}
