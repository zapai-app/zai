import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relays.filter((r) => r.enabled).map((r) => r.url));

  // Update refs when config changes
  useEffect(() => {
    const enabled = config.relays.filter((r) => r.enabled).map((r) => r.url);
    relayUrls.current = enabled.length > 0 ? enabled : config.relays.slice(0, 1).map((r) => r.url);
    queryClient.resetQueries();
  }, [config.relays, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        return new Map(relayUrls.current.map((url) => [url, filters] as const));
      },
      eventRouter(_event: NostrEvent) {
        // Publish to the configured relay pool
        return relayUrls.current;
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;