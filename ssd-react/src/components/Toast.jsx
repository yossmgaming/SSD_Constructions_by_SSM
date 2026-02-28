import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
        
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
    const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
    const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
    const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '380px'
        }}>
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

const Toast = ({ toast, onRemove }) => {
    const { type, message } = toast;
    
    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    const colors = {
        success: { bg: '#ecfdf5', border: '#10b981', icon: '#059669', text: '#065f46' },
        error: { bg: '#fef2f2', border: '#ef4444', icon: '#dc2626', text: '#991b1b' },
        warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#d97706', text: '#92400e' },
        info: { bg: '#eff6ff', border: '#3b82f6', icon: '#2563eb', text: '#1e40af' }
    };

    const style = colors[type] || colors.info;

    return (
        <div style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.3s ease-out',
            backdropFilter: 'blur(8px)'
        }}>
            <span style={{ color: style.icon, flexShrink: 0, marginTop: '2px' }}>
                {icons[type]}
            </span>
            <p style={{
                flex: 1,
                margin: 0,
                fontSize: '14px',
                fontWeight: 500,
                color: style.text,
                lineHeight: 1.5
            }}>
                {message}
            </p>
            <button
                onClick={() => onRemove(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: style.icon,
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    flexShrink: 0
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default ToastProvider;
