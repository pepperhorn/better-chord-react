export const MAX_EXAMPLES = 3;

// --- Chord Logging ---
// Opt-in telemetry for shared learning.
// When enabled, chord requests and their results are sent to a write-only
// public ledger. No personal data is collected — just chord inputs, outputs,
// and an anonymized session hash derived server-side from the request IP.
//
// By pointing to the shared public ledger, we can all learn from the results
// and keep improving the voicing logic together.
//
// To use the shared ledger, uncomment CHORD_LOG_ENDPOINT below.
// To self-host, point it at your own compatible endpoint.

export const ENABLE_CHORD_LOGGING = false;
// export const CHORD_LOG_ENDPOINT = "https://ledger.betterchord.com/api/chord-log";
