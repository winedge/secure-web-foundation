// Checkr API background check provider (paid, FCRA-compliant)
// This is a placeholder for future implementation when a Checkr API key is available.

interface LeadInfo {
  fullName: string;
  location: string;
  state: string;
  city: string;
  tortType: string;
  ageBucket: string;
  email?: string;
  phone?: string;
}

export async function runCheckrBackgroundCheck(lead: LeadInfo) {
  const checkrApiKey = Deno.env.get("CHECKR_API_KEY");

  if (!checkrApiKey) {
    throw new Error(
      "Checkr API key not configured. Please add your CHECKR_API_KEY in Settings > Secrets to enable paid background checks."
    );
  }

  // Split name for Checkr API
  const nameParts = lead.fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Step 1: Create a candidate in Checkr
  const candidateRes = await fetch("https://api.checkr.com/v1/candidates", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(checkrApiKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      work_locations: [{ state: lead.state, city: lead.city || undefined }],
    }),
  });

  if (!candidateRes.ok) {
    const errText = await candidateRes.text();
    console.error("Checkr candidate creation failed:", errText);
    throw new Error(`Checkr API error: ${candidateRes.status}`);
  }

  const candidate = await candidateRes.json();

  // Step 2: Create an invitation (triggers the background check)
  const invitationRes = await fetch("https://api.checkr.com/v1/invitations", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(checkrApiKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidate_id: candidate.id,
      package: "tasker_standard", // Adjust package as needed
    }),
  });

  if (!invitationRes.ok) {
    const errText = await invitationRes.text();
    console.error("Checkr invitation failed:", errText);
    throw new Error(`Checkr invitation error: ${invitationRes.status}`);
  }

  const invitation = await invitationRes.json();

  // Checkr background checks are asynchronous - return a pending status
  // The actual results come via webhook callbacks
  return {
    overallRiskLevel: "low" as const,
    overallScore: 50,
    bankruptcyCheck: { found: false, count: 0, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    criminalCheck: { felonies: false, misdemeanors: false, felonyCount: 0, misdemeanorCount: 0, details: "Checkr check initiated  |  results pending via webhook.", charges: [], sources: [] },
    civilLitigationCheck: { found: false, count: 0, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    creditRiskIndicator: { level: "good", details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    sanctionsCheck: { found: false, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    identityVerification: { verified: false, confidence: 0, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    sexOffenderRegistry: { found: false, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    watchlistCheck: { found: false, details: "Checkr check initiated  |  results pending via webhook.", sources: [] },
    recommendation: `A Checkr background check has been initiated for ${lead.fullName}. Candidate ID: ${candidate.id}. Invitation ID: ${invitation.id}. Results will be delivered via webhook when complete (typically 1-3 business days).`,
    generatedAt: new Date().toISOString(),
    searchScope: "Checkr FCRA-compliant background check (pending)",
    disclaimers: [
      "This is a professional FCRA-compliant background check via Checkr.",
      "Results are typically available within 1-3 business days.",
      "A webhook will deliver the final results when the check is complete.",
    ],
    _checkr: { candidateId: candidate.id, invitationId: invitation.id, status: "pending" },
  };
}
