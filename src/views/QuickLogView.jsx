import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';
import { formatMl, isToday } from '../store';
import { API_BASE } from '../config';
import IntakeSheet from '../components/IntakeSheet';
import OutputSheet from '../components/OutputSheet';
import FlushSheet from '../components/FlushSheet';
import BowelSheet from '../components/BowelSheet';
import DressingSheet from '../components/DressingSheet';
import VoiceButton from '../components/VoiceButton';
import GoalSheet from '../components/GoalSheet';

export default function QuickLogView({ data, showToast }) {
    const [sheet, setSheet] = useState(null);
    const [showGoals, setShowGoals] = useState(false);
    const [aiInsight, setAiInsight] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiExpanded, setAiExpanded] = useState(false);
    const now = new Date();
    const todayKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const activeGoals = data.getGoalForDate(todayKey);
    const hasGoals = Boolean(activeGoals?.intakeMl || activeGoals?.outputMl);

    const renderGoalRow = (label, current, goal, color, meta) => {
        const hasGoal = Number.isFinite(goal) && goal > 0;
        const progress = hasGoal ? Math.min(1, current / goal) : (current > 0 ? 1 : 0);
        const remaining = hasGoal ? goal - current : null;
        const status = hasGoal
            ? (remaining > 0
                ? `${formatMl(remaining)} to go`
                : remaining === 0
                    ? 'Goal met'
                    : `Over by ${formatMl(Math.abs(remaining))}`)
            : 'No goal set';
        return (
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {hasGoal ? `${formatMl(current)} / ${formatMl(goal)}` : `Current ${formatMl(current)}`}
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

    const getTodayEntries = (items) => items.filter((entry) => isToday(entry.timestamp));

    const summarizeGaps = (timestamps) => {
        if (timestamps.length < 2) return { maxGapMinutes: null, lastGapMinutes: null };
        const sorted = [...timestamps].sort((a, b) => a - b);
        let maxGap = 0;
        for (let i = 1; i < sorted.length; i += 1) {
            maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
        }
        const lastGap = sorted[sorted.length - 1] - sorted[sorted.length - 2];
        return { maxGapMinutes: Math.round(maxGap / 60000), lastGapMinutes: Math.round(lastGap / 60000) };
    };

    const computeProjection = (actualMl, dayProgress) => {
        if (!dayProgress || dayProgress < 0.05) return null;
        if (actualMl <= 0) return 0;
        return Math.round(actualMl / dayProgress);
    };

    const buildInsightsPayload = () => {
        const now = new Date();
        const minutesElapsed = now.getHours() * 60 + now.getMinutes();
        const dayProgress = minutesElapsed / 1440;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const todayIntakes = getTodayEntries(data.intakes);
        const todayOutputs = getTodayEntries(data.outputs);
        const todayFlushes = getTodayEntries(data.flushes);
        const todayBowels = getTodayEntries(data.bowels);
        const todayDressings = getTodayEntries(data.dressings);

        const expectedIntakeByNow = activeGoals?.intakeMl ? Math.round(activeGoals.intakeMl * dayProgress) : null;
        const expectedOutputByNow = activeGoals?.outputMl ? Math.round(activeGoals.outputMl * dayProgress) : null;

        const dateKey = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-');

        const intakeTimestamps = todayIntakes.map((e) => e.timestamp).filter(Boolean);
        const outputTimestamps = todayOutputs.map((e) => e.timestamp).filter(Boolean);
        const flushTimestamps = todayFlushes.map((e) => e.timestamp).filter(Boolean);
        const symptomCounts = todayOutputs.reduce(
            (acc, entry) => {
                if (entry.clots) acc.clots += 1;
                if (entry.pain) acc.pain += 1;
                if (entry.leakage) acc.leakage += 1;
                if (entry.fever) acc.fever += 1;
                return acc;
            },
            { clots: 0, pain: 0, leakage: 0, fever: 0 }
        );

        const projectionIntakeMl = computeProjection(data.todayIntakeMl || 0, dayProgress);
        const projectionOutputMl = computeProjection(data.todayTotalOutputMl || 0, dayProgress);

        return {
            scope: 'daily',
            date: dateKey,
            now: now.toISOString(),
            localTime: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            timezone,
            dayProgress,
            goals: {
                intakeMl: activeGoals?.intakeMl || null,
                outputMl: activeGoals?.outputMl || null,
            },
            targets: {
                expectedIntakeByNow,
                expectedOutputByNow,
            },
            projections: {
                projectedIntakeMl: projectionIntakeMl,
                projectedOutputMl: projectionOutputMl,
            },
            totals: {
                intakeMl: data.todayIntakeMl || 0,
                bagMl: data.todayBagMl || 0,
                voidMl: data.todayUrinalMl || 0,
                outputMl: data.todayTotalOutputMl || 0,
                flushCount: todayFlushes.length,
                bowelCount: todayBowels.length,
                dressingState: todayDressings[0]?.state || null,
            },
            computed: {
                intakeEvents: todayIntakes.length,
                outputEvents: todayOutputs.length,
                lastIntakeMinutesAgo: intakeTimestamps.length
                    ? Math.round((Date.now() - Math.max(...intakeTimestamps)) / 60000)
                    : null,
                lastOutputMinutesAgo: outputTimestamps.length
                    ? Math.round((Date.now() - Math.max(...outputTimestamps)) / 60000)
                    : null,
                lastFlushMinutesAgo: flushTimestamps.length
                    ? Math.round((Date.now() - Math.max(...flushTimestamps)) / 60000)
                    : null,
                intakeGaps: summarizeGaps(intakeTimestamps),
                outputGaps: summarizeGaps(outputTimestamps),
                symptoms: symptomCounts,
            },
            entries: {
                intakes: todayIntakes.map((entry) => ({
                    amountMl: entry.amountMl,
                    note: entry.note || '',
                    timestamp: entry.timestamp,
                })),
                outputs: todayOutputs.map((entry) => ({
                    type: entry.type,
                    amountMl: entry.amountMl,
                    colorNote: entry.colorNote || '',
                    otherNote: entry.otherNote || '',
                    symptoms: {
                        clots: Boolean(entry.clots),
                        pain: Boolean(entry.pain),
                        leakage: Boolean(entry.leakage),
                        fever: Boolean(entry.fever),
                    },
                    timestamp: entry.timestamp,
                })),
                flushes: todayFlushes.map((entry) => ({
                    amountMl: entry.amountMl,
                    note: entry.note || '',
                    timestamp: entry.timestamp,
                })),
                bowels: todayBowels.map((entry) => ({
                    bristolScale: entry.bristolScale,
                    note: entry.note || '',
                    timestamp: entry.timestamp,
                })),
                dressings: todayDressings.map((entry) => ({
                    state: entry.state,
                    note: entry.note || '',
                    timestamp: entry.timestamp,
                })),
            },
        };
    };

    const handleAiInsights = async () => {
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

    const handleAddEntry = async (storeName, entryData) => {
        try {
            switch (storeName) {
                case 'intake':
                    await data.logIntake(entryData.amountMl, entryData.note || '', entryData.timestamp);
                    showToast(`Intake +${entryData.amountMl}ml`);
                    break;
                case 'output':
                    await data.logOutput(entryData.type, entryData.amountMl, entryData.colorNote || '', entryData.symptoms || {}, entryData.note || '', entryData.timestamp);
                    showToast(`${entryData.type === 'bag' ? 'Bag' : 'Void'} +${entryData.amountMl}ml`);
                    break;
                case 'flush':
                    await data.logFlush(entryData.amountMl, entryData.note || '', entryData.timestamp);
                    showToast('Flush logged');
                    break;
                case 'bowel':
                    await data.logBowel(entryData.bristolScale, entryData.note || '', entryData.timestamp);
                    showToast('Bowel movement logged');
                    break;
                case 'dressing':
                    await data.logDressing(entryData.state, entryData.note || '', entryData.timestamp);
                    showToast(`Dressing: ${entryData.state}`);
                    break;
                default:
                    console.error('Unknown store name:', storeName);
            }
        } catch (error) {
            console.error('Error logging entry:', error);
            showToast('Error saving entry');
        }
    };

    const handleSave = (storeName, entryData) => {
        handleAddEntry(storeName, entryData);
        setSheet(null);
    };

    const handleVoiceCommand = (command) => {
        const timestamp = Date.now();
        switch (command.action) {
            case 'intake':
                handleAddEntry('intake', { amountMl: command.amount, note: command.note, timestamp });
                break;
            case 'output':
                handleAddEntry('output', { type: command.type || 'bag', amountMl: command.amount, note: command.note, timestamp });
                break;
            case 'flush':
                handleAddEntry('flush', { amountMl: command.amount || 30, note: command.note, timestamp });
                break;
            case 'bowel':
                handleAddEntry('bowel', { bristolScale: command.bristolScale || 0, note: command.note, timestamp });
                break;
            case 'dressing':
                handleAddEntry('dressing', { state: command.state || 'Checked', note: command.note, timestamp });
                break;
            default:
                showToast('Unknown command');
        }
    };

    return (
        <div className="view-content">
            {/* Header */}
            <header className="screen-header">
                <div>
                    <h1 className="screen-header__title">Quick Entry</h1>
                    <p className="screen-header__subtitle">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    className={`liquid-button--chip screen-header__action ${hasGoals ? 'active' : ''}`}
                    onClick={() => setShowGoals(true)}
                >
                    <Icons.Target />
                    Goals
                </button>
            </header>

            {/* Daily Snapshot */}
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Target</span>
                    <Icons.Activity size={18} color="var(--primary)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 4 }}>
                    {renderGoalRow('Intake', data.todayIntakeMl || 0, activeGoals?.intakeMl, 'var(--color-intake)')}
                    {renderGoalRow(
                        'Output',
                        data.todayTotalOutputMl || 0,
                        activeGoals?.outputMl,
                        'var(--color-bag)',
                        {
                            segments: (() => {
                                const total = data.todayTotalOutputMl || 0;
                                if (total <= 0) {
                                    return [{ key: 'bag', percent: 1, color: 'var(--color-bag)' }];
                                }
                                const bagPercent = (data.todayBagMl || 0) / total;
                                const voidPercent = (data.todayUrinalMl || 0) / total;
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

                <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
                                AI Insights
                            </div>
                            <div className="text-dim" style={{ fontSize: 12, marginTop: 2 }}>
                                {aiInsight?.headline || (hasGoals ? 'Tap to analyze today + goal pace' : 'Tap to analyze today (set goals for pacing)')}
                            </div>
                        </div>
                        <button
                            className="liquid-button--chip"
                            onClick={() => {
                                if (aiInsight) {
                                    setAiExpanded((prev) => !prev);
                                    return;
                                }
                                handleAiInsights();
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
            </div>

            {/* Hydration */}
            <div className="section-header">
                <span className="section-icon"><Icons.Drop /></span>
                <h2>Hydration</h2>
            </div>
            <div className="glass-card">
                <div className="quick-stack">
                    {[63, 236, 710].map(amt => (
                        <button
                            key={amt}
                            className="liquid-button"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => handleAddEntry('intake', { amountMl: amt, timestamp: Date.now() })}
                        >
                            +{amt} ml
                        </button>
                    ))}
                    <button
                        className="liquid-button secondary-action"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => setSheet({ type: 'intake', quickAmounts: [63, 236, 710] })}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {/* Output */}
            <div className="section-header">
                <span className="section-icon" style={{ color: 'var(--color-bag)' }}><Icons.Beaker /></span>
                <h2>Output</h2>
            </div>
            <div className="glass-card">
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 500 }}>Nephrostomy Bag</div>
                <div className="quick-actions-grid">
                    {[100, 200, 300].map(amt => (
                        <button
                            key={`bag-${amt}`}
                            className="liquid-button"
                            style={{
                                background: 'var(--color-bag)',
                                boxShadow: '0 6px 18px -4px rgba(129, 140, 248, 0.5)',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => handleAddEntry('output', { type: 'bag', amountMl: amt, timestamp: Date.now() })}
                        >
                            +{amt} ml
                        </button>
                    ))}
                    <button
                        className="liquid-button secondary-action"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => setSheet({ type: 'output', subType: 'bag', quickAmounts: [100, 200, 300, 400, 500] })}
                    >
                        Custom
                    </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, marginTop: 16, fontWeight: 500 }}>Normal Void</div>
                <div className="quick-actions-grid">
                    {[25, 50, 100].map(amt => (
                        <button
                            key={`void-${amt}`}
                            className="liquid-button"
                            style={{
                                background: 'var(--color-void)',
                                boxShadow: '0 6px 18px -4px rgba(20, 184, 166, 0.45)',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => handleAddEntry('output', { type: 'void', amountMl: amt, timestamp: Date.now() })}
                        >
                            +{amt} ml
                        </button>
                    ))}
                    <button
                        className="liquid-button secondary-action"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => setSheet({ type: 'output', subType: 'void', quickAmounts: [25, 50, 100, 150, 200] })}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {/* Flush & Bowel Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Icons.Syringe size={18} color="var(--success)" />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Flush</span>
                    </div>
                    <button className="liquid-button" style={{ background: 'var(--success)', boxShadow: '0 6px 20px -4px rgba(52, 211, 153, 0.4)' }} onClick={() => handleAddEntry('flush', { amountMl: 30, timestamp: Date.now() })}>
                        30ml
                    </button>
                </div>
                <div className="glass-card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>🧻</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Bowel</span>
                    </div>
                    <button className="liquid-button" style={{ background: 'var(--warning)', boxShadow: '0 6px 20px -4px rgba(251, 191, 36, 0.4)' }} onClick={() => setSheet({ type: 'bowel' })}>
                        Log
                    </button>
                </div>
            </div>

            {/* Dressing Check */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icons.Bandage size={20} color="#a855f7" />
                    <span style={{ fontWeight: 600 }}>Dressing Check</span>
                </div>
                <button className="liquid-button--chip" style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7', color: '#a855f7' }} onClick={() => setSheet({ type: 'dressing' })}>
                    Log Status
                </button>
            </div>

            {/* Voice Button */}
            <VoiceButton onCommand={handleVoiceCommand} showToast={showToast} />

            {/* Sheets */}
            <AnimatePresence>
                {sheet?.type === 'intake' && (
                    <IntakeSheet quickAmounts={sheet.quickAmounts} onSave={(amt, note, ts) => handleSave('intake', { amountMl: amt, note, timestamp: ts })} onClose={() => setSheet(null)} />
                )}
                {sheet?.type === 'output' && (
                    <OutputSheet type={sheet.subType} quickAmounts={sheet.quickAmounts} onSave={(amt, color, symptoms, note, ts) => handleSave('output', { type: sheet.subType, amountMl: amt, colorNote: color, symptoms, note, timestamp: ts })} onClose={() => setSheet(null)} />
                )}
                {sheet?.type === 'flush' && (
                    <FlushSheet onSave={(amt, note, ts) => handleSave('flush', { amountMl: amt, note, timestamp: ts })} onClose={() => setSheet(null)} />
                )}
                {sheet?.type === 'bowel' && (
                    <BowelSheet onSave={(scale, note, ts) => handleSave('bowel', { bristolScale: scale, note, timestamp: ts })} onClose={() => setSheet(null)} />
                )}
                {sheet?.type === 'dressing' && (
                    <DressingSheet onSave={(state, note, ts) => handleSave('dressing', { state, note, timestamp: ts })} onClose={() => setSheet(null)} />
                )}
                {showGoals && (
                    <GoalSheet
                        initialValues={data.getLatestGoal()}
                        onSave={(nextGoals) => {
                            data.setGoals(nextGoals.intakeMl, nextGoals.outputMl);
                            setShowGoals(false);
                            showToast('Daily goals updated');
                        }}
                        onClose={() => setShowGoals(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
