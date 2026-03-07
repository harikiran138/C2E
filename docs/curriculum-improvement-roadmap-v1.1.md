# Curriculum Generation Engine - Improvement Roadmap (v1.1)

Date: 2026-03-07
Scope: Process-12 and connected OBE pipeline

## Implemented in this update

- Program context is now resolved from `programId` server-side before curriculum generation.
- Hardcoded fallback program name has been removed from the curriculum UI flow.
- Curriculum generation now validates upstream readiness:
  - Program Vision present
  - Program Mission present
  - Minimum PEO/PO/PSO counts (configurable, strict by default)
- Curriculum validation engine is now enforced in generation/regeneration/save APIs.
- Added/activated checks for:
  - credit integrity
  - NEP structure (foundation + project/internship constraints)
  - elective progression (PE/OE only after semester 4)
  - capstone presence in final semester
  - AICTE range soft warnings
  - skill and multidisciplinary coverage warnings
  - internship milestone warnings (around semesters 4 and 6)
- Course Outcomes generation now uses program context from `programId` and includes PO/PSO references where available.
- Added deterministic CO fallback generation for reliability when AI returns invalid/empty output.
- AI Curriculum Advisor is now connected to Curriculum Structure:
  - advisor recommendations can be applied
  - applied distribution is transferred to Process-12 inputs
- Version-aware save/read behavior added:
  - `curriculum/save` accepts `versionId`
  - course fetch/report APIs support version filtering

## Remaining logical expansions

- Add first-class curriculum-to-version linking UI (create/select/activate version in Process-12).
- Persist and manage OBE Core course mappings from Process-13 (currently UI-local).
- Add explicit internship type metadata (`mini`, `industry`, `capstone`) per PR course for stronger milestone analytics.
- Add downloadable compliance dashboards (NEP/AICTE/UGC/NBA status cards with pass/fail by rule).
- Add a dedicated CO manual-save endpoint to preserve user-edited CO/PO mappings without re-generation.
- Add automated regression tests for curriculum API contracts and validator rules.

