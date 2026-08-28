from trendyol_agent.client import TrendyolClient
from trendyol_agent.services import claims, orders, products, questions

# is_write=True olan araclar seller panelindeki gercek veriyi degistirir
# (fiyat/stok, siparis durumu, soru cevabi). Agent bunlari calistirmadan once
# kullaniciya onay sorar (ask_confirmation=False verilmedigi surece).
TOOLS = [
    {
        "name": "list_products",
        "description": "Satici panelindeki urunleri listeler/filtreler (barkod, onay durumu).",
        "is_write": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean", "description": "Sadece onaylanmis/onaylanmamis urunler"},
                "barcode": {"type": "string", "description": "Belirli bir barkod ile arama"},
                "page": {"type": "integer", "default": 0},
                "size": {"type": "integer", "default": 50},
            },
        },
    },
    {
        "name": "update_price_and_stock",
        "description": (
            "Bir veya birden fazla urunun fiyat ve/veya stok adedini gunceller. "
            "Fiyat degismeyecekse salePrice/listPrice gonderilmeyebilir."
        ),
        "is_write": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "barcode": {"type": "string"},
                            "quantity": {"type": "integer"},
                            "salePrice": {"type": "number"},
                            "listPrice": {"type": "number"},
                        },
                        "required": ["barcode"],
                    },
                }
            },
            "required": ["items"],
        },
    },
    {
        "name": "list_orders",
        "description": "Siparis paketlerini listeler (durum, siparis numarasi, tarih araligina gore filtrelenebilir).",
        "is_write": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": sorted(orders.VALID_STATUSES),
                    "description": "Siparis paketi durumu",
                },
                "order_number": {"type": "string"},
                "start_date_ms": {"type": "integer", "description": "Epoch millisaniye"},
                "end_date_ms": {"type": "integer", "description": "Epoch millisaniye"},
                "page": {"type": "integer", "default": 0},
                "size": {"type": "integer", "default": 50},
            },
        },
    },
    {
        "name": "update_package_status",
        "description": (
            "Bir siparis paketinin durumunu gunceller (orn. kargoya verildi bilgisi icin once "
            "'Picking' sonra 'Invoiced' gonderilir)."
        ),
        "is_write": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "package_id": {"type": "string"},
                "status": {"type": "string", "enum": sorted(orders.VALID_STATUSES)},
            },
            "required": ["package_id", "status"],
        },
    },
    {
        "name": "list_questions",
        "description": "Musteri sorularini listeler (durum: WAITING_FOR_ANSWER, ANSWERED, REPORTED vb.).",
        "is_write": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "page": {"type": "integer", "default": 0},
                "size": {"type": "integer", "default": 50},
            },
        },
    },
    {
        "name": "answer_question",
        "description": "Bir musteri sorusunu yanitlar. Cevap 10-2000 karakter olmalidir.",
        "is_write": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "question_id": {"type": "string"},
                "text": {"type": "string"},
            },
            "required": ["question_id", "text"],
        },
    },
    {
        "name": "list_claims",
        "description": "Iade/talep (claim) kayitlarini listeler.",
        "is_write": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "page": {"type": "integer", "default": 0},
                "size": {"type": "integer", "default": 50},
            },
        },
    },
]

WRITE_TOOL_NAMES = {tool["name"] for tool in TOOLS if tool["is_write"]}


def dispatch(client: TrendyolClient, name: str, tool_input: dict):
    if name == "list_products":
        return products.list_products(client, **tool_input)
    if name == "update_price_and_stock":
        return products.update_price_and_stock(client, items=tool_input["items"])
    if name == "list_orders":
        return orders.list_orders(client, **tool_input)
    if name == "update_package_status":
        return orders.update_package_status(client, **tool_input)
    if name == "list_questions":
        return questions.list_questions(client, **tool_input)
    if name == "answer_question":
        return questions.answer_question(client, **tool_input)
    if name == "list_claims":
        return claims.list_claims(client, **tool_input)
    raise ValueError(f"Bilinmeyen arac: {name}")
