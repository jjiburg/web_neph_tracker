import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';

export default function HistoryView({ data }) {
    const [filter, setFilter] = useState('All');

    // Combine all data streams into one flat list
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
        if (filter === 'Intake') return entries.filter(e => e.storeName === 'intake');
        if (filter === 'Output') return entries.filter(e => e.storeName === 'output');
        if (filter === 'Flush') return entries.filter(e => e.storeName === 'flush');
        if (filter === 'Bowel') return entries.filter(e => e.storeName === 'bowel');
        if (filter === 'Dressing') return entries.filter(e => e.storeName === 'dressing');
        return entries;
    }, [entries, filter]);

    const getIcon = (type) => {
        switch (type) {
            case 'intake': return <Icons.Drop size={20} color="var(--primary)" />;
            case 'output': return <Icons.Beaker size={20} color="var(--secondary)" />;
            case 'flush': return <Icons.Syringe size={20} color="var(--success)" />;
            case 'bowel': return <span style={{ fontSize: '20px' }}>🧻</span>;
            case 'dressing': return <Icons.Bandage size={20} color="#a855f7" />;
            default: return <Icons.Activity size={20} />;
        }
    };

    const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div className="view-content">
            <header className="screen-header">
                <h1 className="screen-header__title">History</h1>
                <p className="screen-header__subtitle">
                    {filteredEntries.length} {filteredEntries.length === 1 ? 'Entry' : 'Entries'}
                </p>
            </header>

            <div className="filter-scroll">
                {['All', 'Intake', 'Output', 'Flush', 'Bowel', 'Dressing'].map((f) => (
                    <button
                        key={f}
                        className={`filter-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="history-list">
                <AnimatePresence initial={false}>
                    {filteredEntries.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}
                        >
                            <Icons.Clock size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p>No records found</p>
                        </motion.div>
                    ) : (
                        filteredEntries.map((entry) => (
                            <div className="history-item" key={entry.id}>
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
                                        {entry.note ? ` • ${entry.note}` : ''}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="history-item__time">{formatTime(entry.timestamp)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{formatDate(entry.timestamp)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom spacer for FAB/Tab bar */}
            <div style={{ height: '80px' }} />
        </div>
    );
}
