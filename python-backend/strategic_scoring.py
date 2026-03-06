import re
from typing import Any, Dict, List


class StrategicClassifier:
    """
    Deterministic Vision governance classifier.
    Enforces hard filters and weighted strategic scoring.
    """

    WEIGHTS = {
        "base_quality": 0.60,
        "focus_area_alignment": 0.25,
        "vision_structure": 0.10,
        "grammar_clarity": 0.05,
    }

    FOCUS_AREA_MAPPING = {
        # ── Core OBE / Professional priorities ───────────────────────────────────
        "Future-ready engineers": [
            "future engineers", "engineers", "graduates", "professional engineers",
            "engineering professionals", "future-ready", "workforce", "industry-ready"
        ],
        "Outcome-oriented education": [
            "education", "learning", "training", "academic excellence",
            "engineering education", "outcome-based", "competencies", "outcomes"
        ],
        "Ethics and integrity": [
            "ethics", "integrity", "responsibility", "professional values",
            "ethical", "professional ethics", "responsible"
        ],
        "Sustainable development": [
            "sustainable", "sustainability", "green technology",
            "sustainable development", "environmental", "eco-friendly", "conservation"
        ],
        "Innovation-driven education": [
            "innovation", "research", "advanced technology", "innovative",
            "pioneering", "cutting-edge", "advancement", "technological"
        ],
        "Engineering for societal impact": [
            "society", "societal impact", "community", "human welfare",
            "transform society", "societal", "public good", "social impact"
        ],
        # ── Global / competitive positioning ─────────────────────────────────────
        "Global Engineering Excellence": [
            "global", "globally recognized", "globally respected", "excellence",
            "world-class", "international", "internationally", "globally competitive",
            "benchmark", "recognition"
        ],
        "Internationally benchmarked": [
            "international", "internationally", "benchmark", "benchmarked",
            "global standards", "standards", "globally", "recognized", "accredited"
        ],
        "Globally competitive graduates": [
            "globally competitive", "competitive", "graduates", "global",
            "internationally competitive", "industry-competitive", "world-ready"
        ],
        # ── Innovation / technology ───────────────────────────────────────────────
        "Technology with purpose": [
            "technology", "technological", "purpose", "meaningful", "purposeful",
            "applied technology", "technology-driven", "purposeful innovation"
        ],
        "Responsible innovation": [
            "responsible", "innovation", "innovative", "ethical innovation",
            "responsible technology", "sustainable innovation", "purposeful innovation"
        ],
        # ── Standards / human focus ───────────────────────────────────────────────
        "Professional engineering standards": [
            "professional", "standards", "engineering standards", "professional standards",
            "rigorous", "quality standards", "best practices", "accreditation"
        ],
        "Human-centric engineering": [
            "human", "human-centric", "people", "welfare", "quality of life",
            "communities", "human welfare", "humanistic", "inclusive", "life"
        ],
    }

    STRATEGIC_THEMES = {
        "global leadership": ["global leadership", "globally recognized", "globally respected", "leading advancement", "distinction", "excellence"],
        "research or innovation": ["research", "innovation", "innovative", "pioneering", "advanced technology", "advancement"],
        "societal impact": ["society", "societal impact", "community", "human welfare", "transform society", "impact", "social responsibility"],
        "sustainability": ["sustainable", "sustainability", "green technology", "sustainable development"],
        "future technologies": ["future", "emerging technologies", "next-generation", "future-ready", "long horizon"]
    }

    OPERATIONAL_TERMS = [
        "education",
        "teaching",
        "learning",
        "curriculum",
        "pedagogy",
        "classroom",
        "faculty",
        "students",
        "student",
        "provide",
        "deliver",
        "develop",
        "cultivate",
        "train",
        "prepare",
        "implement",
        "foster",
        "outcome based",
        "outcome-oriented",
        "outcome oriented",
        "through education",
        "through teaching",
    ]

    MARKETING_TERMS = ["destination", "hub", "world-class", "best-in-class", "unmatched"]

    POSITIONING_STARTERS = [
        "to be globally recognized for",
        "to emerge as",
        "to achieve distinction in",
        "to advance as a leading",
        "to be globally respected for",
    ]

    MISSION_REQUIREMENT_VERBS = ["deliver", "foster", "promote", "cultivate", "advance", "develop"]
    MISSION_ACADEMIC_TERMS = ["curriculum", "research", "education", "training", "program", "laboratory"]
    MISSION_IMPACT_TERMS = ["industry", "society", "innovation", "technological", "professionals", "impact"]
    MISSION_BANNED_TERMS = ["world-class", "hub", "best", "leader", "guarantee", "100%", "ensure all", "premier"]

    POSITIONING_KEYWORDS = ["recognition", "recognized", "distinction", "leadership", "benchmarked"]
    LONG_TERM_SIGNALS = ["long-term", "long horizon", "future", "sustained", "enduring", "institutional"]
    REDUNDANCY_SUFFIXES = [
        "ization",
        "ation",
        "ition",
        "tion",
        "sion",
        "ment",
        "ness",
        "ity",
        "ship",
        "ing",
        "ed",
        "es",
        "s",
    ]
    REDUNDANCY_STOP_WORDS = {
        "the", "and", "for", "with", "that", "this", "from", "into", "through", "toward", "towards", "to", "of", "in", "on", "a", "an", "by", "be", "or", "is", "are", "as", "at", 
        "program", "engineering", "institutional", "strategic", "global", "globally", "international", "internationally", "future", "long", "term", "sustained",
    }
    
    # ── PSO scoring constants ─────────────────────────────────────────────────
    PSO_PREFIX_LOWER = "graduates will be able to"
    PSO_TECHNICAL_VERBS = [
        "design", "develop", "implement", "analyze", "evaluate", "apply",
        "integrate", "construct", "formulate", "optimize", "architect", "engineer",
        "create", "solve", "execute", "demonstrate", "produce", "model",
        "synthesize", "deploy", "configure", "simulate", "validate", "assess",
    ]
    PSO_GENERIC_PHRASES = [
        "understand basics", "understand the basics", "learn fundamentals",
        "learn the fundamentals", "know the", "have knowledge of",
        "be familiar with", "gain knowledge", "comprehend", "grasp the concept",
        "gain an understanding",
    ]
    PSO_BANNED_TERMS = [
        "world-class", "best", "premier", "guarantee", "100%",
        "all graduates", "every graduate", "always",
    ]

    PEO_TIME_HORIZON = "Within 3 to 5 years of graduation"
    PEO_TIME_HORIZON_LOWER = PEO_TIME_HORIZON.lower()
    PEO_ABSOLUTE_TERMS = ["all graduates", "every graduate", "always", "guarantee", "100%"]
    PEO_OUTCOME_STYLE_TERMS = ["at graduation", "on graduation", "student will be able to", "students will be able to", "immediate capability", "develop applications", "build applications"]
    PEO_MEASURABLE_CUES = ["advance", "progress", "contribute", "engage", "lead", "professional growth", "career", "value"]
    PEO_ALUMNI_MEASURABLE_CUES = ["leadership role", "career advancement", "professional licensure", "promotion", "advanced degree", "entrepreneurial", "management", "senior", "recognized"]
    PEO_RELEVANCE_CUES = ["engineering", "industry", "professional", "ethical", "sustainable", "societal", "community"]
    PEO_MISSION_ALIGNMENT_CUES = ["mission", "institutional", "program priorities", "department priorities", "constituency", "community needs"]

    SYNONYM_STACK_GROUPS = [
        {
            "label": "distinction-concept stacking",
            "terms": ["distinction", "excellence", "premier", "leading", "leadership"],
            "threshold": 3,
        },
        {
            "label": "innovation-concept stacking",
            "terms": ["innovation", "innovative", "transformative", "foresight", "advancement"],
            "threshold": 3,
        },
    ]

    GLOBAL_CONCEPT_PATTERNS = [
        ("globally recognized", re.compile(r"\bglobally recognized\b", re.IGNORECASE)),
        ("globally respected", re.compile(r"\bglobally respected\b", re.IGNORECASE)),
        ("internationally benchmarked", re.compile(r"\binternationally benchmarked\b", re.IGNORECASE)),
        ("global leadership", re.compile(r"\bglobal leadership\b", re.IGNORECASE)),
        ("global distinction", re.compile(r"\b(global distinction|achieve distinction|distinction in)\b", re.IGNORECASE)),
        ("leading advancement", re.compile(r"\badvance as a leading\b", re.IGNORECASE)),
        ("global excellence", re.compile(r"\bglobal excellence\b", re.IGNORECASE)),
    ]

    def _contains_bounded_term(self, text: str, term: str) -> bool:
        escaped = re.escape(term.lower())
        return bool(re.search(rf"\b{escaped}\b", text, re.IGNORECASE))

    def _matched_terms(self, text: str, terms: List[str]) -> List[str]:
        return [term for term in terms if self._contains_bounded_term(text, term)]

    def _extract_global_concepts(self, text: str) -> List[str]:
        found = []
        for concept, pattern in self.GLOBAL_CONCEPT_PATTERNS:
            if pattern.search(text):
                found.append(concept)
        return sorted(set(found))

    def _count_global_tokens(self, text: str) -> int:
        return len(re.findall(r"\b(global|globally|international|internationally|world)\b", text, re.IGNORECASE))

    def _estimate_pillar_count(self, text: str) -> int:
        comma_count = text.count(",")
        and_count = len(re.findall(r"\band\b", text, re.IGNORECASE))
        return max(1, comma_count + and_count)

    def _clamp(self, value: float) -> int:
        return max(0, min(100, int(round(value))))

    def normalize_whitespace(self, text: str) -> str:
        return " ".join((text or "").split())

    def _normalize_root(self, token: str) -> str:
        root = token.lower()
        for suffix in self.REDUNDANCY_SUFFIXES:
            if root.endswith(suffix) and len(root) > len(suffix) + 3:
                root = root[: -len(suffix)]
                break
        return root

    def _tokenize_and_clean(self, text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [t for t in tokens if t not in self.REDUNDANCY_STOP_WORDS]

    def _extract_core_tokens(self, text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [token for token in tokens if len(token) >= 5 and token not in self.REDUNDANCY_STOP_WORDS]

    def _repeated_roots(self, text: str) -> List[str]:
        counts: Dict[str, int] = {}
        for token in self._extract_core_tokens(text):
            root = self._normalize_root(token)
            if not root or root in self.REDUNDANCY_STOP_WORDS:
                continue
            counts[root] = counts.get(root, 0) + 1
        return sorted([root for root, count in counts.items() if count > 1])

    def _duplicate_bigrams(self, text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        counts: Dict[str, int] = {}
        for i in range(len(tokens) - 1):
            first = tokens[i]
            second = tokens[i + 1]
            if (
                len(first) < 5
                or len(second) < 5
                or first in self.REDUNDANCY_STOP_WORDS
                or second in self.REDUNDANCY_STOP_WORDS
            ):
                continue
            bigram = f"{first} {second}"
            counts[bigram] = counts.get(bigram, 0) + 1
        return sorted([phrase for phrase, count in counts.items() if count > 1])

    def _synonym_stacking(self, text: str) -> List[str]:
        lower = text.lower()
        stacked = []
        for group in self.SYNONYM_STACK_GROUPS:
            matched = [
                term
                for term in group["terms"]
                if re.search(rf"\b{re.escape(term)}\b", lower, re.IGNORECASE)
            ]
            if len(set(matched)) >= int(group["threshold"]):
                stacked.append(str(group["label"]))
        return stacked

    def _check_focus_alignment(self, vision: str, selected_focus_areas: List[str]) -> Dict[str, Any]:
        """
        Evaluates semantic alignment between selected focus areas and the vision statement.
        """
        if not selected_focus_areas:
            return {"score": 25, "matches": [], "missing": []}

        lower_vision = vision.lower()
        matches = []
        missing = []
        
        for area in selected_focus_areas:
            keywords = self.FOCUS_AREA_MAPPING.get(area, [])
            if any(self._contains_bounded_term(lower_vision, kw) for kw in keywords):
                matches.append(area)
            else:
                missing.append(area)
        
        alignment_score = (len(matches) / len(selected_focus_areas)) * 25 if selected_focus_areas else 25
        return {
            "score": round(alignment_score, 2),
            "matches": matches,
            "missing": missing
        }

    def _check_vision_structure(self, vision: str) -> Dict[str, Any]:
        """
        Validates vision length and theme coverage according to accreditation standards.
        """
        words = re.findall(r"\b[\w-]+\b", vision)
        word_count = len(words)
        length_ok = 15 <= word_count <= 25
        
        lower_vision = vision.lower()
        matched_themes = []
        for theme, keywords in self.STRATEGIC_THEMES.items():
            if any(self._contains_bounded_term(lower_vision, kw) for kw in keywords):
                matched_themes.append(theme)
        
        # Structure score: up to 10 points
        # 5 points for length, 5 points for theme coverage (min 2 themes)
        length_score = 5 if length_ok else 0
        theme_score = 5 if len(matched_themes) >= 2 else (2.5 if len(matched_themes) == 1 else 0)
        
        return {
            "score": length_score + theme_score,
            "length_ok": length_ok,
            "word_count": word_count,
            "matched_themes": matched_themes
        }

    def _check_grammar_clarity(self, vision: str) -> int:
        """
        Simple grammar and clarity check (up to 5 points).
        """
        score = 5
        if not vision:
            return 0
        # Deduction for multiple punctuation errors or start/end issues
        if not vision[0].isupper(): score -= 1
        if not vision.endswith('.'): score -= 1
        if "  " in vision: score -= 1
        # Overly long words might reduce clarity in academic slogans
        words = vision.split()
        long_words = [w for w in words if len(w) > 15]
        if len(long_words) > 1: score -= 1
        
        return max(0, score)

    def calculate_score(self, vision: str, focus_areas: List[str] = None, institute_vision: str = None) -> Dict[str, Any]:
        normalized = self.normalize_whitespace(vision)
        lower_vision = normalized.lower()
        
        # 0. Institute Alignment Validation (Problem 10)
        # We check if themes from the Institute Vision are present.
        # This doesn't subtract points yet, but we'll include it in the assessment metadata.
        inst_alignment = self._check_institute_alignment(normalized, institute_vision) if institute_vision else {"matches": [], "score": 100}

        # 1. Base Quality (up to 60)
        # Inherits logic from legacy scoring but capped at 60
        operational_hits = self._matched_terms(lower_vision, self.OPERATIONAL_TERMS)
        marketing_hits = self._matched_terms(lower_vision, self.MARKETING_TERMS)
        global_concepts = self._extract_global_concepts(lower_vision)
        repeated_roots = self._repeated_roots(normalized)
        synonym_stacking = self._synonym_stacking(normalized)
        
        base_quality = 60
        if operational_hits: base_quality -= min(30, len(operational_hits) * 10)
        if marketing_hits: base_quality -= 20
        if len(global_concepts) != 1: base_quality -= 15
        if repeated_roots: base_quality -= 10
        if synonym_stacking: base_quality -= 10
        
        # 2. Focus Area Alignment (up to 25)
        alignment_result = self._check_focus_alignment(normalized, focus_areas or [])
        
        # 3. Vision Structure Quality (up to 10)
        structure_result = self._check_vision_structure(normalized)
        
        # 4. Grammar & Clarity (up to 5)
        grammar_score = self._check_grammar_clarity(normalized)
        
        final_score = self._clamp(base_quality + alignment_result["score"] + structure_result["score"] + grammar_score)
        
        # Accreditation Logic: High quality visions should be 90-100
        # If length is good and strong themes are present (innovation + societal impact/sustainability)
        # we ensure it doesn't drop too low unless focus areas are missing.
        if (structure_result["length_ok"] and 
            "research or innovation" in structure_result["matched_themes"] and 
            ("societal impact" in structure_result["matched_themes"] or "sustainability" in structure_result["matched_themes"])):
            if not alignment_result["missing"]:
                final_score = max(final_score, 90)

        # Hard failure cap
        hard_violations = []
        if operational_hits:
            hard_violations.append(f"Operational leakage: {', '.join(sorted(set(operational_hits))[:6])}")
        if len(global_concepts) != 1:
            hard_violations.append(f"Global positioning concept count must be exactly 1")
        
        if institute_vision and not inst_alignment["matches"]:
            hard_violations.append("Weak alignment with Institute Vision themes")
        
        for area in alignment_result["missing"]:
            hard_violations.append(f"Score reduced due to missing alignment with selected focus area: {area}")

        if final_score < 80:
            if not structure_result["length_ok"]:
                hard_violations.append(f"Vision length ({structure_result['word_count']} words) is outside recommended 15-25 range")
            if len(structure_result["matched_themes"]) < 2:
                hard_violations.append("Structure weak: Must include at least 2 strategic themes (Global Leadership, Innovation, etc.)")

        if hard_violations and final_score >= 85:
             # If we have alignment issues or major structure issues, cap it
             if alignment_result["missing"] or not structure_result["length_ok"]:
                 final_score = min(final_score, 84)

        return {
            "score": final_score,
            "violations": hard_violations,
            "is_elite": final_score >= 90,
            "hard_fail": bool(operational_hits or len(global_concepts) != 1),
            "alignment_matches": alignment_result["matches"],
            "focus_areas_selected": focus_areas or [],
            "breakdown": {
                "base_quality": self._clamp(base_quality * 100 / 60) if base_quality > 0 else 0,
                "focus_area_alignment": self._clamp(alignment_result["score"] * 100 / 25) if alignment_result["score"] > 0 else 0,
                "vision_structure": self._clamp(structure_result["score"] * 100 / 10) if structure_result["score"] > 0 else 0,
                "grammar_clarity": self._clamp(grammar_score * 100 / 5) if grammar_score > 0 else 0,
                "institute_alignment": inst_alignment["score"]
            },
            "institute_alignment_matches": inst_alignment["matches"]
        }

    def score_mission(self, mission: str) -> Dict[str, Any]:
        normalized = " ".join((mission or "").split())
        lower_mission = normalized.lower()
        words = re.findall(r"\b[\w-]+\b", normalized)
        word_count = len(words)

        violations = []
        hard_fail = False
        score = 100

        # Word count constraints
        if word_count < 20 or word_count > 35:
            violations.append(f"Mission length must be 20-35 words (found {word_count})")
            score -= 30
            hard_fail = True

        # Banned phrases
        banned_hits = self._matched_terms(lower_mission, self.MISSION_BANNED_TERMS)
        if banned_hits:
            violations.append(f"Marketing/absolute language detected: {', '.join(banned_hits)}")
            score -= 40
            hard_fail = True

        # Action verbs
        if not any(v in lower_mission for v in self.MISSION_REQUIREMENT_VERBS):
            violations.append("Missing required operational verbs (e.g., deliver, foster, promote)")
            score -= 25
            hard_fail = True

        # Academic activities
        if not any(a in lower_mission for a in self.MISSION_ACADEMIC_TERMS):
            violations.append("Missing academic context keywords (e.g., curriculum, research, training)")
            score -= 15

        # Societal impact
        if not any(i in lower_mission for i in self.MISSION_IMPACT_TERMS):
            violations.append("Missing socio-industrial impact keywords (e.g., industry, society, innovation)")
            score -= 15

        final_score = self._clamp(score)
        if hard_fail:
            final_score = min(final_score, 79)

        if final_score < 90 and "Strategic score below threshold" not in "\n".join(violations):
             violations.append(f"Strategic score below threshold: {final_score}/100")

        return {
            "score": final_score,
            "violations": violations,
            "is_elite": final_score >= 90,
            "hard_fail": hard_fail
        }

    def calculate_alignment(self, vision: str, mission: str) -> float:
        vision_words = set(self._extract_core_tokens(vision))
        mission_words = set(self._extract_core_tokens(mission))
        
        if not vision_words:
            return 0.0
            
        overlap = vision_words.intersection(mission_words)
        return len(overlap) / len(vision_words)

    def enforce_peo_quality(self, raw_statement: str, priority: str, program_name: str) -> str:
        source = re.sub(r'^(?i)(option|peo)\s*\d+\s*:\s*', '', raw_statement or "")
        source = re.sub(r'^\d+\.\s*', '', source).strip()
        source_lower = source.lower()

        preferred_verbs = [
            "analyze",
            "evaluate",
            "design",
            "create",
            "innovate",
            "lead",
            "progress",
            "advance",
            "contribute",
        ]
        action_verb = next((verb for verb in preferred_verbs if re.search(rf"\b{verb}\b", source_lower)), "progress")

        program_label = " ".join((program_name or "").split()[:2]).strip() or "the program"
        priority_label = " ".join((priority or "professional practice").split()[:2]).strip() or "professional practice"

        statement = (
            f"{self.PEO_TIME_HORIZON}, graduates will {action_verb} in professional careers "
            f"by applying {priority_label} in {program_label}, contribute to industry and community, "
            f"and attain leadership roles aligned with institutional mission priorities."
        )

        words = statement.split()
        if len(words) < 20:
            statement = statement.replace(
                "industry and community, and attain leadership roles",
                "industry and community needs, and attain leadership roles",
            )
            words = statement.split()

        if len(words) > 35:
            statement = statement.replace(f" in {program_label},", ",")
            words = statement.split()
        if len(words) > 35:
            statement = statement.replace(" professional careers ", " careers ")
            words = statement.split()
        if len(words) > 35:
            statement = " ".join(words[:35]).rstrip(",") + "."

        statement = re.sub(r"\s+", " ", statement).strip()
        statement = re.sub(r"[.?!]+$", "", statement) + "."
        return statement

    def calculate_peo_vision_alignment(self, vision: str, peo: str) -> float:
        vision_tokens = set(self._extract_core_tokens(vision))
        peo_tokens = set(self._extract_core_tokens(peo))
        
        if not vision_tokens:
            return 0.0
            
        overlap = vision_tokens.intersection(peo_tokens)
        return len(overlap) / len(vision_tokens)

    def peo_similarity(self, peo1: str, peo2: str) -> float:
        prefix_words = {"within", "3", "5", "years", "graduation", "graduates", "will"}
        s1 = set(w for w in self._tokenize_and_clean(peo1) if w not in prefix_words)
        s2 = set(w for w in self._tokenize_and_clean(peo2) if w not in prefix_words)
        if not s1 or not s2: return 0.0
        return len(s1 & s2) / max(len(s1), len(s2))

    def score_pso(self, statement: str) -> Dict[str, Any]:
        """
        Scores a Program Specific Outcome against OBE/accreditation standards.
        PSOs describe domain-specific technical capabilities at graduation.
        """
        normalized = " ".join((statement or "").split())
        lower = normalized.lower()
        words = re.findall(r"\b[\w-]+\b", normalized)
        word_count = len(words)

        violations: List[str] = []
        hard_fail = False
        score = 100

        # 1. Prefix check (25 pts) — hard fail
        if not lower.startswith(self.PSO_PREFIX_LOWER):
            violations.append('PSO must start with "Graduates will be able to..."')
            score -= 25
            hard_fail = True

        # 2. Word count check (20 pts): 15-25 words — hard fail
        if word_count < 10 or word_count > 35:
            violations.append(f"PSO word count must be 15-25 words (found {word_count})")
            score -= 20
            hard_fail = True

        # 3. Technical verb (30 pts)
        has_technical_verb = any(
            re.search(rf"\b{re.escape(v)}\b", lower) for v in self.PSO_TECHNICAL_VERBS
        )
        if not has_technical_verb:
            violations.append(
                "PSO must include a technical action verb (design, implement, analyze, evaluate, etc.)"
            )
            score -= 30

        # 4. Generic phrases (15 pts) — hard fail
        generic_hits = [p for p in self.PSO_GENERIC_PHRASES if p in lower]
        if generic_hits:
            violations.append(f"Avoid generic phrases: {', '.join(generic_hits)}")
            score -= 15
            hard_fail = True

        # 5. Banned terms (10 pts)
        banned_hits = [t for t in self.PSO_BANNED_TERMS if t in lower]
        if banned_hits:
            violations.append(f"Avoid absolute/marketing language: {', '.join(banned_hits)}")
            score -= 10

        final_score = max(0, min(100, score))
        if hard_fail:
            final_score = min(final_score, 65)

        if final_score < 85 and not any("below threshold" in v for v in violations):
            violations.append(f"PSO score below elite threshold: {final_score}/100")

        return {
            "score": final_score,
            "violations": violations,
            "is_elite": final_score >= 85,
            "hard_fail": hard_fail,
        }

    def pso_similarity(self, pso1: str, pso2: str) -> float:
        """PSO-specific Jaccard similarity excluding PSO prefix tokens."""
        prefix_words = {"graduates", "will", "be", "able", "to"}
        s1 = set(w for w in self._tokenize_and_clean(pso1) if w not in prefix_words)
        s2 = set(w for w in self._tokenize_and_clean(pso2) if w not in prefix_words)
        if not s1 or not s2:
            return 0.0
        return len(s1 & s2) / max(len(s1), len(s2))

    def enforce_po_quality(self, raw_po: str) -> str:
        # Basic cleanup
        po = " ".join(raw_po.split()).strip()
        po = re.sub(r'^\d+\.\s*', '', po)
        
        # Ensure it starts with an active verb (Bloom's Taxonomy style)
        if not any(po.lower().startswith(v) for v in ["apply", "design", "analyze", "evaluate", "create", "demonstrate", "identify", "solve"]):
            po = f"Demonstrate the ability to {po[0].lower() + po[1:] if po else ''}"
            
        if not po.endswith('.'):
            po += "."
            
        return po

    def score_smart_abet(self, statement: str) -> Dict[str, Any]:
        lower = statement.lower()
        words = statement.split()
        specific = 20 <= len(words) <= 35
        career_keywords = ["career", "professional", "leadership", "innovation", "sustainability", "research"]
        has_career_focus = any(term in lower for term in career_keywords)
        measurable = any(term in lower for term in self.PEO_MEASURABLE_CUES)
        attainable = not any(term in lower for term in self.PEO_ABSOLUTE_TERMS)
        relevant = any(term in lower for term in self.PEO_RELEVANCE_CUES)
        time_bound = lower.startswith(self.PEO_TIME_HORIZON_LOWER)
        abet_style = not any(term in lower for term in self.PEO_OUTCOME_STYLE_TERMS)
        mission_aligned = any(term in lower for term in self.PEO_MISSION_ALIGNMENT_CUES)
        alumni_measurable = any(term in lower for term in self.PEO_ALUMNI_MEASURABLE_CUES)

        criteria = [
            {"key": "specific", "label": "Specific", "passed": specific, "guidance": "Length should be 20-35 words."},
            {"key": "careerFocus", "label": "Career Focus", "passed": has_career_focus, "guidance": "Must mention career, professional, leadership, innovation, etc."},
            {"key": "measurable", "label": "Measurable", "passed": measurable, "guidance": "Use language that can be assessed indirectly."},
            {"key": "alumniMeasurable", "label": "Alumni Survey Ready", "passed": alumni_measurable, "guidance": "Include specific targets assessable via alumni surveys (e.g., leadership, licensure)."},
            {"key": "attainable", "label": "Attainable", "passed": attainable, "guidance": "Avoid absolute or unrealistic guarantees."},
            {"key": "relevant", "label": "Relevant", "passed": relevant, "guidance": "Reflect discipline and professional context."},
            {"key": "timeBound", "label": "Time-Bound", "passed": time_bound, "guidance": f'Use "{self.PEO_TIME_HORIZON}" framing.'},
            {"key": "abetStyle", "label": "ABET Style", "passed": abet_style, "guidance": "Avoid student-outcome phrasing at graduation."},
            {"key": "missionAligned", "label": "Mission Aligned", "passed": mission_aligned, "guidance": "Explicitly align with program/institution mission."},
        ]

        score = sum(1 for c in criteria if c["passed"])
        max_score = len(criteria)
        percentage = round((score / max_score) * 100)
        
        rating = "Strong" if percentage >= 86 else "Good" if percentage >= 71 else "Developing" if percentage >= 56 else "Needs improvement"
        gaps = [c["label"] for c in criteria if not c["passed"]]

        return {
            "score": score,
            "maxScore": max_score,
            "percentage": percentage,
            "rating": rating,
            "specific": specific,
            "measurable": measurable,
            "attainable": attainable,
            "relevant": relevant,
            "timeBound": time_bound,
            "abetStyle": abet_style,
            "missionAligned": mission_aligned,
            "alumniMeasurable": alumni_measurable,
            "criteria": criteria,
            "gaps": gaps,
        }

    def _check_institute_alignment(self, vision: str, institute_vision: str) -> Dict[str, Any]:
        """Ensures Program Vision matches themes from Institute Vision (Problem 10)."""
        v_tokens = set(self._extract_core_tokens(vision))
        inst_tokens = set(self._extract_core_tokens(institute_vision))
        
        if not inst_tokens:
            return {"matches": [], "score": 100}
            
        common = v_tokens.intersection(inst_tokens)
        score = 100 if common else 50 # Default low alignment if zero word overlap
        
        return {
            "matches": sorted(list(common)),
            "score": score
        }


classifier = StrategicClassifier()


def score_vision(vision: str, focus_areas: List[str] = None, institute_vision: str = None) -> Dict[str, Any]:
    return classifier.calculate_score(vision, focus_areas, institute_vision)

def score_mission(mission: str) -> Dict[str, Any]:
    return classifier.score_mission(mission)

def calculate_alignment(vision: str, mission: str) -> float:
    return classifier.calculate_alignment(vision, mission)

def calculate_peo_vision_alignment(vision: str, peo: str) -> float:
    return classifier.calculate_peo_vision_alignment(vision, peo)

def peo_similarity(peo1: str, peo2: str) -> float:
    return classifier.peo_similarity(peo1, peo2)

def enforce_peo_quality(raw_statement: str, priority: str, program_name: str) -> str:
    return classifier.enforce_peo_quality(raw_statement, priority, program_name)

def enforce_po_quality(raw_po: str) -> str:
    return classifier.enforce_po_quality(raw_po)

def score_peo(statement: str) -> Dict[str, Any]:
    return classifier.score_smart_abet(statement)

def score_pso(statement: str) -> Dict[str, Any]:
    return classifier.score_pso(statement)

def pso_similarity(pso1: str, pso2: str) -> float:
    return classifier.pso_similarity(pso1, pso2)
