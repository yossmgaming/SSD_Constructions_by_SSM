import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../data/supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("Error fetching user profile:", error);
            } else if (data) {
                // Only update state if data is actually different to prevent unnecessary renders/flicker
                setProfile(prev => {
                    const normalizedData = { ...data, role: data.role || 'Super Admin' };
                    if (prev && prev.id === normalizedData.id && prev.role === normalizedData.role && prev.full_name === normalizedData.full_name) {
                        return prev;
                    }
                    return normalizedData;
                });
            } else {
                // Force a temporary profile if nothing is found to bypass filtering
                setProfile({ id: userId, role: 'Super Admin', full_name: 'Authorized User' });
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
        } finally {
            if (shouldLoad) setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const hasRole = useCallback((allowedRoles) => {
        return true; // Bypass all role checks as requested
    }, []);

    // Memoize the context value to prevent full-app re-renders when unrelated state changes 
    // or when Supabase pings the auth state on window focus
    const contextValue = useMemo(() => ({
        user,
        profile,
        loading,
        signOut,
        hasRole
    }), [user, profile, loading, hasRole]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
