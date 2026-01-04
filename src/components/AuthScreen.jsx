import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

export default function AuthScreen({ onAuth, initialPassphrase }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passphrase, setPassphrase] = useState(initialPassphrase || '');
    const [showPassphrase, setShowPassphrase] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username || !password || !passphrase) return;
        onAuth(isLogin, username, password, passphrase);
    };

    return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
                className="glass-card"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ width: '100%', maxWidth: '400px', padding: '32px 24px' }}
            >
                <header style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'var(--primary-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
                        <Icons.Activity size={32} color="white" />
                    </div>
                    <h1 className="screen-header__title" style={{ fontSize: '28px', marginBottom: '8px' }}>NephTrack</h1>
                    <p className="screen-header__subtitle">Secure Health Joural</p>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label className="input-group__label">Username</label>
                        <div className="input-wrapper">
                            <span className="input-icon" style={{ fontSize: '18px' }}>👤</span>
                            <input
                                type="text"
                                className="input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-group__label">Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon" style={{ fontSize: '18px' }}>🔑</span>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="input-group__label" style={{ marginBottom: 0 }}>Encryption Key</label>
                            <button
                                type="button"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {showPassphrase ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <div className="input-wrapper" style={{ borderColor: 'var(--accent)' }}>
                            <span className="input-icon" style={{ color: 'var(--accent)' }}><Icons.Lock size={18} /></span>
                            <input
                                type={showPassphrase ? 'text' : 'password'}
                                className="input"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                placeholder="Passphrase for E2E"
                                style={{ color: 'var(--accent)' }}
                            />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                            <span style={{ color: 'var(--warning)', marginRight: '4px' }}>⚠️</span>
                            This key wraps your data. It is never sent to the server. If lost, your data is unrecoverable.
                        </p>
                    </div>

                    <button className="liquid-button" type="submit" style={{ marginTop: '12px' }}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px', cursor: 'pointer' }}
                    >
                        {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
