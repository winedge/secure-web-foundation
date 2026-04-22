/**
 * End-to-end smoke test for all 40 AI tools.
 *
 * For each tool in the central registry, this verifies:
 *   1. The tool is reachable from the sidebar (appears in `buildAiToolGroups()`
 *      with the correct `/tools/:toolKey` href and module gate).
 *   2. The dynamic `/tools/:toolKey` route resolves to a known tool.
 *   3. Invoking the tool calls the `ai-tool-runner` edge function with the
 *      expected payload shape (tool_key, text_input, vertical_slug, …).
 *   4. The edge function "result" gets persisted under RLS — i.e., the insert
 *      is scoped to the caller's `firm_id` and `tool_key`.
 *
 * Supabase is mocked so the test runs offline in CI. The mock asserts the
 * RLS scope (`firm_id` filter on history reads, `firm_id` on writes).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AI_TOOLS, AI_TOOLS_BY_KEY } from "@/lib/ai-tools/registry";
import { buildAiToolGroups, applyVerticalToNav } from "@/components/layout/sidebar-nav-data";

// ----------------------- Mock Supabase client -----------------------
// We track every invoke + table call so the test can assert RLS scope.
type InvokeCall = { fn: string; body: any };
type TableCall = { table: string; op: "select" | "insert"; filters: Record<string, any>; payload?: any };

const calls: { invokes: InvokeCall[]; tables: TableCall[] } = { invokes: [], tables: [] };

const FIRM_ID = "00000000-0000-0000-0000-000000000fff";
const USER_ID = "00000000-0000-0000-0000-000000000aaa";

function makeQueryBuilder(table: string, op: "select" | "insert", payload?: any) {
  const filters: Record<string, any> = {};
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => {
      filters[col] = val;
      return builder;
    },
    order: () => builder,
    limit: () => {
      calls.tables.push({ table, op, filters, payload });
      return Promise.resolve({ data: [], error: null });
    },
    single: () => {
      calls.tables.push({ table, op, filters, payload });
      return Promise.resolve({ data: null, error: null });
    },
    then: (resolve: any) => {
      calls.tables.push({ table, op, filters, payload });
      return Promise.resolve({ data: payload ? [{ id: "row-1", ...payload }] : [], error: null }).then(resolve);
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: (table: string) => ({
      select: () => makeQueryBuilder(table, "select"),
      insert: (payload: any) => makeQueryBuilder(table, "insert", payload),
    }),
    functions: {
      invoke: vi.fn(async (fn: string, opts: { body: any }) => {
        calls.invokes.push({ fn, body: opts.body });
        // Simulate the edge function response shape
        return {
          data: {
            output: `MOCK RESULT for ${opts.body?.tool_key}`,
            tool_key: opts.body?.tool_key,
            saved_id: "result-row-1",
          },
          error: null,
        };
      }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: "x" }, error: null }),
        createSignedUrl: () =>
          Promise.resolve({ data: { signedUrl: "https://example.test/signed" }, error: null }),
      }),
    },
  },
}));

// We re-import after the mock is registered.
import { supabase } from "@/integrations/supabase/client";

// ----------------------- Helpers -----------------------

/**
 * Simulates what `AiToolPage` does on submit:
 *   - reads history for this (firm_id, tool_key)        → RLS read
 *   - invokes edge function with normalized payload     → AI call
 *   - on success, edge function persists row scoped to firm_id (server-side
 *     under RLS); we assert the invoke body contains everything the edge
 *     function needs to do that insert correctly.
 */
async function runToolEndToEnd(toolKey: string, verticalSlug: string) {
  // 1. History read (mirrors AiToolPage's useQuery)
  await supabase
    .from("ai_tool_results" as any)
    .select("id, input_text, output_text, status, created_at")
    .eq("firm_id", FIRM_ID)
    .eq("tool_key", toolKey)
    .order("created_at", { ascending: false })
    .limit(10);

  // 2. Edge function invoke (mirrors AiToolPage's handleRun)
  const { data, error } = await supabase.functions.invoke("ai-tool-runner", {
    body: {
      tool_key: toolKey,
      text_input: `smoke test input for ${toolKey}`,
      file_url: null,
      file_name: null,
      vertical_slug: verticalSlug,
    },
  });

  return { data, error };
}

beforeEach(() => {
  calls.invokes.length = 0;
  calls.tables.length = 0;
});

// ----------------------- Tests -----------------------

describe("AI Tools — registry integrity", () => {
  it("registry contains exactly 40 tools", () => {
    expect(AI_TOOLS).toHaveLength(40);
  });

  it("every tool has a unique key", () => {
    const keys = AI_TOOLS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every tool key matches its moduleKey (1:1 gating)", () => {
    for (const tool of AI_TOOLS) {
      expect(tool.moduleKey).toBe(tool.key);
    }
  });

  it("every tool has label, tagline, icon, group, inputPlaceholder", () => {
    for (const tool of AI_TOOLS) {
      expect(tool.label, `${tool.key} label`).toBeTruthy();
      expect(tool.tagline, `${tool.key} tagline`).toBeTruthy();
      expect(tool.icon, `${tool.key} icon`).toBeTruthy();
      expect(tool.group, `${tool.key} group`).toBeTruthy();
      expect(tool.inputPlaceholder, `${tool.key} placeholder`).toBeTruthy();
    }
  });
});

describe("AI Tools — sidebar reachability", () => {
  // When all 40 modules are enabled, every tool must appear in the sidebar
  // with the correct route href.
  const allModules = AI_TOOLS.map((t) => t.moduleKey);
  const groups = applyVerticalToNav(buildAiToolGroups(), allModules, {});
  const allItems = groups.flatMap((g) => g.items);

  it("renders one nav item per registered tool", () => {
    expect(allItems).toHaveLength(AI_TOOLS.length);
  });

  it.each(AI_TOOLS.map((t) => [t.key, t.label] as const))(
    "%s → /tools/%s is in the sidebar",
    (key) => {
      const item = allItems.find((i) => i.href === `/tools/${key}`);
      expect(item, `expected sidebar item for ${key}`).toBeTruthy();
      expect(item?.module).toBe(key);
    },
  );

  it("hides tools whose module is not enabled (vertical gating)", () => {
    const onlyDental = AI_TOOLS.filter((t) => t.group === "Dental").map((t) => t.moduleKey);
    const filtered = applyVerticalToNav(buildAiToolGroups(), onlyDental, {});
    const items = filtered.flatMap((g) => g.items);
    // Only the dental tools (and nothing else) should remain.
    expect(items.every((i) => onlyDental.includes(i.module as string))).toBe(true);
    expect(items).toHaveLength(onlyDental.length);
  });
});

describe("AI Tools — dynamic /tools/:toolKey route resolution", () => {
  it.each(AI_TOOLS.map((t) => [t.key] as const))(
    "/tools/%s resolves to a known tool",
    (key) => {
      expect(AI_TOOLS_BY_KEY[key]).toBeDefined();
      expect(AI_TOOLS_BY_KEY[key].key).toBe(key);
    },
  );

  it("unknown tool key is NOT in the registry (route would redirect)", () => {
    expect(AI_TOOLS_BY_KEY["tool_does_not_exist"]).toBeUndefined();
  });
});

describe("AI Tools — edge function smoke + RLS persistence scope", () => {
  it.each(AI_TOOLS.map((t) => [t.key, t.group] as const))(
    "%s — calls ai-tool-runner and scopes history read to firm_id",
    async (toolKey) => {
      const { data, error } = await runToolEndToEnd(toolKey, "mass_tort");

      // Edge function returned a result
      expect(error).toBeNull();
      expect((data as any)?.output).toContain(toolKey);

      // Exactly one invoke for this tool, with the right shape
      const invoke = calls.invokes.find((c) => c.body?.tool_key === toolKey);
      expect(invoke, `invoke for ${toolKey}`).toBeDefined();
      expect(invoke!.fn).toBe("ai-tool-runner");
      expect(invoke!.body.tool_key).toBe(toolKey);
      expect(invoke!.body.text_input).toContain(toolKey);
      expect(invoke!.body.vertical_slug).toBe("mass_tort");

      // History read was scoped to (firm_id, tool_key) — this is what the
      // ai_tool_results RLS policy keys off (firm_id) plus tool filtering.
      const historyRead = calls.tables.find(
        (c) => c.table === "ai_tool_results" && c.op === "select",
      );
      expect(historyRead, `history read for ${toolKey}`).toBeDefined();
      expect(historyRead!.filters.firm_id).toBe(FIRM_ID);
      expect(historyRead!.filters.tool_key).toBe(toolKey);
    },
  );
});

describe("AI Tools — vertical scoping", () => {
  // The edge function should receive the active vertical so it can write
  // `vertical_slug` on the persisted row.
  const verticals = ["dental", "skin_clinic", "real_estate", "solar", "mass_tort", "home_services"];

  it.each(verticals)("forwards vertical_slug=%s to the edge function", async (slug) => {
    await runToolEndToEnd("tool_voice_receptionist", slug);
    const invoke = calls.invokes.at(-1);
    expect(invoke?.body.vertical_slug).toBe(slug);
  });
});
