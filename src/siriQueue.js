import { registerPlugin } from '@capacitor/core';
import { isNative, platform } from './config';

const SiriQueue = registerPlugin('SiriQueue');

let draining = false;

export async function drainSiriQueue(onCommand) {
    if (!isNative || platform !== 'ios') return [];
    if (draining) return [];
    draining = true;
    try {
        const result = await SiriQueue.getAndClear();
        const items = Array.isArray(result?.items) ? result.items : [];
        for (const item of items) {
            await onCommand(item);
        }
        return items;
    } catch (e) {
        console.error('[SIRI] Failed to drain queue', e);
        return [];
    } finally {
        draining = false;
    }
}
