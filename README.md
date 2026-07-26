# Executive Assistant

A full-stack executive assistant app for running your team meetings end-to-end:

- **Meeting minutes** with AI-generated summaries (key decisions, risks, next steps)
- **JIRA integration** to browse your and your team's open tasks and drag them straight into meeting minutes as action items
- **One-slide executive PDF reports**, auto-condensed from your minutes by AI
- **Slack & email** reminders for action items and one-click sharing of minutes/reports
- **Architecture Whiteboard**: a live, AWS-icon-aware diagramming canvas for sketching architectures during meetings (screen-share friendly), with tenant/VPC/subnet bounding boxes, smart tag search, connection safeguards, comments, and PNG export

## Tech stack

- **Backend**: Python, FastAPI, SQLAlchemy + Alembic, PostgreSQL
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Query, React Router
- **Diagramming**: [@xyflow/react](https://reactflow.dev/) (React Flow)
- **Integrations**: JIRA Cloud REST API, Slack Web API (bot token), SMTP email, OpenAI

## Project structure

```
backend/
  app/
    core/        # settings (.env), JWT/password security
    db/          # SQLAlchemy models, session, Alembic migrations
    schemas/     # Pydantic request/response models
    api/         # FastAPI routers (auth, team-members, meetings, jira, action-items, reports, notifications, whiteboards)
    services/    # jira_service, jira_oauth, ai_service, report_service, slack_service, email_service
  alembic/       # migrations
  requirements.txt
  .env.example
frontend/
  src/
    pages/       # Login, Dashboard, MeetingList, MeetingEditor, TeamSettings, Integrations, WhiteboardList, WhiteboardEditor
    components/  # Layout, JiraTaskBoard, ActionItemsList, NotificationModal, ...
    whiteboard/  # React Flow canvas, AWS resource catalog, connection rules, node types
    api/         # typed API client + per-resource modules
docker-compose.yml   # PostgreSQL for local dev
```

## Prerequisites

- Python 3.11+ (3.13 recommended; avoid pre-release versions like 3.14 for best package compatibility)
- Node.js 18+
- Docker (for PostgreSQL via `docker-compose`) — or a local PostgreSQL instance

## 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with database/user/password `exec_assistant` (see `docker-compose.yml`).

If you don't have Docker, point `DATABASE_URL` (see below) at any PostgreSQL 14+ instance you have running locally.

## 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then edit .env, see "Configuration" below
alembic upgrade head             # create the database schema
python -m app.seed               # optional: adds demo team members/meeting
uvicorn app.main:app --reload --port 8000
```

The API is now running at `http://localhost:8000` (interactive docs at `/docs`).

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app is now running at `http://localhost:5173` (the Vite dev server proxies `/api` to the backend on port 8000). Log in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set in `backend/.env`.

## Configuration (`backend/.env`)

All integrations are optional except auth — the app degrades gracefully (with a clear error message in the UI) if a given integration isn't configured yet.

| Variable | Required for | Notes |
|---|---|---|
| `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Login | Single admin account, no signup flow |
| `DATABASE_URL` | Everything | Defaults to the docker-compose Postgres |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | AI meeting summaries & report generation | Get a key from platform.openai.com |
| `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET` | JIRA task panel | Lets users connect JIRA by signing in with Atlassian — see [Connecting JIRA](#connecting-jira) |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | JIRA task panel (fallback) | Only used if nobody has connected via Atlassian sign-in |
| `JIRA_PROJECT_KEY` | JIRA task panel | Optional: restrict task queries to one project |
| `SLACK_BOT_TOKEN` | Slack reminders/sharing | Create a Slack app with `chat:write` scope, install it to your workspace |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email reminders/sharing | For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) |
| `REPORTS_DIR` | PDF reports | Local folder where generated PDFs are stored |

## Connecting JIRA

JIRA is connected by signing in with your Atlassian account on the **Integrations** page — no API tokens to copy around. This needs a one-time OAuth app registration for the whole team:

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/), create an app, and enable **OAuth 2.0 (3LO)**.
2. Under **Permissions**, add the **Jira API** with the `read:jira-work` and `read:jira-user` scopes.
3. Under **Authorization**, set the callback URL to `http://localhost:8000/api/jira/oauth/callback` (or whatever you set `JIRA_OAUTH_REDIRECT_URI` to).
4. Copy the Client ID and Secret from **Settings** into `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET` in `backend/.env`, then restart the backend.

After that, open **Integrations** in the app and click **Connect with Atlassian**. You'll be taken to Atlassian's consent screen, pick your site, and land back in the app connected. Access tokens are stored encrypted in the database and refreshed automatically, so you only sign in once.

If you'd rather not register an OAuth app, the older email + API token path still works: set `JIRA_BASE_URL`, `JIRA_EMAIL` and `JIRA_API_TOKEN` in `backend/.env`. It's only used when no Atlassian account is connected.

### Team member setup for JIRA / Slack

For "team tasks" and Slack DMs to work, add each teammate on the **Team** page with:
- their **JIRA Account ID** — once JIRA is connected, type their name or email and click **Look up in JIRA** to fill this in automatically
- their **Slack User ID** (in Slack: profile → "..." → "Copy member ID")

## Using the Architecture Whiteboard

Go to **Whiteboards** → **New Whiteboard**. Drag resources from the left palette onto the canvas:

- **Search** the palette by service name or by concept — e.g. typing "python" surfaces Lambda/SageMaker, "mysql" surfaces RDS/Aurora, "kubernetes" surfaces EKS.
- **Boundaries** (Tenant, VPC, Availability Zone, Subnet) are drag-and-drop containers — drop a resource on top of one to nest it inside; drag a resource out to remove it. Tenant boxes are auto-colored and listed in the on-canvas legend so multiple accounts/customers are easy to tell apart.
- **Connect** resources by dragging from the small dot handles on each card. A few real-world safeguards are enforced (e.g. a client or the public internet can't connect straight to a database, IAM roles can't be "wired" like a network path, boundaries can't be edge endpoints) — blocked attempts show a red banner explaining why.
- **Comments**: click "Add Comment", then click anywhere on the canvas to drop a pin; click the pin to add/read threaded notes.
- **Export PNG**: click "Export PNG" to download a snapshot of the current diagram — handy to drop into a report or share after a screen-share session.
- Use your mouse to **pan** (drag empty canvas) and **zoom** (scroll wheel / trackpad pinch, or the +/- controls in the bottom-left).
- Click **Save** to persist the diagram; it can optionally be linked to a specific meeting (created automatically when you click "New Whiteboard" from within a Meeting page).

The whiteboard is designed to be used *while* you screen-share via your usual video call tool (Zoom/Meet/Teams) — there's no built-in video/screen-share transport, just a canvas good enough to sketch live on.

## Notes on JIRA API usage

The backend calls JIRA Cloud's REST API v3 directly (`search/jql`, `issue/{key}`, `user/search`). When an Atlassian account is connected, requests go to `https://api.atlassian.com/ex/jira/{cloudId}` with an OAuth bearer token; otherwise they go to your site URL with basic auth. No JIRA MCP server is involved either way.

## Troubleshooting

- **"JIRA is not connected" / 409 errors**: open the **Integrations** page and click **Connect with Atlassian**. If the button reports that sign-in isn't set up, `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` are missing from `backend/.env`.
- **JIRA connection stops working after changing `JWT_SECRET`**: stored tokens are encrypted with a key derived from it, so reconnect on the Integrations page.
- **Atlassian shows a `redirect_uri` mismatch**: the callback URL in the developer console must exactly match `JIRA_OAUTH_REDIRECT_URI`.
- **AI summary/report generation fails**: check `OPENAI_API_KEY` is set and has available quota.
- **Slack send fails with `not_in_channel` or `channel_not_found`**: make sure the Slack app/bot has been installed to the workspace and has `chat:write` scope; for DMs, verify the teammate's Slack User ID is correct.
- **Email send fails**: most providers require an app-specific password rather than your normal login password (see Gmail App Passwords above), and require STARTTLS on port 587.
