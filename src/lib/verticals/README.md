# Industry Verticals — Multi-Vertical System

This folder contains the configuration layer that lets LeadThru work for any
lead-driven business (mass tort legal, skin clinics, real estate, solar, dental,
home services, custom).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Database (source of truth)                                    │
│   industry_verticals, vertical_pipeline_stages,               │
│   vertical_intake_fields, vertical_lead_categories,           │
│   vertical_terminology, vertical_ai_prompts,                  │
│   vertical_module_access                                      │
│   ───────── get_vertical_config(_firm_id) ─────────►          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ VerticalProvider (React Query, 5-min cache, realtime)         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  useVertical()                                                │
│   { vertical, stages, terminology, categories, intakeFields,  │
│     enabledModules, term(), hasModule(), isVertical() }       │
└──────────────────────────────────────────────────────────────┘
```

## Adding a new vertical

1. **Insert the vertical row** into `industry_verticals` (set `is_system = true`
   for built-in presets).
2. **Seed pipeline stages** in `vertical_pipeline_stages` with `firm_id = NULL`.
3. **Seed terminology** in `vertical_terminology` (lead label, category label,
   evaluator title, marketplace title, etc.).
4. **Seed lead categories** in `vertical_lead_categories`.
5. **Seed intake fields** in `vertical_intake_fields` (firm_id NULL = system default).
6. **Seed module access** in `vertical_module_access` — list every `module_key`
   that should be available for this vertical.
7. **Seed AI prompts** in `vertical_ai_prompts` for `prompt_type` values:
   `scoring`, `evaluation`, `intake`, `document`, etc.
8. Add a matching `VerticalPreset` to `presets.ts` so the onboarding selector
   shows it.

## Module keys

See `types.ts → ModuleKey`. Pages that should be hidden when the module is
disabled wrap their content in `<ModuleGate moduleKey="..." />`.

## Backward compatibility

- Existing firms were auto-assigned the `mass_tort` vertical at migration time.
- The `tort_type` and `category` columns on `leads` are kept in sync via a
  database trigger so legacy code keeps working while new code uses `category`.
- The `validate_pipeline_stage()` trigger now validates against the firm's
  vertical's `vertical_pipeline_stages` rows (with mass-tort stages whitelisted
  for legacy firms with no `vertical_id`).
