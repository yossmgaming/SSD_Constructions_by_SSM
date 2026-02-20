import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import BounceButton from './BounceButton';

export default function Modal({ isOpen, onClose, title, subtitle, children, onSave, saveText = "Save Details" }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="modal-content"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing it
                >
                    {title && <h2>{title}</h2>}
                    {subtitle && <p className="modal-subtitle">{subtitle}</p>}

                    <div className="modal-body">
                        {children}
                    </div>

                    <div className="modal-actions">
                        <BounceButton className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </BounceButton>
                        {onSave && (
                            <BounceButton className="btn btn-primary" onClick={onSave}>
                                {saveText}
                            </BounceButton>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
