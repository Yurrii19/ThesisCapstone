const EXTERNAL_FILE_URL_PATTERN = /^(?:https?:|blob:|data:)/i
const FILE_FIELD_STORAGE_ALIASES = {
  government_id: ['government-id', 'government_id'],
  bir_registration: ['bir-registration', 'bir_registration'],
  dti_registration: ['dti-registration', 'dti_registration'],
  mayor_permit: ['mayor-permit', 'mayor_permit'],
  business_permit: ['business-permit', 'business_permit'],
  sanitary_permit: ['sanitary-permit', 'sanitary_permit'],
  profile_photo: ['profile_photo', 'profile-photo'],
}

export const stripFileQuery = (value) => String(value ?? '').split('?')[0].split('#')[0]

export const extractTemporaryFileSource = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw.toLowerCase().startsWith('local://')) return ''

  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : ''
  if (!query) return ''

  const params = new URLSearchParams(query)
  const source = String(params.get('src') || params.get('url') || '').trim()
  return EXTERNAL_FILE_URL_PATTERN.test(source) ? source : ''
}

export const resolveStoredFileUrl = (value, defaultFolder = 'files') => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (EXTERNAL_FILE_URL_PATTERN.test(raw)) return raw

  const fallbackSource = extractTemporaryFileSource(raw)
  if (fallbackSource) return fallbackSource

  let normalized = stripFileQuery(raw)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^storage\/app\/public\//, '')
    .replace(/^public\//, '')
    .replace(/^storage\//, '')

  if (defaultFolder && !normalized.includes('/')) {
    normalized = `${defaultFolder}/${normalized}`
  }

  return `/user/file?path=${encodeURIComponent(normalized)}`
}

export const buildStoredFileUrlCandidates = (
  value,
  { explicitUrl = '', uid = '', field = '', defaultFolder = '' } = {},
) => {
  const candidates = []
  const pushCandidate = (candidate) => {
    const normalized = String(candidate ?? '').trim()
    if (!normalized || candidates.includes(normalized)) return
    candidates.push(normalized)
  }
  const pushResolvedPath = (path) => {
    const resolved = resolveStoredFileUrl(path, defaultFolder)
    if (resolved) {
      pushCandidate(resolved)
    }
  }

  const resolvedExplicitUrl = String(explicitUrl ?? '').trim()
  if (resolvedExplicitUrl) {
    pushCandidate(resolvedExplicitUrl)
  }

  const raw = String(value ?? '').trim()
  if (!raw) {
    return candidates
  }

  if (EXTERNAL_FILE_URL_PATTERN.test(raw)) {
    pushCandidate(raw)
    return candidates
  }

  const temporarySource = extractTemporaryFileSource(raw)
  if (temporarySource) {
    pushCandidate(temporarySource)
  }

  const normalized = stripFileQuery(raw)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!normalized) {
    return candidates
  }

  if (EXTERNAL_FILE_URL_PATTERN.test(normalized)) {
    pushCandidate(normalized)
    return candidates
  }

  if (normalized.includes('/')) {
    pushResolvedPath(normalized)
    return candidates
  }

  const resolvedUid = String(uid ?? '').trim()
  const normalizedField = String(field ?? '').trim().toLowerCase()
  const extension = normalized.includes('.') ? normalized.split('.').pop() : ''
  const aliases = FILE_FIELD_STORAGE_ALIASES[normalizedField] || (normalizedField ? [normalizedField] : [])

  if (resolvedUid && extension && aliases.length) {
    aliases.forEach((alias) => {
      pushResolvedPath(`profiles/${resolvedUid}/${alias}.${extension}`)
      pushResolvedPath(`profile-files/${resolvedUid}/${alias}.${extension}`)
      pushResolvedPath(`profile-files/${resolvedUid}/${alias}/${normalized}`)
    })
  }

  if (resolvedUid) {
    if (normalizedField === 'profile_photo') {
      pushResolvedPath(`profile-photos/${resolvedUid}/${normalized}`)
    }
    if (normalizedField) {
      pushResolvedPath(`profile-files/${resolvedUid}/${normalizedField}/${normalized}`)
    }
    pushResolvedPath(`profile-files/${resolvedUid}/${normalized}`)
    pushResolvedPath(`profiles/${resolvedUid}/${normalized}`)
  }

  if (normalizedField) {
    pushResolvedPath(`${normalizedField}/${normalized}`)
  }

  pushResolvedPath(normalized)

  return candidates
}

export const buildTemporaryFilePath = (folder, uid, fileName, sourceUrl = '') => {
  const safeFolder = String(folder ?? 'files').trim().replace(/[?#]/g, '_') || 'files'
  const safeUid = String(uid ?? 'guest').trim().replace(/[?#]/g, '_') || 'guest'
  const safeFileName = String(fileName ?? 'file.bin')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop() || 'file.bin'

  const basePath = `local://${safeFolder}/${safeUid}/${safeFileName}`
  return sourceUrl
    ? `${basePath}?src=${encodeURIComponent(sourceUrl)}`
    : basePath
}
