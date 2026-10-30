# Tatlı Tycoon — Tutundurma (Retention) Raporu

> Kaynak: `index.html`, `src/service.js`, `src/npcs.js`, `src/quests.js` okundu;
> Roblox resmî tasarım dokümanları ve 9 rakip oyunun mekanikleri incelendi.
> Boyutlar: **S** ≤ yarım gün · **M** 1–2 gün · **L** 3+ gün.

---

## 1. İlk oturum: 0-15 dakika

Hedef: 15. dakikada oyuncu **ilk rebirth'ini yapmış**, Bölge 2'yi görmüş ve
"yarın şunu açacağım" diyebiliyor olmalı. Aşağıdaki bloklar bu hedefe göre
sıralandı; mevcut kodun gerçek sayılarıyla (başlangıç 40 💰, limonata 15 💰,
servis tabanı 2 💰, müşteri aralığı 3.6 sn, sabır 11 sn) yazıldı.

### 0:00–0:30 — İlk temas
- **Oyuncu ne yapar:** Menüde adını yazar, "▶ TEK OYNA"ya basar, 2 saniye yürür.
  İlk tezgah menzile girince **otomatik** satın alınır (kod: `d < 3.8 → tryBuy`).
  Ekrana ilk müşteri gelir, `E` / SERVİS ile ilk servis yapılır.
- **Ödül nerede patlar:** Satın almada 5 kanal aynı anda (parçacık + ses + sarsıntı
  + FOV + toast). İlk serviste müşteriden HUD'a uçan altın para, kombo x1.1,
  "HIZLI +3" yazısı. Bu, oyundaki en yoğun 10 saniye.
- **Rakip kanıtı:** Roblox resmî FTUE dokümanı: "neşeli an ideal olarak oyuna
  girdikten sonraki **5 dakika içinde**" gerçekleşmeli. Pet Simulator 99 ilk
  yumurtayı ilk dakikada verdirir; oyuncu 1 dakikada "topladım" der.

### 0:30–2:00 — İlk yükseltme ve görev zinciri
- **Oyuncu ne yapar:** 4 müşteri servis eder, 11 💰'ye limonata tezgahını Sv2 yapar.
  Bu anda öğretici hedefleri biter, `src/quests.js` zinciri devreye girer
  (`tutorialDone = served >= 4 && stationLevel(0) >= 2`). İlk görev ödülü 12 💰.
- **Ödül nerede patlar:** "📜 İlk tezgahını aç +12 💰" toast'ı; ardından
  **günlük ödül** (yeni oyuncuda 30. saniyede) 25 💰 ile modal açar.
- **Rakip kanıtı:** Roblox görev dokümanı: "öğretici görevler her adımı
  ödüllendirmeli, öğrenmenin kendisi kazandırmalı". Kurabiye Fırını 60 💰 —
  görev ödülü + günlük ödül bunu 2. dakikada finanse eder. Adopt Me'de de ilk
  yumurta ilk dakikalarda alınır ve oyuncu "benim oldu" der.

### 2:00–5:00 — İkinci ve üçüncü tezgah (sayılar katlanır)
- **Oyuncu ne yapar:** Kurabiye (60) → Dondurma (200). Servis değeri 2 → 7 → 24.
  Görev ödülleri 48 ve 160 💰 gelir; sayı 10 katına çıkar.
  Tatlı Saati ilk kez **110. saniyede** patlar (18 sn, x1.6 ödeme).
- **Ödül nerede patlar:** İlk kez "tezgahlar arası koşu" başlar — iki kuyruk,
  iki kombo, 5 saniyelik kombo penceresi. VİP (%12) ilk kez görünür: 3× ödeme,
  altın balon, ekran flaşı.
- **Rakip kanıtı:** Restaurant Tycoon 2'nin tüm çekirdeği budur: NPC müşteriye
  servis → para → mobilya/yükseltme. Grow a Garden'da ilk 5 dakikada 3 farklı
  tohum alınır ve gelir eğrisi görünür şekilde dikleşir.

### 5:00–8:00 — Personel: ilk "ben olmadan da çalışıyor" anı
- **Oyuncu ne yapar:** Bir tezgahı Sv3 yapar, `fiyat × 5` = 75 💰'ye personel alır.
  Personel 4.2 saniyede bir %65 ödemeyle servis eder, kombo vermez.
  Oyuncu artık eski tezgahtan ayrılıp yenisine koşabilir.
- **Ödül nerede patlar:** İlk kez "arkamı döndüm, para hâlâ geliyor" hissi.
  Bu, tycoon türünün asıl dopamini: **delege etme**.
- **Rakip kanıtı:** Pet Simulator 99'un tam sürüm özelliği "engelleri otonom
  kıran petler"dir; oyuncunun yerine çalışan bir şey izlemek türün temel zevki.
  Steal a Brainrot'ta konveyörden alınan beyinler de aynı işi yapar.

### 8:00–11:00 — Ritim katmanı ve ilk "ben iyiyim" anı
- **Oyuncu ne yapar:** SERVİS butonunun üstündeki ibre yeşil bölgedeyken servis
  eder → x1.8 "MÜKEMMEL". Kombo x2.0'ı geçer, 5'lik kombo kutlaması gelir.
  Meyve Suyu (650) ve Pasta Atölyesi (2000) açılır.
- **Ödül nerede patlar:** Beceri ile para arasında ilk kez nedensellik kurulur:
  zamanlama → x1.8. Ekranda "MÜKEMMEL" yazısı + çan arpeji.
- **Rakip kanıtı:** Dress to Impress'in tüm tutundurması performans→sıralama
  döngüsü: 360 saniyede giydir, podyuma çık, oy al. Beceri ölçülür ve gösterilir.
  Bizim ritim barı aynı işlevi görmeli — ama şu an cezalandırıcı (bkz. §3).

### 11:00–15:00 — Rebirth ve Bölge 2: oturumun zirvesi
- **Oyuncu ne yapar:** 6. tezgahı (Donut, 6000) açar, rebirth yapar: para/tezgah/
  seviye/personel sıfırlanır, kalıcı x1.4 gelir + %8 fiyat indirimi + Bölge 2 açılır.
  Altın halka patlaması, 70 parçacık, hitstop, FOV punch.
- **Ödül nerede patlar:** Rebirth, oyunun en büyük tek kutlaması. Ardından
  Bölge 2'nin kilidi açılır — yeni harita, yeni 4 tezgah, yeni hedef.
- **Rakip kanıtı:** Steal a Brainrot'ta rebirth "sıfırla, daha iyi stat al" olarak
  tüm ilerlemenin üstüne oturur ve oyunun 25.4M eşzamanlı oyuncuya çıkmasının
  taşıyıcısıdır. Grow a Garden'da haftalık güncelleme döngüsü aynı işi yapar:
  her hafta "baştan ama daha hızlı".
- **Risk:** Mevcut eğriyle ilk rebirth bir çocuk için 15 dakikaya **sığmıyor**
  (bkz. §3, madde 7). Bu blok hedef; bugünkü haliyle 20–30 dakika.

---

## 2. Geri dönüş kancaları (D1 / D7)

Tam 6 mekanik. Her biri: tek cümle, rakip kanıtı, ≤4 cümle uygulama taslağı,
boyut. Sonunda etki ÷ maliyet sıralaması.

### 1. Günün Tatlısı (7 günlük takvim, yarını göster)
Yedi günlük ödül takvimi; oyuncu bugünü alırken **yarın ne geleceğini** görür.
- **Rakip kanıtı:** Dress to Impress, Aralık 2024'te "her gün oynayana özel ödül"
  veren takvimle günlük dönüşü kanıtladı; Grow a Garden haftalık özel eşyaları
  doğrudan "oyuncu tutundurmasını artıran" mekanik olarak raporluyor.
- **Uygulama:** Mevcut `checkDaily()` zaten `DAILY[7]` dizisi ve streak tutuyor;
  sadece modal'ı 7 kutulu bir şeride çevir, alınanları ✓ yap, yarını parlat.
  `state.dailyLast`/`dailyDay` localStorage'da; sunucu gerekmez.
  Kaçırılan gün streak'i 1'e döndürür — bunu modalda tek cümleyle söyle.
- **Boyut:** S

### 2. Haftanın Özel Tatlısı (dönen sınırlı tezgah/pet görünümü)
Her hafta değişen, sadece o hafta alınabilen renk varyantı bir tezgah veya pet.
- **Rakip kanıtı:** Adopt Me'nin pet varyantları ve Pet Simulator 99'un iki haftada
  bir güncelleme takvimi; Roblox'un "content cadence" dokümanı bunu açıkça
  "mevcut sistemleri yeniden kullanan, 3 haftadan az emekle" tarif ediyor.
- **Uygulama:** Hafta numarası `Math.floor(Date.now()/604800000)`; 8 sabit varyant
  dizisi (renk paleti + isim) seç. Tezgah modeli prosedürel renk değişimiyle
  üretildiği için yeni GLB gerekmez; `M()` rengini varyant rengine bağla.
  Satın alma `state.owned` yanında `state.skinWeek` olarak kaydedilir; kaçırılan
  hafta geri gelmez (bu his önemli).
- **Boyut:** M

### 3. Uyurken Dükkan Çalıştı (çevrimdışı hasat ritüeli)
Oyuna dönüşün ilk 3 saniyesinde "sen yokken kazandın" ekranı, tek dokunuşla toplama.
- **Rakip kanıtı:** Grow a Garden'ın temel çekicisi "ekinler çevrimdışı da büyür";
  oyuncu geri döndüğünde **birikmiş** bir şey bulur. Bu, D1 dönüşünün en ucuz
  gerekçesidir.
- **Uygulama:** `loadGame()` zaten `lastSeen` farkını ve 4 saatlik tavanı hesaplıyor;
  sadece `toast` yerine altın yağmurlu bir toplama modalı aç ve miktarı büyüt.
  Tavanı 8 saate çıkar (okul + uyku), oranı `offlineMult` ile ayarla.
  Modal'a "yarın daha çok birikecek: X/sn" satırı ekle — bu bir sonraki oturumun
  gerekçesi olur.
- **Boyut:** S

### 4. Koleksiyon Defteri (kalıcı başarım + pet ızgarası)
15 başarım ve 6 pet, **kalıcı** bir defterde; her satırın somut ödülü var.
- **Rakip kanıtı:** Adopt Me'de 4 tam büyümüş pet → Neon, 4 Neon → Mega-Neon:
  koleksiyonun kendisi hedef. Pet Simulator 99'da 2000+ petlik indeks aynı işi görür.
- **Uygulama:** Şu an `unlockedAch` **kaydedilmiyor** — her oturumda sıfırlanıyor.
  `saveGame()` çıktısına `ach: [...unlockedAch]` ekle, yüklemede geri doldur.
  Her başarıma küçük ödül (50–500 💰) ve toplam ilerleme çubuğu ekle.
  Petler zaten kalıcı; defterde 6 yuvalık ızgara olarak göster, boş yuvalar silüet.
- **Boyut:** M

### 5. Sınıf Ligi (oda koduyla haftalık skor + yerel rekor tablosu)
Aynı odada oynayanların haftalık en iyi gelir/sn'si; oda kodu paylaşılabilir.
- **Rakip kanıtı:** Theme Park Tycoon 2'nin küresel gelir/ziyaretçi sıralaması ve
  Roblox'un "sosyal sistemler oyuncuları birbirinin içeriği yapar" notu.
  Adopt Me'de oyuncu sayısı büyük güncellemede **3 katına** çıkıyor — sosyal
  karşılaştırma içeriğin kendisi.
- **Uygulama:** `tatli_board` zaten localStorage'da; hafta damgası ekle ve hafta
  değişince sıfırla. P2P tarafında `v: 0` hatasını düzelt: sunucu (host) her
  oyuncunun `incomePerSec()` değerini state mesajına eklesin.
  "Oda kodu" butonu panoya kopyalasın (tek satır, backend yok).
- **Boyut:** M

### 6. Rebirth Yolu (görünür prestij merdiveni)
Her rebirth'te karakterde kalıcı bir görsel yükseltme: taç → altın taç → elmas taç,
hale rengi, tezgah tabelasında yıldız.
- **Rakip kanıtı:** Bloxburg'ta ev, Dress to Impress'te kıyafet, Steal a Brainrot'ta
  taban: oyuncunun **başkalarının göreceği** kalıcı bir iz bırakması.
  Roblox "avatar kalıcılığı" dokümanı bunu doğrudan söylüyor.
- **Uygulama:** `state.rebirths` zaten kayıtlı ve `HATS` dizisi mevcut; rebirth
  sayısına göre kilit açan 3 şapka ekle (kozmetik ekranında kilitli göster).
  Tezgah etiketine `textTex` ile yıldız ekle — zaten yeniden çiziliyor.
  P2P'de taç diğer oyunculara da gösterilir (`sendState` zaten rebirth taşıyor).
- **Boyut:** S

### Sıralama (etki ÷ maliyet)

| # | Kanca | Etki | Maliyet | Oran |
|---|---|---|---|---|
| 1 | Koleksiyon Defteri (kalıcı başarım) | Yüksek — bugün kaybolan ilerleme geri gelir | M | **En yüksek** |
| 2 | Uyurken Dükkan Çalıştı | Yüksek — D1'in en ucuz gerekçesi | S | Çok yüksek |
| 3 | Günün Tatlısı (7 günlük takvim) | Orta-yüksek — D2–D7 zinciri | S | Çok yüksek |
| 4 | Rebirth Yolu (görünür prestij) | Orta — D7 kimlik hissi | S | Yüksek |
| 5 | Haftanın Özel Tatlısı | Yüksek — D7 gerekçesi, ama bakım ister | M | Orta |
| 6 | Sınıf Ligi | Orta — sosyal, ama oda kodu sürtünmesi var | M | Orta |

---

## 3. İlk 15 dakikayı bozan şeyler

Sıralı, kanıtlı. Hepsi mevcut kodda doğrulandı.

**1. Satın alma otomatik — çocuk hiçbir zaman "ben aldım" demiyor.**
`tryBuy(i)` 3.8 birim menzile girince kendiliğinden çağrılıyor (`tick` içinde
`if (d < 3.8) tryBuy(i)`). Oyuncu sadece yürüyor. Roblox'un core-loop dokümanı
döngüyü "oyuncunun tekrarladığı **eylem**" olarak tanımlıyor; burada eylem yok,
sadece yakınlık var. İlk 30 saniyede sahiplik hissi oluşmuyor.

**2. Ritim barı 7 yaşındaki için rastgele ceza.**
İbre `sin(elapsed × 4.4)` ile ~1.43 saniyede bir tur atıyor; "MÜKEMMEL" penceresi
barın ±%8.5'i, yani zamanın ~%12'si. Çocuk servis eder, bazen x1.8 bazen x1 alır,
**neden** aldığını anlamaz. Üstelik ibre, kuyrukta müşteri varken sürekli ekranda.
Roblox UI dokümanı: geri bildirim oyuncuya "iyi mi kötü mü yaptım" dedirtmeli —
bu bar tersini yapıyor.

**3. Kaçan müşteri sessizce kayboluyor.**
`onLost` sadece `state.lost++` yapıyor. HUD'da `lost` hiç gösterilmiyor, ses yok,
hedef şeridi değişmiyor. Çocuk müşterinin gittiğini ancak üzgün emojiyle fark eder.
Roblox onboarding dokümanı: "eylemden sonra sessizlik = oyuncu bozuk sandı".
Ayrıca 3.6 saniyelik geliş + 2 kişilik kuyruk + 11 saniyelik sabır = lvl1'de
dakikada ~10 müşteri kaçırmak mümkün; oyun bunu hiç söylemiyor.

**4. Kombo sessizce sıfırlanıyor.**
5 saniye içinde servis yapılmazsa kombo 0'a düşüyor; ekranda kalan süre yok,
sıfırlanma anında ses/parçacık yok. HUD'daki `🔥 x2.3 kombo` yazısı bir anda
`≈X/sn`'ye dönüyor. Çocuk için bu, "param neden azaldı" sorusudur.

**5. 3D menü değil, CDN yüklemesi yavaş.**
Three.js + PeerJS unpkg'den, 10 tezgah modeli toplam **1.3 MB** GLB, hepsi her
açılışta yeniden iniyor: service worker yok, önbellek yok, dosyalar ayrı ayrı.
Roblox tasarım dokümanı: kullanıcılar "sürtünme ve yükleme süresine duyarlı",
çoğunlukla mobil. Okul tabletinde 5–15 saniyelik mavi "yükleniyor…" ekranı,
ilk oturumun en pahalı saniyeleri. Modeller ayrıca `startGame`'den **sonra**
yükleniyor → oyun içinde görsel pop.

**6. Görev zinciri solo oyuncuda duvara tosluyor.**
9. görev `multi-1` = "Bir arkadaşınla oyna", `met()` bunu `netMode !== 'solo'`
ile ölçüyor (`src/quests.js` + `index.html` `questStats`). Arkadaşı olmayan çocuk
oyunun ortasında **kalıcı olarak** "Bir arkadaşınla oyna 0/1" hedefinde kalır;
sonraki 4 görevin ödülü asla gelmez. Çocuk oyunu bırakır çünkü hedef imkânsız.

**7. İlk rebirth 15 dakikaya sığmıyor.**
Rebirth 6 tezgah istiyor; 6.'sı Donut Kulesi 6000 💰. Yükseltmeler fiyat×0.75×1.75^(lv-1)
ile katlanıyor; optimize etmeyen bir çocuk için gerçek süre 20–30 dakika.
Oyunun en büyük kutlaması ilk oturumun dışında kalıyor. Roblox: "uzun vadeli hedef
görünür olmalı ama ilk oturumda **bir** zirve yaşanmalı."

**8. Başarımlar her oturumda sıfırlanıyor ve ödülsüz.**
`unlockedAch` `saveGame()`'e yazılmıyor. Yüklemede `checkAchievements()` her karede
çalıştığı için 15 başarım 800 ms arayla **yeniden** toast'lanır (spam), sonra liste
yine "0/15" görünür. Üstelik hiçbiri para/pet/kozmetik vermiyor — çocuk ⭐
butonunun boş olduğunu öğrenir.

**9. P2P sıralaması yalan söylüyor.**
`renderLeaderboard()` uzak oyuncuları `{v: 0}` ile ekliyor; arkadaşını davet eden
çocuk onu "0/sn"de görür. İlk sosyal deneyim bozuk → güven kaybı.

**10. Metin ağırlıklı öğretici, 7 saniyede kayboluyor.**
Alt şerit "WASD yürü · Fare bak · E servis · U yükselt" yazıyor ve 7 saniye sonra
soluyor. Roblox: genç kullanıcılar "okumaya isteksiz", görsel ipucu metinden
üstün. Mobilde "U yükselt" tuşu **yok** — metin yanlış yönlendiriyor.

**11. Mobilde alt-sağ köşe dört katman.**
Joystick (sol), bakış (sağ yarı), SERVİS butonu (sağ alt), ritim barı (SERVİS'in
üstü), tezgah paneli (joystick üstü). 390 px genişlikte başparmak alanı için
fazla; yanlış dokunma = kaçan müşteri = sessiz ceza (§3).

**12. Günlük ödül 30. saniyede araya giriyor.**
Yeni oyuncuda `setTimeout(checkDaily, 30000)` modal açıyor — tam da ikinci tezgahı
almaya çalışırken. İlk oturumun ritmini bölen tek modal bu.

---

## 4. Top %5 vs geri kalanı

"İyi oyun hissi" değil; isimlendirilebilir tasarım kararları.

**1. Tek bir sayı, her zaman ekranda, her zaman büyüyor.**
Pet Simulator, Steal a Brainrot, Grow a Garden: gelir/sn sürekli görünür ve
kısaltmalı (1.2K, 3.4M). %5'lik oyunlar sayıyı **asla** gizlemez; sıradan tycoon'lar
para panelini menüye saklar. Bizde var (`💰 1.2K · ≈340/sn`) — korunmalı.

**2. Görünür olasılık + nadirlik merdiveni.**
Pet Simulator'ın 2000+ peti ve Adopt Me'nin common→legendary bandı. %5'lik oyun
"1/1000" yazar ve o sayıyı oyuncunun gözüne sokar; geri kalan "nadir pet" der,
şansı saklar. Bizim `rollPet()` %60/30/10 bölüyor ama **ekranda yazmıyor**.

**3. Koleksiyon, para biriminden bağımsız ilerleme.**
Adopt Me'de Neon/Mega-Neon üretmek parayla değil **tekrarla** olur. %5'lik oyunlar
parayla satın alınamayan ikinci bir ilerleme ekseni koyar. Bizde başarım var ama
ödülsüz ve kalıcı değil (§3.8).

**4. Çevrimdışı ilerleme = dönüş anı.**
Grow a Garden'ın tüm D1'i buna dayanıyor. Fark: %5'lik oyun bunu **modal + toplama
animasyonu** yapar, geri kalan bir toast'la geçer. Bizde toast (§2.3).

**5. Haftalık, yeniden kullanılan içerik.**
Adopt Me pet varyantları, Pet Sim iki haftada bir, Roblox dokümanı "3 haftadan az
emek, 2–4 haftada bir". %5'lik oyunlar **yeni sistem** değil, **yeni görünüm**
yayınlar. Bizim 10 tezgah modeli prosedürel renk üretiyor — varyant bedava.

**6. Kaybedilecek bir şey.**
Steal a Brainrot'un çalma mekaniği, Grow a Garden'ın ekin çalma özelliği: kayıp
riski olmadan kazanç anlamsız. Bizde `state.lost` sayılıyor ama **hiçbir sonucu
yok** — bu yüzden servis etmek de heyecanlı değil. En azından "5 kaçan müşteri =
30 saniyelik müşteri molası" gibi yumuşak bir baskı gerekir (çocuk oyunu: asla
kalıcı ceza).

**7. Oturumu doğal bir zirvede bitirme.**
Dress to Impress 360 saniyelik tur; Brainrot rebirth. %5'lik oyun "bir tur daha"
dedirtir çünkü turun **sonu** vardır. Bizde oturum bitmiyor — çocuk sıkılana kadar
oynuyor, sıkıldığı yerde bırakıyor. Rebirth bunun için var ama 15 dakikaya
sığmıyor (§3.7).

**8. Başka oyuncunun varlığının görünmesi.**
Adopt Me ticareti, Brainrot'un tabanları, DTI podyumu. %5'lik oyunlarda başka
oyuncunun **eşyası** içeriktir. Bizde P2P var ama sıralama bozuk (§3.9) ve
başka oyuncunun dükkanı sadece renkli halka.

**9. Tek dokunuşluk yeniden giriş.**
Roblox dokümanı: "saniyeler içinde oyuna gir". %5'lik oyunlarda menü yok ya da tek
buton; bizde 4 buton + isim alanı var. İsim alanı çocuk için sürtünme (mobilde
klavye açar).

---

## 5. Sonraki 6 iş (öncelik sırası)

**1. Başarımları kalıcı yap + her birine ödül ver**
- **Ne:** `unlockedAch`'i kayda ekle; her başarım 50–500 💰 ve defterde toplam
  ilerleme çubuğu versin. Yüklemede toast spam'ini kapat (sadece yeni açılanlar).
- **Neden:** Bugün oyuncunun tek "koleksiyonu" her oturumda sıfırlanıyor; D7
  gerekçesi olarak kullanılamaz. En yüksek etki/maliyet (§2 sıralaması).
- **Boyut:** M
- **Dosya:** `index.html` (`saveGame`, `loadGame`, `checkAchievements`, `renderAchievements`)

**2. Solo görev duvarını kaldır**
- **Ne:** `multi-1` görevini çıkar veya solo alternatifle değiştir (ör. "10 kombo
  yap" / "1 VİP servis et"). `quest.getState` ilerlemesi bu yeni tipleri tanısın.
- **Neden:** Arkadaşı olmayan çocuk oyunun ortasında kalıcı olarak kilitleniyor;
  sonraki 4 ödül asla gelmiyor (§3.6).
- **Boyut:** S
- **Dosya:** `src/quests.js` (+ testleri), `index.html` (`questStats`)

**3. Çevrimdışı dönüşü bir ana çevir**
- **Ne:** `toast` yerine toplama modalı; tavan 4 → 8 saat; "yarın daha çok birikecek"
  satırı; altın yağmuru animasyonu.
- **Neden:** D1'in en ucuz gerekçesi, altyapı zaten var (`lastSeen`, `offlineCapHours`).
- **Boyut:** S
- **Dosya:** `index.html` (`loadGame` çevrimdışı bloğu, `src/service.js` TUNING)

**4. Günlük ödülü 7 kutulu takvime çevir**
- **Ne:** Mevcut `DAILY[7]` dizisini görsel şerit yap; alınanlar ✓, yarın parlasın;
  modal 30. saniye yerine ilk servis sonrası açılsın.
- **Neden:** D2–D7 zinciri; ayrıca §3.12'deki ritim bozulmasını da çözer.
- **Boyut:** S
- **Dosya:** `index.html` (`checkDaily`, `rewardSheet` markup + CSS)

**5. Ritim barını bağışlayıcı yap**
- **Ne:** MÜKEMMEL penceresini ±%16'ya çıkar, İYİ'yi ±%30 yap; 3. seviyeden önce
  hiç gösterme; kaçırınca ceza değil, sadece "bonus yok" olsun.
- **Neden:** 7 yaşındaki için şu an rastgele ceza; beceri hissi vermiyor (§3.2).
- **Boyut:** S
- **Dosya:** `index.html` (`RHYTHM_PERFECT`, `RHYTHM_GOOD`, `updateServiceUI`)

**6. İlk yüklemeyi hızlandır (service worker + yerel önbellek)**
- **Ne:** SW ile three.js/peerjs/GLB dosyalarını cache-first servis et; GLB'leri
  `startGame` öncesi yükle (veya 3 tanesini inline data-URI'ye göm).
- **Neden:** Her açılışta 1.3 MB + 2 CDN isteği; mobilde ilk 15 saniyenin en
  pahalı kısmı (§3.5).
- **Boyut:** M
- **Dosya:** `index.html` (SW kaydı + import map), yeni `sw.js` veya inline blob

---

### Bu rapora girmeyen ama not edilenler
- P2P sıralamasındaki `v: 0` hatası (§3.9) — 5. işin (Sınıf Ligi) parçası.
- Mobil alt-sağ köşe kalabalığı (§3.11) — 6 işlik listede yer almadı; ritim barı
  3. seviyeye kadar gizlenince kendiliğinden hafifler.
- `state.lost`'a yumuşak sonuç (§4.6) — tasarım kararı gerektirir, iş listesine
  alınmadı.
