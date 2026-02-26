import { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { UsersIcon } from './icons/UsersIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { KeyIcon, HardHat } from 'lucide-react'; // lucide imports
import GradientText from './GradientText';
import GlareHover from './GlareHover';
import logoSrc from '../../Logo/Logo_16-9.png';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';
// Import useAuth
import './Sidebar.css';

const navItems = [
    { to: '/', label: 'nav.dashboard', icon: LayoutPanelTopIcon },
    { to: '/projects', label: 'nav.projects', icon: ConstructionIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/clients', label: 'nav.clients', icon: UsersIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/workers', label: 'nav.workers', icon: SmileIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/materials', label: 'nav.materials', icon: PackageIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/suppliers', label: 'nav.suppliers', icon: TruckIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/subcontractors', label: 'nav.subcontractors', icon: HardHat, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/payments', label: 'nav.payments', icon: DollarSignIcon, roles: ['Super Admin', 'Finance'] },
    { to: '/attendance', label: 'nav.attendance', icon: CalendarCheckIcon, roles: ['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'] },
    { to: '/reports', label: 'nav.reports', icon: ChartSplineIcon, roles: ['Super Admin', 'Finance', 'Project Manager'] },
];

const financeItems = [
    { to: '/project-overview', label: 'nav.project_overview', icon: BuildingIcon },
    { to: '/bank-accounts', label: 'nav.bank_accounts', icon: LandmarkIcon },
];

const toolItems = [
    { to: '/boq-generator', label: 'nav.boq_generator', icon: CalculatorIcon, roles: ['Super Admin', 'Finance', 'Project Manager'] },
    { to: '/agreements', label: 'nav.agreements', icon: FileTextIcon, roles: ['Super Admin', 'Finance', 'Project Manager'] },
    { to: '/advances', label: 'nav.advances', icon: ClipboardIcon, roles: ['Super Admin', 'Finance'] },
    { to: '/rates', label: 'nav.rates', icon: HandCoinsIcon, roles: ['Super Admin', 'Finance'] },
    { to: '/personnel-command', label: 'nav.personnel_command', icon: Shield, roles: ['Super Admin', 'Finance'] }
];

const settingsItem = { to: '/settings', label: 'nav.settings', icon: CogIcon };

const systemItems = [
    { to: '/settings', label: 'nav.settings', icon: CogIcon }
];

const NavItem = ({ item, onClose, t }) => {
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
                {t(item.label)}
            </GradientText>
        </NavLink>
    );
};

export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { hasRole } = useAuth();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const renderLink = (item) => {
        if (item.roles && !hasRole(item.roles)) return null;
        if (item.adminOnly && !hasRole(['Super Admin', 'Finance'])) return null;
        return <NavItem key={item.to} item={item} onClose={onClose} t={t} />;
    };



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

                {hasRole(['Super Admin', 'Finance']) && (
                    <>
                        <div className="sidebar-divider" />
                        <div className="sidebar-section-label">{t('nav.finance')}</div>
                        {financeItems.map(renderLink)}
                    </>
                )}

                <div className="sidebar-divider" />
                <div className="sidebar-section-label">{t('nav.tools')}</div>
                {toolItems.map(renderLink)}
                <div className="sidebar-section-label">{t('nav.system')}</div>
                {systemItems.map(renderLink)}
            </nav>

            <div className="sidebar-footer">
                <span className="sidebar-footer-text">SSD Construction Manager V 3.0</span>
            </div>
        </aside>
    );
}
