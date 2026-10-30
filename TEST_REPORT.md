# Tatlı Tycoon — E2E Test Raporu

Test tarihi: 2026-10-30 · Headless Chromium (NVIDIA D3D11, 60 fps) · `http://localhost:5520/?auto=solo&debug`
Build: index.html `f793811af5fa`, src/npcs.js `3a29789c482e`

| Test | Sonuç | Kanıt |
|---|---|---|
| 1 BOOT | ✅ | canvas var, pageerror 0, console error 0 |
| 2 HUD | ✅ | `💰 40` / `≈0/sn` DOM'da var |
| 3 WALK | ✅ | (0,12)→(0,9.4), hedef metni değişti, tezgah 0→1 |
| 4 PURCHASE | ✅ | owned 0→1, rate `≈0.8/sn` |
| 4b PASİF GELİR | ✅ | 36.34 → 36.55 (2 sn) |
| 5 FPS | ✅ | 60.7 fps |
| 6 BÖLGE 2 | ✅ | kilit toast'ı doğru, rebirth sonrası giriş/çıkış çalışıyor |
| 7 BELLEK 30 sn | ✅ | 16.1 MB, hata yok |
| 8 KAYIT | ✅ | reload sonrası coin/owned korundu |
| 9 UI MENÜLERİ | ❌ | `#achBtn` tıklaması 3000 ms timeout (canvas engelliyor) |
| 10 SERVİS+YÜKSELT | ✅ | served 0→5, level 1→2 |
| 11 KUYRUK SLOTU | ❌ | oyuncu slotta: müşteri `walk` 2.5u'da kilitli (11/14 örnek) |
| 12 UZAK SERVİS | ❌ | 94.8u uzaktaki yürüyen müşteri servis edildi, +16939 coin |
| 13 BÖLGE 1 SPAWN | ❌ | ilk müşteri 104u uzakta doğdu, 54 sn'de vardı |
| 14 KAZANMA | ✅ | 10/10 → winSheet açıldı |
| 15 RUSH | ✅ | 108 sn'de banner |
| 16 BELLEK SONU | ✅ | 15.0 MB |

## BULUNAN HATALAR

### 1. HUD ve sağ üst butonlar tıklanamıyor / görünmüyor (KRİTİK)
- **Dosya:** `index.html:13, 16, 227, 232, 362`
- CSS `#topbar{position:fixed;z-index:10}` (satır 16) hâlâ tanımlı ama DOM'da `<div id="topbar">` yok; `#hud` (227) ve `#topRight` (232) doğrudan `body` altında ve `position:fixed`/z-index kuralları kaldırılmış.
- Canvas en son `body.appendChild` ediliyor (362) ve `position:fixed;inset:0` (13), z-index `auto` → statik HUD'un üstüne boyanıyor ve tıklamaları yutuyor.
- **Kanıt:** `#hud` → `position:static, z-index:auto`; `elementFromPoint(achBtn merkezi)` = `["CANVAS","achBtn","topRight"]`; `page.click('#achBtn')` → `Timeout 3000ms exceeded`; `#leaveBtn` "not actionable". Ekran görüntüsü: `_test/fail-9.png` (HUD görünmüyor, sadece 3D sahne).
- **Tekrar:** `?auto=solo&debug` → oyuna gir → sağ üstteki ⭐ / ✖ butonuna tıkla.

### 2. Servis, henüz tezgaha varmamış müşteriye ödeme yapıyor
- **Dosya:** `index.html:2254-2260` (`serveAt` yalnızca oyuncu–tezgah mesafesini kontrol ediyor), `src/npcs.js:415` (`serve(i)` kuyruğun başındaki `walk` durumundaki NPC'yi de alıyor).
- **Kanıt:** Bölge 1'de tezgaha 94.8u uzakta, `state:"walk"` müşteri servis edildi; `servedDelta=1`, `coinsDelta=+16939.62`.

### 3. Bölge 1 müşterileri plazanın dışında doğuyor
- **Dosya:** `src/npcs.js:272-286` (`approachPoint` konumu `EDGE=17` sınırına göre kırpıyor; tezgah `z=-126` olduğu için spawn `z=-16`'ya düşüyor).
- **Kanıt:** İlk spawn tezgaha **104u** uzakta; `walk` 54 sn sürdü, oyuncu yanındayken kuyruk boş kaldı (`queue:null`).

### 4. Oyuncu kuyruk slotunda durunca müşteriler takılıyor
- **Dosya:** `index.html:4160-4172` (NPC'ler oyuncudan 2.8u uzağa itiliyor; `src/npcs.js:415` varış eşiği 0.22u).
- **Kanıt:** Oyuncu `(0,9.0)` slot 0 üzerindeyken 11/14 örnekte müşteri `walk@2.5` konumunda sabit kaldı; kuyruk ilerlemedi.
