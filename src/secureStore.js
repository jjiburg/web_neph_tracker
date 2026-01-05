import { registerPlugin } from '@capacitor/core';
import { isNative, platform } from './config';

const SecureStore = registerPlugin('SecureStore');

export async function setNativeCredentials(token, passphrase) {
    if (!isNative || platform !== 'ios') return;
    if (!token || !passphrase) return;
    try {
        await SecureStore.setCredentials({ token, passphrase });
    } catch (e) {
        console.warn('[SECURESTORE] Failed to persist credentials', e);
    }
}

export async function clearNativeCredentials() {
    if (!isNative || platform !== 'ios') return;
    try {
        await SecureStore.clearCredentials();
    } catch (e) {
        console.warn('[SECURESTORE] Failed to clear credentials', e);
    }
}

