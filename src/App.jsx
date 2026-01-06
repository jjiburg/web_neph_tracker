import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuickLogView from './views/QuickLogView';
import HistoryView from './views/HistoryView';
import SummaryView from './views/SummaryView';
import TrendsView from './views/TrendsView';
import AuthScreen from './components/AuthScreen';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { useData, useToast } from './hooks';
import { syncData } from './sync';
import { Icons } from './components/Icons';
import { API_BASE, isNative, platform } from './config';

const TABS = [
    { id: 'log', label: 'Log', icon: <Icons.Plus /> },
    { id: 'history', label: 'History', icon: <Icons.Clock /> },
    { id: 'trends', label: 'Trends', icon: <Icons.Chart /> },
    { id: 'summary', label: 'Summary', icon: <Icons.Calendar /> },
];

const SYNC_INTERVAL_MS = 10000;
const LOCAL_CHANGE_DEBOUNCE_MS = 600;

export default function App() {
    const [activeTab, setActiveTab] = useState('log');
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
    const [passphrase, setPassphrase] = useState(() => localStorage.getItem('passphrase') || '');
    const [showAuth, setShowAuth] = useState(!user || !passphrase);
    const syncTimeoutRef = useRef(null);
    const [syncStatus, setSyncStatus] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('syncStatus') || 'null');
        } catch {
            return null;
        }
    });

    const data = useData();
    const { toast, showToast } = useToast();

    // Capacitor & Sync initialization
    useEffect(() => {
        const handleSyncStatus = (event) => {
            setSyncStatus(event.detail);
        };
        window.addEventListener('nephtrack-sync-status', handleSyncStatus);
        return () => window.removeEventListener('nephtrack-sync-status', handleSyncStatus);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { StatusBar } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({ style: 'DARK' });
            } catch (e) { }
        })();

        if (user?.token && passphrase) {
            const runSync = () => syncData(passphrase, user.token).then(data.refresh);

            const scheduleSync = () => {
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                }
                syncTimeoutRef.current = setTimeout(runSync, LOCAL_CHANGE_DEBOUNCE_MS);
            };

            const handleLocalChange = () => scheduleSync();
            const handleVisibility = () => {
                if (document.visibilityState === 'visible') runSync();
            };
            const handleOnline = () => runSync();

            const interval = setInterval(runSync, SYNC_INTERVAL_MS);
            runSync();

            window.addEventListener('nephtrack-local-change', handleLocalChange);
            document.addEventListener('visibilitychange', handleVisibility);
            window.addEventListener('online', handleOnline);

            return () => {
                clearInterval(interval);
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                }
                window.removeEventListener('nephtrack-local-change', handleLocalChange);
                document.removeEventListener('visibilitychange', handleVisibility);
                window.removeEventListener('online', handleOnline);
            };
        }
    }, [user, passphrase, data.refresh]);

    const handleAuth = async (isLogin, username, password, pass) => {
        const endpoint = isLogin ? `${API_BASE}/api/login` : `${API_BASE}/api/register`;
        console.log('[AUTH] Attempting', isLogin ? 'login' : 'register', 'to:', endpoint);
        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            console.log('[AUTH] Response status:', resp.status);
            const result = await resp.json();
            console.log('[AUTH] Response body:', result);
            if (result.token) {
                const userData = { username, token: result.token };
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('passphrase', pass);
                setUser(userData);
                setPassphrase(pass);
                setShowAuth(false);
                showToast('Securely signed in');
            } else {
                alert(result.error || 'Auth failed');
            }
        } catch (e) {
            console.error('[AUTH] Connection error:', e);
            alert(`Connection failed: ${e.message}\n\nPlatform: ${platform}\nAPI: ${API_BASE || '(empty)'}`);
        }
    };

    if (showAuth) {
        return (
            <>
                <div className="liquid-background" />
                <AuthScreen onAuth={handleAuth} initialPassphrase={passphrase} />
            </>
        );
    }

    const renderView = () => {
        switch (activeTab) {
            case 'log':
                return <QuickLogView data={data} showToast={showToast} />;
            case 'history':
                return <HistoryView data={data} showToast={showToast} />;
            case 'summary':
                return <SummaryView data={data} showToast={showToast} />;
            case 'trends':
                return <TrendsView data={data} showToast={showToast} />;
            default:
                return null;
        }
    };

    return (
        <>
            {/* Animated Liquid Background */}
            <div className="liquid-background" />

            {syncStatus?.inProgress && syncStatus?.activeTransfer && (
                <div className="sync-indicator">
                    <span className="sync-indicator__dot" />
                    <span>Syncing...</span>
                </div>
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className="toast"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span className="toast__icon">✓</span>
                        <span className="toast__text">{toast}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%' }}
                >
                    {renderView()}
                </motion.div>
            </AnimatePresence>

            {/* Tab Bar */}
            <nav className="tab-bar">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-bar__item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-bar__icon">{tab.icon}</span>
                        {activeTab === tab.id && <span>{tab.label}</span>}
                    </button>
                ))}
            </nav>
        </>
    );
}
