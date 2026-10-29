import html
import re
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}


def ddg(q, n=8):
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": q})
    req = urllib.request.Request(url, headers=UA)
    t = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    out = []
    for m in re.finditer(r'result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', t, re.S):
        u = html.unescape(m.group(1))
        mm = re.search(r"uddg=([^&]+)", u)
        if mm:
            u = urllib.parse.unquote(mm.group(1))
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(2)))
        out.append((title.strip(), u))
        if len(out) >= n:
            break
    return out


def snippets(q, n=8):
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": q})
    req = urllib.request.Request(url, headers=UA)
    t = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    titles = ddg(q, n)
    sns = [html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
           for s in re.findall(r'result__snippet"[^>]*>(.*?)</a>', t, re.S)]
    for i, (ti, u) in enumerate(titles):
        print(f"{i}. {ti}\n   {u}")
        if i < len(sns):
            print("   >", sns[i][:400])
    return titles


if __name__ == "__main__":
    if sys.argv[1] == "s":
        snippets(" ".join(sys.argv[2:]))
    elif sys.argv[1] == "l":
        for ti, u in ddg(" ".join(sys.argv[2:]), 12):
            print(ti, "|", u)
