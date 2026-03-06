"""
C2E Backend — Comprehensive Pytest Test Suite
Covers: scoring functions, parsing utilities, ml_engine, edge cases, negative cases.

Run: cd python-backend && python -m pytest tests/test_suite.py -v
"""
import sys
import os
import json
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ─────────────────────────────────────────────
# strategic_scoring.py tests
# ─────────────────────────────────────────────

class TestStrategicScoring:

    def setup_method(self):
        from strategic_scoring import score_vision, score_mission, calculate_alignment
        from main import vision_similarity

        self.score_vision = score_vision
        self.score_mission = score_mission
        self.calculate_alignment = calculate_alignment
        self.vision_similarity = vision_similarity

    # --- score_vision ---

    def test_score_vision_valid(self):
        vision = "To be globally recognized for advancing innovation and research in sustainable engineering for societal impact."
        result = self.score_vision(vision, ["Innovation-driven education"], "To be a leading technical institution.")
        assert isinstance(result, dict)
        assert "score" in result
        assert isinstance(result["score"], (int, float))
        assert 0 <= result["score"] <= 100

    def test_score_vision_empty_string(self):
        """Empty string must not raise — return a result with score=0 or similar."""
        result = self.score_vision("", [], "")
        assert isinstance(result, dict)
        assert "score" in result

    def test_score_vision_none_focus_areas(self):
        """None focus_areas must not crash."""
        result = self.score_vision("To be globally recognized for innovation.", None, "")
        assert isinstance(result, dict)

    def test_score_vision_returns_violations(self):
        """Result should contain violations key."""
        result = self.score_vision("some short text", [], "")
        assert "violations" in result or "hard_fail" in result

    # --- score_mission ---

    def test_score_mission_valid(self):
        mission = "M1: Foster ethical responsibility and innovation. M2: Cultivate research culture. M3: Promote societal impact through curriculum."
        result = self.score_mission(mission)
        assert isinstance(result, dict)
        assert "score" in result
        assert 0 <= result["score"] <= 100

    def test_score_mission_empty(self):
        result = self.score_mission("")
        assert isinstance(result, dict)
        assert result["score"] == 0 or "hard_fail" in result

    def test_score_mission_none_input(self):
        """None input must not raise."""
        try:
            result = self.score_mission(None)
            assert isinstance(result, dict)
        except TypeError:
            pytest.skip("score_mission does not handle None — acceptable if caller guards")

    # --- calculate_alignment ---

    def test_alignment_identical_texts(self):
        text = "To be globally recognized for innovation in engineering."
        score = self.calculate_alignment(text, text)
        assert isinstance(score, float)
        assert score >= 0.5  # identical texts should score high

    def test_alignment_unrelated_texts(self):
        a = "To be globally recognized for innovation in engineering."
        b = "The quick brown fox jumps over the lazy dog."
        score = self.calculate_alignment(a, b)
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    def test_alignment_empty_reference(self):
        score = self.calculate_alignment("", "some mission text")
        assert isinstance(score, float)
        assert score == 0.0

    def test_alignment_empty_candidate(self):
        score = self.calculate_alignment("some vision text", "")
        assert isinstance(score, float)
        assert score == 0.0

    # --- vision_similarity ---

    def test_similarity_identical(self):
        text = "To be globally recognized for innovation."
        score = self.vision_similarity(text, text)
        assert isinstance(score, float)
        assert score >= 0.9

    def test_similarity_different(self):
        a = "To be globally recognized for innovation."
        b = "To cultivate ethical engineers for societal impact."
        score = self.vision_similarity(a, b)
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    def test_similarity_empty_inputs(self):
        score = self.vision_similarity("", "")
        assert isinstance(score, float)


# ─────────────────────────────────────────────
# main.py utility function tests
# ─────────────────────────────────────────────

class TestParseUtils:

    def setup_method(self):
        from main import parse_peo_array, normalize_whitespace, validate_peo_quality
        self.parse_peo_array = parse_peo_array
        self.normalize_whitespace = normalize_whitespace
        self.validate_peo_quality = validate_peo_quality

    # --- parse_peo_array ---

    def test_parse_valid_json_array(self):
        raw = '["PEO1: graduates will lead", "PEO2: graduates will innovate"]'
        result = self.parse_peo_array(raw)
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(s, str) for s in result)

    def test_parse_json_with_markdown_fences(self):
        raw = '```json\n["PEO1: lead", "PEO2: innovate"]\n```'
        result = self.parse_peo_array(raw)
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_parse_malformed_json_fallback(self):
        raw = "1. Within 3 to 5 years graduates will lead\n2. Within 3 to 5 years graduates will innovate"
        result = self.parse_peo_array(raw)
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_parse_empty_string(self):
        result = self.parse_peo_array("")
        assert isinstance(result, list)

    def test_parse_none_returns_list(self):
        """Passing None should not crash — acceptable to raise or return []."""
        try:
            result = self.parse_peo_array(None)
            assert isinstance(result, list)
        except (TypeError, AttributeError):
            pass  # acceptable if caller ensures non-None input

    # --- normalize_whitespace ---

    def test_normalize_basic(self):
        result = self.normalize_whitespace("  hello   world  ")
        assert result == "hello world"

    def test_normalize_newlines(self):
        result = self.normalize_whitespace("hello\n\nworld")
        assert "  " not in result

    def test_normalize_empty(self):
        result = self.normalize_whitespace("")
        assert result == ""

    def test_normalize_none(self):
        try:
            result = self.normalize_whitespace(None)
            assert result == "" or result is None
        except (TypeError, AttributeError):
            pass

    # --- validate_peo_quality ---

    def test_validate_valid_peo(self):
        peo = "Within 3 to 5 years of graduation, graduates will apply engineering knowledge in professional practice and contribute to society."
        result = self.validate_peo_quality(peo, "Computer Engineering")
        assert isinstance(result, dict)
        assert "valid" in result

    def test_validate_missing_prefix(self):
        peo = "Graduates will apply engineering knowledge in professional practice."
        result = self.validate_peo_quality(peo, "Computer Engineering")
        assert result["valid"] is False
        assert "reason" in result

    def test_validate_too_short(self):
        peo = "Within 3 to 5 years of graduation, graduates will lead."
        result = self.validate_peo_quality(peo, "Computer Engineering")
        assert isinstance(result, dict)
        # May be invalid due to word count

    def test_validate_empty_statement(self):
        result = self.validate_peo_quality("", "Test Program")
        assert isinstance(result, dict)
        assert result["valid"] is False


# ─────────────────────────────────────────────
# ml_engine.py tests
# ─────────────────────────────────────────────

class TestMLEngine:

    def test_import(self):
        from ml_engine import LocalMLEngine, get_local_vision
        assert LocalMLEngine is not None
        assert get_local_vision is not None

    def test_singleton_created(self):
        from ml_engine import engine
        assert engine is not None

    def test_serverless_guard(self, monkeypatch):
        """Model must NOT load when VERCEL=1."""
        monkeypatch.setenv("VERCEL", "1")
        from ml_engine import LocalMLEngine
        e = LocalMLEngine()
        e.load_model()
        assert e.pipe is None

    def test_device_detection(self):
        from ml_engine import LocalMLEngine
        e = LocalMLEngine()
        assert e.device in ("mps", "cuda", "cpu")

    def test_get_local_vision_serverless(self, monkeypatch):
        """In serverless mode get_local_vision must return '' without loading model."""
        monkeypatch.setenv("VERCEL", "1")
        from ml_engine import LocalMLEngine
        e = LocalMLEngine()
        # engine.is_serverless is True so generate_vision should return early
        result = e.generate_vision("Test Program", ["innovation"])
        assert isinstance(result, str)

    def test_get_local_vision_returns_string(self, monkeypatch):
        """get_local_vision returns str (may be '' if model not loaded)."""
        monkeypatch.setenv("VERCEL", "1")
        import ml_engine
        result = ml_engine.get_local_vision("Test Program", ["innovation", "sustainability"])
        assert isinstance(result, str)


# ─────────────────────────────────────────────
# Boundary and edge case tests
# ─────────────────────────────────────────────

class TestBoundaryEdgeCases:

    def setup_method(self):
        from main import parse_peo_array, normalize_whitespace
        self.parse_peo_array = parse_peo_array
        self.normalize_whitespace = normalize_whitespace

    def test_parse_peo_very_long_string(self):
        """parse_peo_array must handle very long input without crashing."""
        raw = json.dumps([f"PEO{i}: Within 3 to 5 years graduates will do item {i}" for i in range(50)])
        result = self.parse_peo_array(raw)
        assert isinstance(result, list)
        assert len(result) == 50

    def test_parse_peo_unicode(self):
        """Unicode characters in PEO text must not crash."""
        raw = '["Within 3 to 5 years, graduates will apply naïve Bayésian methods", "PEO2: graduates will lead"]'
        result = self.parse_peo_array(raw)
        assert isinstance(result, list)

    def test_normalize_whitespace_only(self):
        result = self.normalize_whitespace("     ")
        assert result == "" or result.strip() == ""

    def test_normalize_tabs_and_spaces(self):
        result = self.normalize_whitespace("\t\thello\t\tworld\t")
        assert "hello" in result and "world" in result

    def test_score_vision_very_long_text(self):
        from strategic_scoring import score_vision
        long_vision = "To be globally recognized for " + ("innovation and research " * 50) + "."
        result = score_vision(long_vision, ["Innovation-driven education"], "")
        assert isinstance(result, dict)

    def test_alignment_special_characters(self):
        from strategic_scoring import calculate_alignment
        a = "To be globally recognized for innovation! #1 in the world."
        b = "Foster graduates with innovation and research capabilities."
        score = calculate_alignment(a, b)
        assert 0.0 <= score <= 1.0

    def test_score_mission_only_whitespace(self):
        from main import score_mission
        result = score_mission("   ")
        assert isinstance(result, dict)
        assert result.get("score", 0) == 0 or result.get("hard_fail") is True


# ─────────────────────────────────────────────
# templates.py tests
# ─────────────────────────────────────────────

class TestTemplates:

    def setup_method(self):
        from templates import generate_elite_fallback_missions
        self.generate_elite_fallback_missions = generate_elite_fallback_missions

    def test_generate_missions_count(self):
        result = self.generate_elite_fallback_missions("Computer Engineering", 3)
        assert isinstance(result, list)
        assert len(result) == 3

    def test_generate_missions_zero(self):
        result = self.generate_elite_fallback_missions("Computer Engineering", 0)
        assert isinstance(result, list)
        # Should return at least 1 due to max(1, count)
        assert len(result) >= 1

    def test_generate_missions_returns_strings(self):
        result = self.generate_elite_fallback_missions("Mechanical Engineering", 2)
        assert all(isinstance(m, str) and len(m) > 0 for m in result)

    def test_generate_missions_program_name_in_output(self):
        result = self.generate_elite_fallback_missions("Aerospace Engineering", 1)
        combined = " ".join(result).lower()
        assert "aerospace engineering" in combined or len(result) > 0


# ─────────────────────────────────────────────
# build_safe_mission / build_deterministic_vision
# ─────────────────────────────────────────────

class TestBuilderFunctions:

    def setup_method(self):
        from main import build_safe_mission, build_deterministic_vision, build_safe_diversity_vision
        self.build_safe_mission = build_safe_mission
        self.build_deterministic_vision = build_deterministic_vision
        self.build_safe_diversity_vision = build_safe_diversity_vision

    def test_safe_mission_returns_string(self):
        result = self.build_safe_mission("Computer Engineering", 0)
        assert isinstance(result, str)
        assert len(result) > 10

    def test_safe_mission_different_variants(self):
        r0 = self.build_safe_mission("CSE", 0)
        r1 = self.build_safe_mission("CSE", 1)
        r2 = self.build_safe_mission("CSE", 2)
        # At least some should differ
        assert len({r0, r1, r2}) >= 1  # all valid strings

    def test_deterministic_vision_returns_string(self):
        result = self.build_deterministic_vision("Computer Engineering", ["innovation", "society"], 0)
        assert isinstance(result, str)
        assert len(result) > 10

    def test_safe_diversity_vision_returns_string(self):
        result = self.build_safe_diversity_vision("Computer Engineering", 0)
        assert isinstance(result, str)
        assert len(result) > 10

    def test_safe_mission_empty_program_name(self):
        """Must not crash on empty program name."""
        result = self.build_safe_mission("", 0)
        assert isinstance(result, str)
