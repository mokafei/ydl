"""视频字幕难度分析服务"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from sqlalchemy.orm import Session

from app.models import WordFrequency


@dataclass(slots=True)
class DifficultyStats:
    total_tokens: int
    unique_tokens: int
    covered_tokens: int
    difficulty_level: str
    coverage_ratio: float
    band_counts: Dict[str, int]
    rare_tokens: List[str]


class DifficultyAnalyzer:
    """基于 COCA 词频数据的难度分析器"""

    BANDS: List[Tuple[str, int]] = [
        ("1k", 1_000),
        ("2k", 2_000),
        ("3k", 3_000),
        ("5k", 5_000),
        ("8k", 8_000),
        ("12k", 12_000),
        ("20k", 20_000),
    ]

    LEVEL_THRESHOLDS: List[Tuple[str, float]] = [
        ("Beginner", 0.90),
        ("Elementary", 0.85),
        ("Intermediate", 0.80),
        ("Upper-Intermediate", 0.75),
        ("Advanced", 0.70),
    ]

    TOKEN_PATTERN = re.compile(r"[a-zA-Z']+")

    def __init__(self, db: Session):
        self.db = db
        self._frequency_cache: Dict[str, WordFrequency | None] = {}

    def analyse(self, transcript: str) -> DifficultyStats:
        tokens = self._extract_tokens(transcript)
        if not tokens:
            return DifficultyStats(
                total_tokens=0,
                unique_tokens=0,
                covered_tokens=0,
                difficulty_level="Unknown",
                coverage_ratio=0.0,
                band_counts={band: 0 for band, _ in self.BANDS} | {">20k": 0},
                rare_tokens=[],
            )

        frequencies = self._load_frequencies(tokens)
        band_counts, covered_tokens, rare_tokens = self._count_by_band(frequencies)

        coverage_ratio = covered_tokens / len(tokens)
        level = self._determine_level(coverage_ratio)

        return DifficultyStats(
            total_tokens=len(tokens),
            unique_tokens=len(set(tokens)),
            covered_tokens=covered_tokens,
            difficulty_level=level,
            coverage_ratio=coverage_ratio,
            band_counts=band_counts,
            rare_tokens=rare_tokens,
        )

    def _extract_tokens(self, text: str) -> List[str]:
        return [match.group().lower() for match in self.TOKEN_PATTERN.finditer(text or "")]

    def _load_frequencies(self, tokens: Iterable[str]) -> Dict[str, WordFrequency | None]:
        missing = [token for token in set(tokens) if token not in self._frequency_cache]
        if missing:
            rows = (
                self.db
                .query(WordFrequency)
                .filter(WordFrequency.lemma.in_(missing))
                .all()
            )
            for row in rows:
                self._frequency_cache[row.lemma] = row
            for token in missing:
                self._frequency_cache.setdefault(token, None)

        return {token: self._frequency_cache.get(token) for token in tokens}

    def _count_by_band(
        self, frequencies: Dict[str, WordFrequency | None]
    ) -> Tuple[Dict[str, int], int, List[str]]:
        band_counts = {band: 0 for band, _ in self.BANDS}
        band_counts[">20k"] = 0
        covered = 0
        rare_tokens: List[str] = []

        for token, freq in frequencies.items():
            if freq is None:
                rare_tokens.append(token)
                continue

            covered += 1
            band_key = self._get_band_key(freq.rank)
            band_counts[band_key] = band_counts.get(band_key, 0) + 1

        return band_counts, covered, rare_tokens

    def _get_band_key(self, rank: int) -> str:
        for band, threshold in self.BANDS:
            if rank <= threshold:
                return band
        return ">20k"

    def _determine_level(self, coverage_ratio: float) -> str:
        for level, threshold in self.LEVEL_THRESHOLDS:
            if coverage_ratio >= threshold:
                return level
        return "Expert"
