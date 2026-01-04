import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';

export default function HistoryView({ data }) {
    const [filter, setFilter] = useState('All');

    const entries = useMemo(() => {
        return [
            ...data.intakes.map(e => ({ ...e, storeName: 'intake' })),
            ...data.outputs.map(e => ({ ...e, storeName: 'output' })),
            ...data.flushes.map(e => ({ ...e, storeName: 'flush' })),
            ...data.bowels.map(e => ({ ...e, storeName: 'bowel' })),
            ...data.dressings.map(e => ({ ...e, storeName: 'dressing' })),
        ].sort((a, b) => b.timestamp - a.timestamp);
    }, [data.intakes, data.outputs, data.flushes, data.bowels, data.dressings]);

    const filteredEntries = useMemo(() => {
        if (filter === 'All') return entries;
        return entries.filter(e => e.storeName.toLowerCase() === filter.toLowerCase());
    }, [entries, filter]);

    const getIcon = (type) => {
        switch (type) {
            case 'intake': return <Icons.Drop size={20} color="var(--primary)" />;
            case 'output': return <Icons.Beaker size={20} color="var(--secondary)" />;
            case 'flush': return <Icons.Syringe size={20} color="var(--success)" />;
            case 'bowel': return <span style={{ fontSize: 18 }}>🧻</span>;
            case 'dressing': return <Icons.Bandage size={20} color="#a855f7" />;
            default: return <Icons.Activity size={20} />;
        }
    };

    const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div className="view-content">
            <header className="screen-header">
                <div>
                    <h1 className="screen-header__title">History</h1>
                    <p className="screen-header__subtitle">{filteredEntries.length} {filteredEntries.length === 1 ? 'Entry' : 'Entries'}</p>
                </div>
            </header>

            {/* Filter Chips */}
            <div className="filter-scroll">
                {['All', 'Intake', 'Output', 'Flush', 'Bowel', 'Dressing'].map((f) => (
                    <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f}
                    </button>
                ))}
            </div>

            {/* History List */}
            <div className="history-list">
                <AnimatePresence initial={false}>
                    {filteredEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)' }}>
                            <Icons.Clock size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <p>No records found</p>
                        </div>
                    ) : (
                        filteredEntries.map((entry) => (
                            <motion.div
                                key={entry.id}
                                className="history-item"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="history-item__icon">
                                    {getIcon(entry.storeName)}
                                </div>
                                <div className="history-item__content">
                                    <div className="history-item__title">
                                        {entry.amountMl ? `${entry.amountMl} ml` :
                                            entry.bristolScale ? `Bristol ${entry.bristolScale}` :
                                                entry.state ? entry.state : 'Record'}
                                    </div>
                                    <div className="history-item__subtitle">
                                        {entry.storeName.charAt(0).toUpperCase() + entry.storeName.slice(1)}
                                        {entry.type ? ` (${entry.type})` : ''}
                                        {entry.note ? ` · ${entry.note}` : ''}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div className="history-item__time">{formatTime(entry.timestamp)}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{formatDate(entry.timestamp)}</div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div style={{ height: 80 }} />
        </div>
    );
}
