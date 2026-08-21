# GAME DESIGN DOCUMENT & SYSTEM ARCHITECTURE (PROJECT CONTEXT)

## 1. Proje Genel Bakış & Çekirdek Döngü
- **Tür:** Top-Down Arena Survival / IO Game + Rogue-lite & RPG Metagame
- **Maç İçi Döngü:** Arenaya gir → Orb topla / XP kazan → Seviye atla & 3 rastgele
  yetenek arasından seçim yap → Düşmanlarla/botlarla savaş → Hayatta kalıp
  kaynakları topla.
- **Meta Döngü:** Menüye dön → Kalıcı yetenek ağacını geliştir → Eşya/ekipman üret
  ve kuşan → Karakteri özelleştir.

---

## 2. Matematiksel Modeller & Stat Dengesi

### 1. Nihai Stat Hattı (Pipeline)
```
FinalStat = (Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc) * (1 + InMatchPerc)
```

### 2. Zırh & Hasar Azaltma (Diminishing Returns)
```
Mitigation  = 100 / (100 + Armor)
TakenDamage = IncomingDamage * Mitigation
```

### 3. Kütle, Boyut ve Hız Ölçekleme
```
Radius        = BaseRadius + sqrt(CurrentMass) * 1.2
MovementSpeed = (BaseSpeed / (CurrentMass ^ 0.18)) * (1 + SpeedBuffs)
```

### 4. Denge Bariyerleri
- **Snowball Önleme:** Kütle büyüdükçe saniyelik logaritmik kütle kaybı (Decay).
- **Eşya Uçurumu Önleme:** Metagame eşya statları maç başında %25 etkiyle başlar,
  maç içi seviye arttıkça %100'e ölçeklenir.

---

## 3. Modüler Dizin & Kod Mimarisi

```
src/
├── core/
│   ├── GameEngine.ts       # Loop manager, fixed timestep tick updater
│   ├── InputManager.ts     # Mouse, touch ve vector controller
│   └── PhysicsEngine.ts    # Spatial-grid çarpışma, kütle dinamikleri, knockback
├── entities/
│   ├── Entity.ts           # ID, position, velocity, radius, mass, health
│   ├── Player.ts           # Entity + Input, Stat/Talent container, Inventory
│   ├── FoodOrb.ts          # Toplanabilir kaynaklar ve spatial hashleme
│   └── BotController.ts    # Flee, hunt, collect durum makineli yapay zeka
├── systems/
│   ├── StatSystem.ts       # Hasar hesaplama, zırh indirgeme, stat pipeline
│   ├── SkillTreeSystem.ts  # DAG tabanlı metagame ağacı + Rogue-lite havuzu
│   ├── InventorySystem.ts  # Slot yönetimi, eşya kuşanma, stat senkronizasyonu
│   └── ProgressionSystem.ts# XP eşikleri, kayıt (save/load) yönetimi
└── ui/
    ├── HUD.ts              # Can barı, mini-map, aktif bufflar
    ├── LevelUpModal.ts     # 3'lü kart seçim arayüzü
    └── InventoryUI.ts      # Ekipman ve stat paneli
```

---

## 4. Geliştirme Adımları (Fazlar)

- **Faz 1 (MVP):** 2D top-down hareket, spatial-grid bazlı orb toplama, kütle
  ölçekleme ve kamera takibi.
- **Faz 2 (Maç İçi Rogue-lite):** XP sistemi, seviye atlama tetikleyicisi, 3'lü
  kart seçim ekranı ve stat modifiyeleri.
- **Faz 3 (RPG & Envanter):** Ekipman slotları, eşya kuşanma, StatSystem
  entegrasyonu.
- **Faz 4 (Metagame & Kalıcı Ağaç):** Kalıcı yetenek ağacı grafiği, özelleştirme
  ve LocalStorage save sistemi.
- **Faz 5 (Botlar & Cila):** Steering behavior tabanlı bot yapay zekası, partikül
  efektleri ve ses altyapısı.
