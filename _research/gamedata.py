import json
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def j(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8", "replace"))


def omni(q):
    url = ("https://apis.roblox.com/search-api/omni-search?"
           + urllib.parse.urlencode({"searchQuery": q, "pageToken": "", "sessionId": "s-" + str(abs(hash(q)) % 10**8), "pageType": "all"}))
    out = []
    for g in j(url).get("searchResults", []):
        if g.get("contentGroupType") == "Game":
            out.extend(g.get("contents", []))
    return out


def details(universe):
    d = j(f"https://games.roblox.com/v1/games?universeIds={universe}")["data"]
    return d[0] if d else None


def votes(universe):
    try:
        d = j(f"https://games.roblox.com/v1/games/votes?universeIds={universe}")["data"]
        return d[0] if d else {}
    except Exception:
        return {}


if __name__ == "__main__":
    for q in sys.argv[1:]:
        try:
            c = omni(q)
        except Exception as e:
            print("ERR", q, e, file=sys.stderr)
            continue
        if not c:
            print("none:", q)
            continue
        g = max(c, key=lambda x: x.get("playerCount", 0))
        u = g["universeId"]
        d = details(u) or {}
        v = votes(u)
        name = d.get("name", g["name"]).encode("ascii", "ignore").decode()
        print(f'\n{name}')
        print(f'  CCU={d.get("playing",0):,} visits={d.get("visits",0):,} favs={d.get("favoritedCount",0):,} '
              f'likes={v.get("upVotes",0):,} dislikes={v.get("downVotes",0):,}')
        print(f'  created={d.get("created","")[:10]} updated={d.get("updated","")[:10]} maxPlayers={d.get("maxPlayers")}')
        print(f'  genre={d.get("genre","")} / {d.get("genre_l1","")}')
        desc = " ".join(d.get("description", "").split())
        print("  desc:", desc[:300].encode("ascii", "ignore").decode())
