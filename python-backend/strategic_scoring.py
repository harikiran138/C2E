import re
from typing import Any, Dict, List


class StrategicClassifier:
    """
    Deterministic Vision governance classifier.
    Enforces hard filters and weighted strategic scoring.
    """

    WEIGHTS = {
        "long_term_abstraction": 0.20,
        "institutional_positioning": 0.20,
        "no_operational_leakage": 0.20,
        "redundancy_control": 0.15,
        "strategic_clarity": 0.15,
        "alignment_with_focus_areas": 0.10,
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
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "into",
        "through",
        "toward",
        "towards",
        "to",
        "of",
        "in",
        "on",
        "a",
        "an",
        "by",
        "be",
        "or",
        "is",
        "are",
        "as",
        "at",
        "program",
        "engineering",
        "institutional",
        "strategic",
        "global",
        "globally",
        "international",
        "internationally",
        "future",
        "long",
        "term",
        "sustained",
    }
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

    def _normalize_root(self, token: str) -> str:
        root = re.sub(r"[^a-z0-9]", "", token.lower())
        if not root or len(root) <= 4:
            return root
        for suffix in self.REDUNDANCY_SUFFIXES:
            if root.endswith(suffix) and len(root) - len(suffix) >= 4:
                root = root[: -len(suffix)]
                break
        return root

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

    def calculate_score(self, vision: str) -> Dict[str, Any]:
        normalized = " ".join((vision or "").split())
        lower_vision = normalized.lower()
        words = re.findall(r"\b[\w-]+\b", normalized)

        operational_hits = self._matched_terms(lower_vision, self.OPERATIONAL_TERMS)
        marketing_hits = self._matched_terms(lower_vision, self.MARKETING_TERMS)
        global_concepts = self._extract_global_concepts(lower_vision)
        global_token_hits = self._count_global_tokens(lower_vision)
        repeated_tokens = []
        for token in ["global", "globally", "international", "internationally", "leadership", "distinction"]:
            if len(re.findall(rf"\b{token}\b", lower_vision, re.IGNORECASE)) > 1:
                repeated_tokens.append(token)
        repeated_roots = self._repeated_roots(normalized)
        duplicate_bigrams = self._duplicate_bigrams(normalized)
        synonym_stacking = self._synonym_stacking(normalized)

        pillar_count = self._estimate_pillar_count(normalized)
        immediate_outcome = any(
            phrase in lower_vision
            for phrase in ["at graduation", "on graduation", "students will be able to", "student will be able to"]
        )

        hard_violations = []
        if operational_hits:
            hard_violations.append(f"Operational leakage: {', '.join(sorted(set(operational_hits))[:6])}")
        if marketing_hits:
            hard_violations.append(f"Marketing tone detected: {', '.join(sorted(set(marketing_hits)))}")
        if len(global_concepts) != 1:
            hard_violations.append(f"Global positioning concept count must be exactly 1 (found {len(global_concepts)})")
        if global_token_hits > 1:
            hard_violations.append("Global positioning phrase stacking detected")
        if pillar_count > 3:
            hard_violations.append("More than 3 strategic pillars detected")
        if immediate_outcome:
            hard_violations.append("Immediate-outcome language detected")
        if repeated_roots:
            hard_violations.append(f"Repeated root words detected: {', '.join(repeated_roots)}")
        if duplicate_bigrams:
            hard_violations.append(f"Duplicate noun phrases detected: {', '.join(duplicate_bigrams)}")
        if synonym_stacking:
            hard_violations.append(f"Synonym stacking detected: {', '.join(synonym_stacking)}")

        long_term_abstraction = 100
        if len(words) < 15 or len(words) > 25:
            long_term_abstraction -= 35
        if not any(signal in lower_vision for signal in self.LONG_TERM_SIGNALS):
            long_term_abstraction -= 30
        if immediate_outcome:
            long_term_abstraction -= 35

        institutional_positioning = 100
        if not any(lower_vision.startswith(starter) for starter in self.POSITIONING_STARTERS):
            institutional_positioning -= 35
        if not any(keyword in lower_vision for keyword in self.POSITIONING_KEYWORDS):
            institutional_positioning -= 30
        if len(global_concepts) != 1:
            institutional_positioning -= 35

        no_operational_leakage = 100 if not operational_hits else max(0, 100 - len(operational_hits) * 30)

        redundancy_control = 100
        if repeated_tokens:
            redundancy_control -= 40
        if repeated_roots:
            redundancy_control -= min(65, len(repeated_roots) * 22)
        if duplicate_bigrams:
            redundancy_control -= min(55, len(duplicate_bigrams) * 25)
        if synonym_stacking:
            redundancy_control -= 35
        if global_token_hits > 1:
            redundancy_control -= 35

        strategic_clarity = 100
        if len(words) < 15 or len(words) > 25:
            strategic_clarity -= 20
        if marketing_hits:
            strategic_clarity -= 40
        if pillar_count > 3:
            strategic_clarity -= 35
        if repeated_roots:
            strategic_clarity -= 30
        if duplicate_bigrams:
            strategic_clarity -= 30
        if synonym_stacking:
            strategic_clarity -= 25

        # This local scorer has no focus-area context; keep neutral to avoid artificial inflation.
        alignment_with_focus_areas = 80

        weighted_score = (
            long_term_abstraction * self.WEIGHTS["long_term_abstraction"]
            + institutional_positioning * self.WEIGHTS["institutional_positioning"]
            + no_operational_leakage * self.WEIGHTS["no_operational_leakage"]
            + redundancy_control * self.WEIGHTS["redundancy_control"]
            + strategic_clarity * self.WEIGHTS["strategic_clarity"]
            + alignment_with_focus_areas * self.WEIGHTS["alignment_with_focus_areas"]
        )

        final_score = self._clamp(weighted_score)
        if hard_violations:
            final_score = min(final_score, 79)

        violations = list(hard_violations)
        if repeated_tokens:
            violations.append(f"Phrase redundancy detected: {', '.join(repeated_tokens)}")
        if repeated_roots:
            violations.append(f"Repeated root words detected: {', '.join(repeated_roots)}")
        if duplicate_bigrams:
            violations.append(f"Duplicate noun phrases detected: {', '.join(duplicate_bigrams)}")
        if synonym_stacking:
            violations.append(f"Synonym stacking detected: {', '.join(synonym_stacking)}")
        if final_score < 90:
            violations.append(f"Strategic score below threshold: {final_score}/100")

        return {
            "score": final_score,
            "violations": violations,
            "is_elite": final_score >= 90,
            "hard_fail": bool(hard_violations),
            "breakdown": {
                "long_term_abstraction": self._clamp(long_term_abstraction),
                "institutional_positioning": self._clamp(institutional_positioning),
                "no_operational_leakage": self._clamp(no_operational_leakage),
                "redundancy_control": self._clamp(redundancy_control),
                "strategic_clarity": self._clamp(strategic_clarity),
                "alignment_with_focus_areas": self._clamp(alignment_with_focus_areas),
            },
        }


classifier = StrategicClassifier()


def score_vision(vision: str) -> Dict[str, Any]:
    return classifier.calculate_score(vision)
