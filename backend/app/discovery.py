"""Discovery surfaces: trending topics and theme labels.

Trending = recent items ranked by a freshness x engagement blend. This is the
Baidu 热搜 daily-habit hook. Theme labels map source_type to Web-Guide-style
buckets so results can be grouped in the UI.
"""
import math
from dataclasses import dataclass

from app.db import get_connection

# source_type -> human theme (Web Guide DNA)
THEME = {
    "paper": "Research",
    "release": "Releases",
    "news": "News",
    "discussion": "Discussion",
}


def theme_for(source_type: str) -> str:
    return THEME.get(source_type, "Other")


@dataclass
class Trending:
    id: int
    title: str
    url: str
    source: str
    source_type: str
    theme: str
    published_at: object | None
    heat: float


def trending(limit: int = 10, days: int = 14) -> list[Trending]:
    """Recent items scored by freshness x engagement. Newest, hottest first."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, url, source, source_type, published_at, external_score,
                   EXTRACT(EPOCH FROM (now() - COALESCE(published_at, fetched_at))) AS age_s
            FROM articles
            WHERE COALESCE(published_at, fetched_at) > now() - (%s || ' days')::interval
            """,
            (days,),
        ).fetchall()

    items: list[Trending] = []
    for (aid, title, url, source, stype, published, ext, age_s) in rows:
        age_days = float(age_s or 0) / 86400.0
        freshness = math.exp(-age_days / 7.0)          # decays over a week
        engagement = math.log1p(float(ext or 0))        # HN points etc., damped
        heat = freshness * (1.0 + engagement)
        items.append(
            Trending(aid, title, url, source, stype, theme_for(stype), published, heat)
        )

    items.sort(key=lambda t: t.heat, reverse=True)
    return items[:limit]
