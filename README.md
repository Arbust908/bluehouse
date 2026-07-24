# bluehouse-project

To install dependencies:

```bash
bun install
```

Start PostgreSQL 18 and run the migrations:

```bash
cp .env.local.example .env.local
docker compose -f docker-compose.local.yml up -d --wait
bun run db:migrate
```

The local database listens on `localhost:5433` to avoid conflicting with a
default PostgreSQL installation on port `5432`.

Run the exchange-rate poller:

```bash
bun run poll
```

Stop local PostgreSQL:

```bash
docker compose -f docker-compose.local.yml down
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
