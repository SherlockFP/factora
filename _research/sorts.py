import json
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def j(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8", "replace"))


def sorts():
    return j("https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=s" + str(abs(hash("x")) % 99999) + "&device=computer&country=US")


def games(sort_id, width=100):
    url = ("https://apis.roblox.com/explore-api/v1/get-sort-content?"
           + urllib.parse.urlencode({"sessionId": "s1", "sortId": sort_id, "device": "computer", "width": width, "height": 300}))
    try:
        return j(url)
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if sys.argv[1] == "list":
        d = sorts()
        for s in d.get("sorts", []):
            print(s.get("sortId"), "|", s.get("sortDisplayName", "")[:40], "|", s.get("contentType"), s.get("games", [])[:1] and "hasgames" or "")
    else:
        for sid in sys.argv[1:]:
            d = games(sid)
            print("=== SORT", sid, list(d)[:6])
            for g in d.get("games", [])[:25]:
                n = g.get("name", "").encode("ascii", "ignore").decode()
                print(f'  {g.get("playerCount",0):>9,}  {n[:50]:<50} {g.get("rootPlaceId")}')
            if "games" not in d:
                print(json.dumps(d)[:400])
