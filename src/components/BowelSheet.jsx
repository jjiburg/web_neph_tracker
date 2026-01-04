import { useState } from 'react';
import { motion } from 'framer-motion';

const BRISTOL_SCALE = [0, 1, 2, 3, 4, 5, 6, 7];

export default function BowelSheet({ onSave, onClose }) {
    const [bristolScale, setBristolScale] = useState(0);
    const [note, setNote] = useState('');
    const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

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
                <h2 className="sheet__title">Bowel Movement</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Bristol Scale */}
                    <div className="input-group">
                        <label className="input-group__label">Bristol Scale</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {BRISTOL_SCALE.map((scale) => (
                                <button
                                    key={scale}
                                    className={`liquid-button--chip ${bristolScale === scale ? 'active' : ''}`}
                                    onClick={() => setBristolScale(scale)}
                                    style={{ minWidth: '50px' }}
                                >
                                    {scale === 0 ? 'N/A' : `${scale}`}
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
                        style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.5) 0%, rgba(249, 115, 22, 0.15) 100%)', borderColor: 'rgba(249, 115, 22, 0.4)', boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)' }}
                    >
                        Save
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
