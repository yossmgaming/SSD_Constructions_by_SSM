import React, { useState } from 'react';
import { Download, ChevronDown, FileText, FileSpreadsheet, FileBox, FileCode, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import './ExportDropdown.css';

const ExportDropdown = ({ onExport, isLoading, title, label }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const displayTitle = title || label;

    const handleExport = (format) => {
        onExport(format);
        setIsOpen(false);
    };

    return (
        <div className="export-dropdown-container">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="export-trigger-btn"
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                <span>{t('common.export') || 'Export'}</span>
                <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} size={16} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="export-overlay"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="export-menu-card"
                        >
                            <div className="export-menu-header">
                                <span>{displayTitle || t('common.format') || 'FORMAT'}</span>
                            </div>

                            <motion.button
                                whileHover={{ x: 4 }}
                                onClick={() => handleExport('pdf')}
                                className="export-option-btn pdf"
                            >
                                <i><FileText size={18} /></i>
                                <span>PDF Document</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ x: 4 }}
                                onClick={() => handleExport('excel')}
                                className="export-option-btn excel"
                            >
                                <i><FileSpreadsheet size={18} /></i>
                                <span>Excel Spreadsheet</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ x: 4 }}
                                onClick={() => handleExport('word')}
                                className="export-option-btn word"
                            >
                                <i><FileBox size={18} /></i>
                                <span>Word Document</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ x: 4 }}
                                onClick={() => handleExport('csv')}
                                className="export-option-btn csv"
                            >
                                <i><FileCode size={18} /></i>
                                <span>CSV Text File</span>
                            </motion.button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExportDropdown;
