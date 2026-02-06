import { useState } from 'react';
import { usePurchasedLeads } from '@/hooks/use-leads';
import { useLeadNotes, useCreateNote, useDeleteNote, useTogglePinNote } from '@/hooks/use-lead-notes';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ContactJourneyTimeline } from '@/components/leads/ContactJourneyTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TierBadge } from '@/components/leads/TierBadge';
import { ScoreIndicator } from '@/components/leads/ScoreIndicator';
import { formatCurrency } from '@/lib/utils';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar,
  Search,
  Download,
  Eye,
  CheckCircle,
  Shield,
  Clock,
  Pin,
  Trash2,
  Plus,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function LeadNotesPanel({ leadId }: { leadId: string }) {
  const { data: notes, isLoading } = useLeadNotes(leadId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePinNote();
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleSubmitNote = () => {
    if (!newNoteContent.trim()) return;
    
    createNote.mutate({
      leadId,
      title: newNoteTitle || undefined,
      content: newNoteContent,
    }, {
      onSuccess: () => {
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowAddNote(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Button/Form */}
      {showAddNote ? (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="Note title (optional)"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddNote(false)}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmitNote}
                disabled={!newNoteContent.trim() || createNote.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                {createNote.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setShowAddNote(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      )}

      {/* Notes List */}
      {notes?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => (
            <Card key={note.id} className={cn(note.is_pinned && 'ring-1 ring-primary')}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {note.title && (
                      <h4 className="font-medium flex items-center gap-2">
                        {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                        {note.title}
                      </h4>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePin.mutate({ noteId: note.id, isPinned: note.is_pinned || false })}
                    >
                      <Pin className={cn('h-4 w-4', note.is_pinned && 'text-primary fill-primary')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyLeads() {
  const { data: leads, isLoading } = usePurchasedLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const filteredLeads = leads?.filter((lead) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.tort_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLeadData = leads?.find((l) => l.id === selectedLead);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Leads</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your purchased leads with full contact details
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, tort type, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total Purchased</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {leads?.filter(l => l.tier === 'A' || l.tier === 'B').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">High Quality (A/B)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(leads?.reduce((sum, l) => sum + Number(l.purchaseInfo?.amount || 0), 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Invested</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-48 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : filteredLeads?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No leads found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm ? 'Try adjusting your search terms' : 'Purchase leads from the marketplace to see them here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads?.map((lead) => (
              <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {lead.first_name} {lead.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{lead.tort_type}</p>
                    </div>
                    <TierBadge tier={lead.tier} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                      {lead.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.city}, {lead.state} {lead.zip_code}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    {lead.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                    {lead.is_exclusive && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" /> Exclusive
                      </Badge>
                    )}
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full mt-3 gap-2"
                        onClick={() => setSelectedLead(lead.id)}
                      >
                        <Eye className="h-4 w-4" />
                        View Full Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {lead.first_name} {lead.last_name}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <Tabs defaultValue="details" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="journey">
                            <Clock className="h-4 w-4 mr-2" />
                            Journey
                          </TabsTrigger>
                          <TabsTrigger value="notes">
                            <FileText className="h-4 w-4 mr-2" />
                            Notes
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Contact Info */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                Contact Information
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span>{lead.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{lead.phone}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p>{lead.address}</p>
                                    <p>{lead.city}, {lead.state} {lead.zip_code}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Case Info */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                Case Information
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tort Type</span>
                                  <span className="font-medium">{lead.tort_type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Age Bucket</span>
                                  <span className="font-medium">{lead.age_bucket || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tier</span>
                                  <TierBadge tier={lead.tier} />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Quality Score</span>
                                  <ScoreIndicator score={lead.ai_quality_score || 0} size="sm" />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Fraud Risk</span>
                                  <ScoreIndicator score={100 - (lead.fraud_risk_score || 0)} size="sm" />
                                </div>
                              </div>
                            </div>

                            {/* Diagnosis Details */}
                            {lead.diagnosis_details && (
                              <div className="md:col-span-2 space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                  Diagnosis Details
                                </h4>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                                  {lead.diagnosis_details}
                                </p>
                              </div>
                            )}

                            {/* Exposure Details */}
                            {lead.exposure_details && (
                              <div className="md:col-span-2 space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                  Exposure Details
                                </h4>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                                  {lead.exposure_details}
                                </p>
                              </div>
                            )}

                            {/* Purchase Info */}
                            <div className="md:col-span-2 space-y-2 border-t pt-4">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                Purchase Information
                              </h4>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount Paid</span>
                                <span className="font-bold text-primary">
                                  {formatCurrency(Number(lead.purchaseInfo?.amount || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Purchased On</span>
                                <span className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {lead.purchaseInfo?.purchased_at 
                                    ? format(new Date(lead.purchaseInfo.purchased_at), 'MMM d, yyyy')
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="journey" className="mt-4">
                          <ContactJourneyTimeline leadId={lead.id} />
                        </TabsContent>
                        
                        <TabsContent value="notes" className="mt-4">
                          <LeadNotesPanel leadId={lead.id} />
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
