import asyncio
import sys
import os

# Ensure the python-backend is on the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from strategic_scoring import score_mission, calculate_alignment
from main import build_safe_mission, enforce_mission_diversity, get_local_vision

def run_tests():
    print("=== Testing mission rules ===")
    
    # Test valid mission length (20-35) + verbs + impact
    good_mission = "To deliver a rigorous computer science curriculum, promote innovative research, and develop ethical professionals capable of addressing evolving industrial and societal challenges."
    mission_res = score_mission(good_mission)
    print(f"\nGood Mission Score: {mission_res['score']}/100")
    print(f"Failures: {mission_res.get('violations', [])}")
    
    # Test alignment calculation
    good_vision = "To be globally recognized for pioneering research and transformative mechanical engineering solutions impacting society and future technologies."
    alignment_res = calculate_alignment(good_vision, good_mission)
    print(f"\nAlignment Score: {alignment_res:.2f}")

    # Test bad short mission w/ marketing fluff
    bad_mission = "We guarantee to build a world-class IT hub to ensure all students are the best."
    bad_res = score_mission(bad_mission)
    print(f"\nBad Mission Score: {bad_res['score']}/100")
    print(f"Failures: {bad_res.get('violations', [])}")
    
if __name__ == "__main__":
    run_tests()
