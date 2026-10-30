# Tatlı Tycoon — v3 Servis Döngüsü Planı

> Bu belge v2 oyununun neden "oyun gibi hissettirmediğini" ve v3'te neyin
> değiştiğini kaydeder. Kod: `index.html` + `src/service.js` + `src/npcs.js`.

---

## 1. Teşhis (v2)

| Problem | Kanıt |
|---|---|
| Oyuncu kararı yok | Halıya yürüyorsun, satın alma otomatik; her satın alma koşulsuz iyi |
| İçerik ~2 dakika | 10 tezgahın toplam bekleme süresi ≈100 sn; rebirth sonrası aynı şey |
| Ölü bekleme | 15 → 60 → 200 fiyat aralıklarında 10–15 sn boş durma |
| NPC'ler dekor | Müşteriler tezgaha yürüyor ama alışveriş yapmıyor |
| Bölge 2 softlock | Bölge 2 rebirth istiyor, rebirth 10 tezgah istiyor, 4 tezgah Bölge 2'de |
| Rebirth hatası | `doRebirth()` tanımsız `discount` yüzünden ReferenceError atıyordu |

---

## 2. Yeni çekirdek döngü

```
Müşteri tezgahına yürür → kuyruğa girer (sabır halkası)
        ↓
Sen tezgahın yanına git → E / SERVİS → para + kombo
        ↓
Kombo x2.5'e kadar büyür → hızlı servis +%50 bahşiş
        ↓
Para → yeni tezgah / seviye yükseltme / personel / pet
        ↓
Personel eski tezgahı otomatik işletir → yeni tezgaha koş
        ↓
6 tezgah → REBIRTH (x1.4 gelir) → Bölge 2 açılır → 4 yeni tezgah
```

Pasif gelir artık servis değerinin **%3.5'i**. Ana gelir elle servis.

---

## 3. Sistemler

### 3.1 Müşteri & kuyruk (`src/npcs.js`)
- Her sahip olunan tezgah kendi müşterisini üretir: 3.6 sn'de bir, %35 çift geliş.
- Tezgahın 7–10 birim uzağında doğar, kuyruk yerine yürür.
- Kuyruk kapasitesi seviyeyle 2 → 6.
- **Sabır 11 sn** (+0.7/seviye), halka küçülür; yalnızca oyuncu 10 birim içindeyken azalır (uzaktaki dükkan ceza yemez).
- Kuyruğun önündeki müşteri servis edilir; kalanlar bir öne kayar.
- **VİP müşteri** (%12): altın balon, 0.8× sabır, **3× ödeme** → hangi tezgaha koşacağın kararı.

### 3.2 Servis & kombo (`src/service.js`)
- Servis: tezgahın 4.2 birim yakınında `E` / `Space` / SERVİS butonu.
- Ödeme = `servisDeğeri × kombo × (1 + 0.5 × hız) × tatlıSaati × rebirth × pet`.
- Kombo: her servis +0.12, tavan **x2.5**, 5 sn içinde devam etmeli; her 5 komboda kutlama.
- Hız bonusu: müşteri ne kadar az beklediyse o kadar çok (anında servis +%50).

### 3.3 Seviye (`src/service.js`)
- Her tezgah **10 seviye**: seviye başına servis değeri +%50, kuyruk +1 (2 seviyede bir), müşteri akışı hızlanır, model büyür.
- Maliyet: `fiyat × 0.75 × 1.75^(seviye-1)`.

| Tezgah | Fiyat | Servis (Sv1) | Servis (Sv10) | Yükseltme Sv2 | Personel |
|---|---:|---:|---:|---:|---:|
| Limonata Standı | 15 | 2 | 11 | 11 | 75 |
| Kurabiye Fırını | 60 | 7 | 38 | 45 | 300 |
| Dondurma Arabası | 200 | 24 | 132 | 150 | 1.000 |
| Meyve Suyu Barı | 650 | 80 | 440 | 488 | 3.250 |
| Pasta Atölyesi | 2.000 | 260 | 1.430 | 1.500 | 10.000 |
| Donut Kulesi | 6.000 | 900 | 4.950 | 4.500 | 30.000 |
| Çikolata Fabrikası | 18.000 | 3.000 | 16.500 | 13.500 | 90.000 |
| Şeker Diyarı | 55.000 | 10.000 | 55.000 | 41.250 | 275.000 |
| Gökkuşağı Kafe | 160.000 | 32.000 | 176.000 | 120.000 | 800.000 |
| Tatlı Krallığı | 500.000 | 110.000 | 605.000 | 375.000 | 2.500.000 |

### 3.4 Personel
- Seviye 3'te açılır, maliyet `fiyat × 5`.
- 4.2 sn'de bir kuyruğun önünü **%65 ödemeyle** servis eder, kombo kazandırmaz.
- Eski tezgahları ayakta tutar; oyuncu yeni tezgaha odaklanır.

### 3.5 Tatlı Saati
- Her 110 sn'de 18 sn: müşteri akışı 2×, ödeme x1.6, ekran bandı + ses.

### 3.6 Rebirth ve Bölge 2
- Rebirth artık **ana plazadaki 6 tezgah** ile yapılır (softlock çözüldü).
- Rebirth: para/tezgah/seviye/personel sıfırlanır; tohum para `40 × (1 + 0.5×rebirth)` verilir.
- Kalıcı: petler, başarımlar, rebirth çarpanı (x1.4, x1.8, …), fiyat indirimi (%8/rebirth).
- İlk rebirth'te **Bölge 2** açılır (4 tezgah).

---

## 4. Arayüz

- HUD: para + `≈X/sn` potansiyel; kombo sırasında `🔥 x2.3 kombo`.
- Sağ altta **SERVİS** butonu (kuyruk sayısı badge'i, VİP'te `⭐ VİP`).
- Tezgah yakınında **yükselt / personel** paneli; maliyet ve kilit durumu görünür.
- Hedef şeridi servis odaklı: "müşteriye servis yap" → "kombo yap" → "yükselt" → "sıradaki tezgah".
- Mobil: joystick sol, bakış sağ, servis butonu sağ alt; panel joystick'in üstünde.

---

## 5. Dosyalar

| Dosya | İçerik |
|---|---|
| `src/service.js` | Saf matematik: seviye, maliyet, ödeme, kombo, tatlı saati + Node testleri |
| `src/npcs.js` | Müşteri üretimi, kuyruk, yürüme, sabır halkası, VİP, `serve(i)` API |
| `index.html` | Oyun durumu, ekonomi, arayüz, render, P2P, kayıt |

## 6. Doğrulama

```bash
node src/service.js   # denge ve kombo/zamanlayıcı testleri
node src/quests.js    # görev zinciri testleri
python -m http.server 8123   # tarayıcıda oyna
```

Tarayıcı testleri: satın alma, servis (E + buton), kombo, VİP, yükseltme, personel,
tatlı saati bandı, rebirth (hata yok + kayıt), kayıt/yükleme, 390px yerleşim.

## 6.1 v3.1 — his ve görsellik turu

- **Yetenekler (⚡):** hız, servis menzili, kombo süresi, bahşiş, kuyruk. Rebirth'te korunur.
- **Servis hissi:** müşteriden HUD'a uçan altın para, para rozetinde nabız, kombo ekran parlaması,
  "MÜKEMMEL" hızlı servis geri bildirimi, VİP'te beyaz flaş, servis edilen müşterinin sevinç zıplaması.
- **Kuyruk rozetleri:** tezgahın üstünde kaç müşteri beklediği uzaktan görünür (VİP'te altın).
- **Gökyüzü:** gradyan kubbe + güneş parlaması.
- **Blender varlıkları:** `assets/build_props.py` headless çalışır, `assets/props/*.glb` üretir;
  ağaç (3 çeşit), fener, bank, bulut ve tabela modelleri oyuna yüklenir. Yüklenemezse eski basit modeller kalır.

## 6.2 v4 — görsel kimlik ve ritim turu

- **10 Blender tezgah modeli:** `assets/build_stalls.py` headless çalışır, `assets/props/stall_*.glb`
  üretir (limonata, fırın, dondurma, meyve suyu, pasta, donut, çikolata, şeker, gökkuşağı, krallık).
  Her modelde: renkli tente + saçak, ahşap direk, ön panel amblemi (oyuncunun en çok gördüğü yer),
  askılı tabela, tezgah üstü ürünler. Yüklenemezse prosedürel modeller devrede kalır.
  Kontak sayfası: `assets/build_stalls.py` sonrası `assets/preview_stalls.py`.
- **Gün/gece döngüsü (240 sn):** gökyüzü tonu, güneş yayı + rengi, hemisfer ışığı, sis rengi,
  gece yıldızları ve ay, fener halesi. Faz değişiminde kısa bildirim. `?tod=night|dusk|dawn` ile zorlanabilir.
- **Servis ritmi:** SERVİS butonunun üstündeki ibre yeşil bölgedeyken servis edilirse **x1.8 MÜKEMMEL**
  (x1.25 İYİ). Refleks katmanı: para kazanmak artık zamanlama da istiyor.
- **Ses:** kalabalık ambiyansı (filtrelenmiş gürültü + LFO, prosedürel), mükemmel servis çan arpeji.
  Müzik kapalıysa (`tatli_music = 0`) ambiyans da başlamaz.
- **Çok oyunculu:** servis anı odadaki herkese yayınlanır (`fx` mesajı) — diğer oyuncunun
  tezgahında parıltı, para yazısı ve VİP flaşı görünür.
- **Kamera/insan akışı:** müşteriler oyuncunun bulunduğu yönden değil, tezgahın arkasından yaklaşır;
  yürüyen müşteriler kişisel alana giremez (kuyruktakiler yerinde kalır).
- **Birinci şahıs tepsisi:** kameraya bağlı ahşap tepsi + kek/bardak; yürürken hafif sallanır,
  servis anında öne atılır (`vmKick`). Tezgah rengine göre ürün rengi değişir.
- **Yürüyüş yolu:** düz bej slab yerine taş dokulu düzlemler (spawn koridoru + doğu-batı ekseni) + bordür.
- **Etiket yüksekliği:** tezgah isimleri 4.35, kuyruk rozetleri 5.2 — yeni modellerin üstünde kalır.
- **Kamera konforu:** yüzüne giren müşteri gizlenir, yürüyen müşteriler 2.8 birim kişisel alana girmez.

## 7. Sonraki adımlar (fikir)

- Tezgah başına 2. personel / kasiyer yükseltmesi
- Günlük görevlerin servis sayısına bağlanması
- Bölge 2'ye özel müşteri tipi (turist: 2× bahşiş, 0.6× sabır)
- Ortak oyun: diğer oyuncunun kuyruğunu devralma / bahşiş paylaşımı
