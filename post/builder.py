# -*- coding: utf-8 -*-
"""
Generate 400 long-form Markdown articles (2000-3000 Chinese chars each)
across 8 core topics (40 each) and 8 cross-domain bridges (10 each = 80 total).
Outputs directly to subfolders under C:\Users\seans\hope\epsilonfeed\post\
"""

import os
import sys

POST_ROOT = r"C:\Users\seans\hope\epsilonfeed\post"

# 8 Core + 8 Cross-Domain specifications
CATEGORIES = [
    ("01_finance", "finance", 40),
    ("02_tech", "tech", 40),
    ("03_sports", "sports", 40),
    ("04_health", "health", 40),
    ("05_astrology", "astrology", 40),
    ("06_gaming", "gaming", 40),
    ("07_history", "history", 40),
    ("08_mystery", "mystery", 40),
    ("09_cross_domain", "cross", 80),
]

print("Starting generation framework...")
