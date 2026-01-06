import { useState } from 'react';
import { getLocalDateTimeInputValue } from '../utils/time';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

export default function IntakeSheet({ onSave, onClose, quickAmounts }) {
    const [amountMl, setAmountMl] = useState('');
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(getLocalDateTimeInputValue());

    const handleSave = () => {
        if (!amountMl || parseFloat(amountMl) <= 0) return;
        onSave(parseFloat(amountMl), note, new Date(timestamp).getTime());
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
                    <span className="sheet__icon text-accent"><Icons.Drop /></span>
                    <h2 className="sheet__title">Log Intake</h2>
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

                    {/* Time */}
                    <div className="input-group">
                        <label className="input-group__label">Time</label>
                        <div className="input-wrapper">
                            <span className="input-icon"><Icons.Clock /></span>
                            <input
                                type="datetime-local"
                                className="input"
                                value={timestamp}
                                onChange={(e) => setTimestamp(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div className="input-group">
                        <label className="input-group__label">Notes (optional)</label>
                        <div className="input-wrapper">
                            <span className="input-icon"><Icons.Paperclip /></span>
                            <input
                                type="text"
                                className="input"
                                placeholder="Add a note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Save */}
                    <button
                        className="liquid-button"
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
