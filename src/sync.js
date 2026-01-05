// NephTrack Sync Service
import { encryptData, decryptData } from './encryption';
import { openDB } from 'idb';
import { API_BASE } from './config';

const STORES = ['intake', 'output', 'flush', 'bowel', 'dressing', 'dailyTotals'];
const SYNC_PAUSED_KEY = 'syncPaused';
const STORE_ALIASES = {
    bag: 'output',
    urinal: 'output',
    void: 'output',
    outputs: 'output',
    intakes: 'intake',
    flushes: 'flush',
    bowels: 'bowel',
    dressings: 'dressing',
    dailyTotal: 'dailyTotals',
    daily_total: 'dailyTotals',
    dailytotals: 'dailyTotals',
};
const SYNC_CURSOR_KEY = 'lastSyncCursor';
const SYNC_STATUS_KEY = 'syncStatus';
const PUSH_BATCH_SIZE = 200;
const PULL_LIMIT = 500;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

let syncInProgress = false;

function loadSyncStatus() {
    try {
        return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)) || {};
    } catch {
        return {};
    }
}

function saveSyncStatus(partial) {
    const existing = loadSyncStatus();
    const next = { ...existing, ...partial };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(next));
    return next;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, { retries = MAX_RETRIES, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok && attempt < retries) {
                const backoff = 300 * (2 ** attempt) + Math.floor(Math.random() * 200);
                await sleep(backoff);
                continue;
            }
            return resp;
        } catch (err) {
            clearTimeout(timeout);
            if (attempt >= retries) throw err;
            const backoff = 300 * (2 ** attempt) + Math.floor(Math.random() * 200);
            await sleep(backoff);
        }
    }
}

function normalizeStoreName(type) {
    if (!type) return null;
    const normalized = STORE_ALIASES[type] || type;
    return STORES.includes(normalized) ? normalized : null;
}

function normalizeOutputType(type) {
    if (type === 'void') return 'urinal';
    return type;
}

function getEntryTimestamp(entry) {
    if (entry.timestamp) return entry.timestamp;
    if (entry.date) return new Date(entry.date).getTime();
    return Date.now();
}

function getEntryUpdatedAt(entry) {
    return entry.updatedAt || entry.timestamp || Date.now();
}

async function getUnsyncedEntries(db, storeName) {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const entries = await store.getAll();
    await tx.done;
    return entries.filter((entry) => !entry.synced);
}

async function markEntriesSynced(db, storeName, entries, acceptedIds) {
    const accepted = new Set(acceptedIds || []);
    if (accepted.size === 0) return;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const entry of entries) {
        if (!accepted.has(entry.id)) continue;
        store.put({ ...entry, synced: true });
    }
    await tx.done;
}

export function getSyncStatus() {
    return loadSyncStatus();
}

export async function syncData(passphrase, token) {
    if (!passphrase || !token) return;
    if (localStorage.getItem(SYNC_PAUSED_KEY) === 'true') return;
    if (syncInProgress) return;
    syncInProgress = true;

    const startedAt = Date.now();
    saveSyncStatus({ lastSyncStart: startedAt, lastError: null, inProgress: true });

    const db = await openDB('nephtrack', 1);

    // 1. PUSH local changes
    let totalPushed = 0;
    let totalPending = 0;
    for (const storeName of STORES) {
        try {
            const unsynced = await getUnsyncedEntries(db, storeName);
            totalPending += unsynced.length;
            if (unsynced.length === 0) continue;

            for (let i = 0; i < unsynced.length; i += PUSH_BATCH_SIZE) {
                const batch = unsynced.slice(i, i + PUSH_BATCH_SIZE);
                const encryptedEntries = await Promise.all(batch.map(async (entry) => {
                    const { id, synced, type, timestamp, updatedAt, deleted, deletedAt, ...data } = entry;
                    const blob = await encryptData(data, passphrase);
                    return {
                        id: id,
                        type: type || storeName,
                        encrypted_blob: blob,
                        timestamp: getEntryTimestamp(entry),
                        client_updated_at: getEntryUpdatedAt(entry),
                        deleted: Boolean(deleted),
                        deleted_at: deletedAt || null,
                    };
                }));

                const resp = await fetchWithRetry(`${API_BASE}/api/sync/push`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ entries: encryptedEntries }),
                });

                if (!resp.ok) {
                    throw new Error(`Push failed with status ${resp.status}`);
                }

                const payload = await resp.json();
                await markEntriesSynced(db, storeName, batch, payload.acceptedIds);
                totalPushed += payload.acceptedIds?.length || 0;
            }
        } catch (err) {
            saveSyncStatus({
                lastError: `Push failed for ${storeName}: ${err.message}`,
                lastErrorAt: Date.now(),
            });
        }
    }

    // 2. PULL remote changes
    let cursor = Number(localStorage.getItem(SYNC_CURSOR_KEY) || 0);
    let totalPulled = 0;
    let lastServerTime = null;
    try {
        while (true) {
            const resp = await fetchWithRetry(`${API_BASE}/api/sync/pull?since=${cursor}&limit=${PULL_LIMIT}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!resp.ok) {
                throw new Error(`Pull failed with status ${resp.status}`);
            }

            const { entries, nextCursor, serverTime } = await resp.json();
            lastServerTime = serverTime || lastServerTime;

            for (const entry of entries) {
                try {
                    const decrypted = await decryptData(entry.encrypted_blob, passphrase);
                    if (!decrypted) continue;

                    const storeName = normalizeStoreName(entry.type);
                    if (!storeName) {
                        saveSyncStatus({
                            lastError: `Pull entry skipped (${entry.id}): unknown type ${entry.type}`,
                            lastErrorAt: Date.now(),
                        });
                        continue;
                    }
                    const tx = db.transaction(storeName, 'readonly');
                    const existing = await tx.objectStore(storeName).get(entry.id);
                    await tx.done;

                    const incomingUpdatedAt = entry.client_updated_at || entry.updated_at || entry.timestamp;
                    const shouldApply = !existing || !existing.updatedAt || incomingUpdatedAt >= existing.updatedAt;
                    if (!shouldApply) continue;

                    const record = {
                        ...decrypted,
                        id: entry.id,
                        type: normalizeOutputType(entry.type),
                        timestamp: new Date(entry.timestamp).getTime(),
                        updatedAt: incomingUpdatedAt,
                        deleted: Boolean(entry.deleted),
                        deletedAt: entry.deleted_at ? new Date(entry.deleted_at).getTime() : null,
                        synced: true,
                    };

                    const txWrite = db.transaction(storeName, 'readwrite');
                    txWrite.objectStore(storeName).put(record);
                    await txWrite.done;
                    totalPulled += 1;
                } catch (err) {
                    saveSyncStatus({
                        lastError: `Pull entry failed (${entry.id}): ${err.message}`,
                        lastErrorAt: Date.now(),
                    });
                }
            }

            const next = Number(nextCursor || cursor);
            if (!entries || entries.length < PULL_LIMIT || next <= cursor) {
                cursor = next;
                break;
            }
            cursor = next;
        }

        localStorage.setItem(SYNC_CURSOR_KEY, String(cursor));
    } catch (err) {
        saveSyncStatus({
            lastError: `Pull failed: ${err.message}`,
            lastErrorAt: Date.now(),
        });
    } finally {
        syncInProgress = false;
        saveSyncStatus({
            lastSyncEnd: Date.now(),
            lastSyncDurationMs: Date.now() - startedAt,
            lastPushed: totalPushed,
            lastPulled: totalPulled,
            pendingLocal: totalPending,
            lastServerTime,
            inProgress: false,
        });
    }
}
