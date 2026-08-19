export function shouldAlert(order: { status: string; acknowledgedAt: Date | null }): boolean {
  return order.status === "confirmado" && order.acknowledgedAt === null;
}

export function buildPrintJobInput(publicCode: string): { publicCode: string; action: "print" } {
  return { publicCode, action: "print" };
}

export function printReceipt(html: string): void {
  const popup = window.open("", "marmitas-tb-receipt", "width=420,height=720");
  if (!popup) {
    throw new Error("Não foi possível abrir a janela de impressão. Permita pop-ups para imprimir a comanda.");
  }

  popup.document.write(html);
  popup.document.close();
  popup.focus();
  if (typeof popup.print !== "function") {
    popup.close();
    throw new Error("A impressão não é suportada neste navegador. Use Compartilhar > Imprimir para enviar a comanda.");
  }
  popup.print();
}
