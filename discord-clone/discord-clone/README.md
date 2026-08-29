# Discordish — a self-contained Discord clone

Express + Socket.io + SQLite backend, React + Vite + Tailwind frontend.

## What's inside

- **Auth** — email/password registration & login, JWT sessions, bcrypt password hashing.
- **Servers & channels** — create servers, create `#text` and `🔊 voice` channels inside them, join other servers by invite code.
- **Real-time chat** — Socket.io broadcasts new messages instantly to everyone viewing that channel.
- **Voice channel UI** — clicking a voice channel "joins" it (green dot badge + your name listed under it, broadcast to everyone else via Socket.io). No real audio — this is the UI simulation asked for.
- **Database** — SQLite via `better-sqlite3`, a single file on disk. Schema and a default "Welcome Server" (`#general`, `#gaming`, a voice channel) are created automatically the first time the server boots — nothing to install or configure.
- **Layout** — 3-column dark Tailwind layout (`h-screen overflow-hidden`): 72px server rail, 240px channel sidebar with a fixed user card, and a chat column with an independently-scrolling message log and a toggleable "Online Members" panel.

## Why SQLite instead of Postgres/Mongo

The brief allowed either Postgres or MongoDB, both of which need a separate database *server* to be installed, started, and pointed at. SQLite is a real relational database but lives in one file that this app creates and migrates itself on first boot — so "automatically spin up and configure a database" is actually true, with nothing external to install. If you'd rather run Postgres, the queries in `server/src/db.js` and the route files are plain SQL and port over quickly.

## Running it

This project's code is complete and ready to run, but **you do need to install its dependencies yourself** — `npm install` requires network access to the npm registry, which isn't available in the sandbox this was built in, so it hasn't been run or smoke-tested end-to-end here. Setup is otherwise one command:

```bash
# from the project root
npm run install:all
```

Then, in two terminals:

```bash
# terminal 1 — backend (API + WebSocket), http://localhost:4000
npm run dev:server

# terminal 2 — frontend (Vite dev server), http://localhost:5173
npm run dev:client
```

Open **http://localhost:5173**, register an account, and you're in — you'll land in the default "Welcome Server" automatically.

No `.env` editing is required to run locally: `server/.env` already ships with working defaults (a dev JWT secret, a local SQLite file path). Change `JWT_SECRET` before deploying anywhere public.

## Building for production / deploying as one service

The backend serves the built frontend itself, so the whole thing is one deployable Node process with one URL:

```bash
npm run install:all
npm run build          # builds client/dist
npm start               # starts the Express server, which now also serves client/dist
```

Point any Node host (Render, Railway, Fly.io, a VPS, etc.) at `npm run install:all && npm run build` as the build command and `npm start` as the start command, set `PORT` if your host requires a specific one, and set a real `JWT_SECRET`. The SQLite file at `server/data/discord_clone.db` needs to live on persistent disk (most PaaS free tiers use ephemeral disks that reset on redeploy — use a host with a persistent volume, or swap in Postgres, for real long-term persistence).

## Project layout

```
discord-clone/
├── server/                  Express + Socket.io + SQLite
│   ├── src/
│   │   ├── index.js         app entry: HTTP + Socket.io + static client
│   │   ├── db.js            schema + auto-seed
│   │   ├── middleware/auth.js
│   │   ├── routes/          auth, servers, channels, messages (REST)
│   │   └── socket/index.js  chat broadcast + voice presence + online presence
│   └── .env                 already filled with working local defaults
└── client/                  React + Vite + Tailwind
    └── src/
        ├── pages/           Login, Register, ChatApp (the 3-column shell)
        ├── components/      ServerSidebar, ChannelSidebar, ChatView, MembersPanel
        ├── context/AuthContext.jsx
        ├── api.js           axios instance with JWT attached
        └── socket.js        authenticated Socket.io client
```

## Notes on scope

- Voice channels are a **UI simulation** (green badge + name listed), as specified — there's no actual audio/WebRTC stream.
- "Online Members" reflects users with an open Socket.io connection right now, not a stored `last_seen` field.
- Message history loads the most recent 200 messages per channel; there's no infinite-scroll pagination yet.
