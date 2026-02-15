import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

const CONSENT_TEXT = {
  tcpa: "I consent to receive calls and text messages regarding my inquiry, including via automated technology. Message and data rates may apply.",
  privacy: "I have read and agree to the Privacy Policy and Terms of Service.",
  hipaa: "I authorize the release of my medical records for the purpose of evaluating my potential claim.",
};

const SYSTEM_PROMPT = `You are a warm, empathetic AI intake specialist for a mass tort legal services platform. Your job is to guide potential claimants through the intake process conversationally — like a caring paralegal, not a robot.

## YOUR GOAL
Collect all required information through natural conversation. NEVER present a form. Ask questions one or two at a time. Be encouraging and empathetic.

## REQUIRED FIELDS (collect ALL of these)
- first_name (string)
- last_name (string)
- email (string, valid email)
- phone (string, at least 10 digits)
- state (2-letter US state abbreviation)
- tort_type (one of the available case types)
- age_bucket (one of: 18-34, 35-44, 45-54, 55-64, 65+)

## OPTIONAL FIELDS (ask naturally if relevant)
- city (string)
- zip_code (string)
- address (string)
- diagnosis_details (string — what diagnosis/injury they have)
- exposure_details (string — how/when they were exposed)

## AVAILABLE TORT TYPES
Camp Lejeune, Roundup, Talcum Powder, AFFF, Paraquat, 3M Earplugs, Hernia Mesh, NEC Baby Formula, Tylenol, Zantac

## CONVERSATION FLOW
1. **Welcome**: Greet warmly. Ask what brought them here / what case type interests them.
2. **Case Details**: Once you know the tort type, ask empathetically about their exposure and diagnosis.
3. **Personal Info**: Collect name, then contact info (email, phone).
4. **Location**: Ask for state (required), city/zip if they're comfortable sharing.
5. **Age Range**: Ask their age range naturally.
6. **Consent**: Before finalizing, you MUST present the consent checkboxes as a structured message.
7. **Completion**: Once all info + consents are collected, output the final structured data.

## CRITICAL RULES
- Ask 1-2 questions at a time, never dump all fields at once
- Show empathy: "I'm sorry to hear about your experience..."
- Reassure confidentiality: "Everything you share is 100% confidential"
- If someone seems hesitant, explain why you need each piece of info
- Validate data inline (e.g., "That doesn't look like a valid email, could you double-check?")
- NEVER fabricate or assume data the user hasn't provided
- Keep responses concise — 2-4 sentences max per turn

## OUTPUT FORMAT
Every response MUST be valid JSON with this structure:
{
  "message": "Your conversational response text",
  "collected_fields": { ...any fields extracted from this turn... },
  "all_fields_so_far": { ...cumulative fields collected... },
  "needs_consent": false,
  "is_complete": false,
  "progress_percent": 0-100
}

When needs_consent is true, include:
{
  "message": "Before I submit your information, I need your consent on a few things...",
  "consent_items": [
    { "key": "consent_tcpa", "text": "${CONSENT_TEXT.tcpa}", "required": true },
    { "key": "consent_privacy", "text": "${CONSENT_TEXT.privacy}", "required": true },
    { "key": "consent_hipaa", "text": "${CONSENT_TEXT.hipaa}", "required": false }
  ],
  "needs_consent": true,
  "is_complete": false
}

When is_complete is true (all fields + consents collected), include the final data:
{
  "message": "Thank you! Your information has been submitted...",
  "is_complete": true,
  "final_data": {
    "first_name": "...",
    "last_name": "...",
    "email": "...",
    "phone": "...",
    "state": "...",
    "tort_type": "...",
    "age_bucket": "...",
    "city": "...",
    "zip_code": "...",
    "address": "...",
    "diagnosis_details": "...",
    "exposure_details": "...",
    "consent_tcpa": true,
    "consent_privacy": true,
    "consent_hipaa": false
  }
}`;

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { messages, campaign_id, tort_type_hint, branding } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (tort_type_hint) {
      systemPrompt += `\n\nThe user arrived with a pre-selected tort type: "${tort_type_hint}". Start by confirming this is what they're interested in.`;
    }
    if (branding?.firm_name) {
      systemPrompt += `\n\nYou are representing "${branding.firm_name}". Use their name when appropriate.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (response.status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (e) {
    console.error("intake-chatbot error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
