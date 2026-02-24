import React from 'react';
import { RefreshCw } from 'lucide-react';
import './GlobalLoadingOverlay.css';

const GlobalLoadingOverlay = ({ loading, message = "Analysing Intelligence Data...", children }) => {
    return (
        <div className={`global-loading-wrapper ${loading ? 'is-loading' : ''}`}>
            {/* The actual page content is always rendered underneath to maintain layout structure */}
            <div className="global-loading-content">
                {children}
            </div>

            {/* The blur and spinning indicator shows up on top when loading */}
            {loading && (
                <div className="global-loading-overlay">
                    <div className="global-loading-scanner">
                        <RefreshCw size={24} className="animate-spin-fast" />
                        <span>{message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalLoadingOverlay;
