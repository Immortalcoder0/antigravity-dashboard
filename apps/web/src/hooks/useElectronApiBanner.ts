import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseElectronApiBannerInput {
  isElectron: boolean;
  initialLoading: boolean;
  quotaError: string | null;
  accountsNetworkError: boolean;
}

export interface UseElectronApiBannerResult {
  visible: boolean;
  dismiss: () => void;
}

/**
 * Surfaces API connectivity problems prominently in Electron (desktop) using
 * quota hook errors and the accounts bootstrap fetch outcome.
 */
export function useElectronApiBanner({
  isElectron,
  initialLoading,
  quotaError,
  accountsNetworkError,
}: UseElectronApiBannerInput): UseElectronApiBannerResult {
  const [dismissed, setDismissed] = useState(false);

  const unhealthy = Boolean(quotaError || accountsNetworkError);

  useEffect(() => {
    if (unhealthy) {
      setDismissed(false);
    }
  }, [unhealthy]);

  const visible = useMemo(
    () => isElectron && !initialLoading && unhealthy && !dismissed,
    [isElectron, initialLoading, unhealthy, dismissed],
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return { visible, dismiss };
}
