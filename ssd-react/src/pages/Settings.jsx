import { Database, Info, Globe, Check, User, LogOut, ShieldCheck, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import { useAuth } from '../context/AuthContext';
import './Settings.css';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const { user, profile, signOut, hasRole } = useAuth();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'sn', name: 'Sinhala', native: 'සිංහල' }
    ];

    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
    };

    return (
        <GlobalLoadingOverlay loading={false} message="Configuring System Governance...">
            <div className="settings-container page-animate">
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Database size={28} className="header-icon" />
                        {t('settings.title') || 'System Settings'}
                    </h1>
                </div>

                <div className="settings-grid">
                    {/* User Profile Card */}
                    <Card title={t('settings.user_identity')}>
                        <div className="settings-card-content user-profile-card">
                            <div className="profile-main">
                                <div className="profile-avatar">
                                    <User size={32} />
                                </div>
                                <div className="profile-info">
                                    <h3>{profile?.full_name || t('settings.authorized_user')}</h3>
                                    <p className="profile-email">{user?.email}</p>
                                    <div className="role-badge">
                                        <ShieldCheck size={14} style={{ marginRight: '4px' }} />
                                        {profile?.role || t('settings.restricted_access')}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-actions">
                                <button className="logout-btn" onClick={signOut}>
                                    <LogOut size={18} />
                                    {t('settings.terminate_session')}
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Security & Governance (Admin Only) */}
                    {hasRole(['Super Admin', 'Finance']) && (
                        <Card title={t('settings.governance_audit')}>
                            <div className="settings-card-content security-status">
                                <div className="section-intro">
                                    <Lock size={20} className="section-icon" />
                                    <p>{t('settings.system_security')}</p>
                                </div>

                                <div className="status-item">
                                    <span className="status-label">{t('settings.rbac_guard')}</span>
                                    <span className="status-value"><Check size={14} /> {t('settings.active')}</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">{t('settings.truth_engine')}</span>
                                    <span className="status-value"><Check size={14} /> {t('settings.logging')}</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">{t('settings.onboarding')}</span>
                                    <span className="status-value"><Check size={14} /> {t('settings.enforced')}</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Language Selection Card */}
                    <Card title={t('settings.language_selection')}>
                        <div className="settings-card-content">
                            <div className="section-intro">
                                <Globe size={20} className="section-icon" />
                                <p>{t('settings.select_preferred_language')}</p>
                            </div>

                            <div className="language-options">
                                {languages.map((lang) => (
                                    <BounceButton
                                        key={lang.code}
                                        className={`lang-option-card ${i18n.language === lang.code ? 'active' : ''}`}
                                        onClick={() => handleLanguageChange(lang.code)}
                                    >
                                        <div className="lang-info">
                                            <span className="lang-native">{lang.native}</span>
                                            <span className="lang-name">{lang.name}</span>
                                        </div>
                                        {i18n.language === lang.code && (
                                            <div className="active-indicator">
                                                <Check size={16} color="#fff" />
                                            </div>
                                        )}
                                    </BounceButton>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* App Info Card */}
                    <Card title={t('settings.app_info')}>
                        <div className="settings-card-content">
                            <div className="app-branding">
                                <div className="app-logo-circle">
                                    <Info size={32} />
                                </div>
                                <div className="app-details">
                                    <h3>SSD Construction Manager</h3>
                                    <p className="version-pill">
                                        Version 3.0 ({t('settings.enterprise_shield')})
                                    </p>
                                </div>
                            </div>

                            <div className="app-description">
                                <p>{t('settings.governance_footer')}</p>
                                <div className="info-box">
                                    <p>{t('settings.audit_disclaimer')}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </GlobalLoadingOverlay>
    );
}
