# Professor Review Hub

Professor Review Hub is a student-first professor discovery and review platform with **Sidd AI**, an AI assistant that turns student feedback into useful academic insights.

## AI features

- **Sidd AI Assistant** — conversational assistant for professor, course and review questions
- **AI Review Summaries** — concise professor strengths, weaknesses and themes
- **Sentiment Analysis** — positive/neutral/negative review sentiment with confidence
- **AI Review Moderation** — checks submitted reviews before publication
- **AI Tags** — automatically identifies useful review themes
- **Natural-language / semantic professor search** — search by learning preferences and meaning
- **AI Professor Recommendations** — recommendations based on student preferences
- **AI Professor Insights** — summarizes real student feedback on a professor

## Stack

- Frontend: HTML, CSS, JavaScript, GitHub Pages
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt
- AI: OpenAI Responses API through the server-side SDK
- Deployment: GitHub Pages + Node hosting (Render/Vercel compatible)

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
│   ├── server-v2.js
│   ├── ai.js
│   ├── models.js
│   ├── seed.js
│   ├── package.json
│   └── .env.example
└── .github/workflows/
```

## AI environment variables

Keep the OpenAI key on the backend only. Never put it in `script.js`, `index.html`, GitHub Pages, or any public client-side file.

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6-luna
```

The deployment configuration also supports `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

## AI API endpoints

- `GET /api/ai/professor/:id/insights`
- `POST /api/ai/chat`
- `POST /api/ai/search`
- `POST /api/ai/recommend`
- `POST /api/ai/moderate`

## Local development

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Set the backend URL in `api-config.js` for the frontend.

## Security

AI requests are performed server-side. The client never receives the OpenAI API key. Existing authentication, CORS, Helmet and rate limiting remain enabled.
