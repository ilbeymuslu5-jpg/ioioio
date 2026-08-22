# ioioio — Arena Survival (Faz 1–2)

Top-down arena hayatta kalma oyununun **motor katmanı**, TypeScript ile.

- **Faz 1 (MVP):** sabit adımlı oyun döngüsü, spatial-grid bazlı hareket/fizik,
  nesne toplama, kütle ölçekleme, kamera takibi, stat pipeline ve denge bariyerleri.
- **Faz 2 (Maç içi rogue-lite):** XP eşikleri, seviye atlama tetikleyicisi,
  3'lü kart seçim ekranı ve maç içi yetenek modifiyeleri.

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
├─ config/
│  ├─ GameConfig.ts     Tüm oynanış sabitleri (tek doğruluk kaynağı)
│  └─ TalentPool.ts     Rogue-lite yetenek havuzu (kategori, nadirlik, stack)
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
│  ├─ SkillTreeSystem.ts   3'lü seçim kurası, nadirlik/şans, yetenek uygulama
│  └─ CameraSystem.ts    Kamerayı sabit adımda ilerletir
├─ render/CanvasRenderer.ts   Tek görünüm katmanı (piksel bilen tek modül)
└─ ui/
   ├─ HUD.ts            Seviye/XP/can göstergeleri, zırh, erime, aktif bufflar, mini harita
   └─ LevelUpModal.ts   3'lü kart seçim ekranı (nadirlik stilleri, 1·2·3 tuşları)
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
| Kritik hasar | `StatSystem.rollDamage` | `damage * critMultiplier * mitigation` |
| Nadirlik kurası | `SkillTreeSystem.weightFor` | `base * (1 + luck * 0.35 * nadirlıkAdımı)` |

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

### Maç içi rogue-lite akışı

```
orb toplandı → ProgressionSystem: XP → seviye atladı
             → SkillTreeSystem: 3 kart kurası (nadirlik + luck)
             → LevelUpModal: oyunu duraklat, kartları göster
             → seçim → StatSheet'e `inMatch` modifiye grubu → StatSystem yeniden çözer
             → türetilmiş değerler (hız, yarıçap, mıknatıs) anında güncellenir
```

Tek bir şişman orb birden çok seviye atlatabildiği için taslaklar **kuyruğa
alınır** — her seviye hâlâ bir seçim borçludur. Kartlar tıklama veya `1·2·3`
tuşlarıyla seçilir; ekran açıkken simülasyon duraklar, kuyruk boşalınca devam eder.

Yetenekler stack'lenir: aynı yetenek N kez alındığında katkısı N katıdır ve tek bir
modifiye grubu güncellenir. Seçimler doğrudan stat'a yazılmaz, pipeline'ın
`inMatch` katmanına düşer — yani kalıcı ilerlemeyle aynı formülden geçer.

Nadirlik dört kademeli (Yaygın/Nadir/Epik/Efsanevi) ve kartlarda renk kodlu.
`luck` statı yalnızca nadir kademelerin ağırlığını artırır; Faz 4'ün kalıcı "Şans"
düğümü bu stata bağlanacak.

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

`node --test` ile çalışan 100 test:

| Dosya | Kapsam |
|---|---|
| `tests/spatialGrid.test.ts` | Hücre indeksleme, çok hücreli varlıklar, tekrarsız sorgu, çift ziyareti |
| `tests/physics.test.ts` | Entegrasyon, kare-bağımsız sürtünme, sınır sekmesi, kütle ağırlıklı ayrışma, knockback |
| `tests/engine.test.ts` | Sabit adım/alpha, tick bütçesi, duraklatma, kamera sönümleme ve dönüşümler |
| `tests/stats.test.ts` | Stat pipeline'ın her terimi, zırh azalan getirisi, gear rampası, decay eğrisi |
| `tests/pickup.test.ts` | Mıknatıs, tüketim, kütle→yarıçap/hız, XP eşikleri, spawn dengeleme |
| `tests/talents.test.ts` | Kura (3 farklı kart, maxStacks, determinizm), luck etkisi, stack'leme, kuyruk, kritik hasar |
| `tests/game.test.ts` | Uçtan uca maç, determinizm (aynı seed → aynı sonuç), indeks tutarlılığı |

## Sonraki fazlar

Faz 2+ için hazırlanan bağlantı noktaları:

- `StatSheet.addGroup({ source: 'gear' })` → ekipman kuşanma (`InventorySystem`, Faz 3)
- `StatSheet.addGroup({ source: 'talent' })` → kalıcı yetenek ağacı (Faz 4)
- `luck` statı → kalıcı "Şans" düğümü (Faz 4)
- `StatSystem.rollDamage` + `PhysicsEngine.applyKnockback` → savaş ve botlar (Faz 5)
- `Game({ headless: true, autoPickTalents: true })` → denge simülasyonu / otoriter sunucu

Henüz yazılmayanlar (ilgili fazlarında gelecek): `BotController`,
`InventorySystem`, `InventoryUI`, kalıcı yetenek ağacı UI'ı.

Tam tasarım dokümanı: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
