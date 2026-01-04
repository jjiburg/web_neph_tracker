import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

const DRESSING_STATES = ['Checked', 'Needs Changing', 'Changed Today'];

export default function DressingSheet({ onSave, onClose }) {
    const [state, setState] = useState('Checked');
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

    const handleSave = () => {
        onSave(state, note, new Date(timestamp).getTime());
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
                    <span className="sheet__icon" style={{ color: '#a855f7' }}><Icons.Bandage /></span>
                    <h2 className="sheet__title">Dressing Check</h2>
                </div>

                <div className="sheet__content">
                    {/* Status */}
                    <div className="input-group">
                        <label className="input-group__label">Status</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            {DRESSING_STATES.map((s) => (
                                <button
                                    key={s}
                                    className={`liquid-button--chip ${state === s ? 'active' : ''}`}
                                    onClick={() => setState(s)}
                                    style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                                >
                                    {s}
                                </button>
                            ))}
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
                        style={{ marginTop: '8px', background: '#a855f7', boxShadow: '0 8px 24px -4px rgba(168, 85, 247, 0.4)' }}
                    >
                        Save Check
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
