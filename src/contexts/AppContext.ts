import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export interface RelayConfigItem {
  /** Relay WebSocket URL (wss://...) */
  url: string;
  /** Whether this relay is enabled for reads/writes */
  enabled: boolean;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Relay pool configuration */
  relays: RelayConfigItem[];
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
