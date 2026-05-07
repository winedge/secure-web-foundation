## Goal
Seed demo data so the GMB Review Manager, Post Scheduler, and Reply Templates pages are populated for every firm that already has demo Indian GMB locations.

## What gets inserted

**1. Demo Reviews (gmb_reviews)** | 6 reviews per Indian location (mix of 5★, 4★, 3★, 2★ ratings; some replied, some pending). Indian reviewer names (Rohan Sharma, Priya Patel, Arjun Mehta, Sneha Iyer, Vikram Singh, Aditi Nair, etc.) with realistic review text relevant to a professional services office. Roughly 60% have a `reply_text` filled, 40% pending.

**2. Demo Posts (gmb_posts)** | 5 posts per location across post types (`update`, `offer`, `event`):
   - 2 `published` posts (past `scheduled_for`)
   - 2 `scheduled` posts (future `scheduled_for`, next 14 days)
   - 1 `draft`
   Each with summary, CTA label/URL, and a placeholder media_url.

**3. Demo Reply Templates (gmb_reply_templates)** | 6 templates per firm:
   - "Thank You | 5 Star" (tone: warm, rating_filter: 5)
   - "Appreciation | 4 Star" (warm, 4)
   - "Apology | Low Rating" (empathetic, rating_filter: 2 covering 1-2)
   - "Neutral Response | 3 Star" (professional, 3)
   - "Generic Thank You" (professional, no filter)
   - "Follow-Up Invitation" (friendly, no filter)

All inserts guarded with `WHERE NOT EXISTS` / `ON CONFLICT DO NOTHING` patterns so re-running is safe and existing real data is untouched. Inserts target only firms that already have the Indian demo locations from the previous step.

## How
Single SQL insert run via the data-insert tool:
- Pull `gmb_locations` rows where `country = 'IN'` and join to firms.
- `INSERT ... SELECT` with `generate_series` / `VALUES` CROSS JOIN to produce per-location rows.
- Use `now() - interval` for past `created_at` / `scheduled_for`, and `now() + interval` for future scheduled posts.
- `external_id` on reviews built as `demo-<location_id>-<n>` to make the NOT EXISTS check deterministic.

No code or schema changes | data-only seeding.