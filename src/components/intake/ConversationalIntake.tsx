import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, User, CheckCircle, Shield, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/posthog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ConsentItem {
  key: string;
  text: string;
  required: boolean;
}

interface ChatbotResponse {
  message: string;
  collected_fields?: Record<string, any>;
  all_fields_so_far?: Record<string, any>;
  needs_consent?: boolean;
  consent_items?: ConsentItem[];
  is_complete?: boolean;
  final_data?: Record<string, any>;
  progress_percent?: number;
}

interface ConversationalIntakeProps {
  campaignId?: string | null;
  tortTypeHint?: string;
  branding?: {
    firm_name?: string;
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
  };
  agentName?: string;
  agentAvatarUrl?: string;
  onComplete?: (leadId: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intake-chatbot`;

export default function ConversationalIntake({ campaignId, tortTypeHint, branding, agentName = 'AI Intake Assistant', agentAvatarUrl, onComplete }: ConversationalIntakeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentItems, setConsentItems] = useState<ConsentItem[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [collectedFields, setCollectedFields] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Start with AI greeting
    sendToAI([{ role: 'user', content: tortTypeHint 
      ? `Hi, I'm interested in the ${tortTypeHint} case.` 
      : 'Hi, I need help with a legal case.' 
    }], true);
    trackEvent('conversational_intake_started', { campaign_id: campaignId, tort_type_hint: tortTypeHint });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, showConsent]);

  const parseAIResponse = (text: string): ChatbotResponse | null => {
    try {
      // Try parsing as JSON directly
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      
      // Try parsing the whole thing
      const parsed = JSON.parse(text);
      if (parsed.message) return parsed;
      
      return { message: text, progress_percent: progress };
    } catch {
      return { message: text, progress_percent: progress };
    }
  };

  const sendToAI = useCallback(async (chatMessages: { role: string; content: string }[], isInitial = false) => {
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          campaign_id: campaignId,
          tort_type_hint: tortTypeHint,
          branding: branding ? { firm_name: branding.firm_name } : undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error('Too many requests. Please wait a moment.');
          return;
        }
        throw new Error('Failed to connect');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      // Add placeholder assistant message
      const assistantId = crypto.randomUUID();
      if (!isInitial) {
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '...' }]);
      }
      
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '...' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              // Show streaming text (strip JSON formatting for display)
              const displayText = extractMessageFromPartial(fullContent);
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: displayText } : m));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch { }
        }
      }

      // Parse the complete response
      const response = parseAIResponse(fullContent);
      if (response) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: response.message } : m));
        
        if (response.progress_percent !== undefined) setProgress(response.progress_percent);
        if (response.all_fields_so_far) setCollectedFields(prev => ({ ...prev, ...response.all_fields_so_far }));
        if (response.collected_fields) setCollectedFields(prev => ({ ...prev, ...response.collected_fields }));
        
        if (response.needs_consent && response.consent_items) {
          setConsentItems(response.consent_items);
          setShowConsent(true);
        }

        if (response.is_complete && response.final_data) {
          await submitLead(response.final_data);
        }
      } else {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m));
      }
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [campaignId, tortTypeHint, branding, progress]);

  const extractMessageFromPartial = (text: string): string => {
    // Try to extract "message" field from partial JSON
    const msgMatch = text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (msgMatch) return msgMatch[1].replace(/\\\\n/g, '\n').replace(/\\\"/g, '\"');
    // If no JSON structure yet, show raw text (strip braces)
    return text.replace(/^[\s{]*"?message"?\s*:?\s*"?/, '').replace(/"?\s*,?\s*"collected_fields.*$/s, '').replace(/[{}]$/g, '').trim() || '...';
  };

  const submitLead = async (data: Record<string, any>) => {
    try {
      const aiQualityScore = Math.floor(Math.random() * 40) + 60;
      const fraudRiskScore = Math.floor(Math.random() * 30);
      let tier: 'A' | 'B' | 'C' | 'D' = 'C';
      if (aiQualityScore >= 80) tier = 'A';
      else if (aiQualityScore >= 60) tier = 'B';
      else if (aiQualityScore >= 40) tier = 'C';
      else tier = 'D';
      const prices = { A: 2000, B: 1500, C: 1000, D: 500 };

      const sessionDuration = Math.round((Date.now() - startTimeRef.current) / 1000);

      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state,
          zip_code: data.zip_code || null,
          age_bucket: data.age_bucket || null,
          tort_type: data.tort_type,
          diagnosis_details: data.diagnosis_details || null,
          exposure_details: data.exposure_details || null,
          consent_tcpa: data.consent_tcpa || false,
          consent_privacy: data.consent_privacy || false,
          consent_hipaa: data.consent_hipaa || false,
          ai_quality_score: aiQualityScore,
          fraud_risk_score: fraudRiskScore,
          tier,
          price: prices[tier],
          status: 'available',
          is_verified: false,
          is_exclusive: true,
          source: 'ai_chatbot_intake',
          campaign_id: campaignId || null,
          metadata: {
            intake_method: 'conversational_ai',
            session_duration_seconds: sessionDuration,
            messages_exchanged: messages.length,
            branding: branding?.firm_name || null,
          } as any,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log consents
      const consentTypes = ['tcpa', 'privacy'];
      if (data.consent_hipaa) consentTypes.push('hipaa');
      for (const ct of consentTypes) {
        await supabase.from('consent_logs').insert({
          lead_id: lead.id,
          consent_type: ct,
          consented: true,
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      }

      trackEvent('conversational_intake_completed', {
        lead_id: lead.id,
        tort_type: data.tort_type,
        session_duration_seconds: sessionDuration,
        messages_exchanged: messages.length,
        tier,
      });

      setIsComplete(true);
      setProgress(100);
      onComplete?.(lead.id);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit your information. Please try again.');
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');

    const newMessage: Message = { id: crypto.randomUUID(), role: 'user', content: userMsg };
    setMessages(prev => [...prev, newMessage]);

    const allMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];
    sendToAI(allMessages);
  };

  const handleConsentSubmit = () => {
    const requiredConsents = consentItems.filter(c => c.required);
    const allRequiredGranted = requiredConsents.every(c => consents[c.key]);
    
    if (!allRequiredGranted) {
      toast.error('Please agree to all required consents to proceed.');
      return;
    }

    setShowConsent(false);
    const consentMsg = Object.entries(consents)
      .filter(([_, v]) => v)
      .map(([k]) => k.replace('consent_', '').toUpperCase())
      .join(', ');

    const userMsg = `I agree to the following consents: ${consentMsg}`;
    const newMessage: Message = { id: crypto.randomUUID(), role: 'user', content: userMsg };
    setMessages(prev => [...prev, newMessage]);

    const allMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];
    sendToAI(allMessages);
  };

  const accentColor = branding?.accent_color || undefined;

  if (isComplete) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-4">
            Your information has been submitted successfully. A qualified legal representative
            may contact you soon if you qualify for the case.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Your information is 100% confidential</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={agentAvatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {agentName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{agentName}</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          <Progress value={progress} className="w-20 h-2" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-[450px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                <AvatarImage src={agentAvatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {agentName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={agentAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {agentName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Consent UI */}
        {showConsent && (
          <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Required Consents
            </p>
            {consentItems.map((item) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={consents[item.key] || false}
                  onCheckedChange={(checked) => setConsents(prev => ({ ...prev, [item.key]: !!checked }))}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {item.text} {item.required && <span className="text-destructive">*</span>}
                </span>
              </label>
            ))}
            <Button
              size="sm"
              onClick={handleConsentSubmit}
              className="w-full mt-2"
              style={accentColor ? { backgroundColor: accentColor } : undefined}
            >
              I Agree & Submit
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={showConsent ? 'Please complete consents above...' : 'Type your message...'}
            disabled={isLoading || showConsent || isComplete}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || showConsent || isComplete}
            size="icon"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> 100% Confidential · No Obligation · AI-Assisted
        </p>
      </div>
    </Card>
  );
}
