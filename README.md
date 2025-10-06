# basic.adv — AI-assisted contact form & lead intake

**basic.adv** is an agency website with a **fully AI-integrated contact flow**.
Visitors choose a service and budget; the app then asks **smart, non-repeating questions** tailored to that service and adapts live to each answer.
At the end, the system produces a **friendly message for the user** and an internal **Action Plan** for the team.
All requests land in a **secure, authenticated dashboard** for the agency.

---

## What users experience

1. **Pick a service & budget**
2. **Answer questions that adapt** to the chosen service (Logo, Web, Social, etc.) and to previous answers
3. **No duplicates**: every question in a session is unique
4. **Finish with clarity**: the app composes a clean, human-sounding summary for the user
5. **Hand-off**: the agency receives an internal Action Plan with scope, priorities, and next steps

---

## What the agency gets

* **Dashboard (auth-protected)** to review every request, with timestamps and per-service counters
* **Action Plans** auto-generated from the conversation (fewer back-and-forths, faster scoping)
* **Structured data** (questions, answers, service queue, question counts) ready for operations, CRM or analytics
* **A learning loop**: aggregated insights help refine what we ask and when we ask it

---

## How it works (behind the scenes)

* **Frontend (React + MUI)** renders the dynamic brief and handles the session UX.
* **Backend (Express)** orchestrates the flow:

  * creates a `sessionId` and stores initial `formData`
  * requests tailored question sets from the **RL Question Generator** (external service)
  * persists each **question** and **answer** as the user progresses
  * on completion, asks AI to draft the **User Message** and the **Action Plan**
* **Database (MongoDB Atlas)**: one document per session containing:

  * `formData` (brand, project type, business field, budget, contacts)
  * `questions` (text, type, options, flags like `requiresInput`)
  * `answers` (selected options and/or free text)
  * per-service counters, asked-question history, timestamps, metadata
* **AI generation rules** (from the RL service):

  * mix of multiple-choice and open text
  * **no repeated questions** within a session
  * relevance scoring based on **service** and prior **answers**
  * special handling when needed (e.g., color preferences)

> Keys for the language model are **never** in this repo; they live in the RL service.
> This app talks only to our own backend and the RL API—*not directly to OpenAI*.

---

## Why it matters

* **Higher-quality briefs** without long calls or vague forms
* **Lower drop-off** thanks to short, relevant questions
* **Faster scoping**: the Action Plan turns answers into concrete next steps
* **Better operations**: every request is structured, searchable, and exportable

---

## Architecture (high level)

```
Browser (user)
   │
   ▼
basic.adv — Frontend (React)
   │
   ▼
basic.adv — Backend (Express)
   │                └──► MongoDB Atlas (sessions, questions, answers)
   ▼
RL Question Generator (external backend)
   ▼
OpenAI (server-side only, in RL service)
```

---

## Data & privacy

* We store only what’s needed to follow up: session content, answers, and minimal contact info.
* All secrets (DB credentials) are environment variables; model keys are isolated in the RL service.
* MongoDB Atlas provides encryption at rest; access is restricted to our backend.

---

## Tech stack

* **UI:** React (Vite) + MUI
* **API:** Node.js / Express
* **DB:** MongoDB Atlas
* **AI:** external RL Question Generator (server-side OpenAI)

---

## Getting started (quick)

* Set environment variables for the backend (Mongo URI and RL API base)
* Run frontend & backend in dev, point the backend to the RL service
* Open the dashboard (auth required) to review incoming requests

> Detailed install/run instructions live in the repo’s `README.dev.md` (for contributors).

---

## Roadmap

* Multi-service branching flows (e.g., Branding → Web hand-offs)
* Admin tagging & status pipelines (New / In review / Quoted / Won / Lost)
* CRM sync (HubSpot/Notion/Airtable)
* Analytics on question performance and completion rates

---

**basic.adv** — turn curious visitors into ready-to-act briefs, automatically.
