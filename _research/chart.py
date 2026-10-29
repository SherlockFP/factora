import json
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def omni(q):
    url = ("https://apis.roblox.com/search-api/omni-search?"
           + urllib.parse.urlencode({"searchQuery": q, "pageToken": "", "sessionId": "sess-" + q[:8], "pageType": "all"}))
    req = urllib.request.Request(url, headers=UA)
    d = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace"))
    rows = []
    for group in d.get("searchResults", []):
        if group.get("contentGroupType") != "Game":
            continue
        for g in group.get("contents", []):
            rows.append({
                "name": g.get("name", ""),
                "players": g.get("playerCount", 0),
                "up": g.get("totalUpVotes", 0),
                "down": g.get("totalDownVotes", 0),
                "universe": g.get("universeId"),
                "place": g.get("rootPlaceId"),
            })
    return rows


if __name__ == "__main__":
    seen = {}
    for q in sys.argv[1:]:
        try:
            for r in omni(q):
                seen.setdefault(r["universe"], r)
        except Exception as e:
            print("ERR", q, e, file=sys.stderr)
    rows = sorted(seen.values(), key=lambda r: -r["players"])
    for r in rows[:28]:
        ratio = r["up"] / max(1, r["up"] + r["down"]) * 100
        name = r["name"].encode("ascii", "ignore").decode()[:52]
        print(f'{r["players"]:>9,}  {ratio:5.1f}%  {name:<52} {r["place"]}')
