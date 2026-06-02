## Goal

Make the Meta Ads section behave like the real Meta Ads Manager: every ad detail dialog shows the actual creative (video reel plays as a reel, image post renders as a post, carousel as a carousel), every filter on every table works, and every button does what its label says.

## Scope of changes

### 1. Backend | `meta-ads-sync` edge function

Rewrite the creative extraction + `refresh_ad_creative` action to capture full creative context, not just a thumbnail:

- Fetch ad with expanded fields:
  - `creative{...,image_url,thumbnail_url,video_id,instagram_permalink_url,effective_instagram_media_id,effective_object_story_id,object_story_spec{page_id,link_data,video_data,photo_data,template_data},asset_feed_spec,degrees_of_freedom_spec}`
- Detect ad format from creative payload:
  - `reel` | `video` | `image` | `carousel` | `collection` | `dynamic`
  - Reel = Instagram Reels placement OR `video_data` with vertical aspect ratio OR `instagram_actor_id` + `video_id`
- Resolve the playable video source:
  - Call `/{video_id}?fields=source,permalink_url,picture,length,format` to get a `source` MP4 URL
  - Store both `video_url` (mp4 source) and `video_permalink_url`
- Resolve carousel children from `link_data.child_attachments` → image_url, name, description, link
- Resolve the underlying organic post (for post ads) via `effective_object_story_id` → `message`, `permalink_url`, `attachments{media,subattachments}`, `full_picture`, `created_time`
- Resolve Instagram media via `effective_instagram_media_id` → `media_url`, `media_type`, `permalink`, `caption`
- Persist new columns on `meta_ads`: `ad_format`, `video_source_url`, `permalink_url`, `instagram_permalink_url`, `carousel_cards` (jsonb), `post_message`, `post_created_time`

### 2. Database migration

Add the columns above to `meta_ads` (nullable, no RLS change) and reload PostgREST schema.

### 3. Frontend | `AdDetailDialog.tsx`

Replace the single Facebook/Instagram tab preview with a Meta-Ads-Manager-style preview chooser:

- Placement tabs: Feed (FB), Feed (IG), Reels (IG/FB), Stories, Right column, Marketplace, Audience Network
- Show only placements that actually match the resolved `ad_format`
- Render real media:
  - Video / Reel → `<video autoplay loop muted playsInline controls>` using `video_source_url`, fallback to thumbnail
  - Reel aspect ratio 9:16, rounded, vertical action rail (like, comment, share, more) overlaid
  - Image → `<img>` actual creative image
  - Carousel → horizontal scroller with each card's image + headline + CTA + link
  - Post → render the organic post UI: profile header, message, attachment media, like/comment/share strip
- Show a "Loading creative from Meta…" skeleton only on first open; show "Could not fetch creative from Meta" inline if refresh fails (no infinite spinner).
- Add explicit buttons:
  - `Refresh from Meta` (force re-run `refresh_ad_creative`)
  - `Open in Meta Ads Manager` (deep link `https://business.facebook.com/adsmanager/manage/ads?act=…&selected_ad_ids=…`)
  - `Preview on Facebook` (uses `preview_shareable_link`)
  - `Duplicate ad` (create draft copy)
  - `Save changes` and `Save & sync to Meta` (calls update + push update creative endpoint)

### 4. Frontend | Tables and filters

Audit and fix every filter / button in:

- `CampaignsTable`, `AdSetsTable`, `AdsTable`
- Status filter, Search, Campaign filter, Ad set filter, Date preset, Sort column/direction, Pagination, Refresh, Row click → detail
- Bulk actions: Activate, Pause, Duplicate, Delete (where Meta allows)
- Wire each control to the existing `useMetaAdsTable` / `useMetaAdSetsTable` / `useMetaCampaignsTable` hooks and confirm the query keys invalidate on Sync.
- Ensure changing Campaign filter resets Ad set filter and page index (already partly done — extend to all tables).

### 5. Frontend | Live updates

After `sync_from_meta` or any mutation, invalidate:
- `['meta-campaigns']`, `['meta-ad-sets']`, `['meta-ads']`, `['meta-ad-detail']`, `['meta-live-insights']`

## Technical details

- New file: `src/components/meta-ads/previews/` with `FeedPreview.tsx`, `ReelPreview.tsx`, `StoryPreview.tsx`, `CarouselPreview.tsx`, `RightColumnPreview.tsx`.
- `AdPreviewPanel.tsx` becomes a router that picks the correct preview component based on `ad.ad_format` + selected placement.
- Video element uses Meta-hosted `source` MP4. If CORS-blocked, fall back to embedded `<iframe>` of `permalink_url`.
- All new DB columns have safe defaults; no breaking change to existing UI.

## Out of scope

- Creating new ads from scratch (Meta requires page/IG asset upload flow — call out as a follow-up).
- Editing video media (Meta does not allow replacing a video on an active ad; only creating a new creative does).