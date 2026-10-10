# PrepSpace

PrepSpace is a student-driven exam practice platform. Students can create exams from question-paper and answer-key PDFs, attempt their own or public exams, and review submitted attempts. Admin authentication remains separate from student authentication.

## Main flow

1. Sign in as a student.
2. Create an exam, upload the question paper and answer-key PDFs, and set exam title/type, year, visibility, duration, positive marks, and negative marks.
3. Review the extracted questions and correct answers before saving. MCQ, integer, and numerical questions are supported.
4. Attempt the exam with a countdown timer, previous/next navigation, answer palette, MCQ choices, or numeric input.
5. Submission or time expiry finalizes the attempt and calculates the score on the backend.
6. The student returns to the dashboard. My Results stores attempts and lets the student reopen a submitted attempt for answer review.
7. Public exams share the same verified answer key across all attempts. Each attempt's answers and score are separate.
8. Admin can inspect public papers, see uploader usernames, correct MCQ answer keys, and unpublish a paper without deleting historical attempts.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, and `ADMIN_JWT_SECRET` in `backend/.env`. Keep secrets out of source control.

### OpenRouter (optional, recommended for complex layouts)

Set `OPENROUTER_API_KEY` in `backend/.env`. You can reuse your existing OpenRouter key if it has access to the selected model. `OPENROUTER_MODEL` defaults to `openai/gpt-4o-mini`. The key must never be placed in the frontend environment or React source. OpenRouter is used for structuring extracted text; it is not used to grade every attempt.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The default backend URL is configured in `frontend/src/api.js`. Set `CLIENT_URL` to the frontend origin in the backend environment if it differs from `http://localhost:5173`.

## Important implementation/security notes

- Correct answers are excluded from the exam-detail response and active-attempt response. The backend only returns correct answers for an attempt that has been submitted.
- The answer key belongs to the exam, while each attempt stores a separate response map and result.
- Admin removal unpublishes a paper, preserving the creator's record and historical attempts.
- PDF.js extracts text from text-based PDFs. OpenRouter structures that extracted text. Image-only/scanned PDFs still require OCR; they may not parse automatically in this version. Always review extracted questions and answers before publishing.
- MCQ and numeric scoring is deterministic backend logic. Numeric questions can use an answer tolerance.
- The answer-key parser and question parser can make mistakes on unusual layouts. Verify all questions and answers before publishing.
