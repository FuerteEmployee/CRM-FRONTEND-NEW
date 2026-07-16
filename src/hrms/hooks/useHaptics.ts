import { useCallback } from 'react';

export const useHaptics = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore errors if vibrate is blocked or not supported
      }
    }
  }, []);

  const lightImpact = () => vibrate(10);
  const mediumImpact = () => vibrate(20);
  const heavyImpact = () => vibrate(40);
  const successImpact = () => vibrate([10, 30, 10]);
  const errorImpact = () => vibrate([50, 50, 50]);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    successImpact,
    errorImpact,
  };
};
