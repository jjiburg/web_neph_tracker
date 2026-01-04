import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

export default function OutputSheet({ type, onSave, onClose, quickAmounts }) {
    const [amountMl, setAmountMl] = useState('');
    const [colorNote, setColorNote] = useState('');
    const [otherNote, setOtherNote] = useState('');
    const [symptoms, setSymptoms] = useState({ clots: false, pain: false, leakage: false, fever: false });
    const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

    const toggleSymptom = (key) => {
        setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        if (!amountMl || parseFloat(amountMl) <= 0) return;
        onSave(parseFloat(amountMl), colorNote, symptoms, otherNote, new Date(timestamp).getTime());
    };

    return (
        <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <span className="sheet__icon" style={{ color: 'var(--secondary)' }}><Icons.Beaker /></span>
                    <h2 className="sheet__title">Log {type === 'bag' ? 'Bag' : 'Voided'}</h2>
                </div>

                <div className="sheet__content">
                    {/* Amount */}
                    <div className="input-group">
                        <label className="input-group__label">Amount (ml)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                className="input input--large"
                                placeholder="0"
                                value={amountMl}
                                onChange={(e) => setAmountMl(e.target.value)}
                                inputMode="numeric"
                                autoFocus
                            />
                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: 600 }}>ml</span>
                        </div>
                        <div className="quick-grid">
                            {quickAmounts.map((amt) => (
                                <button
                                    key={amt}
                                    className={`liquid-button--chip ${parseFloat(amountMl) === amt ? 'active' : ''}`}
                                    onClick={() => setAmountMl(String(amt))}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Symptoms */}
                    <div className="glass-card glass-card--compact">
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>SYMPTOMS</div>
                        {['clots', 'pain', 'leakage', 'fever'].map((symptom) => (
                            <div className="toggle-row" key={symptom}>
                                <span className="toggle-row__label" style={{ textTransform: 'capitalize' }}>{symptom}</span>
                                <div
                                    className={`toggle ${symptoms[symptom] ? 'active' : ''}`}
                                    onClick={() => toggleSymptom(symptom)}
                                >
                                    <div className="toggle__thumb" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Color/Notes */}
                    <div className="input-group">
                        <label className="input-group__label">Details</label>
                        <div className="input-wrapper" style={{ marginBottom: '12px' }}>
                            <span className="input-icon" style={{ fontSize: '16px' }}>🎨</span>
                            <input
                                type="text"
                                className="input"
                                placeholder="Color (e.g. Amber, Clear)"
                                value={colorNote}
                                onChange={(e) => setColorNote(e.target.value)}
                            />
                        </div>
                        <div className="input-wrapper">
                            <span className="input-icon"><Icons.Paperclip /></span>
                            <input
                                type="text"
                                className="input"
                                placeholder="Other notes..."
                                value={otherNote}
                                onChange={(e) => setOtherNote(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Save */}
                    <button
                        className="liquid-button liquid-button--secondary"
                        onClick={handleSave}
                        disabled={!amountMl || parseFloat(amountMl) <= 0}
                        style={{ marginTop: '8px' }}
                    >
                        Save Entry
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
