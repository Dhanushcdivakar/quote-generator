# Quote Generator - Backend

## Setup
1. `cd backend`
2. `npm install`
3. `npm run dev` (requires nodemon) or `npm start`

The backend exposes POST `/api/generate-quote` which expects JSON:
{
  "customerName": "...",
  "description": "...",
  "rate": number,
  "factor": number,
  "settings": number,
  "pathLength": number,
  "thickness": number,
  "passes": number,
  "quantity": number
}

It returns a downloadable PDF as the response.
