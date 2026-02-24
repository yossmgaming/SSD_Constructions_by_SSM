import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import GlobalLoadingOverlay from './GlobalLoadingOverlay';

export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, profile, loading, hasRole } = useAuth();
    const location = useLocation();

    if (loading) {
        return <GlobalLoadingOverlay loading={true} message="Authenticating Governance Layer..." />;
    }

    if (!user) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !hasRole(allowedRoles)) {
        // User is logged in but doesn't have the required role
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0D0E15', color: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#EF4444' }}>Access Denied</h1>
                <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>You do not have the required permissions ({allowedRoles.join(' or ')}) to view this module.</p>
                <button
                    onClick={() => window.history.back()}
                    style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return children || <Outlet />;
};
