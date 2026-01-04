import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';
import IntakeSheet from '../components/IntakeSheet';
import OutputSheet from '../components/OutputSheet';
import FlushSheet from '../components/FlushSheet';
import BowelSheet from '../components/BowelSheet';
import DressingSheet from '../components/DressingSheet';

export default function QuickLogView({ data, showToast }) {
    const [sheet, setSheet] = useState(null);

    // Map the new UI's onAddEntry structure to the data hooks structure
    const handleAddEntry = async (storeName, entryData) => {
        try {
            switch (storeName) {
                case 'intake':
                    await data.logIntake(entryData.amountMl, entryData.note, entryData.timestamp);
                    showToast(`Intake +${entryData.amountMl}ml`);
                    break;
                case 'output':
                    await data.logOutput(
                        entryData.type,
                        entryData.amountMl,
                        entryData.colorNote,
                        entryData.symptoms,
                        entryData.note,
                        entryData.timestamp
                    );
                    showToast(`${entryData.type === 'bag' ? 'Bag' : 'Void'} +${entryData.amountMl}ml`);
                    break;
                case 'flush':
                    await data.logFlush(entryData.amountMl, entryData.note, entryData.timestamp);
                    showToast('Flush logged');
                    break;
                case 'bowel':
                    await data.logBowel(entryData.bristolScale, entryData.note, entryData.timestamp);
                    showToast('Bowel movement logged');
                    break;
                case 'dressing':
                    await data.logDressing(entryData.state, entryData.note, entryData.timestamp);
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

    const todayStats = {
        intake: data.todayIntakeMl,
        output: data.todayTotalOutputMl
    };

    return (
        <div className="view-content">
            <header className="screen-header">
                <div>
                    <h1 className="screen-header__title">Quick Entry</h1>
                    <p className="screen-header__subtitle">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button className="liquid-button liquid-button--icon" onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}>
                    <Icons.LogOut />
                </button>
            </header>

            {/* Daily Snapshot */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', fontWeight: 600 }}>Daily Snapshot</h3>
                    <Icons.Activity size={16} color="var(--primary)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="stat-box" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>IN</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{todayStats.intake || 0} <span style={{ fontSize: '14px' }}>ml</span></div>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>OUT</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--secondary)' }}>{todayStats.output || 0} <span style={{ fontSize: '14px' }}>ml</span></div>
                    </div>
                </div>
            </div>

            {/* Hydration */}
            <section style={{ marginBottom: '24px' }}>
                <div className="section-header">
                    <span className="section-icon"><Icons.Drop /></span>
                    <h2>Hydration</h2>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                    <div className="quick-stack">
                        {[63, 236, 710].map(amt => (
                            <button
                                key={amt}
                                className="liquid-button"
                                onClick={() => handleAddEntry('intake', { amountMl: amt, timestamp: Date.now() })}
                                style={{ justifyContent: 'center', height: '56px', fontSize: '18px' }}
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>
                    <button
                        className="liquid-button secondary-action"
                        onClick={() => setSheet({ type: 'intake', quickAmounts: [63, 236, 710] })}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        Custom Amount...
                    </button>
                </div>
            </section>

            {/* Output */}
            <section style={{ marginBottom: '24px' }}>
                <div className="section-header">
                    <span className="section-icon" style={{ color: 'var(--secondary)' }}><Icons.Beaker /></span>
                    <h2>Output</h2>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>

                    {/* Bag */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '4px' }}>Nephrostomy Bag</div>
                        <div className="quick-actions-grid">
                            {[100, 200, 300].map(amt => (
                                <button
                                    key={`bag-${amt}`}
                                    className="liquid-button"
                                    onClick={() => handleAddEntry('output', { type: 'bag', amountMl: amt, timestamp: Date.now() })}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', justifyContent: 'center', padding: '0' }}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                        <button
                            className="liquid-button secondary-action"
                            onClick={() => setSheet({ type: 'output', subType: 'bag', quickAmounts: [100, 200, 300, 400, 500, 600] })}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            Custom...
                        </button>
                    </div>

                    {/* Void */}
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '4px' }}>Normal Void</div>
                        <div className="quick-actions-grid">
                            {[25, 50, 100].map(amt => (
                                <button
                                    key={`void-${amt}`}
                                    className="liquid-button"
                                    onClick={() => handleAddEntry('output', { type: 'void', amountMl: amt, timestamp: Date.now() })}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', justifyContent: 'center', padding: '0' }}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                        <button
                            className="liquid-button secondary-action"
                            onClick={() => setSheet({ type: 'output', subType: 'void', quickAmounts: [25, 50, 100, 150, 200] })}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            Custom...
                        </button>
                    </div>
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '100px' }}>
                {/* Flush */}
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                        <Icons.Syringe size={18} />
                        <span style={{ fontWeight: 600 }}>Flush</span>
                    </div>
                    <button
                        className="liquid-button"
                        onClick={() => handleAddEntry('flush', { amountMl: 30, timestamp: Date.now() })}
                        style={{ background: 'var(--success)', justifyContent: 'center', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                    >
                        Log 30ml
                    </button>
                    <button
                        className="liquid-button secondary-action"
                        onClick={() => setSheet({ type: 'flush' })}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                    >
                        Custom
                    </button>
                </div>

                {/* Bowel */}
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
                        <span style={{ fontSize: '18px' }}>🧻</span>
                        <span style={{ fontWeight: 600 }}>Bowel</span>
                    </div>
                    <button
                        className="liquid-button"
                        onClick={() => setSheet({ type: 'bowel' })}
                        style={{ background: 'var(--warning)', justifyContent: 'center', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                    >
                        Log
                    </button>
                    <div style={{ height: '42px' }}></div> {/* Spacer to match height if needed, or remove custom button above */}
                </div>
            </div>

            {/* Floating Action / Dressing */}
            <div className="glass-card" style={{
                position: 'fixed', bottom: '90px', left: '16px', right: '16px',
                padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icons.Bandage color="#a855f7" />
                    <span style={{ fontWeight: 600 }}>Dressing Check</span>
                </div>
                <button
                    className="liquid-button--chip"
                    onClick={() => setSheet({ type: 'dressing' })}
                    style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                >
                    Log Status <Icons.ChevronRight size={14} />
                </button>
            </div>


            <AnimatePresence>
                {sheet?.type === 'intake' && (
                    <IntakeSheet
                        quickAmounts={sheet.quickAmounts}
                        onSave={(amount, note, timestamp) => handleSave('intake', { amountMl: amount, note, timestamp })}
                        onClose={() => setSheet(null)}
                    />
                )}
                {sheet?.type === 'output' && (
                    <OutputSheet
                        type={sheet.subType}
                        quickAmounts={sheet.quickAmounts}
                        onSave={(amount, color, symptoms, note, timestamp) => handleSave('output', { type: sheet.subType, amountMl: amount, colorNote: color, symptoms, note, timestamp })}
                        onClose={() => setSheet(null)}
                    />
                )}
                {sheet?.type === 'flush' && (
                    <FlushSheet
                        onSave={(amount, note, timestamp) => handleSave('flush', { amountMl: amount, note, timestamp })}
                        onClose={() => setSheet(null)}
                    />
                )}
                {sheet?.type === 'bowel' && (
                    <BowelSheet
                        onSave={(scale, note, timestamp) => handleSave('bowel', { bristolScale: scale, note, timestamp })}
                        onClose={() => setSheet(null)}
                    />
                )}
                {sheet?.type === 'dressing' && (
                    <DressingSheet
                        onSave={(state, note, timestamp) => handleSave('dressing', { state, note, timestamp })}
                        onClose={() => setSheet(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
