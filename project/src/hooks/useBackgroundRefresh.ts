import { useEffect, useRef, useCallback } from 'react';

interface UseBackgroundRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
  onRefresh: () => Promise<void> | void;
}

export const useBackgroundRefresh = ({
  intervalMs = 10000, // 10 seconds default
  enabled = true,
  onRefresh
}: UseBackgroundRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const startBackgroundRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled) {
      intervalRef.current = setInterval(async () => {
        try {
          await onRefresh();
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      }, intervalMs);
    }
  }, [enabled, intervalMs, onRefresh]);

  const stopBackgroundRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start background refresh after initial load
  useEffect(() => {
    if (enabled && !isInitializedRef.current) {
      // Start background refresh after initial data is loaded
      const timer = setTimeout(() => {
        startBackgroundRefresh();
        isInitializedRef.current = true;
      }, 1000); // Start after 1 second to ensure initial data is loaded

      return () => {
        clearTimeout(timer);
        stopBackgroundRefresh();
      };
    }
  }, [enabled, startBackgroundRefresh, stopBackgroundRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundRefresh();
    };
  }, [stopBackgroundRefresh]);

  return {
    startBackgroundRefresh,
    stopBackgroundRefresh
  };
}; 