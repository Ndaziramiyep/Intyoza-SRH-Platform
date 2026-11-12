# Intyoza SRH Platform

Intyoza is a sexual and reproductive health (SRH) platform designed for young people, with a trusted, supportive digital experience that combines a React web app, a Node.js API, and an offline AI assistant for SRH guidance.

The project is structured to separate concerns across three main areas:

- Frontend: a Vite + React application for the user-facing experience
- Backend: an Express API with Prisma database access and authentication
- AI service: a Python-based SRH chatbot that can run locally and provide health-related responses with safety checks

## Overview

The platform is intended to provide accessible, youth-friendly SRH information in a safe and respectful way. The system includes:

- a responsive web frontend for navigating content and interacting with the assistant
- protected API routes for users, consent, and AI integrations
- database-backed user/authentication flows using Prisma
- an AI provider layer that can use either a mock implementation or the local SRH chatbot
- a safety-first design for health advice workflows

This repository is a multi-service project and is best run as a combined local stack during development.

## Project structure

```text
Intyoza-SRH-Platform/
├── LICENSE
├── Readme.md
├── ai/
│   └── intyoza_srh/
│       ├── __init__.py
│       ├── __main__.py
│       ├── chatbot.py
│       ├── encoder.py
│       ├── featurizer.py
│       ├── history.py
│       ├── README.md
│       ├── requirements.txt
│       ├── safety.py
│       ├── server.py
│       └── web/
│           └── index.html
├── backend/
│   ├── docs/
│   │   └── ai-integration-contract.md
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── server.js
│   │   ├── swagger.js
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   ├── eslint.config.js
│   ├── package.json
│   └── package-lock.json
├── Frontend/
│   ├── package.json
│   ├── apps/
│   │   └── web/
│   │       ├── public/
│   │       ├── src/
│   │       ├── eslint.config.js
│   │       ├── index.html
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       ├── tsconfig.app.json
│   │       ├── tsconfig.node.json
│   │       └── vite.config.ts
│   └── packages/
│       └── shared/
│           └── src/
└── .gitignore
```

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 20 or newer
- npm
- Python 3.10+
- A PostgreSQL-compatible database if you want to use the backend database features
- Access to the project dependencies for the frontend and backend

## How to run the app

### 1. Install backend dependencies

```bash
cd backend
npm install
```

Create an environment file for the backend, for example:

```bash
cp .env.example .env
```

If there is no `.env.example`, create a `.env` file manually with values similar to:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=replace_with_a_long_secure_secret
DATABASE_URL="postgresql://user:password@localhost:5432/intyoza"
AI_PROVIDER=mock
AI_SERVICE_URL=http://localhost:8000
```

Then start the backend:

```bash
npm run dev
```

The API should run on:

- http://localhost:4000

### 2. Install frontend dependencies

```bash
cd Frontend/apps/web
npm install
```

Start the frontend:

```bash
npm run dev
```

The web app should be available at:

- http://localhost:5173

### 3. Start the AI service (optional but recommended for full-stack testing)

```bash
cd ai/intyoza_srh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m intyoza_srh --host 0.0.0.0 --port 8000
```

This launches the local SRH chatbot service, which the backend can call through the configured AI service URL.

### 4. Run database migrations

If the backend uses Prisma and the database is available:

```bash
cd backend
npx prisma generate
npx prisma migrate
```

### 5. Run tests

```bash
cd backend
npm test
```

## API and application notes

- The backend is built with Express and exposes routes for authentication, AI requests, and app services.
- The frontend is a React/Vite app and uses the shared package for reusable code.
- The AI module includes safety-first SRH guidance and can run offline without external AI services.
- The backend supports an AI provider configuration via environment variables such as `AI_PROVIDER` and `AI_SERVICE_URL`.

## Licence

This project is licensed under the MIT License.

See the [LICENSE](LICENSE) file for the full licence text.
