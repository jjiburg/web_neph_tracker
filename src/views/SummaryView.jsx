import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatMl, formatDateFull } from '../store';
import ImportSheet from '../components/ImportSheet';
import DiagnosticsPanel from '../components/DiagnosticsPanel';
import { Icons } from '../components/Icons';
import { exportBackup, exportSchemaDefinition } from '../import';

export default function SummaryView({ data, showToast }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [rangePreset, setRangePreset] = useState('7d');
    const [customStart, setCustomStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return toDateKey(d);
    });
    const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()));
    const [showImport, setShowImport] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingSchema, setExportingSchema] = useState(false);
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

    const handleExportSchema = async () => {
        setExportingSchema(true);
        try {
            const backup = await exportBackup();
            const payload = exportSchemaDefinition(backup);
            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const stamp = new Date().toISOString().slice(0, 10);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nephtrack-schema-${stamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Schema exported');
        } catch (e) {
            showToast(`Schema export failed: ${e.message}`);
        } finally {
            setExportingSchema(false);
        }
    };

    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    function toDateKey(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const range = useMemo(() => {
        const end = parseLocalDate(rangePreset === 'custom' ? customEnd : toDateKey(new Date()));
        let start;
        if (rangePreset === 'custom') {
            start = parseLocalDate(customStart);
        } else {
            const days = rangePreset === '14d' ? 14 : rangePreset === '30d' ? 30 : 7;
            start = new Date(end);
            start.setDate(end.getDate() - (days - 1));
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return { start, end };
    }, [rangePreset, customStart, customEnd]);

    const rangeDays = useMemo(() => {
        const days = [];
        const cursor = new Date(range.start);
        while (cursor <= range.end) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return days;
    }, [range]);

    const daySummaries = useMemo(() => {
        const map = new Map();
        const ensure = (dateKey) => {
            if (!map.has(dateKey)) {
                map.set(dateKey, {
                    dateKey,
                    intakeMl: 0,
                    bagMl: 0,
                    voidMl: 0,
                    flushCount: 0,
                    bowelCount: 0,
                    dressingState: null,
                    dressingTimestamp: 0,
                });
            }
            return map.get(dateKey);
        };

        data.intakes.forEach((entry) => {
            const key = toDateKey(entry.timestamp);
            ensure(key).intakeMl += entry.amountMl || 0;
        });
        data.outputs.forEach((entry) => {
            const key = toDateKey(entry.timestamp);
            const bucket = ensure(key);
            const type = entry.type === 'void' ? 'urinal' : entry.type;
            if (type === 'bag') {
                bucket.bagMl += entry.amountMl || 0;
            } else {
                bucket.voidMl += entry.amountMl || 0;
            }
        });
        data.flushes.forEach((entry) => {
            const key = toDateKey(entry.timestamp);
            ensure(key).flushCount += 1;
        });
        data.bowels.forEach((entry) => {
            const key = toDateKey(entry.timestamp);
            ensure(key).bowelCount += 1;
        });
        data.dressings.forEach((entry) => {
            const key = toDateKey(entry.timestamp);
            const bucket = ensure(key);
            if ((entry.timestamp || 0) >= bucket.dressingTimestamp) {
                bucket.dressingState = entry.state;
                bucket.dressingTimestamp = entry.timestamp || 0;
            }
        });

        return map;
    }, [data.intakes, data.outputs, data.flushes, data.bowels, data.dressings]);

    const rangeSummary = useMemo(() => {
        const days = rangeDays.map((day) => {
            const key = toDateKey(day);
            const summary = daySummaries.get(key) || {
                dateKey: key,
                intakeMl: 0,
                bagMl: 0,
                voidMl: 0,
                flushCount: 0,
                bowelCount: 0,
                dressingState: null,
            };
            return {
                ...summary,
                totalOutput: summary.bagMl + summary.voidMl,
                netMl: summary.bagMl + summary.voidMl - summary.intakeMl,
                date: day,
            };
        });
        const totals = days.reduce(
            (acc, day) => {
                acc.intakeMl += day.intakeMl;
                acc.bagMl += day.bagMl;
                acc.voidMl += day.voidMl;
                acc.totalOutput += day.totalOutput;
                acc.flushCount += day.flushCount;
                acc.bowelCount += day.bowelCount;
                return acc;
            },
            { intakeMl: 0, bagMl: 0, voidMl: 0, totalOutput: 0, flushCount: 0, bowelCount: 0 }
        );
        const median = (() => {
            const values = days.map((d) => d.totalOutput).filter((v) => v > 0).sort((a, b) => a - b);
            if (values.length === 0) return 0;
            const mid = Math.floor(values.length / 2);
            return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
        })();
        return { days, totals, median };
    }, [rangeDays, daySummaries]);

    const handleExportReport = async (format) => {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const payload = {
                range: {
                    start: toDateKey(range.start),
                    end: toDateKey(range.end),
                    timezone,
                },
                totals: rangeSummary.totals,
                days: rangeSummary.days.map((day) => ({
                    date: day.dateKey,
                    intakeMl: day.intakeMl,
                    bagMl: day.bagMl,
                    voidMl: day.voidMl,
                    totalOutputMl: day.totalOutput,
                    netMl: day.netMl,
                    flushCount: day.flushCount,
                    bowelCount: day.bowelCount,
                    dressingState: day.dressingState || null,
                })),
            };

            if (format === 'csv') {
                const header = [
                    'date',
                    'intakeMl',
                    'bagMl',
                    'voidMl',
                    'totalOutputMl',
                    'netMl',
                    'flushCount',
                    'bowelCount',
                    'dressingState'
                ];
                const rows = payload.days.map((day) => [
                    day.date,
                    day.intakeMl,
                    day.bagMl,
                    day.voidMl,
                    day.totalOutputMl,
                    day.netMl,
                    day.flushCount,
                    day.bowelCount,
                    day.dressingState || ''
                ]);
                const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `nephtrack-report-${payload.range.start}-to-${payload.range.end}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const json = JSON.stringify(payload, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `nephtrack-report-${payload.range.start}-to-${payload.range.end}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            showToast('Report exported');
        } catch (e) {
            showToast(`Report export failed: ${e.message}`);
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

                {/* Trends */}
                <div className="glass-card">
                    <h2 className="section__title" style={{ fontSize: '18px', marginBottom: '16px' }}>
                        Trends
                    </h2>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {['7d', '14d', '30d', 'custom'].map((preset) => (
                            <button
                                key={preset}
                                className={`filter-chip ${rangePreset === preset ? 'active' : ''}`}
                                onClick={() => setRangePreset(preset)}
                            >
                                {preset === 'custom' ? 'Custom' : preset.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {rangePreset === 'custom' && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    color: 'var(--text-main)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    flex: 1,
                                }}
                            />
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    color: 'var(--text-main)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    flex: 1,
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <div className="stat-card" style={{ flex: '1 1 140px' }}>
                            <div className="stat-card__label">Range Intake</div>
                            <div className="stat-card__value text-accent">{formatMl(rangeSummary.totals.intakeMl)}</div>
                        </div>
                        <div className="stat-card" style={{ flex: '1 1 140px' }}>
                            <div className="stat-card__label">Range Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--secondary)' }}>
                                {formatMl(rangeSummary.totals.totalOutput)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ flex: '1 1 140px' }}>
                            <div className="stat-card__label">Net</div>
                            <div className="stat-card__value">{formatMl(rangeSummary.totals.totalOutput - rangeSummary.totals.intakeMl)}</div>
                        </div>
                    </div>

                    {/* Balance Chart */}
                    <div style={{ marginBottom: '12px' }}>
                        <div className="text-dim" style={{ fontSize: '12px', marginBottom: '8px' }}>Intake vs Output</div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: 140, paddingBottom: 8 }}>
                            {(() => {
                                const maxValue = Math.max(
                                    1,
                                    ...rangeSummary.days.map((day) => Math.max(day.intakeMl, day.totalOutput))
                                );
                                return rangeSummary.days.map((day) => {
                                    const intakeHeight = (day.intakeMl / maxValue) * 100;
                                    const outputHeight = (day.totalOutput / maxValue) * 100;
                                    const bagRatio = day.totalOutput ? day.bagMl / day.totalOutput : 0;
                                    const voidRatio = day.totalOutput ? day.voidMl / day.totalOutput : 0;
                                    return (
                                        <div key={day.dateKey} style={{ flex: 1, minWidth: 18, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                                                <div style={{
                                                    flex: 1,
                                                    background: 'var(--text-accent)',
                                                    borderRadius: 8,
                                                    height: `${intakeHeight}%`,
                                                    minHeight: day.intakeMl > 0 ? 6 : 0,
                                                    opacity: 0.8,
                                                }} />
                                                <div style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'flex-end',
                                                    height: `${outputHeight}%`,
                                                    minHeight: day.totalOutput > 0 ? 6 : 0,
                                                }}>
                                                    <div style={{
                                                        background: 'var(--secondary)',
                                                        height: `${bagRatio * 100}%`,
                                                        minHeight: day.bagMl > 0 ? 4 : 0,
                                                        borderTopLeftRadius: 8,
                                                        borderTopRightRadius: 8,
                                                    }} />
                                                    <div style={{
                                                        background: 'var(--primary)',
                                                        height: `${voidRatio * 100}%`,
                                                        minHeight: day.voidMl > 0 ? 4 : 0,
                                                        borderBottomLeftRadius: 8,
                                                        borderBottomRightRadius: 8,
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
                                                {day.date.toLocaleDateString([], { weekday: 'short' })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--text-accent)' }} />
                                Intake
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--secondary)' }} />
                                Bag Output
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} />
                                Void Output
                            </span>
                        </div>
                    </div>

                    {/* Output Trend */}
                    <div>
                        <div className="text-dim" style={{ fontSize: '12px', marginBottom: '8px' }}>Output Trend</div>
                        {(() => {
                            const chartHeight = 120;
                            const chartWidth = Math.max(1, (rangeSummary.days.length - 1) * 22);
                            const values = rangeSummary.days.map((day) => day.totalOutput);
                            const maxValue = Math.max(1, ...values);
                            const paddingTop = 10;
                            const paddingBottom = 20;
                            const usableHeight = chartHeight - paddingTop - paddingBottom;
                            const median = rangeSummary.median;
                            const lowThreshold = median > 0 ? median * 0.7 : 0;

                            const points = rangeSummary.days.map((day, index) => {
                                const x = index * 22;
                                const y = paddingTop + usableHeight - (day.totalOutput / maxValue) * usableHeight;
                                return `${x},${y}`;
                            }).join(' ');

                            const bandTop = paddingTop + usableHeight - ((median * 1.2) / maxValue) * usableHeight;
                            const bandBottom = paddingTop + usableHeight - ((median * 0.8) / maxValue) * usableHeight;
                            const lowDays = rangeSummary.days.filter((day) => median > 0 && day.totalOutput > 0 && day.totalOutput < lowThreshold);

                            return (
                                <>
                                    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                                        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                                            {median > 0 && (
                                                <rect
                                                    x="0"
                                                    y={Math.min(bandTop, bandBottom)}
                                                    width={chartWidth}
                                                    height={Math.abs(bandBottom - bandTop)}
                                                    fill="rgba(255,255,255,0.08)"
                                                />
                                            )}
                                            <polyline
                                                fill="none"
                                                stroke="var(--primary)"
                                                strokeWidth="2"
                                                points={points}
                                            />
                                            {rangeSummary.days.map((day, index) => {
                                                const x = index * 22;
                                                const y = paddingTop + usableHeight - (day.totalOutput / maxValue) * usableHeight;
                                                const isLow = median > 0 && day.totalOutput > 0 && day.totalOutput < lowThreshold;
                                                return (
                                                    <circle
                                                        key={day.dateKey}
                                                        cx={x}
                                                        cy={y}
                                                        r="3"
                                                        fill={isLow ? '#f87171' : 'var(--primary)'}
                                                    />
                                                );
                                            })}
                                        </svg>
                                    </div>
                                    {median > 0 && (
                                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
                                            Baseline: {formatMl(Math.round(median))} · Low output flagged under {formatMl(Math.round(lowThreshold))}
                                        </div>
                                    )}
                                    {median > 0 && lowDays.length > 0 && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: '#fca5a5' }}>
                                            Low output days: {lowDays.map((day) => day.date.toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ')}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Care Timeline */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Care Timeline</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {rangeSummary.days.map((day) => (
                            <div
                                key={day.dateKey}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 0',
                                    borderBottom: '1px solid var(--glass-border)',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600 }}>{day.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                    <div className="text-dim" style={{ fontSize: 12 }}>Flushes: {day.flushCount} · Bowels: {day.bowelCount}</div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                    Dressing: {day.dressingState || '-'}
                                </div>
                            </div>
                        ))}
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
                        <button
                            className="liquid-button liquid-button--secondary"
                            onClick={handleExportSchema}
                            disabled={exportingSchema}
                        >
                            {exportingSchema ? 'Exporting...' : 'Export Schema JSON'}
                        </button>
                    </div>
                </div>

                {/* Doctor Report */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                            <Icons.Chart />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Doctor Report</h2>
                            <p className="text-dim" style={{ fontSize: '13px' }}>Export a range summary for clinicians</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <button
                            className="liquid-button"
                            onClick={() => handleExportReport('json')}
                        >
                            Export Report (JSON)
                        </button>
                        <button
                            className="liquid-button liquid-button--secondary"
                            onClick={() => handleExportReport('csv')}
                        >
                            Export Report (CSV)
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
