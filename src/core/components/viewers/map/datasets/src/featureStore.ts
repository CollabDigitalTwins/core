// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { throwIfAborted } from './http'

import type { FeatureCollection } from 'geojson'

const DB_NAME = 'cdt-dataset-features'
const FEATURES_STORE = 'features'
const USAGE_STORE = 'usage'
const MAX_MEMORY_ENTRIES = 100
const MAX_STORED_ENTRIES = 400

interface StoredFeatures {
  key: string
  value: FeatureCollection
  expires: number
}

interface Usage {
  key: string
  lastUsed: number
}

const memory = new Map<string, StoredFeatures>()
interface SharedLoad {
  request: Promise<FeatureCollection>
  signal?: AbortSignal
}

const inFlight = new Map<string, SharedLoad>()
let database: Promise<IDBDatabase | null> | undefined

function rememberInMemory(entry: StoredFeatures) {
  memory.delete(entry.key)
  memory.set(entry.key, entry)
  if (memory.size > MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value as string)
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  database ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(FEATURES_STORE, { keyPath: 'key' })
        request.result.createObjectStore(USAGE_STORE, { keyPath: 'key' }).createIndex('lastUsed', 'lastUsed')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    }
    catch {
      resolve(null)
    }
  })
  return database
}

function run<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDatabase().then(db => new Promise<T | undefined>((resolve) => {
    if (!db) return resolve(undefined)
    try {
      const request = action(db.transaction(storeName, mode).objectStore(storeName))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(undefined)
    }
    catch {
      resolve(undefined)
    }
  }))
}

const touch = (key: string) => run(USAGE_STORE, 'readwrite', store => store.put({ key, lastUsed: Date.now() } satisfies Usage))

async function evictLeastRecentlyUsed() {
  const count = await run(USAGE_STORE, 'readonly', store => store.count())
  if (!count || count <= MAX_STORED_ENTRIES) return
  const oldest = await run(USAGE_STORE, 'readonly', store => store.index('lastUsed').getAllKeys(null, count - MAX_STORED_ENTRIES))
  await Promise.all((oldest ?? []).flatMap(key => [run(FEATURES_STORE, 'readwrite', store => store.delete(key)), run(USAGE_STORE, 'readwrite', store => store.delete(key))]))
}

async function readStored(key: string): Promise<FeatureCollection | undefined> {
  const inMemory = memory.get(key)
  if (inMemory && inMemory.expires > Date.now()) return inMemory.value
  const stored = await run<StoredFeatures>(FEATURES_STORE, 'readonly', store => store.get(key))
  if (!stored || stored.expires <= Date.now()) return undefined
  rememberInMemory(stored)
  void touch(key)
  return stored.value
}

async function writeStored(key: string, value: FeatureCollection, ttlMs: number) {
  const entry: StoredFeatures = { key, value, expires: Date.now() + ttlMs }
  rememberInMemory(entry)
  await run(FEATURES_STORE, 'readwrite', store => store.put(entry))
  await touch(key)
  await evictLeastRecentlyUsed()
}

async function joinShared(shared: SharedLoad, retry: () => Promise<FeatureCollection>, signal?: AbortSignal): Promise<FeatureCollection> {
  try {
    return await shared.request
  }
  catch (error) {
    if (!shared.signal?.aborted || signal?.aborted) throw error
    return retry()
  }
}

/** Features from memory, then IndexedDB, then `load`; concurrent calls for one key share a load, and an aborted one is never stored. */
export function cachedFeatures(key: string, ttlMs: number, load: () => Promise<FeatureCollection>, signal?: AbortSignal): Promise<FeatureCollection> {
  const pending = inFlight.get(key)
  if (pending !== undefined) return joinShared(pending, () => cachedFeatures(key, ttlMs, load, signal), signal)
  const request = (async () => {
    const stored = await readStored(key)
    if (stored) return stored
    throwIfAborted(signal)
    const loaded = await load()
    throwIfAborted(signal)
    void writeStored(key, loaded, ttlMs)
    return loaded
  })().finally(() => {
    if (inFlight.get(key)?.request === request) inFlight.delete(key)
  })
  inFlight.set(key, { request, signal })
  return request
}
