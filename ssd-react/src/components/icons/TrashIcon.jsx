import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "../../lib/utils";

const LID_VARIANTS = {
    normal: { y: 0 },
    animate: {
        y: -2,
        transition: {
            duration: 0.2,
            ease: "easeOut",
        },
    },
};

const TrashIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
                    d="M3 6h18"
                    animate={controls}
                    variants={LID_VARIANTS}
                />
                <motion.path
                    d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    animate={controls}
                    variants={LID_VARIANTS}
                />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
            </svg>
        </div>
    );
});

TrashIcon.displayName = "TrashIcon";

export { TrashIcon };
