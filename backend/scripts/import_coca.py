"""
将 COCA 词频数据导入数据库
"""
import csv
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app.models import WordFrequency

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "coca_5000.csv")


def import_coca():
    session = SessionLocal()
    try:
        with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            unique_words = {}
            duplicate_count = 0
            for row in reader:
                lemma = row["lemma"].strip().lower()
                if lemma in unique_words:
                    duplicate_count += 1
                    continue

                unique_words[lemma] = WordFrequency(
                    lemma=lemma,
                    pos=row.get("PoS"),
                    rank=int(row["rank"]),
                    frequency=int(row["freq"]),
                    per_million=float(row["perMil"]),
                )

            session.query(WordFrequency).delete()
            session.bulk_save_objects(list(unique_words.values()))
            session.commit()
            print(f"导入 {len(unique_words)} 条词频记录（忽略重复 {duplicate_count} 条）")
    finally:
        session.close()


if __name__ == "__main__":
    import_coca()