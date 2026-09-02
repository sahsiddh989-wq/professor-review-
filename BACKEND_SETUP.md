# Professor Review Hub — Backend Setup

The repository now contains a responsive static frontend plus an Express/MongoDB backend.

## 1. Create MongoDB Atlas database

1. Create a free MongoDB Atlas cluster.
2. Create a database user.
3. Add your backend host to Network Access. For a first deployment you can allow `0.0.0.0/0`; for production, restrict access when possible.
4. Copy the MongoDB connection string.

## 2. Run backend locally

From the repository root:

```bash
cd backend
npm install
```

Create `backend/.env` from `.env.example` and set:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:5500
```

Start the API:

```bash
npm start
```

Check:

```text
http://localhost:5000/api/health
```

## 3. Seed professors

With the backend running configuration available:

```bash
node seed.js
```

This creates the six initial professors used by the current Professor Review Hub design.

## 4. Connect the frontend locally

Edit `api-config.js`:

```js
window.PROFESSOR_REVIEW_API = 'http://localhost:5000/api';
```

Then open the project through a local static server (for example VS Code Live Server), not by double-clicking the HTML file.

## 5. Deploy the backend

Recommended simple deployment: Render Web Service.

- Repository: `sahsiddh989-wq/professor-review-`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Add these environment variables in Render:

```text
MONGODB_URI
JWT_SECRET
CLIENT_URL
```

After deployment, copy the backend URL, for example:

```text
https://your-service.onrender.com
```

The API URL is:

```text
https://your-service.onrender.com/api
```

## 6. Connect GitHub Pages frontend

Update `api-config.js` with the deployed API URL:

```js
window.PROFESSOR_REVIEW_API = 'https://your-service.onrender.com/api';
```

Commit and push the change. GitHub Pages will then use the live backend.

## 7. What is implemented

- User registration
- Password hashing with bcrypt
- JWT login authentication
- Current-user endpoint
- Professor listing/search/filtering
- Professor details and reviews
- Authenticated professor creation
- Authenticated review creation
- One review per user per professor
- Review deletion by its author
- Automatic professor rating/count recalculation
- Responsive mobile navigation
- Responsive professor cards and forms
- Frontend demo fallback while the backend URL is not configured

## Important production notes

- Never commit `backend/.env`.
- Keep `JWT_SECRET` and `MONGODB_URI` only in deployment environment variables.
- Replace the demo statistics on the landing page with database-derived statistics before calling the numbers production data.
- Add email verification, moderation/reporting, rate limiting, pagination and stronger CORS restrictions before a public production launch.
