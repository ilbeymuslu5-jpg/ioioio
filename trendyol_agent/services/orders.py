from trendyol_agent import endpoints
from trendyol_agent.client import TrendyolClient

VALID_STATUSES = {
    "Created",
    "Picking",
    "Invoiced",
    "Shipped",
    "Delivered",
    "Cancelled",
    "UnDelivered",
    "Returned",
}


def list_orders(
    client: TrendyolClient,
    status: str | None = None,
    order_number: str | None = None,
    start_date_ms: int | None = None,
    end_date_ms: int | None = None,
    page: int = 0,
    size: int = 50,
) -> dict:
    params = {"page": page, "size": size}
    if status:
        params["status"] = status
    if order_number:
        params["orderNumber"] = order_number
    if start_date_ms is not None:
        params["startDate"] = start_date_ms
    if end_date_ms is not None:
        params["endDate"] = end_date_ms
    path = endpoints.ORDERS_LIST.format(supplier_id=client.config.supplier_id)
    return client.get(path, params=params)


def update_package_status(
    client: TrendyolClient,
    package_id: str,
    status: str,
    lines: list[dict] | None = None,
) -> dict:
    if status not in VALID_STATUSES:
        raise ValueError(f"Gecersiz durum: {status}. Gecerli degerler: {sorted(VALID_STATUSES)}")
    path = endpoints.SHIPMENT_PACKAGE_UPDATE.format(
        supplier_id=client.config.supplier_id, package_id=package_id
    )
    body = {"status": status, "params": {}}
    if lines:
        body["lines"] = lines
    return client.put(path, json=body)
