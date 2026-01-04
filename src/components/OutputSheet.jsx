import { useState } from 'react';
import { motion } from 'framer-motion';

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
                <h2 className="sheet__title">Log {type === 'bag' ? 'Bag' : 'Voided'}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Amount */}
                    <div className="input-group">
                        <label className="input-group__label">Amount (ml)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0"
                            value={amountMl}
                            onChange={(e) => setAmountMl(e.target.value)}
                            inputMode="numeric"
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Symptoms</div>
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
                        <label className="input-group__label">Color (e.g. Amber)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Color..."
                            value={colorNote}
                            onChange={(e) => setColorNote(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-group__label">Other Notes</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Details..."
                            value={otherNote}
                            onChange={(e) => setOtherNote(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {/* Save */}
                    <button
                        className="liquid-button liquid-button--secondary"
                        onClick={handleSave}
                        disabled={!amountMl || parseFloat(amountMl) <= 0}
                        style={{ opacity: !amountMl || parseFloat(amountMl) <= 0 ? 0.5 : 1 }}
                    >
                        Save Entry
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
