import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "../../lib/utils";

const BUILDING_VARIANTS = {
    normal: {
        scaleY: 1,
        opacity: 1,
    },
    animate: {
        scaleY: [1, 1.1, 1],
        transition: {
            duration: 0.5,
            ease: "easeInOut",
            times: [0, 0.5, 1],
        },
    },
};

const WINDOW_VARIANTS = {
    normal: { opacity: 1 },
    animate: {
        opacity: [1, 0.3, 1],
        transition: {
            duration: 0.5,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            staggerChildren: 0.1
        },
    },
};

const BuildingIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => controls.start("animate"),
            stopAnimation: () => controls.start("normal"),
        };
    });

    const handleMouseEnter = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    return (
        <div
            className={cn(className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            <svg
                fill="none"
                height={size}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width={size}
                xmlns="http://www.w3.org/2000/svg"
            >
                <motion.path
                    d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"
                    animate={controls}
                    initial="normal"
                    variants={BUILDING_VARIANTS}
                    style={{ originY: 1 }}
                />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
            </svg>
        </div>
    );
});

BuildingIcon.displayName = "BuildingIcon";

export { BuildingIcon };
