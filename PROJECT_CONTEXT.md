# GAME DESIGN DOCUMENT & SYSTEM ARCHITECTURE (PROJECT CONTEXT)

## 1. Proje Genel Bakış & Çekirdek Döngü

- **Tür:** Orta Çağ / Karanlık Fantezi temalı, gerçek zamanlı Top-Down Aksiyon RPG
  (Hades / Diablo / Survivors mekaniği).
- **Maç İçi Döngü:** Arenaya gir → Goblin, İskelet ve Kurt sürülerini biç →
  Ruh Taşı (XP) ve Altın topla → Seviye atla & 3 fantezi kartından birini seç →
  Düşen sandıklardan ekipman kuşan → Sürü büyüdükçe hayatta kal.
- **Meta Döngü:** Menüye dön → Kalıcı yetenek ağacını geliştir → Eşya üret ve
  kuşan → Karakteri özelleştir.

> **Not:** Bu doküman, projenin Agar.io benzeri "kütle büyütme" prototipinden
> Aksiyon RPG'ye dönüştürülmüş halidir. Kütle/yarıçap büyümesi, yem noktaları ve
> kütle erimesi mekanikleri tamamen kaldırılmıştır.

---

## 2. Karakter ve Görsel Mimari

- Karakter **sabit boyutludur**; hiçbir stat gövdesini büyütmez. Güç seviyeden,
  yeteneklerden ve ekipmandan gelir.
- Yönlü gövde: fare nişanı kılıcın ve savurma arkının yönünü belirler; yürüme
  yönünden bağımsızdır (geri çekilirken ileri vurulabilir).
- Başlangıç Sınıfı: **Savaşçı** — Demir Zırh, Kılıç & Kalkan.
- HUD: klasik RPG **Can Küresi**, **Mana barı**, **Seviye/XP çubuğu**, aktif
  yetenek rozetleri ve düşman işaretli mini harita.

---

## 3. Savaş ve Etkileşim Sistemi

- **Sol Tık (Temel Saldırı):** Fare yönüne kılıç savurma. Hitbox bir *daire
  dilimi*dir: `attackRange` yarıçapı içinde ve savurma yarı-açısı içindeki tüm
  düşmanlar tek vuruşta biçilir.
- **Boşluk (Atılma):** Mana harcayan kısa atılma; süresince hasar dokunulmazlığı.
- **Düşmanlar:** Oyuncuya yürüyen, can barlı **Goblin** (sürü), **İskelet**
  (zırhlı, sert) ve **Kurt** (hızlı). Steering + ayrışma davranışı ile kuşatırlar.
- **Loot:** Ölen düşmandan **Altın**, **Mavi Ruh Taşı** (XP) ve düşük ihtimalle
  **Ekipman Sandığı** saçılır. Düşen eşyalar parıldar ve toplanmazsa söner.

---

## 4. Envanter ve Ekipman (Tuş: `I` / `Tab`)

- **Ekipman Slotları:** Silah, Zırh (Chest), Miğfer, Tılsım.
- **Eşya Dereceleri:** Yaygın (Beyaz), Büyülü (Mavi), Destansı (Mor),
  Efsanevi (Turuncu). Derece, eşyanın kaç ek stat satırı taşıdığını belirler.
- Eşyalar kuşanıldığında saldırı hızı, zırh, hareket hızı ve hasar statları
  **anında** güncellenir.
- Grid tabanlı çanta; çantadaki eşyaya tıkla → kuşan, kuşanılana tıkla → çıkar.

---

## 5. Fantezi Yetenek ve Seviye Sistemi

Seviye atlandığında 3 kart sunulur. Üçü gerçek yetenek, kalanı stat kartıdır:

- **Kasırga Kılıçları:** Karakterin etrafında dönen hayalet kılıçlar.
- **Kutsal Şimşek:** En yakın düşmanın tepesine aralıklarla yıldırım düşürür.
- **Ateş İzi:** Yürünen yerde düşmanları yakan alev bırakır.
- **Şövalye Disiplini:** Zırhı %20, maksimum canı +50 artırır.

---

## 6. Matematiksel Modeller & Stat Dengesi

### 1. Nihai Stat Hattı (Pipeline)
```
FinalStat = (Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc) * (1 + InMatchPerc)
```
> Tabanı 0 olan statlar (bekleme azaltma, talih) yüzdeyle çarpılamaz; bu statlar
> daima düz (flat) verilir.

### 2. Zırh & Hasar Azaltma (Diminishing Returns)
```
Mitigation  = 100 / (100 + Armor)
TakenDamage = IncomingDamage * Mitigation
```

### 3. Savaş
```
SwingInterval = max(minAttackInterval, 1 / AttackSpeed)
RolledDamage  = Damage * (crit ? CritMultiplier : 1) * Mitigation
```

### 4. Denge Bariyerleri
- **Merhamet penceresi:** Alınan her vuruştan sonra kısa dokunulmazlık. Emilen
  vuruş yine de saldırganın bekleme süresini harcar — sürü zincirleme kilitleyemez.
- **Zorluk rampası:** Düşman canı/hasarı ve popülasyon tavanı kahraman
  seviyesiyle birlikte artar.
- **Eşya uçurumu bariyeri:** Mekanizma `StatSystem.gearEffectiveness` içinde
  durur (seviye ile %25→%100). Maç içi bulunan ganimet tam etkiyle çalışır;
  bariyer Faz 4'ün metagame ekipmanı için ayrılmıştır.

---

## 7. Modüler Dizin & Kod Mimarisi

```
src/
├── core/
│   ├── GameEngine.ts       # Sabit timestep döngüsü, tick senkronizasyonu
│   ├── InputManager.ts     # Fare, dokunma ve klavye → tek tip vektör
│   ├── PhysicsEngine.ts    # Spatial-grid çarpışma, knockback
│   ├── SpatialGrid.ts      # Uniform spatial hash (broad phase)
│   ├── World.ts            # Varlık kaydı + indeks tutarlılığı
│   └── Camera.ts           # Yumuşak takip
├── entities/
│   ├── Entity.ts           # ID, position, velocity, radius, mass, health
│   ├── Player.ts           # Sabit boyutlu kahraman: nişan, savurma, atılma
│   ├── EnemyMob.ts         # Goblin / İskelet / Kurt, durum makinesi
│   └── LootDrop.ts         # Altın, Ruh Taşı, Ekipman Sandığı
├── systems/
│   ├── StatSystem.ts       # Stat pipeline, zırh azaltma, kritik, regen
│   ├── CombatSystem.ts     # Savurma arkı, hasar, ölüm, loot düşürme
│   ├── EnemyAISystem.ts    # Steering + ayrışma, aggro durum makinesi
│   ├── EnemySpawnSystem.ts # Dalga direktörü, zorluk rampası
│   ├── AbilitySystem.ts    # Dönen kılıçlar, şimşek, ateş izi
│   ├── LootSystem.ts       # Mıknatıs toplama, altın/XP/sandık
│   ├── InventorySystem.ts  # Slot yönetimi, kuşanma, stat senkronizasyonu
│   ├── ItemFactory.ts      # Eşya kurası: taban, derece, ek statlar
│   ├── SkillTreeSystem.ts  # 3'lü kart kurası, nadirlik/şans, uygulama
│   └── ProgressionSystem.ts# XP eşikleri ve seviye atlama
└── ui/
    ├── HUD.ts              # Can küresi, mana, XP, bufflar, mini harita
    ├── LevelUpModal.ts     # 3'lü kart seçim arayüzü
    └── InventoryUI.ts      # Ekipman slotları, çanta ve stat özeti
```

---

## 8. Sonraki Adımlar

- **Sınıflar:** Asa taşıyan Büyücü (mermi tabanlı temel saldırı), Okçu.
- **Metagame:** Kalıcı yetenek ağacı (DAG), Öz (Essence) para birimi, LocalStorage kaydı.
- **Cila:** Partikül efektleri, ses altyapısı, ölüm/zafer ekranı, boss düşmanlar.
