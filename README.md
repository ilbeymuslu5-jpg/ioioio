# ioioio — Arena Survival (Phase 1 / MVP)

Top-down arena hayatta kalma oyununun **motor katmanı**. Bu aşama; sabit adımlı
oyun döngüsünü, grid tabanlı hareket/fizik sistemini, nesne toplama mantığını ve
yumuşak takip kamerasını içerir.

Bağımlılık yok: saf ES modülleri + Canvas2D. Render katmanı tek dosyada izole
edildiği için ileride PixiJS/Phaser'a geçmek `src/render/` dışını etkilemez.

## Çalıştırma

```bash
npm start        # http://localhost:5173
npm test         # 44 birim + entegrasyon testi (node --test, bağımlılıksız)
```

ES modülleri `file://` üzerinden çalışmaz; `index.html`'i doğrudan açmak yerine
yukarıdaki sunucuyu kullanın.

**Kontroller:** WASD / ok tuşları, fare ile yön verme veya dokunmatikte sanal
joystick (parmağın indiği nokta merkez kabul edilir).

## Mimari

```
src/
├─ Game.js              Kompozisyon kökü: modülleri bağlar, sistem sırasını belirler
├─ main.js              Tarayıcı giriş noktası (yalnızca DOM bağlama)
├─ config/
│  └─ GameConfig.js     Tüm oynanış sabitleri (tek doğruluk kaynağı)
├─ core/
│  ├─ GameEngine.js     Sabit timestep döngüsü, tick senkronizasyonu, alpha
│  ├─ World.js          Varlık kaydı + spatial index tutarlılığı
│  ├─ SpatialGrid.js    Uniform spatial hash (broad phase)
│  ├─ PhysicsEngine.js  Daire çarpışması, kütle dinamiği, knockback
│  ├─ InputManager.js   Fare/dokunma/klavye → tek tip yön vektörü
│  ├─ Camera.js         Yumuşak takip + kütleye bağlı zoom
│  └─ EventBus.js       Sistemleri UI'dan ayıran pub/sub
├─ entities/
│  ├─ Entity.js         Taban gövde: konum, hız, yarıçap, kütle, can
│  ├─ Player.js         Girdi + kütle ölçekleme + modifier yuvaları
│  └─ FoodOrb.js        Toplanabilir orb (tier'lı: mass/xp/renk)
├─ systems/
│  ├─ InputSystem.js    Girdi niyetini oyuncuya yazar
│  ├─ MovementSystem.js Entegrasyon → sınırlar → grid sync → çarpışma
│  ├─ SpawnSystem.js    Orb alanını hedef sayıda tutar
│  ├─ PickupSystem.js   Mıknatıs çekimi + toplama (nesne toplama mantığı)
│  ├─ ProgressionSystem.js  XP eşikleri ve seviye atlama
│  └─ CameraSystem.js   Kamerayı sabit adımda ilerletir
├─ render/
│  └─ CanvasRenderer.js Tek görünüm katmanı (piksel bilen tek modül)
└─ ui/
   ├─ HUD.js            Seviye/XP/kütle göstergeleri + mini harita
   └─ styles.css
```

### Katman kuralı

`core`, `entities` ve `systems` DOM bilmez — bu yüzden motor headless
çalışabilir. `render` ve `ui` dışarıdan okur, asla oyun durumunu değiştirmez.

```js
import { Game } from './src/Game.js';

const game = new Game({ headless: true, seed: 42 });
game.setMoveIntent(1, 0.4);
game.simulate(10);   // canvas olmadan 10 saniyelik simülasyon
```

Aynı yol testlerde ve ileride otoriter sunucuda kullanılır.

## Uygulanan sistemler

### Sabit timestep döngüsü (`GameEngine`)
Simülasyon ekran tazeleme hızından bağımsız olarak 60 Hz'de ilerler; render her
karede bir kez, son iki tick arasında `alpha` ile interpolasyon yaparak çizer.
Donmuş sekmelerin "spiral of death" yaratmaması için kare başına tick sayısı
sınırlıdır. Saat ve zamanlayıcı enjekte edilebilir olduğundan motor testlerde
tarayıcısız sürülebilir.

### Grid tabanlı fizik (`SpatialGrid` + `PhysicsEngine`)
Varlıklar kapladıkları hücre aralığına göre indekslenir; bir varlık hücre
sınırını geçmediği sürece `update()` hiçbir iş yapmaz. Çarpışma çözümü ters
kütle ağırlıklıdır: hafif gövde daha çok itilir, knockback kütleyle ters orantılı
ölçeklenir. Sürtünme `retained^dt` olarak uygulandığı için atalet kare hızından
bağımsızdır.

### Kütle ölçeklemesi (`Player.recalculateStats`)
Yarıçap, azami hız ve mıknatıs yarıçapı tek bir yerden kütleden türetilir.
Faz 2 (yetenekler) ve Faz 3 (ekipman) yalnızca `player.modifiers` içine yazıp
bu metodu tekrar çağırır — mevcut dosyalara dokunmaz.

### Nesne toplama (`PickupSystem`)
Toplayıcı başına iki yarıçap: mıknatıs menzilindeki orb'lar oyuncuya çekilir
(yaklaştıkça çekim güçlenir, tek tick'te hedefi aşmaz), gövde menzilindekiler
tüketilerek kütle ve XP verir. Sorgular yalnızca toplayıcının çevresindeki
hücreleri gezdiği için maliyet arenadaki orb sayısıyla değil oyuncu sayısıyla
ölçeklenir.

**Ölçüm:** 1200 orb ile ortalama tick maliyeti ~0.43 ms (16.67 ms bütçesinin
%2.6'sı), tarayıcıda sabit 60 fps.

## Test

`node --test` ile çalışan 44 test; harici bağımlılık yok:

| Dosya | Kapsam |
|---|---|
| `tests/spatialGrid.test.js` | Hücre indeksleme, çok hücreli varlıklar, tekrarsız sorgu, çift ziyareti |
| `tests/physics.test.js` | Entegrasyon, kare-bağımsız sürtünme, sınır sekmesi, kütle ağırlıklı ayrışma, knockback |
| `tests/engine.test.js` | Sabit adım/alpha, tick bütçesi, duraklatma, kamera sönümleme ve dönüşümler |
| `tests/pickup.test.js` | Mıknatıs, tüketim, kütle→yarıçap/hız, XP eşikleri, spawn dengeleme |
| `tests/game.test.js` | Uçtan uca maç, determinizm (aynı seed → aynı sonuç), indeks tutarlılığı |

## Sonraki fazlar

Faz 2+ için hazırlanan bağlantı noktaları:

- `player:levelup` olayı → 3 kartlı yetenek seçimi (`SkillTreeSystem`, `LevelUpModal`)
- `player.modifiers` → yetenek ve ekipman çarpanları
- `PhysicsEngine.applyKnockback` → savaş vuruşları için ortak impuls modeli
- `Game({ headless: true })` → otoriter sunucu / bot simülasyonu

Tam tasarım dokümanı: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
