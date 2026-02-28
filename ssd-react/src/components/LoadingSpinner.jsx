import React from 'react';

const LoadingSpinner = ({ 
    size = 'medium', 
    color = 'primary',
    text = '',
    centered = false,
    overlay = false 
}) => {
    const sizes = {
        small: { spinner: 20, text: 12 },
        medium: { spinner: 32, text: 14 },
        large: { spinner: 44, text: 16 }
    };

    const colors = {
        primary: '#3b82f6',
        white: '#ffffff',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
    };

    const config = sizes[size] || sizes.medium;
    const spinnerColor = colors[color] || colors.primary;

    const spinnerStyle = {
        width: config.spinner,
        height: config.spinner,
        border: `${config.spinner / 8}px solid ${spinnerColor}20`,
        borderTop: `${config.spinner / 8}px solid ${spinnerColor}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    };

    const containerStyle = centered ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '32px'
    } : {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    const overlayStyle = overlay ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        borderRadius: 'inherit'
    } : {};

    return (
        <div style={overlay ? { ...containerStyle, ...overlayStyle, position: 'relative' } : containerStyle}>
            <div style={spinnerStyle} />
            {text && (
                <span style={{
                    fontSize: config.text,
                    color: '#64748b',
                    fontWeight: 500
                }}>
                    {text}
                </span>
            )}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) => (
    <div style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style
    }}>
        <style>{`
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `}</style>
    </div>
);

export const CardSkeleton = () => (
    <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <div style={{ flex: 1 }}>
                <Skeleton width="60%" height="14px" style={{ marginBottom: '8px' }} />
                <Skeleton width="40%" height="12px" />
            </div>
        </div>
        <Skeleton width="100%" height="60px" />
    </div>
);

export default LoadingSpinner;
