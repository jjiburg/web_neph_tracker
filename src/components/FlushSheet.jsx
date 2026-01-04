import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FlushSheet({ onSave, onClose }) {
    const [amountMl, setAmountMl] = useState('30');
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

    const handleSave = () => {
        onSave(parseFloat(amountMl) || 30, note, new Date(timestamp).getTime());
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
                <h2 className="sheet__title">Log Flush</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Amount */}
                    <div className="input-group">
                        <label className="input-group__label">Amount (ml)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="30"
                            value={amountMl}
                            onChange={(e) => setAmountMl(e.target.value)}
                            inputMode="numeric"
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
                    <button className="liquid-button" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
