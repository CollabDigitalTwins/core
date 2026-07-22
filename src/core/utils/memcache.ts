// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

let memjs: typeof import('memjs') | null = null
let client: any = null

async function loadMemjs() {
  if (typeof window !== 'undefined') {
    return null
  }

  if (!memjs) {
    try {
      memjs = await import('memjs')
    } catch (error) {
      console.error('Failed to load memjs:', error)
      return null
    }
  }
  return memjs
}

async function getMemcacheClient() {
  if (typeof window !== 'undefined') {
    return null
  }

  if (client) {
    return client
  }

  try {
    const memjsLib = await loadMemjs()
    if (!memjsLib) {
      return null
    }

    const memcacheServer = process.env.MEMCACHE_SERVER

    client = memjsLib.Client.create(memcacheServer, {
      username: process.env.MEMCACHE_USERNAME,
      password: process.env.MEMCACHE_PASSWORD,
      timeout: 5,
      retries: 2,
    })

    return client
  } catch (error) {
    console.error('Failed to initialize Memcache client:', error)
    return null
  }
}

export async function setMemcache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const client = await getMemcacheClient()
  if (!client) {
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    await client.set(key, serialized, { expires: ttlSeconds })
    return true
  } catch (error) {
    console.error(`Failed to set Memcache key ${key}:`, error)
    return false
  }
}

export async function getMemcache<T>(key: string): Promise<T | null> {
  const client = await getMemcacheClient()
  if (!client) {
    return null
  }

  try {
    const result = await client.get(key)

    if (!result.value) {
      return null
    }

    const deserialized = JSON.parse(result.value.toString()) as T
    return deserialized
  } catch (error) {
    console.error(`Failed to get Memcache key ${key}:`, error)
    return null
  }
}

export async function deleteMemcache(key: string): Promise<boolean> {
  const client = await getMemcacheClient()
  if (!client) {
    return false
  }

  try {
    await client.delete(key)
    return true
  } catch (error) {
    console.error(`Failed to delete Memcache key ${key}:`, error)
    return false
  }
}

export async function withMemcache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await getMemcache<T>(key)
  if (cached !== null) {
    return cached
  }

  const result = await fn()

  setMemcache(key, result, ttlSeconds).catch(err => {
    console.error('Background Memcache set failed:', err)
  })

  return result
}

export async function flushMemcache(): Promise<boolean> {
  const client = await getMemcacheClient()
  if (!client) {
    return false
  }

  try {
    await client.flush()
    return true
  } catch (error) {
    console.error('Failed to flush Memcache:', error)
    return false
  }
}
