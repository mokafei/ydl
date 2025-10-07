"""
下载并处理 COCA 词频数据
"""
import csv
import urllib.request
import os

COCA_URL = "https://raw.githubusercontent.com/brucewlee/COCA-WordFrequency/main/COCA_WordFrequency.csv"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "coca_5000.csv")

def download_coca():
    """下载 COCA 词频表"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("正在下载 COCA 词频数据...")
    urllib.request.urlretrieve(COCA_URL, OUTPUT_FILE)
    print(f"下载完成: {OUTPUT_FILE}")

    with open(OUTPUT_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        print(f"共加载 {len(rows)} 个词汇")
        print(f"前5个词: {[row['lemma'] for row in rows[:5]]}")

if __name__ == "__main__":
    download_coca()