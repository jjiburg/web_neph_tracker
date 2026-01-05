import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatMl, formatDateFull } from '../store';
import ImportSheet from '../components/ImportSheet';
import DiagnosticsPanel from '../components/DiagnosticsPanel';
import { Icons } from '../components/Icons';
import { exportBackup } from '../import';

export default function SummaryView({ data, showToast }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showImport, setShowImport] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { dailyTotals, getTotalsForDay, recordDailyTotal, refresh } = data;

    const dayTotals = getTotalsForDay(selectedDate);

    const handleRecordEndOfDay = async () => {
        await recordDailyTotal(selectedDate, dayTotals.bagMl, dayTotals.urinalMl, dayTotals.intakeMl);
        showToast(`Recorded totals for ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`);
    };

    const handleImportSuccess = () => {
        setShowImport(false);
        refresh();
        showToast('Data imported successfully');
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const payload = await exportBackup();
            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const stamp = new Date().toISOString().slice(0, 10);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nephtrack-backup-${stamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Backup exported');
        } catch (e) {
            showToast(`Export failed: ${e.message}`);
        } finally {
            setExporting(false);
        }
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="page">
            <header className="screen-header">
                <h1 className="screen-header__title">Summary</h1>
                <p className="screen-header__subtitle">Daily Totals</p>
            </header>

            <div className="page__content">
                {/* Day Picker */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Calendar />
                            <span style={{ fontWeight: 600 }}>Date Selected</span>
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                color: 'var(--text-main)',
                                fontSize: '15px',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                    {!isToday && (
                        <button
                            className="liquid-button liquid-button--secondary"
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            style={{ height: '44px', minHeight: '44px' }}
                        >
                            Jump to Today
                        </button>
                    )}
                </div>

                {/* Summary Card */}
                <div className="glass-card">
                    <h2 className="section__title" style={{ fontSize: '18px', marginBottom: '16px' }}>
                        {new Date(selectedDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h2>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card__label">Neph Bag</div>
                            <div className="stat-card__value">{formatMl(dayTotals.bagMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Voided</div>
                            <div className="stat-card__value">{formatMl(dayTotals.urinalMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Total Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--secondary)' }}>
                                {formatMl(dayTotals.bagMl + dayTotals.urinalMl)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Total Intake</div>
                            <div className="stat-card__value text-accent">
                                {formatMl(dayTotals.intakeMl)}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div className="stat-card__label">Flushes</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.flushCount}</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div className="stat-card__label">Bowels</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.bowelCount}</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div className="stat-card__label">Dressing</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.latestDressing || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* End of Day Action */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>End of Day</h2>
                    <button className="liquid-button" onClick={handleRecordEndOfDay}>
                        <Icons.Check /> <span style={{ marginLeft: '8px' }}>Record Daily Totals</span>
                    </button>
                    <p className="text-dim" style={{ fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
                        Calculates and saves the final tallies for this date.
                    </p>
                </div>

                {/* Import / Export */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                            <Icons.Download />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Import / Export</h2>
                            <p className="text-dim" style={{ fontSize: '13px' }}>Backup or restore your history</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '10px' }}>
                        <button
                            className="liquid-button liquid-button--secondary"
                            onClick={() => setShowImport(true)}
                        >
                            Import JSON Backup
                        </button>
                        <button
                            className="liquid-button"
                            onClick={handleExport}
                            disabled={exporting}
                        >
                            {exporting ? 'Exporting...' : 'Export JSON Backup'}
                        </button>
                    </div>
                </div>

                {/* Daily Totals History */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>History</h2>
                    {dailyTotals.length === 0 ? (
                        <p className="text-dim" style={{ fontSize: '14px' }}>No recorded totals yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {dailyTotals.slice(0, 10).map((total, index) => (
                                <div
                                    key={total.id}
                                    style={{
                                        padding: '16px 0',
                                        borderBottom: index < dailyTotals.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{formatDateFull(total.date)}</div>
                                        <div className="text-dim" style={{ fontSize: '13px', marginTop: '2px' }}>
                                            In: {formatMl(total.intakeMl)} • Bag: {formatMl(total.bagMl)} • Normal: {formatMl(total.urinalMl)}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                                        {formatMl(total.totalMl)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Import Sheet Modal */}
            <AnimatePresence>
                {showImport && (
                    <ImportSheet
                        onClose={() => setShowImport(false)}
                        onSuccess={handleImportSuccess}
                    />
                )}
                {showDiagnostics && (
                    <DiagnosticsPanel onClose={() => setShowDiagnostics(false)} />
                )}
            </AnimatePresence>

            {/* Debug Button - tap 5 times on Summary title to show */}
            <button
                onClick={() => setShowDiagnostics(true)}
                style={{
                    position: 'fixed',
                    bottom: 100,
                    left: 20,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    zIndex: 50
                }}
            >
                🔧 Diagnostics
            </button>
        </div>
    );
}
