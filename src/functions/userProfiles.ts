import { ref } from 'vue'
import { callApi } from './callApi'

export const USER_SELECT_FIELDS = [
  'ID',
  'NAME',
  'SECOND_NAME',
  'LAST_NAME',
  'PERSONAL_PHOTO',
  'UF_DEPARTMENT',
]

export const USER_SELECT_FIELDS_BASIC = [
  'ID',
  'NAME',
  'SECOND_NAME',
  'LAST_NAME',
  'PERSONAL_PHOTO',
]

export type UserProfile = {
  name: string
  shortName: string
  photo: string
}

export const userProfilesById = ref<Record<string, UserProfile>>({})
export const usersById = ref<Record<string, Record<string, any>>>({})

const pendingByIds = new Map<string, Promise<any[]>>()
let allUsersPromise: Promise<any[]> | null = null

export function mapUserForAssignedFilter(user: Record<string, any>) {
  const parts = []
  if (user.NAME) parts.push(user.NAME)
  if (user.SECOND_NAME) parts.push(user.SECOND_NAME)
  if (user.LAST_NAME) parts.push(user.LAST_NAME)

  return {
    ...user,
    FULL_NAME: parts.join(' '),
    departmentIds: Array.isArray(user.UF_DEPARTMENT)
      ? user.UF_DEPARTMENT.map((id) => String(id))
      : (user.UF_DEPARTMENT ? [String(user.UF_DEPARTMENT)] : []),
  }
}

export function buildAssignedFilterUsers(): any[] {
  return Object.values(usersById.value).map(mapUserForAssignedFilter)
}

function flattenUsers(result: unknown): any[] {
  if (!Array.isArray(result)) return []
  return result.length && Array.isArray(result[0]) ? result.flat() : result
}

function displayFullName(lastName?: string, name?: string, secondName?: string) {
  return [lastName, name, secondName].filter(Boolean).join(' ') || 'Имя не указано'
}

function displayNameWithoutPatronymic(lastName?: string, name?: string) {
  return [lastName, name].map((part) => String(part || '').trim()).filter(Boolean).join(' ')
    || 'Имя не указано'
}

function resolveUserPhotoUrl(photo: unknown) {
  const rawPhoto =
    typeof photo === 'string'
      ? photo
      : photo && typeof photo === 'object'
        ? String((photo as Record<string, unknown>).src
          || (photo as Record<string, unknown>).url
          || (photo as Record<string, unknown>).URL
          || '')
        : ''

  if (!rawPhoto) return ''
  if (rawPhoto.startsWith('http')) return rawPhoto
  if (rawPhoto.startsWith('//')) return `https:${rawPhoto}`

  const domain =
    (window as any).BX24?.getAuth?.()?.domain
    || window.location.hostname

  return `https://${domain}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`
}

export function registerUserProfile(user: Record<string, any> | null | undefined) {
  if (!user?.ID) return

  const name = displayFullName(user.LAST_NAME, user.NAME, user.SECOND_NAME)
  const shortName = displayNameWithoutPatronymic(user.LAST_NAME, user.NAME)
  userProfilesById.value[String(user.ID)] = {
    name,
    shortName,
    photo: resolveUserPhotoUrl(user.PERSONAL_PHOTO),
  }
  usersById.value[String(user.ID)] = user
}

async function fetchUsersByIdsRequest(
  ids: string[],
  select: string[],
): Promise<any[]> {
  if (!ids.length) return []

  const requestKey = `${select.join('|')}::${ids.slice().sort().join(',')}`
  const pending = pendingByIds.get(requestKey)
  if (pending) {
    return pending
  }

  const fetchPromise = callApi(
    'user.get',
    { ID: ids },
    select,
    null,
    0,
    0,
  )
    .then((result) => flattenUsers(result))
    .finally(() => pendingByIds.delete(requestKey))

  pendingByIds.set(requestKey, fetchPromise)
  return fetchPromise
}

export async function ensureUsersByIds(
  ids: Array<string | number | null | undefined>,
  select: string[] = USER_SELECT_FIELDS_BASIC,
): Promise<any[]> {
  const uniqueIds = [...new Set(
    ids
      .map((id) => String(id ?? '').trim())
      .filter((id) => id && id !== 'undefined'),
  )]

  if (!uniqueIds.length) return []

  const missingIds = uniqueIds.filter((id) => !userProfilesById.value[id])
  if (missingIds.length) {
    const users = await fetchUsersByIdsRequest(missingIds, select)
    users.forEach(registerUserProfile)
  }

  return uniqueIds
    .map((id) => usersById.value[id])
    .filter(Boolean)
}

export async function ensureAllUsers(
  select: string[] = USER_SELECT_FIELDS,
): Promise<any[]> {
  if (allUsersPromise) {
    return allUsersPromise
  }

  allUsersPromise = (async () => {
    try {
      const users = flattenUsers(
        await callApi('user.get', { ACTIVE: true }, select, null, 0, 0),
      )
      users.forEach(registerUserProfile)
      return users
    } catch (error) {
      console.warn('Не удалось загрузить всех пользователей:', error)
      return buildAssignedFilterUsers()
    }
  })()

  return allUsersPromise
}

export function getCachedUsersByIds(ids: Array<string | number | null | undefined>) {
  return [...new Set(
    ids
      .map((id) => String(id ?? '').trim())
      .filter((id) => id && userProfilesById.value[id]),
  )].map((id) => ({
    ID: id,
    ...userProfilesById.value[id],
  }))
}

export function resetUserProfilesCache() {
  userProfilesById.value = {}
  usersById.value = {}
  pendingByIds.clear()
  allUsersPromise = null
}
