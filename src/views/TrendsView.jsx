import { useMemo, useState } from 'react';
import { formatMl } from '../store';
import { Icons } from '../components/Icons';

export default function TrendsView({ data, showToast }) {
    const [rangePreset, setRangePreset] = useState('7d');
    const [customStart, setCustomStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return toDateKey(d);
    });
    const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()));

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
        const now = new Date();
        if (rangePreset === '12h' || rangePreset === '1d' || rangePreset === '2d') {
            const hours = rangePreset === '12h' ? 12 : rangePreset === '2d' ? 48 : 24;
            const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
            return { start, end: now, usesHours: true };
        }

        const end = parseLocalDate(rangePreset === 'custom' ? customEnd : toDateKey(now));
        let start;
        if (rangePreset === 'custom') {
            start = parseLocalDate(customStart);
        } else {
            const days = rangePreset === '14d' ? 14 : rangePreset === '30d' ? 30 : 7;
            start = new Date(end);
            start.setDate(end.getDate() - (days - 1));
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end, usesHours: false };
    }, [rangePreset, customStart, customEnd]);

    const rangeDays = useMemo(() => {
        const days = [];
        const cursor = new Date(range.start);
        cursor.setHours(0, 0, 0, 0);
        const end = new Date(range.end);
        end.setHours(0, 0, 0, 0);
        while (cursor <= end) {
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
        const rangeStart = range.start.getTime();
        const rangeEnd = range.end.getTime();
        const inRange = (ts) => ts >= rangeStart && ts <= rangeEnd;

        data.intakes.forEach((entry) => {
            if (!inRange(entry.timestamp)) return;
            const key = toDateKey(entry.timestamp);
            ensure(key).intakeMl += entry.amountMl || 0;
        });
        data.outputs.forEach((entry) => {
            if (!inRange(entry.timestamp)) return;
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
            if (!inRange(entry.timestamp)) return;
            const key = toDateKey(entry.timestamp);
            ensure(key).flushCount += 1;
        });
        data.bowels.forEach((entry) => {
            if (!inRange(entry.timestamp)) return;
            const key = toDateKey(entry.timestamp);
            ensure(key).bowelCount += 1;
        });
        data.dressings.forEach((entry) => {
            if (!inRange(entry.timestamp)) return;
            const key = toDateKey(entry.timestamp);
            const bucket = ensure(key);
            if ((entry.timestamp || 0) >= bucket.dressingTimestamp) {
                bucket.dressingState = entry.state;
                bucket.dressingTimestamp = entry.timestamp || 0;
            }
        });

        return map;
    }, [data.intakes, data.outputs, data.flushes, data.bowels, data.dressings, range]);

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

    const compactCardStyle = { marginBottom: 12 };

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

    return (
        <div className="page">
            <header className="screen-header">
                <div>
                    <h1 className="screen-header__title">Trends</h1>
                    <p className="screen-header__subtitle">Range Insights</p>
                </div>
            </header>

            <div className="page__content">
                <div className="glass-card" style={compactCardStyle}>
                    <h2 className="section__title" style={{ fontSize: '18px', marginBottom: '16px' }}>
                        Trends
                    </h2>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {['12h', '1d', '2d', '7d', '14d', '30d', 'custom'].map((preset) => (
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

                    <div style={{ display: 'grid', gap: '10px', marginBottom: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                        <div className="stat-card" style={{ padding: '12px' }}>
                            <div className="stat-card__label">Range Intake</div>
                            <div className="stat-card__value" style={{ color: 'var(--color-intake)' }}>
                                {formatMl(rangeSummary.totals.intakeMl)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '12px' }}>
                            <div className="stat-card__label">Range Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--color-bag)' }}>
                                {formatMl(rangeSummary.totals.totalOutput)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '12px' }}>
                            <div className="stat-card__label">Net</div>
                            <div className="stat-card__value" style={{ fontSize: 20 }}>
                                {formatMl(rangeSummary.totals.totalOutput - rangeSummary.totals.intakeMl)}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <div className="text-dim" style={{ fontSize: '12px', marginBottom: '6px' }}>Intake vs Output</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: 110, paddingBottom: 4 }}>
                            {(() => {
                                const maxValue = Math.max(
                                    1,
                                    ...rangeSummary.days.map((day) => Math.max(day.intakeMl, day.totalOutput))
                                );
                                return rangeSummary.days.map((day) => {
                                    const chartHeight = 92;
                                    const intakeHeight = Math.max(day.intakeMl > 0 ? 6 : 0, (day.intakeMl / maxValue) * chartHeight);
                                    const outputHeight = Math.max(day.totalOutput > 0 ? 6 : 0, (day.totalOutput / maxValue) * chartHeight);
                                    const minSegment = 4;
                                    const bagRatio = day.totalOutput ? day.bagMl / day.totalOutput : 0;
                                    const voidRatio = day.totalOutput ? day.voidMl / day.totalOutput : 0;
                                    let bagHeight = day.bagMl > 0 ? Math.max(minSegment, outputHeight * bagRatio) : 0;
                                    let voidHeight = day.voidMl > 0 ? Math.max(minSegment, outputHeight * voidRatio) : 0;
                                    const hasBag = bagHeight > 0;
                                    const hasVoid = voidHeight > 0;
                                    const totalStack = bagHeight + voidHeight;
                                    if (totalStack > outputHeight && totalStack > 0) {
                                        const scale = outputHeight / totalStack;
                                        bagHeight *= scale;
                                        voidHeight *= scale;
                                    }
                                    return (
                                        <div key={day.dateKey} style={{ flex: 1, minWidth: 16, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 92 }}>
                                                <div style={{
                                                    flex: 1,
                                                    background: 'var(--color-intake)',
                                                    borderRadius: 6,
                                                    height: `${intakeHeight}px`,
                                                    minHeight: day.intakeMl > 0 ? 4 : 0,
                                                    opacity: 0.8,
                                                }} />
                                                <div style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'flex-end',
                                                    height: `${outputHeight}px`,
                                                    minHeight: day.totalOutput > 0 ? 4 : 0,
                                                }}>
                                                    <div style={{
                                                        background: 'var(--color-bag)',
                                                        height: `${bagHeight}px`,
                                                        minHeight: day.bagMl > 0 ? 4 : 0,
                                                        borderTopLeftRadius: hasVoid ? 6 : 6,
                                                        borderTopRightRadius: hasVoid ? 6 : 6,
                                                        borderBottomLeftRadius: hasVoid ? 0 : 6,
                                                        borderBottomRightRadius: hasVoid ? 0 : 6,
                                                    }} />
                                                    <div style={{
                                                        background: 'var(--color-void)',
                                                        height: `${voidHeight}px`,
                                                        minHeight: day.voidMl > 0 ? 4 : 0,
                                                        borderBottomLeftRadius: hasBag ? 6 : 6,
                                                        borderBottomRightRadius: hasBag ? 6 : 6,
                                                        borderTopLeftRadius: hasBag ? 0 : 6,
                                                        borderTopRightRadius: hasBag ? 0 : 6,
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                                                {day.date.toLocaleDateString([], { weekday: 'short' })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-intake)' }} />
                                Intake
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-bag)' }} />
                                Bag Output
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-void)' }} />
                                Void Output
                            </span>
                        </div>
                    </div>

                    <div>
                        <div className="text-dim" style={{ fontSize: '12px', marginBottom: '6px' }}>Output Trend</div>
                        {(() => {
                            const chartHeight = 92;
                            const chartWidth = Math.max(1, (rangeSummary.days.length - 1) * 22);
                            const values = rangeSummary.days.map((day) => day.totalOutput);
                            const maxValue = Math.max(1, ...values);
                            const paddingTop = 10;
                            const paddingBottom = 16;
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
                                    <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
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
                                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                                            Baseline: {formatMl(Math.round(median))} · Low output flagged under {formatMl(Math.round(lowThreshold))}
                                        </div>
                                    )}
                                    {median > 0 && lowDays.length > 0 && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: '#fca5a5' }}>
                                            Low output days: {lowDays.map((day) => day.date.toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ')}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="glass-card" style={compactCardStyle}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Care Timeline</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {rangeSummary.days.map((day) => (
                            <div
                                key={day.dateKey}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
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
            </div>
        </div>
    );
}
