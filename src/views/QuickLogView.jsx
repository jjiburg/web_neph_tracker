import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMl } from '../store';
import IntakeSheet from '../components/IntakeSheet';
import OutputSheet from '../components/OutputSheet';
import FlushSheet from '../components/FlushSheet';
import BowelSheet from '../components/BowelSheet';
import DressingSheet from '../components/DressingSheet';

const INTAKE_QUICK_AMOUNTS = [63, 236, 710]; // ~2oz, 8oz, 24oz
const BAG_QUICK_AMOUNTS = [100, 200, 300];
const VOIDED_QUICK_AMOUNTS = [25, 50, 100];
const DRESSING_STATES = ['Checked', 'Needs Changing', 'Changed Today'];

export default function QuickLogView({ data, showToast }) {
    const [sheetType, setSheetType] = useState(null);
    const [outputType, setOutputType] = useState('bag');
    const [showDressingOptions, setShowDressingOptions] = useState(false);

    const { todayIntakeMl, todayTotalOutputMl, logIntake, logOutput, logFlush, logBowel, logDressing } = data;

    const handleQuickIntake = async (amount) => {
        await logIntake(amount);
        showToast(`Intake +${formatMl(amount)}`);
    };

    const handleQuickOutput = async (type, amount) => {
        await logOutput(type, amount);
        showToast(`${type === 'bag' ? 'Bag' : 'Voided'} +${formatMl(amount)}`);
    };

    const handleQuickFlush = async () => {
        await logFlush(30);
        showToast('Flush logged');
    };

    const handleQuickDressing = async (state) => {
        await logDressing(state);
        showToast(`Dressing: ${state}`);
        setShowDressingOptions(false);
    };

    return (
        <div className="page">
            {/* Header */}
            <header className="screen-header">
                <h1 className="screen-header__title">Log</h1>
                <p className="screen-header__subtitle">Quick Entry</p>
            </header>

            <div className="page__content">
                {/* Today's Totals */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Today's Totals</span>
                        <span style={{ fontSize: '18px' }}>📊</span>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card__label">Intake</div>
                            <div className="stat-card__value" style={{ color: 'var(--accent)' }}>{formatMl(todayIntakeMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--accent-secondary)' }}>{formatMl(todayTotalOutputMl)}</div>
                        </div>
                    </div>
                </div>

                {/* Hydration */}
                <div className="glass-card">
                    <div className="section">
                        <h2 className="section__title section__title--accent">
                            <span>💧</span> Hydration
                        </h2>
                        <div className="quick-grid">
                            {INTAKE_QUICK_AMOUNTS.map((amt) => (
                                <button key={amt} className="liquid-button liquid-button--small" onClick={() => handleQuickIntake(amt)}>
                                    +{amt}
                                </button>
                            ))}
                        </div>
                        <button className="liquid-button--chip" onClick={() => setSheetType('intake')}>
                            Custom Amount
                        </button>
                    </div>
                </div>

                {/* Output */}
                <div className="glass-card">
                    <div className="section">
                        <h2 className="section__title section__title--secondary">
                            <span>🧪</span> Output
                        </h2>

                        {/* Bag */}
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bag Empty</p>
                            <div className="h-scroll">
                                {BAG_QUICK_AMOUNTS.map((amt) => (
                                    <button key={amt} className="liquid-button liquid-button--secondary liquid-button--small" style={{ flexShrink: 0, width: 'auto', minWidth: '70px' }} onClick={() => handleQuickOutput('bag', amt)}>
                                        {amt}
                                    </button>
                                ))}
                                <button className="liquid-button--chip" style={{ flexShrink: 0 }} onClick={() => { setOutputType('bag'); setSheetType('output'); }}>
                                    Custom
                                </button>
                            </div>
                        </div>

                        {/* Voided */}
                        <div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Natural Void</p>
                            <div className="h-scroll">
                                {VOIDED_QUICK_AMOUNTS.map((amt) => (
                                    <button key={amt} className="liquid-button liquid-button--secondary liquid-button--small" style={{ flexShrink: 0, width: 'auto', minWidth: '70px', opacity: 0.8 }} onClick={() => handleQuickOutput('urinal', amt)}>
                                        {amt}
                                    </button>
                                ))}
                                <button className="liquid-button--chip" style={{ flexShrink: 0 }} onClick={() => { setOutputType('urinal'); setSheetType('output'); }}>
                                    Custom
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flush & Bowel Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Flush */}
                    <div className="glass-card glass-card--compact">
                        <div className="section">
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <span>💉</span> Flush
                            </h2>
                            <button className="liquid-button liquid-button--small" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.15) 100%)', borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }} onClick={handleQuickFlush}>
                                Log Now
                            </button>
                            <button className="liquid-button--chip" onClick={() => setSheetType('flush')}>Details</button>
                        </div>
                    </div>

                    {/* Bowel */}
                    <div className="glass-card glass-card--compact">
                        <div className="section">
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <span>🚽</span> Bowel
                            </h2>
                            <button className="liquid-button liquid-button--small" style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.5) 0%, rgba(249, 115, 22, 0.15) 100%)', borderColor: 'rgba(249, 115, 22, 0.4)', boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)' }} onClick={() => setSheetType('bowel')}>
                                Log
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dressing */}
                <div className="glass-card">
                    <div className="section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <span>🩹</span> Dressing
                            </h2>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', transform: showDressingOptions ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} onClick={() => setShowDressingOptions(!showDressingOptions)}>
                                ›
                            </button>
                        </div>

                        <AnimatePresence>
                            {showDressingOptions && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="quick-grid" style={{ marginTop: '12px' }}>
                                        {DRESSING_STATES.map((state) => (
                                            <button key={state} className="liquid-button--chip" style={{ fontSize: '12px' }} onClick={() => handleQuickDressing(state)}>
                                                {state}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button className="liquid-button--chip" onClick={() => setSheetType('dressing')}>Custom Entry</button>
                    </div>
                </div>
            </div>

            {/* Sheets */}
            <AnimatePresence>
                {sheetType === 'intake' && (
                    <IntakeSheet
                        onSave={async (amountMl, note, timestamp) => {
                            await logIntake(amountMl, note, timestamp);
                            showToast(`Intake +${formatMl(amountMl)}`);
                            setSheetType(null);
                        }}
                        onClose={() => setSheetType(null)}
                        quickAmounts={INTAKE_QUICK_AMOUNTS}
                    />
                )}
                {sheetType === 'output' && (
                    <OutputSheet
                        type={outputType}
                        onSave={async (amountMl, colorNote, symptoms, otherNote, timestamp) => {
                            await logOutput(outputType, amountMl, colorNote, symptoms, otherNote, timestamp);
                            showToast(`${outputType === 'bag' ? 'Bag' : 'Voided'} +${formatMl(amountMl)}`);
                            setSheetType(null);
                        }}
                        onClose={() => setSheetType(null)}
                        quickAmounts={outputType === 'bag' ? BAG_QUICK_AMOUNTS : VOIDED_QUICK_AMOUNTS}
                    />
                )}
                {sheetType === 'flush' && (
                    <FlushSheet
                        onSave={async (amountMl, note, timestamp) => {
                            await logFlush(amountMl, note, timestamp);
                            showToast('Flush logged');
                            setSheetType(null);
                        }}
                        onClose={() => setSheetType(null)}
                    />
                )}
                {sheetType === 'bowel' && (
                    <BowelSheet
                        onSave={async (bristolScale, note, timestamp) => {
                            await logBowel(bristolScale, note, timestamp);
                            showToast('Bowel movement logged');
                            setSheetType(null);
                        }}
                        onClose={() => setSheetType(null)}
                    />
                )}
                {sheetType === 'dressing' && (
                    <DressingSheet
                        onSave={async (state, note, timestamp) => {
                            await logDressing(state, note, timestamp);
                            showToast(`Dressing: ${state}`);
                            setSheetType(null);
                        }}
                        onClose={() => setSheetType(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
