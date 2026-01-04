import { useState } from 'react';
import { motion } from 'framer-motion';

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
                <h2 className="sheet__title">Dressing Check</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Status */}
                    <div className="input-group">
                        <label className="input-group__label">Status</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            {DRESSING_STATES.map((s) => (
                                <button
                                    key={s}
                                    className={`liquid-button--chip ${state === s ? 'active' : ''}`}
                                    onClick={() => setState(s)}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
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
                        style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.5) 0%, rgba(168, 85, 247, 0.15) 100%)', borderColor: 'rgba(168, 85, 247, 0.4)', boxShadow: '0 8px 24px rgba(168, 85, 247, 0.3)' }}
                    >
                        Save
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
