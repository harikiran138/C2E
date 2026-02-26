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
        "to be internationally benchmarked for",
        "to attain global leadership in",
        "to be globally distinguished for",
    ]

    POSITIONING_KEYWORDS = ["recognition", "recognized", "distinction", "leadership", "benchmarked"]
    LONG_TERM_SIGNALS = ["long-term", "long horizon", "future", "sustained", "enduring", "institutional"]

    GLOBAL_CONCEPT_PATTERNS = [
        ("globally recognized", re.compile(r"\bglobally recognized\b", re.IGNORECASE)),
        ("internationally benchmarked", re.compile(r"\binternationally benchmarked\b", re.IGNORECASE)),
        ("global leadership", re.compile(r"\bglobal leadership\b", re.IGNORECASE)),
        ("globally distinguished", re.compile(r"\bglobally distinguished\b", re.IGNORECASE)),
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
        if global_token_hits > 1:
            redundancy_control -= 35

        strategic_clarity = 100
        if len(words) < 15 or len(words) > 25:
            strategic_clarity -= 20
        if marketing_hits:
            strategic_clarity -= 40
        if pillar_count > 3:
            strategic_clarity -= 35

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
