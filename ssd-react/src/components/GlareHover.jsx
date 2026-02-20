import { useRef } from 'react';
import { motion, useSpring, useMotionTemplate } from 'motion/react';
import './GlareHover.css';

export default function GlareHover({ children, className = '', tiltIntensity = 15, glareIntensity = 0.5 }) {
    const containerRef = useRef(null);

    const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
    const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
    const glareX = useSpring(50, { stiffness: 300, damping: 30 });
    const glareY = useSpring(50, { stiffness: 300, damping: 30 });
    const glareOpacity = useSpring(0, { stiffness: 300, damping: 30 });

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate tilt
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        rotateY.set(xPct * tiltIntensity);
        rotateX.set(-(yPct * tiltIntensity));

        // Calculate glare position
        glareX.set((mouseX / width) * 100);
        glareY.set((mouseY / height) * 100);
        glareOpacity.set(glareIntensity);
    };

    const handleMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
        glareOpacity.set(0);
        // Smoothly return glare to center
        glareX.set(50);
        glareY.set(50);
    };

    const background = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)`;

    return (
        <motion.div
            ref={containerRef}
            className={`glare-container ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="glare-content">
                {children}
            </div>
            <motion.div
                className="glare-effect"
                style={{
                    opacity: glareOpacity,
                    background,
                    mixBlendMode: 'overlay',
                    pointerEvents: 'none',
                }}
            />
        </motion.div>
    );
}
