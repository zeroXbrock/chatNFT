import { createContext } from 'react';

interface LoadingContextProps {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

export const LoadingContext = createContext<LoadingContextProps>({
    isLoading: false,
    setIsLoading: () => { },
});

export default LoadingContext;
