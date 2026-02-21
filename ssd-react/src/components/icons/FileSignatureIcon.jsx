import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "../../lib/utils";

const DASH_VARIANTS = {
    normal: { pathLength: 1, opacity: 1 },
    animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.3 } }
};

const FileSignatureIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
                <path d="M20 19.5a2.5 2.5 0 0 1-5 0c0-1.5 6-3 6-3s-1.5-6-3-6c-2 0-3.5 1.5-3.5 4v9" />
                <path d="M10 20v-5.5c0-1.38.8-2.5 2-2.5h.5" />
                <path d="M15 4V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6" />
                <motion.path
                    d="m16 10-2-2"
                    animate={controls}
                    variants={DASH_VARIANTS}
                />
            </svg>
        </div>
    );
});

FileSignatureIcon.displayName = "FileSignatureIcon";

export { FileSignatureIcon };
