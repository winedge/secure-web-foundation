# Fix slow image generation in Creative Studio

## Why it is slow today

ChatGPT shows progressive previews while the model renders, so it *feels* fast even though total generation time is similar. Our pipeline does the opposite:

1. Client calls `ai-creative-image` → inserts a job row → invokes `ai-creative-image-worker` fire-and-forget.
2. Worker calls the Lovable AI Gateway with `stream: true`, but **consumes the entire SSE stream server-side**, uploads the final PNG to storage, then writes `status=completed` to the DB.
3. Client polls every 2–5s asking "is it done yet?" through a second edge function round-trip.

Net effect: the user stares at "Generating…" for the full render time + storage upload + the next poll tick (up to 5s), with zero visual feedback. On top of that:

- `ad-poster` is hard-routed to `openai/gpt-image-2` at `quality: "high"` (the slowest, most expensive path).
- The orchestrator marks jobs failed at 145s and the client gives up at 240s, so on a bad day you get nothing.

## The fix — stream straight to the client

Replace the job-queue + poll architecture for the interactive path with a single streaming edge function, exactly like the Lovable AI Gateway docs recommend. The user will see the first blurred preview within a few seconds and the final image as soon as the model finishes — same UX as ChatGPT.

### 1. New streaming endpoint

Rewrite `supabase/functions/ai-creative-image/index.ts` to:

- Accept the same request body.
- Build the brand-enriched prompt (move `buildFinalPrompt` + brand-kit fetch into a shared helper so both worker and streamer use it).
- Open a `fetch` to `https://ai.gateway.lovable.dev/v1/images/generations` with `stream: true` and `partial_images: 2` for OpenAI models.
- **Pipe the SSE body straight back to the client** (`return new Response(upstream.body, { headers: { "content-type": "text/event-stream", ...cors }})`). No buffering, no DB write on the hot path.
- After the stream ends, in `EdgeRuntime.waitUntil`, decode the final `image_generation.completed` frame, upload to the `creative-assets` bucket, and insert one row into `creative_image_jobs` with the signed URL — so history/exports still work, but the user never waits for it.

### 2. Client consumes SSE with `eventsource-parser`

Rewrite `src/hooks/use-creative-image.ts`:

- Drop `pollJob` entirely.
- Use `supabase.functions.invoke` only for the Midjourney/Ideogram export path.
- For OpenAI/Gemini, call the function URL directly with `fetch` (auth header from `supabase.auth.getSession()`) and parse SSE via `eventsource-parser` (already documented in the AI Gateway skill).
- Expose `{ previewDataUrl, finalDataUrl, isStreaming }` so the panel can show the blurred partial → sharp final transition.

### 3. UI: progressive preview

In `src/components/creative-studio/CreativeImagePanel.tsx`:

- While streaming, render the latest `previewDataUrl` with `filter: blur(16px)` and a subtle pulse.
- On final frame, swap to `finalDataUrl` with `filter: none` and a 200ms fade.
- Replace the spinner "Generating…" with the live preview as soon as the first frame arrives.

### 4. Speed defaults

- Change default `quality` from `high` to `standard` (`medium`) — the AI Gateway docs explicitly recommend `low`/`medium` for interactive flows; `high` roughly doubles wall-clock time on `gpt-image-2`.
- Keep the "High (ad-ready)" option in the Quality select for users who knowingly want it.
- Remove the hard typography-preset → `gpt-image-2` override. Let users keep their selected model; only suggest gpt-image-2 in a hint under the preset.
- Default `ad-poster` provider recommendation stays `openai` but at `medium`.

### 5. Keep the worker for batch / non-interactive

`ai-creative-image-worker` stays for any future server-triggered batch generation (campaign rollouts, scheduled refresh). The interactive Creative Studio just stops using it.

## Files to change

- `supabase/functions/_shared/creative-image-prompt.ts` — new, holds `buildFinalPrompt`, brand-kit fetch, model resolution, quality map (extracted from current worker).
- `supabase/functions/ai-creative-image/index.ts` — rewritten as streaming proxy + background persist.
- `supabase/functions/ai-creative-image-worker/index.ts` — import from shared helper, otherwise untouched.
- `src/hooks/use-creative-image.ts` — SSE consumer, `eventsource-parser`, exposes streaming state.
- `src/components/creative-studio/CreativeImagePanel.tsx` — progressive preview UI, default quality `standard`.
- `package.json` — add `eventsource-parser`.

## What the user will see

- First blurred preview in ~3–6s (vs. 60–120s of spinner today).
- Final sharp image appears the moment the model finishes — no extra storage/poll latency.
- Quality selector defaults to "Standard" (still ad-ready); "High" remains a click away.

No DB migration required. No new providers or secrets.
