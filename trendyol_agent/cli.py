import click
from rich.console import Console
from rich.json import JSON

from trendyol_agent.agent import SellerAgent
from trendyol_agent.client import TrendyolAPIError, TrendyolClient
from trendyol_agent.config import ConfigError, load_config
from trendyol_agent.services import claims, orders, products, questions

console = Console()


def _print_result(result):
    console.print(JSON.from_data(result) if result is not None else "[green]Tamam[/green]")


def _client() -> TrendyolClient:
    try:
        return TrendyolClient(load_config())
    except ConfigError as exc:
        raise click.ClickException(str(exc)) from exc


@click.group()
def main():
    """Trendyol satici paneli asistani."""


@main.command()
@click.option("--yes", "auto_confirm", is_flag=True, help="Yazma islemlerini onaysiz calistir")
@click.argument("message")
def ask(message: str, auto_confirm: bool):
    """Tek seferlik dogal dil komutu calistirir. Ornek: trendyol-agent ask "bugunku siparisleri listele" """
    try:
        config = load_config()
        agent = SellerAgent(config, auto_confirm=auto_confirm, console=console)
        console.print(agent.run(message))
    except (ConfigError, RuntimeError) as exc:
        raise click.ClickException(str(exc)) from exc
    except TrendyolAPIError as exc:
        raise click.ClickException(str(exc)) from exc


@main.command()
@click.option("--yes", "auto_confirm", is_flag=True, help="Yazma islemlerini onaysiz calistir")
def chat(auto_confirm: bool):
    """Etkilesimli sohbet modu - komutlari sirayla yaz, cikmak icin 'exit'."""
    try:
        config = load_config()
        agent = SellerAgent(config, auto_confirm=auto_confirm, console=console)
    except (ConfigError, RuntimeError) as exc:
        raise click.ClickException(str(exc)) from exc

    console.print("[bold]Trendyol asistani hazir.[/bold] Cikmak icin 'exit' yaz.")
    while True:
        try:
            message = console.input("[cyan]sen>[/cyan] ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not message:
            continue
        if message.lower() in ("exit", "quit", "cik", "çık"):
            break
        try:
            console.print(agent.run(message))
        except TrendyolAPIError as exc:
            console.print(f"[red]{exc}[/red]")


@main.group()
def raw():
    """Dogal dil olmadan dogrudan komutlar (scriptleme icin)."""


@raw.command("products-list")
@click.option("--barcode", default=None)
@click.option("--approved/--not-approved", default=None)
@click.option("--page", default=0)
@click.option("--size", default=50)
def products_list(barcode, approved, page, size):
    _print_result(products.list_products(_client(), approved=approved, barcode=barcode, page=page, size=size))


@raw.command("price-stock")
@click.argument("barcode")
@click.option("--quantity", type=int, required=True)
@click.option("--sale-price", type=float, default=None)
@click.option("--list-price", type=float, default=None)
def price_stock(barcode, quantity, sale_price, list_price):
    item = {"barcode": barcode, "quantity": quantity}
    if sale_price is not None:
        item["salePrice"] = sale_price
    if list_price is not None:
        item["listPrice"] = list_price
    _print_result(products.update_price_and_stock(_client(), items=[item]))


@raw.command("orders-list")
@click.option("--status", default=None)
@click.option("--order-number", default=None)
@click.option("--page", default=0)
@click.option("--size", default=50)
def orders_list(status, order_number, page, size):
    _print_result(orders.list_orders(_client(), status=status, order_number=order_number, page=page, size=size))


@raw.command("order-status")
@click.argument("package_id")
@click.argument("status")
def order_status(package_id, status):
    _print_result(orders.update_package_status(_client(), package_id=package_id, status=status))


@raw.command("questions-list")
@click.option("--status", default=None)
@click.option("--page", default=0)
@click.option("--size", default=50)
def questions_list(status, page, size):
    _print_result(questions.list_questions(_client(), status=status, page=page, size=size))


@raw.command("answer-question")
@click.argument("question_id")
@click.argument("text")
def answer_question(question_id, text):
    _print_result(questions.answer_question(_client(), question_id=question_id, text=text))


@raw.command("claims-list")
@click.option("--status", default=None)
@click.option("--page", default=0)
@click.option("--size", default=50)
def claims_list(status, page, size):
    _print_result(claims.list_claims(_client(), status=status, page=page, size=size))


if __name__ == "__main__":
    main()
