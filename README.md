# BioCompute-ELN

BioCompute-ELN is a full-stack electronic lab notebook focused on real bench-science workflows.

It includes:
- A Next.js client for experiment creation, visual canvas editing, templates, sharing, and review flows.
- A FastAPI server for authentication, experiment APIs, sharing, and persistence.

## Stack

- Frontend: Next.js (App Router), TypeScript, React, Lucide icons
- Backend: FastAPI, SQLAlchemy-style models, Python
- Auth and sharing: route-based auth flows and tokenized share views

## Repository Layout

```text
BioCompute-ELN/
	client/     # Next.js frontend
	server/     # FastAPI backend
```

## Frontend Setup

From the [client](client) directory:

```bash
npm install
npm run dev
```

Client runs on `http://localhost:3000` by default.

## Backend Setup

From the [server](server) directory:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Server runs on `http://localhost:8000` by default.

## Environment Notes

- Run frontend and backend in separate terminals.
- If you update backend routes or schemas, verify matching client calls.
- Keep icon usage consistent with Lucide where possible.

## Current Product Areas

- Authentication: register, login, forgot-password flows
- Canvas: experiment-specific visual editing and block workflows
- Templates: reusable experiment templates
- Sharing: tokenized view links and comment/review routes
- Collaboration: comment threads and collaborator model support

## Landing Page

The landing experience in [client/app/landing/page.tsx](client/app/landing/page.tsx) is designed as a polished ELN product page with:
- Animated hero and ambient background motion
- Interactive feature cards and process flow panels
- Fully Lucide-based iconography
- No placeholder image or GIF dependencies
- Mobile-responsive layout behavior

## Scripts

Client common scripts:
- `npm run dev`: start Next.js dev server
- `npm run build`: production build
- `npm run lint`: lint the frontend

Backend common command:
- `uvicorn main:app --reload`: start FastAPI in development mode

## Contributing

1. Create a feature branch.
2. Keep changes scoped and test both client and server impact.
3. Run lint and local sanity checks before opening a PR.

## License

Add your preferred license in this repository root if not already defined.
