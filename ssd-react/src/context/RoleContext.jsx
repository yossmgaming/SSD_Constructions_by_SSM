import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../data/supabase';
import { useAuth } from './AuthContext';

const RoleContext = createContext({});

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }) => {
    const { user } = useAuth();
    const [role, setRole] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchRole = async () => {
            if (!user) {
                if (isMounted) {
                    setRole(null);
                    setRoleLoading(false);
                }
                return;
            }

            setRoleLoading(true);
            try {
                // Call the secure Supabase function we created in Phase 1
                const { data, error } = await supabase.rpc('get_user_role');

                if (error) {
                    console.error("Error fetching user role:", error);
                } else if (isMounted) {
                    setRole(data);
                }
            } catch (err) {
                console.error("Unexpected error fetching role:", err);
            } finally {
                if (isMounted) {
                    setRoleLoading(false);
                }
            }
        };

        fetchRole();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const contextValue = useMemo(() => ({
        role,
        roleLoading
    }), [role, roleLoading]);

    return (
        <RoleContext.Provider value={contextValue}>
            {children}
        </RoleContext.Provider>
    );
};
