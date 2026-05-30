"""Probe a big candidate list of AI RSS/Atom feeds. Keep only ones that return a
parseable feed with entries. Prints a Python-ready list of working feeds.

Run: python scripts/probe_feeds.py
"""
import concurrent.futures as cf

import feedparser
import httpx

UA = "ai-search-experience/0.1 (+https://github.com/hdviettt/ai-search-experience)"

# (name, source_type, base_url, feed_url)
CANDIDATES = [
    # --- Frontier labs / companies (release) ---
    ("openai-blog", "release", "https://openai.com", "https://openai.com/news/rss.xml"),
    ("deepmind-blog", "release", "https://deepmind.google", "https://deepmind.google/blog/rss.xml"),
    ("huggingface", "release", "https://huggingface.co", "https://huggingface.co/blog/feed.xml"),
    ("google-ai-blog", "news", "https://blog.google", "https://blog.google/technology/ai/rss"),
    ("google-research", "release", "https://research.google", "https://research.google/blog/rss/"),
    ("microsoft-research", "release", "https://www.microsoft.com/en-us/research", "https://www.microsoft.com/en-us/research/feed/"),
    ("aws-ml-blog", "release", "https://aws.amazon.com", "https://aws.amazon.com/blogs/machine-learning/feed/"),
    ("nvidia-blog", "release", "https://blogs.nvidia.com", "https://blogs.nvidia.com/feed/"),
    ("meta-ai", "release", "https://ai.meta.com", "https://ai.meta.com/blog/rss/"),
    ("apple-ml", "release", "https://machinelearning.apple.com", "https://machinelearning.apple.com/rss.xml"),
    ("cohere-blog", "release", "https://cohere.com", "https://cohere.com/blog/rss.xml"),
    ("stability-ai", "release", "https://stability.ai", "https://stability.ai/news?format=rss"),
    ("mistral-news", "release", "https://mistral.ai", "https://mistral.ai/news/feed.xml"),
    ("anthropic-news", "release", "https://www.anthropic.com", "https://www.anthropic.com/news/rss.xml"),
    ("bair-blog", "release", "https://bair.berkeley.edu", "https://bair.berkeley.edu/blog/feed.xml"),
    ("deepmind-medium", "release", "https://medium.com", "https://medium.com/feed/syncedreview"),

    # --- News / analysis (news) ---
    ("import-ai", "news", "https://importai.substack.com", "https://importai.substack.com/feed"),
    ("the-batch", "news", "https://www.deeplearning.ai", "https://www.deeplearning.ai/the-batch/rss.xml"),
    ("techcrunch-ai", "news", "https://techcrunch.com", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("venturebeat-ai", "news", "https://venturebeat.com", "https://venturebeat.com/category/ai/feed/"),
    ("mit-tech-review-ai", "news", "https://www.technologyreview.com", "https://www.technologyreview.com/topic/artificial-intelligence/feed"),
    ("the-verge-ai", "news", "https://www.theverge.com", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
    ("ars-technica-ai", "news", "https://arstechnica.com", "https://arstechnica.com/ai/feed/"),
    ("the-register-ai", "news", "https://www.theregister.com", "https://www.theregister.com/software/ai_ml/headlines.atom"),
    ("zdnet-ai", "news", "https://www.zdnet.com", "https://www.zdnet.com/topic/artificial-intelligence/rss.xml"),
    ("wired-ai", "news", "https://www.wired.com", "https://www.wired.com/feed/tag/ai/latest/rss"),
    ("ainews-smol", "news", "https://buttondown.com", "https://buttondown.com/ainews/rss"),
    ("semianalysis", "news", "https://www.semianalysis.com", "https://www.semianalysis.com/feed"),
    ("simonwillison", "news", "https://simonwillison.net", "https://simonwillison.net/atom/everything/"),
    ("ben-evans", "news", "https://www.ben-evans.com", "https://www.ben-evans.com/benedictevans?format=rss"),
    ("interconnects", "news", "https://www.interconnects.ai", "https://www.interconnects.ai/feed"),
    ("oneusefulthing", "news", "https://www.oneusefulthing.org", "https://www.oneusefulthing.org/feed"),

    # --- Research / engineering blogs (release) ---
    ("lilian-weng", "release", "https://lilianweng.github.io", "https://lilianweng.github.io/index.xml"),
    ("distill", "release", "https://distill.pub", "https://distill.pub/rss.xml"),
    ("sebastian-raschka", "release", "https://magazine.sebastianraschka.com", "https://magazine.sebastianraschka.com/feed"),
    ("jay-alammar", "release", "https://jalammar.github.io", "https://jalammar.github.io/feed.xml"),
    ("eugene-yan", "release", "https://eugeneyan.com", "https://eugeneyan.com/rss/"),
    ("chip-huyen", "release", "https://huyenchip.com", "https://huyenchip.com/feed.xml"),
    ("hazyresearch", "release", "https://hazyresearch.stanford.edu", "https://hazyresearch.stanford.edu/blog/feed.xml"),

    # --- Community / discussion (discussion) ---
    ("reddit-ml", "discussion", "https://www.reddit.com", "https://www.reddit.com/r/MachineLearning/.rss"),
    ("reddit-localllama", "discussion", "https://www.reddit.com", "https://www.reddit.com/r/LocalLLaMA/.rss"),
    ("reddit-artificial", "discussion", "https://www.reddit.com", "https://www.reddit.com/r/artificial/.rss"),
    ("reddit-singularity", "discussion", "https://www.reddit.com", "https://www.reddit.com/r/singularity/.rss"),
    ("hf-papers", "paper", "https://huggingface.co", "https://huggingface.co/papers/feed"),
]


def probe(item):
    name, stype, base, url = item
    try:
        r = httpx.get(url, timeout=20, follow_redirects=True, headers={"User-Agent": UA})
        if r.status_code != 200:
            return (name, "HTTP %d" % r.status_code, 0, item)
        f = feedparser.parse(r.text)
        n = len(f.entries)
        return (name, "ok" if n else "0 entries", n, item)
    except Exception as exc:  # noqa: BLE001
        return (name, type(exc).__name__, 0, item)


def main():
    results = []
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        for res in ex.map(probe, CANDIDATES):
            results.append(res)

    working = [r for r in results if r[1] == "ok"]
    dead = [r for r in results if r[1] != "ok"]

    print(f"\n=== WORKING ({len(working)}) ===")
    for name, status, n, item in sorted(working, key=lambda x: -x[2]):
        print(f"  {name:24} {n:4} entries  {item[3]}")

    print(f"\n=== DEAD ({len(dead)}) ===")
    for name, status, n, item in dead:
        print(f"  {name:24} {status:16} {item[3]}")

    # Emit insert-ready tuples for the working set.
    print("\n=== WORKING_FEEDS (paste-ready) ===")
    for name, status, n, item in working:
        print(f'    ("{item[0]}", "{item[1]}", "{item[2]}", "{item[3]}"),')


if __name__ == "__main__":
    main()
