import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import Iridescence from './Iridescence';
import BounceButton from './BounceButton';
import GlobalLoadingOverlay from './GlobalLoadingOverlay';
import NotificationBell from './NotificationBell';
import AIAlerts from './AIAlerts';
import './Layout.css';

const IRIDESCENCE_COLOR = [0.9, 1, 1];

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <BounceButton className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={24} />
                </BounceButton>
                <div className="mobile-header-title">SSD Constructions</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AIAlerts />
                    <NotificationBell size="small" />
                </div>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <main className="layout-content">
                {isDesktop && (
                    <Iridescence
                        color={IRIDESCENCE_COLOR}
                        mouseReact={true}
                        amplitude={0.1}
                        speed={1}
                    />
                )}
                <div className="layout-inner-content">
                    <AnimatePresence>
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{ height: '100%' }}
                        >
                            <Suspense fallback={<GlobalLoadingOverlay loading={true} message="Synthesizing Module..." />}>
                                <Outlet />
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
