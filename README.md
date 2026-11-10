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

1. [supabase.com](https://supabase.com) üzerinde bir proje oluşturun; URL ve anahtarları `.env.local` dosyasına yazın.
2. Migration'ları ve seed'i uygulayın:

   ```bash
   npx supabase login
   npx supabase link --project-ref <proje-ref>
   npx supabase db push                 # supabase/migrations/*
   npx supabase db push --include-seed  # kategori seed'i (supabase/seed.sql)
   ```

   Alternatif: dosyaları sırayla Supabase SQL Editor'e yapıştırıp çalıştırın.

3. İlk admin kullanıcısı için, kayıt olduktan sonra SQL Editor'de:

   ```sql
   update public.profiles set role = 'admin' where id = '<kullanıcı-uuid>';
   ```

Tüm tablolarda RLS açıktır. Yetki ve onay alanları (`profiles.role`, `companies.is_verified`, puan ortalaması, ilanın `active` durumuna geçişi) veritabanı tetikleyicileriyle korunur; istemci bunları değiştiremez.
