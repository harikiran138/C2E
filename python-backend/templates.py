import random
import time
from typing import List

VISION_TEMPLATES = [
    "To be globally recognized for long-term {program} distinction through transformative innovation leadership, ethical professional standards, and sustainable societal contribution.",
    "To emerge as a long-horizon {program} benchmark for globally respected distinction through strategic innovation leadership and enduring societal relevance.",
    "To achieve distinction in {program} through sustained institutional leadership, responsible innovation, and long-term societal contribution.",
    "To advance as a leading {program} program through strategic distinction, innovation foresight, and enduring professional and societal impact.",
    "To be globally respected for sustained {program} excellence through ethical institutional leadership, innovation strength, and long-horizon public value."
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
