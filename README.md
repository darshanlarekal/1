# +1% — Daily Self-Improvement Tracker

> Track whether you got +1%, stayed the same, or dropped -1% each day. Watch your compound growth over time.

---

## Project Structure

```
plus-one-percent/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # signup, login, getMe
│   │   ├── entriesController.js   # add, edit, delete, fetch, export
│   │   └── analyticsController.js # dashboard stats
│   ├── middleware/
│   │   └── auth.js                # JWT protect middleware
│   ├── models/
│   │   ├── User.js                # schema + bcrypt hooks
│   │   └── DailyEntry.js          # compound unique index
│   ├── routes/
│   │   ├── auth.js
│   │   ├── entries.js
│   │   └── analytics.js
│   ├── server.js                  # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx          # sidebar + nav
    │   ├── context/
    │   │   ├── AuthContext.jsx     # global auth state + JWT
    │   │   └── ThemeContext.jsx    # dark mode toggle
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx   # today's entry
    │   │   ├── CalendarPage.jsx    # month view + edit
    │   │   └── AnalyticsPage.jsx   # charts + heatmap
    │   ├── utils/
    │   │   └── api.js              # axios + JWT interceptor
    │   ├── App.jsx                 # routes
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Prerequisites

### Node.js (both platforms)
Install from https://nodejs.org — choose LTS (v20+).

Verify:
```bash
node --version    # v20.x.x
npm --version     # 10.x.x
```

---

## MongoDB Setup

### macOS

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB as a background service
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

MongoDB data is stored at: `/usr/local/var/mongodb`

To stop: `brew services stop mongodb-community`

### Windows

1. Download MongoDB Community Server from:
   https://www.mongodb.com/try/download/community
   
2. Run the `.msi` installer — choose "Complete" setup.
   Check ✅ "Install MongoDB as a Service" during setup.

3. MongoDB starts automatically. Verify:
```cmd
# Open Command Prompt as Administrator
mongosh
```

4. If not running, start it manually:
```cmd
# As Administrator
net start MongoDB
```

MongoDB data is stored at: `C:\data\db`

To stop: `net stop MongoDB`

---

## Installation

### Step 1 — Clone / navigate to the project

```bash
cd plus-one-percent
```

### Step 2 — Backend setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
# macOS/Linux:
cp .env.example .env

# Windows:
copy .env.example .env
```

Now open `.env` and edit it:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/plusonepercent
JWT_SECRET=replace_this_with_a_long_random_string_at_least_32_characters
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> ⚠️ **Security:** Generate a real JWT secret. Run this in your terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Copy the output into JWT_SECRET.

Install nodemon globally (optional but recommended for development):
```bash
npm install -g nodemon
```

### Step 3 — Frontend setup

```bash
# From the project root:
cd frontend

npm install

# Create the environment file
# macOS/Linux:
cp .env.example .env

# Windows:
copy .env.example .env
```

The default `.env` content is correct for local development:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running the App

You need **two terminal windows** open simultaneously.

### Terminal 1 — Backend

```bash
cd plus-one-percent/backend
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:5000
```

### Terminal 2 — Frontend

```bash
cd plus-one-percent/frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser. 🎉

---

## API Reference

### Auth endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |

**Signup body:**
```json
{ "username": "john", "email": "john@example.com", "password": "securepass123" }
```

**Login body:**
```json
{ "email": "john@example.com", "password": "securepass123" }
```

**Response (both):**
```json
{ "token": "eyJ...", "user": { "id": "...", "username": "john", ... } }
```

### Entry endpoints (all require `Authorization: Bearer <token>`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/entries` | Fetch entries (supports `?from=&to=&limit=&offset=`) |
| POST | `/api/entries` | Add new entry |
| PATCH | `/api/entries/:date` | Edit entry for a date (YYYY-MM-DD) |
| DELETE | `/api/entries/:date` | Delete entry for a date |
| GET | `/api/entries/calendar/:year/:month` | Month view data |
| GET | `/api/entries/export` | Download CSV |

**Add/edit entry body:**
```json
{ "value": 1, "note": "Optional 140-char note", "date": "2024-01-15" }
```
`value` must be `-1`, `0`, or `1`.

### Analytics

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics/dashboard` | Full analytics payload |

---

## Database Schema

### Users collection

```javascript
{
  _id: ObjectId,
  username: String,       // unique, 3-20 chars, alphanumeric+underscore
  email: String,          // unique, lowercase
  password: String,       // bcrypt hash, never returned in queries
  timezone: String,       // e.g. "America/New_York"
  currentStreak: Number,  // cached, recalculated on every entry mutation
  longestStreak: Number,  // cached
  totalEntries: Number,   // cached
  createdAt: Date,
  updatedAt: Date
}

Indexes: email (unique), username (unique)
```

### DailyEntries collection

```javascript
{
  _id: ObjectId,
  user: ObjectId,     // ref: User
  date: String,       // "YYYY-MM-DD" — timezone-safe, no time component
  value: Number,      // -1 | 0 | 1
  note: String,       // optional, max 140 chars
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  { user: 1, date: 1 } UNIQUE  ← enforces one entry per user per day
  { user: 1, date: -1 }        ← fast chronological queries
```

---

## Security Considerations

1. **Passwords** are hashed with bcrypt (cost factor 12) — never stored in plaintext.
2. **JWTs** expire after 7 days. Use a long random JWT_SECRET (48+ bytes).
3. **Rate limiting**: global 200 req/15min, auth endpoints 10 req/15min.
4. **Helmet.js** sets security headers (X-Frame-Options, CSP, etc.).
5. **Input validation** via express-validator on all routes.
6. **Password field** has `select: false` — never accidentally returned.
7. **Generic auth errors** — "Invalid email or password" for both wrong email AND wrong password (prevents user enumeration).
8. **Payload limit** — JSON body capped at 10kb.
9. **Future dates** are rejected for entry logging.
10. **MongoDB injection** is mitigated by Mongoose schema validation and typed queries.

---

## Troubleshooting

### "MongoServerError: connect ECONNREFUSED"
MongoDB isn't running.
- macOS: `brew services start mongodb-community`
- Windows: `net start MongoDB` (as Administrator)

### "Port 5000 already in use"
Change `PORT` in `backend/.env` to `5001` and update `VITE_API_URL` in `frontend/.env` to match.

### "Invalid token" on every request
Your JWT_SECRET changed. Clear localStorage in the browser (DevTools → Application → Clear All) and log in again.

### Vite proxy not working (CORS errors)
Make sure your backend is running on port 5000. The Vite proxy in `vite.config.js` forwards `/api/*` to `localhost:5000`.

---

## Scaling & Future Improvements

### Short term
- **Email verification** — add a verified flag and send a link via Nodemailer/Resend
- **Password reset** — token-based reset flow
- **Refresh tokens** — short-lived access tokens (15min) + long-lived refresh tokens
- **Redis caching** — cache analytics queries that get expensive at scale

### Medium term
- **WebSockets** — real-time streak notifications
- **Push notifications** — daily reminder via service worker
- **Multi-device sync** — already works via JWT, but add device management
- **Social features** — compare streaks with friends (opt-in)

### Infrastructure (when going to production)
- **MongoDB Atlas** — replace local MongoDB with a cloud cluster
- **Environment secrets** — use Railway/Render/Fly.io secrets, not `.env` files
- **HTTPS** — handled by your cloud provider's reverse proxy
- **PM2** — process manager for Node in production: `pm2 start server.js`
- **Docker** — containerize both services for consistent deployments

```dockerfile
# Example Dockerfile for backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```
