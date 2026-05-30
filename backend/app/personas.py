"""Persona registry — data-driven lenses loaded from the `personas` table."""
import json
from dataclasses import dataclass

from app.db import get_connection


@dataclass
class Persona:
    key: str
    name: str
    tagline: str | None
    identity: str
    cares_about: list[str]
    noise: list[str]
    decision_lens: str
    trusted_signals: list[str]
    voice: str | None
    enabled: bool
    sort_order: int


def _row(r) -> Persona:
    def j(v):
        return v if isinstance(v, list) else json.loads(v or "[]")
    return Persona(
        key=r[0], name=r[1], tagline=r[2], identity=r[3],
        cares_about=j(r[4]), noise=j(r[5]), decision_lens=r[6],
        trusted_signals=j(r[7]), voice=r[8], enabled=r[9], sort_order=r[10],
    )


_COLS = ("key, name, tagline, identity, cares_about, noise, decision_lens, "
         "trusted_signals, voice, enabled, sort_order")


def list_personas(enabled_only: bool = True) -> list[Persona]:
    sql = f"SELECT {_COLS} FROM personas"
    if enabled_only:
        sql += " WHERE enabled"
    sql += " ORDER BY sort_order, name"
    with get_connection() as conn:
        return [_row(r) for r in conn.execute(sql).fetchall()]


def get_persona(key: str) -> Persona | None:
    with get_connection() as conn:
        r = conn.execute(
            f"SELECT {_COLS} FROM personas WHERE key = %s", (key,)
        ).fetchone()
    return _row(r) if r else None
