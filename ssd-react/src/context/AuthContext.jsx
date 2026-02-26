import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../data/supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [identity, setIdentity] = useState(null); // Linked person record (worker/client/supplier/etc.)
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id, true);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchProfile(session.user.id, false);
            } else {
                setProfile(null);
                setLoading(false);

                // Only redirect to login if we are NOT on a public auth page
                const publicPages = ['/login', '/signup'];
                if (!publicPages.includes(window.location.pathname)) {
                    navigate('/login');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const fetchProfile = async (userId, shouldLoad = false) => {
        if (shouldLoad) setLoading(true);
        try {
            // Get current session for JWT fallback
            const { data: { session } } = await supabase.auth.getSession();
            const jwtRole = session?.user?.user_metadata?.role || 'Worker';

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            let activeProfile = null;

            if (error) {
                console.warn("DB Profile Fetch delayed or restricted. Fallback to JWT context:", error.message);
                // Fallback to JWT and base info if DB is restricted
                activeProfile = {
                    id: userId,
                    role: jwtRole,
                    full_name: session?.user?.user_metadata?.full_name || 'Authorized User',
                    target_id: session?.user?.user_metadata?.target_id || null
                };
            } else if (data) {
                activeProfile = { ...data, role: data.role || 'Worker' };
            } else {
                activeProfile = {
                    id: userId,
                    role: jwtRole,
                    full_name: 'New User',
                    target_id: session?.user?.user_metadata?.target_id || null
                };
            }

            // Set the profile state
            setProfile(prev => {
                if (prev && prev.id === activeProfile.id && prev.role === activeProfile.role && prev.full_name === activeProfile.full_name && prev.target_id === activeProfile.target_id) {
                    return prev;
                }
                return activeProfile;
            });

            // ── Identity Hydration ───────────────────────────────────────────
            // Resolve the linked person record (worker/client/supplier/etc.)
            // We use activeProfile which contains target_id from EITHER DB or JWT
            if (activeProfile.target_id && activeProfile.role !== 'Super Admin') {
                try {
                    const { data: linkedIdentity, error: identityError } = await supabase.rpc('get_my_identity');
                    if (!identityError && linkedIdentity) {
                        setIdentity(linkedIdentity);
                        console.log(`[Auth] Identity resolved for ${activeProfile.role}:`, linkedIdentity);
                    } else if (identityError) {
                        console.error('[Auth] RPC get_my_identity failed:', identityError.message);
                    }
                } catch (identityErr) {
                    console.error('[Auth] CRITICAL: Identity hydration failed. Did you run the SQL migrations from the walkthrough?', identityErr.message);
                }
            } else {
                setIdentity(null);
            }
            // ─────────────────────────────────────────────────────────────────
        } catch (err) {
            console.error("Critical Auth Error:", err);
        } finally {
            if (shouldLoad) setLoading(false);
        }
    };

    const signOut = async () => {
        setIdentity(null);
        await supabase.auth.signOut();
        navigate('/login');
    };

    const hasRole = useCallback((allowedRoles) => {
        if (!profile?.role) return false;
        if (profile.role === 'Super Admin') return true;
        if (!allowedRoles) return true;

        // Support both array and single string
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        return rolesArray.includes(profile.role);
    }, [profile]);

    // Memoize the context value to prevent full-app re-renders when unrelated state changes 
    // or when Supabase pings the auth state on window focus
    const contextValue = useMemo(() => ({
        user,
        profile,
        identity,  // The resolved person record from workers/clients/suppliers
        loading,
        signOut,
        hasRole
    }), [user, profile, identity, loading, hasRole]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
