import React, { useState } from 'react';
import { supabase } from '../data/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Mail, Loader2, AlertCircle } from 'lucide-react';
import { track } from '@vercel/analytics';
import Iridescence from '../components/Iridescence';
import BounceButton from '../components/BounceButton';
import GlareHover from '../components/GlareHover';
import logoSrc from '../../Logo/Logo_16-9.png';
import './Auth.css'; // Shared CSS for auth pages

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            track('unauthorized_login_attempt', { email });
        } else {
            // Log the login for forensic auditing
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

                let ip = 'Unknown';
                try {
                    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                    const ipData = await ipRes.json();
                    ip = ipData.ip;
                } catch (fetchError) {
                    console.warn("Could not fetch IP, proceeding with 'Unknown'", fetchError);
                } finally {
                    clearTimeout(timeoutId);
                }

                const { error: logDbError } = await supabase.from('login_logs').insert({
                    user_id: authData.user.id,
                    ip_address: ip,
                    user_agent: navigator.userAgent
                });

                if (logDbError) {
                    console.error("Forensic logging to database failed:", logDbError);
                }
            } catch (logError) {
                console.error("Unexpected error in forensic logging pipeline:", logError);
            }

            navigate('/'); // AuthContext handles profile fetch and redirect
        }
    };

    return (
        <div className="auth-container">
            <Iridescence
                color={[0.4, 0.6, 1]}
                mouseReact={true}
                amplitude={0.15}
                speed={0.8}
            />

            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-header">
                    <div className="auth-logo-wrapper">
                        <GlareHover className="auth-logo-glare-wrapper">
                            <img src={logoSrc} alt="SSD Logo" className="auth-logo-img" />
                        </GlareHover>
                    </div>
                    <h1>SSD SHIELD</h1>
                    <p>Enterprise Management Suite</p>
                </div>

                {error && (
                    <motion.div
                        className="auth-error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </motion.div>
                )}

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="input-group">
                        <label>Email Address</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="name@ssdconstructions.lk"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <Key size={18} className="input-icon" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <BounceButton
                        type="submit"
                        className="auth-submit-btn"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                    >
                        {loading ? <Loader2 className="spinner" size={18} /> : 'Access Command Center'}
                    </BounceButton>
                </form>

                <div className="auth-footer">
                    <p>Authorized Personnel Only. <br /><Link to="/signup">Redeem Invite Code</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
