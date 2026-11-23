# Music and API security review — 2026-11-22

Scope: repository code, local route tests with substituted database/gateway boundaries, local file/FFmpeg tests and npm dependency audit. No production penetration test, live database writes, bucket requests or dashboard changes were performed. This is not a guarantee that every possible attack is excluded. Review categories follow the [OWASP API Security Top 10](https://owasp.org/projects/api-security-project).

## Remaining critical deployment issue

The bucket was previously confirmed publicly readable. That setting was not re-tested or changed during this review. A leaked original object URL bypasses the app's authentication, purchase check and limits completely. Random, independently generated master keys and suppressed URLs reduce discovery; they do not enforce authorization. Purchase-only original delivery requires private original objects/bucket access at the storage provider. If an original URL was already exposed, revoke public access and invalidate old cached copies. Repo changes alone cannot revoke existing external URLs.

## Findings and changes

- Public marketplace responses use an explicit whitelist with only role-validated preview/artwork URLs. Original storage details are omitted. Track and order JSON serialization now also strips original references even when a document was newly created or explicitly queried with originals selected. Avoid exposing raw aggregation or `lean()` records; schema transforms do not apply there.
- Marketplace player sources come from `previewUrl`, never `audio.master`. The producer's own newly selected local WAV is auditioned through a local blob URL so they can choose their crop; this does not fetch another user's original.
- Homepage/fallback demos previously exposed full-length songs and original download URLs. They now use actual cropped 30-second MP3s at 128/96 kbps, not just a player time limit. Original demo files have been moved locally to ignored `.data/demo-originals/` outside `public/`. Deploy the deletions as well as the new files, and purge any older public demo copies from hosting/CDN caches. Git history may still contain previously public demos; this change does not erase history. Rebuild using `npm run audio:demos` with that private source directory or `DEMO_AUDIO_SOURCE_DIR`.
- The public media route rejects master filenames before storage lookup, validates preview roles and authorizes private/draft assets before caching or conditional 304 responses. Distinct random UUIDs are used for original and preview files; changing a preview suffix cannot identify its original.
- Purchased downloads query by order ID **and current buyer ID and PAID status**, and proxy original bytes without exposing a bucket redirect. Other account IDs, pending/cancelled orders, invalid item indexes and forged sessions fail. Both GET and HEAD use this boundary. Failed authenticated download probes now consume the download quota before order lookup.
- JWT verification pins algorithm, audience, issuer and token type; sessions load current user roles/status/version from the database. Client role claims and request bodies cannot grant admin rights. Password changes invalidate old session versions. Cookies are HttpOnly, SameSite=Lax and Secure in production.
- Checkout rechecks producer availability, license ownership/version, server price/discount and accepted terms. Callback parameters alone cannot mark an order paid; the server verifies stored amount/authority against the configured gateway before an atomic pending-to-paid transition. A further entitlement gap was fixed: sandbox-paid orders no longer grant original downloads when NODE_ENV=production, even if the record says PAID. Both the endpoint and generated download links enforce this. Development-only sandbox downloads remain available for local testing.
- Remaining direct JSON parsers now use bounded, streamed parsing (normally 16 KiB). All shared JSON intake also has a 30-second read deadline. Uploads already have field/file/total-byte limits, a 120-second intake deadline, per-process concurrency and bounded encoding. File paths and FFmpeg arguments are generated server-side; source filenames are not shell commands or storage paths.
- Protected calls now have shared per-account read/write quotas, supplementing existing upload, checkout and download budgets. Auth/contact endpoints also have aggregate budgets so rotating submitted email addresses does not evade every limit. Media, catalog, search and callback requests have aggregate service budgets. Forwarding/IP headers are not trusted for identity.
- Baseline response headers prevent framing and MIME sniffing, disable object embeds, restrict base URLs and deny unnecessary camera/microphone/location permissions. The CSP is deliberately limited to these directives; this is not a nonce-based script CSP.
- Dependencies were updated using available patched releases and npm's non-forced audit fixes. The final npm audit after those updates reported zero known vulnerabilities (including development dependencies). This reflects the registry advisory database at review time, not proof of absence of vulnerabilities.

## Rate limits

Counters are atomic MongoDB updates, HMAC-keyed and shared between application instances. `_id` uniqueness enforces limits; TTL only cleans old windows. Limits are fixed windows and can permit a boundary burst up to twice the nominal rate. They fail closed on database errors. Counter storage availability and deployment indexes must be verified separately (`npm run db:indexes`).

| Scope | Budget |
| --- | --- |
| Authenticated reads | 600 per account/minute |
| Authenticated mutations | 120 per account/minute |
| Producer track POST/PATCH | 20 per account/hour |
| Checkout | 10 per account/minute |
| Original downloads, including failed order probes and HEAD | 60 per account/minute |
| Login | 10 per submitted email/15 minutes + 120 service-wide/minute |
| Registration | 3 per submitted email/hour + 20 service-wide/minute |
| Contact | 5 per submitted email/hour + 30 service-wide/minute |
| Public media | 3,000 service-wide/minute |
| Public catalog/search | 1,200 each service-wide/minute |
| Search recording/payment callbacks | 120 each service-wide/minute |

Aggregate limits are resource ceilings, not per-attacker identification: an attacker can consume a service budget and temporarily affect others. These defaults need real traffic tuning. Origin/Fetch-Site checks help prevent browser cross-site requests; scripts can omit/spoof those headers, so they are not authentication. Public previews are intentionally retrievable/downloadable. A purchaser can copy/share downloaded audio; the app cannot revoke those copied bytes.

## Further deployment work

1. Make originals private at storage; preserve authorized server access. This remains the main purchase-access bypass.
2. Configure trusted edge/WAF per-IP and bandwidth/concurrency limits for the whole site, including SSR pages, public search/taxonomy/images and invalid-session traffic. App quotas require requests to reach the app/database and cannot absorb volumetric denial-of-service attacks. CDN redirects are rate-limited only at redirect issuance; subsequent CDN traffic needs edge limits. Do not trust arbitrary client-supplied forwarding headers.
3. Verify real multi-instance Mongo atomic quota behavior, TTL/index deployment, reverse-proxy caching, private-object denial and real payment configuration in an isolated staging environment. The local tests substitute these boundaries; they do not establish deployed configuration.
4. Keep test catalog/orders separate from real licensed content; production refuses sandbox original downloads. Review sessions, secrets, least-privilege storage credentials, logs/alerts, backups and account verification/abuse controls operationally. Registration still has no email-ownership verification gate/CAPTCHA. Aggregate limits reduce abuse but do not prevent distributed account farming or credential stuffing across many accounts.

## Reproduction and checks

`npm run test:security` exercises actual handlers against local substituted boundaries: anonymous/forged/revoked/disabled sessions; order ownership and payment state; invalid item indexes; direct master and traversal requests; private cached previews; admin/producer boundaries; current roles versus token claims; oversized JSON; spoofed forwarding headers and failed-probe quotas; rotated-email aggregate quotas; JSON redaction; forged callback refusal; and demo preview sizes/sources.

Also run `npm run test:media`, `npm run test:uploads`, `npm run test:audio-checks`, `npm run check`, `NEXT_DIST_DIR=.next-qa npm run build` and `npm audit --omit=dev`. No real storage/gateway traffic should be introduced into these tests. The current local Node 21 runtime produces dependency engine warnings; deployment should use a supported Node 22/24 LTS runtime.
