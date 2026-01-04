// API Configuration
// Detects if running in Capacitor and uses the production server URL

import { Capacitor } from '@capacitor/core';

// Your Railway deployment URL
const PRODUCTION_API = 'https://output-tracker-production.up.railway.app';

// Use production API when running in native app, relative path for web
export const API_BASE = Capacitor.isNativePlatform() ? PRODUCTION_API : '';

export const getApiUrl = (path) => `${API_BASE}${path}`;
