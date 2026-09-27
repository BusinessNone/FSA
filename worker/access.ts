// Defense in depth behind Cloudflare Access. Access blocks unauthenticated requests at the
// edge; this check makes sure a request that reached the Worker carries a valid Access token
// for this application. Skipped when ACCESS_TEAM_DOMAIN or ACCESS_AUD is unset (local dev).

interface Jwk extends JsonWebKey {
  kid: string;
}

let cachedKeys: { domain: string; keys: Jwk[]; fetchedAt: number } | undefined;
const KEY_TTL_MS = 60 * 60 * 1000;

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signingKeys(teamDomain: string, forceRefresh = false): Promise<Jwk[]> {
  const fresh = cachedKeys && cachedKeys.domain === teamDomain && Date.now() - cachedKeys.fetchedAt < KEY_TTL_MS;
  if (fresh && !forceRefresh) return cachedKeys!.keys;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  cachedKeys = { domain: teamDomain, keys, fetchedAt: Date.now() };
  return keys;
}

export async function verifyAccessJwt(token: string, teamDomain: string, audience: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { kid?: string; alg?: string };
  let payload: { aud?: string | string[]; exp?: number; nbf?: number; iss?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch {
    return false;
  }
  if (header.alg !== "RS256" || !header.kid) return false;

  let jwk = (await signingKeys(teamDomain)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await signingKeys(teamDomain, true)).find((k) => k.kid === header.kid);
  if (!jwk) return false;

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  if (!valid) return false;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(audience)) return false;
  if (payload.exp === undefined || payload.exp < now) return false;
  if (payload.nbf !== undefined && payload.nbf > now + 60) return false;
  if (payload.iss !== `https://${teamDomain}`) return false;
  return true;
}
