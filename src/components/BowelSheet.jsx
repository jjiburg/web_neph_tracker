import { useState } from 'react';
import { getLocalDateTimeInputValue } from '../utils/time';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

const BRISTOL_SCALE = [0, 1, 2, 3, 4, 5, 6, 7];

export default function BowelSheet({ onSave, onClose }) {
    const [bristolScale, setBristolScale] = useState(0);
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(getLocalDateTimeInputValue());

    const handleSave = () => {
        onSave(bristolScale, note, new Date(timestamp).getTime());
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
                    <span className="sheet__icon text-warning" style={{ fontSize: '24px' }}>🧻</span>
                    <h2 className="sheet__title">Bowel Movement</h2>
                </div>

                <div className="sheet__content">
                    {/* Bristol Scale */}
                    <div className="input-group">
                        <label className="input-group__label">Bristol Scale</label>
                        <div className="quick-grid">
                            {BRISTOL_SCALE.map((scale) => (
                                <button
                                    key={scale}
                                    className={`liquid-button--chip ${bristolScale === scale ? 'active' : ''}`}
                                    onClick={() => setBristolScale(scale)}
                                    style={{ minWidth: '40px' }}
                                >
                                    {scale === 0 ? 'N/A' : `${scale}`}
                                </button>
                            ))}
                        </div>
                        <p className="text-dim" style={{ fontSize: '12px', marginTop: '8px' }}>
                            Type 1 (hard lumps) to Type 7 (liquid).
                        </p>
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
                        style={{ marginTop: '8px', background: 'var(--warning)', boxShadow: '0 8px 24px -4px rgba(251, 191, 36, 0.4)' }}
                    >
                        Save Entry
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
