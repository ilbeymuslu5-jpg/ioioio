# ioioio — Arena Survival (Faz 1 / MVP)

Top-down arena hayatta kalma oyununun **motor katmanı**, TypeScript ile. Bu aşama
sabit adımlı oyun döngüsünü, spatial-grid bazlı hareket/fizik sistemini, nesne
toplama mantığını, stat pipeline'ını ve denge bariyerlerini içerir.

Runtime bağımlılığı yok: saf ES modülleri + Canvas2D. Tek dev bağımlılığı
TypeScript derleyicisi. Render katmanı tek dosyada izole olduğu için ileride
PixiJS/Phaser'a geçmek `src/render/` dışını etkilemez.

## Çalıştırma

```bash
npm install
npm start        # derler + http://localhost:5173 sunar
npm test         # 72 test (node --test, .ts dosyalarını doğrudan koşar)
npm run typecheck
npm run build    # src/*.ts -> dist/*.js
```

Node, `.ts` dosyalarını type-stripping ile doğrudan çalıştırdığı için **testler
derleme gerektirmez**; tarayıcı için `dist/` üretilir (`npm start` bunu kendisi
yapar). Kaynaklar birbirini `.ts` uzantısıyla import eder, derleyici çıktıda
bunları `.js`'e çevirir (`rewriteRelativeImportExtensions`).

**Kontroller:** WASD / ok tuşları, fare ile yön verme veya dokunmatikte sanal
joystick (parmağın indiği nokta merkez kabul edilir).

## Mimari

```
src/
├─ Game.ts               Kompozisyon kökü: modülleri bağlar, sistem sırasını belirler
├─ main.ts               Tarayıcı giriş noktası (yalnızca DOM bağlama)
├─ types/index.ts        Paylaşılan sözleşmeler: Vec2, StatKey, GameSystem, config arayüzleri
├─ config/GameConfig.ts  Tüm oynanış sabitleri (tek doğruluk kaynağı)
├─ core/
│  ├─ GameEngine.ts      Sabit timestep döngüsü, tick senkronizasyonu, alpha
│  ├─ World.ts           Varlık kaydı + spatial index tutarlılığı
│  ├─ SpatialGrid.ts     Uniform spatial hash (broad phase)
│  ├─ PhysicsEngine.ts   Daire çarpışması, kütle dinamiği, knockback
│  ├─ InputManager.ts    Fare/dokunma/klavye → tek tip yön vektörü
│  ├─ Camera.ts          Yumuşak takip + kütleye bağlı zoom
│  ├─ EventBus.ts        Tip güvenli pub/sub
│  ├─ GameEvents.ts      Olay haritası (emit ve listener'lar buna göre denetlenir)
│  └─ MatchContext.ts    Sistemlere geçilen paylaşımlı bağlam
├─ entities/
│  ├─ Entity.ts          Taban gövde: konum, hız, yarıçap, kütle, can
│  ├─ Player.ts          Girdi + StatSheet + kütle ölçekleme
│  └─ FoodOrb.ts         Toplanabilir orb (tier'lı: mass/xp/renk)
├─ systems/
│  ├─ StatSystem.ts      Stat pipeline, zırh indirgeme, gear etkinliği, HP regen
│  ├─ InputSystem.ts     Girdi niyetini oyuncuya yazar
│  ├─ MovementSystem.ts  Entegrasyon → sınırlar → grid sync → çarpışma
│  ├─ SpawnSystem.ts     Orb alanını hedef sayıda tutar
│  ├─ PickupSystem.ts    Mıknatıs çekimi + toplama
│  ├─ MassDecaySystem.ts Snowball bariyeri: logaritmik kütle erimesi
│  ├─ ProgressionSystem.ts  XP eşikleri ve seviye atlama
│  └─ CameraSystem.ts    Kamerayı sabit adımda ilerletir
├─ render/CanvasRenderer.ts   Tek görünüm katmanı (piksel bilen tek modül)
└─ ui/HUD.ts             Seviye/XP/can göstergeleri, zırh, erime, mini harita
```

### Katman kuralı

`core`, `entities` ve `systems` DOM bilmez — motor headless çalışabilir.
`render` ve `ui` dışarıdan okur, asla oyun durumunu değiştirmez.

```ts
import { Game } from './src/Game.ts';

const game = new Game({ headless: true, seed: 42 });
game.setMoveIntent(1, 0.4);
game.simulate(10);   // canvas olmadan 10 saniyelik simülasyon
```

Aynı yol testlerde ve ileride otoriter sunucuda kullanılır.

## Uygulanan matematiksel modeller

| Model | Yer | Formül |
|---|---|---|
| Stat pipeline | `StatSystem.computeStat` | `(Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc) * (1 + InMatchPerc)` |
| Zırh azaltma | `StatSystem.mitigation` | `100 / (100 + Armor)` |
| Yarıçap | `Player.recalculateDerived` | `BaseRadius + sqrt(mass) * 1.2` |
| Hareket hızı | `Player.recalculateDerived` | `(BaseSpeed / mass^0.18) * (1 + SpeedBuffs)` |
| Snowball bariyeri | `MassDecaySystem.decayRateFor` | `rate * ln(1 + max(0, mass - freeMass) / reference)` |
| Eşya uçurumu bariyeri | `StatSystem.gearEffectiveness` | seviye 1'de %25 → seviye 10'da %100 |

Ölçekleme tablosu (varsayılan ayarlarla):

| Kütle | Yarıçap | Hız | Erime |
|---:|---:|---:|---:|
| 25 | 18.0 | 300 | 0.0/sn |
| 100 | 24.0 | 234 | 0.5/sn |
| 500 | 38.8 | 175 | 1.9/sn |
| 2000 | 65.7 | 136 | 3.2/sn |

### Stat pipeline neden bu sırayla

Düz (flat) terimler önce toplanır, yüzdeler sonra çarpar; talent ve gear yüzdeleri
**birbirine eklenir** (`1 + 0.2 + 0.3`), maç içi yüzde ise ayrı bir çarpan olarak
üstüne biner. Böylece kalıcı ilerleme doğrusal kalırken maç içi rogue-lite
seçimleri gerçek bir güç eğrisi yaratır. Gear terimleri pipeline'a girmeden önce
`gearEffectiveness(level)` ile ölçeklenir — eşya uçurumu bariyeri budur.

### Sabit timestep döngüsü

Simülasyon ekran tazeleme hızından bağımsız 60 Hz'de ilerler; render her karede
bir kez, son iki tick arasında `alpha` ile interpolasyon yaparak çizer. Donmuş
sekmelerin "spiral of death" yaratmaması için kare başına tick sayısı sınırlıdır.
Saat ve zamanlayıcı enjekte edilebilir olduğundan motor testlerde tarayıcısız
sürülebilir.

### Grid tabanlı fizik

Varlıklar kapladıkları hücre aralığına göre indekslenir; bir varlık hücre sınırını
geçmediği sürece `update()` hiçbir iş yapmaz. Çarpışma çözümü ters kütle
ağırlıklıdır: hafif gövde daha çok itilir, knockback kütleyle ters orantılıdır.
Sürtünme `retained^dt` olarak uygulandığı için atalet kare hızından bağımsızdır.

**Ölçüm:** 1200 orb ile ortalama tick maliyeti ~0.54 ms (16.67 ms bütçesinin
%3.2'si), tarayıcıda sabit 60 fps.

## Test

`node --test` ile çalışan 72 test:

| Dosya | Kapsam |
|---|---|
| `tests/spatialGrid.test.ts` | Hücre indeksleme, çok hücreli varlıklar, tekrarsız sorgu, çift ziyareti |
| `tests/physics.test.ts` | Entegrasyon, kare-bağımsız sürtünme, sınır sekmesi, kütle ağırlıklı ayrışma, knockback |
| `tests/engine.test.ts` | Sabit adım/alpha, tick bütçesi, duraklatma, kamera sönümleme ve dönüşümler |
| `tests/stats.test.ts` | Stat pipeline'ın her terimi, zırh azalan getirisi, gear rampası, decay eğrisi |
| `tests/pickup.test.ts` | Mıknatıs, tüketim, kütle→yarıçap/hız, XP eşikleri, spawn dengeleme |
| `tests/game.test.ts` | Uçtan uca maç, determinizm (aynı seed → aynı sonuç), indeks tutarlılığı |

## Sonraki fazlar

Faz 2+ için hazırlanan bağlantı noktaları:

- `player:levelup` olayı → 3 kartlı yetenek seçimi (`SkillTreeSystem`, `LevelUpModal`)
- `StatSheet.addGroup({ source: 'inMatch' })` → rogue-lite yetenek modifiyeleri
- `StatSheet.addGroup({ source: 'gear' })` → ekipman kuşanma (`InventorySystem`)
- `StatSystem.damageAfterArmor` → savaş hasar hesabı
- `PhysicsEngine.applyKnockback` → vuruş impulsları
- `Game({ headless: true })` → otoriter sunucu / bot simülasyonu

Henüz yazılmayanlar (ilgili fazlarında gelecek): `BotController`, `SkillTreeSystem`,
`InventorySystem`, `LevelUpModal`, `InventoryUI`.

Tam tasarım dokümanı: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
