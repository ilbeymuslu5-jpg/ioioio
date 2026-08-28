from trendyol_agent import endpoints
from trendyol_agent.client import TrendyolClient


def list_claims(
    client: TrendyolClient,
    status: str | None = None,
    page: int = 0,
    size: int = 50,
) -> dict:
    params = {"page": page, "size": size}
    if status:
        params["claimItemStatus"] = status
    path = endpoints.CLAIMS_LIST.format(supplier_id=client.config.supplier_id)
    return client.get(path, params=params)
