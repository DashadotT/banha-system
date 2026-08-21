// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signIn, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-card p-8 border border-border">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--primary)' }}>
                            BANHA
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            Bridging Air, Noise, Heat, and Achievement
                        </p>
                        <div className="mt-4 w-12 h-0.5 mx-auto" style={{ backgroundColor: 'var(--accent)' }} />
                        <p className="text-text-secondary text-sm mt-4">Research Data Management System</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition bg-white text-text-primary"
                                style={{ borderColor: 'var(--border)' }}
                                placeholder="researcher@university.edu"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition bg-white text-text-primary pr-12"
                                    style={{ borderColor: 'var(--border)' }}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary text-sm"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-md border border-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 text-white font-medium rounded-md transition hover:opacity-90 disabled:opacity-70 text-sm"
                            style={{ backgroundColor: 'var(--primary)' }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-text-muted text-xs mt-6">
                        Secure access for authorized researchers only
                    </p>
                </div>
            </div>
        </div>
    );
}