# Karanlık Arena — Top-Down Aksiyon RPG

Orta Çağ / karanlık fantezi temalı, gerçek zamanlı top-down aksiyon RPG'nin motor
katmanı. TypeScript, sıfır runtime bağımlılığı, saf ES modülleri + Canvas2D.

Sabit boyutlu bir **Savaşçı** ile karanlık bir zindanda goblin, iskelet ve kurt
sürülerini biçersin: kılıç savurma, atılma, ganimet, ekipman ve seviye başına
3 fantezi kartı. Sürü seviyenle birlikte büyür.

## Çalıştırma

```bash
npm install
npm start        # derler + http://localhost:5173 sunar
npm test         # 139 test (node --test, .ts dosyalarını doğrudan koşar)
npm run typecheck
npm run build    # src/*.ts -> dist/*.js
```

Node `.ts` dosyalarını type-stripping ile doğrudan çalıştırdığı için **testler
derleme gerektirmez**; tarayıcı için `dist/` üretilir (`npm start` bunu yapar).

## Kontroller

| Tuş | Eylem |
|---|---|
| **WASD / Ok tuşları** | Hareket |
| **Fare** | Nişan — kılıcın yönü yürüme yönünden bağımsızdır |
| **Sol tık** (basılı tut) | Kılıç savurma; hızı saldırı hızı statı belirler |
| **Boşluk** | Atılma — mana harcar, süresince dokunulmazsın |
| **I / Tab** | Envanter (oyunu duraklatır) |
| **1 · 2 · 3** | Seviye atlama kartı seçimi |

Dokunmatikte parmağın indiği nokta sanal joystick merkezi olur.

## Savaş

Temel saldırı bir mermi değil, **süpürülen bir daire dilimi**: `attackRange`
yarıçapı içinde ve savurma yarı-açısı içindeki her düşman tek vuruşta biçilir.
Erim düşmanın *kenarına* ölçülür, yani iri bir iskelete goblinden biraz daha
uzaktan yetişirsin.

Hasar tek bir yoldan geçer — `StatSystem.rollDamage`: kritik kurası → kritik
çarpanı → zırh azaltması. Yeteneklerin hasarı da aynı yoldan geçer, hiçbir kaynak
zırhı atlayamaz.

**Merhamet penceresi:** Vuruş yedikten sonra kısa bir dokunulmazlık kazanırsın.
Bu pencerede emilen vuruş yine de saldırganın bekleme süresini harcar — sürü
seni zincirleme kilitleyemez, swing'lerini boşa harcar.

## Düşmanlar

| Düşman | Rol | Can | Hasar | Hız | Zırh |
|---|---|---:|---:|---:|---:|
| Goblin | Sürü baskısı | 38 | 7 | 132 | 4 |
| İskelet | Zırhlı, sert | 96 | 12 | 96 | 22 |
| Kurt | Hızlı kanat | 52 | 9 | 205 | 8 |

Steering ile yaklaşır, birbirlerinden itilirler — bir sürü tek noktaya yığılmak
yerine etrafında hilal oluşturur. Aggro **kilitlenir**: kaçarsan peşini bırakmaz.

Doğma direktörü düşmanları görüş alanının dışındaki bir halkaya bırakır, sonra
kahramana yollar. Popülasyon hedefi ve düşman can/hasarı seviyenle birlikte artar.

## Yetenekler

Seviye atlandığında 3 kart sunulur; üçü gerçek yetenek, kalanı stat kartıdır:

| Kart | Etki |
|---|---|
| **Kasırga Kılıçları** | Etrafında dönen hayalet kılıçlar; her stack bir kılıç ekler |
| **Kutsal Şimşek** | En yakın düşmanın tepesine aralıklarla yıldırım |
| **Ateş İzi** | Yürüdüğün yerde yakan alevler bırakırsın |
| **Şövalye Disiplini** | Zırh %20, maksimum can +50 |

Seçimler stat'a doğrudan yazılmaz; pipeline'ın `inMatch` katmanına `talent:<id>`
grubu olarak düşer. Aynı yeteneği N kez alırsan tek bir grup N katı değerle
güncellenir. Şişman bir XP kristali birden çok seviye atlatabildiği için taslaklar
**kuyruğa alınır** — her seviye hâlâ bir seçim borçludur.

## Ekipman

Dört slot (Silah, Zırh, Miğfer, Tılsım) ve dört derece: Yaygın, Büyülü, Destansı,
Efsanevi. Derece, eşyanın kaç ek stat satırı taşıdığını belirler (0/1/2/3).
Eşya seviyesi tüm değerleri yükseltir, `luck` statı dereceyi yukarı kaydırır.

Kuşanılan eşya, stat pipeline'ının `gear` katmanına slot başına bir grup olarak
düşer — kuşandığın an hasar, zırh, saldırı hızı ve hareket hızı güncellenir.
Boş bir slota düşen ganimet doğrudan üstüne geçer; dolu slotta çantaya gider.

## Mimari

```
src/
├─ Game.ts               Kompozisyon kökü: modülleri bağlar, sistem sırasını belirler
├─ main.ts               Tarayıcı giriş noktası (yalnızca DOM bağlama)
├─ types/index.ts        Paylaşılan sözleşmeler: Vec2, StatKey, GameSystem, config arayüzleri
├─ config/
│  ├─ GameConfig.ts      Tüm oynanış sabitleri (tek doğruluk kaynağı)
│  ├─ EnemyTypes.ts      Bestiyer: statlar ve ganimet tabloları
│  ├─ ItemPool.ts        Eşya tabanları, ek stat havuzu, derece ağırlıkları
│  └─ TalentPool.ts      Yetenek kartları
├─ core/
│  ├─ GameEngine.ts      Sabit timestep döngüsü, tick senkronizasyonu, alpha
│  ├─ World.ts           Varlık kaydı + spatial index tutarlılığı
│  ├─ SpatialGrid.ts     Uniform spatial hash (broad phase)
│  ├─ PhysicsEngine.ts   Daire çarpışması, knockback
│  ├─ InputManager.ts    Fare/dokunma/klavye → tek tip yön vektörü
│  ├─ Camera.ts          Yumuşak takip
│  ├─ EventBus.ts        Tip güvenli pub/sub
│  ├─ GameEvents.ts      Olay haritası (emit ve listener'lar buna göre denetlenir)
│  └─ MatchContext.ts    Sistemlere geçilen paylaşımlı bağlam
├─ entities/
│  ├─ Entity.ts          Taban gövde
│  ├─ Player.ts          Sabit boyutlu kahraman: nişan, savurma, atılma, mana
│  ├─ EnemyMob.ts        Düşman: durum makinesi, saldırı saati
│  └─ LootDrop.ts        Altın / Ruh Taşı / Sandık
├─ systems/
│  ├─ StatSystem.ts      Stat pipeline, zırh, kritik, can & mana yenilenmesi
│  ├─ CombatSystem.ts    Savurma arkı, hasar, ölüm, ganimet
│  ├─ EnemyAISystem.ts   Steering, ayrışma, aggro
│  ├─ EnemySpawnSystem.ts Dalga direktörü ve zorluk rampası
│  ├─ AbilitySystem.ts   Dönen kılıçlar, şimşek, ateş izi
│  ├─ LootSystem.ts      Mıknatıs toplama ve tüketim
│  ├─ InventorySystem.ts Slotlar, çanta, gear katmanı (servis — tik almaz)
│  ├─ ItemFactory.ts     Eşya kurası
│  ├─ SkillTreeSystem.ts 3'lü kart kurası ve uygulama
│  ├─ ProgressionSystem.ts XP eşikleri
│  ├─ InputSystem.ts     Girdiyi kahraman eylemlerine çevirir
│  ├─ MovementSystem.ts  Entegrasyon → sınırlar → grid sync → çarpışma
│  └─ CameraSystem.ts    Kamerayı sabit adımda ilerletir
├─ render/CanvasRenderer.ts  Karanlık zindan, şövalye, düşmanlar, efektler
└─ ui/
   ├─ HUD.ts             Can küresi, mana, XP, bufflar, mini harita
   ├─ LevelUpModal.ts    3'lü kart seçim ekranı
   └─ InventoryUI.ts     Ekipman paneli, çanta ve stat özeti
```

### Katman kuralı

`core`, `entities` ve `systems` DOM bilmez — motor headless çalışabilir.
`render` ve `ui` dışarıdan okur, asla oyun durumunu değiştirmez.

```ts
import { Game } from './src/Game.ts';

const game = new Game({ headless: true, seed: 42, autoPickTalents: true });
game.aimAt(x, y);
game.combatSystem.attack(game.player);
game.simulate(60);   // canvas olmadan 60 saniyelik simülasyon
```

Aynı yol testlerde, denge simülasyonlarında ve ileride otoriter sunucuda kullanılır.

### Tik hattı

```
EnemyAI → Movement → Combat → Abilities → Spawn → Loot → Progression → SkillTree → Stats → Camera
```

Sıra önemli: AI yönlendirir, gövdeler hareket eder, sonra temaslar ve yetenekler
gerçekten oluştukları konumlara göre çözülür; ganimet ve XP en son oturur.

## Matematiksel modeller

| Model | Yer | Formül |
|---|---|---|
| Stat pipeline | `StatSystem.computeStat` | `(Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc) * (1 + InMatchPerc)` |
| Zırh azaltma | `StatSystem.mitigation` | `100 / (100 + Armor)` |
| Hasar kurası | `StatSystem.rollDamage` | `Damage * (crit ? CritMult : 1) * Mitigation` |
| Savurma aralığı | `Player.attackInterval` | `max(minAttackInterval, 1 / AttackSpeed)` |
| Nadirlik kurası | `SkillTreeSystem.weightFor` | `base * (1 + luck * 0.35 * nadirlıkAdımı)` |
| Zorluk rampası | `EnemySpawnSystem.difficultyFor` | `1 + (level - 1) * 0.14` |

**Sıfır tabanlı stat tuzağı:** `perc` modifiyesi statın toplamını çarpar, yani
tabanı 0 olan bir statta hiçbir şey yapmaz — `(0 + 0) × 1.2 = 0`. Bekleme
azaltma ve talih 0'dan başlar, bu yüzden daima düz (flat) verilir. Hem eşya hem
yetenek havuzu için bu kural teste bağlanmıştır ("her modifiye hedeflediği statı
gerçekten oynatır").

## Test

`node --test` ile çalışan 139 test:

| Dosya | Kapsam |
|---|---|
| `tests/spatialGrid.test.ts` | Hücre indeksleme, çok hücreli varlıklar, tekrarsız sorgu |
| `tests/physics.test.ts` | Entegrasyon, kare-bağımsız sürtünme, sınır sekmesi, knockback |
| `tests/engine.test.ts` | Sabit adım/alpha, tick bütçesi, duraklatma, kamera |
| `tests/stats.test.ts` | Pipeline'ın her terimi, zırh azalan getirisi, kritik, regen |
| `tests/combat.test.ts` | Savurma arkı (ön/arka/menzil/çoklu hedef), merhamet penceresi, ölüm ve ganimet, AI, doğma direktörü |
| `tests/inventory.test.ts` | Eşya kurası, kuşanma/çıkarma, dolu çanta, mıknatıs, gerileme testleri |
| `tests/talents.test.ts` | Kura, stack'leme, kuyruk ve üç yeteneğin davranışı |
| `tests/game.test.ts` | Uçtan uca dövüş, determinizm (aynı seed → aynı sonuç), indeks tutarlılığı |

Denge, headless dövüş botuyla ölçüldü: kite eden bir oyuncu ~95 saniyede
seviye 15-17'ye ulaşıp ~100 öldürmeyle sürüye yeniliyor.

## Sonraki adımlar

- **Sınıflar:** Asa taşıyan Büyücü (mermi tabanlı saldırı) — `weaponKind` ayrımı
  ve bir `Projectile` varlığı gerektirir.
- **Metagame:** Kalıcı yetenek ağacı (`StatSheet`'in `talent` katmanı zaten hazır),
  Öz para birimi, LocalStorage kaydı.
- **Cila:** Partikül efektleri, ses, ölüm ekranı, boss düşmanlar.
- **Envanterde sürükle-bırak:** Şu an tıklayarak kuşanma var; sürükle-bırak
  dokunmatikte daha kırılgan olduğu için sonraya bırakıldı.

Tam tasarım dokümanı: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
