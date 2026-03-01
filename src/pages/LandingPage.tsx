import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle, Shield, Phone, Mail, User, MapPin, FileText, Loader2, MessageCircle } from 'lucide-react';
import ConversationalIntake from '@/components/intake/ConversationalIntake';

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', state: '', details: '',
  });

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['landing-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dynamic_landing_pages')
        .select('*, campaigns(tort_type, firm_id)')
        .eq('slug', slug!)
        .eq('is_published', true)
        .single();
      if (error) throw error;

      // Track visit
      await supabase.from('dynamic_landing_pages')
        .update({ visits: (data.visits || 0) + 1 })
        .eq('id', data.id);

      return data;
    },
    enabled: !!slug,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;

    setSubmitting(true);
    try {
      const tortType = (page as any).campaigns?.tort_type || 'Unknown';

      const { error } = await supabase.from('leads').insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        state: form.state,
        tort_type: tortType,
        diagnosis_details: form.details,
        source: `Landing Page: ${page.page_title}`,
        status: 'available',
        is_verified: false,
        price: 0,
      });

      if (error) throw error;

      // Track conversion
      await supabase.from('dynamic_landing_pages')
        .update({
          conversions: (page.conversions || 0) + 1,
          conversion_rate: ((page.conversions || 0) + 1) / ((page.visits || 1)) * 100,
        })
        .eq('id', page.id);

      setSubmitted(true);
    } catch (err: any) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">This landing page is no longer available.</p>
        </div>
      </div>
    );
  }

  const sections = (page.sections as any[]) || [];
  const tortType = (page as any).campaigns?.tort_type || 'Unknown';
  const campaignId = page.campaign_id;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your information has been submitted. A legal professional will contact you shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{page.headline}</h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">{page.subheadline}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="text-sm px-3 py-1"><Shield className="h-4 w-4 mr-1" />Free Consultation</Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1"><CheckCircle className="h-4 w-4 mr-1" />No Obligation</Badge>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-5 gap-8">
        {/* Content Sections */}
        <div className="md:col-span-3 space-y-8">
          {sections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xl font-bold mb-3">{section.title}</h2>
              {typeof section.content === 'string' && <p className="text-muted-foreground">{section.content}</p>}
              {section.items && (
                <ul className="space-y-2 mt-3">
                  {section.items.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{item.title}</span>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Intake: Form + AI Chatbot Tabs */}
        <div className="md:col-span-2">
          <Card className="sticky top-8 border-primary/20">
            <CardContent className="pt-6">
              <Tabs defaultValue="form">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="form" className="flex-1 gap-1.5">
                    <FileText className="h-4 w-4" />
                    Form
                  </TabsTrigger>
                  <TabsTrigger value="chatbot" className="flex-1 gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="form">
                  <h3 className="text-lg font-bold mb-1">{page.cta_text || 'Get Your Free Case Review'}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Fill out the form below and we'll get back to you within 24 hours.</p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input required placeholder="First Name" className="pl-9" value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input required placeholder="Last Name" className="pl-9" value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input required type="email" placeholder="Email Address" className="pl-9" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Phone Number" className="pl-9" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input required placeholder="State" className="pl-9" value={form.state} onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))} />
                    </div>
                    <Textarea placeholder="Briefly describe your situation..." rows={3} value={form.details} onChange={(e) => setForm(p => ({ ...p, details: e.target.value }))} />
                    <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                      {submitting ? 'Submitting...' : page.cta_text || 'Submit'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to our privacy policy and consent to be contacted about your case.
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="chatbot">
                  <h3 className="text-lg font-bold mb-1">Chat with our AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mb-4">Answer a few quick questions and we'll evaluate your case.</p>
                  <div className="h-[400px]">
                    <ConversationalIntake
                      campaignId={campaignId}
                      tortTypeHint={tortType}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
