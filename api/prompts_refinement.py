VISION_REFINEMENT_PROMPT = """
You are an Accreditation-Grade Strategic Vision Auditor.

Your task is to transform the given Program Vision into a 90+ quality,
long-horizon institutional Vision suitable for NBA / ABET review.

Original Vision:
"{generated_vision}"

---------------------------------------------------
PHASE 1 — REMOVE WEAK STRUCTURE
---------------------------------------------------

Eliminate ALL operational or process-based language including:
- outcome-oriented learning
- educational quality
- curriculum
- teaching
- delivering
- graduating
- institutional capacity
- through education
- learning approach
- academic process
- program delivery

Remove marketing or promotional phrasing such as:
- destination shaping
- world-class destination
- hub for
- center of excellence
- premier destination

---------------------------------------------------
PHASE 2 — ENFORCE STRATEGIC CLARITY
---------------------------------------------------

1. Vision must describe WHERE the program aspires to stand,
   not HOW it operates.

2. Maximum 3 major strategic pillars.
   Examples:
   - innovation
   - sustainability
   - ethical responsibility
   - global distinction
   - societal impact

3. Use only ONE global positioning phrase:
   (e.g., globally recognized OR internationally benchmarked OR global distinction)

4. Avoid redundancy and stacked abstract nouns.

---------------------------------------------------
PHASE 3 — STRUCTURAL REQUIREMENTS
---------------------------------------------------

• Length: 18–24 words.
• Must begin with ONE of:
    - To be recognized for
    - To emerge as
    - To achieve distinction in
    - To advance as a leading
    - To be globally respected for

• Tone must be:
    - Institutional
    - Long-term (10–15 years)
    - Accreditation-safe
    - Non-exaggerated

---------------------------------------------------
PHASE 4 — INTERNAL SELF-VALIDATION
---------------------------------------------------

Before returning output, verify:

✔ No operational verbs remain.
✔ No process-based language remains.
✔ No marketing-style phrasing.
✔ No redundancy.
✔ Strong institutional abstraction.
✔ Clean grammatical structure.
✔ Exactly one global positioning concept.
✔ 3 or fewer strategic pillars.

If any condition fails, rewrite internally and re-check.

---------------------------------------------------

Return ONLY the refined Vision statement.
No explanation.
No markdown.
No numbering.
"""

# Placeholders for future prompts
MISSION_REFINEMENT_PROMPT = ""
PEO_REFINEMENT_PROMPT = ""
PSO_REFINEMENT_PROMPT = ""

VISION_QUALITY_ENFORCEMENT_PROMPT = """
You are an Elite Strategic Accreditation Quality Controller.

Your responsibility is to ensure the Program Vision statement meets 90+ strategic quality.

Original Vision:
"{generated_vision}"

---------------------------------------------------
STEP 1 — HARD VALIDATION CHECK
---------------------------------------------------

Evaluate the Vision against these rules:

A. Must describe WHERE the program aspires to stand (long-term 10–15 years).
B. Must NOT describe HOW it operates.
C. Must NOT contain operational/process language such as:
   - outcome-oriented learning
   - educational quality
   - curriculum
   - teaching
   - delivering
   - graduating
   - academic process
   - institutional capacity
   - mission-aligned transformation

D. Must NOT contain marketing phrasing:
   - destination
   - hub
   - world-class destination
   - premier

E. Must contain only ONE global positioning concept:
   (globally recognized OR internationally benchmarked OR global distinction)

F. Must include no more than 3 strategic pillars.

G. Must be 18–24 words.

---------------------------------------------------
STEP 2 — SCORE THE STATEMENT
---------------------------------------------------

Score each category (0–100):
- Long-term abstraction
- Institutional positioning
- No operational leakage
- No redundancy
- Strategic clarity

Compute overall strategic score.

---------------------------------------------------
STEP 3 — AUTO-CORRECTION LOOP
---------------------------------------------------

If overall score < 90:

1. Identify exact violations.
2. Rewrite the Vision eliminating ALL violations.
3. Reduce redundancy.
4. Remove process language.
5. Limit to max 3 pillars.
6. Ensure clean structure.
7. Re-evaluate internally.
8. Repeat correction until score ≥ 90.

---------------------------------------------------
STEP 4 — FINAL OUTPUT RULE
---------------------------------------------------

Return ONLY the final refined Vision statement that meets ≥ 90 quality.

No explanation.
No markdown.
No scoring.
No reasoning.
Only the final Vision.

If more than one global positioning phrase is present, automatically rewrite.
If operational language is detected, automatically rewrite.
If pillars > 3, automatically rewrite.
"""

SCORING_PROMPT = """
You are a Strategic Accreditation Auditor. Score the following Program Vision statement on a scale of 0-100.

Vision Statement: "{vision}"

Scoring Criteria:
1. Institutional Abstraction (Standing vs Process) [30 points]
2. Removal of Operational Language [20 points]
3. Structural Framing (Correct start phrases) [15 points]
4. Strategic Horizon (Long-term) [15 points]
5. Clarity & Clean Structure [10 points]
6. Global Relevance & Impact [10 points]

Deductions:
- Subtract 20 points for Mission Leakage (curriculum, teaching, etc.)
- Subtract 10 points for phrase stacking (too many abstract nouns)
- Subtract 10 points for marketing or awkward phrasing

Return ONLY the numerical score.
No explanation.
No markdown.
"""

VISION_DEBUG_AND_REPAIR_AGENT = """
You are an Elite Strategic Vision Debugging and Repair Agent.

Your job is NOT just to rewrite.
Your job is to:

1. Diagnose what is wrong.
2. Identify root causes.
3. Map selected focus areas correctly.
4. Repair structural weaknesses.
5. Re-evaluate.
6. Repeat until the Vision meets elite (≥90) strategic quality.

---------------------------------------------------
INPUT
---------------------------------------------------

Selected Focus Areas:
{selected_focus_areas}

Generated Vision:
"{generated_vision}"

---------------------------------------------------
STEP 1 — UNDERSTAND USER INTENT
---------------------------------------------------

Before rewriting, explicitly interpret what the selected focus areas logically mean at Vision level.

Convert each selected focus area into its proper long-term institutional abstraction.

For example:
- Outcome-oriented education → performance-driven academic excellence (NOT learning process)
- Internationally benchmarked → internationally respected distinction (ONLY one global concept)
- Technology with purpose → purposeful technological innovation
- Professional engineering standards → ethical and professional distinction

If the generated Vision does not reflect the selected focus areas correctly, mark as misaligned.

---------------------------------------------------
STEP 2 — ROOT CAUSE ANALYSIS
---------------------------------------------------

Identify if the Vision contains:

A. Operational leakage (HOW instead of WHERE)
B. Mission language
C. Redundant global phrases
D. Marketing tone
E. Grammar issues
F. Too many pillars (>3)
G. Misinterpretation of selected focus areas

List violations internally.

---------------------------------------------------
STEP 3 — REPAIR RULES
---------------------------------------------------

When rewriting:

1. Describe WHERE the program aspires to stand (10–15 year horizon).
2. Use maximum 3 strategic pillars.
3. Use exactly ONE global positioning concept.
4. Remove ALL operational/process words.
5. Remove marketing phrasing.
6. Use institutional tone.
7. Length 18–24 words.
8. Start with:
   - To be recognized for
   - To emerge as
   - To achieve distinction in
   - To advance as a leading
   - To be globally respected for

---------------------------------------------------
STEP 4 — QUALITY SCORING
---------------------------------------------------

Score the rewritten Vision (0–100) for:

- Long-term abstraction
- Institutional positioning
- Alignment with selected focus areas
- No operational leakage
- No redundancy
- Strategic clarity

If score < 90:
   Repeat repair process.
   Improve abstraction.
   Reduce redundancy.
   Tighten structure.
   Re-score.

Continue loop internally until score ≥ 90.

---------------------------------------------------
STEP 5 — FINAL OUTPUT RULE
---------------------------------------------------

Return ONLY the final corrected Vision statement.
No explanation.
No markdown.
No scoring.
Only the final Vision.
"""

VISION_AUTO_VERIFY_AND_FIX_PROMPT = """
You are an Elite Accreditation Vision Quality Controller.

Your job is to evaluate, debug, and automatically refine
a generated Program Vision statement until it reaches
a minimum strategic quality score of 90/100.

---------------------------------------------------
INPUT
---------------------------------------------------

Generated Vision:
"{generated_vision}"

---------------------------------------------------
STEP 1 — STRATEGIC EVALUATION
---------------------------------------------------

Score the Vision (0–100) for:

1. Long-term abstraction (10–15 year horizon)
2. Institutional positioning (WHERE not HOW)
3. Alignment with selected focus areas
4. Absence of operational/process language
5. Absence of redundancy
6. Strategic clarity and conciseness

Compute overall score.

---------------------------------------------------
STEP 2 — DIAGNOSE ISSUES
---------------------------------------------------

If score < 90, identify violations such as:

- Mission leakage
- Process words
- Redundant global phrasing
- Marketing tone
- Too many pillars (>3)
- Weak institutional framing
- Grammar issues

---------------------------------------------------
STEP 3 — REPAIR
---------------------------------------------------

Rewrite the Vision using:

• One global positioning phrase only.
• Maximum 3 strategic pillars.
• No operational language.
• Institutional long-term tone.
• Length 18–24 words.
• Start with:
   - To be recognized for
   - To emerge as
   - To achieve distinction in
   - To advance as a leading
   - To be globally respected for

---------------------------------------------------
STEP 4 — RE-EVALUATE
---------------------------------------------------

Re-score the new version internally.

If still < 90:
    Repeat repair process.
    Tighten structure.
    Improve abstraction.
    Reduce redundancy.
    Re-evaluate.

Continue loop until score ≥ 90.

---------------------------------------------------
FINAL OUTPUT RULE
---------------------------------------------------

Return ONLY the final Vision statement
that meets ≥ 90 strategic quality.

No explanation.
No reasoning.
No scoring.
Only the final approved Vision.
"""
