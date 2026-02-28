import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserNotifications, markNotificationAsRead } from '../data/db-extensions';
import LoadingSpinner from './LoadingSpinner';

const NotificationBell = ({ size = 'medium' }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await getUserNotifications(user.id);
            setNotifications(data || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success': return <Check size={14} className="text-emerald-500" />;
            case 'error': return <AlertCircle size={14} className="text-rose-500" />;
            case 'warning': return <AlertCircle size={14} className="text-amber-500" />;
            default: return <Info size={14} className="text-blue-500" />;
        }
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const sizes = {
        small: { bell: 16, dot: 8 },
        medium: { bell: 20, dot: 10 },
        large: { bell: 24, dot: 12 }
    };
    const config = sizes[size] || sizes.medium;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                style={{ padding: '8px' }}
            >
                <Bell size={config.bell} />
                {unreadCount > 0 && (
                    <span 
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center font-bold"
                        style={{ 
                            minWidth: `${config.dot}px`, 
                            height: `${config.dot}px`,
                            fontSize: `${config.dot - 4}px`,
                            padding: '0 4px'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                    style={{ maxHeight: '480px', overflowY: 'auto' }}
                >
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 flex items-center justify-center">
                            <LoadingSpinner text="Loading..." />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                <Bell size={20} className="text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-500">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                {notification.title || 'Notification'}
                                            </p>
                                            {notification.message && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Clock size={10} className="text-slate-400" />
                                                <span className="text-xs text-slate-400">
                                                    {formatTimeAgo(notification.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={() => { loadNotifications(); setIsOpen(false); }}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
