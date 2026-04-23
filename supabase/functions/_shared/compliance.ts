/**
 * Vertical-aware compliance checker for AI image/video generation prompts.
 *
 * Scans user-supplied creative briefs and AI-generated image/video prompts
 * for risky claims (guarantees of outcome, before/after promises, fair-housing
 * violations, unverifiable savings, medical guarantees, etc.) and either:
 *   - BLOCKS the generation when a hard violation is detected, OR
 *   - REWRITES the prompt to a compliant variant when a soft violation is detected.
 *
 * Rules are tailored per-vertical (mass_tort, skin_clinic, dental, real_estate,
 * solar, home_services) and a generic fallback set always applies.
 */

export type ComplianceSeverity = "block" | "rewrite";

export interface ComplianceFinding {
  rule_id: string;
  severity: ComplianceSeverity;
  matched_text: string;
  reason: string;
  suggestion?: string;
}

export interface ComplianceResult {
  /** True if generation is allowed to proceed (possibly with the rewritten prompt). */
  allowed: boolean;
  /** True when the prompt was modified to remove risky language. */
  rewritten: boolean;
  /** Original prompt as supplied. */
  original_prompt: string;
  /** Prompt that should actually be sent to the model (rewritten if needed). */
  safe_prompt: string;
  /** All rules that fired (block + rewrite). */
  findings: ComplianceFinding[];
  /** Vertical the rules were evaluated against. */
  vertical: string;
}

interface Rule {
  id: string;
  /** Case-insensitive regex describing the risky phrase. */
  pattern: RegExp;
  severity: ComplianceSeverity;
  reason: string;
  /** Replacement string used when severity is "rewrite". */
  replacement?: string;
}

/** Generic rules that apply to every vertical. */
const GENERIC_RULES: Rule[] = [
  {
    id: "generic.guarantee",
    pattern: /\b(guaranteed?|100%\s*guarantee|guarantee\s+results?)\b/gi,
    severity: "rewrite",
    reason: "Avoid guarantees of outcome | unverifiable claim",
    replacement: "designed to help",
  },
  {
    id: "generic.miracle",
    pattern: /\b(miracle|magic\s+(?:cure|fix|solution))\b/gi,
    severity: "rewrite",
    reason: "Avoid miracle / magic claims | unverifiable",
    replacement: "effective",
  },
  {
    id: "generic.risk_free",
    pattern: /\b(risk[-\s]?free|no\s+risk)\b/gi,
    severity: "rewrite",
    reason: "Avoid 'risk-free' | implies guarantee",
    replacement: "low-commitment",
  },
];

const VERTICAL_RULES: Record<string, Rule[]> = {
  mass_tort: [
    {
      id: "mass_tort.outcome_guarantee",
      pattern: /\b(we\s+will\s+win|win\s+your\s+case|guaranteed\s+settlement|guaranteed\s+(?:compensation|payout|recovery))\b/gi,
      severity: "block",
      reason: "State bar rules prohibit guarantees of legal outcome",
    },
    {
      id: "mass_tort.specific_amount_promise",
      pattern: /\b(get|receive|win)\s+\$[\d,]+(?:\s*(?:million|thousand|k|m))?\b/gi,
      severity: "rewrite",
      reason: "Avoid promising specific compensation amounts",
      replacement: "may be eligible for compensation",
    },
    {
      id: "mass_tort.no_fees_unless",
      pattern: /\b(no\s+fees?\s+unless\s+we\s+win)\b/gi,
      severity: "rewrite",
      reason: "Contingency claims must be carefully worded per state bar",
      replacement: "contingency-fee representation available",
    },
  ],
  skin_clinic: [
    {
      id: "skin.before_after_guarantee",
      pattern: /\b(guaranteed\s+results?|permanent\s+results?|cure\s+(?:acne|wrinkles|aging))\b/gi,
      severity: "block",
      reason: "HIPAA-conscious | medical results cannot be guaranteed",
    },
    {
      id: "skin.cure_claim",
      pattern: /\b(cures?|heals?|reverses?)\s+(?:aging|wrinkles|scars|acne)\b/gi,
      severity: "rewrite",
      reason: "Medical claims must be substantiated",
      replacement: "may improve the appearance of",
    },
  ],
  dental: [
    {
      id: "dental.painless_guarantee",
      pattern: /\b(painless|pain[-\s]?free)\s+(?:dentistry|procedure|treatment)\b/gi,
      severity: "rewrite",
      reason: "Avoid absolute pain-free claims",
      replacement: "comfortable",
    },
    {
      id: "dental.permanent",
      pattern: /\b(permanent\s+(?:whitening|results)|guaranteed\s+smile)\b/gi,
      severity: "rewrite",
      reason: "Cosmetic dental results vary by patient",
      replacement: "long-lasting",
    },
  ],
  real_estate: [
    {
      id: "re.fair_housing_protected_class",
      pattern: /\b(no\s+(?:kids|children|families)|adults?\s+only|christian\s+(?:family|community)|whites?\s+only|men\s+only|women\s+only|no\s+(?:disabled|handicap|wheelchair))\b/gi,
      severity: "block",
      reason: "Fair Housing Act | discriminatory language prohibited",
    },
    {
      id: "re.exclusive_neighborhood",
      pattern: /\b(exclusive\s+(?:neighborhood|community)|safe\s+neighborhood|good\s+schools)\b/gi,
      severity: "rewrite",
      reason: "Fair Housing | avoid steering language",
      replacement: "well-established neighborhood",
    },
  ],
  solar: [
    {
      id: "solar.specific_savings",
      pattern: /\b(save\s+\$[\d,]+|cut\s+(?:your\s+)?bill\s+by\s+\d+%|free\s+solar|\$0\s+(?:down|installation))\b/gi,
      severity: "rewrite",
      reason: "FTC | be honest about incentives, no specific savings promises",
      replacement: "potential savings on energy costs",
    },
    {
      id: "solar.govt_program_misrep",
      pattern: /\b(government\s+(?:will\s+)?pay|free\s+government\s+(?:program|grant))\b/gi,
      severity: "block",
      reason: "Misrepresenting government programs is a deceptive practice",
    },
  ],
  home_services: [
    {
      id: "home.lifetime_guarantee",
      pattern: /\b(lifetime\s+(?:guarantee|warranty)|never\s+(?:break|fail))\b/gi,
      severity: "rewrite",
      reason: "Avoid unsubstantiated lifetime claims",
      replacement: "long-lasting workmanship",
    },
  ],
};

function rulesFor(verticalSlug: string): Rule[] {
  const v = VERTICAL_RULES[verticalSlug] ?? [];
  return [...v, ...GENERIC_RULES];
}

/**
 * Validate (and optionally rewrite) a prompt for compliance.
 * Pass the firm's vertical slug (e.g. "mass_tort", "skin_clinic"). Defaults to "mass_tort".
 */
export function checkPromptCompliance(
  prompt: string,
  verticalSlug: string = "mass_tort"
): ComplianceResult {
  const findings: ComplianceFinding[] = [];
  let safe = prompt ?? "";
  const rules = rulesFor(verticalSlug);

  for (const rule of rules) {
    const matches = safe.match(rule.pattern);
    if (!matches || matches.length === 0) continue;

    for (const m of matches) {
      findings.push({
        rule_id: rule.id,
        severity: rule.severity,
        matched_text: m,
        reason: rule.reason,
        suggestion: rule.replacement,
      });
    }

    if (rule.severity === "rewrite" && rule.replacement !== undefined) {
      safe = safe.replace(rule.pattern, rule.replacement);
    }
  }

  const blocked = findings.some((f) => f.severity === "block");
  const rewritten = !blocked && safe !== prompt;

  return {
    allowed: !blocked,
    rewritten,
    original_prompt: prompt,
    safe_prompt: safe,
    findings,
    vertical: verticalSlug,
  };
}

/**
 * Build a short JSON-serializable summary for the response payload so the UI
 * can show the user exactly what was flagged or rewritten.
 */
export function summarizeCompliance(result: ComplianceResult) {
  return {
    allowed: result.allowed,
    rewritten: result.rewritten,
    vertical: result.vertical,
    findings: result.findings,
    original_prompt: result.original_prompt,
    safe_prompt: result.safe_prompt,
  };
}
