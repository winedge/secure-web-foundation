import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { action, context, firm_id } = await req.json();

    const { data: aiConfig } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "ai_configuration")
      .single();

    const config = (aiConfig?.value as Record<string, any>) || {};
    const temperature = config.creativity_level || 0.7;
    const brandVoice = config.brand_voice || "professional and informative";
    const contentGuidelines = config.content_guidelines || "";

    const { config: vCfg, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "social");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const verticalContext = customPrompt && customPrompt.trim().length > 0
      ? customPrompt
      : `You are an expert social media content creator for businesses in the ${verticalName} industry.`;

    const systemPrompts: Record<string, string> = {
      generate_post: `${verticalContext}
Brand voice: ${brandVoice}
${contentGuidelines ? `Guidelines: ${contentGuidelines}` : ""}

Create engaging social media content that:
- Is compliant with advertising regulations relevant to ${verticalName}
- Drives engagement and builds trust
- Uses appropriate hashtags
- Is optimized for the target platform(s)

Return JSON: {
  "content": "The post text with emojis where appropriate",
  "hashtags": ["hashtag1", "hashtag2"],
  "best_posting_time": "HH:MM",
  "platform_variants": {
    "facebook": "Facebook-optimized version",
    "instagram": "Instagram-optimized version with more hashtags",
    "linkedin": "LinkedIn professional version",
    "twitter": "Short Twitter/X version under 280 chars",
    "tiktok": "TikTok caption with trending hashtags"
  },
  "image_prompt": "A description for AI image generation that would complement this post",
  "video_prompt": "A description for a short video that would complement this post"
}`,

      check_plagiarism: `You are a plagiarism detection expert. Analyze the given content for originality.
Check for:
- Common phrases that appear in many sources
- Content that seems copy-pasted from ${verticalName} templates
- Overused social media captions
- Any content that might trigger plagiarism concerns

Return JSON: {
  "plagiarism_score": 0-100,
  "issues": [{ "text": "problematic phrase", "concern": "why it's an issue", "suggestion": "alternative" }],
  "overall_assessment": "brief assessment",
  "is_safe_to_post": true/false
}`,

      generate_image: `You are an expert graphic designer creating social media images for ${verticalName} businesses.
The user wants an AI-generated image with specific text overlays and call-to-action elements.

Based on the user's requirements, create a HIGHLY DETAILED image generation prompt that includes:
1. The scene/background described by the user (or inferred from the post content)
2. Text overlays: The provided overlay text should appear PROMINENTLY rendered on the image as readable headline text
3. CTA button: If a CTA text is provided, include a styled button/banner with that text
4. Style matching the selected visual style
5. Brand-appropriate colors and professional typography

CRITICAL RULES:
- The overlay text and CTA MUST be part of the image as visible, readable text
- Use bold, large, high-contrast typography for the overlay text
- The CTA should look like a clickable button or banner at the bottom
- Ensure text is legible against the background
- Match the aspect ratio requested

Return JSON: {
  "prompt": "Ultra detailed image generation prompt that explicitly describes text placement, typography, and CTA button styling on the image",
  "style": "photograph|illustration|infographic|quote-card",
  "aspect_ratio": "the requested ratio",
  "color_palette": ["#hex1", "#hex2"]
}`,

      generate_calendar: `You are a social media strategist for the ${verticalName} industry. Create a content calendar for the given period using vertical-appropriate topics, post types, and seasonality.
Return JSON: {
  "posts": [{
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "platform": ["facebook", "instagram"],
    "content_type": "educational|promotional|engagement|testimonial|industry_news",
    "topic": "brief topic",
    "content": "full post text",
    "hashtags": ["tag1"],
    "image_prompt": "image description"
  }],
  "strategy_notes": "overall strategy explanation"
}`,
    };

    const systemPrompt = systemPrompts[action];
    if (!systemPrompt) throw new Error(`Unknown action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: typeof context === "string" ? context : JSON.stringify(context) },
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please try again." }, 429);
      if (response.status === 402) return jsonResponse({ error: "AI credits exhausted. Please add credits." }, 402);
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    if (action === "generate_image" && parsed.prompt) {
      try {
        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: parsed.prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (imgResp.ok) {
          const imgData = await imgResp.json();
          const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imageUrl) {
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const fileName = `ai-generated/${crypto.randomUUID()}.png`;

            const { data: uploadData } = await supabase.storage
              .from("social-media")
              .upload(fileName, binaryData, { contentType: "image/png" });

            if (uploadData) {
              const { data: publicUrl } = supabase.storage.from("social-media").getPublicUrl(fileName);
              parsed.generated_image_url = publicUrl.publicUrl;
            }
          }
        }
      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
      }
    }

    return jsonResponse({ result: parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("social-content-generator error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
