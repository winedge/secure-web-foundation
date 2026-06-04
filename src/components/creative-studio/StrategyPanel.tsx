import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Heart, Zap, Sparkles, Tag } from 'lucide-react';
import type { CreativeStrategy } from '@/hooks/use-creative-strategy';

interface Props {
  strategy: CreativeStrategy;
  brandKitLoaded?: boolean;
}

export function StrategyPanel({ strategy, brandKitLoaded }: Props) {
  if (!strategy) return null;
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Strategic Brief
          {brandKitLoaded ? (
            <Badge variant="outline" className="ml-auto text-xs">Brand Kit Applied</Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto text-xs">No Brand Kit | using defaults</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Section icon={<Target className="h-4 w-4" />} label="Objective">
          <p>{strategy.objective}</p>
        </Section>

        {strategy.audience_persona && (
          <Section icon={<Users className="h-4 w-4" />} label={`Persona | ${strategy.audience_persona.name}`}>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Demographics: </span>{strategy.audience_persona.demographics}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Psychographics: </span>{strategy.audience_persona.psychographics}</p>
            {strategy.audience_persona.where_they_hang_out?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {strategy.audience_persona.where_they_hang_out.map((w, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                ))}
              </div>
            )}
          </Section>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Section icon={<Zap className="h-4 w-4 text-orange-500" />} label="Pain Points">
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {strategy.pain_points?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Section>
          <Section icon={<Heart className="h-4 w-4 text-rose-500" />} label="Desires">
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {strategy.desires?.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </Section>
        </div>

        <Section icon={<Sparkles className="h-4 w-4 text-amber-500" />} label="Unique Selling Proposition">
          <p className="font-medium">{strategy.usp}</p>
        </Section>

        {strategy.angles?.length > 0 && (
          <Section label="Creative Angles">
            <div className="grid md:grid-cols-2 gap-2">
              {strategy.angles.map((a) => (
                <div key={a.name} className="border rounded-md p-2 bg-muted/30">
                  <div className="font-medium text-foreground text-xs uppercase tracking-wide">{a.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{a.summary}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Section label="Top Hooks">
            <ul className="space-y-1">
              {strategy.hooks?.map((h, i) => (
                <li key={i} className="text-muted-foreground border-l-2 border-primary/40 pl-2">{h}</li>
              ))}
            </ul>
          </Section>
          <Section label="CTAs">
            <div className="flex flex-wrap gap-1.5">
              {strategy.ctas?.map((c, i) => (
                <Badge key={i} className="bg-primary/10 text-primary border-primary/20" variant="outline">{c}</Badge>
              ))}
            </div>
          </Section>
        </div>

        {strategy.keywords?.length > 0 && (
          <Section icon={<Tag className="h-4 w-4" />} label="Keywords">
            <div className="flex flex-wrap gap-1">
              {strategy.keywords.map((k, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
              ))}
            </div>
          </Section>
        )}

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
          {strategy.tone_recommendation && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tone</div>
              <p className="text-muted-foreground">{strategy.tone_recommendation}</p>
            </div>
          )}
          {strategy.visual_direction && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Visual Direction</div>
              <p className="text-muted-foreground">{strategy.visual_direction}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
