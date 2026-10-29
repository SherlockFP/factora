import html
import re
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    raw = urllib.request.urlopen(req, timeout=30).read()
    return raw.decode("utf-8", "replace")


def bing(q, n=10):
    t = fetch("https://www.bing.com/search?" + urllib.parse.urlencode({"q": q, "setlang": "en", "cc": "us"}))
    blocks = re.findall(r'<li class="b_algo".*?</li>', t, re.S)
    out = []
    for b in blocks[:n]:
        m = re.search(r'<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', b, re.S)
        if not m:
            continue
        u = html.unescape(m.group(1))
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
        sn = re.search(r'<p[^>]*>(.*?)</p>', b, re.S)
        snip = html.unescape(re.sub(r"<[^>]+>", "", sn.group(1))).strip() if sn else ""
        out.append((title, u, snip))
    return out


if __name__ == "__main__":
    q = " ".join(sys.argv[1:])
    print("### QUERY:", q)
    for i, (ti, u, sn) in enumerate(bing(q), 1):
        print(f"{i}. {ti}\n   {u}\n   > {sn[:380]}")
