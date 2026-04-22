import axios from 'axios'
import Swal from '@/lib/sweetalert-toast-shim'
import { queueLoggedOutToast } from '@/lib/app-toast'
import { logoutWithFirebase } from '@/lib/firebase-auth'

export async function confirmAndLogout({
  confirmTitle = 'Logout?',
  confirmText = 'Do you want to end this session?',
  confirmButtonText = 'Yes, logout',
  loadingTitle = 'Logging out...',
  loadingText = '',
  loginPath = '/login',
  requestTimeout = 5000,
  fallbackTimeout = 2500,
} = {}) {
  const result = await Swal.fire({
    title: confirmTitle,
    text: confirmText,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
  })

  if (!result.isConfirmed) return false

  try {
    if (typeof window !== 'undefined') {
      window.__appLogoutInProgress = true
    }

    Swal.fire({
      title: loadingTitle,
      text: loadingText,
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })

    await logoutWithFirebase()
    queueLoggedOutToast()
    window.location.replace(loginPath || '/Auth/Login')
    return true
  } catch (_error) {
    window.location.replace(loginPath || '/Auth/Login')
    return true
  }
}

export async function confirmAndDeleteAccount({
  confirmTitle = 'Delete Account?',
  confirmText = 'Are you sure you want to delete your account?',
  confirmButtonText = 'Yes, Delete',
  loadingTitle = 'Deleting account...',
  loadingText = 'Please wait.',
  successRedirectPath = '/register',
  endpoint = '/user/delete',
} = {}) {
  const result = await Swal.fire({
    title: confirmTitle,
    text: confirmText,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
  })

  if (!result.isConfirmed) return false

  try {
    Swal.fire({
      title: loadingTitle,
      text: loadingText,
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })

    await axios.delete(endpoint)
    window.location.href = successRedirectPath
    return true
  } catch (_error) {
    await Swal.fire('Error', 'Failed to delete account', 'error')
    return false
  }
}

