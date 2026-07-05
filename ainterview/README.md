# AInterview

AInterview is a web-based mock interview platform for practicing behavioral, theoretical technical, and coding interviews. It combines a structured interview flow, AI-generated interviewer responses, AI scoring feedback, posture/engagement tracking, and real code execution through Judge0.

## Features

- **Configurable interview sessions**
  - Behavioral, technical, or full interview modes
  - Junior, mid, and senior difficulty levels
  - Target role selection
  - Session time limit selection
  - Coding question count selection for technical and full interviews

- **AI interview flow**
  - Gemini-powered interviewer responses
  - Behavioral and theoretical answer analysis
  - Scored feedback persisted to Supabase

- **Coding interview environment**
  - Problem statement and public test case panel
  - Multi-language starter templates
  - Judge0 CE execution support
  - Hidden test execution on final submission
  - AI code review using correctness, time complexity, and code quality metrics

- **Session history and analytics**
  - Saved interview sessions
  - Per-question score breakdowns
  - Aggregate performance summaries
  - Engagement metrics from camera-based posture tracking

## Tech Stack

- **Framework:** Next.js 16 App Router
- **UI:** React 19, Tailwind CSS, Lucide React
- **Authentication and database:** Supabase
- **LLM:** Google Gemini via `@google/generative-ai`
- **Code execution:** Judge0 CE API
- **Language:** TypeScript

## Project Structure

```text
app/
  api/
    code/                  Judge0 execution route
    interview/chat/        Gemini chat and analysis route
  dashboard/
    configuration/         Interview setup page
    history/               Session history and score review
    about/                 Project information page
  interview/
    behavioral/            Live interview experience
    code-editor/           Coding challenge editor
  lib/supabase/            Browser and server Supabase clients

supabase/
  schema/                  Database schema reference
  seed/                    Example problem and testcase seed data

database.types.ts          Generated Supabase database types
```

## Prerequisites

- Node.js compatible with Next.js 16
- npm
- Supabase project
- Google Gemini API key
- Network access to Judge0 CE, or a compatible Judge0 deployment

## Environment Variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported by the browser client as a fallback, but `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is what the server client expects.

## Installation

```bash
npm install
```

## Running Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

If the build fails while fetching Google Fonts, check that the environment has network access. Next.js downloads configured fonts during production builds.

## Database Notes

The application uses the canonical Supabase tables represented in `database.types.ts`, including:

- `users`
- `sessions`
- `responses`
- `response_evaluations`
- `problems`
- `testcases`
- `api_usage`
- `account_requests`

The SQL files under `supabase/` are useful references and seed examples, but `database.types.ts` reflects the schema currently used by the app code.

## Core Data Flow

1. A user configures an interview from the dashboard.
2. A `sessions` row is created in Supabase.
3. The live interview page asks questions and sends conversation context to `/api/interview/chat`.
4. Candidate answers and code submissions are saved to `responses`, with their
   type recorded as `behavioral`, `theoretical`, or `coding`.
5. AI scores and type-specific JSON rubrics are saved to
   `response_evaluations`.
6. The history page aggregates responses and evaluations into session-level feedback.

## Code Execution

The `/api/code` route submits code to Judge0 CE, polls for completion, compares stdout with expected output, and returns per-test results plus a summary. When a `problem_id` is provided, the route fetches all test cases server-side, including hidden tests, while returning only public case details to the client.

Supported language keys:

- `javascript`
- `typescript`
- `python`
- `java`
- `go`
- `cpp`
- `c`

## AI Scoring

The system uses Gemini for two modes:

- **Conversation mode:** returns the next interviewer message.
- **Analysis mode:** returns JSON scoring data for saved answers or code.

The app defensively parses model output because LLMs can return fenced JSON blocks even when prompted for raw JSON.

## Current Limitations

- Judge0 CE is a public shared service and may rate-limit requests.
- LLM scoring is non-deterministic and should be treated as guidance, not a definitive evaluation.
- The code editor is currently a textarea rather than a full IDE component.

## Possible Improvements

- Add Monaco Editor for syntax highlighting, formatting, and better editing ergonomics.
- Persist full Judge0 execution results for auditability.
- Add a dedicated analysis API route instead of sharing the chat endpoint for both chat and scoring.
- Store session configuration fields such as time limit and coding count in the database.
- Add automated tests for API routes and scoring persistence.
- Use a private Judge0 deployment for more reliable code execution.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build production app
npm run start    # Start production server
npm run lint     # Run ESLint
```

