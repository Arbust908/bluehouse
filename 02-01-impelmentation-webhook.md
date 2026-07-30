# Current State
apps/web-dash currently has one public page, one $fetch('/api') call, no navigation, auth, users, API keys, webhook routes, or account UI. The shared schema only contains poll_runs and rate_observations (packages/shared/src/db/schema.ts:41), while the poller only inserts observations (apps/poller/src/poll.ts:18).

The feature therefore requires an end-to-end slice, not only dashboard components.

## Decisions
- Open email/password registration.
- Custom authentication, using Bun.password with Argon2id.
- Cookie sessions for the dashboard.
- Scoped bearer API keys for /api/v1/webhooks.
- Only rate.changed subscriptions in V1.
- Secure delivery from the first release: HMAC, timestamp, retries, SSRF controls, logs, and test events.
- PostgreSQL-backed worker. Redis/BullMQ deferred.
- Signing secrets encrypted at rest, not hashed. The worker must recover the secret to sign deliveries.
- No email verification or password reset until outbound email infrastructure exists.
## API Contract
Route	Authentication	Purpose
POST /api/auth/register	Guest	Create account and session
POST /api/auth/login	Guest	Create session
POST /api/auth/logout	Session	Revoke current session
GET /api/auth/session	Session	Return current user
GET /api/account/api-keys	Session	List key metadata
POST /api/account/api-keys	Session	Create and reveal key once
DELETE /api/account/api-keys/:id	Session	Revoke key
GET /api/v1/webhooks	Session or webhooks:read key	List owned subscriptions
POST /api/v1/webhooks	Session or webhooks:write key	Create subscription
GET /api/v1/webhooks/:id	Session or read key	Subscription and summary
DELETE /api/v1/webhooks/:id	Session or write key	Disable subscription
GET /api/v1/webhooks/:id/deliveries	Session or read key	Cursor-paginated logs
POST /api/v1/webhooks/:id/test	Session or write key	Queue signed test event
Webhook creation settles the conflicting document examples on:
```json
{
  "url": "https://example.com/hooks/rates",
  "events": ["rate.changed"]
}
```
The response reveals whsec_... once. List and detail responses never expose it.
## Implementation Plan
1. Define shared contracts
- Add Zod request/response schemas and domain types under packages/shared/src/.
- Define rate.changed payload values as decimal strings to preserve PostgreSQL numeric precision.
- Define a consistent API error envelope: code, message, and optional field errors.
- Export auth scopes, event types, delivery statuses, retry schedule, and DTOs through packages/shared/package.json.
2. Add persistence
- Extend packages/shared/src/db/schema.ts.
- Add users: normalized email, password hash, timestamps.
- Add sessions: hashed random token, user, expiry, last-used timestamp.
- Add api_keys: user, name, prefix, key hash, scopes, last-used and revoked timestamps.
- Add webhook_subscriptions: user, URL, encrypted secret, IV, key version, active/deleted timestamps.
- Add webhook_subscription_events: subscription and event type.
- Add events: immutable event type, versioned JSON payload, created timestamp.
- Add webhook_deliveries: event, subscription, status, attempts, retry/lease timestamps.
- Add webhook_delivery_attempts: status code, duration, safe error summary, attempted timestamp.
- Add ownership, queue, and uniqueness indexes, including unique (event_id, subscription_id).
- Generate and review a Drizzle migration rather than hand-editing generated snapshots.
3. Implement custom authentication
- Add server helpers under apps/web-dash/server/utils/auth/.
- Hash passwords with Bun.password.hash(..., { algorithm: 'argon2id' }).
- Generate high-entropy session tokens; store only SHA-256 hashes.
- Use an HttpOnly, SameSite=Lax, Secure production cookie.
- Validate Origin on cookie-authenticated mutations.
- Add login and registration throttling using PostgreSQL-backed counters.
- Normalize email before uniqueness checks and return generic login failures.
- Add route middleware protecting /account/**.
4. Implement API keys
- Use an identifiable format such as `fx_live_<prefix>_<secret>`.
- Store only the complete key hash and display prefix.
- Reveal the key only in the creation response.
- Initially support webhooks:read and webhooks:write.
- Add a shared principal resolver supporting either a browser session or bearer API key.
- Enforce ownership in every query rather than checking after loading unrestricted rows.
5. Implement webhook management services
- Keep database and business logic out of route handlers under apps/web-dash/server/services/webhooks/.
- Encrypt whsec_... with AES-GCM using a versioned WEBHOOK_ENCRYPTION_KEY.
- Validate URLs during creation and again immediately before delivery.
- Require HTTPS in production.
- Reject credentials, nonstandard schemes, loopback, private, link-local, multicast, metadata, and internal IPv4/IPv6 destinations.
- Treat deletion as deactivation so delivery history remains available; cancel pending deliveries.
- Keep response bodies out of logs by default to avoid persisting consumer secrets.
6. Add account UI
- Add `app/pages/login.vue` and `app/pages/register.vue`.
- Add `app/layouts/account.vue` with responsive account navigation.
- Add `app/pages/account/webhooks/index.vue` for creation and subscription listing.
- Add `app/pages/account/webhooks/[id].vue` for delivery history and test delivery.
- Add `app/pages/account/api-keys.vue` for create/list/revoke.
- Add a one-time secret/key disclosure panel with explicit copy and confirmation behavior.
- Extend `DashHeader.vue` with sign-in/account navigation without turning the public homepage into a generic admin dashboard.
- Preserve the existing warm palette, typography, max-w-6xl layout, visible focus, and reduced-motion behavior.
- Cover loading, empty, validation, unauthorized, destructive confirmation, and retry states.
7. Produce real rate events
- Update `apps/poller/src/poll.ts` to load the latest observation per provider/currency/casa.
- Distinguish a newly observed timestamp from an actual buy/sell change.
- Insert rate.changed only when the quoted values changed.
- Store the observation, immutable event, and matching deliveries in one transaction.
- Include stable event ID, previous/current rates, casa, observedAt, and event creation time.
- Preserve existing observation deduplication.
8. Add the PostgreSQL worker
- Create `apps/webhook-worker` rather than running background loops inside Nitro.
- Claim due deliveries with FOR UPDATE SKIP LOCKED and a lease timestamp.
- Use controlled concurrency and a request timeout.
- Treat any 2xx response as success.
- Disable redirects to prevent SSRF through redirect targets.
- Retry immediately, then after 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours.
- Mark delivery permanently failed after the final attempt.
- Recover abandoned processing leases after worker crashes.
- Send stable Webhook-Id, Webhook-Timestamp, and Webhook-Signature headers.
- Define the signature as `v1=<base64url HMAC-SHA256(secret, timestamp + "." + rawBody)>`.
- Route test events through the same delivery and signing pipeline.
9. Infrastructure and configuration
- Add the worker to `docker-compose.local.yml` and deployment configuration.
- Add documented WEBHOOK_ENCRYPTION_KEY, session duration, public app origin, worker concurrency, and timeout settings.
- Update /api/health to report database connectivity and worker freshness.
- Keep Redis out of V1; introduce it only if PostgreSQL queue contention becomes measurable.
10. Verification
- Unit-test password/session hashing, API-key parsing, encryption, signatures, backoff, URL validation, private IP ranges, and DTO schemas.
- Integration-test registration, login/logout, session expiry, key scopes, ownership isolation, one-time secrets, CRUD, pagination, and deletion.
- Test poller behavior for unchanged timestamps, changed prices, and atomic event creation.
- Test worker success, timeout, non-2xx, retries, duplicate claims, expired leases, redirects, DNS/private-address rejection, and test events.
- Run bun test, bun run typecheck, and the apps/web-dash production build.
- Exercise registration through signed test delivery in a browser at desktop and mobile widths.
Explicitly Deferred
- Redis/BullMQ.
- Multiple webhook event types or rate-specific filters.
- Organizations and teams.
- Email verification and password reset.
- Secret rotation and manual redelivery.
- Exactly-once delivery; V1 guarantees at-least-once delivery.
- Long-term delivery-log retention controls.

The implementation should be split into reviewable milestones: schema/contracts, auth/API keys, webhook management UI/API, event production, then worker/security verification. No files were changed during this planning pass.