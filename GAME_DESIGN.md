# Tatlı Tycoon — Oyun Tasarım Dokümanı

> Sürüm 2.0 · Tek dosya HTML · Three.js · PeerJS (P2P) · Çocuk (7–12) hedef kitlesi

---

## 1. Vizyon

Roblox tycoon'larının en tutan döngüsünü — **"halıya bas → satın al → para aksın → yenisini aç"** — tek tıkla tarayıcıda oynanan, tatlı dükkanı temalı, arkadaşlarla oynanabilen bir oyuna sıkıştır.

**Tek cümle:** Kendi tatlı dükkanını sıfırdan imparatorluğa büyüt, arkadaşlarınla yarış.

**Neden tutar:**
- Anında anlaşılan döngü (0–10 sn içinde ilk satın alma)
- Sürekli büyüyen sayılar (juice: +1/sn → +500K/sn)
- Kısa oturum (ortalama 5–15 dk), kaydetme yok derdi yok (localStorage)
- Arkadaşla aynı lobi → sosyal rekabet + işbirliği

---

## 2. Çekirdek Döngü (Core Loop)

```
Para kazan (pasif gelir)
   ↓
Halıya yürü → tezgah satın al
   ↓
Gelir hızı artar (dopamin)
   ↓
Yeni tezgah açılır (ilerleme)
   ↓
Daha pahalı tezgah için bekle / rebirth yap
   ↓
↺ (döngü hızlanır — sayılar katlanır)
```

**Alt döngüler:**
- **Pet döngüsü:** Para biriktir → pet yumurtası al → pet çıkar → çarpan artar
- **Rebirth döngüsü:** Tüm tezgahlar açıldı → rebirth → kalıcı çarpan → baştan (ama hızlı)
- **Günlük döngü:** Gir → günlük ödül → streak artar
- **Sosyal döngü:** Oda kur → arkadaş katıl → leaderboard'da geç

---

## 3. İlerleme Sistemi

### 3.1 Tezgah Zinciri (Unlock Chain)

Her tezgah bir sonrakini açar. Fiyat/gelir oranı ~3–4x (Roblox tycoon standardı).

| # | Tezgah | Fiyat | Gelir/sn | Geri ödeme |
|---|--------|-------|----------|------------|
| 1 | Limonata Standı | 10 | 1 | 10 sn |
| 2 | Kurabiye Fırını | 40 | 4 | 10 sn |
| 3 | Dondurma Arabası | 120 | 10 | 12 sn |
| 4 | Meyve Suyu Barı | 350 | 30 | 12 sn |
| 5 | Pasta Atölyesi | 900 | 80 | 11 sn |
| 6 | Donut Kulesi | 2.500 | 200 | 12 sn |
| 7 | Çikolata Fabrikası | 8.000 | 600 | 13 sn |
| 8 | Şeker Diyarı | 25.000 | 2.000 | 12 sn |
| 9 | Gökkuşağı Kafe | 80.000 | 7.000 | 11 sn |
| 10 | Tatlı Krallığı | 250.000 | 25.000 | 10 sn |

**Tasarım kuralı:** Geri ödeme süresi 10–13 sn bandında kalır → oyuncu asla "bekliyorum" hissine düşmez, sürekli bir sonraki hedefe ulaşır.

### 3.2 Rebirth (Prestij)

Tüm tezgahlar açıkken rebirth yapılabilir:

- **Koşul:** 10 tezgahın hepsi açık
- **Ödül:** `ç arpan = 1 + (rebirth × 0.5)` → 1. rebirth: ×1.5, 2.: ×2.0, 3.: ×2.5 ...
- **Sıfırlanan:** Para, tezgahlar
- **Korunan:** Petler, günlük streak, toplam kazanç istatistiği
- **Bonus:** Her rebirth'te özel renk paleti / taç efekti

**Neden 0.5:** İlk rebirth ~5 dk, sonrakiler ~3 dk sürer. Çocuk oyuncu 10 dk içinde "prestij" tadını alır.

### 3.3 Petler

- 6 pet türü: Kedi, Köpek, Tavşan, Ejderha, Unicorn, Altın Kedi
- Pet çarpanı: +%25 → +%500 (nadirliğe göre)
- Pet yumurtası: 500 para (ilk), her alımda fiyat ×1.5
- Petler karakterin etrafında döner (animasyonlu)
- **Nadir pet şansı:** %60 yaygın, %30 nadir, %10 efsanevi (altın parçacık patlaması)

### 3.4 Çevrimdışı Kazanç

Oyun kapalıyken de para kazanılır:

```
offline = gelir/sn × geçen_saniye × 0.5   (maks 4 saat)
```

Girişte "Sen yokken X para kazandın!" popup'ı + toplama animasyonu.

### 3.5 Günlük Ödül

- Gün 1: 100 · Gün 2: 250 · Gün 3: 600 · Gün 4: 1.500 · Gün 5: 4.000 · Gün 6: 10.000 · Gün 7: 25.000 + pet
- Streak kırılırsa 1'e döner
- localStorage'da tarih takibi

---

## 4. Sosyal / Multiplayer (P2P)

### 4.1 Oda Sistemi
- **Oda Kur:** 4 harfli kod üretilir (`limtycoon-XXXX` PeerJS ID)
- **Katıl:** Kod gir → host'a bağlan
- **Kapasite:** 1 host + 3 client = 4 oyuncu
- Host otoriter: sahiplik ve para host'ta doğrulanır

### 4.2 Paylaşılan Dünya
- Her oyuncu kendi tezgahlarını açar (sahiplik renkli halka ile gösterilir)
- Diğer oyuncuların karakterleri görünür + isim etiketli
- Aynı tezgaha iki kişi basarsa ilk basan alır
- Sohbet yok (çocuk güvenliği) — sadece emote/parçacık

### 4.3 Leaderboard
- **Lobi sıralaması:** Aynı odadaki oyuncular, gelir/sn'ye göre
- **Yerel rekor:** localStorage'daki en yüksek gelir/sn (tek oyunculu)
- Madalyalar: 🥇🥈🥉, kendi satırın vurgulu

---

## 5. Juice / Geri Bildirim

Her satın almada üst üste binmiş 5 kanal:

| Kanal | Uygulama | Maliyet |
|-------|----------|---------|
| Parçacık | Altın + konfeti patlaması (12–30 küp) | Düşük |
| Yüzen yazı | "+80/sn!" ekranda yukarı süzülür | Düşük |
| Ses | Yükselen 3 notalı arpej (WebAudio) | Düşük |
| Kamera | 0.15 sn hafif sarsıntı + FOV pulse | Düşük |
| Renk | Tezgah spawn'da scale 0→1.15→1 bounce | Düşük |

**Para sayacı:** Sayılar yumuşak artar (lerp), 1.000 → "1K", 1.000.000 → "1M" formatı.

**Sürekli juice:** Para kazanırken periyodik altın parçacıkları tezgahlardan yükselir; arka planda kuş sesi/ambiyans yok (çocuk oyunlarında dikkat dağıtır).

---

## 6. Onboarding (İlk 30 Saniye)

1. **0–3 sn:** Menü → "Tek Oyna" → karakter belirir, "İlk tezgahına yürü!" oku gösterilir
2. **3–10 sn:** Limonata halısına yürür → otomatik satın alır → parçacık + ses patlaması + "+1/sn"
3. **10–20 sn:** "Harika! Şimdi Kurabiye Fırını'nı aç" hedefi → para sayacı hızlıca dolar (ilk tezgah 10 sn'de 40 verir → tam zamanında)
4. **20–30 sn:** İkinci satın alma → "Arkadaşını davet et!" kartı belirir

**Kurallar:** Metin balonu yok, sadece 3 satır hedef; her hedef tamamlanınca konfeti. Ok/halka göstergesi hedef halıyı işaret eder.

---

## 7. Ekranlar / Menüler

```
Ana Menü
├── ▶ Tek Oyna
├── 🏠 Oda Kur (4 harfli kod)
├── 🔑 Odaya Katıl
└── ⚙️ Ayarlar (ses aç/kapa)

Oyun HUD
├── 💰 Para + /sn
├── 🏆 Leaderboard butonu (sağ üst)
├── 🥚 Pet butonu (yumurta)
├── 🔄 Rebirth butonu (koşul dolunca parlar)
└── 📊 İstatistik (toplam kazanç, oynama süresi)

Sonuç Ekranı
├── 🎉 Rebirth kutlaması
├── Leaderboard özeti
└── Devam / Menü
```

---

## 8. Sanat Yönü

- **Stil:** Düşük poligon (low-poly), parlak doygun renkler, yumuşak gölgeler
- **Palet:** Gök mavisi #8fdcff · Çim #7ec850 · Pembe #ff9ecb · Altın #ffd400 · Kırmızı #ff5b5b
- **Prosedürel dokular:** Canvas ile üretilen damalı zemin, ahşap, mermer, çim
- **Font:** System-ui, kalın (900), beyaz + koyu kontur (çıkartma görünümü)
- **Karakterler:** Kapsül gövde + küre kafa + şapka (Roblox esintili ama özgün)

---

## 9. Teknik Mimari

```
index.html (tek dosya)
├── Three.js sahne (import map, unpkg CDN)
├── PeerJS (P2P, unpkg CDN)
├── Prosedürel doku üretici (canvas → CanvasTexture)
├── Oyun durumu (coins, rate, ownership[], pets, rebirth)
├── localStorage kayıt (5 sn'de bir + çıkışta)
├── Ağ katmanı (host otoriter state sync, 10 Hz)
├── Parçacık sistemi (havuzlanmış, 200 maks)
├── WebAudio ses (prosedürel, dosya yok)
└── UI katmanı (HTML overlay + CSS animasyon)
```

**Performans hedefleri:** 60 FPS masaüstü, 30+ FPS orta telefon. Çizim çağrısı <150. Gölge haritası 1024².

---

## 10. Yol Haritası

| Faz | İçerik | Durum |
|-----|--------|-------|
| v1 | Temel tycoon döngüsü, menü, P2P | ✅ tamam |
| v2 | Rebirth, petler, çevrimdışı kazanç, günlük ödül, leaderboard, juice, 10 tezgah, kayıt | 🔨 yapımda |
| v3 (sonra) | Ses müziği, pet animasyonları, kostümler, başarımlar | fikir |

---

## 11. Kaçınılacaklar (Anti-pattern)

- ❌ Zorunlu bekleme sayacı ("2 saat sonra açılır") → çocuk çıkar, dönmez
- ❌ Gerçek para / reklam → bu oyun için yok
- ❌ Karmaşık envanter/ekonomi → tek para birimi
- ❌ Sohbet → çocuk güvenliği
- ❌ Uzun tutorial → 30 sn'de bırak
- ❌ Gri/karanlık UI → her şey parlak ve dostça
