import json
import sys
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

PLACES = {
    "Steal a Brainrot": 109983668079237,
    "Adopt Me": 920587237,
    "Bee Swarm Simulator": 1537690962,
    "Grow a Garden": 126884695634066,
    "Restaurant Tycoon 3": 119048529960596,
    "Pet Store Tycoon": 118845698633260,
    "Steal An Egg": 107778070777162,
    "Pet Simulator 99": 8737899170,
    "Theme Park Tycoon 2": 69184822,
    "Retail Tycoon 2": 5844955546,
    "Miner's Haven": 153852944,
    "McBusiness": 0,
    "Restaurant Tycoon 2": 1645057328,
}


def j(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8", "replace"))


def resolve(place):
    try:
        return j(f"https://apis.roblox.com/universes/v1/places/{place}/universe")["universeId"]
    except Exception:
        return None


for label, place in PLACES.items():
    if not place:
        print(f"\n{label}: no place id")
        continue
    u = resolve(place)
    if not u:
        print(f"\n{label}: resolve failed (place {place})")
        continue
    try:
        d = j(f"https://games.roblox.com/v1/games?universeIds={u}")["data"][0]
        v = j(f"https://games.roblox.com/v1/games/votes?universeIds={u}")["data"][0]
    except Exception as e:
        print(f"\n{label}: details failed {e}")
        continue
    name = d["name"].encode("ascii", "ignore").decode()
    print(f"\n{name}  [u={u}]")
    print(f"  CCU={d.get('playing',0):,}  visits={d.get('visits',0):,}  favs={d.get('favoritedCount',0):,}")
    print(f"  likes={v.get('upVotes',0):,}  dislikes={v.get('downVotes',0):,}  max={d.get('maxPlayers')}")
    print(f"  created={d.get('created','')[:10]}  genre={d.get('genre_l1','')}/{d.get('genre_l2','')}")
