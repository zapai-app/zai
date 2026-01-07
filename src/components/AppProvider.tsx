import { ReactNode, useEffect } from 'react';
import { z } from 'zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppContext, type AppConfig, type AppContextType, type Theme } from '@/contexts/AppContext';

interface AppProviderProps {
  children: ReactNode;
  /** Application storage key */
  storageKey: string;
  /** Default app configuration */
  defaultConfig: AppConfig;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

// Zod schema for AppConfig validation
const RelayConfigItemSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean(),
});

const AppConfigSchema: z.ZodType<AppConfig, z.ZodTypeDef, unknown> = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relays: z.array(RelayConfigItemSchema).min(1),
});

// Legacy schema kept for migration
const LegacyAppConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayUrl: z.string().url(),
});

export function AppProvider(props: AppProviderProps) {
  const {
    children,
    storageKey,
    defaultConfig,
    presetRelays,
  } = props;

  // App configuration state with localStorage persistence
  const [config, setConfig] = useLocalStorage<AppConfig>(
    storageKey,
    defaultConfig,
    {
      serialize: JSON.stringify,
      deserialize: (value: string) => {
        try {
          const parsed = JSON.parse(value);

          // 1) New config
          const parsedNew = AppConfigSchema.safeParse(parsed);
          if (parsedNew.success) {
            // Defensive: ensure at least one enabled relay
            const hasEnabled = parsedNew.data.relays.some((r) => r.enabled);
            if (hasEnabled) return parsedNew.data;
            return {
              ...parsedNew.data,
              relays: parsedNew.data.relays.map((r, i) => ({ ...r, enabled: i === 0 })),
            };
          }

          // 2) Legacy config migration
          const parsedLegacy = LegacyAppConfigSchema.safeParse(parsed);
          if (parsedLegacy.success) {
            return {
              theme: parsedLegacy.data.theme,
              relays: [{ url: parsedLegacy.data.relayUrl, enabled: true }],
            };
          }

          // 3) Fallback
          return defaultConfig;
        } catch {
          return defaultConfig;
        }
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: AppConfig) => AppConfig) => {
    setConfig(updater);
  };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
    presetRelays,
  };

  // Apply theme effects to document
  useApplyTheme(config.theme);

  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to apply theme changes to the document root
 */
function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}