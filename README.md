# PolyDan

A private, Polymarket-style prediction market for the family's **Iron Man**
(last one standing) events. Everyone bets in dollars: family members pay Matt
outside the app (e-Transfer, cash) and Matt credits their account as admin.
Winnings are cashed out the same way.

## How it works

- **Markets** use an LMSR market maker (`lib/lmsr.ts`): there's always a price,
  anyone can buy or sell at any time, and each winning share pays $1.
  Opening odds come from the edition 1–9 history (`lib/history.ts`,
  `data/iron-man-history.json`, exported from sslgolf.com/iron-man.html).
- **Kinds:** Winner (whole field), Head to head, Top N, and Custom (any
  question, resolved by the admin).
- **Results:** the admin enters each round in *Admin → Results*: last place
  goes to Redemption Island or out, and island players can return. Finishing
  positions are fixed when someone goes out for good (same-round exits tie).
  Anything that becomes certain locks immediately (`lib/resolve.ts`), so nobody
  can bet on a known result.
- **Settling:** at the end of the day, *Admin → Markets → Settle all decided*
  pays winners into their balances. Voiding a market refunds stakes exactly.
  Undo is blocked if it would change a market that has already paid out.
- **House risk:** the market maker subsidises liquidity. The worst-case loss per
  market is shown in Admin → Markets ("house risk ≤ …"). Higher liquidity means
  steadier prices but more risk. Defaults are 100 for the winner market and 50
  for two-way markets.

## Local dev

```sh
brew services start postgresql@16 && createdb polydan
cp .env.example .env            # then edit SESSION_SECRET
npm install
npx prisma db push
ADMIN_NAME=Matt ADMIN_PIN=1234 npm run seed   # admin + all past competitors
npm run dev
```

Tests: `npm test` (pricing, standings, resolution, history) and
`createdb polydan_test && DATABASE_URL=postgresql://$USER@localhost:5432/polydan_test npx prisma db push && npm run test:db`
(full money flow, including concurrent bets, against a throwaway database).

## Deploy (Heroku, same pattern as sslgolf)

1. `heroku create polydan` → add Heroku Postgres (`heroku addons:create heroku-postgresql:essential-0`).
2. `heroku config:set SESSION_SECRET=$(openssl rand -base64 48)`
3. Push the schema and seed from your machine (the build doesn't run them):
   `DATABASE_URL="$(heroku config:get DATABASE_URL)" npx prisma db push`
   `DATABASE_URL="$(heroku config:get DATABASE_URL)" ADMIN_NAME=Matt ADMIN_PIN=<pin> npm run seed`
4. Connect the GitHub repo for auto-deploys, or `git push heroku main`.

Schema changes later: run `prisma db push` against prod **before** pushing code.
