# Stakeholder Feedback Module (Vision, Mission, PEO)

## 1) Database Schema Design

### Extended existing table
- `public.representative_stakeholders`
  - `is_approved BOOLEAN NOT NULL DEFAULT FALSE`
  - `login_password_hash TEXT`
  - `last_login_at TIMESTAMPTZ`
  - Unique index: `(program_id, LOWER(member_id)) WHERE member_id IS NOT NULL`

### Program-level timeline control
- `public.programs`
  - `vmpeo_feedback_start_at TIMESTAMPTZ`
  - `vmpeo_feedback_end_at TIMESTAMPTZ`
  - `vmpeo_feedback_cycle TEXT CHECK IN ('brainstorming','finalization')`

### New tables
- `public.program_vmpeo_feedback_submissions`
  - Submission header with `program_id`, stakeholder identity snapshot, `institution_name`, `feedback_cycle`, `submitted_at`
- `public.program_vmpeo_feedback_entries`
  - One row per category response (`vision`, `mission`, each `peo`)
  - Includes `rating (1..5)`, `comment`, optional PEO mapping (`peo_id`, `peo_number`, `peo_statement`)

Migration file: `supabase/migrations/20260226_stakeholder_feedback_module.sql`

## 2) API Endpoint Structure

### Stakeholder auth + submission
- `POST /api/stakeholder/login`
  - Payload: `institute_name`, `stakeholder_id`, `stakeholder_password`
  - Validates approved stakeholder from `representative_stakeholders`
- `GET /api/stakeholder/context`
  - Returns Vision, Mission, PEO list, timeline window, cycle, submission eligibility
- `POST /api/stakeholder/feedback`
  - Stores VMPEO feedback with submission header + normalized entries
  - Enforces timeline window and PEO completeness
- `POST /api/stakeholder/logout`

### Admin controls + report
- `GET /api/institution/feedback/vmpeo/timeline?programId=...`
- `PUT /api/institution/feedback/vmpeo/timeline`
  - Payload: `programId`, `feedbackStartAt`, `feedbackEndAt`, `feedbackCycle`
- `GET /api/institution/feedback/vmpeo/report?programId=...&category=...&stakeholder=...&fromDate=...&toDate=...`
  - Returns tabular rows + summary metrics + grouped PEO comments
- `GET /api/institution/feedback/vmpeo/export?...&format=excel|pdf`
  - `excel` => CSV download
  - `pdf` => print-ready report view

## 3) Role-Based Access Logic

- `institution_admin`
  - Access: all `/institution/*` and institution feedback APIs
  - Can configure timeline and see all consolidated feedback
- `stakeholder`
  - Access: only `/stakeholder/*` and stakeholder APIs
  - Can submit only own feedback; no cross-stakeholder visibility
- Middleware isolation:
  - Institution routes require `institution_token`
  - Stakeholder routes require `stakeholder_token`
  - Separate public login routes for each role

## 4) Dashboard UI Layout Structure

### Homepage
- New centered card section: **Stakeholder Login**
- Fields: `Institute Name`, `Stakeholder ID`, `Stakeholder Password`
- Redirect target after success: `/stakeholder/dashboard`

### Stakeholder Dashboard (`/stakeholder/dashboard`)
- Section 1: Vision feedback (statement + 1..5 rating + comment)
- Section 2: Mission feedback (statement + 1..5 rating + comment)
- Section 3: PEO feedback (per-PEO rating + comment)
- Submit button with timeline lock enforcement

### Admin Program Dashboard
- New process/tile: **Vision, Mission and PEO feedback** (`process-7`)
- View includes:
  - Timeline control (start/end/cycle)
  - Filterable table (category/stakeholder/date range)
  - Metrics: avg Vision, avg Mission, avg PEO, Vision approval %
  - Grouped comments by PEO mapping
  - Export buttons (Excel/PDF)

## 5) Data Flow

1. Admin adds representatives in **Add Representative Stakeholders** with:
   - Stakeholder type/category
   - Login password
   - Approval toggle
2. Stakeholder logs in via homepage or stakeholder login page.
3. Stakeholder dashboard loads program VMPEO context and timeline.
4. Submission writes:
   - one record in `program_vmpeo_feedback_submissions`
   - multiple rows in `program_vmpeo_feedback_entries` (vision, mission, PEO-wise)
5. Admin report API aggregates and serves:
   - tabular feedback rows
   - summary metrics
   - PEO grouped comments

## 6) Security Implementation Strategy

- Passwords hashed with `bcrypt` (`login_password_hash`).
- Stakeholder login allowed only for approved representatives (`is_approved = true`).
- Strict route role segregation in middleware.
- Timeline enforcement at API level (server-side guard, not only UI).
- Program ownership checks on admin APIs (`program.institution_id` match token `id`).
- API rate limiting for login routes.
- Security headers + CSRF origin checks for mutating API requests.
