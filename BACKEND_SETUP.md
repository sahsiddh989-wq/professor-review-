# Professor Review Hub — Backend Setup

The repository contains a static frontend plus an Express/MongoDB backend.

## Backend features

- User registration and login
- bcrypt password hashing
- JWT authentication
- Current-user profile endpoint
- Professor search, filtering and pagination
- Professor details with reviews
- Authenticated professor creation
- Authenticated review creation
- One review per user per professor
- Review edit and deletion by the author
- Automatic professor rating/count recalculation
- Helmet security headers
- CORS protection
- API and authentication rate limiting
- MongoDB indexes for common queries
- Health endpoint for deployment monitoring

## 1. MongoDB Atlas

1. Create a MongoDB Atlas cluster and database user.
2. In Atlas Network Access, allow the IP range used by your backend host. For a temporary test deployment, `0.0.0.0/0` can be used; restrict it for production when possible.
3. Copy the MongoDB connection string.

**Never commit the real connection string to GitHub.** Put it only in the backend host's environment variables or a local `backend/.env` file.

## 2. Local backend

From the repository root:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:5500
```

Start:

```bash
npm start
```

Health check:

```text
http://localhost:5000/api/health
```

## 3. Seed professors

After setting `MONGODB_URI`:

```bash
npm run seed
```

This seeds the six sample professors used by the current frontend.

## 4. Frontend connection

After deploying the backend, set the API URL in the root `api-config.js`:

```js
window.PROFESSOR_REVIEW_API = 'https://YOUR-BACKEND-DOMAIN/api';
```

Do not put MongoDB credentials or JWT secrets in this file.

## 5. Deploy backend on Render

A `render.yaml` file is included in the repository.

Recommended Render Web Service settings:

- Repository: `sahsiddh989-wq/professor-review-`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Set these Render environment variables:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
CLIENT_URL=https://sahsiddh989-wq.github.io
```

Important: `https://github.com/sahsiddh989-wq/professor-review-` is the **repository URL**, not the browser origin used by GitHub Pages. CORS must use the deployed Pages origin, normally `https://sahsiddh989-wq.github.io`.

After Render gives you a backend URL, the API will be:

```text
https://YOUR-SERVICE.onrender.com/api
```

## 6. GitHub Pages frontend

Update `api-config.js` with the real backend URL, commit it, and push to `main`. GitHub Pages will then call the live API instead of the demo fallback.

## 7. API routes

### Public

- `GET /api/health`
- `GET /api/professors`
- `GET /api/professors/stats/summary`
- `GET /api/professors/:id`
- `GET /api/reviews/professor/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Authenticated

Send `Authorization: Bearer <JWT>`.

- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/professors`
- `GET /api/reviews/mine`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

## Production security checklist

Before public production use:

- Replace the temporary database password.
- Rotate the MongoDB Atlas user password.
- Generate a strong random `JWT_SECRET` and never commit it.
- Restrict MongoDB Network Access to the backend where practical.
- Keep `CLIENT_URL` limited to the exact frontend origin(s).
- Add email verification, moderation/reporting and account recovery.
- Consider moving authentication from localStorage to secure HttpOnly cookies if the architecture is updated for it.
- Back up the MongoDB database before major schema/data changes.
