import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "../../lib/utils";

const CLOCK_VARIANTS = {
    normal: { rotate: 0 },
    animate: { rotate: 360, transition: { duration: 0.6, ease: "linear" } }
};

const CalendarClockIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => controls.start("animate"),
            stopAnimation: () => controls.start("normal"),
        };
    });

    const handleMouseEnter = useCallback((e) => {
        if (isControlledRef.current) onMouseEnter?.(e);
        else controls.start("animate");
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e) => {
        if (isControlledRef.current) onMouseLeave?.(e);
        else controls.start("normal");
    }, [controls, onMouseLeave]);

    return (
        <div className={cn(className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
            <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
                <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h5" />
                <path d="M17.5 17.5 16 16.25V14" />
                <motion.circle cx="16" cy="16" r="6" animate={controls} variants={CLOCK_VARIANTS} />
            </svg>
        </div>
    );
});

CalendarClockIcon.displayName = "CalendarClockIcon";
export { CalendarClockIcon };
