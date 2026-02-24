import { useState, useEffect } from 'react';

/**
 * Custom hook to process heavy data operations asynchronously,
 * preventing them from blocking the JavaScript main thread.
 * 
 * @param {Function} asyncFn - A function that returns a Promise resolving to the computed data.
 * @param {Array} dependencies - The dependencies array (same as useMemo/useEffect).
 * @param {any} initialData - The initial state before computation finishes.
 * @returns {Object} { data, isComputing }
 */
export function useAsyncData(asyncFn, dependencies, initialData = null) {
    const [data, setData] = useState(initialData);
    const [isComputing, setIsComputing] = useState(true);

    // Synchronous state reset: If dependencies change, flip isComputing to true immediately
    // during the render phase to avoid the "flicker" gap before useEffect runs.
    const [prevDeps, setPrevDeps] = useState(dependencies);
    if (dependencies.some((dep, i) => dep !== prevDeps[i])) {
        setPrevDeps(dependencies);
        setIsComputing(true);
    }

    useEffect(() => {
        let isMounted = true;
        // The sync check above already sets this, but we keep it here for safety.
        setIsComputing(true);

        const timeoutId = setTimeout(() => {
            asyncFn().then(result => {
                if (isMounted) {
                    setData(result);
                    setIsComputing(false);
                }
            }).catch(err => {
                console.error("useAsyncData computation failed:", err);
                if (isMounted) setIsComputing(false);
            });
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);

    return { data, isComputing };
}
