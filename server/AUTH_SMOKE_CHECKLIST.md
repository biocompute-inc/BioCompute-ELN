# Auth Smoke Checklist

Use this quick flow to validate backend auth + frontend protected routes end-to-end.

## 1) Environment Setup

Backend (.env in server folder):

```env
DATABASE_URL=<your-supabase-session-pooler-or-direct-url>
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=<strong-random-secret>
```

Frontend (.env.local in client folder):

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 2) Start Services

From server folder:

```powershell
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

From client folder:

```powershell
npm install
npm run dev
```

Expected:
- API up at http://127.0.0.1:8000
- Frontend up at http://localhost:3000

## 3) Backend Endpoint Checks (FastAPI docs)

Open:
- http://127.0.0.1:8000/docs

Run in this order:
1. POST /auth/register
- body example:
```json
{
  "email": "test.user@example.com",
  "password": "StrongPass123!",
  "full_name": "Test User"
}
```
- expect 201

2. POST /auth/jwt/login
- form fields:
  - username: test.user@example.com
  - password: StrongPass123!
- expect 200 with access_token

3. GET /auth/me
- click Authorize in docs and paste bearer token
- expect 200 with user payload

4. POST /auth/forgot-password
- body:
```json
{
  "email": "test.user@example.com"
}
```
- expect 202/200 (provider-dependent behavior)

5. POST /auth/jwt/logout
- with bearer token
- expect 204/200

## 4) Frontend Auth Flow Checks

1. Visit http://localhost:3000/login
- enter credentials and submit
- expect redirect to dashboard (/)

2. Hard-refresh on dashboard
- expect still authenticated (token persisted)

3. Visit /register while logged in
- expect redirect back to /

4. Click Logout from sidebar
- expect redirect to /login

5. Try opening / directly after logout
- expect redirect to /login

6. Visit /forgot-password and submit email
- expect success confirmation state in UI

## 5) CORS Validation

In browser DevTools Network tab:
- check requests to /auth/*
- expect no CORS errors
- response headers should include matching Access-Control-Allow-Origin for localhost:3000

## 6) Common Failures and Fixes

- 401 on /auth/me after login:
  - token missing/expired; log in again

- Login fails with CORS error:
  - ensure CORS_ORIGINS includes frontend origin exactly

- App startup fails on DB connect:
  - verify DATABASE_URL and credentials
  - for Supabase, use Session Pooler for app runtime

- Register returns "User already exists":
  - use a new email or clean user in DB
