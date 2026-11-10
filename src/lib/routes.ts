/** Uygulama içi yollar (CLAUDE.md Bölüm 8). Bağlantılarda sabit metin yerine bunu kullanın. */
export const routes = {
  home: "/",
  listings: "/ilanlar",
  listing: (slug: string) => `/ilanlar/${slug}`,
  newListing: "/ilan-ver",
  company: (slug: string) => `/firmalar/${slug}`,
  panel: "/panel",
  conversation: (id: string) => `/panel/mesajlar/${id}`,
  login: "/giris",
  register: "/kayit",
  howItWorks: "/nasil-calisir",
  about: "/hakkimizda",
  contact: "/iletisim",
  terms: "/kullanim-kosullari",
  kvkk: "/kvkk",
  privacy: "/gizlilik",
  admin: "/admin",
} as const;
