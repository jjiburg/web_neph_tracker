// Output Tracker Data Store - IndexedDB wrapper for offline-first persistence
import { openDB } from 'idb';

const DB_NAME = 'nephtrack';
const DB_VERSION = 1;
const FALLBACK_KEY = 'nephtrack-fallback-queue';
const FALLBACK_LIMIT_PER_STORE = 200;

const STORES = {
    INTAKE: 'intake',
    OUTPUT: 'output',
    FLUSH: 'flush',
    BOWEL: 'bowel',
    DRESSING: 'dressing',
    DAILY_TOTALS: 'dailyTotals',
};

let dbPromise = null;
let flushingQueue = false;

function notifyChange() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nephtrack-local-change'));
    }
}

function canUseLocalStorage() {
    return typeof localStorage !== 'undefined';
}

function normalizeFallbackMap(map) {
    if (!map || typeof map !== 'object') return {};
    const normalized = {};
    const validStores = new Set(Object.values(STORES));
    Object.entries(map).forEach(([storeName, entries]) => {
        if (!validStores.has(storeName)) return;
        let list = [];
        if (Array.isArray(entries)) {
            list = entries;
        } else if (entries && typeof entries === 'object') {
            list = Object.values(entries);
        }
        const filtered = list.filter((entry) => entry && entry.id);
        if (filtered.length === 0) return;
        filtered.sort(
            (a, b) =>
                (a.updatedAt || a.timestamp || 0) -
                (b.updatedAt || b.timestamp || 0),
        );
        const trimmed = filtered.slice(-FALLBACK_LIMIT_PER_STORE);
        const storeMap = {};
        trimmed.forEach((entry) => {
            storeMap[entry.id] = entry;
        });
        normalized[storeName] = storeMap;
    });
    return normalized;
}

function loadFallbackMap() {
    if (!canUseLocalStorage()) return {};
    try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return normalizeFallbackMap(parsed);
    } catch {
        return {};
    }
}

function saveFallbackMap(map) {
    if (!canUseLocalStorage()) return;
    try {
        const normalized = normalizeFallbackMap(map);
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(normalized));
    } catch (err) {
        console.error('Failed to persist fallback queue', err);
    }
}

function getFallbackEntries(storeName) {
    const map = loadFallbackMap();
    return Object.values(map[storeName] || {});
}

function upsertFallbackEntry(storeName, record) {
    const map = loadFallbackMap();
    const storeMap = map[storeName] || {};
    storeMap[record.id] = { ...record, queued: true };
    map[storeName] = storeMap;
    saveFallbackMap(map);
    return storeMap[record.id];
}

function removeFallbackEntry(storeName, id) {
    const map = loadFallbackMap();
    const storeMap = map[storeName];
    if (!storeMap || !storeMap[id]) return false;
    delete storeMap[id];
    if (Object.keys(storeMap).length === 0) {
        delete map[storeName];
    } else {
        map[storeName] = storeMap;
    }
    saveFallbackMap(map);
    return true;
}

function updateFallbackEntry(storeName, entry) {
    const map = loadFallbackMap();
    const storeMap = map[storeName];
    if (!storeMap || !storeMap[entry.id]) return null;
    const now = Date.now();
    const updated = {
        ...storeMap[entry.id],
        ...entry,
        updatedAt: now,
        synced: false,
        deleted: false,
        deletedAt: null,
        queued: true,
    };
    storeMap[entry.id] = updated;
    map[storeName] = storeMap;
    saveFallbackMap(map);
    return updated;
}

async function flushFallbackQueue(db) {
    if (flushingQueue) return;
    const map = loadFallbackMap();
    const storeNames = Object.keys(map);
    if (storeNames.length === 0) return;
    flushingQueue = true;
    let changed = false;
    try {
        for (const storeName of storeNames) {
            if (!db.objectStoreNames.contains(storeName)) continue;
            const entries = Object.values(map[storeName] || {});
            if (entries.length === 0) {
                delete map[storeName];
                continue;
            }
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                entries.forEach((entry) => {
                    store.put({ ...entry, queued: false });
                });
                await tx.done;
                delete map[storeName];
                changed = true;
            } catch {
                // Keep entries for next retry.
            }
        }
        if (changed) {
            saveFallbackMap(map);
            notifyChange();
        }
    } finally {
        flushingQueue = false;
    }
}

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp');
                        store.createIndex('synced', 'synced');
                        if (storeName === STORES.DAILY_TOTALS) {
                            store.createIndex('date', 'date');
                        }
                    }
                });
            },
        }).then(async (db) => {
            await flushFallbackQueue(db);
            return db;
        });
    }
    return dbPromise;
}

// Generic CRUD operations
async function addEntry(storeName, entry) {
    const id = window.crypto.randomUUID();
    const now = Date.now();
    const record = {
        ...entry,
        id,
        timestamp: entry.timestamp || now,
        updatedAt: now,
        deleted: false,
        deletedAt: null,
        synced: false,
    };
    try {
        const db = await getDB();
        await db.add(storeName, record);
        notifyChange();
        return id;
    } catch (err) {
        try {
            dbPromise = null;
            const db = await getDB();
            await db.add(storeName, record);
            notifyChange();
            return id;
        } catch (err2) {
            const queued = upsertFallbackEntry(storeName, record);
            if (queued) {
                notifyChange();
                return id;
            }
            throw err2;
        }
    }
}

async function getAllEntries(storeName) {
    let entries = [];
    try {
        const db = await getDB();
        entries = await db.getAllFromIndex(storeName, 'timestamp');
    } catch (err) {
        try {
            dbPromise = null;
            const db = await getDB();
            entries = await db.getAllFromIndex(storeName, 'timestamp');
        } catch (err2) {
            console.error('Failed to read from IndexedDB, using fallback queue', err2);
        }
    }
    const queued = getFallbackEntries(storeName);
    const seen = new Map();
    entries.forEach((entry) => seen.set(entry.id, entry));
    queued.forEach((entry) => {
        if (!seen.has(entry.id)) {
            seen.set(entry.id, entry);
        }
    });
    return Array.from(seen.values())
        .filter((entry) => !entry.deleted)
        .sort((a, b) => a.timestamp - b.timestamp);
}

async function updateEntry(storeName, entry) {
    const db = await getDB();
    const result = await db.put(storeName, entry);
    notifyChange();
    return result;
}

async function updateEntryWithDefaults(storeName, entry) {
    try {
        const db = await getDB();
        const existing = await db.get(storeName, entry.id);
        if (!existing) {
            const updated = updateFallbackEntry(storeName, entry);
            if (updated) notifyChange();
            return updated;
        }
        const now = Date.now();
        const result = await db.put(storeName, {
            ...existing,
            ...entry,
            updatedAt: now,
            synced: false,
            deleted: false,
            deletedAt: null,
        });
        notifyChange();
        return result;
    } catch (err) {
        const updated = updateFallbackEntry(storeName, entry);
        if (updated) notifyChange();
        return updated;
    }
}

async function deleteEntry(storeName, id) {
    try {
        const db = await getDB();
        const entry = await db.get(storeName, id);
        if (!entry) {
            const removed = removeFallbackEntry(storeName, id);
            if (removed) notifyChange();
            return;
        }
        const now = Date.now();
        const result = await db.put(storeName, {
            ...entry,
            deleted: true,
            deletedAt: now,
            updatedAt: now,
            synced: false,
        });
        notifyChange();
        return result;
    } catch (err) {
        const removed = removeFallbackEntry(storeName, id);
        if (removed) notifyChange();
        return;
    }
}

// Helper: Get entries for a specific day
function isToday(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}

function isSameDay(timestamp, targetDate) {
    const date = new Date(timestamp);
    const target = new Date(targetDate);
    return (
        date.getFullYear() === target.getFullYear() &&
        date.getMonth() === target.getMonth() &&
        date.getDate() === target.getDate()
    );
}

// Intake
export const addIntake = (amountMl, note = '', timestamp = Date.now()) =>
    addEntry(STORES.INTAKE, { amountMl, note, timestamp });

export const getAllIntakes = () => getAllEntries(STORES.INTAKE);

export const deleteIntake = (id) => deleteEntry(STORES.INTAKE, id);
export const updateIntake = (entry) => updateEntryWithDefaults(STORES.INTAKE, entry);

// Output
export const addOutput = (type, amountMl, colorNote = '', symptoms = {}, otherNote = '', timestamp = Date.now()) =>
    addEntry(STORES.OUTPUT, {
        type: type === 'void' ? 'urinal' : type, // 'bag' | 'urinal'
        amountMl,
        colorNote,
        clots: symptoms.clots || false,
        pain: symptoms.pain || false,
        leakage: symptoms.leakage || false,
        fever: symptoms.fever || false,
        otherNote,
        timestamp,
    });

export const getAllOutputs = () => getAllEntries(STORES.OUTPUT);

export const deleteOutput = (id) => deleteEntry(STORES.OUTPUT, id);
export const updateOutput = (entry) => {
    const type = entry.type ? (entry.type === 'void' ? 'urinal' : entry.type) : entry.type;
    return updateEntryWithDefaults(STORES.OUTPUT, { ...entry, type });
};

// Flush
export const addFlush = (amountMl = 30, note = '', timestamp = Date.now()) =>
    addEntry(STORES.FLUSH, { amountMl, note, timestamp });

export const getAllFlushes = () => getAllEntries(STORES.FLUSH);

export const deleteFlush = (id) => deleteEntry(STORES.FLUSH, id);
export const updateFlush = (entry) => updateEntryWithDefaults(STORES.FLUSH, entry);

// Bowel
export const addBowel = (bristolScale = 0, note = '', timestamp = Date.now()) =>
    addEntry(STORES.BOWEL, { bristolScale, note, timestamp });

export const getAllBowels = () => getAllEntries(STORES.BOWEL);

export const deleteBowel = (id) => deleteEntry(STORES.BOWEL, id);
export const updateBowel = (entry) => updateEntryWithDefaults(STORES.BOWEL, entry);

// Dressing
export const addDressing = (state = 'Checked', note = '', timestamp = Date.now()) =>
    addEntry(STORES.DRESSING, { state, note, timestamp });

export const getAllDressings = () => getAllEntries(STORES.DRESSING);

export const deleteDressing = (id) => deleteEntry(STORES.DRESSING, id);
export const updateDressing = (entry) => updateEntryWithDefaults(STORES.DRESSING, entry);

// Daily Totals
export const addOrUpdateDailyTotal = async (dateStr, bagMl, urinalMl, intakeMl) => {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORES.DAILY_TOTALS, 'date');
    const existing = all.find((d) => d.date === dateStr);
    if (existing) {
        existing.bagMl = bagMl;
        existing.urinalMl = urinalMl;
        existing.totalMl = bagMl + urinalMl;
        existing.intakeMl = intakeMl;
        existing.synced = false;
        existing.updatedAt = Date.now();
        existing.deleted = false;
        existing.deletedAt = null;
        const result = await db.put(STORES.DAILY_TOTALS, existing);
        notifyChange();
        return result;
    } else {
        const result = await db.add(STORES.DAILY_TOTALS, {
            id: window.crypto.randomUUID(),
            date: dateStr,
            bagMl,
            urinalMl,
            totalMl: bagMl + urinalMl,
            intakeMl,
            updatedAt: Date.now(),
            deleted: false,
            deletedAt: null,
            synced: false,
        });
        notifyChange();
        return result;
    }
};

export const getAllDailyTotals = async () => {
    const db = await getDB();
    const all = await db.getAll(STORES.DAILY_TOTALS);
    return all.filter((entry) => !entry.deleted).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const deleteDailyTotal = (id) => deleteEntry(STORES.DAILY_TOTALS, id);

// Utilities
export { isToday, isSameDay };

// Format helpers
export const formatMl = (ml) => `${Math.round(ml)} ml`;
export const formatOz = (ml) => `${Math.round(ml / 29.5735)} oz`;
export const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
export const formatDateFull = (timestamp) =>
    new Date(timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
