from unittest.mock import MagicMock

import pytest

from trendyol_agent.services import products


def _client():
    client = MagicMock()
    client.config.supplier_id = "12345"
    return client


def test_list_products_builds_params():
    client = _client()
    products.list_products(client, approved=True, barcode="ABC123", page=1, size=10)
    client.get.assert_called_once()
    path, kwargs = client.get.call_args
    assert path[0] == "/integration/product/sellers/12345/products"
    assert kwargs["params"] == {"page": 1, "size": 10, "approved": "true", "barcode": "ABC123"}


def test_update_price_and_stock_rejects_empty():
    with pytest.raises(ValueError):
        products.update_price_and_stock(_client(), items=[])


def test_update_price_and_stock_rejects_too_many():
    with pytest.raises(ValueError):
        products.update_price_and_stock(_client(), items=[{"barcode": "x"}] * 1001)


def test_update_price_and_stock_puts_items():
    client = _client()
    items = [{"barcode": "ABC123", "quantity": 5, "salePrice": 99.9}]
    products.update_price_and_stock(client, items=items)
    client.put.assert_called_once_with(
        "/integration/product/sellers/12345/products/price-and-inventory",
        json={"items": items},
    )
