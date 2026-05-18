import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { LANDING_THEMES, type LandingTheme } from '@/lib/landing-themes';
import { cn } from '@/lib/utils';

interface ThemeGalleryProps {
  selectedKey: string | null | undefined;
  onSelect: (theme: LandingTheme) => void;
}

export function ThemeGallery({ selectedKey, onSelect }: ThemeGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {LANDING_THEMES.map((theme) => {
        const isSelected = theme.key === selectedKey;
        return (
          <button
            key={theme.key}
            type="button"
            onClick={() => onSelect(theme)}
            className={cn(
              'group text-left rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg',
              isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
            )}
          >
            {/* Mini preview */}
            <div
              className="h-32 relative overflow-hidden"
              style={{ background: theme.colors.background }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-7"
                style={{ background: theme.colors.primary }}
              />
              <div className="absolute top-10 left-3 right-3 space-y-1.5">
                <div
                  className="h-2.5 w-3/4 rounded"
                  style={{ background: theme.colors.primary, opacity: 0.85 }}
                />
                <div
                  className="h-1.5 w-1/2 rounded"
                  style={{ background: theme.colors.primary, opacity: 0.45 }}
                />
              </div>
              <div
                className="absolute bottom-3 left-3 h-6 w-20 rounded text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: theme.colors.accent }}
              >
                Get Started
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="p-3 bg-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{theme.name}</h3>
                <div className="flex gap-1">
                  <span className="h-3 w-3 rounded-full border" style={{ background: theme.colors.primary }} />
                  <span className="h-3 w-3 rounded-full border" style={{ background: theme.colors.accent }} />
                  <span className="h-3 w-3 rounded-full border" style={{ background: theme.colors.background }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{theme.tagline}</p>
              <Badge variant="outline" className="text-[10px] py-0">{theme.bestFor}</Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
