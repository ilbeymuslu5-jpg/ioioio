# Trench Survivor — 1. Dünya Savaşı 2.5D Hayatta Kalma

Cephede yalnız kalmış bir askerin kurtarılmayı beklerken hayatta kalma mücadelesi.
Oyun yatay düzlemde (X) ilerler; oyuncu siper almak veya kaçmak için derinlik
ekseninde (Z) tanımlı **şeritler (lanes)** arasında geçiş yapar.

- **Motor:** Unity 2022.3 LTS veya üzeri (URP önerilir)
- **Platform:** Mobil (Android / iOS), dokunmatik girdi
- **Dil:** C# — değişken/fonksiyon adları İngilizce, açıklamalar Türkçe

## Klasör Hiyerarşisi

```
Assets/
  _Project/                 # Tüm proje varlıkları tek kök altında (paketlerden ayrık)
    Art/                    # Models, Materials, Textures, Animations, VFX
    Audio/                  # Music, SFX, Ambience
    Data/                   # ScriptableObject varlıkları (Movement, Survival, Waves)
    Prefabs/                # Player, Enemies, Environment, Items, UI
    Scenes/                 # Bootstrap, MainMenu, Trench_01 ...
    Scripts/
      Core/                 # Ortak sözleşmeler ve paylaşılan veri (LaneGrid, arayüzler)
      Player/               # Karakter kontrolcüsü, duruş, hareket ayarları
      Survival/             # Can / enerji / gaz filtresi sistemi
      Inputs/               # Girdi soyutlaması ve mobil dokunmatik sağlayıcı
      Environment/          # Gündüz-gece döngüsü, gaz ve çamur bölgeleri
      AI/                   # Devriye ve düşman davranışları
      Combat/               # Silah, mermi, hasar uygulayıcılar
      Interaction/          # Yağmalama (scavenging), eşya toplama
      UI/                   # HUD ve menüler
      Utils/                # Yardımcı sınıflar
    Settings/               # Render pipeline, kalite ve girdi ayarları
  Plugins/
  StreamingAssets/
```

Kural: `Assets/_Project` altındaki hiçbir betik, üçüncü parti paketlere doğrudan
bağımlı olmamalıdır. Dış bağımlılıklar `Plugins/` altında ve bir arayüz arkasında tutulur.

## Uygulanan Sistemler

### 1. `PlayerMovement2_5D` (`Scripts/Player/`)
- **X ekseni:** yürüme, koşma, sürünme; ivmelenmeli hız geçişi.
- **Z ekseni:** `LaneGrid` üzerindeki siper hatları arasında eğri (AnimationCurve)
  ile yumuşatılmış geçiş, bekleme süresi (cooldown) ve hedef şeritte kapsül
  tabanlı engel kontrolü.
- Sürünürken `CharacterController` yüksekliği düşer; tepede engel varken
  ayağa kalkma engellenir.
- `IExertionSource` uygular → hayatta kalma sistemi eforu okur.
- `IMovementSpeedModifier` tüketir → yorgunluk hızı yavaşlatır.
- Editörde şeritleri gizmo olarak çizer.

### 2. `SurvivalStatsManager` (`Scripts/Survival/`)
- **Can (HP):** çatışma, patlama ve gaz hasarı; sargı bezi ile zamana yayılı iyileşme.
- **Vücut ısısı / Enerji:** gece ve çamurda hızlı düşer, koşarken daha da hızlanır;
  ateş başında geri dolar. Düştükçe hareket hızını azaltır, sıfırlanırsa can yer.
- **Gaz maskesi filtresi:** yalnızca gaz bulutu içinde tükenir; bittiğinde
  saniyelik gaz hasarı başlar.
- Çevresel etkiler **sayaç tabanlıdır** (`EnterGasZone` / `ExitGasZone` ...), bu sayede
  üst üste binen tetikleyici bölgeler doğru çalışır.
- Performans için hesaplar her karede değil, `tickInterval` aralığında yapılır.

### 3. Girdi Katmanı (`Scripts/Inputs/`)
`IPlayerInputProvider` arayüzü sayesinde hareket kodu girdi kaynağını bilmez.
`MobileTouchInputProvider`:
- Ekranın **sol yarısı**: parmağın bastığı yer sanal joystick merkezi olur; yatay
  sürükleme yürütür, eşiği aşan itme koşturur.
- Ekranın **sağ yarısı**: yukarı/aşağı kaydırma (swipe) şerit değiştirir.
- Sürünme, UI butonundan `SetCrawl(bool)` ile tetiklenir.
- Editörde klavye yedeği açıktır (A/D, Shift, Ctrl, W/S).

## Sahne Kurulumu (Player prefab)

1. `Create > Trench Survivor > Lane Grid` ile bir `LaneGrid` üret (`Data/`), 3 şerit tanımla.
2. `Create > Trench Survivor > Player Movement Config` ve `Survival Config` varlıklarını üret.
3. Boş bir GameObject'e şunları ekle: `CharacterController`, `MobileTouchInputProvider`,
   `SurvivalStatsManager`, `PlayerMovement2_5D`. Model/mesh'i alt obje yap.
4. Alanları bağla:
   - `PlayerMovement2_5D`: Lane Grid, Config, Input Provider Source → `MobileTouchInputProvider`,
     Speed Modifier Source → `SurvivalStatsManager`, Visual Root → model kökü,
     Lane Obstacle Mask → engel katmanları.
   - `SurvivalStatsManager`: Config, Exertion Source → `PlayerMovement2_5D`.
5. Kamera Z ekseninde geride, hafif perspektifle konumlanır (2.5D görünüm).

## Mobil Notları
- Fizik/hayatta kalma hesapları tick'lenerek CPU ve pil tüketimi düşürülür.
- Girdi `Input.touches` (legacy) üzerinden okunur; yeni Input System'e geçmek için
  yalnızca `IPlayerInputProvider` uygulayan yeni bir sınıf yazmak yeterlidir.
- Şerit engel kontrolü tek `Physics.CheckCapsule` çağrısıyla yapılır.

## Oynanabilir Web Prototipi

`WebPrototype/index.html` — Unity'deki tasarımın **tarayıcıda oynanabilir** karşılığı.
Tek dosya, harici bağımlılık yok (kendi yazdığımız minik 3B projeksiyon katmanı ile
Canvas 2D üzerine çizilir), mobil dokunmatik kontrollerle çalışır.

Prototipte doğrulanan mekanikler:
- Üç siper hattı arasında eğri ile yumuşatılmış şerit geçişi, engel kontrolü ve bekleme süresi
- Yürüme / koşma / sürünme; sürünürken kum torbası arkasında gizlenme
- Can, vücut ısısı ve gaz filtresi — tick tabanlı, `SurvivalStatsManager` ile aynı formüller
- Gündüz/gece döngüsü; geceleri devriye çıkar, ısı iki katı hızla düşer
- Rastgele olaylar: topçu ateşi (yere yatınca hasar azalır), gaz saldırısı (bir şerit
  daima temiz kalır), siper baskını
- Sargı bezi / konserve / yedek filtre toplama, ateş başında ısınma, çamurda yavaşlama
- Üç dakika dayanınca kurtarma ekibi gelir

Kontroller — klavye: `A`/`D` yürü, `Shift` koş, `W`/`S` şerit değiştir, `Ctrl` sürün.
Dokunmatik: sol yarı sanal joystick, sağ yarı yukarı/aşağı kaydırma ile şerit, `SÜRÜN` tuşu.

## Sıradaki Adımlar
- `Environment/`: `DayNightCycle`, `GasZone`, `MudZone`, `HeatSource` tetikleyicileri
  (hepsi `SurvivalStatsManager` üzerindeki Enter/Exit metotlarını çağırır).
- `Systems/`: topçu atışı, siper baskını ve gaz saldırısı üreten rastgele olay yönetimi.
- `AI/`: şerit farkındalıklı gece devriyeleri.
- `UI/`: can, ısı ve filtre barlarını `SurvivalStat.Changed` olayına bağlayan HUD.
