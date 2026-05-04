import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Link2, ListChecks } from 'lucide-react';

interface Props { title: string; desc: string; Icon: typeof KeyRound; }

function ToolPlaceholder({ title, desc, Icon }: Props) {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Icon className="h-7 w-7 text-primary" /> {title}
          </h1>
          <p className="text-muted-foreground mt-1">{desc}</p>
        </header>
        <Card>
          <CardHeader><CardTitle>Coming online</CardTitle><CardDescription>This intermediate SEO tool is being wired up to the AI Gateway.</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For now, run a Deep Scan from the SEO Suite hub to get a full audit including these signals.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export function SeoKeywords() {
  return <ToolPlaceholder title="Keyword Research" desc="AI-powered keyword discovery, intent grouping, and difficulty scoring." Icon={KeyRound} />;
}
export function SeoBacklinks() {
  return <ToolPlaceholder title="Backlink Audit" desc="Quality, toxicity, and outreach opportunity analysis." Icon={Link2} />;
}
export function SeoCitations() {
  return <ToolPlaceholder title="Local Citations" desc="NAP consistency check across major directories." Icon={ListChecks} />;
}
