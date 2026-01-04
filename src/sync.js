// NephTrack Sync Service
import { encryptData, decryptData } from './encryption';
import { openDB } from 'idb';

const API_BASE = '/api';

export async function syncData(passphrase, token) {
    if (!passphrase || !token) return;

    const db = await openDB('nephtrack', 1);
    const stores = ['intake', 'output', 'flush', 'bowel', 'dressing', 'dailyTotals'];

    // 1. PUSH local changes
    for (const storeName of stores) {
        try {
            // First, get all unsynced entries in one transaction
            const tx1 = db.transaction(storeName, 'readonly');
            const entries = await tx1.objectStore(storeName).getAll();
            await tx1.done;

            const unsynced = entries.filter(e => !e.synced);
            if (unsynced.length === 0) continue;

            // Encrypt entries (outside of any transaction)
            const encryptedEntries = await Promise.all(unsynced.map(async (e) => {
                const { id, synced, type, timestamp, ...data } = e;
                const blob = await encryptData(data, passphrase);
                return {
                    id: id.toString().includes('-') ? id : window.crypto.randomUUID(),
                    type: type || storeName,
                    encrypted_blob: blob,
                    timestamp: timestamp || (e.date ? new Date(e.date).getTime() : Date.now())
                };
            }));

            // Push to server (outside of any transaction)
            const resp = await fetch(`${API_BASE}/sync/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entries: encryptedEntries })
            });

            if (resp.ok) {
                // Mark as synced in a NEW transaction
                const tx2 = db.transaction(storeName, 'readwrite');
                const store2 = tx2.objectStore(storeName);
                for (const e of unsynced) {
                    e.synced = true;
                    store2.put(e);
                }
                await tx2.done;
            }
        } catch (e) {
            console.error(`Sync push failed for ${storeName}`, e);
        }
    }

    // 2. PULL remote changes
    const lastSync = localStorage.getItem('lastSyncTime') || 0;
    try {
        const resp = await fetch(`${API_BASE}/sync/pull?lastSync=${lastSync}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resp.ok) {
            const { entries } = await resp.json();
            for (const entry of entries) {
                try {
                    const decrypted = await decryptData(entry.encrypted_blob, passphrase);
                    if (decrypted) {
                        const storeName = entry.type === 'bag' || entry.type === 'urinal' ? 'output' : entry.type;

                        // Check if exists in one transaction
                        const tx1 = db.transaction(storeName, 'readonly');
                        const existing = await tx1.objectStore(storeName).get(entry.id);
                        await tx1.done;

                        // If not exists, add in a new transaction
                        if (!existing) {
                            const tx2 = db.transaction(storeName, 'readwrite');
                            tx2.objectStore(storeName).put({
                                ...decrypted,
                                id: entry.id,
                                type: entry.type,
                                timestamp: new Date(entry.timestamp).getTime(),
                                synced: true
                            });
                            await tx2.done;
                        }
                    }
                } catch (e) {
                    console.error(`Failed to process entry ${entry.id}`, e);
                }
            }
            localStorage.setItem('lastSyncTime', Date.now());
        }
    } catch (e) {
        console.error('Sync pull failed', e);
    }
}
