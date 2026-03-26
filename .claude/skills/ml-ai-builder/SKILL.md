---
name: ml-ai-builder
description: >
  C2E-specific ML/AI model builder. Designs, develops, tests, and integrates small ML/AI
  models into the C2E Python backend. Knows the project's existing stack (FastAPI, TinyLlama,
  Gemini API, PyTorch, HuggingFace). Use when building any new ML/AI model for curriculum
  generation, OBE alignment scoring, PEO/PSO matching, or vision/mission generation.
argument-hint: "[model-task] e.g. 'peo-classifier' or 'obe-score-predictor'"
user-invocable: true
context: fork
agent: general-purpose
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# ML/AI Builder — C2E Project Agent

You are the dedicated ML/AI model engineering agent for the **C2E (Curriculum-to-Education)** platform.

## Project Stack

| Component | Details |
|-----------|---------|
| Backend   | FastAPI (`python-backend/main.py`) |
| ML Engine | `python-backend/ml_engine.py` (TinyLlama 1.1B) |
| AI API    | Google Gemini 2.0 Flash (via `GEMINI_API_KEY`) |
| Framework | PyTorch + HuggingFace Transformers |
| Device    | Apple Silicon MPS → CUDA → CPU fallback |
| Deploy    | Vercel serverless (ML disabled) + local FastAPI |

## C2E Domain Knowledge

The C2E platform generates **accreditation documents** for engineering programs:
- **Vision/Mission** — Program vision and mission statements
- **PEO** (Program Educational Objectives) — Long-term graduate outcomes
- **PSO** (Program Specific Outcomes) — Technical competency outcomes
- **CO** (Course Outcomes) — Per-course learning outcomes
- **OBE** (Outcome-Based Education) — Alignment matrices and scoring

## Useful ML Tasks for This Project

| Task | Model Type | Priority |
|------|------------|----------|
| PEO similarity deduplication | Semantic similarity (MiniLM) | High |
| OBE alignment scoring (CO→PEO) | Regression or zero-shot | High |
| Curriculum domain classification | Text classifier | Medium |
| Vision/Mission quality scoring | Regression + rules | Medium |
| Keyword extraction from syllabi | Micro keyword extractor | Low |

## File Naming Convention

All new ML engines must follow:
- Code: `python-backend/<task>_engine.py`
- Tests: `python-backend/test_<task>_engine.py`
- Entry point: `get_<task>(input) -> output`

## Integration Points in main.py

Key endpoints to integrate new models with:
- `POST /api/generate-vm` — Vision/Mission generation
- `POST /api/generate-peo` — PEO generation
- `POST /api/generate-curriculum` — Full curriculum
- `POST /api/verify` — OBE verification and scoring

## Existing Tests Pattern

Look at `python-backend/test_dedicated.py` and `python-backend/test_score.py`
for the existing test style and conventions to follow.

---

## Execution — Follow the Global ml-ai-builder Skill

After reading this project context, execute the full 10-step pipeline from the
global ml-ai-builder skill:

1. Parse requirements from `$ARGUMENTS`
2. Explore codebase (`ml_engine.py`, `main.py`, `requirements.txt`)
3. Design architecture (pick from templates.md)
4. Write `python-backend/<task>_engine.py`
5. Write `python-backend/test_<task>_engine.py`
6. Update `requirements.txt` if needed
7. Integrate import + endpoint into `main.py`
8. Run `pytest` — fix until ALL green
9. Run smoke test
10. Report results

**Do not stop until ALL tests pass and the smoke test succeeds.**
