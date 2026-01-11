// API Configuration with Diagnostics
import { Capacitor } from '@capacitor/core';

// Your Railway deployment URL (can be overridden via VITE_PRODUCTION_API)
const DEFAULT_PRODUCTION_API = 'https://output-tracker-production.up.railway.app';
const ENV_MODE = typeof import.meta !== 'undefined' ? import.meta.env?.MODE : '';
const ENV_API_BASE = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE : '';
const ENV_PRODUCTION_API = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_PRODUCTION_API : '';
const PRODUCTION_API = ENV_PRODUCTION_API || DEFAULT_PRODUCTION_API;

// Platform detection
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

// Use local API only in dev builds; production native builds always hit Railway.
export const API_BASE = isNative ? (ENV_MODE === 'development' ? (ENV_API_BASE || PRODUCTION_API) : PRODUCTION_API) : '';

export const getApiUrl = (path) => `${API_BASE}${path}`;

// Diagnostic function - call this to test connectivity
export async function runDiagnostics() {
    const results = {
        timestamp: new Date().toISOString(),
        platform,
        isNative,
        API_BASE,
        tests: []
    };

    console.log('[DIAG] === Running Network Diagnostics ===');
    console.log('[DIAG] Platform:', platform);
    console.log('[DIAG] Is Native:', isNative);
    console.log('[DIAG] API_BASE:', API_BASE);

    // Test 1: Basic health check
    try {
        console.log('[DIAG] Testing health endpoint...');
        const healthUrl = `${API_BASE}/api/health`;
        console.log('[DIAG] URL:', healthUrl);

        const startTime = Date.now();
        const resp = await fetch(healthUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const elapsed = Date.now() - startTime;

        const result = {
            test: 'Health Check',
            url: healthUrl,
            status: resp.status,
            ok: resp.ok,
            elapsed: `${elapsed}ms`
        };

        if (resp.ok) {
            result.body = await resp.text();
        }

        console.log('[DIAG] Health result:', result);
        results.tests.push(result);
    } catch (error) {
        const result = {
            test: 'Health Check',
            error: error.message,
            errorName: error.name,
            stack: error.stack
        };
        console.error('[DIAG] Health error:', result);
        results.tests.push(result);
    }

    // Test 2: CORS preflight
    try {
        console.log('[DIAG] Testing CORS...');
        const corsUrl = `${API_BASE}/api/voice`;

        const resp = await fetch(corsUrl, {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST'
            }
        });

        const result = {
            test: 'CORS Preflight',
            url: corsUrl,
            status: resp.status,
            headers: {
                'access-control-allow-origin': resp.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': resp.headers.get('access-control-allow-methods')
            }
        };

        console.log('[DIAG] CORS result:', result);
        results.tests.push(result);
    } catch (error) {
        const result = {
            test: 'CORS Preflight',
            error: error.message,
            errorName: error.name
        };
        console.error('[DIAG] CORS error:', result);
        results.tests.push(result);
    }

    // Test 3: External connectivity (Google)
    try {
        console.log('[DIAG] Testing external connectivity...');
        const resp = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors'
        });

        const result = {
            test: 'External Connectivity',
            url: 'https://www.google.com',
            type: resp.type // Should be 'opaque' for no-cors
        };

        console.log('[DIAG] External result:', result);
        results.tests.push(result);
    } catch (error) {
        const result = {
            test: 'External Connectivity',
            error: error.message,
            errorName: error.name
        };
        console.error('[DIAG] External error:', result);
        results.tests.push(result);
    }

    console.log('[DIAG] === Diagnostics Complete ===');
    console.log('[DIAG] Full Results:', JSON.stringify(results, null, 2));

    return results;
}

// Export for global access in console
if (typeof window !== 'undefined') {
    window.runDiagnostics = runDiagnostics;
    window.API_CONFIG = { API_BASE, isNative, platform, PRODUCTION_API, ENV_MODE };
}
