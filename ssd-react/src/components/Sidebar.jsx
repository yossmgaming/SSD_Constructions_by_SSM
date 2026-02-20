import { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutPanelTopIcon } from './icons/LayoutPanelTopIcon';
import { ConstructionIcon } from './icons/ConstructionIcon';
import { SmileIcon } from './icons/SmileIcon';
import { TruckIcon } from './icons/TruckIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { CalendarCheckIcon } from './icons/CalendarCheckIcon';
import { ChartSplineIcon } from './icons/ChartSplineIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { HandCoinsIcon } from './icons/HandCoinsIcon';
import { CogIcon } from './icons/CogIcon';
import { PackageIcon } from './icons/PackageIcon';
import { LandmarkIcon } from './icons/LandmarkIcon';
import GradientText from './GradientText';
import GlareHover from './GlareHover';
import logoSrc from '../../Logo/Logo_16-9.png';
import './Sidebar.css';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutPanelTopIcon },
    { to: '/projects', label: 'Projects', icon: ConstructionIcon },
    { to: '/workers', label: 'Workers', icon: SmileIcon },
    { to: '/materials', label: 'Materials', icon: PackageIcon },
    { to: '/suppliers', label: 'Suppliers', icon: TruckIcon },
    { to: '/payments', label: 'Payments', icon: DollarSignIcon },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheckIcon },
    { to: '/reports', label: 'Reports', icon: ChartSplineIcon },
];

const financeItems = [
    { to: '/project-overview', label: 'Project Overview', icon: BuildingIcon },
    { to: '/bank-accounts', label: 'Bank Accounts', icon: LandmarkIcon },
];

const toolItems = [
    { to: '/boq-generator', label: 'BOQ Generator', icon: CalculatorIcon },
    { to: '/advances', label: 'Advances', icon: ClipboardIcon },
    { to: '/rates', label: 'Rates', icon: HandCoinsIcon },
];



export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();

    const NavItem = ({ item }) => {
        const iconRef = useRef(null);
        return (
            <NavLink
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                end={item.to === '/'}
                onClick={onClose}
                onMouseEnter={() => iconRef.current?.startAnimation?.()}
                onMouseLeave={() => iconRef.current?.stopAnimation?.()}
            >
                <item.icon ref={iconRef} className="sidebar-link-icon" size={20} />
                <GradientText
                    colors={['#ffffff', '#fdb186', '#e6631b']}
                    animationSpeed={6}
                    showBorder={false}
                    className="sidebar-link-text"
                >
                    {item.label}
                </GradientText>
            </NavLink>
        );
    };

    const renderLink = (item) => <NavItem key={item.to} item={item} />;

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <GlareHover className="sidebar-logo-glare-wrapper">
                    <div className="sidebar-logo">
                        <img src={logoSrc} alt="SSD Constructions" className="sidebar-logo-img" />
                    </div>
                </GlareHover>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(renderLink)}

                <div className="sidebar-divider" />
                <div className="sidebar-section-label">Finance</div>
                {financeItems.map(renderLink)}

                <div className="sidebar-divider" />
                <div className="sidebar-section-label">Tools</div>
                {toolItems.map(renderLink)}
                <div className="sidebar-section-label">System</div>
                <NavItem item={{ to: '/settings', label: 'Settings', icon: CogIcon }} />
            </nav>

            <div className="sidebar-footer">
                <span className="sidebar-footer-text">SSD Construction Manager V 2.0</span>
            </div>
        </aside>
    );
}
