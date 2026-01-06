import { useState } from 'react';
import { getLocalDateTimeInputValue } from '../utils/time';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

export default function FlushSheet({ onSave, onClose, initialValues, mode = 'create' }) {
    const [amountMl, setAmountMl] = useState(initialValues?.amountMl ? String(initialValues.amountMl) : '30');
    const [note, setNote] = useState(initialValues?.note || '');
    const [timestamp, setTimestamp] = useState(
        getLocalDateTimeInputValue(initialValues?.timestamp ? new Date(initialValues.timestamp) : new Date())
    );

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
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 900) {
                        onClose();
                    }
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <span className="sheet__icon text-success"><Icons.Syringe /></span>
                    <h2 className="sheet__title">{mode === 'edit' ? 'Edit Flush' : 'Log Flush'}</h2>
                </div>

                <div className="sheet__content">
                    {/* Amount */}
                    <div className="input-group">
                        <label className="input-group__label">Amount</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                className="input input--large"
                                placeholder="30"
                                value={amountMl}
                                onChange={(e) => setAmountMl(e.target.value)}
                                inputMode="numeric"
                            />
                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: 600 }}>ml</span>
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
                        <label className="input-group__label">Notes</label>
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
                        style={{ marginTop: '8px', background: 'var(--success)', boxShadow: '0 8px 24px -4px rgba(52, 211, 153, 0.4)' }}
                    >
                        {mode === 'edit' ? 'Update Flush' : 'Save Flush'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
