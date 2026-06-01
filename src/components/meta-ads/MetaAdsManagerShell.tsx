import { useState, ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Folder, Layers, Megaphone, Calendar, Sparkles, Filter, FolderPlus,
} from 'lucide-react';

interface Props {
  campaignsSlot: ReactNode;
  adSetsSlot: ReactNode;
  adsSlot: ReactNode;
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All ads', icon: Folder },
  { id: 'value', label: 'Value reporting' },
  { id: 'actions', label: 'Actions' },
  { id: 'active', label: 'Active ads' },
  { id: 'delivery', label: 'Had delivery' },
];

export function MetaAdsManagerShell({ campaignsSlot, adSetsSlot, adsSlot }: Props) {
  const [chip, setChip] = useState('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('last_30d');

  return (
    <div className="rounded-md border bg-card">
      {/* Chip row (mirrors Meta's quick views) */}
      <div className="flex flex-wrap items-center gap-1 border-b px-3 py-1.5">
        {FILTER_CHIPS.map((c) => {
          const Icon = c.icon || Filter;
          const active = chip === c.id;
          return (
            <Button
              key={c.id} variant={active ? 'secondary' : 'ghost'} size="sm"
              onClick={() => setChip(c.id)}
              className={`h-7 gap-1.5 text-xs ${active ? '' : 'text-muted-foreground'}`}
            >
              <Icon className="h-3.5 w-3.5" /> {c.label}
            </Button>
          );
        })}
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">+ See more</Button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <FolderPlus className="h-3.5 w-3.5" /> Create a view
          </Button>
        </div>
      </div>

      {/* AI describe + date range */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Describe what you're looking for"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <Select value={date} onValueChange={setDate}>
          <SelectTrigger className="w-[230px] h-8 text-sm">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last_7d">Last 7 days</SelectItem>
            <SelectItem value="last_14d">Last 14 days</SelectItem>
            <SelectItem value="last_30d">Last 30 days</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="last_month">Last month</SelectItem>
            <SelectItem value="maximum">Maximum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="rounded-none border-b w-full justify-start bg-transparent h-auto p-0">
          <TabsTrigger
            value="campaigns"
            className="data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5 px-4 py-2.5"
          >
            <Folder className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger
            value="adsets"
            className="data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5 px-4 py-2.5"
          >
            <Layers className="h-4 w-4" /> Ad sets
          </TabsTrigger>
          <TabsTrigger
            value="ads"
            className="data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5 px-4 py-2.5"
          >
            <Megaphone className="h-4 w-4" /> Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="m-0">{campaignsSlot}</TabsContent>
        <TabsContent value="adsets" className="m-0">{adSetsSlot}</TabsContent>
        <TabsContent value="ads" className="m-0">{adsSlot}</TabsContent>
      </Tabs>
    </div>
  );
}
