import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMl } from '../store';
import IntakeSheet from '../components/IntakeSheet';
import OutputSheet from '../components/OutputSheet';
import FlushSheet from '../components/FlushSheet';
import BowelSheet from '../components/BowelSheet';
import DressingSheet from '../components/DressingSheet';
import { Icons } from '../components/Icons';

const INTAKE_QUICK_AMOUNTS = [63, 236, 710];
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
            <header className="screen-header">
                <h1 className="screen-header__title">Quick Entry</h1>
                <p className="screen-header__subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </header>

            <div className="page__content">
                {/* Today's Totals */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span className="text-dim" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Daily Snapshot</span>
                        <Icons.Activity />
                    </div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card__label">In</div>
                            <div className="stat-card__value text-accent">{formatMl(todayIntakeMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Out</div>
                            <div className="stat-card__value" style={{ color: 'var(--secondary)' }}>{formatMl(todayTotalOutputMl)}</div>
                        </div>
                    </div>
                </div>

                {/* Hydration */}
                <div className="glass-card">
                    <div className="section">
                        <h2 className="section__title text-accent">
                            <Icons.Drop /> <span>Hydration</span>
                        </h2>
                        <div className="quick-grid">
                            {INTAKE_QUICK_AMOUNTS.map((amt) => (
                                <button key={amt} className="liquid-button liquid-button--small" onClick={() => handleQuickIntake(amt)}>
                                    +{amt}
                                </button>
                            ))}
                        </div>
                        <button className="liquid-button--chip" onClick={() => setSheetType('intake')}>
                            Custom Amount...
                        </button>
                    </div>
                </div>

                {/* Output */}
                <div className="glass-card">
                    <div className="section">
                        <h2 className="section__title" style={{ color: 'var(--secondary)' }}>
                            <Icons.Beaker /> <span>Output</span>
                        </h2>

                        {/* Bag */}
                        <div style={{ marginBottom: '16px' }}>
                            <p className="text-dim" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Nephrostomy Bag</p>
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
                            <p className="text-dim" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Normal Void</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Flush */}
                    <div className="glass-card glass-card--compact">
                        <div className="section">
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <Icons.Syringe /> <span>Flush</span>
                            </h2>
                            <button className="liquid-button liquid-button--small" style={{ background: 'var(--success)', boxShadow: '0 8px 24px -4px rgba(52, 211, 153, 0.4)' }} onClick={handleQuickFlush}>
                                Log 30ml
                            </button>
                            <button className="liquid-button--chip" onClick={() => setSheetType('flush')}>Custom</button>
                        </div>
                    </div>

                    {/* Bowel */}
                    <div className="glass-card glass-card--compact">
                        <div className="section">
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <span style={{ fontSize: '20px' }}>🧻</span> <span>Bowel</span>
                            </h2>
                            <button className="liquid-button liquid-button--small" style={{ background: 'var(--warning)', boxShadow: '0 8px 24px -4px rgba(251, 191, 36, 0.4)' }} onClick={() => setSheetType('bowel')}>
                                Log
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dressing */}
                <div className="glass-card">
                    <div className="section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowDressingOptions(!showDressingOptions)}>
                            <h2 className="section__title" style={{ fontSize: '16px' }}>
                                <Icons.Bandage /> <span>Dressing Check</span>
                            </h2>
                            <motion.div animate={{ rotate: showDressingOptions ? 90 : 0 }}>
                                <Icons.ChevronRight />
                            </motion.div>
                        </div>

                        <AnimatePresence>
                            {showDressingOptions && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="quick-grid" style={{ marginTop: '16px' }}>
                                        {DRESSING_STATES.map((state) => (
                                            <button key={state} className="liquid-button--chip" style={{ fontSize: '12px' }} onClick={() => handleQuickDressing(state)}>
                                                {state}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!showDressingOptions && (
                            <button className="liquid-button--chip" style={{ marginTop: '8px' }} onClick={() => setSheetType('dressing')}>Log Details...</button>
                        )}
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
