# Generate Curriculum Structure Module (Process 12)

## 1) Purpose and Scope

`Generate Curriculum Structure` is the curriculum design engine and UI workflow for creating a semester-wise program structure with:

- category-level curriculum distribution
- semester-level category/course allocation
- generated courses with credit-hour breakup
- save/load support for program-specific drafts

This module appears in process step `process-12`.

Primary references:

- `lib/institution/process.ts` (step registration and description)
- `components/institution/workspace/ProcessStepPanel.tsx` (`CurriculumStructurePanel`)
- `app/api/ai/generate-curriculum/route.ts` (generation API)
- `lib/curriculum/engine.ts` (core generation logic)
- `app/api/curriculum/structure/route.ts` (load persisted structure)
- `app/api/curriculum/save/route.ts` (save structure and generated rows)
- `lib/curriculum/validator.ts` (learning progression + technology alignment validation)
- `lib/curriculum/technology-trend-engine.ts` (trend-informed elective/skill suggestions)

## 2) Where It Is Wired in the Product

### Process definition

The module is configured as:

- key: `process-12`
- title: `Generate Curriculum Structure`
- phase: `Curriculum Development`
- description: `Create the curriculum structure for the selected program.`

Source: `lib/institution/process.ts`.

### UI rendering

`ProcessStepPanel` renders `CurriculumStructurePanel` when `step.key === "process-12"`.

Source: `components/institution/workspace/ProcessStepPanel.tsx`.

### Navigation path

Typical navigation to the page:

`/institution/process/process-12?programId=<PROGRAM_UUID>`

Links from dashboard send `programId`. `programName` is now resolved from the selected program context and no longer depends on URL fallback.

Sources:

- `components/institution/dashboard/ProgramDashboardHome.tsx`
- `components/institution/workspace/InstitutionWorkspace.tsx`

## 3) Selected Program Context

The module uses query params:

- `programId` (required for generation/persistence)
- `programName` (optional UI hint only)

Behavior:

1. `programId` is used to load, generate, validate, and save structure data.
2. Program duration is fetched from `/api/institution/me` and used to compute semester count (`duration * 2`, clamped to 2..12).
3. Generation API resolves canonical program name from database (`programId`) and enforces upstream readiness checks (Vision, Mission, PEO/PO/PSO baseline).
4. If duration fetch fails, default duration remains `4` years (8 semesters).

Sources:

- `components/institution/workspace/ProcessStepPanel.tsx`
- `app/api/institution/me/route.ts`

## 4) UI Composition

The panel has five functional parts:

1. Header/actions
2. Category Design Table (distribution + computed outputs)
3. Elective settings
4. Semester Category Table
5. Generation controls + generated result tables

### 4.1 Header and actions

Actions:

- `Save Curriculum`
- `Fill Sample Data`
- `AI Fill & Generate`

Display banners:

- design percent total (must be exactly 100 excluding MC)
- generation errors
- generation warnings

### 4.2 Category Design Table

Configured categories:

- `BS`: Basic Science
- `ES`: Engineering Science
- `HSS`: Humanities & Social Science
- `PC`: Professional Core
- `PE`: Professional Elective
- `OE`: Open Electives (Inter-departmental)
- `MC`: Audit / Mandatory Courses
- `AE`: Ability Enhancement Courses
- `SE`: Skill Enhancement Courses
- `PR`: Projects, Internships & Seminar

Displayed min/max ranges are UI guidance values:

- BS `20-25`
- ES `15-20`
- HSS `10-15`
- PC `25-30`
- PE `10-15`
- OE `10-15`
- MC `0-0`
- AE `5-6`
- SE `5-6`
- PR `8-10`

Columns:

- Typical Credit Range (%): Min, Max
- Your Design %
- Number of Courses: `T`, `P`, `TU`, `LL`
- Suggested Learning Hours & Credit: `CI`, `T`, `LI`, `TW/D`, `Total`, `Credit`

Rules:

- MC design percent is disabled in UI and fixed to `0`.
- Design percent total must be exactly `100` (tolerance `<= 0.01`).

### 4.3 Elective settings

Two persisted selectors:

- Conventional elective type
- Trans-disciplinary elective type

These values are stored but currently not used in generation computation.

### 4.4 Semester Category Table

For each semester:

- semester label (`I`, `II`, ...)
- level (`Foundation`, `Engineering Base`, `Professional Core`, `Specialization`, `Capstone`)
- `No. of Credits`
- course counts by columns: `BS`, `ES`, `HSS`, `PC`, `OE`, `MC`, `AE`, `SE`, `INT`, `PRO`, `OTHERS`
- row total course count

Footer totals:

- total credits across semesters
- totals per category column
- grand total courses

Mapping used when sending to generator:

- `PR = PRO + INT`
- `PE = OTHERS`
- `MC` is still forced to zero by engine

### 4.5 Generated Curriculum Result view

For each semester, generated rows show:

- course title
- PO/PSO mapping hint
- CI, T, LI, TW+SL, Total, Credit
- category badge

A semester subtotal row sums all hour and credit columns.

## 5) Generation Modes and Button Behavior

### Generate Curriculum

Uses current table values:

- `totalCredits`
- `categoryPercentages` (from Design %)
- `semesterCategoryCounts` (from semester table)

Calls `POST /api/ai/generate-curriculum`.

### Create All Semesters

Uses:

- `totalCredits`
- `categoryPercentages`
- `semesterCategoryCounts: []` (forces auto-distribution by engine)

Calls `POST /api/ai/generate-curriculum`.

### AI Fill & Generate

If inputs are invalid/missing (`totalCredits` invalid or Design % total != 100):

- applies sample defaults
- clears table semester allocations
- triggers generation

Else:

- uses existing table values

### Generate From Semester

Requires an already generated curriculum and selected semester.

Calls `POST /api/ai/regenerate-semester` to retitle/rebuild that target semester context while keeping full curriculum constraints.

## 6) Core Domain Models

From `lib/curriculum/engine.ts`:

- `GeneratedCurriculum`
  - `programName`
  - `totalCredits`
  - `semesterCount`
  - `mode`
  - `generatedAt`
  - `categorySummary[]`
  - `semesters[]`
- `GeneratedSemester`
  - `semester`
  - `level`
  - `totalCredits`
  - `categoryCourseCounts`
  - `courses[]`
- `GeneratedCourse`
  - `semester`
  - `category`
  - `courseCode`
  - `courseTitle`
  - `tHours`, `tuHours`, `llHours`, `twHours`
  - `totalHours`
  - `credits`

## 7) Credit and Learning-Hour Calculations

### Global rule

- `1 credit = 30 total learning hours`
- Formula: `totalHours = floor(credits) * 30`

### Category-specific hour split

The engine computes CI/tutorial/lab/teamwork proportions by category:

- `HSS`, `AE`, `OE`: mostly CI + tutorial, no lab
- `PR`: project-heavy (higher lab/teamwork)
- `SE`: practical-heavy

## 8) Learning Progression and Technology Alignment

The module enforces a 3-layer curriculum model through `CurriculumValidator`:

1. Fundamental Backbone (Year 1)
2. Core Program Knowledge (Year 2/3)
3. Emerging Technologies + Capstone (Year 3/4)

Blocking checks include:

- missing fundamental groups (Math / Science / Basic Engineering)
- missing domain backbone courses
- advanced/emerging topics introduced too early
- prerequisite sequence violations (for example, Programming -> Data Structures -> Algorithms -> AI)
- domain-misaligned core topics

The advisor/generation stack uses guardrail prompts (`lib/curriculum/ai-guardrails.ts`) and trend augmentation (`TechnologyTrendEngine`) to keep AI outputs aligned with domain integrity and industry evolution.
- `PE`: balanced advanced elective profile
- others (`BS`, `ES`, `PC`): standard core split

Values are rounded to nearest `15` hours, with residual assigned to teamwork.

Source: `buildHourBreakdown()` in `lib/curriculum/engine.ts`.

## 8) Generation Algorithm (Engine)

`buildCurriculum()` flow:

1. Validate `totalCredits` is positive integer.
2. Normalize category percentages.
   - if missing, apply defaults:
     - BS 22, ES 18, HSS 12, PC 28, PE 8, OE 5, MC 0, AE 3, SE 2, PR 2
3. Enforce percentage total = `100` (excluding MC).
4. Convert percentages to category credits with floor + fractional remainder distribution.
5. Build per-category course credit pools (`~2-4` credits per course sizing logic).
6. Normalize semester category counts:
   - use provided weights if given
   - otherwise auto-distribute by semester level weights
   - move invalid category-in-level requests with warnings
7. Create course records:
   - assign credits from pools
   - assign fallback title from program-track library
   - compute hour breakdown
   - generate course code
8. Sort courses and recode sequence.
9. Compute semester totals and category summaries.
10. Validate generated total credits match requested.

### Semester-level progression logic

Semester labels are classified by relative position:

- `< 0.25`: Foundation
- `< 0.5`: Engineering Base
- `< 0.75`: Professional Core
- `< 0.9`: Specialization
- otherwise: Capstone

This drives auto-distribution preferences and warnings.

## 9) AI Title Layer (Gemini)

After deterministic generation, API can apply AI title refinement:

- endpoint: Gemini 2.5 Flash (`generateContent`)
- prompt constraints:
  - NEP 2020 priority
  - AICTE + UGC alignment
  - preserve course code/category/credits
  - do not alter hours/credits
  - avoid advanced terms in early semesters
  - avoid duplicates

Fallback behavior:

- if `GEMINI_API_KEY` missing or response invalid/error: keep deterministic titles and return warnings.

Sources:

- `lib/curriculum/ai.ts`
- `app/api/ai/generate-curriculum/route.ts`

## 10) Client-Side Validation Logic

Before/after generation, UI validates:

- total credits is positive whole number
- category percent total = 100
- generated semester credit sum equals program total
- each semester course credit sum equals semester total
- each course `totalHours === credits * 30`
- each semester category allocated counts match generated course counts

Any violation is shown in error banner and generation result is rejected in UI state.

Source: `validateGeneratedCurriculum()` in `ProcessStepPanel.tsx`.

## 11) API Contracts

### 11.1 Generate curriculum

`POST /api/ai/generate-curriculum`

Request:

```json
{
  "programId": "PROGRAM_UUID",
  "programName": "Mechanical Engineering",
  "totalCredits": 160,
  "semesterCount": 8,
  "categoryPercentages": {
    "BS": 22,
    "ES": 18,
    "HSS": 12,
    "PC": 28,
    "PE": 10,
    "OE": 5,
    "MC": 0,
    "AE": 3,
    "SE": 1,
    "PR": 1
  },
  "semesterCategoryCounts": [
    { "semester": 1, "counts": { "BS": 3, "ES": 2, "HSS": 1 } }
  ],
  "enableAiTitles": true,
  "strictAcademicFlow": true
}
```

Success response:

```json
{
  "curriculum": { "...": "GeneratedCurriculum" },
  "programContext": {
    "programId": "PROGRAM_UUID",
    "programName": "B.Tech Mechanical Engineering",
    "peoCount": 4,
    "poCount": 12,
    "psoCount": 3
  },
  "warnings": []
}
```

Error response:

```json
{
  "errors": ["..."],
  "warnings": ["..."]
}
```

### 11.2 Regenerate from semester

`POST /api/ai/regenerate-semester`

Request:

```json
{
  "semester": 5,
  "curriculum": { "...": "GeneratedCurriculum" },
  "enableAiTitles": true
}
```

Response:

```json
{
  "curriculum": { "...": "GeneratedCurriculum" },
  "warnings": []
}
```

### 11.3 Load saved structure

`GET /api/curriculum/structure?programId=<uuid>`

Response:

```json
{
  "categoryCredits": [],
  "electivesSettings": null,
  "semesterCategories": []
}
```

### 11.4 Save structure and generated data

`POST /api/curriculum/save`

Request:

```json
{
  "programId": "uuid",
  "categoryCredits": [],
  "electivesSettings": {
    "conventional_elective": "None",
    "trans_disciplinary_elective": "Technology & Management",
    "total_credits": 160
  },
  "semesterCategories": [],
  "curriculum": { "...": "GeneratedCurriculum" }
}
```

Server save validations:

- `programId` required
- if `categoryCredits` provided:
  - MC Design % must be `0`
  - Design % total must be `100`

Response:

```json
{
  "success": true,
  "warnings": []
}
```

### 11.5 Legacy structure save endpoint

`POST /api/curriculum/structure?programId=<uuid>` also upserts structure tables.  
Current UI save button uses `/api/curriculum/save`.

## 12) Persistence Model Used by This Module

Tables referenced by API code:

- `curriculum_category_credits`
  - keyed by `program_id + category_code`
  - stores design %, computed course/hour/credit summary values
- `curriculum_electives_settings`
  - keyed by `program_id`
  - stores elective configuration + total credits
- `curriculum_semester_categories`
  - keyed by `program_id + semester`
  - stores semester credits and category course counts
- `curriculum_generated_courses` (optional, graceful fallback if missing)
  - generated course rows per program+semester with hour/credit attributes

When saving generated curriculum:

1. existing generated rows for `program_id` are deleted
2. newly generated rows are inserted
3. if table missing (`42P01`), save succeeds with warning

## 13) Warnings and Error Patterns

Common generation errors:

- `totalCredits must be a positive whole number.`
- `Category percentage total must be exactly 100.`
- generated total credits mismatch requested total

Typical warnings:

- no percentages supplied, defaults applied
- MC input ignored and forced to 0
- invalid semester category placements moved to valid levels
- semester load far from ideal average
- final semester has no PR allocation
- AI title generation unavailable; fallback used

## 14) Known Behavior Notes and Constraints

1. Displayed min/max percentage ranges are guidance in UI; validation engine now enforces additional hard/soft checks server-side.
2. Elective settings are persisted but are still not directly used in credit/hour allocation math.
3. Program name is resolved from `programId` in backend; legacy URL fallback dependency has been removed.
4. Semester count is driven by program duration loaded from `/api/institution/me`; defaults to 8 semesters if unavailable.
5. MC category is hard-forced to zero in generation flow.

## 15) End-to-End User Flow

1. Select program from workspace sidebar.
2. Open `Generate Curriculum Structure` (process-12).
3. Fill category Design % and semester table (or use sample/AI fill).
4. Generate curriculum (`Generate Curriculum` or `Create All Semesters`).
5. Review warnings/errors and generated tables.
6. Optionally regenerate from chosen semester.
7. Click `Save Curriculum` to persist structure and generated rows for selected program.

## 16) Source File Index

- `lib/institution/process.ts`
- `components/institution/workspace/ProcessStepPanel.tsx`
- `lib/curriculum/engine.ts`
- `lib/curriculum/ai.ts`
- `app/api/ai/generate-curriculum/route.ts`
- `app/api/ai/regenerate-semester/route.ts`
- `app/api/curriculum/structure/route.ts`
- `app/api/curriculum/save/route.ts`
- `app/api/institution/me/route.ts`
- `components/institution/dashboard/ProgramDashboardHome.tsx`
- `components/institution/workspace/InstitutionWorkspace.tsx`
