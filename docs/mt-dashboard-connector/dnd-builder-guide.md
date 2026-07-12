# Drag-and-Drop Landing Page Builder — API + Drop-in UI

This document gives the **other dashboard** everything needed to reproduce the Core Platform's section-wise drag-and-drop landing page builder **1:1**:

1. The REST API surface it talks to (already live on `api-v1-landing`).
2. The exact React components — copy them verbatim to get the identical design, DnD behavior, and inspector layout.

Base URL, auth headers, and error format are described in [`api-v1-extended.md`](./api-v1-extended.md).

---

## 1. API surface used by the builder

Everything the DnD UI needs is exposed on `/api-v1-landing`.

### Read the section registry (icons, labels, schemas, defaults)
```
GET /catalog/sections/full          → full SECTION_REGISTRY (37 types)
GET /catalog/sections/{type}        → single section definition
GET /catalog/themes/full            → LANDING_THEMES (fonts, layout, palette, hero)
GET /catalog/starter-stacks         → recommended stacks per theme
```
Each section definition returns:
```jsonc
{
  "type": "hero",
  "label": "Hero",
  "description": "Above-the-fold headline, subhead, CTA and hero media.",
  "icon": "LayoutTemplate",          // lucide-react icon name
  "defaultProps": { /* ...type-safe defaults... */ },
  "schema": [                        // InspectorField[]
    { "key": "headline", "label": "Headline", "type": "text" },
    { "key": "cta", "label": "Call to action", "type": "cta" },
    /* text | textarea | image | select | number | toggle | cta | color | slider | repeater */
  ]
}
```

### Read / write pages, versions, templates, previews, domains
```
GET    /pages
POST   /pages                       { slug, page_title, sections, ... }
GET    /pages/{id}
PATCH  /pages/{id}                  { sections?, headline?, ... }   ← DnD reorder saves here
DELETE /pages/{id}
POST   /pages/{id}/publish
POST   /pages/{id}/unpublish

GET  /versions?page_id=             list snapshots (undo/redo history)
POST /versions                      { page_id, sections, note? }
POST /versions/{id}/restore

GET  /templates                     starter + firm + own
POST /templates                     { name, snapshot, ... }

POST /previews                      { page_id, expires_in_hours? } → { token, url }
GET  /preview-token/{token}         public unauthenticated resolve

GET  /domains
POST /domains                       { page_id, hostname }
```

### AI helpers (optional, same as Core)
```
POST /ai/page-generate    { brief, theme_key?, tone? }        → Section[]
POST /ai/theme-tweak      { current_theme, instructions }     → SectionTheme
POST /ai/copy-rewrite     { section, tone }                   → props patch
```

### The section contract (what the DnD UI reads/writes)
```ts
type Section = {
  id: string;                       // stable UUID — used as DnD key
  type: SectionType;                // e.g. "hero", "features", "faq"
  visible: boolean;
  props: Record<string, unknown>;   // shape matches registry.defaultProps
  visibility?: VisibilityConfig;    // conditional rules
  animation?: SectionAnimation;
  background?: SectionBackground;
  density?: "tight" | "default" | "roomy" | "editorial";
  headlineScale?: "sm" | "md" | "lg" | "hero" | "oversized";
  typography?: { heading?: string; body?: string };
};
```
Reordering = re-emit `sections` in the new order and `PATCH /pages/{id}` (or snapshot with `POST /versions`).

---

## 2. Drop-in UI — exact same design

The Core Platform builder is a **3-column grid**:

```text
┌─────────────┬──────────────────────────┬───────────────┐
│ 260px       │  minmax(0, 1fr)          │  320px        │
│ Section     │  Live preview            │  Inspector    │
│ list + DnD  │  (SectionRenderer)       │  (schema-     │
│ + Add/Undo  │                          │   driven)     │
└─────────────┴──────────────────────────┴───────────────┘
```

Every file below is copied **byte-identical** from the Core Platform. Drop them into the other dashboard, swap the data layer to the API client, and the design/behavior match exactly.

### 2.1 Required npm dependencies
```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
      lucide-react clsx tailwind-merge
# plus your shadcn/ui set: button, card, dialog, scroll-area
```

### 2.2 Files to copy verbatim from the Core repo
| Source path (this repo) | Purpose |
| --- | --- |
| `src/components/landing-builder/SectionsTab.tsx` | 3-column shell, wires everything together |
| `src/components/landing-builder/SectionList.tsx` | **DnD list** (drag handle, visibility, duplicate, delete) |
| `src/components/landing-builder/SectionPicker.tsx` | "Add a section" modal grid |
| `src/components/landing-builder/Inspector.tsx` | Schema-driven field renderer |
| `src/components/landing-builder/MotionInspector.tsx` | Animation controls |
| `src/components/landing-builder/BackgroundInspector.tsx` | Per-section background |
| `src/components/landing-builder/LayoutDensityInspector.tsx` | Density + headline scale |
| `src/components/landing-builder/VisibilityEditor.tsx` | Conditional rules editor |
| `src/components/landing-sections/SectionRenderer.tsx` | Live preview renderer |
| `src/components/landing-sections/*` | Every section component (Hero, Features, FAQ, …) |
| `src/lib/landing-sections/types.ts` | Type contracts (matches API) |
| `src/lib/landing-sections/registry.ts` | Icon + defaults lookup (or build from `/catalog/sections/full`) |
| `src/hooks/use-builder-history.ts` | Undo/redo stack |

> The catalog endpoint returns the same data as `registry.ts`, so the other dashboard can either (a) copy `registry.ts` for zero-latency startup, or (b) hydrate the registry from `GET /catalog/sections/full` on mount. Both are supported.

### 2.3 Minimal DnD reference (design-accurate)
If you only want the drag surface without copying every inspector, this is the exact list-column markup used by Core (Tailwind + `@dnd-kit`). It matches the design pixel-for-pixel:

```tsx
// SectionListMini.tsx
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionListMini({ sections, selectedId, onSelect, onReorder,
  onToggleVisibility, onDuplicate, onDelete, registry }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={(e) => {
        if (!e.over || e.active.id === e.over.id) return;
        const from = sections.findIndex(s => s.id === e.active.id);
        const to   = sections.findIndex(s => s.id === e.over.id);
        onReorder(arrayMove(sections, from, to));
      }}>
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {sections.map(s => (
            <Row key={s.id} section={s} def={registry[s.type]}
              selected={s.id === selectedId}
              onSelect={onSelect} onToggleVisibility={onToggleVisibility}
              onDuplicate={onDuplicate} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({ section, def, selected, onSelect, onToggleVisibility, onDuplicate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const Icon = def?.icon; // lucide component
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      onClick={() => onSelect(section.id)}
      className={cn(
        "group flex items-center gap-2 p-2 rounded-md border cursor-pointer transition",
        selected ? "border-primary bg-primary/5"
                 : "border-transparent hover:border-border hover:bg-accent/30",
        !section.visible && "opacity-50",
      )}>
      <button {...attributes} {...listeners} onClick={e => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{def?.label ?? section.type}</div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={e => { e.stopPropagation(); onToggleVisibility(section.id); }}>
          {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={e => { e.stopPropagation(); onDuplicate(section.id); }}>
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
          onClick={e => { e.stopPropagation(); onDelete(section.id); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
```

### 2.4 Design tokens (must match to look identical)

The Core builder relies on the shadcn/ui semantic tokens defined in `src/index.css`. Copy these HSL values into the other dashboard's global CSS so `border-primary`, `bg-primary/5`, `bg-accent/30`, and `text-destructive` render the same way:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;      /* dark navy #0F172A */
  --primary: 158 64% 40%;         /* emerald trust accent */
  --primary-foreground: 0 0% 100%;
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  --border: 214 32% 91%;
  --muted-foreground: 215 16% 47%;
  --destructive: 0 84% 60%;
  --radius: 0.5rem;
}
.dark { /* mirror dark values from src/index.css */ }
```

Do **not** substitute hardcoded colors (`bg-white`, `text-black`, `bg-[#...]`) — they break the brand match.

### 2.5 Wire-up (API client)

```ts
// builder-api.ts
const BASE = "https://sdtphgskqpelpbwhipls.supabase.co/functions/v1/api-v1-landing";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "x-client-id": process.env.CORE_CLIENT_ID!,
      "x-client-secret": process.env.CORE_CLIENT_SECRET!,
      "Authorization": `Bearer ${userAccessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

export const builderApi = {
  registry:   () => call("/catalog/sections/full"),
  themes:     () => call("/catalog/themes/full"),
  getPage:    (id: string) => call(`/pages/${id}`),
  savePage:   (id: string, patch: Partial<Page>) =>
              call(`/pages/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  snapshot:   (page_id: string, sections: Section[], note?: string) =>
              call("/versions", { method: "POST", body: JSON.stringify({ page_id, sections, note }) }),
};
```

### 2.6 End-to-end reorder flow
```ts
// 1. user drags → SectionListMini calls onReorder(next)
// 2. commit to local history
history.commit(next);
// 3. persist
await builderApi.savePage(pageId, { sections: next });
// 4. (optional) snapshot for undo across sessions
await builderApi.snapshot(pageId, next, "Reordered sections");
```

---

## 3. Checklist to reach 1:1 parity

- [ ] Install `@dnd-kit/*`, `lucide-react`, shadcn `button/card/dialog/scroll-area`.
- [ ] Copy `SectionsTab.tsx`, `SectionList.tsx`, `SectionPicker.tsx`, `Inspector.tsx`, `MotionInspector.tsx`, `BackgroundInspector.tsx`, `LayoutDensityInspector.tsx`, `VisibilityEditor.tsx`.
- [ ] Copy `SectionRenderer.tsx` + every `landing-sections/*` component (or lazy-hydrate from the catalog).
- [ ] Copy `src/lib/landing-sections/types.ts` + `registry.ts` (or build the registry from `/catalog/sections/full`).
- [ ] Copy `use-builder-history.ts`.
- [ ] Import the same HSL tokens into your global CSS.
- [ ] Point the API client at `/api-v1-landing`.

With those in place the other dashboard renders the same 3-column builder, same drag handle, same hover-reveal toolbar, same conditional-rule badge, same inspector, and persists to the same backend as the Core Platform.
