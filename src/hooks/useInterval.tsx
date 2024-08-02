import { useEffect, useRef } from 'react';

type anyFn = (...kwargs: unknown[]) => void;

export function useInterval(callback: anyFn, delay: number) {
    const savedCallback = useRef<anyFn>();

    // Remember the latest callback function
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        function tick() {
            if (savedCallback.current) {
                savedCallback.current();
            }
        }
        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}
