import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { action, context } = await req.json();

    // Get AI config from admin settings
    const { data: aiConfig } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "ai_configuration")
      .single();

    const config = aiConfig?.value || {};
    const temperature = config.creativity_level || 0.7;
    const brandVoice = config.brand_voice || "professional and informative";
    const contentGuidelines = config.content_guidelines || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompts: Record<string, string> = {
      generate_post: `You are an expert social media content creator for law firms specializing in mass tort litigation.
Brand voice: ${brandVoice}
${contentGuidelines ? `Guidelines: ${contentGuidelines}` : ""}

Create engaging social media content that:
- Is compliant with legal advertising regulations
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
- Content that seems copy-pasted from legal templates
- Overused social media captions
- Any content that might trigger plagiarism concerns

Return JSON: {
  "plagiarism_score": 0-100 (0 = completely original, 100 = completely plagiarized),
  "issues": [{ "text": "problematic phrase", "concern": "why it's an issue", "suggestion": "alternative" }],
  "overall_assessment": "brief assessment",
  "is_safe_to_post": true/false
}`,

      generate_image: `You are an AI image prompt creator. Given the social media post content, create a detailed prompt for image generation.
Return JSON: {
  "prompt": "Detailed image generation prompt",
  "style": "photograph|illustration|infographic|quote-card",
  "aspect_ratio": "1:1|16:9|9:16|4:5",
  "color_palette": ["#hex1", "#hex2"]
}`,

      generate_calendar: `You are a social media strategist. Create a content calendar for the given period.
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
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

    // If generating an image, actually generate it
    if (action === "generate_image" && parsed.prompt) {
      try {
        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
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

    return jsonResponse({ result: parsed });
  } catch (e) {
    console.error("social-content-generator error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
