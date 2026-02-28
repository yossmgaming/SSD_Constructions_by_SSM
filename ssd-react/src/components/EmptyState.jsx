import React from 'react';
import { FolderOpen, FileText, Users, Package, AlertCircle, Clock, Inbox, Search } from 'lucide-react';

const EmptyState = ({ 
    icon = 'folder', 
    title = 'No data found', 
    description = 'There are no items to display.',
    actionLabel,
    onAction,
    size = 'medium'
}) => {
    const icons = {
        folder: FolderOpen,
        file: FileText,
        users: Users,
        package: Package,
        alert: AlertCircle,
        clock: Clock,
        inbox: Inbox,
        search: Search
    };

    const IconComponent = icons[icon] || FolderOpen;

    const sizes = {
        small: { icon: 32, padding: 24 },
        medium: { icon: 48, padding: 32 },
        large: { icon: 64, padding: 40 }
    };

    const sizeConfig = sizes[size] || sizes.medium;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${sizeConfig.padding}px`,
            textAlign: 'center',
            minHeight: '200px'
        }}>
            <div style={{
                width: sizeConfig.icon + 24,
                height: sizeConfig.icon + 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
            }}>
                <IconComponent size={sizeConfig.icon} style={{ color: '#94a3b8' }} />
            </div>
            
            <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#334155',
                lineHeight: 1.4
            }}>
                {title}
            </h3>
            
            <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#64748b',
                maxWidth: '300px',
                lineHeight: 1.6
            }}>
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
