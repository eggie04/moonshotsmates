from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


class StateStore:
    def __init__(self, db_path: str = "data/state.db") -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self._init_tables()

    def _init_tables(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS episodes (
                guid TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                posted_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS joins (
                user_id TEXT NOT NULL,
                joined_date TEXT NOT NULL,
                PRIMARY KEY (user_id, joined_date)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS memes (
                signature TEXT PRIMARY KEY,
                posted_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS meme_templates_yearly (
                year INTEGER NOT NULL,
                template_id TEXT NOT NULL,
                used_at TEXT NOT NULL,
                PRIMARY KEY (year, template_id)
            )
            """
        )
        self.conn.commit()

    def has_episode(self, guid: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM episodes WHERE guid = ?", (guid,))
        return cur.fetchone() is not None

    def has_any_episodes(self) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM episodes LIMIT 1")
        return cur.fetchone() is not None

    def has_any_episodes_with_prefix(self, prefix: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM episodes WHERE guid LIKE ? LIMIT 1", (f"{prefix}%",))
        return cur.fetchone() is not None

    def save_episode(self, guid: str, title: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO episodes (guid, title, posted_at) VALUES (?, ?, ?)",
            (guid, title, datetime.now(timezone.utc).isoformat()),
        )
        self.conn.commit()

    def record_join(self, user_id: int, joined_date: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO joins (user_id, joined_date) VALUES (?, ?)",
            (str(user_id), joined_date),
        )
        self.conn.commit()

    def joins_for_date(self, joined_date: str) -> int:
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM joins WHERE joined_date = ?", (joined_date,))
        row = cur.fetchone()
        return int(row[0]) if row else 0

    def has_meme_signature(self, signature: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM memes WHERE signature = ?", (signature,))
        return cur.fetchone() is not None

    def save_meme_signature(self, signature: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO memes (signature, posted_at) VALUES (?, ?)",
            (signature, datetime.now(timezone.utc).isoformat()),
        )
        self.conn.commit()

    def used_meme_templates_for_year(self, year: int) -> set[str]:
        cur = self.conn.cursor()
        cur.execute("SELECT template_id FROM meme_templates_yearly WHERE year = ?", (year,))
        rows = cur.fetchall()
        return {str(row[0]) for row in rows}

    def save_meme_template_for_year(self, year: int, template_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO meme_templates_yearly (year, template_id, used_at) VALUES (?, ?, ?)",
            (year, template_id, datetime.now(timezone.utc).isoformat()),
        )
        self.conn.commit()
