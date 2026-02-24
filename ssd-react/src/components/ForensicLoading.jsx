import React from 'react';
import { RefreshCw } from 'lucide-react';
import './ForensicLoading.css';

const ForensicLoading = ({ message = "Analysing Intelligence Data..." }) => {
    return (
        <div className="forensic-loading-container">
            <div className="forensic-loading-text">
                <RefreshCw size={20} className="animate-spin" />
                {message}
            </div>
        </div>
    );
};

export default ForensicLoading;
