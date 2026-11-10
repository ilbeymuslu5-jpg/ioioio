# CLAUDE.md — Proje Bağlamı: DöngüPazar (çalışma adı)

> Bu dosya, Claude Code'un projeyi anlaması için hazırlanmış ana bağlam belgesidir.
> Proje kök dizinine `CLAUDE.md` adıyla koy. Claude Code her oturumda bunu okur.

---

## 1. Proje Özeti

**DöngüPazar**, sanayi firmalarının ellerindeki **kullanılmış paletleri** ve **üretim atıklarını / yan ürünlerini**, bunlara ihtiyaç duyan başka firmalarla buluşturan bir **B2B döngüsel ekonomi pazaryeridir**.

- Bir fabrikanın çöpe giden talaşı, başka bir fabrikanın hammaddesidir.
- Bir firmanın depoda çürüyen paletleri, başka bir firmanın sevkiyat ihtiyacıdır.

**İlk hedef bölge:** İzmir ve Ege bölgesi (sonra tüm Türkiye).
**İlk sürüm:** Web sitesi (mobil uyumlu, PWA). **Sonraki aşama:** Mobil uygulama (iOS + Android).
**Dil:** Türkçe (ileride İngilizce eklenecek; i18n altyapısı baştan kurulmalı).

### Çözdüğü sorunlar
1. Firmalar atıklarını bertaraf etmek için **para ödüyor**, oysa bu atıklar başkası için değerli.
2. Kullanılmış paletler depolarda yer kaplıyor, alıcı bulmak zor ve tamamen telefon/tanıdık ağına bağlı.
3. Hammadde arayan küçük üreticiler ucuz ikincil kaynaklara ulaşamıyor.
4. Bu pazar şu an dağınık: WhatsApp grupları, sahibinden ilanları, telefon trafiği.

---

## 2. Kullanıcı Tipleri

| Rol | Kim | Ne yapar |
|---|---|---|
| **Satıcı / Veren** | Fabrikalar, depolar, lojistik firmaları, üreticiler | Palet veya atık ilanı verir |
| **Alıcı / Alan** | Palet ihtiyacı olan firmalar, geri dönüşümcüler, atığı hammadde olarak kullanan üreticiler | İlan arar, teklif verir, **talep ilanı** açar |
| **Palet üreticisi / tamircisi** | Palet firmaları | Hem kırık palet toplar hem tamirli/yeni palet satar |
| **Admin** | Platform ekibi | İlan onayı, firma doğrulama, şikâyet yönetimi |

Bir firma hem alıcı hem satıcı olabilir. **Rol, hesap değil, işlem bazındadır.**

---

## 3. İlan Kategorileri

### A) Palet
- **Tip:** Euro palet (EPAL, 800×1200), Standart (1000×1200), Özel ölçü, Plastik palet, Metal palet, Kırık / tamir edilecek palet
- **Durum sınıfı:** Yeni · A sınıfı (temiz, sağlam) · B sınıfı (kullanılmış, sağlam) · C sınıfı (tamir gerekir) · Hurda
- **Isıl işlem (ISPM-15 damgası):** Var / Yok. İhracat için kritik, filtrelenebilir olmalı.
- **Miktar birimi:** adet

### B) Sanayi Atığı / Yan Ürün
- **Ahşap:** talaş, yonga, kesim artığı, kırık palet ahşabı
- **Plastik:** PE, PP, PET, streç film, kırma, granül
- **Kâğıt / karton:** oluklu mukavva, kâğıt artığı
- **Tekstil:** kumaş kırpıntısı, iplik artığı
- **Metal:** hurda demir, alüminyum, bakır, talaş
- **Cam**
- **Organik / gıda yan ürünü:** pirinç kabuğu, zeytin karasuyu/pirinası, meyve posası vb. (Ege için önemli)
- **Diğer**
- **Miktar birimi:** kg · ton · m³ · adet · torba · big bag
- **Sıklık:** Tek seferlik / Düzenli (haftalık, aylık), çünkü düzenli tedarik çok değerlidir

> ⚠️ **Tehlikeli atıklar (kimyasal, tıbbi, yağ, akü vb.) MVP'de KESİNLİKLE yasaktır.** İlan formunda bu kategori olmamalı, ilan oluştururken kullanıcı "tehlikeli atık değildir" beyanını işaretlemelidir. Türkiye'de atık taşıma ve işleme lisans gerektirebilir. Yasal metinler yayına almadan önce bir hukukçuya kontrol ettirilecek.

---

## 4. İlan Tipleri

1. **Arz ilanı (Veriyorum):** "Elimde 500 adet B sınıfı euro palet var."
2. **Talep ilanı (Arıyorum):** "Ayda 3 ton PP kırma arıyorum."
3. **Fiyat tipi:** Sabit fiyat · Teklife açık · **Ücretsiz (gelip alana)**. Ücretsiz seçeneği önemli, çünkü bertaraf maliyetinden kurtulmak isteyen çok firma var.
4. **Teslim:** Alıcı alır · Satıcı teslim eder · Pazarlığa açık

---

## 5. MVP Özellikleri (Faz 1)

### Olmazsa olmaz
- [ ] **Kayıt / giriş:** e-posta + şifre, Google ile giriş. Firma adı, vergi numarası, il/ilçe, telefon, sektör.
- [ ] **Firma profili:** logo, açıklama, konum, aktif ilanlar, puan ortalaması, "Doğrulanmış firma" rozeti (admin onaylı).
- [ ] **İlan oluşturma:** çok adımlı form (kategori → detay → miktar/fiyat → konum → fotoğraf → önizleme). En fazla 8 fotoğraf, istemci tarafında sıkıştırma.
- [ ] **İlan listeleme ve arama:** metin arama + filtreler (kategori, alt kategori, ilan tipi, il/ilçe, mesafe, miktar aralığı, fiyat tipi, ISPM-15, sıklık).
- [ ] **Harita görünümü:** ilanlar haritada pin olarak, liste ↔ harita geçişi.
- [ ] **İlan detayı:** fotoğraf galerisi, tüm özellikler, firma kartı, "Teklif ver" ve "Mesaj gönder" butonları, benzer ilanlar.
- [ ] **Teklif sistemi:** miktar + fiyat + not ile teklif. Satıcı kabul, red veya karşı teklif verebilir.
- [ ] **Mesajlaşma:** firma ↔ firma, ilana bağlı konuşmalar, gerçek zamanlı.
- [ ] **Kullanıcı paneli:** İlanlarım, Gelen teklifler, Verdiğim teklifler, Mesajlar, Favoriler, Profil ayarları.
- [ ] **Bildirimler:** site içi + e-posta (yeni teklif, yeni mesaj, kayıtlı aramaya uyan yeni ilan).
- [ ] **Kayıtlı arama / alarm:** "İzmir'de 50 km içinde PP kırma ilanı çıkınca haber ver."
- [ ] **Puanlama:** işlem tamamlanınca karşılıklı 1–5 yıldız + yorum.
- [ ] **Admin paneli:** ilan onayı/kaldırma, firma doğrulama, şikâyetler, kategori yönetimi, temel istatistikler.
- [ ] **Şikâyet et** butonu (ilan ve firma için).

### Faz 2 ve sonrası (şimdilik YAPMA, ama mimari buna izin versin)
- Lojistik eşleştirme (nakliyeci rolü, boş dönüş araç eşleştirme)
- Platform içi güvenli ödeme (escrow) ve fatura
- **Sürdürülebilirlik raporu:** "Bu yıl X ton atığı çöpten kurtardınız, Y kg CO₂ tasarruf". Firmalar için ESG/rapor değeri yüksek.
- Premium ilan / öne çıkarma, firma abonelik paketleri
- AI ile fotoğraftan kategori ve durum tahmini
- Mobil uygulama (Expo / React Native)
- İngilizce dil desteği

---

## 6. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SEO (ilanların Google'da çıkması kritik), SSR, tek repo |
| Stil | **Tailwind CSS** + **shadcn/ui** | Hızlı, tutarlı, tema token'larıyla kolay renk yönetimi |
| Backend / DB | **Supabase** (PostgreSQL + Auth + Storage + Realtime) | Auth, dosya yükleme ve canlı mesajlaşma hazır. Mobil uygulama da aynı backend'i kullanır. |
| Coğrafi sorgu | **PostGIS** (Supabase'de aktif) | "50 km içindeki ilanlar" sorguları |
| Harita | **Leaflet + OpenStreetMap** (react-leaflet) | Ücretsiz, API anahtarı gerektirmez |
| Form / doğrulama | **React Hook Form + Zod** | Zod şemaları web ve mobilde ortak kullanılır |
| E-posta | **Resend** | Bildirim e-postaları |
| i18n | **next-intl** | Baştan kur, şimdilik sadece `tr` |
| Deploy | **Vercel** | Next.js için en kolay yol |

### Mobile hazırlık kuralları (önemli)
- İş mantığını (`lib/`, Zod şemaları, tipler, Supabase sorguları) **UI'dan ayır**. İleride Expo uygulaması bunları paylaşacak.
- Mümkünse yapı ileride monorepo'ya (Turborepo: `apps/web`, `apps/mobile`, `packages/shared`) taşınabilecek şekilde olsun.
- Tüm veri erişimi Supabase **Row Level Security (RLS)** ile korunmalı, güvenlik istemciye güvenmemeli.
- PWA: manifest + ikonlar, ana ekrana eklenebilir olsun.

---

## 7. Veri Modeli (taslak)

```
profiles          id (auth.users), full_name, phone, avatar_url, role ('user'|'admin'), created_at
companies         id, owner_id → profiles, name, tax_number, sector, description, logo_url,
                  city, district, address, location (geography Point), is_verified, rating_avg, rating_count
categories        id, parent_id (alt kategori için), slug, name_tr, name_en, type ('pallet'|'waste'), icon, sort_order
listings          id, company_id, category_id, listing_type ('offer'|'request'),
                  title, description, quantity, unit ('adet'|'kg'|'ton'|'m3'|'torba'|'bigbag'),
                  frequency ('once'|'weekly'|'monthly'), price, price_type ('fixed'|'negotiable'|'free'),
                  delivery ('pickup'|'delivery'|'negotiable'),
                  attributes JSONB  -- palet: {pallet_type, condition, ispm15, dimensions}; atık: {material, purity, ...}
                  city, district, location (geography Point),
                  status ('draft'|'pending'|'active'|'reserved'|'completed'|'removed'),
                  is_hazardous_declared_false BOOLEAN, views, expires_at, created_at
listing_images    id, listing_id, url, sort_order
offers            id, listing_id, from_company_id, quantity, price, note,
                  status ('pending'|'accepted'|'rejected'|'countered'|'withdrawn'), parent_offer_id, created_at
conversations     id, listing_id, company_a_id, company_b_id, last_message_at
messages          id, conversation_id, sender_id, body, attachment_url, read_at, created_at
reviews           id, from_company_id, to_company_id, listing_id, rating (1-5), comment, created_at
favorites         company_id, listing_id
saved_searches    id, company_id, filters JSONB, notify_email BOOLEAN
notifications     id, user_id, type, payload JSONB, read_at, created_at
reports           id, reporter_id, target_type ('listing'|'company'), target_id, reason, status
```

- Kategorileri **seed dosyasıyla** doldur (Bölüm 3'teki liste).
- `attributes JSONB` sayesinde yeni kategori eklemek için şema değişikliği gerekmesin. Her kategori için Zod şeması tanımla.

---

## 8. Sayfa Yapısı

```
/                       Ana sayfa: hero, arama çubuğu, iki büyük giriş kartı (Palet / Atık & Yan Ürün),
                        son ilanlar, nasıl çalışır (3 adım), etki sayaçları (ton kurtarıldı vb.)
/ilanlar                Liste + filtre paneli + harita/liste geçişi
/ilanlar/[slug]         İlan detayı
/ilan-ver               Çok adımlı ilan oluşturma
/firmalar/[slug]        Firma profili
/panel                  Kullanıcı paneli (ilanlarım, teklifler, mesajlar, favoriler, alarmlar, ayarlar)
/panel/mesajlar/[id]    Sohbet ekranı
/giris  /kayit          Auth
/nasil-calisir          Açıklama sayfası
/hakkimizda  /iletisim
/kullanim-kosullari  /kvkk  /gizlilik
/admin/...              Admin paneli
```

SEO: ilan sayfaları SSR, `generateMetadata`, Open Graph görseli, `sitemap.xml`, ilan için schema.org `Product`/`Offer` yapılandırılmış verisi. URL'ler Türkçe ve okunaklı olsun (`/ilanlar/izmir-500-adet-euro-palet-b-sinifi-abc123`).

---

## 9. Tasarım Sistemi

### Renkler (yalnızca beyaz, hafif koyu yeşil, açık yeşil)

```css
:root {
  /* Ana */
  --white:            #FFFFFF;
  --green-dark:       #1F5C3F;  /* hafif koyu yeşil: ana marka rengi, butonlar, başlıklar, header */
  --green-dark-hover: #174A32;  /* hover/active */
  --green-light:      #9FD8B2;  /* açık yeşil: vurgular, rozetler, ikon arka planları */
  --green-light-soft: #EAF6EE;  /* çok açık yeşil: bölüm arka planları, kart hover, seçili filtre */

  /* Yardımcı nötrler (sadece metin ve çizgi için) */
  --text:             #16281F;  /* koyu yeşilimsi siyah: ana metin */
  --text-muted:       #5B6F64;
  --border:           #DCE8E0;

  /* Durum (minimum kullan) */
  --danger:           #C2410C;
  --warning:          #B45309;
}
```

**Kullanım kuralları:**
- Sayfa arka planı **beyaz**. Bölümler arasında ritim için `--green-light-soft` arka planlı şeritler kullan.
- Birincil buton: `--green-dark` arka plan + beyaz yazı. İkincil buton: beyaz arka plan + `--green-dark` çerçeve ve yazı.
- Rozetler ("Ücretsiz", "ISPM-15", "Doğrulanmış"): `--green-light` arka plan + `--green-dark` yazı.
- Header: beyaz, alt çizgi `--border`. Footer: `--green-dark` arka plan + beyaz yazı.
- Renkleri Tailwind config'de `brand.dark`, `brand.light`, `brand.soft` olarak tanımla, kodda hex yazma.
- Kontrast: açık yeşil üzerine **asla beyaz yazı** yazma (okunmaz). Her zaman koyu yeşil kullan.

### Tipografi ve görünüm
- Font: **Inter** (next/font). Başlıklar 600–700, gövde 400.
- Köşeler: `rounded-xl` (kartlar), `rounded-lg` (buton/input).
- Gölgeler çok hafif. Ayrımı çizgi ve boşlukla yap.
- Ton: **güvenilir, sade, profesyonel B2B**. Gösterişli değil, temiz. Döngü/yaprak temalı basit ikonlar (lucide-react).
- Mobil öncelikli: kullanıcıların çoğu sahada, telefondan ilan verecek. İlan verme akışı tek elle kullanılabilir olmalı. Fotoğraf yükleme doğrudan kameradan çalışmalı.

---

## 10. İş Modeli (bağlam için)
- MVP'de **tamamen ücretsiz**. Önce arz-talep yoğunluğu oluşturulacak.
- Sonra: öne çıkan ilan, firma abonelik paketi, tamamlanan işlemden küçük komisyon, sürdürülebilirlik raporu (ücretli).
- **Pilot:** Kurucu ekip palet sektöründe faaliyet gösteriyor (New Pal, İzmir). İlk arz/talep ve sektör ağı buradan gelecek. Palet tarafının sektör terimleri ve iş akışı gerçek kullanıma göre tasarlanmalı.

---

## 11. Geliştirme Sırası (Claude Code için yol haritası)

1. **Kurulum:** Next.js + TS + Tailwind + shadcn/ui + ESLint/Prettier, tema renkleri, Inter fontu, temel layout (header/footer).
2. **Supabase:** proje bağlantısı, migration'lar (Bölüm 7), PostGIS, RLS politikaları, kategori seed'i.
3. **Auth:** kayıt/giriş, kayıt sonrası firma bilgisi tamamlama adımı.
4. **İlan oluşturma** (çok adımlı form + fotoğraf yükleme + Zod doğrulama).
5. **İlan listeleme, filtre, arama, harita.**
6. **İlan detayı ve firma profili.**
7. **Teklif sistemi.**
8. **Mesajlaşma** (Supabase Realtime).
9. **Kullanıcı paneli, favoriler, kayıtlı arama alarmları, bildirimler, e-posta.**
10. **Puanlama ve şikâyet.**
11. **Admin paneli.**
12. **Ana sayfa cilası, SEO, PWA, yasal sayfalar, performans.**
13. **Deploy** (Vercel + Supabase production).

Her adımdan sonra çalışır durumda olsun ve commit atılsın.

---

## 12. Claude Code Çalışma Kuralları
- Kod ve değişken adları **İngilizce**, kullanıcıya görünen tüm metinler **Türkçe** olsun ve `messages/tr.json` içinden gelsin.
- TypeScript `strict` modda olsun, `any` kullanılmasın.
- Supabase anahtarları `.env.local` içinde olsun. `.env.example` dosyasını güncel tut, gizli anahtarları asla commit etme.
- Her yeni tablo için RLS politikası yazmadan ilerleme.
- Büyük mimari kararlardan (yeni kütüphane, şema değişikliği, klasör yapısı değişikliği) önce kısa bir açıklama yap ve onay iste.
- Bileşenler küçük ve yeniden kullanılabilir olsun (`components/ui`, `components/listings`, `components/layout` ...).
- Erişilebilirlik: form etiketleri, alt metinler ve klavye ile gezinme desteklensin.
- Türkçe karakterler (ı, ğ, ş, ç, ö, ü) slug üretiminde doğru dönüştürülsün.
- Para birimi ₺ olsun, sayılar `tr-TR` formatında gösterilsin (1.250,00 ₺).

---

## 13. İlk Komut Önerisi

Claude Code'a şunu yazarak başla:

> "CLAUDE.md dosyasını oku. Bölüm 11'deki 1. ve 2. adımları uygula: projeyi kur, tema renklerini tanımla, temel layout'u yap ve Supabase migration'larını hazırla. Başlamadan önce klasör yapısı önerini göster."
