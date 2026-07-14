const DEBUG_INGEST_URL =
  'http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c';
const DEBUG_SESSION_ID = 'ecd1ac';

export function debugIngest(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix'
): void {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // Visible in Vercel Function logs when testing production.
  console.log('[debug-ecd1ac]', JSON.stringify(payload));

  // #region agent log
  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
