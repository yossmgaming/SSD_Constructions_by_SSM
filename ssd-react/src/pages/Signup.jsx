import React, { useState } from 'react';
import { supabase } from '../data/supabase';
import { hashToken } from '../utils/security';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Mail, Loader2, AlertCircle, Hash, CheckCircle2, User } from 'lucide-react';
import { track } from '@vercel/analytics';
import Iridescence from '../components/Iridescence';
import BounceButton from '../components/BounceButton';
import GlareHover from '../components/GlareHover';
import logoSrc from '../../Logo/Logo_16-9.png';
import './Auth.css';

export default function Signup() {
    const [step, setStep] = useState(1);
    const [inviteCode, setInviteCode] = useState('');
    const [validInvite, setValidInvite] = useState(null);

    // Form fields
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Step 1: Verify Invite Code
    const verifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const codeHash = await hashToken(inviteCode.trim().toUpperCase());

            // First check if code exists and is unused
            const { data, error: fetchError } = await supabase
                .from('invite_codes')
                .select('*')
                .eq('token_hash', codeHash)
                .eq('is_used', false)
                .single();

            if (fetchError) {
                setError(`System Error: ${fetchError.message}`);
                setLoading(false);
                return;
            }

            if (!data) {
                setError("Invite code not found or already redeemed.");
                setLoading(false);
                track('unauthorized_access_attempt', { code: 'HASHED_TOKEN' });
                return;
            }

            // Check expiration
            if (new Date(data.expires_at) < new Date()) {
                setError("This invite code has expired.");
                setLoading(false);
                return;
            }

            // Valid!
            setValidInvite(data);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Create Account
    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Double check the code hasn't been used in the last minute by someone else
            const { data: codeCheck } = await supabase
                .from('invite_codes')
                .select('is_used')
                .eq('code', validInvite.code)
                .single();

            if (codeCheck?.is_used) {
                throw new Error("This code was just redeemed by another device.");
            }

            // 2. Create the user in Supabase Auth
            const { data: authData, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: validInvite.role
                    }
                }
            });

            if (signupError) throw signupError;

            const userId = authData.user.id;

            // 3. Create the Profile record directly linked to the gatekeeper role
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: email,
                    full_name: fullName,
                    role: validInvite.role,
                    target_id: validInvite.target_id
                });

            if (profileError) throw profileError;

            // 4. Burn the invite code
            console.log("Attempting to burn code:", validInvite.code);
            const { error: updateError, data: updateResult } = await supabase
                .from('invite_codes')
                .update({
                    is_used: true,
                    used_by: userId,
                    // Use a timestamp to track exactly when it was burned
                })
                .eq('code', validInvite.code)
                .select(); // Select to verify it actually happened

            if (updateError) {
                console.error("Invite code burn error:", updateError);
                throw updateError;
            }

            if (!updateResult || updateResult.length === 0) {
                console.warn("Update succeeded but 0 rows were affected for code:", validInvite.code);
                // We'll proceed but this is a major warning sign
            } else {
                console.log("Invite code burned successfully:", updateResult[0]);
            }

            // Analytics: Success!
            track('invite_redemption_rate', { role: validInvite.role });

            // 5. Show Success Step
            setStep(3);

        } catch (err) {
            console.error("Signup Identity Error:", err.message, err);
            setError(err.message || "An unexpected error occurred during identity authorization.");
        } finally {
            setLoading(false);
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="auth-header" style={{ marginBottom: step === 1 ? '2rem' : '1rem' }}>
                    <div className="auth-logo-wrapper">
                        <GlareHover className="auth-logo-glare-wrapper">
                            <img src={logoSrc} alt="SSD Logo" className="auth-logo-img" />
                        </GlareHover>
                    </div>
                    <h1>VALIDATED ONBOARDING</h1>
                    {step === 1 ? (
                        <p>Enter your securely generated Invite Code</p>
                    ) : step === 2 ? (
                        <p>Complete your identity setup</p>
                    ) : (
                        <p>Registration Complete</p>
                    )}
                </div>

                {error && (
                    <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            onSubmit={verifyCode}
                            className="auth-form"
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="input-group">
                                <label>Verification Code</label>
                                <div className="input-wrapper">
                                    <Hash size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="SSD-XXXX-XXXX"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <BounceButton
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading || !inviteCode}
                                style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                            >
                                {loading ? <Loader2 className="spinner" size={18} /> : 'Verify Authorization'}
                            </BounceButton>
                        </motion.form>
                    ) : step === 2 ? (
                        <motion.form
                            key="step2"
                            onSubmit={handleSignup}
                            className="auth-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="auth-success-badge">
                                <CheckCircle2 size={16} />
                                <span>Code Accepted: {validInvite.role} Access Allowed</span>
                            </div>

                            <div className="input-group">
                                <label>Full Name</label>
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Create Password</label>
                                <div className="input-wrapper">
                                    <Key size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <BounceButton
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                                style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                            >
                                {loading ? <Loader2 className="spinner" size={18} /> : 'Create Authorized Identity'}
                            </BounceButton>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="step3"
                            className="auth-success-screen"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', padding: '1rem 0' }}
                        >
                            <div className="success-icon-wrapper" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                <CheckCircle2 size={64} color="#10B981" />
                            </div>
                            <h2 style={{ color: '#F8FAFC', marginBottom: '1rem' }}>Identity Registered</h2>
                            <p style={{ color: '#94A3B8', marginBottom: '2rem', lineHeight: '1.6' }}>
                                Your credentials have been authorized. Please sign in to access the SSD Command Center.
                            </p>
                            <BounceButton
                                onClick={() => navigate('/login')}
                                className="auth-submit-btn"
                                style={{ width: '100%', padding: '14px' }}
                            >
                                Proceed to Login
                            </BounceButton>
                        </motion.div>
                    )}
                </AnimatePresence>

                {step < 3 && (
                    <div className="auth-footer">
                        <p>Already authorized? <Link to="/login">Proceed to Login</Link></p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
