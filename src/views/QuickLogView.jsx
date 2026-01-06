import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';
import IntakeSheet from '../components/IntakeSheet';
import OutputSheet from '../components/OutputSheet';
import FlushSheet from '../components/FlushSheet';
import BowelSheet from '../components/BowelSheet';
import DressingSheet from '../components/DressingSheet';
import VoiceButton from '../components/VoiceButton';

export default function QuickLogView({ data, showToast }) {
    const [sheet, setSheet] = useState(null);

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
            </header>

            {/* Daily Snapshot */}
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Daily Snapshot</span>
                    <Icons.Activity size={18} color="var(--primary)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
                        <div className="stat-card__label" style={{ fontSize: 11 }}>In</div>
                        <div className="stat-card__value" style={{ fontSize: 18, color: 'var(--color-intake)' }}>{data.todayIntakeMl || 0} <span style={{ fontSize: 12, fontWeight: 400 }}>ml</span></div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
                        <div className="stat-card__label" style={{ fontSize: 11 }}>Bag</div>
                        <div className="stat-card__value" style={{ color: 'var(--color-bag)', fontSize: 18 }}>{data.todayBagMl || 0} <span style={{ fontSize: 12, fontWeight: 400 }}>ml</span></div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
                        <div className="stat-card__label" style={{ fontSize: 11 }}>Normal</div>
                        <div className="stat-card__value" style={{ color: 'var(--color-void)', fontSize: 18 }}>{data.todayUrinalMl || 0} <span style={{ fontSize: 12, fontWeight: 400 }}>ml</span></div>
                    </div>
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
                </div>
                <button
                    className="liquid-button secondary-action"
                    style={{ minHeight: 36, padding: '8px 12px', fontSize: 12 }}
                    onClick={() => setSheet({ type: 'intake', quickAmounts: [63, 236, 710] })}
                >
                    Custom
                </button>
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
                </div>
                <button
                    className="liquid-button secondary-action"
                    style={{ minHeight: 36, padding: '8px 12px', fontSize: 12 }}
                    onClick={() => setSheet({ type: 'output', subType: 'bag', quickAmounts: [100, 200, 300, 400, 500] })}
                >
                    Custom
                </button>

                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, marginTop: 16, fontWeight: 500 }}>Normal Void</div>
                <div className="quick-actions-grid">
                    {[25, 50, 100].map(amt => (
                        <button
                            key={`void-${amt}`}
                            className="liquid-button"
                            style={{
                                background: 'var(--color-void)',
                                boxShadow: '0 6px 18px -4px rgba(244, 114, 182, 0.45)',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => handleAddEntry('output', { type: 'void', amountMl: amt, timestamp: Date.now() })}
                        >
                            +{amt} ml
                        </button>
                    ))}
                </div>
                <button
                    className="liquid-button secondary-action"
                    style={{ minHeight: 36, padding: '8px 12px', fontSize: 12 }}
                    onClick={() => setSheet({ type: 'output', subType: 'void', quickAmounts: [25, 50, 100, 150, 200] })}
                >
                    Custom
                </button>
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

            {/* Bottom spacer */}
            <div style={{ height: 80 }} />

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
            </AnimatePresence>
        </div>
    );
}
