📚 Custom Study Groups with Live Leaderboards

A scalable Node.js + Express + MongoDB backend for collaborative study groups featuring goal tracking, activity logging, real-time leaderboards, and Redis caching.

🚀 Overview

This system allows users to:

Form study groups
Set shared learning goals
Track individual contributions
View real-time ranked leaderboards
Monitor overall group progress

Built with a focus on:

Clean architecture
Efficient aggregation queries
Production-ready validation
Scalable caching

✨ Features

🔐 Authentication
Google OAuth-based login (via ID Token verification)
JWT-based session management
Secure protected routes using middleware

👥 Study Groups
One user can create only one group
Users can join multiple groups
Creator has elevated permissions (add members, manage goals)

🎯 Goals
Only one active goal per group
Supports:
Deadline-based goals
Recurring goals (daily/weekly)
Goal editing allowed only for creator

📊 Activity Tracking
Track solved questions per user
Prevent duplicate solves per goal
Enforce:
Subject consistency
Goal window validity

🏆 Leaderboard
Aggregation-based ranking
Tie-aware ranking system
Supports filters:
Metric (solved, percentage, timeSpent)
Subject
Time window (daily, weekly, all)
Sorting (asc, desc)
Pagination (offset, limit)

📈 Progress Tracking
Total group progress
Per-member contribution breakdown
Percentage completion

⚡ Performance
Redis caching for:
Leaderboard
Progress
Cache invalidation on updates

🌱 Seed Data
Preloaded subjects and questions for testing

🧱 Tech Stack

Backend: Node.js, Express
Database: MongoDB (Mongoose ODM)
Caching: Redis
Auth: Google OAuth + JWT
Other: Aggregation Pipelines, Modular Architecture

📁 Project Structure

src/
  controllers/
  models/
  routes/
  middlewares/
  utils/
  data/
scripts/

⚙️ Setup Instructions

1. Install dependencies
npm install
2. Configure environment
cp .env.example .env
3. Add required variables
PORT=5000
MONGO_URI=your_mongodb_uri
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
4. Start services
Ensure MongoDB is running
Ensure Redis is running
5. Seed data
npm run seed
6. Run server
npm run dev

🔑 Authentication Flow

POST /auth/google

Send Google idToken from frontend:

{
  "idToken": "google_id_token_here"
}

Returns:

JWT token
User profile
GET /auth/me

Header:

Authorization: Bearer <token>

Returns authenticated user.

📡 API Endpoints

Auth
POST /auth/google
GET /auth/me
Groups
POST /groups → Create group
POST /groups/:id/member → Add member
POST /groups/:id/goal → Create goal
PUT /groups/:id/goal/:goalId → Update goal
Activity
POST /groups/:id/activity → Record activity
Analytics
GET /groups/:id/leaderboard
GET /groups/:id/progress

🔄 Sample Flow

1. Login
{
  "idToken": "..."
}
2. Create Group
{
  "name": "Physics Achievers",
  "description": "Weekly problem-solving group",
  "memberEmails": ["bob@example.com"]
}
3. Create Goal
{
  "title": "Solve 10 physics questions",
  "subject": "physics",
  "totalTarget": 10,
  "deadline": "2026-12-31T23:59:59.000Z"
}
4. Record Activity
{
  "questionId": "<question-id>",
  "subject": "physics",
  "status": "solved",
  "timeSpent": 120
}

📊 Leaderboard Filters

Parameter	Values
metric	solved, percentage, timeSpent
subject	physics,math (comma-separated)
timeWindow	daily, weekly, all
sort	asc, desc
offset	number
limit	number
Example:
/groups/:id/leaderboard?metric=solved&subject=math&timeWindow=weekly&sort=desc

⚠️ Important Constraints

One group per creator
One active goal per group
One question solve per user per goal
Activity must:
Match goal subject
Be within goal time window

📦 Response Format

Success
{
  "success": true,
  "message": "Readable message",
  "data": {},
  "error": null
}
Error
{
  "success": false,
  "message": "Readable message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": "Optional details"
  }
}

🚀 Deployment Notes

Use MongoDB Atlas for production
Use Redis Cloud / Upstash for hosted caching
Set environment variables in hosting platform
Recommended platforms:
Render
Railway
AWS / EC2

🧪 Testing

Use Postman or Thunder Client
Test flow:
Auth
Create group
Create goal
Record activity
Fetch leaderboard

📌 Assumptions

Google ID token is trusted (verified via backend)
Subjects are normalized (lowercase)
Questions are pre-seeded
No role-based access beyond creator/member
🔮 Future Improvements
Real-time updates via WebSockets
Notifications for goal progress
Multi-goal history tracking
UI dashboard integration

✅ Final Notes

This implementation emphasizes:
Clean API design
Efficient MongoDB aggregation
Real-world backend practices
Scalability and performance