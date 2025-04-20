# PolyDan – Project Setup & Enhancement Guide

> **Last updated:** $(date)

---

## 1  Fix Tailwind CSS

1. Open `package.json` and ensure the dev‑deps:
   ```json
   "devDependencies": {
     "tailwindcss": "^3.4.4",
     "postcss": "^8.4.35",
     "autoprefixer": "^10.4.18"
   }
   ```
2. Remove conflicting lock‑files / packages then reinstall:
   ```bash
   rm -f package-lock.json pnpm-lock.yaml yarn.lock
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```
3. Generate (or re‑generate) the config:
   ```bash
   npx tailwindcss init -p   # creates tailwind.config.js + postcss.config.js
   ```
4. Configure `tailwind.config.js` (uses CRA/Vite paths):
   ```js
   module.exports = {
     content: [
       './src/**/*.{js,jsx,ts,tsx}'
     ],
     theme: { extend: {} },
     plugins: [],
   };
   ```
5. Verify styles load:
   ```bash
   npm run start   # CRA
   # or
   npm run dev     # Vite
   ```
   Visit `http://localhost:3000` and confirm `bg-blue-500` etc. render.

---

## 2  Standardise on npm

* Use **npm v9+** (`node 18.x`).
* Lock‑file regeneration:
  ```bash
  npm ls --depth 0   # sanity check
  git add package-lock.json
  git commit -m "chore: regenerate lockfile"
  ```

---

## 3  Supabase / PostgreSQL Validation

1. `.env` variables  
   (root for server & Vite prefixes for client):
   ```bash
   # .env (server)
   SUPABASE_URL=...
   SUPABASE_KEY=...

   # client/.env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_KEY=...
   ```
2. Recommended schema & RLS policies (`supabase/sql`): see `database/schema.sql`.
3. Quick connectivity check (server route):
   ```js
   app.get('/api/test-db', async (_, res) => {
     const { data, error } = await supabase.from('competitions').select('*');
     if (error) return res.status(500).json({ error: error.message });
     res.json(data);
   });
   ```

---

## 4  Deployment (Heroku)

```bash
# Build client
(cd client && npm run build)
# Deploy
git push heroku main
heroku config:set SUPABASE_URL=... SUPABASE_KEY=...
```

If costs are a concern, Render.com or Fly.io are compatible drop‑ins.

---

## 5  Security & Optimisation

* CORS whitelist:
  ```js
  const allowedOrigins = [
    'https://your‑heroku‑app.herokuapp.com',
    'http://localhost:5173'
  ];
  app.use(cors({ origin: allowedOrigins }));
  ```
* Indexes:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_participants_competition_id
    ON participants(competition_id);
  ```

---

## Feature Roadmap (v2)

| Priority | Feature | Notes |
|----------|---------|-------|
| 🟢  | Real‑time games & leaderboard | Supabase `postgres_changes` channels |
| 🟢  | Side‑bet creation UI | Use Supabase functions for payouts |
| 🟠  | OAuth providers | Google & Apple |
| 🟠  | Dark mode | Tailwind `dark:` variant |
| 🔴  | Mobile companion app | React Native or Expo |

*Legend: 🟢 = in progress · 🟠 = next · 🔴 = backlog* 