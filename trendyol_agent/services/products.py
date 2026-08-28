from trendyol_agent import endpoints
from trendyol_agent.client import TrendyolClient


def list_products(
    client: TrendyolClient,
    approved: bool | None = None,
    barcode: str | None = None,
    page: int = 0,
    size: int = 50,
) -> dict:
    params = {"page": page, "size": size}
    if approved is not None:
        params["approved"] = str(approved).lower()
    if barcode:
        params["barcode"] = barcode
    path = endpoints.PRODUCTS_LIST.format(supplier_id=client.config.supplier_id)
    return client.get(path, params=params)


def update_price_and_stock(client: TrendyolClient, items: list[dict]) -> dict:
    """items: [{"barcode": str, "quantity": int, "salePrice": float?, "listPrice": float?}, ...]

    En fazla 1000 kalem tek istekte gonderilebilir. quantity satilabilir stok adedidir.
    """
    if not items:
        raise ValueError("items bos olamaz")
    if len(items) > 1000:
        raise ValueError("Tek istekte en fazla 1000 barkod guncellenebilir")
    path = endpoints.PRICE_AND_INVENTORY_UPDATE.format(supplier_id=client.config.supplier_id)
    return client.post(path, json={"items": items})


def get_batch_request_result(client: TrendyolClient, batch_id: str) -> dict:
    path = endpoints.BATCH_REQUEST_RESULT.format(supplier_id=client.config.supplier_id, batch_id=batch_id)
    return client.get(path)
