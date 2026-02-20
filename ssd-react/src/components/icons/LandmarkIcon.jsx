'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

const LandmarkIcon = forwardRef(
    (
        {
            onMouseEnter,
            onMouseLeave,
            className,
            size = 28,
            color = 'currentColor',
            ...props
        },
        ref
    ) => {
        const controls = useAnimation();
        const isHovered = useRef(false);

        useImperativeHandle(ref, () => ({
            startAnimation: () => {
                isHovered.current = true;
                controls.start('animate');
            },
            stopAnimation: () => {
                isHovered.current = false;
                controls.start('normal');
            },
        }));

        const handleMouseEnter = useCallback(
            (e) => {
                if (!isHovered.current) {
                    controls.start('animate');
                }
                onMouseEnter?.(e);
            },
            [controls, onMouseEnter]
        );

        const handleMouseLeave = useCallback(
            (e) => {
                if (!isHovered.current) {
                    controls.start('normal');
                }
                onMouseLeave?.(e);
            },
            [controls, onMouseLeave]
        );

        return (
            <div
                className={`cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center ${className || ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <motion.line
                        x1="3"
                        x2="21"
                        y1="22"
                        y2="22"
                        variants={{
                            normal: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } },
                            animate: {
                                pathLength: [0, 1],
                                opacity: [0, 1],
                                transition: { duration: 0.5 },
                            },
                        }}
                    />
                    <motion.line
                        x1="6"
                        x2="6"
                        y1="18"
                        y2="11"
                        variants={{
                            normal: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } },
                            animate: {
                                pathLength: [0, 1],
                                opacity: [0, 1],
                                transition: { duration: 0.5, delay: 0.1 },
                            },
                        }}
                    />
                    <motion.line
                        x1="10"
                        x2="10"
                        y1="18"
                        y2="11"
                        variants={{
                            normal: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } },
                            animate: {
                                pathLength: [0, 1],
                                opacity: [0, 1],
                                transition: { duration: 0.5, delay: 0.2 },
                            },
                        }}
                    />
                    <motion.line
                        x1="14"
                        x2="14"
                        y1="18"
                        y2="11"
                        variants={{
                            normal: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } },
                            animate: {
                                pathLength: [0, 1],
                                opacity: [0, 1],
                                transition: { duration: 0.5, delay: 0.3 },
                            },
                        }}
                    />
                    <motion.line
                        x1="18"
                        x2="18"
                        y1="18"
                        y2="11"
                        variants={{
                            normal: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } },
                            animate: {
                                pathLength: [0, 1],
                                opacity: [0, 1],
                                transition: { duration: 0.5, delay: 0.4 },
                            },
                        }}
                    />
                    <motion.polygon
                        points="12 2 20 7 4 7"
                        variants={{
                            normal: { y: 0, transition: { duration: 0.3 } },
                            animate: {
                                y: [0, -4, 0],
                                transition: { duration: 0.5, ease: 'easeInOut' },
                            },
                        }}
                        animate={controls}
                    />
                </svg>
            </div>
        );
    }
);

LandmarkIcon.displayName = 'LandmarkIcon';

export { LandmarkIcon };
