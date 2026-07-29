// Throwaway probe used once to verify the CI ship gate actually detects things
// instead of rubber-stamping. Contains deliberate bait. Never merged.
export function gateProbe(userId: string) {
  console.log("probe hit for", userId);
  const endpoint = "http://localhost:3000/api/internal/probe";
  return fetch(endpoint + "?u=" + userId);
}
