import { useState } from 'react';
import { motion } from 'framer-motion';

export default function IntakeSheet({ onSave, onClose, quickAmounts }) {
    const [amountMl, setAmountMl] = useState('');
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

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
                <h2 className="sheet__title">Log Intake</h2>

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

                    {/* Time */}
                    <div className="input-group">
                        <label className="input-group__label">Time</label>
                        <input
                            type="datetime-local"
                            className="input"
                            value={timestamp}
                            onChange={(e) => setTimestamp(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {/* Note */}
                    <div className="input-group">
                        <label className="input-group__label">Notes (optional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Add a note..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {/* Save */}
                    <button
                        className="liquid-button"
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
