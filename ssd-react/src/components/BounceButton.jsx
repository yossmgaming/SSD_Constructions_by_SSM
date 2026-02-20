import { motion } from 'motion/react';

export default function BounceButton({ children, className = '', ...props }) {
    // Pass through all props (like onClick, disabled, type, style) and append the className
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className={className}
            {...props}
        >
            {children}
        </motion.button>
    );
}
