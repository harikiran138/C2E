import random
import time
from typing import List

VISION_TEMPLATES = [
    "To be recognized as a premier center of excellence in {program} through innovation and strategic leadership in line with global standards.",
    "To achieve distinction in {program} by fostering a research-driven ecosystem and sustainable technological advancement for societal impact.",
    "To emerge as a globally respected institution for {program} innovation, advancing elite standards in professional leadership.",
    "To attain leadership in {program} excellence by pioneering transformative technological solutions and ethical engineering practices.",
    "To advance as a leading global authority in {program}, recognized for distinction, innovation, and strategic relevance."
]

MISSION_TEMPLATES = [
    "To provide high-quality {program} education through experiential learning, industry collaboration, and research-led teaching for global competence.",
    "Our mission is to empower {program} professionals with technical mastery, ethical integrity, and innovative problem-solving capabilities for societal impact.",
    "To cultivate a culture of excellence in {program} through cutting-edge research, hands-on development, and strategic industry engagement.",
    "We are committed to developing globally competent {program} graduates equipped with interdisciplinary skills, leadership qualities, and professional ethics.",
    "To drive advancement in {program} education by integrating sustainable practices, academic distinction, and world-class research initiatives."
]

def generate_elite_fallback_visions(program_name: str, count: int) -> List[str]:
    visions = []
    available = VISION_TEMPLATES.copy()
    # Use time_ns for higher resolution randomness seed to prevent rapid-fire duplicates
    random.seed(time.time_ns())
    random.shuffle(available)
    for i in range(count):
        template = available[i % len(available)]
        visions.append(template.format(program=program_name))
    return visions

def generate_elite_fallback_missions(program_name: str, count: int) -> List[str]:
    missions = []
    available = MISSION_TEMPLATES.copy()
    # Use time_ns for higher resolution randomness seed
    random.seed(time.time_ns())
    random.shuffle(available)
    for i in range(count):
        template = available[i % len(available)]
        missions.append(template.format(program=program_name))
    return missions
