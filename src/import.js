/**
 * Output Tracker Import Utility
 * Parses and imports data exported from the native Output Tracker iOS app.
 * Schema version: 1
 */

import { openDB } from 'idb';

const DB_NAME = 'nephtrack';
const DB_VERSION = 2;
const STORE_NAMES = ['intake', 'output', 'flush', 'bowel', 'dressing', 'dailyTotals', 'goals'];
const COMMON_FIELDS = ['id', 'timestamp', 'updatedAt', 'deleted', 'deletedAt', 'synced'];
const STORE_FIELDS = {
    intake: ['amountMl', 'note'],
    output: ['type', 'amountMl', 'colorNote', 'clots', 'pain', 'leakage', 'fever', 'otherNote'],
    flush: ['amountMl', 'note'],
    bowel: ['bristolScale', 'note'],
    dressing: ['state', 'note'],
    dailyTotals: ['date', 'bagMl', 'urinalMl', 'totalMl', 'intakeMl'],
    goals: ['intakeMl', 'outputMl'],
};
const DEFAULT_VALUES = {
    id: 'uuid',
    timestamp: 0,
    updatedAt: 0,
    deleted: false,
    deletedAt: null,
    synced: false,
    amountMl: 0,
    note: '',
    type: 'bag',
    colorNote: '',
    clots: false,
    pain: false,
    leakage: false,
    fever: false,
    otherNote: '',
    bristolScale: 0,
    state: 'Checked',
    date: 'YYYY-MM-DD',
    bagMl: 0,
    urinalMl: 0,
    totalMl: 0,
    intakeMl: 0,
    outputMl: 0,
};

async function getDB() {
    return openDB(DB_NAME, DB_VERSION);
}

export async function exportBackup() {
    const db = await getDB();
    const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        data: {},
    };

    for (const storeName of STORE_NAMES) {
        const entries = await db.getAll(storeName);
        payload.data[storeName] = entries.filter((entry) => !entry.deleted);
    }

    return payload;
}

export function exportSchemaDefinition(backupPayload = null) {
    const data = backupPayload?.data || {};
    const schemaData = {};

    for (const storeName of STORE_NAMES) {
        const baseFields = [...COMMON_FIELDS, ...(STORE_FIELDS[storeName] || [])];
        const entryKeys = new Set(baseFields);
        const entries = Array.isArray(data[storeName]) ? data[storeName] : [];
        for (const entry of entries) {
            Object.keys(entry || {}).forEach((key) => entryKeys.add(key));
        }
        const example = {};
        for (const key of entryKeys) {
            example[key] = Object.prototype.hasOwnProperty.call(DEFAULT_VALUES, key) ? DEFAULT_VALUES[key] : null;
        }
        schemaData[storeName] = [example];
    }

    return {
        schemaVersion: 2,
        title: 'Output Tracker JSON Export Schema',
        exportedAt: new Date().toISOString(),
        data: schemaData,
    };
}

export async function clearLocalData() {
    const db = await getDB();
    await clearAllStores(db);
}

/**
 * Parses a Output Tracker backup JSON file and imports the data into IndexedDB.
 * @param {string} jsonString - The raw JSON string from the backup file.
 * @param {boolean} replaceExisting - If true, clears existing data before import.
 * @returns {Promise<{success: boolean, message: string, counts: object}>}
 */
export async function importBackup(jsonString, replaceExisting = false) {
    try {
        const payload = JSON.parse(jsonString);

        const db = await getDB();

        if (replaceExisting) {
            await clearAllStores(db);
        }

        if (payload.schemaVersion === 2) {
            return await importWebBackup(payload, db);
        }

        // Validate schema
        if (!payload.schemaVersion || payload.schemaVersion !== 1) {
            return { success: false, message: 'Unsupported schema version. Expected version 1 or 2.' };
        }

        const counts = {
            intakes: 0,
            outputs: 0,
            flushes: 0,
            bowelMovements: 0,
            dressings: 0,
            dailyTotals: 0,
            goals: 0,
        };

        // Import Intakes
        if (payload.intakes && Array.isArray(payload.intakes)) {
            const tx = db.transaction('intake', 'readwrite');
            for (const item of payload.intakes) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    amountMl: item.amountMl,
                    note: item.note || '',
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.intakes++;
            }
            await tx.done;
        }

        // Import Outputs
        if (payload.outputs && Array.isArray(payload.outputs)) {
            const tx = db.transaction('output', 'readwrite');
            for (const item of payload.outputs) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    type: item.typeRaw || 'bag',
                    amountMl: item.amountMl,
                    colorNote: item.colorNote || '',
                    clots: item.clots || false,
                    pain: item.pain || false,
                    leakage: item.leakage || false,
                    fever: item.fever || false,
                    otherNote: item.otherNote || '',
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.outputs++;
            }
            await tx.done;
        }

        // Import Flushes
        if (payload.flushes && Array.isArray(payload.flushes)) {
            const tx = db.transaction('flush', 'readwrite');
            for (const item of payload.flushes) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    amountMl: item.amountMl || 30,
                    note: item.note || '',
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.flushes++;
            }
            await tx.done;
        }

        // Import Bowel Movements
        if (payload.bowelMovements && Array.isArray(payload.bowelMovements)) {
            const tx = db.transaction('bowel', 'readwrite');
            for (const item of payload.bowelMovements) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    bristolScale: item.bristolScale || 0,
                    note: item.note || '',
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.bowelMovements++;
            }
            await tx.done;
        }

        // Import Dressings
        if (payload.dressings && Array.isArray(payload.dressings)) {
            const tx = db.transaction('dressing', 'readwrite');
            for (const item of payload.dressings) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    state: item.stateRaw || 'Checked',
                    note: item.note || '',
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.dressings++;
            }
            await tx.done;
        }

        // Import Daily Totals
        if (payload.dailyTotals && Array.isArray(payload.dailyTotals)) {
            const tx = db.transaction('dailyTotals', 'readwrite');
            for (const item of payload.dailyTotals) {
                const dateStr = new Date(item.day).toISOString().split('T')[0];
                await tx.store.add({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    bagMl: item.bagTotalMl || 0,
                    urinalMl: item.urinalTotalMl || 0,
                    totalMl: item.totalOutputMl || 0,
                    intakeMl: item.intakeTotalMl || 0,
                    updatedAt: new Date(item.day).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.dailyTotals++;
            }
            await tx.done;
        }

        if (payload.goals && Array.isArray(payload.goals)) {
            const tx = db.transaction('goals', 'readwrite');
            for (const item of payload.goals) {
                await tx.store.add({
                    id: crypto.randomUUID(),
                    intakeMl: item.intakeMl ?? null,
                    outputMl: item.outputMl ?? null,
                    timestamp: new Date(item.timestamp).getTime(),
                    updatedAt: new Date(item.timestamp).getTime(),
                    deleted: false,
                    deletedAt: null,
                    synced: false
                });
                counts.goals++;
            }
            await tx.done;
        }

        const totalImported = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
            success: true,
            message: `Successfully imported ${totalImported} records.`,
            counts
        };

    } catch (error) {
        console.error('Import failed:', error);
        return { success: false, message: `Import failed: ${error.message}` };
    }
}

async function importWebBackup(payload, db) {
    const data = payload.data || {};
    const now = Date.now();
    const counts = {
        intakes: 0,
        outputs: 0,
        flushes: 0,
        bowelMovements: 0,
        dressings: 0,
        dailyTotals: 0,
        goals: 0,
    };

    const normalizeOutputType = (type) => (type === 'void' ? 'urinal' : type);

    if (Array.isArray(data.intake)) {
        const tx = db.transaction('intake', 'readwrite');
        for (const item of data.intake) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.intakes++;
        }
        await tx.done;
    }

    if (Array.isArray(data.output)) {
        const tx = db.transaction('output', 'readwrite');
        for (const item of data.output) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                type: normalizeOutputType(item.type || 'bag'),
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.outputs++;
        }
        await tx.done;
    }

    if (Array.isArray(data.flush)) {
        const tx = db.transaction('flush', 'readwrite');
        for (const item of data.flush) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.flushes++;
        }
        await tx.done;
    }

    if (Array.isArray(data.bowel)) {
        const tx = db.transaction('bowel', 'readwrite');
        for (const item of data.bowel) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.bowelMovements++;
        }
        await tx.done;
    }

    if (Array.isArray(data.dressing)) {
        const tx = db.transaction('dressing', 'readwrite');
        for (const item of data.dressing) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.dressings++;
        }
        await tx.done;
    }

    if (Array.isArray(data.dailyTotals)) {
        const tx = db.transaction('dailyTotals', 'readwrite');
        for (const item of data.dailyTotals) {
            const dateStr = item.date || new Date(item.timestamp || now).toISOString().split('T')[0];
            const bagMl = item.bagMl || 0;
            const urinalMl = item.urinalMl || 0;
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                date: dateStr,
                bagMl,
                urinalMl,
                totalMl: item.totalMl || bagMl + urinalMl,
                intakeMl: item.intakeMl || 0,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.dailyTotals++;
        }
        await tx.done;
    }

    if (Array.isArray(data.goals)) {
        const tx = db.transaction('goals', 'readwrite');
        for (const item of data.goals) {
            await tx.store.put({
                ...item,
                id: item.id || crypto.randomUUID(),
                intakeMl: item.intakeMl ?? null,
                outputMl: item.outputMl ?? null,
                timestamp: item.timestamp || now,
                updatedAt: item.updatedAt || item.timestamp || now,
                deleted: false,
                deletedAt: null,
                synced: false,
            });
            counts.goals++;
        }
        await tx.done;
    }

    const totalImported = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
        success: true,
        message: `Successfully imported ${totalImported} records.`,
        counts,
    };
}

async function clearAllStores(db) {
    for (const name of STORE_NAMES) {
        const tx = db.transaction(name, 'readwrite');
        await tx.store.clear();
        await tx.done;
    }
}
