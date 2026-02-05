 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Switch } from '@/components/ui/switch';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
 import { 
   Upload, 
   Globe, 
   Phone, 
   Database as DatabaseIcon,
   FileText,
   Users,
   Plus,
   Pencil,
   BarChart3,
   TrendingUp,
   TrendingDown
 } from 'lucide-react';
 import { toast } from 'sonner';
 import type { Database as SupabaseDatabase } from '@/integrations/supabase/types';
 
 type LeadSourceType = SupabaseDatabase['public']['Enums']['lead_source_type'];
 
 interface LeadSourceWithStats {
   id: string;
   name: string;
   source_type: LeadSourceType;
   description: string | null;
   is_active: boolean;
   configuration: Record<string, unknown> | null;
   lead_count: number;
   leads_this_week: number;
   leads_last_week: number;
 }
 
 const SOURCE_TYPE_OPTIONS: { value: LeadSourceType; label: string }[] = [
   { value: 'csv_upload', label: 'CSV Upload' },
   { value: 'google_ads', label: 'Google Ads' },
   { value: 'meta_ads', label: 'Meta Ads' },
   { value: 'dialer', label: 'Dialer' },
   { value: 'crm', label: 'CRM' },
   { value: 'intake_form', label: 'Intake Form' },
   { value: 'referral', label: 'Referral' },
   { value: 'other', label: 'Other' },
 ];
 
 const getSourceIcon = (sourceType: string) => {
   switch (sourceType) {
     case 'csv_upload':
       return <Upload className="h-5 w-5" />;
     case 'google_ads':
     case 'meta_ads':
       return <Globe className="h-5 w-5" />;
     case 'dialer':
       return <Phone className="h-5 w-5" />;
     case 'crm':
       return <DatabaseIcon className="h-5 w-5" />;
     case 'intake_form':
       return <FileText className="h-5 w-5" />;
     case 'referral':
       return <Users className="h-5 w-5" />;
     default:
       return <DatabaseIcon className="h-5 w-5" />;
   }
 };
 
 export function LeadSourcesManager() {
   const queryClient = useQueryClient();
   const [isAddOpen, setIsAddOpen] = useState(false);
   const [editingSource, setEditingSource] = useState<LeadSourceWithStats | null>(null);
   const [formData, setFormData] = useState({
     name: '',
     source_type: 'other' as LeadSourceType,
     description: '',
   });
 
   const { data: sources, isLoading } = useQuery({
     queryKey: ['lead-sources-with-stats'],
     queryFn: async () => {
       const { data: sourcesData, error: sourcesError } = await supabase
         .from('lead_sources')
         .select('*')
         .order('name');
       
       if (sourcesError) throw sourcesError;
 
       // Get lead counts per source
       const { data: leads, error: leadsError } = await supabase
         .from('leads')
         .select('source_id, created_at');
       
       if (leadsError) throw leadsError;
 
       const now = new Date();
       const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
       const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
 
       return sourcesData.map(source => {
         const sourceLeads = leads?.filter(l => l.source_id === source.id) || [];
         const leadsThisWeek = sourceLeads.filter(l => new Date(l.created_at) >= oneWeekAgo).length;
         const leadsLastWeek = sourceLeads.filter(l => {
           const date = new Date(l.created_at);
           return date >= twoWeeksAgo && date < oneWeekAgo;
         }).length;
 
         return {
           ...source,
           lead_count: sourceLeads.length,
           leads_this_week: leadsThisWeek,
           leads_last_week: leadsLastWeek,
         } as LeadSourceWithStats;
       });
     },
   });
 
   const toggleActiveMutation = useMutation({
     mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
       const { error } = await supabase
         .from('lead_sources')
         .update({ is_active })
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['lead-sources-with-stats'] });
       queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
       toast.success('Lead source updated');
     },
     onError: (error) => {
       toast.error('Failed to update lead source: ' + error.message);
     },
   });
 
   const saveMutation = useMutation({
     mutationFn: async (data: { id?: string; name: string; source_type: LeadSourceType; description: string }) => {
       if (data.id) {
         const { error } = await supabase
           .from('lead_sources')
           .update({
             name: data.name,
             source_type: data.source_type,
             description: data.description,
           })
           .eq('id', data.id);
         if (error) throw error;
       } else {
         const { error } = await supabase
           .from('lead_sources')
           .insert({
             name: data.name,
             source_type: data.source_type,
             description: data.description,
           });
         if (error) throw error;
       }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['lead-sources-with-stats'] });
       queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
       toast.success(editingSource ? 'Lead source updated' : 'Lead source created');
       setIsAddOpen(false);
       setEditingSource(null);
       setFormData({ name: '', source_type: 'other', description: '' });
     },
     onError: (error) => {
       toast.error('Failed to save lead source: ' + error.message);
     },
   });
 
   const handleEdit = (source: LeadSourceWithStats) => {
     setEditingSource(source);
     setFormData({
       name: source.name,
       source_type: source.source_type,
       description: source.description || '',
     });
     setIsAddOpen(true);
   };
 
   const handleSave = () => {
     if (!formData.name.trim()) {
       toast.error('Name is required');
       return;
     }
     saveMutation.mutate({
       id: editingSource?.id,
       ...formData,
     });
   };
 
   const handleDialogClose = (open: boolean) => {
     if (!open) {
       setEditingSource(null);
       setFormData({ name: '', source_type: 'other', description: '' });
     }
     setIsAddOpen(open);
   };
 
   const getTrendIcon = (thisWeek: number, lastWeek: number) => {
     if (thisWeek > lastWeek) {
       return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
     } else if (thisWeek < lastWeek) {
       return <TrendingDown className="h-4 w-4 text-destructive" />;
     }
     return null;
   };
 
   if (isLoading) {
     return <div className="text-muted-foreground">Loading lead sources...</div>;
   }
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <div>
           <CardTitle>Lead Sources</CardTitle>
           <CardDescription>
             Configure and monitor your lead sources
           </CardDescription>
         </div>
         <Dialog open={isAddOpen} onOpenChange={handleDialogClose}>
           <DialogTrigger asChild>
             <Button>
               <Plus className="h-4 w-4 mr-2" />
               Add Source
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>{editingSource ? 'Edit Lead Source' : 'Add Lead Source'}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label htmlFor="name">Name</Label>
                 <Input
                   id="name"
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="Enter source name"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="source_type">Type</Label>
                 <Select
                   value={formData.source_type}
                   onValueChange={(value: LeadSourceType) => setFormData(prev => ({ ...prev, source_type: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select type" />
                   </SelectTrigger>
                   <SelectContent>
                     {SOURCE_TYPE_OPTIONS.map((option) => (
                       <SelectItem key={option.value} value={option.value}>
                         {option.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="description">Description</Label>
                 <Textarea
                   id="description"
                   value={formData.description}
                   onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                   placeholder="Describe this lead source"
                   rows={3}
                 />
               </div>
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => handleDialogClose(false)}>
                 Cancel
               </Button>
               <Button onClick={handleSave} disabled={saveMutation.isPending}>
                 {saveMutation.isPending ? 'Saving...' : 'Save'}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {sources?.map((source) => (
             <Card key={source.id} className={`transition-opacity ${!source.is_active ? 'opacity-60' : ''}`}>
               <CardContent className="pt-6">
                 <div className="flex items-start justify-between mb-4">
                   <div className="flex items-start gap-3">
                     <div className={`p-2 rounded-lg ${source.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                       {getSourceIcon(source.source_type)}
                     </div>
                     <div>
                       <p className="font-medium">{source.name}</p>
                       <p className="text-sm text-muted-foreground line-clamp-2">{source.description}</p>
                     </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => handleEdit(source)}>
                     <Pencil className="h-4 w-4" />
                   </Button>
                 </div>
 
                 {/* Stats */}
                 <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1">
                       <BarChart3 className="h-3 w-3 text-muted-foreground" />
                       <span className="text-lg font-semibold">{source.lead_count}</span>
                     </div>
                     <p className="text-xs text-muted-foreground">Total Leads</p>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1">
                       <span className="text-lg font-semibold">{source.leads_this_week}</span>
                       {getTrendIcon(source.leads_this_week, source.leads_last_week)}
                     </div>
                     <p className="text-xs text-muted-foreground">This Week</p>
                   </div>
                 </div>
 
                 {/* Controls */}
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Switch
                       checked={source.is_active}
                       onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: source.id, is_active: checked })}
                     />
                     <span className="text-sm text-muted-foreground">
                       {source.is_active ? 'Active' : 'Inactive'}
                     </span>
                   </div>
                   <Badge variant={source.is_active ? 'default' : 'secondary'}>
                     {SOURCE_TYPE_OPTIONS.find(o => o.value === source.source_type)?.label || source.source_type}
                   </Badge>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
 
         {sources?.length === 0 && (
           <div className="text-center py-12 text-muted-foreground">
             <DatabaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
             <p>No lead sources configured</p>
             <p className="text-sm">Click "Add Source" to create your first lead source</p>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }