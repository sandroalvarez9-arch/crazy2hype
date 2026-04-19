import { supabase } from "@/integrations/supabase/client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, MapPin } from "lucide-react";

// Lightweight cache in localStorage
const CACHE_KEY = "geocode_suggest_cache";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Suggestion = { id: string; place_name: string; lat: number; lng: number };

type CacheShape = Record<string, { ts: number; suggestions: Suggestion[] }>; // key = query (lowercased)

function readCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function getCachedSuggestions(query: string): Suggestion[] | null {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return null;
  const cache = readCache();
  const hit = cache[key];
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) return null;
  return hit.suggestions;
}

function setCachedSuggestions(query: string, suggestions: Suggestion[]) {
  const key = query.trim().toLowerCase();
  const cache = readCache();
  cache[key] = { ts: Date.now(), suggestions };
  writeCache(cache);
}

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function LocationAutocompleteInput({ value, onChange, placeholder = "Search parks, venues, or addresses" }: LocationAutocompleteInputProps) {
  const [query, setQuery] = React.useState<string>(value || "");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);

  // Keep internal query in sync when external value changes
  React.useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Debounced fetch of suggestions
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const cached = getCachedSuggestions(q);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
    }

    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("geocode-suggest", {
          body: { query: q },
        });
        if (error) throw error;
        const list = (data?.suggestions || []) as Suggestion[];
        setSuggestions(list);
        setCachedSuggestions(q, list);
        setOpen(list.length > 0);
      } catch (e) {
        // graceful fallback
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              onChange(val);
              if (val.trim().length >= 2) setOpen(true);
            }}
            placeholder={placeholder}
            aria-label="Location"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p>No locations found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching for park names, venue names, or addresses
                </p>
              </div>
            </CommandEmpty>
            {suggestions.map((s) => (
              <CommandItem
                key={s.id}
                value={s.place_name}
                onSelect={() => {
                  onChange(s.place_name);
                  setQuery(s.place_name);
                  setOpen(false);
                }}
                className="cursor-pointer py-3"
              >
                <MapPin className="mr-3 h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{s.place_name.split(',')[0]}</span>
                  {s.place_name.includes(',') && (
                    <span className="truncate text-xs text-muted-foreground">
                      {s.place_name.split(',').slice(1).join(',').trim()}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
