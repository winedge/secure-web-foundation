import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Locate } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [
  'Global',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Mumbai, India',
  'Delhi, India',
  'Bengaluru, India',
  'Hyderabad, India',
  'Chennai, India',
  'Ahmedabad, India',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'France',
  'Japan',
];

export function LocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const isCustom = value && !PRESETS.includes(value);
  const [mode, setMode] = useState<'preset' | 'custom'>(isCustom ? 'custom' : 'preset');

  async function autoDetect() {
    setDetecting(true);
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Geo lookup failed');
      const data = await res.json();
      const parts = [data.city, data.region, data.country_name].filter(Boolean);
      const loc = parts.join(', ') || data.country_name || 'Unknown';
      onChange(loc);
      setMode('custom');
      toast.success(`Detected: ${loc}`);
    } catch {
      toast.error('Could not auto-detect location. Please pick one manually.');
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {mode === 'preset' ? (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select a location" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="flex-1"
            placeholder="City, Country"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={autoDetect}
          disabled={detecting}
          title="Auto-detect my location"
        >
          {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
        </Button>
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground underline"
        onClick={() => setMode(mode === 'preset' ? 'custom' : 'preset')}
      >
        {mode === 'preset' ? 'Enter custom location' : 'Pick from list'}
      </button>
    </div>
  );
}
