# Custom Study Groups with Live Leaderboards

Node.js + Express + MongoDB backend for collaborative study groups with group goals, activity tracking, progress reporting, and Redis-backed caching.

## Features

- Mock Google OAuth login with JWT auth
- One creator can create only one study group
- Members can join multiple groups
- One active goal per group
- Goal edit support for creators
- Activity tracking with duplicate-solve prevention
- Aggregation-based leaderboard with tie ranking
- Leaderboard filters for metric, subject, time window, sorting, and pagination
- Progress API with per-user contribution
- Redis caching for leaderboard and progress
- Subject and question seed data included

## Project Structure

- `src/routes`
- `src/controllers`
- `src/models`
- `src/middlewares`
- `src/utils`
- `src/data`
- `scripts`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env values:

```bash
cp .env.example .env
```

3. Start Redis locally and make sure MongoDB is reachable.

4. Seed subjects and questions:

```bash
npm run seed
```

5. Start the server:

```bash
npm run dev
```

## Environment Variables

- `PORT`
- `MONGO_URI`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## API Endpoints

### Auth

- `POST /auth/google`
- `GET /auth/me`

### Groups

- `POST /groups`
- `POST /groups/:id/member`
- `POST /groups/:id/goal`
- `POST /groups/:id/goals`
- `PUT /groups/:id/goal/:goalId`
- `PUT /groups/:id/goals/:goalId`
- `POST /groups/:id/activity`
- `POST /groups/:id/activities`
- `GET /groups/:id/leaderboard`
- `GET /groups/:id/progress`

## Sample Request Flow

1. Login:

```json
{
  "googleId": "google-user-1",
  "email": "alice@example.com",
  "name": "Alice"
}
```

2. Create group:

```json
{
  "name": "Physics Achievers",
  "description": "Weekly problem-solving group",
  "memberEmails": ["bob@example.com", "carol@example.com"]
}
```

3. Create goal:

```json
{
  "title": "Solve 10 physics questions",
  "subject": "physics",
  "totalTarget": 10,
  "deadline": "2026-12-31T23:59:59.000Z"
}
```

4. Record activity:

```json
{
  "questionId": "<question-id>",
  "subject": "physics",
  "status": "solved",
  "timeSpent": 120,
  "timestamp": "2026-04-28T12:00:00.000Z"
}
```

## Leaderboard Query Parameters

- `metric=solved|questionsSolved|percentage|timeSpent`
- `subject=physics,chemistry`
- `timeWindow=daily|weekly|all`
- `sort=asc|desc`
- `offset=<number>`
- `limit=<number>`

## Deployment Notes

- Start Redis before launching the backend.
- Ensure MongoDB Atlas network access allows your runtime environment.
- For local demonstration, run:

```bash
npm run seed
npm run dev
```

## Response Format

Every API uses:

```json
{
  "success": true,
  "message": "Readable message",
  "data": {},
  "error": null
}
```

For failures:

```json
{
  "success": false,
  "message": "Readable message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": null
  }
}
```
