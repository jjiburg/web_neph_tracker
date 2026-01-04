import { useState } from 'react';
import { motion } from 'framer-motion';

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
                style={{ width: '100%', maxWidth: '400px' }}
            >
                <header style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 className="screen-header__title" style={{ fontSize: '28px' }}>NephTrack</h1>
                    <p className="screen-header__subtitle">Secure Cloud Sync</p>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label className="input-group__label">Username</label>
                        <input
                            type="text"
                            className="input"
                            style={{ fontSize: '16px' }}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-group__label">Password</label>
                        <input
                            type="password"
                            className="input"
                            style={{ fontSize: '16px' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />
                    </div>

                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="input-group__label">Encryption Passphrase</label>
                            <button
                                type="button"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px' }}
                            >
                                {showPassphrase ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            type={showPassphrase ? 'text' : 'password'}
                            className="input"
                            style={{ fontSize: '16px', borderColor: 'var(--accent)' }}
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Passphrase for E2E"
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            ⚠️ This key is NEVER sent to the server. If you lose it, your cloud data cannot be decrypted.
                        </p>
                    </div>

                    <button className="liquid-button" type="submit">
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}
                    >
                        {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
