# -*- coding: utf-8 -*-
import os
import sys
import glob

POST_ROOT = r"C:\Users\seans\hope\epsilonfeed\post"

folders = [
    "01_finance", "02_tech", "03_sports", "04_health",
    "05_astrology", "06_gaming", "07_history", "08_mystery",
    "09_cross_domain"
]

grand_total = 0
total_bytes = 0

print("=== Audit Report ===")
for f in folders:
    dir_path = os.path.join(POST_ROOT, f)
    files = glob.glob(os.path.join(dir_path, "*.md"))
    count = len(files)
    bytes_count = sum(os.path.getsize(p) for p in files)
    grand_total += count
    total_bytes += bytes_count
    print(f"  [{f}]: {count} files ({bytes_count / 1024:.1f} KB)")

print("------------------------------------------")
print(f"Total Markdown Files: {grand_total} (Expected: 400)")
print(f"Total Size: {total_bytes / (1024*1024):.2f} MB")
print("Status: " + ("SUCCESS: EXACTLY 400 ARTICLES GENERATED!" if grand_total == 400 else "MISMATCH!"))
