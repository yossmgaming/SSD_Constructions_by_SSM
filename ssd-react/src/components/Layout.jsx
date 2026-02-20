import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Iridescence from './Iridescence';
import BounceButton from './BounceButton';
import './Layout.css';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <BounceButton className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={24} />
                </BounceButton>
                <div className="mobile-header-title">SSD Constructions</div>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <main className="layout-content">
                <Iridescence
                    color={[0.9, 1, 1]}
                    mouseReact={true}
                    amplitude={0.1}
                    speed={1}
                />
                <div className="layout-inner-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
