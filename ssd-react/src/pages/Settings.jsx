
import { Database, Info, Globe, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import './Settings.css';

export default function Settings() {
    const { t, i18n } = useTranslation();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'sn', name: 'Sinhala', native: 'සිංහල' }
    ];

    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
    };

    return (
        <div className="settings-container">
            <motion.header
                className="settings-header"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <h1>
                    <Database size={28} className="header-icon" />
                    {t('settings.title')}
                </h1>
            </motion.header>

            <div className="settings-grid">
                {/* Language Selection Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
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
                                            <motion.div
                                                className="active-indicator"
                                                layoutId="activeLangIndicator"
                                            >
                                                <Check size={16} color="#fff" />
                                            </motion.div>
                                        )}
                                    </BounceButton>
                                ))}
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* App Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card title={t('settings.app_info')}>
                        <div className="settings-card-content">
                            <div className="app-branding">
                                <div className="app-logo-circle">
                                    <Info size={32} />
                                </div>
                                <div className="app-details">
                                    <h3>SSD Construction Manager</h3>
                                    <p className="version-pill">
                                        {t('settings.version')} 3.0 (Enterprise)
                                    </p>
                                </div>
                            </div>

                            <div className="app-description">
                                <p>{t('settings.app_description')}</p>
                                <div className="info-box">
                                    <p>{t('settings.data_storage')}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
