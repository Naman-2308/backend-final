# Study Groups Backend (Assignment Submission)

## 🚀 Overview
This backend service allows users to create study groups, define goals, track progress, and generate leaderboards.

## 🧠 Design Approach
Due to time constraints, I implemented a simplified in-memory backend focusing on:
- Clean API design
- Core business logic
- Extensibility for future scaling

The architecture is modular and can be extended to MongoDB + Redis + JWT authentication.

---

## ⚙️ Tech Stack
- Node.js
- Express.js

---

## 📌 Features Implemented
- Create Study Groups
- Add Members
- Create Goals
- Update Progress
- Leaderboard (based on goal completion %)

---

## 📊 Leaderboard Logic
Score = (Total Progress / Total Target) × 100

---

## 🔁 Assumptions
- Authentication skipped for simplicity
- Single active goal per group (handled logically)
- In-memory storage used instead of DB
- Real-time updates simulated via API calls

---

## ⚡ Future Improvements
- JWT-based authentication (Google OAuth)
- MongoDB integration with Mongoose schemas
- Redis caching for leaderboard
- Pagination, filtering, sorting
- Activity tracking system

---

## ▶️ How to Run

```bash
npm install
node server.js
## Assumptions & Scope Decisions

Due to time constraints, I focused on implementing the core backend logic for:

- Group creation and management
- Goal tracking
- Progress updates
- Leaderboard computation

### Not Fully Implemented (but designed for extension):
- JWT-based authentication (can be integrated using Google OAuth + middleware)
- Redis caching (can be added for leaderboard optimization)
- Advanced leaderboard filters (time window, subject filtering)
- Activity-level tracking (can be implemented via separate Activity collection)

### Design Thinking:
- The current structure allows easy migration to MongoDB schemas
- Leaderboard logic is written in a way that can be optimized using aggregation pipelines
- APIs are designed RESTfully and modularly for scaling

If given more time, I would:
1. Introduce proper schema modeling (User, Activity, Goal)
2. Add Redis caching layer
3. Optimize leaderboard queries using MongoDB aggregation
4. Implement JWT authentication middleware