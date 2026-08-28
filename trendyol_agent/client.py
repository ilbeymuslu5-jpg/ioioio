import requests

from trendyol_agent.config import Config


class TrendyolAPIError(RuntimeError):
    def __init__(self, status_code: int, url: str, body: str):
        self.status_code = status_code
        self.url = url
        self.body = body
        super().__init__(f"Trendyol API hatasi ({status_code}) {url}: {body}")


class TrendyolClient:
    def __init__(self, config: Config, timeout: float = 20.0):
        self.config = config
        self.timeout = timeout
        self.session = requests.Session()
        self.session.auth = (config.api_key, config.api_secret)
        headers = {
            "User-Agent": config.user_agent,
            "Content-Type": "application/json",
        }
        if config.store_front_code:
            headers["storeFrontCode"] = config.store_front_code
        self.session.headers.update(headers)

    def _url(self, path: str) -> str:
        return self.config.base_url + path

    def _handle(self, response: requests.Response) -> dict | list | None:
        if response.status_code >= 400:
            raise TrendyolAPIError(response.status_code, response.url, response.text)
        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    def get(self, path: str, params: dict | None = None):
        response = self.session.get(self._url(path), params=params, timeout=self.timeout)
        return self._handle(response)

    def post(self, path: str, json: dict | None = None, params: dict | None = None):
        response = self.session.post(self._url(path), json=json, params=params, timeout=self.timeout)
        return self._handle(response)

    def put(self, path: str, json: dict | None = None, params: dict | None = None):
        response = self.session.put(self._url(path), json=json, params=params, timeout=self.timeout)
        return self._handle(response)
