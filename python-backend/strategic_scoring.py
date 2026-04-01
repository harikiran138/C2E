import re
from typing import Any, Dict, List


class StrategicClassifier:
    """
    Deterministic Vision governance classifier.
    Enforces hard filters and weighted strategic scoring.
    """

    # New Master Rubric Weights
    VISION_RUBRIC_WEIGHTS = {
        "strategic_depth": 20,
        "global_future_orientation": 20,
        "innovation_research": 20,
        "societal_ethical": 20,
        "language_clarity": 10,
        "non_operational_purity": 10,
    }

    MISSION_RUBRIC_WEIGHTS = {
        "pillar_coverage": 20, # 5 points per pillar
        "action_clarity": 20,
        "vision_alignment": 20,
        "non_redundancy": 20,
        "specificity": 10,
        "language_quality": 10,
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
        "future technologies": ["future", "emerging technologies", "next-generation", "future-ready", "long horizon"],
        "ethics and integrity": ["ethics", "integrity", "responsibility", "professional values", "ethical", "professional ethics", "responsible"]
    }

    OPERATIONAL_TERMS = [
        "education", "teaching", "learning", "curriculum", "pedagogy", "classroom",
        "faculty", "students", "student", "provide", "deliver", "develop", "cultivate",
        "train", "prepare", "implement", "foster", "outcome based", "outcome-oriented",
        "outcome oriented", "through education", "through teaching", "courseware", "instruction"
    ]

    GOVERNANCE_PILLARS = {
        "Academic Excellence": ["curriculum", "learning", "pedagogy", "academic", "education", "outcome-based", "competencies"],
        "Research & Industry Integration": ["research", "innovation", "industry", "collaboration", "laboratory", "technology transfer", "entrepreneurship"],
        "Ethics & Professional Responsibility": ["ethics", "integrity", "professionalism", "responsibility", "standards", "values", "professional conduct"],
        "Societal Impact / Sustainability": ["society", "community", "sustainable", "environment", "welfare", "public good", "global challenge"]
    }

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
        "ly",
        "al",
        "ed",
        "es",
        "s",
    ]
    REDUNDANCY_STOP_WORDS = {
        "the", "and", "for", "with", "that", "this", "from", "into", "through", "toward", "towards", "to", "of", "in", "on", "a", "an", "by", "be", "or", "is", "are", "as", "at", 
        "program", "engineering", "institutional", "strategic", "future", "long", "term", "sustained",
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
        changed = True
        while changed:
            changed = False
            for suffix in self.REDUNDANCY_SUFFIXES:
                if root.endswith(suffix) and len(root) > len(suffix) + 3:
                    root = root[: -len(suffix)]
                    changed = True
                    break
        return root

    def _tokenize_and_clean(self, text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [t for t in tokens if t not in self.REDUNDANCY_STOP_WORDS]

    def _extract_core_tokens(self, text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [token for token in tokens if len(token) >= 4 and token not in self.REDUNDANCY_STOP_WORDS]

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

    def calculate_master_vision_score(self, vision: str, focus_areas: List[str] = None) -> Dict[str, Any]:
        """
        Master scoring logic based on the 100-point rubric.
        """
        normalized = self.normalize_whitespace(vision)
        if not normalized:
            return {
                "score": 0,
                "breakdown": {
                    "strategic_depth": 0,
                    "global_future_orientation": 0,
                    "innovation_research": 0,
                    "societal_ethical": 0,
                    "language_clarity": 0,
                    "non_operational_purity": 0
                },
                "issues": ["Empty statement"]
            }
        lower = normalized.lower()
        
        # 1. Strategic Depth (20)
        # Assessed by presence of long-term horizon signals and depth of phrasing
        long_term = any(self._contains_bounded_term(lower, t) for t in self.LONG_TERM_SIGNALS)
        # Also check for preferred starters
        has_starter = any(lower.startswith(s.lower()) for s in ["To be", "To become", "A vision to", "To emerge as"])
        
        strategic_depth = 20 if long_term else (20 if has_starter else 10)
        
        # 2. Global / Future Orientation (20)
        global_concepts = self._extract_global_concepts(lower)
        global_future_score = len(global_concepts) * 10
        structure = self._check_vision_structure(normalized)
        if "future technologies" in structure.get("matched_themes", []):
            global_future_score += 5
        global_future_score = min(20, global_future_score)

        # 3. Innovation / Research (20)
        has_innovation = any(self._contains_bounded_term(lower, kw) for kw in self.STRATEGIC_THEMES["research or innovation"])
        innovation_score = 20 if has_innovation else 0

        # 4. Societal / Ethical (20)
        has_societal = any(self._contains_bounded_term(lower, kw) for kw in self.STRATEGIC_THEMES["societal impact"])
        has_ethical = any(self._contains_bounded_term(lower, kw) for kw in self.STRATEGIC_THEMES["ethics and integrity"])
        societal_ethical_score = 20 if (has_societal or has_ethical) else 0

        # 5. Language Clarity (10)
        lang_score = self._check_grammar_clarity(normalized) * 2 # Scale 5 to 10

        # 6. Non-operational Purity (10)
        operational_hits = self._matched_terms(lower, self.OPERATIONAL_TERMS)
        purity_score = max(0, 10 - (len(operational_hits) * 5))

        total_score = strategic_depth + global_future_score + innovation_score + societal_ethical_score + lang_score + purity_score
        
        issues = []
        if purity_score < 10: issues.append(f"Operational language detected: {', '.join(operational_hits)}")
        if innovation_score == 0: issues.append("Missing innovation/research keywords")
        if societal_ethical_score == 0: issues.append("Missing societal or ethical dimension")

        return {
            "score": self._clamp(total_score),
            "breakdown": {
                "strategic_depth": strategic_depth,
                "global_future_orientation": global_future_score,
                "innovation_research": innovation_score,
                "societal_ethical": societal_ethical_score,
                "language_clarity": lang_score,
                "non_operational_purity": purity_score
            },
            "issues": issues,
            "strengths": [t for t, s in [("Strategic", strategic_depth >= 15), ("Global", global_future_score >= 15), ("Innovative", innovation_score >= 15)] if s]
        }

    def score_master_mission(self, mission_list: List[Dict[str, str]], vision_text: str) -> Dict[str, Any]:
        """
        Scores a collection of 4 mission statements against the 4 pillars.
        """
        pillar_results = []
        total_p_score = 0
        
        # Check pillar coverage
        found_pillars = set()
        for m in mission_list:
            pillar = m.get("pillar")
            text = m.get("text", "")
            if pillar in self.GOVERNANCE_PILLARS:
                found_pillars.add(pillar)
                # Individual mission scoring
                m_score = self._score_single_mission_master(text, pillar, vision_text)
                pillar_results.append({
                    "pillar": pillar,
                    "text": text,
                    "score": m_score
                })
                total_p_score += m_score

        avg_score = total_p_score / len(mission_list) if mission_list else 0
        coverage_score = (len(found_pillars) / 4) * 20
        
        return {
            "average_score": self._clamp(avg_score),
            "coverage_score": coverage_score,
            "pillars": pillar_results,
            "status": "PASS" if coverage_score >= 15 and avg_score >= 85 else "FAIL"
        }

    def _score_single_mission_master(self, text: str, pillar: str, vision_text: str) -> int:
        lower = text.lower()
        score = 0
        
        # 1. Action Clarity (20)
        has_verb = any(v in lower for v in self.MISSION_REQUIREMENT_VERBS)
        score += 20 if has_verb else 5
        
        # 2. Vision Alignment (20)
        alignment = self.calculate_alignment(vision_text, text)
        score += int(alignment * 20)
        
        # 3. Non-redundancy (20)
        redundant = self._repeated_roots(text)
        score += max(0, 20 - (len(redundant) * 5))
        
        # 4. Specificity (20)
        keywords = self.GOVERNANCE_PILLARS.get(pillar, [])
        has_spec = any(kw in lower for kw in keywords)
        score += 20 if has_spec else 0
        
        # 5. Language Quality (20)
        words = text.split()
        length_ok = 15 <= len(words) <= 30
        score += 20 if length_ok else 10
        
        return self._clamp(score)

    def calculate_alignment_score(self, vision: str, mission_points: List[str]) -> int:
        """Enhanced alignment engine returning 0-100 score."""
        if not vision or not mission_points:
            return 0
        
        v_tokens = set(self._extract_core_tokens(vision))
        all_m_tokens = set()
        for mp in mission_points:
            all_m_tokens.update(self._extract_core_tokens(mp))
            
        if not v_tokens:
            return 100
            
        common = v_tokens.intersection(all_m_tokens)
        alignment_raw = len(common) / len(v_tokens)
        
        # Boost if critical themes are shared
        critical_themes = ["innovation", "global", "society", "sustainable", "future"]
        boost = 0
        for theme in critical_themes:
            if theme in v_tokens and any(theme in mp.lower() for mp in mission_points):
                boost += 5
                
        return self._clamp((alignment_raw * 75) + boost + 15) # Base 15 for intent

    def calculate_alignment(self, vision: str, mission: str) -> float:
        vision_tokens = [self._normalize_root(t) for t in self._extract_core_tokens(vision)]
        mission_tokens = [self._normalize_root(t) for t in self._extract_core_tokens(mission)]
        
        v_set = set(vision_tokens)
        m_set = set(mission_tokens)
        
        if not v_set or not m_set:
            return 0.0
            
        overlap = v_set.intersection(m_set)
        # Dice coefficient: (2 * overlap) / (total unique tokens)
        return (2.0 * len(overlap)) / (len(v_set) + len(m_set))

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


class StrategicGuard:
    """
    A unified entry point for validating and repairing OBE entities.
    Integrates all StrategicClassifier scoring logic into a single guard.
    """

    def __init__(self):
        self.classifier = StrategicClassifier()

    def validate_vision(self, vision: str, focus_areas: List[str] = None) -> Dict[str, Any]:
        """
        Calculates score, identifies issues, and provides repair suggestions.
        """
        score_info = self.classifier.calculate_master_vision_score(vision, focus_areas)
        
        # Repair logic: if score < 90, find missing themes and suggest keywords
        if score_info['score'] < 90:
            missing_themes = []
            for theme, keywords in self.classifier.STRATEGIC_THEMES.items():
                if not any(self.classifier._contains_bounded_term(vision.lower(), kw) for kw in keywords):
                    missing_themes.append(theme)
            
            score_info['repair_suggestions'] = [
                f"Incorporate '{theme}' concepts. Try: {', '.join(self.classifier.STRATEGIC_THEMES[theme][:2])}"
                for theme in missing_themes[:2]
            ]
        
        return score_info

    def validate_mission(self, mission_list: List[Dict[str, str]], vision: str) -> Dict[str, Any]:
        """
        Validates mission coverage and alignment.
        """
        return self.classifier.score_master_mission(mission_list, vision)

    def validate_peo(self, statement: str, priority: str, program_name: str) -> Dict[str, Any]:
        """
        Validates PEO and suggests an auto-fix if it's below parity.
        """
        res = self.classifier.score_smart_abet(statement)
        if res['percentage'] < 85:
            res['auto_fix'] = self.classifier.enforce_peo_quality(statement, priority, program_name)
        return res

    def validate_pso(self, statement: str) -> Dict[str, Any]:
        """
        Validates PSO with focus on technical verbs and prefix.
        """
        return self.classifier.score_pso(statement)


classifier = StrategicClassifier()
guard = StrategicGuard()


def score_vision(vision: str, focus_areas: List[str] = None, institute_vision: str = None) -> Dict[str, Any]:
    return classifier.calculate_master_vision_score(vision, focus_areas)


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
