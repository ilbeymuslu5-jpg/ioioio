# trendyol-agent

Trendyol satici paneli icin dogal dil komutlariyla calisan bir asistan. Trendyol'un
resmi Marketplace (Integration) API'sini kullanir; panele giris yapip tiklama yapmaz.

Su an desteklenen islemler:

- Urun listeleme / filtreleme
- Fiyat ve stok guncelleme
- Siparis (shipment package) listeleme ve durum guncelleme (Picking, Invoiced, ...)
- Musteri sorularini listeleme ve cevaplama
- Iade/talep (claim) listeleme

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
```

`.env` dosyasini doldur:

- `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET`: Trendyol Partner
  panelinde **Hesap Bilgileri > Entegrasyon Bilgileri** sayfasindan alinir (sadece
  panelin ana/master kullanicisi gorebilir).
- `ANTHROPIC_API_KEY`: dogal dil komutlarini (`ask`, `chat`) yorumlamak icin gerekli.
  Sadece `raw` alt komutlarini kullanacaksan gerekmez.
- `TRENDYOL_USE_STAGE=true` verirsen istekler test ortamina (stageapigw) gider.

## Kullanim

Dogal dil (Turkce) ile, etkilesimli:

```bash
trendyol-agent chat
sen> ABC123 barkodlu urunun stogunu 50 yap
sen> son 7 gunun kargoya verilmemis siparislerini listele
sen> 12345 numarali soruyu "kargo 2 is gunu icinde elinizde olur" diye cevapla
```

Tek seferlik komut:

```bash
trendyol-agent ask "fiyati 199.90 TL, stogu 20 olacak sekilde ABC123 barkodunu guncelle"
```

Yazma islemleri (fiyat/stok, siparis durumu, soru cevabi) once terminalde onay ister.
Otomasyon/scriptlerde onay istemeden calistirmak icin `--yes` ekle.

Dogal dil katmani olmadan, dogrudan komutlar (CI/cron gibi scriptler icin uygun):

```bash
trendyol-agent raw products-list --barcode ABC123
trendyol-agent raw price-stock ABC123 --quantity 20 --sale-price 199.90
trendyol-agent raw orders-list --status Created
trendyol-agent raw order-status <packageId> Picking
trendyol-agent raw questions-list --status WAITING_FOR_ANSWER
trendyol-agent raw answer-question <questionId> "Cevap metni"
trendyol-agent raw claims-list
```

## Onemli: API yollarini dogrula

`trendyol_agent/endpoints.py` icindeki yollar Agustos 2026'da resmi dokumantasyondan
(developers.trendyol.com) derlendi. Trendyol API'yi sik guncelliyor — ozellikle Urun
V1 -> V2 (15 Eylul 2026) ve Siparis V1 -> V2 (15 Ekim 2026) gecisleri yaklastikca bazi
yol/gövde formatlari degisebilir. `endpoints.py` icinde "DOGRULA" notu olan yollari
(siparis listeleme, urun guncelleme, iade listeleme) canli/gercek veri uzerinde
kullanmadan once developers.trendyol.com'dan teyit et, mumkunse once stage ortaminda
dene (`TRENDYOL_USE_STAGE=true`).

## Genisletme

Yeni bir islem eklemek icin:

1. `trendyol_agent/services/` altinda ilgili fonksiyonu yaz (veya mevcut dosyaya ekle).
2. `trendyol_agent/tools.py` icine arac tanimini ekle (yazma islemiyse `is_write: True`).
3. `trendyol_agent/cli.py` icine istersen bir `raw` alt komutu ekle.

Dogal dil katmani (`agent.py`) `tools.py` icindeki tum araclari otomatik olarak
Claude'a taniti; ayrica kod degistirmen gerekmez.

## Test

```bash
pip install -e . pytest
pytest
```
