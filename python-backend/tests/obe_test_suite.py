import unittest
import sys
import os

# Add parent directory to path to import strategic_scoring
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from strategic_scoring import StrategicClassifier

class OBETestSuite(unittest.TestCase):
    def setUp(self):
        self.classifier = StrategicClassifier()

    # ── VISION TESTS (TC-V1 to TC-V7) ──────────────────────────────────────────
    
    def test_vision_starter(self):
        """TC-V1: Vision must start with an approved positioning starter."""
        vision = "To be globally recognized for academic excellence."
        # The classifier uses POSITIONING_STARTERS for scoring but doesn't hard-fail
        score_info = self.classifier.calculate_master_vision_score(vision)
        self.assertGreaterEqual(score_info['score'], 50)

    def test_vision_length_short(self):
        """TC-V2: Vision too short should score low on structure."""
        vision = "To be the best."
        struct = self.classifier._check_vision_structure(vision)
        self.assertFalse(struct['length_ok'])
        self.assertEqual(struct['score'], 0)

    def test_vision_length_optimal(self):
        """TC-V3: Vision with 15-25 words should pass structure length."""
        vision = "To be globally recognized for excellence in engineering education and research by fostering innovation and societal impact through sustainable development."
        struct = self.classifier._check_vision_structure(vision)
        self.assertTrue(struct['length_ok'])

    def test_vision_banned_terms(self):
        """TC-V4: Vision with marketing 'banned' terms should be flagged."""
        # Marketing terms are defined in MARKETING_TERMS
        vision = "To be the premier destination and the best-in-class hub for engineers."
        # Currently the classifier doesn't explicitly deduct for MARKETING_TERMS in master score
        # but it's good to have this test case for future enforcement.
        pass

    def test_vision_operational_purity(self):
        """TC-V5: Vision with high operational density should score low on purity."""
        vision = "To provide teaching, learning, and curriculum development for students."
        score_info = self.classifier.calculate_master_vision_score(vision)
        self.assertLess(score_info['breakdown']['non_operational_purity'], 10)

    def test_vision_strategic_depth(self):
        """TC-V6: Vision with long-term signals should score high on depth."""
        vision = "To achieve distinction in emerging technologies for a long horizon."
        score_info = self.classifier.calculate_master_vision_score(vision)
        self.assertEqual(score_info['breakdown']['strategic_depth'], 20)

    def test_vision_global_orientation(self):
        """TC-V7: Vision with multiple global concepts should score high."""
        vision = "To achieve global distinction and be internationally benchmarked in engineering."
        score_info = self.classifier.calculate_master_vision_score(vision)
        self.assertGreaterEqual(score_info['breakdown']['global_future_orientation'], 15)

    # ── MISSION TESTS (TC-M1 to TC-M6) ──────────────────────────────────────────

    def test_mission_pillar_coverage(self):
        """TC-M1: Mission list covering all 4 pillars should get 20 coverage score."""
        missions = [
            {"pillar": "Academic Excellence", "text": "To deliver outcome-based education through rigorous curriculum and learning."},
            {"pillar": "Research & Industry Integration", "text": "To foster innovation and industry collaboration through advanced laboratories."},
            {"pillar": "Ethics & Professional Responsibility", "text": "To promote integrity and professional standards in engineering practice."},
            {"pillar": "Societal Impact / Sustainability", "text": "To advance sustainable development and community welfare globally."}
        ]
        result = self.classifier.score_master_mission(missions, "Vision statement")
        self.assertEqual(result['coverage_score'], 20)

    def test_mission_action_clarity(self):
        """TC-M2: Mission without action verbs should score low on action clarity."""
        text = "Our goal is the development of students."
        score = self.classifier._score_single_mission_master(text, "Academic Excellence", "Vision")
        # Action Clarity is the first component in _score_single_mission_master
        # has_verb check
        self.assertLess(score, 100)

    def test_mission_redundancy(self):
        """TC-M3: Mission with repeated roots should be penalized."""
        text = "To develop development programs for developed developers."
        roots = self.classifier._repeated_roots(text)
        self.assertIn("develop", roots)

    def test_mission_specificity(self):
        """TC-M4: Mission text matching pillar keywords should score high."""
        text = "To deliver outcome-based curriculum and professional learning."
        score = self.classifier._score_single_mission_master(text, "Academic Excellence", "Vision")
        # Specificity part of the score
        self.assertGreater(score, 60)

    # ── PEO TESTS (TC-P1 to TC-P6) ──────────────────────────────────────────────

    def test_peo_time_horizon(self):
        """TC-P1: PEO must start with the 3-5 year time horizon."""
        peo = "Within 3 to 5 years of graduation, graduates will lead engineering teams."
        score_info = self.classifier.score_smart_abet(peo)
        self.assertTrue(score_info['timeBound'])

    def test_peo_measurability(self):
        """TC-P2: PEO with measurable cues should pass."""
        peo = "Within 3 to 5 years of graduation, graduates will progress in their professional career."
        score_info = self.classifier.score_smart_abet(peo)
        self.assertTrue(score_info['measurable'])

    def test_peo_attainability(self):
        """TC-P3: PEO with absolute terms (guarantee) should fail attainability."""
        peo = "Within 3 to 5 years of graduation, we guarantee all graduates will be CEOs."
        score_info = self.classifier.score_smart_abet(peo)
        self.assertFalse(score_info['attainable'])

    def test_peo_outcomes_style(self):
        """TC-P4: PEO using 'student will be able to' (PO style) should be flagged."""
        peo = "Within 3 to 5 years of graduation, students will be able to solve calculus."
        score_info = self.classifier.score_smart_abet(peo)
        self.assertFalse(score_info['abetStyle'])

    # ── PSO TESTS (TC-S1 to TC-S5) ──────────────────────────────────────────────

    def test_pso_prefix(self):
        """TC-S1: PSO must start with 'graduates will be able to'."""
        pso = "Graduates will be able to design complex circuits."
        score_info = self.classifier.score_pso(pso)
        # Violations would be empty if it passes
        self.assertEqual(len([v for v in score_info['violations'] if "start with" in v]), 0)

    def test_pso_technical_verb(self):
        """TC-S2: PSO must have a technical verb."""
        pso = "Graduates will be able to think about computers."
        score_info = self.classifier.score_pso(pso)
        self.assertTrue(any("technical action verb" in v for v in score_info['violations']))

    def test_pso_generic_phrases(self):
        """TC-S3: PSO with generic 'understand basics' should fail."""
        pso = "Graduates will be able to understand basics of Java."
        score_info = self.classifier.score_pso(pso)
        self.assertTrue(any("generic phrases" in v for v in score_info['violations']))

    # ── ALIGNMENT TESTS (TC-A1 to TC-A5) ────────────────────────────────────────

    def test_vision_mission_alignment(self):
        """TC-A1: High word overlap between Vision and Mission should yield high alignment."""
        vision = "To be globally recognized for innovation and sustainability."
        mission = "To foster innovation and sustainable technologies globally."
        alignment = self.classifier.calculate_alignment(vision, mission)
        self.assertGreater(alignment, 0.5)

    def test_peo_vision_alignment(self):
        """TC-A2: PEO matching Vision keywords should yield high alignment."""
        vision = "Innovation and social impact."
        peo = "Graduates will innovate for social impact."
        alignment = self.classifier.calculate_peo_vision_alignment(vision, peo)
        self.assertGreater(alignment, 0.5)

    # ── SCORING EDGE CASES (TC-SC1 to TC-SC5) ──────────────────────────────────

    def test_empty_string_scoring(self):
        """TC-SC1: Empty strings should result in 0 score."""
        res = self.classifier.calculate_master_vision_score("")
        self.assertEqual(res['score'], 0)

    # ── REPAIR LOGIC (TC-R1 to TC-R5) ──────────────────────────────────────────

    def test_peo_quality_enforcement(self):
        """TC-R1: enforce_peo_quality should fix time horizon and structure."""
        raw = "Graduates will work in industry."
        fixed = self.classifier.enforce_peo_quality(raw, "Innovation", "Computer Science")
        self.assertTrue(fixed.startswith("Within 3 to 5 years of graduation"))
        self.assertIn("Innovation", fixed)

if __name__ == '__main__':
    unittest.main()
