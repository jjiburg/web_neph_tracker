import { useState, useMemo } from 'react';
import { formatMl, formatTime, formatDate } from '../store';

const FILTERS = ['All', 'Intake', 'Output', 'Flush', 'Bowel', 'Dressing'];

export default function HistoryView({ data }) {
    const [filter, setFilter] = useState('All');
    const { intakes, outputs, flushes, bowels, dressings, deleteIntakeEntry, deleteOutputEntry, deleteFlushEntry, deleteBowelEntry, deleteDressingEntry } = data;

    // Combine and sort all entries
    const allItems = useMemo(() => {
        const items = [];

        intakes.forEach((e) => items.push({
            id: e.id,
            type: 'intake',
            title: 'Intake',
            detail: `${formatMl(e.amountMl)}${e.note ? ` • ${e.note}` : ''}`,
            timestamp: e.timestamp,
            icon: '💧',
            color: 'var(--accent)',
            onDelete: () => deleteIntakeEntry(e.id),
        }));

        outputs.forEach((e) => items.push({
            id: e.id,
            type: 'output',
            title: e.type === 'bag' ? 'Bag Output' : 'Voided Output',
            detail: `${formatMl(e.amountMl)}${e.colorNote ? ` • ${e.colorNote}` : ''}`,
            timestamp: e.timestamp,
            icon: e.type === 'bag' ? '🎒' : '🚰',
            color: 'var(--accent-secondary)',
            onDelete: () => deleteOutputEntry(e.id),
        }));

        flushes.forEach((e) => items.push({
            id: e.id,
            type: 'flush',
            title: 'Flush',
            detail: e.amountMl > 0 ? `${e.amountMl} ml${e.note ? ` • ${e.note}` : ''}` : 'Logged',
            timestamp: e.timestamp,
            icon: '💉',
            color: '#3b82f6',
            onDelete: () => deleteFlushEntry(e.id),
        }));

        bowels.forEach((e) => items.push({
            id: e.id,
            type: 'bowel',
            title: 'Bowel Movement',
            detail: e.bristolScale > 0 ? `Bristol ${e.bristolScale}${e.note ? ` • ${e.note}` : ''}` : 'Logged',
            timestamp: e.timestamp,
            icon: '🚽',
            color: '#f97316',
            onDelete: () => deleteBowelEntry(e.id),
        }));

        dressings.forEach((e) => items.push({
            id: e.id,
            type: 'dressing',
            title: 'Dressing',
            detail: `${e.state}${e.note ? ` • ${e.note}` : ''}`,
            timestamp: e.timestamp,
            icon: '🩹',
            color: '#a855f7',
            onDelete: () => deleteDressingEntry(e.id),
        }));

        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [intakes, outputs, flushes, bowels, dressings]);

    // Filter items
    const filteredItems = useMemo(() => {
        if (filter === 'All') return allItems;
        return allItems.filter((item) => item.type === filter.toLowerCase());
    }, [allItems, filter]);

    return (
        <div className="page">
            {/* Header */}
            <header className="screen-header">
                <h1 className="screen-header__title">History</h1>
                <p className="screen-header__subtitle">{filter}</p>
            </header>

            <div className="page__content">
                {/* Filter Bar */}
                <div className="filter-bar">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            className={`filter-chip ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* History List */}
                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
                        <p>No entries found</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {filteredItems.map((item, index) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                className="history-item"
                                style={{ borderBottom: index < filteredItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                            >
                                <div
                                    className="history-item__icon"
                                    style={{ backgroundColor: `${item.color}22`, color: item.color }}
                                >
                                    {item.icon}
                                </div>
                                <div className="history-item__content">
                                    <div className="history-item__title">{item.title}</div>
                                    <div className="history-item__detail">{item.detail}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="history-item__time">{formatTime(item.timestamp)}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(item.timestamp)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
