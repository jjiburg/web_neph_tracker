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
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const entries = await store.getAll();

        const unsynced = entries.filter(e => !e.synced);
        if (unsynced.length === 0) continue;

        const encryptedEntries = await Promise.all(unsynced.map(async (e) => {
            // Remove local metadata before encrypting
            const { id, synced, type, timestamp, ...data } = e;
            const blob = await encryptData(data, passphrase);
            return {
                id: id.toString().includes('-') ? id : window.crypto.randomUUID(), // Ensure UUID for server
                type: type || storeName,
                encrypted_blob: blob,
                timestamp: timestamp || (e.date ? new Date(e.date).getTime() : Date.now())
            };
        }));

        try {
            const resp = await fetch(`${API_BASE}/sync/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entries: encryptedEntries })
            });

            if (resp.ok) {
                // Mark as synced locally
                for (const e of unsynced) {
                    e.synced = true;
                    await store.put(e);
                }
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
                const decrypted = await decryptData(entry.encrypted_blob, passphrase);
                if (decrypted) {
                    const storeName = entry.type === 'bag' || entry.type === 'urinal' ? 'output' : entry.type;
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);

                    // Check if it already exists by ID
                    const existing = await store.get(entry.id);
                    if (!existing) {
                        await store.put({
                            ...decrypted,
                            id: entry.id,
                            type: entry.type,
                            timestamp: new Date(entry.timestamp).getTime(),
                            synced: true
                        });
                    }
                }
            }
            localStorage.setItem('lastSyncTime', Date.now());
        }
    } catch (e) {
        console.error('Sync pull failed', e);
    }
}
