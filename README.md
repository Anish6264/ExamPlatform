# Exam Platform (MERN, JavaScript)

A personal-practice exam app: account registration/login, PDF text extraction, editable MCQs, timed attempts, answer-key scoring, and attempt history.

## Requirements
- Node.js 20+
- MongoDB local or MongoDB Atlas connection string

## 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Set `MONGO_URI` and a long random `JWT_SECRET` in `backend/.env`.

## 2. Frontend
In another terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open the URL Vite prints (normally http://localhost:5173).

## PDF parser limitations
The first version extracts text from text-based PDFs and uses a best-effort pattern to detect MCQs. Scanned/image-only PDFs need OCR, which is not included in this MVP. Always review and correct extracted questions and answer keys before starting a test.

## Security notes
- Passwords are hashed using bcrypt.
- JWT is required for private API routes.
- PDFs are processed in memory and are not permanently stored in this MVP.
- The server is authoritative for exam deadlines and scoring.
- This is an MVP. Before production, add rate limiting, email verification/password reset, stronger upload/content validation, logging, backups, and security review.
