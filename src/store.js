// NephTrack Data Store - IndexedDB wrapper for offline-first persistence
import { openDB } from 'idb';

const DB_NAME = 'nephtrack';
const DB_VERSION = 1;

const STORES = {
    INTAKE: 'intake',
    OUTPUT: 'output',
    FLUSH: 'flush',
    BOWEL: 'bowel',
    DRESSING: 'dressing',
    DAILY_TOTALS: 'dailyTotals',
};

let dbPromise = null;

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
        });
    }
    return dbPromise;
}

// Generic CRUD operations
async function addEntry(storeName, entry) {
    const db = await getDB();
    const id = window.crypto.randomUUID();
    const record = {
        ...entry,
        id,
        timestamp: entry.timestamp || Date.now(),
        synced: false
    };
    await db.add(storeName, record);
    return id;
}

async function getAllEntries(storeName) {
    const db = await getDB();
    return db.getAllFromIndex(storeName, 'timestamp');
}

async function updateEntry(storeName, entry) {
    const db = await getDB();
    return db.put(storeName, entry);
}

async function deleteEntry(storeName, id) {
    const db = await getDB();
    return db.delete(storeName, id);
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

// Output
export const addOutput = (type, amountMl, colorNote = '', symptoms = {}, otherNote = '', timestamp = Date.now()) =>
    addEntry(STORES.OUTPUT, {
        type, // 'bag' | 'urinal'
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

// Flush
export const addFlush = (amountMl = 30, note = '', timestamp = Date.now()) =>
    addEntry(STORES.FLUSH, { amountMl, note, timestamp });

export const getAllFlushes = () => getAllEntries(STORES.FLUSH);

export const deleteFlush = (id) => deleteEntry(STORES.FLUSH, id);

// Bowel
export const addBowel = (bristolScale = 0, note = '', timestamp = Date.now()) =>
    addEntry(STORES.BOWEL, { bristolScale, note, timestamp });

export const getAllBowels = () => getAllEntries(STORES.BOWEL);

export const deleteBowel = (id) => deleteEntry(STORES.BOWEL, id);

// Dressing
export const addDressing = (state = 'Checked', note = '', timestamp = Date.now()) =>
    addEntry(STORES.DRESSING, { state, note, timestamp });

export const getAllDressings = () => getAllEntries(STORES.DRESSING);

export const deleteDressing = (id) => deleteEntry(STORES.DRESSING, id);

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
        return db.put(STORES.DAILY_TOTALS, existing);
    } else {
        return db.add(STORES.DAILY_TOTALS, {
            id: window.crypto.randomUUID(),
            date: dateStr,
            bagMl,
            urinalMl,
            totalMl: bagMl + urinalMl,
            intakeMl,
            synced: false,
        });
    }
};

export const getAllDailyTotals = async () => {
    const db = await getDB();
    const all = await db.getAll(STORES.DAILY_TOTALS);
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
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
