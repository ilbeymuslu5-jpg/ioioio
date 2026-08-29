# Trendyol Marketplace API (Integration) endpoint sablonlari.
#
# Bu yollar Agustos 2026'da developers.trendyol.com dokumantasyonundan derlendi.
# Trendyol API'yi surekli guncelliyor (ornegin Urun V1 -> V2 gecisi 15 Eylul 2026,
# Siparis V1 -> V2 gecisi 15 Ekim 2026 tarihlerinde zorunlu hale geliyor), bu yuzden
# ozellikle "DOGRULA" notlu yollari canli veri uzerinde kullanmadan once
# developers.trendyol.com uzerinden teyit et. Fiyat/stok, siparis durumu ve
# soru-cevap yollari aramalarla dogrudan teyit edildi.

PRODUCTS_LIST = "/integration/product/sellers/{supplier_id}/products"  # GET
PRODUCTS_CREATE = "/integration/product/sellers/{supplier_id}/v2/products"  # POST
PRODUCTS_UPDATE = "/integration/product/sellers/{supplier_id}/v2/products"  # PUT - DOGRULA
PRICE_AND_INVENTORY_UPDATE = "/integration/inventory/sellers/{supplier_id}/products/price-and-inventory"  # PUT

BATCH_REQUEST_RESULT = "/integration/product/sellers/{supplier_id}/products/batch-requests/{batch_id}"  # GET

ORDERS_LIST = "/integration/order/sellers/{supplier_id}/orders"  # GET - DOGRULA (path degisebilir)
SHIPMENT_PACKAGE_UPDATE = "/integration/order/sellers/{supplier_id}/shipment-packages/{package_id}"  # PUT

QUESTIONS_FILTER = "/integration/qna/sellers/{supplier_id}/questions/filter"  # GET
QUESTION_GET = "/integration/qna/sellers/{supplier_id}/questions/{question_id}"  # GET
QUESTION_ANSWER = "/integration/qna/sellers/{supplier_id}/questions/{question_id}/answer"  # POST

CLAIMS_LIST = "/integration/order/sellers/{supplier_id}/claims"  # GET - DOGRULA
