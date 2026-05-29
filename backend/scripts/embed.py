"""Backfill embeddings: article-level (title+summary) and chunk-level (body).

Idempotent — only processes articles whose embedding is NULL.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import get_connection  # noqa: E402
from app.embed import chunk_text, embed  # noqa: E402

BATCH = 64


def main() -> None:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, summary, body
            FROM articles
            WHERE embedding IS NULL
            ORDER BY id
            """
        ).fetchall()

    if not rows:
        print("Nothing to embed.")
        return

    print(f"Embedding {len(rows)} articles ...")
    done = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]

        # Article-level vectors from title + summary.
        doc_texts = [f"{r[1]}\n\n{r[2] or ''}".strip() for r in batch]
        doc_vecs = embed(doc_texts, input_type="document")

        with get_connection() as conn:
            for (aid, title, summary, body), vec in zip(batch, doc_vecs):
                conn.execute(
                    "UPDATE articles SET embedding = %s WHERE id = %s", (vec, aid)
                )
                # Chunk-level vectors from body.
                chunks = chunk_text(body or summary or "")
                if chunks:
                    cvecs = embed(chunks, input_type="document")
                    conn.execute("DELETE FROM chunks WHERE article_id = %s", (aid,))
                    for idx, (ctext, cvec) in enumerate(zip(chunks, cvecs)):
                        conn.execute(
                            """
                            INSERT INTO chunks (article_id, chunk_index, content, embedding)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (article_id, chunk_index) DO NOTHING
                            """,
                            (aid, idx, ctext, cvec),
                        )
            conn.commit()
        done += len(batch)
        print(f"  {done}/{len(rows)}")

    print("Done.")


if __name__ == "__main__":
    main()
