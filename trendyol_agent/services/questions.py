from trendyol_agent import endpoints
from trendyol_agent.client import TrendyolClient


def list_questions(
    client: TrendyolClient,
    status: str | None = None,
    page: int = 0,
    size: int = 50,
) -> dict:
    params = {"page": page, "size": size}
    if status:
        params["status"] = status
    path = endpoints.QUESTIONS_FILTER.format(supplier_id=client.config.supplier_id)
    return client.get(path, params=params)


def get_question(client: TrendyolClient, question_id: str) -> dict:
    path = endpoints.QUESTION_GET.format(
        supplier_id=client.config.supplier_id, question_id=question_id
    )
    return client.get(path)


def answer_question(client: TrendyolClient, question_id: str, text: str) -> dict:
    if not (10 <= len(text) <= 2000):
        raise ValueError("Cevap metni 10-2000 karakter arasinda olmalidir")
    path = endpoints.QUESTION_ANSWER.format(
        supplier_id=client.config.supplier_id, question_id=question_id
    )
    return client.post(path, json={"text": text})
