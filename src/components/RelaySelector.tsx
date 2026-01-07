import { Check, ChevronsUpDown, Wifi, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";

interface RelaySelectorProps {
  className?: string;
}

export function RelaySelector(props: RelaySelectorProps) {
  const { className } = props;
  const { config, updateConfig, presetRelays = [] } = useAppContext();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // Check if it already has a protocol
    if (trimmed.includes('://')) {
      return trimmed;
    }
    
    // Add wss:// prefix
    return `wss://${trimmed}`;
  };

  const enabledRelays = config.relays.filter((r) => r.enabled);

  const getRelayLabel = (): string => {
    if (enabledRelays.length === 0) return 'No relays enabled';
    if (enabledRelays.length === 1) return enabledRelays[0].url.replace(/^wss?:\/\//, '');
    return `${enabledRelays.length} relays enabled`;
  };

  const upsertRelay = (rawUrl: string, enabled: boolean) => {
    const url = normalizeRelayUrl(rawUrl);
    if (!url) return;

    updateConfig((current) => {
      const normalized = normalizeRelayUrl(url);
      const existing = current.relays.find((r) => r.url === normalized);
      const enabledCount = current.relays.filter((r) => r.enabled).length;

      // Don't allow disabling the last enabled relay
      if (existing && existing.enabled && !enabled && enabledCount <= 1) {
        return current;
      }

      if (existing) {
        return {
          ...current,
          relays: current.relays.map((r) =>
            r.url === normalized ? { ...r, enabled } : r
          ),
        };
      }

      return {
        ...current,
        relays: [...current.relays, { url: normalized, enabled: true }],
      };
    });
  };

  // Handle adding a custom relay
  const handleAddCustomRelay = (url: string) => {
    upsertRelay(url, true);
    setOpen(false);
    setInputValue("");
  };

  // Check if input value looks like a valid relay URL
  const isValidRelayInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    
    // Basic validation - should contain at least a domain-like structure
    const normalized = normalizeRelayUrl(trimmed);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="truncate">
              {getRelayLabel()}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search relays or type URL..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && isValidRelayInput(inputValue) ? (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {inputValue ? "Invalid relay URL" : "No relay found."}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup heading="Enabled">
              {enabledRelays
                .filter((r) =>
                  !inputValue ||
                  r.url.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((relay) => (
                  <CommandItem
                    key={relay.url}
                    value={relay.url}
                    onSelect={(currentValue) => {
                      upsertRelay(currentValue, false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", "opacity-100")} />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {presetRelays.find((p) => p.url === relay.url)?.name ?? relay.url.replace(/^wss?:\/\//, '')}
                      </span>
                      <span className="text-xs text-muted-foreground">{relay.url}</span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>

            <CommandGroup heading="Available">
              {[...new Map([
                ...presetRelays.map((p) => [normalizeRelayUrl(p.url), p] as const),
                ...config.relays.map((r) => [normalizeRelayUrl(r.url), { url: r.url, name: r.url }] as const),
              ]).values()]
                .filter((option) => {
                  const url = normalizeRelayUrl(option.url);
                  if (!url) return false;
                  const alreadyEnabled = enabledRelays.some((r) => r.url === url);
                  if (alreadyEnabled) return false;
                  if (!inputValue) return true;
                  const name = ('name' in option && typeof option.name === 'string') ? option.name : '';
                  return (
                    name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    url.toLowerCase().includes(inputValue.toLowerCase())
                  );
                })
                .map((option) => {
                  const url = normalizeRelayUrl(option.url);
                  const name = ('name' in option && typeof option.name === 'string') ? option.name : undefined;
                  if (!url) return null;
                  return (
                    <CommandItem
                      key={url}
                      value={url}
                      onSelect={(currentValue) => {
                        upsertRelay(currentValue, true);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                      <div className="flex flex-col">
                        <span className="font-medium">{name ?? url.replace(/^wss?:\/\//, '')}</span>
                        <span className="text-xs text-muted-foreground">{url}</span>
                      </div>
                    </CommandItem>
                  );
                })}

              {inputValue && isValidRelayInput(inputValue) && (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}