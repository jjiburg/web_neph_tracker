/**
 * NephTrack E2E Encryption
 * Uses Web Crypto API (AES-GCM 256)
 * Server only sees encrypted blobs and IDs.
 */

const ITERATIONS = 100000;
const SALT = new TextEncoder().encode('nephtrack-salt-static'); // In a real app, use a per-user salt.

async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: SALT,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(data, passphrase) {
    const key = await deriveKey(passphrase);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
    );

    // Return IV + Ciphertext as a single base64 string
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64, passphrase) {
    try {
        const key = await deriveKey(passphrase);
        const combined = new Uint8Array(
            atob(encryptedBase64)
                .split('')
                .map((c) => c.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error('Decryption failed. Wrong passphrase?', e);
        return null;
    }
}
