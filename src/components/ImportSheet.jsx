import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { importBackup } from '../import';

export default function ImportSheet({ onClose, onSuccess }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(null);

        try {
            const text = await file.text();
            const result = await importBackup(text, replaceExisting);
            setStatus(result);
            if (result.success && onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            setStatus({ success: false, message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sheet-overlay" onClick={onClose}>
            <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__header">
                    <h2 className="sheet__title">Import Backup</h2>
                    <button className="sheet__close" onClick={onClose}>✕</button>
                </div>

                <div className="sheet__content" style={{ padding: '20px' }}>
                    <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Import a JSON backup file exported from the NephTrack iOS app.
                    </p>

                    <div className="input-group" style={{ marginBottom: '20px' }}>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={replaceExisting}
                                onChange={(e) => setReplaceExisting(e.target.checked)}
                            />
                            <span className="toggle__slider"></span>
                            <span style={{ marginLeft: '12px' }}>Replace existing data</span>
                        </label>
                        {replaceExisting && (
                            <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '8px' }}>
                                ⚠️ This will delete all current data before importing.
                            </p>
                        )}
                    </div>

                    <input
                        type="file"
                        accept=".json,application/json"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    <button
                        className="liquid-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Importing...' : 'Select Backup File'}
                    </button>

                    {status && (
                        <div
                            style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '12px',
                                background: status.success ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                                color: status.success ? '#34C759' : '#FF453A',
                                fontSize: '14px'
                            }}
                        >
                            {status.message}
                            {status.counts && (
                                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                                    <li>Intakes: {status.counts.intakes}</li>
                                    <li>Outputs: {status.counts.outputs}</li>
                                    <li>Flushes: {status.counts.flushes}</li>
                                    <li>Bowel Movements: {status.counts.bowelMovements}</li>
                                    <li>Dressings: {status.counts.dressings}</li>
                                    <li>Daily Totals: {status.counts.dailyTotals}</li>
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
