import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runDiagnostics, API_BASE, isNative, platform } from '../config';

export default function DiagnosticsPanel({ onClose }) {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRunDiagnostics = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await runDiagnostics();
            setResults(res);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
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
                style={{ maxHeight: '90vh', overflow: 'auto' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <span className="sheet__icon">🔧</span>
                    <h2 className="sheet__title">Network Diagnostics</h2>
                </div>

                <div className="sheet__content">
                    {/* Current Config */}
                    <div className="glass-card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-dim)' }}>Current Configuration</h3>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
                            <div><strong>Platform:</strong> {platform}</div>
                            <div><strong>Is Native:</strong> {isNative ? 'Yes' : 'No'}</div>
                            <div><strong>API Base:</strong> {API_BASE || '(empty - relative path)'}</div>
                        </div>
                    </div>

                    {/* Run Button */}
                    <button
                        className="liquid-button"
                        onClick={handleRunDiagnostics}
                        disabled={loading}
                        style={{ width: '100%', marginBottom: 16 }}
                    >
                        {loading ? 'Running Tests...' : 'Run Connectivity Tests'}
                    </button>

                    {/* Error */}
                    {error && (
                        <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.2)', marginBottom: 16 }}>
                            <strong style={{ color: '#ef4444' }}>Error:</strong> {error}
                        </div>
                    )}

                    {/* Results */}
                    {results && (
                        <div className="glass-card">
                            <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-dim)' }}>Test Results</h3>
                            {results.tests.map((test, i) => (
                                <div key={i} style={{
                                    marginBottom: 12,
                                    padding: 12,
                                    background: test.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                                    borderRadius: 8
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {test.error ? '❌' : '✅'} {test.test}
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all' }}>
                                        {test.url && <div><strong>URL:</strong> {test.url}</div>}
                                        {test.status && <div><strong>Status:</strong> {test.status}</div>}
                                        {test.ok !== undefined && <div><strong>OK:</strong> {test.ok ? 'Yes' : 'No'}</div>}
                                        {test.elapsed && <div><strong>Time:</strong> {test.elapsed}</div>}
                                        {test.body && <div><strong>Response:</strong> {test.body}</div>}
                                        {test.error && <div><strong>Error:</strong> {test.error}</div>}
                                        {test.errorName && <div><strong>Type:</strong> {test.errorName}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Close Button */}
                    <button
                        className="liquid-button secondary-action"
                        onClick={onClose}
                        style={{ width: '100%', marginTop: 16 }}
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
