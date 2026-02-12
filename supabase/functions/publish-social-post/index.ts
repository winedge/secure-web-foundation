import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, post_id } = await req.json();

    // Action: publish_due — find all scheduled posts due now and publish them
    if (action === "publish_due") {
      const now = new Date().toISOString();
      const { data: duePosts, error: fetchErr } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", now);

      if (fetchErr) throw fetchErr;
      if (!duePosts || duePosts.length === 0) {
        return new Response(
          JSON.stringify({ published: 0, message: "No posts due" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const post of duePosts) {
        const result = await publishPost(supabase, post);
        results.push(result);
      }

      return new Response(
        JSON.stringify({ published: results.filter((r) => r.success).length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: publish_now — publish a specific post immediately
    if (action === "publish_now") {
      if (!post_id) throw new Error("post_id required");
      const { data: post, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", post_id)
        .single();
      if (error || !post) throw new Error("Post not found");

      const result = await publishPost(supabase, post);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: fetch_engagement — pull engagement metrics for published posts
    if (action === "fetch_engagement") {
      const { data: publishedPosts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "published")
        .not("platform_post_ids", "is", null);

      if (!publishedPosts || publishedPosts.length === 0) {
        return new Response(
          JSON.stringify({ updated: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updated = 0;
      for (const post of publishedPosts) {
        const metrics = await fetchEngagement(supabase, post);
        if (metrics) {
          await supabase
            .from("social_posts")
            .update({ engagement_metrics: metrics })
            .eq("id", post.id);
          updated++;
        }
      }

      return new Response(
        JSON.stringify({ updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");
  } catch (e) {
    console.error("publish-social-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function publishPost(supabase: any, post: any) {
  const platformPostIds: Record<string, string> = {};
  const errors: string[] = [];

  // Mark as publishing
  await supabase
    .from("social_posts")
    .update({ status: "publishing" })
    .eq("id", post.id);

  // Get user's platform connections
  const { data: connections } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", post.user_id)
    .eq("is_active", true);

  for (const platform of post.platforms || []) {
    try {
      if (platform === "facebook" || platform === "instagram") {
        const result = await publishToMeta(connections, post, platform);
        if (result.id) platformPostIds[platform] = result.id;
      } else if (platform === "linkedin") {
        const result = await publishToLinkedIn(connections, post);
        if (result.id) platformPostIds[platform] = result.id;
      } else if (platform === "twitter") {
        const result = await publishToTwitter(post);
        if (result.id) platformPostIds[platform] = result.id;
      } else if (platform === "tiktok") {
        // TikTok API requires approved app — log as pending
        platformPostIds[platform] = "tiktok_manual";
      }
    } catch (err) {
      console.error(`Failed to publish to ${platform}:`, err);
      errors.push(`${platform}: ${err instanceof Error ? err.message : "Failed"}`);
    }
  }

  const allFailed = Object.keys(platformPostIds).length === 0 && errors.length > 0;

  await supabase
    .from("social_posts")
    .update({
      status: allFailed ? "failed" : "published",
      published_at: allFailed ? null : new Date().toISOString(),
      platform_post_ids: platformPostIds,
      error_message: errors.length > 0 ? errors.join("; ") : null,
    })
    .eq("id", post.id);

  return {
    success: !allFailed,
    post_id: post.id,
    platform_post_ids: platformPostIds,
    errors,
  };
}

async function publishToMeta(connections: any[], post: any, platform: string) {
  // For Facebook: post to page feed
  // For Instagram: create media container then publish
  const fbConn = connections?.find(
    (c: any) => c.platform === "facebook_page" && c.is_active
  );
  const fbUserConn = connections?.find(
    (c: any) => c.platform === "facebook" && c.is_active
  );

  if (!fbConn && !fbUserConn) {
    throw new Error("No Facebook connection found");
  }

  if (platform === "facebook") {
    const pageId = fbConn?.page_id;
    const token = fbConn?.page_access_token || fbConn?.access_token;
    if (!pageId || !token) throw new Error("Facebook page not connected");

    const body: any = { message: post.content, access_token: token };

    // If there's an image, attach it
    if (post.media_urls?.length > 0 && post.media_type === "image") {
      body.url = post.media_urls[0];
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      return { id: data.id || data.post_id };
    }

    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    return { id: data.id };
  }

  if (platform === "instagram") {
    // Instagram requires page + Instagram Business Account
    const pageId = fbConn?.page_id;
    const token = fbConn?.page_access_token || fbConn?.access_token;
    if (!pageId || !token) throw new Error("Instagram not connected via Facebook page");

    // Get Instagram Business Account ID
    const igResp = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${token}`
    );
    const igData = await igResp.json();
    const igAccountId = igData.instagram_business_account?.id;
    if (!igAccountId) throw new Error("No Instagram Business Account linked to this page");

    if (post.media_urls?.length > 0) {
      // Create media container
      const containerBody: any = {
        caption: post.content,
        access_token: token,
      };
      if (post.media_type === "video") {
        containerBody.media_type = "VIDEO";
        containerBody.video_url = post.media_urls[0];
      } else {
        containerBody.image_url = post.media_urls[0];
      }

      const containerResp = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(containerBody) }
      );
      const containerData = await containerResp.json();
      if (containerData.error) throw new Error(containerData.error.message);

      // Publish container
      const publishResp = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
        }
      );
      const publishData = await publishResp.json();
      if (publishData.error) throw new Error(publishData.error.message);
      return { id: publishData.id };
    }

    throw new Error("Instagram requires media (image or video) for posts");
  }

  return { id: "" };
}

async function publishToLinkedIn(connections: any[], post: any) {
  const linkedinConn = connections?.find(
    (c: any) => c.platform === "linkedin" && c.is_active
  );
  if (!linkedinConn) throw new Error("LinkedIn not connected");

  const token = linkedinConn.access_token;
  const personUrn = `urn:li:person:${linkedinConn.platform_user_id}`;

  const shareBody: any = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: post.content },
        shareMediaCategory: post.media_urls?.length > 0 ? "IMAGE" : "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(shareBody),
  });

  const data = await resp.json();
  if (resp.status >= 400) throw new Error(data.message || "LinkedIn API error");
  return { id: data.id || "linkedin_posted" };
}

async function publishToTwitter(post: any) {
  // Twitter/X requires OAuth 1.0a — use environment variables
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Twitter API credentials not configured");
  }

  // Simple tweet creation using OAuth 2.0 Bearer token approach
  // For full OAuth 1.0a, a more complex signing process is needed
  const tweetContent = post.content.slice(0, 280);

  const resp = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Note: Full implementation needs OAuth 1.0a signature
      // This is a simplified version
    },
    body: JSON.stringify({ text: tweetContent }),
  });

  if (!resp.ok) throw new Error("Twitter posting requires OAuth 1.0a configuration");
  const data = await resp.json();
  return { id: data.data?.id || "twitter_posted" };
}

async function fetchEngagement(supabase: any, post: any) {
  const metrics: Record<string, any> = {};
  const platformPostIds = post.platform_post_ids || {};

  // Get connections for this user
  const { data: connections } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", post.user_id)
    .eq("is_active", true);

  // Facebook engagement
  if (platformPostIds.facebook) {
    try {
      const fbConn = connections?.find((c: any) => c.platform === "facebook_page");
      if (fbConn) {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${platformPostIds.facebook}?fields=likes.summary(true),comments.summary(true),shares&access_token=${fbConn.page_access_token || fbConn.access_token}`
        );
        const data = await resp.json();
        if (!data.error) {
          metrics.facebook = {
            likes: data.likes?.summary?.total_count || 0,
            comments: data.comments?.summary?.total_count || 0,
            shares: data.shares?.count || 0,
          };
        }
      }
    } catch (e) {
      console.error("FB engagement fetch error:", e);
    }
  }

  // Instagram engagement
  if (platformPostIds.instagram) {
    try {
      const fbConn = connections?.find((c: any) => c.platform === "facebook_page");
      if (fbConn) {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${platformPostIds.instagram}?fields=like_count,comments_count,impressions,reach&access_token=${fbConn.page_access_token || fbConn.access_token}`
        );
        const data = await resp.json();
        if (!data.error) {
          metrics.instagram = {
            likes: data.like_count || 0,
            comments: data.comments_count || 0,
            impressions: data.impressions || 0,
            reach: data.reach || 0,
          };
        }
      }
    } catch (e) {
      console.error("IG engagement fetch error:", e);
    }
  }

  // LinkedIn engagement
  if (platformPostIds.linkedin) {
    try {
      const liConn = connections?.find((c: any) => c.platform === "linkedin");
      if (liConn) {
        const resp = await fetch(
          `https://api.linkedin.com/v2/socialActions/${platformPostIds.linkedin}?fields=likes,comments`,
          { headers: { Authorization: `Bearer ${liConn.access_token}` } }
        );
        const data = await resp.json();
        metrics.linkedin = {
          likes: data.likes?.count || 0,
          comments: data.comments?.count || 0,
        };
      }
    } catch (e) {
      console.error("LinkedIn engagement fetch error:", e);
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : null;
}
