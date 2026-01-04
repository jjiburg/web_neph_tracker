/**
 * NephTrack Import Utility
 * Parses and imports data exported from the native NephTrack iOS app.
 * Schema version: 1
 */

import { openDB } from 'idb';

const DB_NAME = 'nephtrack';
const DB_VERSION = 1;

async function getDB() {
    return openDB(DB_NAME, DB_VERSION);
}

/**
 * Parses a NephTrack backup JSON file and imports the data into IndexedDB.
 * @param {string} jsonString - The raw JSON string from the backup file.
 * @param {boolean} replaceExisting - If true, clears existing data before import.
 * @returns {Promise<{success: boolean, message: string, counts: object}>}
 */
export async function importBackup(jsonString, replaceExisting = false) {
    try {
        const payload = JSON.parse(jsonString);

        // Validate schema
        if (!payload.schemaVersion || payload.schemaVersion !== 1) {
            return { success: false, message: 'Unsupported schema version. Expected version 1.' };
        }

        const db = await getDB();

        if (replaceExisting) {
            await clearAllStores(db);
        }

        const counts = {
            intakes: 0,
            outputs: 0,
            flushes: 0,
            bowelMovements: 0,
            dressings: 0,
            dailyTotals: 0
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
                    synced: false
                });
                counts.dailyTotals++;
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

async function clearAllStores(db) {
    const storeNames = ['intake', 'output', 'flush', 'bowel', 'dressing', 'dailyTotals'];
    for (const name of storeNames) {
        const tx = db.transaction(name, 'readwrite');
        await tx.store.clear();
        await tx.done;
    }
}
