import React, { useEffect, useState } from 'react';
import { Shield, Lock, Search, Cpu, Zap } from 'lucide-react';
import './SplashScreen.css';

const SplashScreen = () => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Initializing Governance Protocols...');

    useEffect(() => {
        const statuses = [
            'Initializing Governance Protocols...',
            'Accessing Enterprise Intelligence...',
            'Verifying Forensic Integrity...',
            'Resolving Entity Roles...',
            'Decrypting Secure Channels...',
            'Authenticated. Synchronizing...'
        ];

        let current = 0;
        const interval = setInterval(() => {
            current++;
            if (current < statuses.length) {
                setStatus(statuses[current]);
                setProgress((current / statuses.length) * 100);
            }
        }, 600);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <div className="splash-logo-container">
                    <div className="splash-ring"></div>
                    <div className="splash-ring"></div>
                    <Shield size={48} className="splash-icon" />
                </div>

                <h1 className="splash-title">SSD SHIELD</h1>
                <p className="splash-subtitle">Enterprise Construction Management</p>

                <div className="splash-loader-container">
                    <div className="splash-loader-bar">
                        <div
                            className="splash-loader-progress"
                            style={{ width: `${Math.max(progress, 15)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="splash-status">
                    <div className="splash-status-dot"></div>
                    <span className="splash-status-text">{status}</span>
                </div>

                <div className="splash-forensic-data">
                    <div className="data-bit">SEC_MODE: AES-256</div>
                    <div className="data-bit">DB_CONN: RESTRICTED</div>
                    <div className="data-bit">INTEL_CHIP: ACTIVATED</div>
                </div>
            </div>

            <div className="splash-footer">
                <div className="forensic-line"></div>
                <div className="footer-labels">
                    <span>GOVERNANCE_SYSTEM_V3.0</span>
                    <span>RESTRICTED_ACCESS</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
