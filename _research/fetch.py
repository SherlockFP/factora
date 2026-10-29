import json, os, re, sys, urllib.parse, urllib.request

OUT = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def get(url, **params):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def wiki_search(q, limit=5):
    raw = get("https://roblox.fandom.com/api.php", action="query", list="search",
              srsearch=q, srlimit=limit, format="json", formatversion=2)
    return [r["title"] for r in json.loads(raw).get("query", {}).get("search", [])]


def wiki_text(page):
    raw = get("https://roblox.fandom.com/api.php", action="parse", page=page,
              prop="wikitext", format="json", formatversion=2)
    d = json.loads(raw)
    if "error" in d:
        return None
    return d["parse"]["wikitext"]


def clean(t):
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.S)
    t = re.sub(r"<ref[^>]*/>", "", t)
    t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"<gallery.*?</gallery>", "", t, flags=re.S)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"'{2,}", "", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "search":
        for q in sys.argv[2:]:
            print("===", q)
            for title in wiki_search(q):
                print("   ", title)
    elif mode == "dump":
        for page in sys.argv[3:]:
            t = wiki_text(page)
            if t is None:
                print("=== MISSING", page)
                continue
            c = clean(t)
            fn = os.path.join(OUT, re.sub(r"[^A-Za-z0-9]+", "_", page)[:60] + ".txt")
            open(fn, "w", encoding="utf-8").write(c)
            print("===", page, "chars", len(c), "->", fn)
    elif mode == "show":
        fn = os.path.join(OUT, sys.argv[2])
        t = open(fn, encoding="utf-8").read()
        start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        print(t[start:start + int(sys.argv[4] if len(sys.argv) > 4 else 3000)])
