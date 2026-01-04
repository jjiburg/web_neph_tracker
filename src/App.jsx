import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuickLogView from './views/QuickLogView';
import HistoryView from './views/HistoryView';
import SummaryView from './views/SummaryView';
import AuthScreen from './components/AuthScreen';
import { useData, useToast } from './hooks';
import { syncData } from './sync';
import { Icons } from './components/Icons';

const TABS = [
    { id: 'log', label: 'Log', icon: <Icons.Plus /> },
    { id: 'history', label: 'History', icon: <Icons.Clock /> },
    { id: 'summary', label: 'Summary', icon: <Icons.Chart /> },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('log');
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
    const [passphrase, setPassphrase] = useState(() => localStorage.getItem('passphrase') || '');
    const [showAuth, setShowAuth] = useState(!user || !passphrase);

    const data = useData();
    const { toast, showToast } = useToast();

    // Capacitor & Sync initialization
    useEffect(() => {
        (async () => {
            try {
                const { StatusBar } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({ style: 'DARK' });
            } catch (e) { }
        })();

        if (user?.token && passphrase) {
            const interval = setInterval(() => {
                syncData(passphrase, user.token).then(data.refresh);
            }, 30000);
            syncData(passphrase, user.token).then(data.refresh);
            return () => clearInterval(interval);
        }
    }, [user, passphrase, data.refresh]);

    const handleAuth = async (isLogin, username, password, pass) => {
        const endpoint = isLogin ? '/api/login' : '/api/register';
        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await resp.json();
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
            alert('Connection failed. Make sure server is running.');
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
            default:
                return null;
        }
    };

    return (
        <>
            {/* Animated Liquid Background */}
            <div className="liquid-background" />

            {/* Logout button */}
            <div style={{ position: 'fixed', top: 'calc(var(--safe-top) + 20px)', right: '20px', zIndex: 1000 }}>
                <button
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    className="liquid-button--chip"
                    style={{ minHeight: '36px', display: 'flex', gap: '6px', alignItems: 'center' }}
                >
                    <Icons.LogOut />
                    <span>Logout</span>
                </button>
            </div>

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
