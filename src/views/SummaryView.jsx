import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatMl, formatDateFull } from '../store';
import ImportSheet from '../components/ImportSheet';
import DiagnosticsPanel from '../components/DiagnosticsPanel';
import { Icons } from '../components/Icons';
import { exportBackup, exportSchemaDefinition } from '../import';
import { isNative } from '../config';

export default function SummaryView({ data, showToast }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showImport, setShowImport] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingSchema, setExportingSchema] = useState(false);
    const { dailyTotals, getTotalsForDay, recordDailyTotal, refresh } = data;
    const compactCardStyle = { marginBottom: 12 };

    const dayTotals = getTotalsForDay(selectedDate);
    const activeGoals = data.getGoalForDate(selectedDate);
    const hasGoals = Boolean(activeGoals?.intakeMl || activeGoals?.outputMl);
    const totalOutput = dayTotals.bagMl + dayTotals.urinalMl;

    const renderGoalRow = (label, current, goal, color) => {
        if (!goal) return null;
        const progress = Math.min(1, current / goal);
        const remaining = goal - current;
        const status = remaining > 0
            ? `${formatMl(remaining)} to go`
            : remaining === 0
                ? 'Goal met'
                : `Over by ${formatMl(Math.abs(remaining))}`;
        return (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span className="text-dim">{formatMl(current)} / {formatMl(goal)}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress * 100}%`, background: color, borderRadius: 999 }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>{status}</div>
            </div>
        );
    };

    const handleRecordEndOfDay = async () => {
        await recordDailyTotal(selectedDate, dayTotals.bagMl, dayTotals.urinalMl, dayTotals.intakeMl);
        showToast(`Recorded totals for ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`);
    };

    const handleImportSuccess = () => {
        setShowImport(false);
        refresh();
        showToast('Data imported successfully');
    };

    const copyToClipboard = async (text) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    };

    const downloadText = (text, filename, mime) => {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const payload = await exportBackup();
            const json = JSON.stringify(payload, null, 2);
            const stamp = new Date().toISOString().slice(0, 10);
            const filename = `nephtrack-backup-${stamp}.json`;
            try {
                if (isNative) throw new Error('Native download not supported');
                downloadText(json, filename, 'application/json');
                showToast('Backup exported');
            } catch {
                const copied = await copyToClipboard(json);
                showToast(copied ? 'Backup copied to clipboard' : 'Backup export failed');
            }
        } catch (e) {
            showToast(`Export failed: ${e.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleExportSchema = async () => {
        setExportingSchema(true);
        try {
            const backup = await exportBackup();
            const payload = exportSchemaDefinition(backup);
            const json = JSON.stringify(payload, null, 2);
            const stamp = new Date().toISOString().slice(0, 10);
            const filename = `nephtrack-schema-${stamp}.json`;
            try {
                if (isNative) throw new Error('Native download not supported');
                downloadText(json, filename, 'application/json');
                showToast('Schema exported');
            } catch {
                const copied = await copyToClipboard(json);
                showToast(copied ? 'Schema copied to clipboard' : 'Schema export failed');
            }
        } catch (e) {
            showToast(`Schema export failed: ${e.message}`);
        } finally {
            setExportingSchema(false);
        }
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="page compact-page">
            <header className="screen-header">
                <div>
                    <h1 className="screen-header__title">Summary</h1>
                    <p className="screen-header__subtitle">Daily Totals</p>
                </div>
            </header>

            <div className="page__content">
                {/* Day Picker */}
                <div className="glass-card" style={compactCardStyle}>
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
                <div className="glass-card" style={compactCardStyle}>
                    <h2 className="section__title" style={{ fontSize: '18px', marginBottom: '16px' }}>
                        {new Date(selectedDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h2>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card__label">Neph Bag</div>
                            <div className="stat-card__value" style={{ color: 'var(--color-bag)' }}>{formatMl(dayTotals.bagMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Voided</div>
                            <div className="stat-card__value" style={{ color: 'var(--color-void)' }}>{formatMl(dayTotals.urinalMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Total Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--secondary)' }}>
                                {formatMl(totalOutput)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Total Intake</div>
                            <div className="stat-card__value" style={{ color: 'var(--color-intake)' }}>
                                {formatMl(dayTotals.intakeMl)}
                            </div>
                        </div>
                    </div>

                    {hasGoals && (
                        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                            {renderGoalRow('Intake goal', dayTotals.intakeMl, activeGoals?.intakeMl, 'var(--color-intake)')}
                            {renderGoalRow('Output goal', totalOutput, activeGoals?.outputMl, 'var(--color-bag)')}
                        </div>
                    )}

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
                <div className="glass-card" style={compactCardStyle}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>End of Day</h2>
                    <button className="liquid-button" onClick={handleRecordEndOfDay}>
                        <Icons.Check /> <span style={{ marginLeft: '8px' }}>Record Daily Totals</span>
                    </button>
                    <p className="text-dim" style={{ fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
                        Calculates and saves the final tallies for this date.
                    </p>
                </div>

                {/* Import / Export */}
                <div className="glass-card" style={compactCardStyle}>
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
                        <button
                            className="liquid-button liquid-button--secondary"
                            onClick={handleExportSchema}
                            disabled={exportingSchema}
                        >
                            {exportingSchema ? 'Exporting...' : 'Export Schema JSON'}
                        </button>
                    </div>
                </div>

                {/* Daily Totals History */}
                <div className="glass-card" style={compactCardStyle}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>History</h2>
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

            {/* Settings */}
            <div className="glass-card" style={{ marginTop: 12 }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>Settings</h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <button
                        className="liquid-button liquid-button--secondary"
                        onClick={() => setShowDiagnostics(true)}
                    >
                        🔧 Diagnostics
                    </button>
                    <button
                        className="liquid-button"
                        onClick={() => { localStorage.clear(); window.location.reload(); }}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fecaca' }}
                    >
                        <Icons.LogOut /> <span style={{ marginLeft: 8 }}>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
