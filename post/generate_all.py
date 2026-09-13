# -*- coding: utf-8 -*-
import os
import sys

# Ensure post directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from blueprint_400 import get_all_400_blueprints
from generator_engine import generate_full_article

POST_ROOT = r"C:\Users\seans\hope\epsilonfeed\post"

def main():
    blueprints = get_all_400_blueprints()
    print(f"Total articles to generate: {len(blueprints)}")

    success_count = 0
    total_chars = 0

    for idx, item in enumerate(blueprints):
        folder = item["folder"]
        filename = item["filename"]
        target_dir = os.path.join(POST_ROOT, folder)
        os.makedirs(target_dir, exist_ok=True)

        target_file = os.path.join(target_dir, filename)

        # Generate markdown content
        md_text = generate_full_article(item)

        # Write to file with utf-8 encoding
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(md_text)

        success_count += 1
        total_chars += len(md_text)

        if success_count % 50 == 0 or success_count == len(blueprints):
            print(f"[{success_count}/{len(blueprints)}] Generated {folder}/{filename} ({len(md_text)} chars)")

    avg_chars = total_chars // success_count if success_count else 0
    print(f"\nSuccessfully generated all {success_count} Markdown articles!")
    print(f"Total characters: {total_chars:,} (Average: {avg_chars} chars per article)")

if __name__ == "__main__":
    main()
