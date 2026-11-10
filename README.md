# DöngüPazar

Kullanılmış paletleri ve sanayi atıklarını / yan ürünlerini ihtiyacı olan firmalarla buluşturan B2B döngüsel ekonomi pazaryeri. Proje bağlamı ve yol haritası için [CLAUDE.md](./CLAUDE.md) dosyasına bakın.

## Geliştirme

```bash
npm install
cp .env.example .env.local   # Supabase anahtarlarını doldurun
npm run dev                  # http://localhost:3000
```

| Komut               | Açıklama                   |
| ------------------- | -------------------------- |
| `npm run dev`       | Geliştirme sunucusu        |
| `npm run build`     | Production derlemesi       |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | TypeScript kontrolü        |
| `npm run format`    | Prettier ile biçimlendirme |

## Klasör yapısı

```
messages/tr.json            Kullanıcıya görünen tüm metinler (next-intl)
src/
  app/                      Next.js App Router sayfaları ve layout
  components/
    layout/                 Header, Footer, Container, Logo
    ui/                     shadcn/ui tarzı temel bileşenler (Button, Badge, Card, Input, Label)
  i18n/                     next-intl yapılandırması (şimdilik yalnızca tr)
  lib/                      UI'dan bağımsız iş mantığı (ileride packages/shared)
    supabase/               Tarayıcı, sunucu ve middleware istemcileri
    format.ts               tr-TR sayı ve ₺ biçimlendirme
    slug.ts                 Türkçe karakter uyumlu slug üretimi
    routes.ts               Uygulama yolları
  middleware.ts             Supabase oturum yenileme
supabase/
  migrations/               Şema, tetikleyiciler, RLS politikaları, storage
  seed.sql                  Kategori seed'i
```

## Tema

Renk token'ları `src/app/globals.css` içinde tanımlıdır (Tailwind CSS v4, `@theme`). Kodda hex yazmayın; `bg-brand-dark`, `bg-brand-light`, `bg-brand-soft`, `text-ink`, `text-ink-muted`, `border-line` sınıflarını kullanın.

## Supabase kurulumu

### Vercel üzerinden (önerilen)

1. Vercel'de proje → **Storage** → **Create Database** → **Supabase**. Entegrasyon gerekli ortam değişkenlerini (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `POSTGRES_URL_NON_POOLING` …) projeye kendisi ekler.
2. Projeyi yeniden deploy edin. Derleme sırasında `scripts/migrate.mjs`, `supabase/migrations/` altındaki dosyaları ve `supabase/seed.sql` dosyasını veritabanına uygular. Uygulanan dosyalar `app_migrations.applied` tablosunda izlenir; her dosya bir kez çalışır.
3. Supabase panelinde **Authentication → URL Configuration → Site URL** alanına sitenin adresini yazın (e-posta onay bağlantıları buraya döner). Pilot aşamasında e-posta onayını kapatmak için: **Authentication → Sign In / Providers → Email → Confirm email**.

### Yerelde

`.env.local` dosyasına Supabase URL, anon key ve `POSTGRES_URL_NON_POOLING` değerlerini yazın, ardından `npm run db:migrate` çalıştırın.

### Notlar

- İlk admin kullanıcısı için, kayıt olduktan sonra SQL Editor'de: `update public.profiles set role = 'admin' where id = '<kullanıcı-uuid>';`
- Tüm tablolarda RLS açıktır. Yetki ve onay alanları (`profiles.role`, `companies.is_verified`, puan ortalaması) veritabanı tetikleyicileriyle korunur; istemci bunları değiştiremez.
- İlanlar şimdilik doğrudan yayına girer. Admin onayı istemek için: `update public.app_settings set require_listing_approval = true;`
