# Professor Review Hub

Professor Review Hub is a student-first web application for discovering professors, reading student feedback, comparing ratings, and submitting reviews.

## Features

- Professor search by name, course, department, or university
- Rating and review directory
- Student registration and login
- JWT-based authentication
- One-review-per-student-per-professor protection
- Create, update, and delete your own reviews
- Professor rating/statistics refresh after reviews
- MongoDB database integration
- Express REST API with Helmet, CORS, and rate limiting
- Responsive frontend for desktop and mobile
- Demo professor data keeps the public frontend usable before API deployment

## Project structure

```text
professor-review-/
├── index.html
├── style.css
├── script.js
├── api-config.js
├── render.yaml
├── backend/
│   ├── server.js
│   ├── models.js
│   ├── seed.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── .github/
    └── workflows/
        └── deploy-pages.yml
```

## Frontend deployment

The repository is configured for GitHub Pages. Enable **GitHub Pages → Build and deployment → GitHub Actions** in the repository settings. The workflow deploys the `main` branch automatically.

Expected project-site URL:

`https://sahsiddh989-wq.github.io/professor-review-/`

## Backend deployment

`render.yaml` contains the Render web-service configuration. The backend requires these environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

After deploying the backend, put its API URL in `api-config.js`, for example:

```js
window.PROFESSOR_REVIEW_API = 'https://your-api-domain.onrender.com/api';
```

Do not commit real secrets or `.env` files.

## Local development

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

### Frontend

Serve the repository root with any static HTTP server. Opening `index.html` directly is fine for the demo UI, but API features require the deployed/configured backend.

## API overview

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/professors`
- `GET /api/professors/:id`
- `POST /api/professors`
- `GET /api/reviews/professor/:id`
- `GET /api/reviews/mine`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

## Security

Passwords are hashed with bcrypt. Authentication uses signed JWTs. The API uses Helmet security headers, CORS restrictions, request-size limits, and rate limiting. Keep `JWT_SECRET` and database credentials private.

## Status

Frontend: ready for GitHub Pages deployment.

Backend: ready for Render deployment once MongoDB and environment variables are supplied.
