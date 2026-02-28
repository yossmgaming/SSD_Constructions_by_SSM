import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import { 
    Bell, AlertTriangle, CheckCircle, XCircle, 
    Clock, Info, ChevronRight, RefreshCw 
} from 'lucide-react';
import './AIAlerts.css';

const AIAlerts = () => {
    const { t } = useTranslation();
    const { profile, hasRole } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPanel, setShowPanel] = useState(false);

    // Only admins can see AI alerts
    const canView = hasRole(['Super Admin', 'Finance', 'Project Manager']);

    useEffect(() => {
        if (canView) {
            loadAlerts();
            // Poll for new alerts every 30 seconds
            const interval = setInterval(loadAlerts, 30000);
            return () => clearInterval(interval);
        }
    }, [canView]);

    const loadAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from('ai_alerts')
                .select('*')
                .eq('resolved', false)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error) {
                setAlerts(data || []);
            }
        } catch (err) {
            console.error('Error loading AI alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (alertId) => {
        try {
            const { error } = await supabase
                .from('ai_alerts')
                .update({ 
                    resolved: true, 
                    resolved_by: profile?.id,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', alertId);

            if (!error) {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            }
        } catch (err) {
            console.error('Error resolving alert:', err);
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return <AlertTriangle size={16} className="alert-icon critical" />;
            case 'high':
                return <AlertTriangle size={16} className="alert-icon high" />;
            case 'medium':
                return <Info size={16} className="alert-icon medium" />;
            default:
                return <Info size={16} className="alert-icon low" />;
        }
    };

    const getSeverityClass = (severity) => {
        return `alert-item severity-${severity || 'low'}`;
    };

    if (!canView) return null;

    const criticalCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

    return (
        <div className="ai-alerts-container">
            {/* Badge Trigger */}
            <button 
                className={`ai-alerts-trigger ${criticalCount > 0 ? 'has-alerts' : ''}`}
                onClick={() => setShowPanel(!showPanel)}
            >
                <Bell size={20} />
                {criticalCount > 0 && (
                    <span className="alert-badge">{criticalCount}</span>
                )}
            </button>

            {/* Alert Panel */}
            {showPanel && (
                <div className="ai-alerts-panel">
                    <div className="alerts-panel-header">
                        <h3>
                            <span className="ai-icon">⚡</span>
                            AI Insights
                        </h3>
                        <button 
                            className="refresh-btn"
                            onClick={loadAlerts}
                            disabled={loading}
                        >
                            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                        </button>
                    </div>

                    <div className="alerts-list">
                        {loading ? (
                            <div className="alerts-loading">Loading...</div>
                        ) : alerts.length === 0 ? (
                            <div className="alerts-empty">
                                <CheckCircle size={24} className="text-emerald-400" />
                                <p>All clear! No issues detected.</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={getSeverityClass(alert.severity)}>
                                    <div className="alert-icon-wrapper">
                                        {getSeverityIcon(alert.severity)}
                                    </div>
                                    <div className="alert-content">
                                        <div className="alert-header">
                                            <span className="alert-category">{alert.category}</span>
                                            <span className={`alert-severity ${alert.severity}`}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <h4 className="alert-title">{alert.title}</h4>
                                        <p className="alert-message">{alert.message}</p>
                                        {alert.recommendation && (
                                            <p className="alert-recommendation">
                                                💡 {alert.recommendation}
                                            </p>
                                        )}
                                        <div className="alert-actions">
                                            <span className="alert-time">
                                                {new Date(alert.created_at).toLocaleString()}
                                            </span>
                                            <button 
                                                className="resolve-btn"
                                                onClick={() => handleResolve(alert.id)}
                                            >
                                                <CheckCircle size={12} />
                                                Resolve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="alerts-panel-footer">
                        <span className="powered-by">Powered by AI</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAlerts;
