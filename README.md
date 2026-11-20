# Fusion Reactor Laboratory — The Experiment Continues
## Build 03 · Deep Space Release

An original multiplayer browser-based science-fiction reactor game. Explore the ship, operate its fictional reactor, survive 28 dynamic events and five cinematic ignition programs with your friends.

## Deploy to Render

1. Extract the release ZIP, then upload **everything inside the folder** to a GitHub repository. Include the `music/` folder, `package.json`, and `render.yaml`. Do not upload the ZIP itself as the repository contents.
2. In Render, create a **Web Service** connected to your GitHub repository. Alternatively, create a Blueprint using the included `render.yaml`.
3. Set the runtime to **Node**, build command to `npm run build`, start command to `npm start`, and health check path to `/healthz`.
4. Add an environment variable called `ADMIN_ACCESS_CODE` with a unique secret of **24–64 characters**. Keep this value private; never commit it to GitHub.
5. Deploy. Open the generated Render URL and share it with friends.

The Node server uses Render's PORT automatically and listens on all required interfaces. No external packages, database, Cloudflare Worker, or separate client deployment are needed. Public/private rooms support up to 16 real players; rooms and shifts are stored in server memory, so service restarts reset active games.

## Admin access

Enter the secret code as your operator name on the game's main menu, then create or join a room. The server checks the code and replaces it with the display name **Facility Administrator**. Press **F2** or click **ADMIN / F2** in the HUD. You can start any event or ignition variant and regenerate the facility; regular players do not have this panel. Only one scenario can run at a time.

The code is not included in client JavaScript or multiplayer snapshots. Admin access is disabled if you do not configure a valid code. The host can still restart their own shift normally.

## Run locally

Requires Node.js 20 or newer (Node 22 recommended). Double-click `START-FRL.bat` on Windows, or run:

```sh
npm run build
npm start
```

Open http://localhost:5173. To enable your local administrator account in PowerShell, set `$env:ADMIN_ACCESS_CODE` to your own long secret before running `npm start`. You can also copy `.env.example` to `.env`, edit it privately, then run `node --env-file=.env server.mjs` on Node 22.

## Game controls

- WASD — move
- Shift — sprint
- Space — jump
- C — crouch
- Mouse — look
- E — interact with a control
- F — flashlight
- M — interactive ship navigation, select a room to plot a route
- T — text chat
- Tab — crew list
- F2 — administrator panel (authorized administrators only)
- Escape — release the mouse or close a menu

The former physical Event Control Room has been replaced with Hydroponics, Observation Atrium, Logistics Hub, and Crew Lounge. The map plots routes while respecting sealed reactor doors. Consoles and furniture have been rearranged to preserve clear central walking lanes; reactor access and emergency pods retain their gameplay interlocks.

## Soundtrack

The director supports 14 distinct tracks, with automatic crossfades and a separate final-stage meltdown cue. The release includes whichever of these authorized files are in `music/`. It recognizes the original filenames, including numbered duplicate suffixes. Missing tracks automatically use another compatible track or a procedural score.

| Track | Use |
| --- | --- |
| Roblox Xbox theme | Main menu |
| My Story | Idle laboratory, golden core |
| Reactor Startup Song | Normal and rainbow startup |
| Shutdown | Shutdown and failed ignition |
| Quicksand | Stable operations and unusual anomalies |
| Roller Mobster | Plasma storms, meteor and cosmic events |
| Going Mental | Meltdown, emitter and cooling failures |
| Ruinous | Freezedowns, collapse, void and loss |
| hOSTILE | Critical warnings and mainframe corruption |
| Naxion Phase 3 Melt | Omega protocol and final meltdown stage |
| Shift Stall | Outages and blackout cascade |
| Thought Deprivation | Shield startup and eclipse (optional) |
| New Life Anthem | Launch, recovery and survival (optional) |
| Hammer O' Justice | Containment, evacuation and classified directive (optional) |

Only publish music you have permission to distribute publicly. See `music/README.md` for the supported filenames.

## Verification

```sh
npm run build
npm test
```

The automated tests cover 16 concurrent players, public/private rooms, snapshots, chat, session authentication, admin isolation, scenario interlocks, startup variants, emergency controls, all 49 sectors, every physical console, map routes, asset delivery, and audio byte ranges. The HTTP handler is tested without needing an external connection.

All simulation units and mechanics are fictional gameplay. This game is not a real reactor or engineering simulator. Reduce flashing, shake and visual distortion in Settings if desired.
