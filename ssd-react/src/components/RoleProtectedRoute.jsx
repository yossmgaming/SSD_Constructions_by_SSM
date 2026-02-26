import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import GlobalLoadingOverlay from './GlobalLoadingOverlay';

export const RoleProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading: authLoading } = useAuth();
    const { role, roleLoading } = useRole();
    const location = useLocation();

    if (authLoading || roleLoading) {
        return <GlobalLoadingOverlay loading={true} message="Authenticating Role & Permissions..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Determine if user has access
    // If no roles specified, it's just a general protected route
    // Note: Assuming 'super_admin' always has access everywhere
    const hasAccess = !allowedRoles || role === 'super_admin' || allowedRoles.includes(role);

    if (!hasAccess) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0D0E15', color: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#EF4444' }}>Access Denied</h1>
                <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>Your current role ({role || 'Unassigned'}) does not have permission to view this module.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => window.history.back()}
                        style={{ background: '#334155', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return children || <Outlet />;
};
