# Custom Study Groups Backend

Backend service for the assignment **"Custom Study Groups with Live Leaderboards"** using Node.js, Express, MongoDB, and Redis.

## Features

- JWT-protected APIs with Google OAuth login (`/auth/google`)
- Study group lifecycle:
  - one creator can own only one group
  - members can belong to multiple groups
- Goal management:
  - one active goal per group
  - deadline and recurring goal support
  - goal update for creators
- Activity logging with strict validation:
  - status must be `solved`/`correct`
  - subject must match goal and question
  - timestamp must be inside goal window
  - per-user question de-dupe per goal
- Leaderboard:
  - tie-aware ranking
  - sorting, filtering, pagination
  - includes current user rank/details
- Progress endpoint:
  - total solved
  - percentage completion
  - per-member breakdown
- Redis cache with invalidation on writes and goal changes

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Redis (optional fallback mode if unavailable)
- Google OAuth (`google-auth-library`)
- JWT (`jsonwebtoken`)

## Project Structure

```text
src/
  config/
  controllers/
  data/
  middlewares/
  models/
  routes/
  utils/
scripts/
```

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/study_groups
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

## Local Setup

```bash
npm install
npm run seed
npm run dev
```

Health check:

```bash
curl http://127.0.0.1:5000/health
```

## Authentication Flow

1. Frontend obtains Google `idToken`
2. Call `POST /auth/google` with:

```json
{
  "idToken": "google_id_token_here"
}
```

3. Use returned JWT in protected APIs:

```text
Authorization: Bearer <token>
```

## API Endpoints

### Auth

- `POST /auth/google`
- `GET /auth/me`

### Groups

- `POST /groups` - create group
- `POST /groups/:id/member` - add member (creator only)
- `POST /groups/:id/goal` - create goal (creator only)
- `PUT /groups/:id/goal/:goalId` - update active goal (creator only)
- `POST /groups/:id/activity` - record activity
- `GET /groups/:id/leaderboard` - get leaderboard
- `GET /groups/:id/progress` - get group progress

## Leaderboard Query Params

- `metric`: `solved` | `percentage` | `timeSpent`
- `subject`: comma-separated values (for subject filtering)
- `timeWindow`: `daily` | `weekly` | `all`
- `sort`: `asc` | `desc`
- `offset`: number
- `limit`: number (default 10, max 100)

Example:

```text
/groups/:id/leaderboard?metric=solved&subject=mathematics&timeWindow=weekly&sort=desc&offset=0&limit=10
```

## Standard Response Format

Success:

```json
{
  "success": true,
  "message": "Readable message",
  "data": {},
  "error": null
}
```

Error:

```json
{
  "success": false,
  "message": "Readable message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": "Optional details"
  }
}
```

## Deployment Checklist

- Set all environment variables in hosting platform
- Ensure MongoDB and Redis are reachable from deployed runtime
- Run seed once on target DB (if required for demo data)
- Verify:
  - `GET /health`
  - auth flow (`/auth/google`, `/auth/me`)
  - create group -> create goal -> record activity -> leaderboard/progress

## Notes

- Time handling is UTC (`Date`/ISO timestamps).
- If Redis is unavailable, APIs continue in fallback mode without cache.