import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Mic, MicOff, X, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AiSearchResult {
  lead_id: string;
  relevance_score: number;
  match_reason: string;
}

export interface AiSearchInterpretation {
  tags: string[];
  summary: string;
}

interface AiSearchBarProps {
  onResults: (results: AiSearchResult[] | null, interpretation: AiSearchInterpretation | null) => void;
  isActive: boolean;
}

export function AiSearchBar({ onResults, isActive }: AiSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interpretation, setInterpretation] = useState<AiSearchInterpretation | null>(null);
  const recognitionRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onResults(null, null);
      setInterpretation(null);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use AI search');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-lead-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ query: searchQuery }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Search failed' }));
        toast.error(err.error || 'AI search failed');
        return;
      }

      const data = await response.json();
      onResults(data.results, data.interpretation);
      setInterpretation(data.interpretation);
    } catch (err) {
      console.error('AI search error:', err);
      toast.error('AI search failed');
    } finally {
      setIsSearching(false);
    }
  }, [onResults]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      onResults(null, null);
      setInterpretation(null);
      return;
    }
    // Debounce: wait 800ms after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 800);
  };

  const handleClear = () => {
    setQuery('');
    onResults(null, null);
    setInterpretation(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      performSearch(query);
    }
  };

  // Voice recognition using Web Speech API
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice search is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setQuery(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        performSearch(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      const errType = event?.error || 'unknown';
      if (errType === 'not-allowed') {
        toast.error('Microphone access denied. If using the preview, open the published site for voice search.', { duration: 5000 });
      } else if (errType === 'no-speech') {
        toast.info('No speech detected. Try again.');
      } else {
        toast.error(`Voice recognition error: ${errType}`);
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className={cn(
        "relative flex items-center gap-2 rounded-xl border-2 bg-background px-4 py-2 transition-all",
        isActive ? "border-primary shadow-lg shadow-primary/10" : "border-border",
        isSearching && "border-primary/50"
      )}>
        {isSearching ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
        )}
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search leads with AI... (e.g. "Ozempic Florida BMI > 30")'
          className="border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60 px-0"
        />
        <div className="flex items-center gap-1 shrink-0">
          {query && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant={isListening ? "destructive" : "ghost"}
            size="icon"
            className={cn("h-8 w-8", isListening && "animate-pulse")}
            onClick={toggleVoice}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Interpretation Tags */}
      {interpretation && interpretation.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">AI understood:</span>
          {interpretation.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
