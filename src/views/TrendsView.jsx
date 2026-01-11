import { useMemo, useState } from 'react';
import { formatMl } from '../store';
import { Icons } from '../components/Icons';
import { API_BASE } from '../config';

export default function TrendsView({ data, showToast }) {
    const [rangePreset, setRangePreset] = useState('7d');
    const [aiInsight, setAiInsight] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiExpanded, setAiExpanded] = useState(false);
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
        const hourPresets = {
            '8h': 8,
            '12h': 12,
            '1d': 24,
            '2d': 48,
        };
        const hours = hourPresets[rangePreset];
        if (hours) {
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
            const goal = data.getGoalForDate(key);
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
                goalIntakeMl: goal?.intakeMl ?? null,
                goalOutputMl: goal?.outputMl ?? null,
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
    }, [rangeDays, daySummaries, data]);

    const goalSummary = useMemo(() => {
        const days = rangeSummary.days;
        const totalDays = days.length;
        const intakeDays = days.filter((day) => day.goalIntakeMl);
        const outputDays = days.filter((day) => day.goalOutputMl);
        const intakeMet = intakeDays.length
            ? intakeDays.filter((day) => day.intakeMl >= day.goalIntakeMl).length
            : null;
        const outputMet = outputDays.length
            ? outputDays.filter((day) => day.totalOutput >= day.goalOutputMl).length
            : null;
        if (intakeMet === null && outputMet === null) return null;
        return { totalDays, intakeMet, outputMet };
    }, [rangeSummary.days]);

    const compactCardStyle = { marginBottom: 12 };

    const rangeGoalTotals = useMemo(() => {
        const totals = rangeSummary.days.reduce(
            (acc, day) => {
                if (day.goalIntakeMl) {
                    acc.intakeGoalTotal += day.goalIntakeMl;
                    acc.intakeGoalDays += 1;
                }
                if (day.goalOutputMl) {
                    acc.outputGoalTotal += day.goalOutputMl;
                    acc.outputGoalDays += 1;
                }
                return acc;
            },
            { intakeGoalTotal: 0, outputGoalTotal: 0, intakeGoalDays: 0, outputGoalDays: 0 }
        );
        return totals;
    }, [rangeSummary.days]);

    const renderTargetRow = (label, current, goalTotal, color, meta) => {
        const hasGoal = Number.isFinite(goalTotal) && goalTotal > 0;
        const progress = hasGoal ? Math.min(1, current / goalTotal) : (current > 0 ? 1 : 0);
        const remaining = hasGoal ? goalTotal - current : null;
        const status = hasGoal
            ? (remaining > 0
                ? `${formatMl(remaining)} to go`
                : remaining === 0
                    ? 'Target met'
                    : `Over by ${formatMl(Math.abs(remaining))}`)
            : 'No target set';
        return (
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {hasGoal ? `${formatMl(current)} / ${formatMl(goalTotal)}` : `Current ${formatMl(current)}`}
                    </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                    {meta?.segments ? (
                        <div style={{ display: 'flex', height: '100%', width: `${progress * 100}%`, opacity: hasGoal ? 1 : 0.5 }}>
                            {meta.segments.map((segment) => (
                                <div
                                    key={segment.key}
                                    style={{ width: `${segment.percent * 100}%`, background: segment.color }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ height: '100%', width: `${progress * 100}%`, background: color, borderRadius: 999, opacity: hasGoal ? 1 : 0.5 }} />
                    )}
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>{status}</div>
            </div>
        );
    };

    const buildInsightsPayload = () => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return {
            scope: 'range',
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
                goals: {
                    intakeMl: day.goalIntakeMl,
                    outputMl: day.goalOutputMl,
                }
            })),
            goalHistory: (data.goals || []).map((goal) => ({
                intakeMl: goal.intakeMl ?? null,
                outputMl: goal.outputMl ?? null,
                timestamp: goal.timestamp,
            })),
        };
    };

    const handleRangeInsights = async () => {
        if (aiLoading) return;
        setAiLoading(true);
        setAiError('');
        try {
            const payload = buildInsightsPayload();
            const response = await fetch(`${API_BASE}/api/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                let message = `Request failed (${response.status})`;
                try {
                    const errorBody = await response.json();
                    message = errorBody.error || message;
                } catch { }
                throw new Error(message);
            }
            const result = await response.json();
            if (!result.insight || typeof result.insight !== 'object') {
                throw new Error('No insights returned');
            }
            setAiInsight(result.insight);
            setAiExpanded(true);
        } catch (error) {
            setAiError(error.message);
            showToast('AI insight failed');
        } finally {
            setAiLoading(false);
        }
    };

    const insightSections = aiInsight
        ? [
            { key: 'highlights', title: 'Highlights', items: aiInsight.highlights || [] },
            { key: 'patterns', title: 'Patterns', items: aiInsight.patterns || [] },
            { key: 'nextActions', title: 'Next Actions', items: aiInsight.nextActions || [] },
        ]
        : [];

    const severityStyles = {
        info: { dot: 'rgba(56,189,248,0.9)', text: 'var(--text-main)' },
        warning: { dot: 'rgba(251,191,36,0.95)', text: '#fde68a' },
        urgent: { dot: 'rgba(248,113,113,0.95)', text: '#fecaca' },
    };

    const renderInsightItem = (item) => {
        const severity = severityStyles[item.severity] ? item.severity : 'info';
        const style = severityStyles[severity];
        return (
            <div
                key={`${item.title}-${item.detail}`}
                style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                }}
            >
                <div style={{ width: 10, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: style.dot, boxShadow: `0 0 10px ${style.dot}` }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: style.text }}>{item.title}</div>
                    <div className="text-dim" style={{ fontSize: 12, marginTop: 3, whiteSpace: 'pre-wrap' }}>{item.detail}</div>
                </div>
            </div>
        );
    };

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
        <div className="page compact-page">
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
                        {['8h', '12h', '1d', '2d', '7d', '14d', '30d', 'custom'].map((preset) => (
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
                        {renderTargetRow(
                            'Intake',
                            rangeSummary.totals.intakeMl,
                            rangeGoalTotals.intakeGoalTotal,
                            'var(--color-intake)'
                        )}
                        {renderTargetRow(
                            'Output',
                            rangeSummary.totals.totalOutput,
                            rangeGoalTotals.outputGoalTotal,
                            'var(--color-bag)',
                            {
                                segments: (() => {
                                    const total = rangeSummary.totals.totalOutput || 0;
                                    if (total <= 0) {
                                        return [{ key: 'bag', percent: 1, color: 'var(--color-bag)' }];
                                    }
                                    const bagPercent = (rangeSummary.totals.bagMl || 0) / total;
                                    const voidPercent = (rangeSummary.totals.voidMl || 0) / total;
                                    const safeBag = Math.max(0, Math.min(1, bagPercent));
                                    const safeVoid = Math.max(0, Math.min(1, voidPercent));
                                    return [
                                        { key: 'bag', percent: safeBag, color: 'var(--color-bag)' },
                                        { key: 'void', percent: safeVoid, color: 'var(--color-void)' },
                                    ];
                                })()
                            }
                        )}
                    </div>
                    {goalSummary && (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                            {[
                                goalSummary.intakeMet !== null
                                    ? `Intake goal met ${goalSummary.intakeMet}/${goalSummary.totalDays} days`
                                    : null,
                                goalSummary.outputMet !== null
                                    ? `Output goal met ${goalSummary.outputMet}/${goalSummary.totalDays} days`
                                    : null,
                            ].filter(Boolean).join(' · ')}
                        </div>
                    )}

                    <div style={{ marginTop: 4, marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
                                    AI Insights
                                </div>
                                <div className="text-dim" style={{ fontSize: 12, marginTop: 2 }}>
                                    {aiInsight?.headline || 'Analyze patterns for the selected range'}
                                </div>
                            </div>
                            <button
                                className="liquid-button--chip"
                                onClick={() => {
                                    if (aiInsight) {
                                        setAiExpanded((prev) => !prev);
                                        return;
                                    }
                                    handleRangeInsights();
                                }}
                                disabled={aiLoading}
                                style={{
                                    width: 36,
                                    height: 32,
                                    padding: 0,
                                    color: aiLoading ? 'var(--text-dim)' : 'var(--primary)',
                                    borderColor: 'var(--primary)',
                                    flexShrink: 0,
                                }}
                                aria-label="Toggle AI insights"
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        transform: aiExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                        transition: 'transform 0.2s ease',
                                    }}
                                >
                                    <Icons.ChevronRight />
                                </span>
                            </button>
                        </div>

                        {aiError && (
                            <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>
                                {aiError}
                            </div>
                        )}

                        {aiExpanded && (
                            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                                {insightSections
                                    .filter((section) => Array.isArray(section.items) && section.items.length > 0)
                                    .map((section) => (
                                        <div key={section.key}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', marginBottom: 8 }}>
                                                {section.title}
                                            </div>
                                            <div style={{ display: 'grid', gap: 8 }}>
                                                {section.items.map((item) => renderInsightItem(item))}
                                            </div>
                                        </div>
                                    ))}

                                {Array.isArray(aiInsight?.questions) && aiInsight.questions.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', marginBottom: 8 }}>
                                            Quick Questions
                                        </div>
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {aiInsight.questions.slice(0, 2).map((question) => (
                                                <div
                                                    key={question}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: 14,
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid var(--glass-border)',
                                                        fontSize: 12,
                                                        color: 'var(--text-dim)',
                                                    }}
                                                >
                                                    {question}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                                                stroke="var(--color-bag)"
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
                                                        fill={isLow ? '#f87171' : 'var(--color-bag)'}
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
