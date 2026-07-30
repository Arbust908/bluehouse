Yeah — the conversion endpoint is probably the feature that turns this from “exchange-rate dashboard” into an actually useful service.

## 1. Your historical conversion idea is solid

I’d design it around a deterministic rule:

```http
POST /api/v1/convert
```

```json
{
  "currency": "blue",
  "side": "sell",
  "items": [
    {
      "id": "invoice-123",
      "date": "2026-07-15",
      "amount": 125000
    },
    {
      "id": "subscription-456",
      "datetime": "2026-07-22T14:32:00-03:00",
      "amount": 39990
    }
  ]
}
```

Response:

```json
{
  "currency": "blue",
  "side": "sell",
  "items": [
    {
      "id": "invoice-123",
      "date": "2026-07-15",
      "amount": 125000,
      "convertedAmount": 96.15,
      "rate": 1300,
      "rateTimestamp": "2026-07-15T18:05:22-03:00"
    }
  ]
}
```

The important part is defining **exactly what historical rate means**.

### For a date

```text
2026-07-15
```

Use:

> Latest known rate at or before `2026-07-15 23:59:59 America/Argentina/Buenos_Aires`.

### For a datetime

```text
2026-07-15T14:30:00-03:00
```

Use:

> Latest known rate whose timestamp is `<= requested datetime`.

That's effectively an **as-of query**:

```sql
SELECT *
FROM exchange_rates
WHERE type = $1
  AND observed_at <= $2
ORDER BY observed_at DESC
LIMIT 1;
```

This is exactly the behavior I'd expect from this API.

---

## 2. There's one detail I'd change

Don't return only:

```json
{
  "amount": 125000,
  "usd": 96.15
}
```

Return the **rate used** too.

```json
{
  "amount": 125000,
  "convertedAmount": 96.15,

  "rate": {
    "type": "blue",
    "side": "sell",
    "value": 1300,
    "observedAt": "2026-07-15T17:32:10-03:00"
  }
}
```

That gives you reproducibility.

Six months later, you can answer:

> Why did this API calculate US$96.15?

because you know precisely which observation generated it.

I'd actually include:

```json
"requestedAt": "2026-07-15T14:30:00-03:00",
"rateObservedAt": "2026-07-15T14:22:11-03:00"
```

rather than pretending the rate was measured at 14:30.

---

# 3. Your database is becoming a time-series database

Conceptually you now have:

```text
RateObservation
─────────────────────────
id
type
buy
sell
observed_at
source
source_timestamp?
created_at
```

And your poll table:

```text
Poll
─────────────────────────
id
started_at
finished_at
successful
status_code
error
```

Possibly:

```text
Poll
  │
  └── RateObservation[]
```

Your current logic:

```text
poll
 ↓
receive rates
 ↓
compare latest stored value
 ↓
changed?
 ├── yes → store observation
 └── no
      ↓
      have observation today?
      ├── yes → do nothing
      └── no  → store daily observation
```

is perfectly reasonable.

There's one distinction worth maintaining:

```text
observedAt
```

versus

```text
createdAt
```

because they're not necessarily the same thing.

---

# 4. The big edge case: weekends and missing data

Suppose someone requests:

```text
Sunday 2026-07-19 12:00
```

and your last observation was:

```text
Friday 2026-07-17 18:03
```

I think returning Friday's rate is correct.

But tell them that's what happened:

```json
{
  "requestedAt": "2026-07-19T12:00:00-03:00",
  "rateObservedAt": "2026-07-17T18:03:00-03:00",
  "rate": 1295
}
```

Potentially:

```json
"ageSeconds": 237420
```

That turns out to be extremely useful for consumers of financial APIs.

---

# 5. Batch conversion is a great API

And I'd allow them to mix dates:

```json
{
  "items": [
    {
      "id": "netflix",
      "amount": 14999,
      "datetime": "2026-05-04T13:40:00-03:00"
    },
    {
      "id": "aws",
      "amount": 82730,
      "date": "2026-06-15"
    },
    {
      "id": "hosting",
      "amount": 34000,
      "date": "2026-07-15"
    }
  ]
}
```

The arbitrary `id` is important.

Otherwise callers have to match your response array against their original array by index.

---

# 6. Consider making conversion direction explicit

Eventually you may want more than:

```text
ARS → USD
```

So instead of baking that assumption into your API:

```json
{
  "from": "ARS",
  "to": "USD",
  "rateType": "blue",
  "amount": 125000
}
```

Then later:

```text
USD → ARS
ARS → USD
USD → USDT
ARS → USDT
```

become possible without redesigning it.

And definitely make `buy` / `sell` explicit. Argentine exchange rates make this distinction important.

---

# 7. Features I'd add

You already have:

```text
Current rate
Historical rate
Range
Historical conversion
Dashboard
```

There are several natural extensions.

### Rate comparison

```http
GET /rates/compare?types=blue,official,card
```

Response:

```json
{
  "official": 1025,
  "blue": 1310,
  "card": 1378,
  "spread": {
    "blueVsOfficial": 27.8,
    "cardVsOfficial": 34.4
  }
}
```

This would make the dashboard much more useful.

---

### Percentage change

Let the API calculate:

```text
24h
7d
30d
YTD
1y
```

instead of making every client calculate it.

For example:

```http
GET /rates/blue/change?period=7d
```

```json
{
  "current": 1310,
  "previous": 1270,
  "absoluteChange": 40,
  "percentageChange": 3.1496
}
```

You can then reuse the exact same logic everywhere.

---

### OHLC data

This one becomes really interesting once you collect multiple observations per day:

```json
{
  "date": "2026-07-29",
  "open": 1290,
  "high": 1315,
  "low": 1285,
  "close": 1310
}
```

Then your frontend can eventually draw financial charts.

Endpoints like:

```http
GET /rates/blue/candles?interval=1d
GET /rates/blue/candles?interval=1h
```

Your existing dataset already gets you most of the way there.

---

### Expense conversion

You could build directly around your original use case:

```http
POST /expenses/convert
```

and return totals as well:

```json
{
  "items": [...],

  "summary": {
    "ars": 438720,
    "usd": 341.17
  }
}
```

That would be fantastic for importing:

```text
credit card statements
AWS bills
subscriptions
invoices
travel expenses
```

---

# 8. One feature I'd especially add: `$now` metadata

Something like:

```http
GET /rates
```

```json
{
  "data": {...},

  "meta": {
    "lastUpdated": "2026-07-29T11:43:23-03:00",
    "lastSuccessfulPoll": "2026-07-29T11:43:23-03:00",
    "source": "...",
    "stale": false
  }
}
```

Because:

```text
API responding successfully
```

doesn't necessarily mean:

```text
upstream data collection is working.
```

Your poller might have been broken for three days.

Having a `stale` flag is valuable.

---

# 9. Redis absolutely makes sense

Your architecture:

```text
                    ┌──────────────┐
                    │ Data Source  │
                    └──────┬───────┘
                           │
                        Poller
                           │
                           ▼
                    ┌──────────────┐
                    │ PostgreSQL 18│
                    └──────┬───────┘
                           │
                           ▼
Client ────────► Nuxt/Nitro API
                   │        │
                   ▼        ▼
                 Redis    Postgres
                   │
             cache / limits
```

is honestly plenty.

I would **not** introduce:

```text
Kafka
RabbitMQ
separate API service
separate frontend service
Kubernetes
```

for this.

You'll learn more by making this architecture extremely solid.

---

# 10. Redis can serve three purposes

### Cache

```text
rates:current
rates:current:blue
rates:history:blue:2026-07
```

Although be careful about caching arbitrary date ranges because you'll generate an enormous cache keyspace.

I'd heavily cache:

```text
/current
/latest
/today
/common periods
```

and lightly/not cache arbitrary historical queries.

Historical data is immutable enough that Postgres can answer those very efficiently anyway.

### Rate limits

Yes.

Something like:

```text
anonymous
10 req / second
100 req / minute

API key
100 req / second
10,000 req / hour
```

But **160 requests/second per user is huge**.

That's:

```text
13,824,000 requests/day
```

per API key if sustained.

For your use case I'd start closer to:

```text
Anonymous
5 req/sec
100 req/hour

Free API key
20 req/sec
5,000 req/day
```

The burst limit can be relatively generous while the daily quota protects you from scripts going rogue.

---

# 11. Make API keys scopes, not just identifiers

Have:

```text
ApiKey
────────────────────
id
user_id
key_hash
name
created_at
last_used_at
revoked_at
```

Never store:

```text
sk_abc123...
```

Store:

```text
SHA256(sk_abc123...)
```

Display the key once when created.

I'd make keys identifiable:

```text
fx_live_Q7fd2f.....
```

Store the prefix:

```text
fx_live_Q7fd2f
```

so your dashboard can show:

> MacBook script — `fx_live_Q7fd2f...`

without storing the secret.

---

# 12. Accounts open up a surprisingly good feature

Users could define alerts:

```text
Blue sell > AR$1,500
Blue/official spread > 30%
Card rate < AR$1,600
USD moved > 3% today
```

Then:

```text
Poller
  ↓
new observation
  ↓
evaluate alerts
  ↓
email / webhook
```

That's probably the first feature where a small background queue becomes worthwhile.

Not necessarily Redis Streams or RabbitMQ yet.

Even:

```text
alerts table
+
scheduled worker
```

would work.

---

# 13. Webhooks could make this a genuinely cool developer API

For example:

```http
POST /webhooks
```

```json
{
  "event": "rate.changed",
  "rateType": "blue",
  "url": "https://example.com/hooks/usd"
}
```

Then:

```json
{
  "event": "rate.changed",
  "data": {
    "previous": 1290,
    "current": 1310,
    "change": 1.55
  }
}
```

Now somebody doesn't have to poll your API.

And you end up learning:

```text
webhooks
signatures
retries
idempotency
queues
delivery logs
```

which is excellent backend experience.

---

# 14. Infrastructure-wise, I think you're almost done

I'd have:

```text
Docker
├── postgres
├── redis
├── poller
└── nuxt
```

Then outside or alongside those, make sure you have:

```text
Reverse proxy / TLS
Backups
Monitoring
Structured logs
Health checks
```

Especially:

```http
GET /health
```

returning something like:

```json
{
  "api": "ok",
  "database": "ok",
  "redis": "ok",
  "poller": {
    "status": "ok",
    "lastSuccessfulPoll": "2026-07-29T11:42:13-03:00"
  }
}
```

---

## The API I'd aim toward

```text
/api/v1

/rates
/rates/:type
/rates/:type/history
/rates/:type/change
/rates/compare

/convert
/convert/batch

/health
```

Then authenticated:

```text
/me
/api-keys
/usage
/alerts
/webhooks
```

And your frontend becomes just **one consumer of your public API**, which is an excellent architectural constraint.

The part I particularly like about the project is that you're progressively moving through real backend concerns:

```text
polling
→ deduplication
→ historical storage
→ temporal queries
→ REST API
→ caching
→ rate limiting
→ authentication
→ API keys
→ batch operations
→ aggregation
→ monitoring
→ alerts
→ webhooks
```

without artificially inventing complexity. Each piece solves an actual problem created by the preceding feature. That makes this a much better systems/backend portfolio project than merely building a currency dashboard.

---

A webhook is basically **“call me when something happens.”**

Polling works like this:

```text
Client ──GET /rates──> Your API
Client ──GET /rates──> Your API
Client ──GET /rates──> Your API
                       ↑
                 eventually changed
```

A webhook flips that relationship:

```text
Your poller detects change
        ↓
Your API creates an event
        ↓
POST https://client.com/webhooks/exchange-rates
        ↓
Client receives it immediately
```

For your exchange-rate API, it's a very natural feature.

## A concrete example

A user registers:

```http
POST /api/v1/webhooks
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "url": "https://myapp.com/api/webhooks/exchange-rates",
  "events": ["rate.changed"]
}
```

Later your poller sees:

```text
Blue USD
AR$1,300 → AR$1,320
```

You send:

```http
POST https://myapp.com/api/webhooks/exchange-rates
Content-Type: application/json
Webhook-Id: evt_019...
Webhook-Timestamp: 1785332100
Webhook-Signature: v1,...
```

```json
{
  "id": "evt_019...",
  "type": "rate.changed",
  "createdAt": "2026-07-29T15:15:00Z",
  "data": {
    "rateType": "blue",
    "previous": {
      "buy": 1280,
      "sell": 1300
    },
    "current": {
      "buy": 1300,
      "sell": 1320
    },
    "observedAt": "2026-07-29T12:15:00-03:00"
  }
}
```

That's essentially the whole concept.

---

# The important mental model

Don't think:

> The poller sends webhooks.

Think:

```text
poller
  ↓
detect domain event
  ↓
rate.changed event
  ↓
store event
  ↓
webhook system delivers event
```

That separation matters.

Tomorrow `rate.changed` might trigger:

```text
webhook
email alert
push notification
Discord notification
analytics
```

Your poller shouldn't know anything about them.

---

# Step 1: Store webhook subscriptions

Something like:

```ts
type WebhookSubscription = {
  id: string
  userId: string
  url: string

  events: WebhookEventType[]

  secretHash: string

  active: boolean

  createdAt: Date
}
```

Your table could be:

```sql
CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    secret BYTEA NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

I'd probably model subscriptions and events separately rather than storing everything in a JSON blob.

For example:

```text
webhook_subscription
├── id
├── user_id
├── url
├── secret
├── active
└── created_at

webhook_subscription_event
├── webhook_id
└── event_type
```

---

# Step 2: Define your events

Start very small.

```ts
type WebhookEvent =
  | RateChangedEvent
  | PollFailedEvent

interface RateChangedEvent {
  id: string
  type: 'rate.changed'
  createdAt: string

  data: {
    rateType: RateType
    previous: Rate
    current: Rate
    observedAt: string
  }
}
```

Possible events later:

```text
rate.changed
rate.threshold_reached

collector.failed
collector.recovered

rate.daily_summary
```

But I'd initially expose just:

```text
rate.changed
```

---

# Step 3: Create the event

You already have the perfect location.

Currently:

```ts
const newRate = await pollSource()

if (hasChanged(previousRate, newRate)) {
  await saveRate(newRate)
}
```

Instead:

```ts
if (hasChanged(previousRate, newRate)) {
  const rate = await saveRate(newRate)

  await createEvent({
    type: 'rate.changed',

    data: {
      rateType: rate.type,
      previous: previousRate,
      current: rate,
      observedAt: rate.observedAt,
    },
  })
}
```

Notice that you're **creating an event**, not delivering webhooks here.

---

# Step 4: Store events

This is very important.

Don't just do:

```ts
await fetch(webhook.url, ...)
```

inside the poller.

Have an event table:

```text
events
─────────────────────────
id
type
payload
created_at
```

For example:

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Then:

```ts
await db.insert(events).values({
  id: eventId,
  type: 'rate.changed',
  payload: {
    rateType: 'blue',
    previous,
    current,
  },
})
```

Now the event exists independently of delivery.

That means you don't lose it because:

```text
client server was offline
DNS failed
your process restarted
request timed out
```

---

# Step 5: Create deliveries

Suppose three users subscribe to:

```text
rate.changed
```

One event creates three **deliveries**:

```text
              evt_123
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      Alice     Bob     Carlos
        │        │        │
      sent     failed    sent
```

So add:

```text
webhook_deliveries
──────────────────────────
id
event_id
subscription_id

status
attempts

last_attempt_at
next_attempt_at

response_status
response_body

created_at
delivered_at
```

This distinction is important:

```text
EVENT

"Blue changed from 1300 → 1320"
```

vs

```text
DELIVERY

"We tried to send event evt_123
 to subscription hook_456."
```

One event can therefore have many deliveries.

---

# Step 6: Have a worker deliver them

This is where a worker becomes useful.

```ts
async function processWebhookDelivery(delivery: Delivery) {
  const webhook = await getSubscription(delivery.subscriptionId)
  const event = await getEvent(delivery.eventId)

  const response = await fetch(webhook.url, {
    method: 'POST',

    headers: {
      'content-type': 'application/json',
    },

    body: JSON.stringify(event),
  })

  if (response.ok) {
    await markDelivered(delivery.id)
  } else {
    await scheduleRetry(delivery.id)
  }
}
```

Your architecture becomes:

```text
                Source
                  │
                  ▼
               Poller
                  │
                  ▼
              PostgreSQL
             Rates + Events
                  │
                  ▼
             Redis Queue
                  │
                  ▼
           Webhook Worker
                  │
                  │ HTTP POST
                  ▼
             User Server
```

Since you're already adding Redis, this is a reasonable place to introduce a job queue.

For Node, something like **BullMQ** works well with Redis.

But you could absolutely implement V1 using Postgres alone.

---

# Why a queue?

Imagine 5,000 webhook subscriptions.

Blue changes.

You absolutely don't want:

```ts
for (const webhook of webhooks) {
  await fetch(webhook.url)
}
```

inside your poller.

Your poller would potentially spend minutes contacting other people's servers.

Instead:

```text
rate changed
     ↓
event created
     ↓
5,000 jobs queued
     ↓
poller continues
```

Workers can independently process:

```text
job
job
job
job
...
```

with controlled concurrency.

---

# The next problem: failures

Suppose my server is temporarily down:

```text
POST fran.dev/webhook
        ↓
      503
```

You shouldn't immediately give up.

Use exponential backoff:

```text
Attempt 1 → immediately
Attempt 2 → +1 min
Attempt 3 → +5 min
Attempt 4 → +30 min
Attempt 5 → +2 h
Attempt 6 → +12 h
```

Then perhaps:

```text
failed permanently
```

You can eventually disable endpoints that consistently fail.

This is one of the key guarantees webhook systems provide:

> at-least-once delivery

Notice that this **doesn't** mean exactly once.

---

# And that introduces duplicates

Suppose:

```text
Your service ─────► Client
                    │
                    └── processes event successfully

Your service ◄──── connection dies
```

You never receive their:

```http
200 OK
```

So you retry.

Now they receive:

```text
evt_123
evt_123
```

Therefore every event needs an ID:

```json
{
  "id": "evt_123",
  "type": "rate.changed"
}
```

Consumers can do:

```ts
if (await hasProcessed(event.id)) {
  return
}

await processEvent(event)
await saveProcessedEvent(event.id)
```

That's **idempotency**.

It's one of the biggest webhook concepts to understand.

---

# Step 7: Security

Without authentication, someone could pretend to be your API:

```text
attacker
  │
  POST
  ▼
client webhook endpoint

{
  "type": "rate.changed",
  "sell": 99999999
}
```

The receiver needs to verify:

> Did this really come from your service?

You solve that using a shared secret and HMAC.

When someone creates a webhook:

```text
whsec_yRGt9...
```

Give this secret to them **once**.

You also store it securely.

Then before sending:

```ts
const signature = createHmac('sha256', secret)
  .update(payload)
  .digest('hex')
```

Send:

```http
Webhook-Signature: ...
```

The client computes the same HMAC:

```ts
const expected = createHmac('sha256', WEBHOOK_SECRET)
  .update(rawRequestBody)
  .digest('hex')
```

and compares it to your signature.

```text
                    shared secret
                         │
             ┌───────────┴───────────┐
             ▼                       ▼

Your API                                   Client
payload                                    payload
   │                                          │
 HMAC(secret)                             HMAC(secret)
   │                                          │
   ▼                                          ▼
abc123...            compare              abc123...
                         │
                         ▼
                       valid
```

The secret itself is never sent with webhook deliveries.

---

# Use the raw body

This catches people when implementing verification.

You sign:

```json
{"foo":"bar","value":123}
```

The receiver parses it and serializes:

```json
{
  "foo": "bar",
  "value": 123
}
```

These strings aren't identical.

So HMAC verification should happen against the **exact raw HTTP body** received.

---

# Add a timestamp too

Otherwise a valid request could potentially be captured and replayed later.

Sign:

```text
timestamp.payload
```

For example:

```ts
const signedPayload = `${timestamp}.${body}`
```

Then the receiver verifies:

```text
signature valid

AND

abs(currentTime - timestamp) < 5 minutes
```

Now an intercepted webhook from yesterday won't validate today.

This is called **replay protection**.

---

# What I'd build in your project

I'd do this progressively.

### V1

```text
POST /webhooks
GET /webhooks
DELETE /webhooks/:id
```

Only support:

```text
rate.changed
```

Use Postgres:

```text
webhook_subscriptions
events
webhook_deliveries
```

And a worker that periodically runs:

```sql
SELECT *
FROM webhook_deliveries
WHERE status = 'pending'
AND next_attempt_at <= NOW()
LIMIT 100;
```

Deliver them.

No Redis queue yet.

That lets you learn the mechanism instead of hiding it behind BullMQ.

---

## V2

Then move:

```text
delivery processing
```

onto Redis + BullMQ.

```text
Postgres
   ↓
BullMQ
   ↓
worker(s)
```

Now you've learned why the queue exists instead of starting with one because architecture diagrams tell you to.

---

## V3

Add:

```text
HMAC signatures
retries
exponential backoff
idempotency
delivery logs
```

Your dashboard could show:

```text
Webhook

https://app.example.com/hooks/rates

rate.changed

Last deliveries

✓ evt_125    200    82ms
✓ evt_124    204   116ms
✕ evt_123    503   attempt 3/6
✓ evt_122    200    91ms
```

That would make this an excellent portfolio backend feature.

---

## V4 — webhook testing

Add a button:

```text
Send test event
```

which delivers:

```json
{
  "id": "evt_test_...",
  "type": "rate.changed",
  "test": true,
  "data": {
    "rateType": "blue",
    "previous": {
      "sell": 1300
    },
    "current": {
      "sell": 1320
    }
  }
}
```

This sounds trivial, but it's extremely useful because developers need to test their integration before waiting for an actual rate change.

---

# How the receiver looks in Nuxt

For example, another Nuxt application could have:

```ts
// server/api/webhooks/exchange-rates.post.ts

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing body',
    })
  }

  const signature = getHeader(event, 'webhook-signature')
  const timestamp = getHeader(event, 'webhook-timestamp')

  verifyWebhook({
    body,
    signature,
    timestamp,
  })

  const webhookEvent = JSON.parse(body)

  switch (webhookEvent.type) {
    case 'rate.changed':
      await handleRateChanged(webhookEvent)
      break
  }

  return { received: true }
})
```

Ideally the receiver responds quickly:

```http
200 OK
```

and does heavier work asynchronously.

You generally don't want:

```text
Receive webhook
↓
generate PDF
↓
send email
↓
update 27 DB rows
↓
call another API
↓
finally return 200
```

because the sender might time out and retry the webhook even though you're halfway through processing it.

---

# One more important security problem: SSRF

This is especially relevant because **you're accepting URLs supplied by users and then your server makes requests to them.**

Someone registers:

```text
http://localhost:5432
```

or:

```text
http://10.0.0.5/internal/admin
```

or cloud metadata endpoints.

Now your webhook worker becomes a way for an attacker to make requests from inside your infrastructure.

That's **Server-Side Request Forgery (SSRF).**

Your webhook URL validation needs to reject:

```text
localhost
127.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
link-local addresses
internal Docker networks
```

and generally require:

```text
https://
```

in production.

Also remember DNS can resolve differently later, so robust SSRF protection goes beyond validating the URL string once.

This is probably the biggest security consideration introduced specifically by adding webhooks.

---

## The whole system

Ultimately:

```text
                    ┌───────────────┐
                    │ Exchange API  │
                    └───────┬───────┘
                            │
                            ▼
                         Poller
                            │
                   changed? │
                            ▼
                       save rate
                            │
                            ▼
                      create event
                            │
                            ▼
                  ┌───────────────────┐
                  │   PostgreSQL      │
                  │                   │
                  │ rates             │
                  │ events            │
                  │ subscriptions     │
                  │ deliveries        │
                  └─────────┬─────────┘
                            │
                            ▼
                         Queue
                            │
                            ▼
                       Worker(s)
                            │
                      signed POST
                            │
          ┌─────────────────┼────────────────┐
          ▼                 ▼                ▼
       App A              App B            App C
```

I'd actually implement **V1 without BullMQ first**. It'll force you to build the event → subscription → delivery → retry model yourself, which will make message queues dramatically easier to understand afterward. Then Redis/BullMQ becomes an optimization rather than magic infrastructure.
