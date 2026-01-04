import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuickLogView from './views/QuickLogView';
import HistoryView from './views/HistoryView';
import SummaryView from './views/SummaryView';
import { useData, useToast } from './hooks';

const TABS = [
    { id: 'log', label: 'Log', icon: '➕' },
    { id: 'history', label: 'History', icon: '🕐' },
    { id: 'summary', label: 'Summary', icon: '📊' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('log');
    const data = useData();
    const { toast, showToast } = useToast();

    // Try to init Capacitor plugins
    useEffect(() => {
        (async () => {
            try {
                const { StatusBar } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({ style: 'DARK' });
            } catch (e) {
                // Not running in Capacitor
            }
        })();
    }, []);

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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
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
