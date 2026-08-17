// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPrintJobInput, printReceipt, shouldAlert } from "./browserPrint";

describe("serviço de impressão no navegador", () => {
  afterEach(() => vi.restoreAllMocks());

  it("alerta somente para pedido confirmado que ainda não foi reconhecido", () => {
    expect(shouldAlert({ status: "confirmado", acknowledgedAt: null })).toBe(true);
    expect(shouldAlert({ status: "em_preparo", acknowledgedAt: null })).toBe(false);
    expect(shouldAlert({ status: "confirmado", acknowledgedAt: new Date() })).toBe(false);
  });

  it("cria a entrada de impressão com o código público do pedido", () => {
    expect(buildPrintJobInput("TB-20260817-0007")).toEqual({
      publicCode: "TB-20260817-0007",
      action: "print",
    });
  });

  it("envia a comanda para a janela de impressão", () => {
    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({ document: { write, close }, focus, print } as unknown as Window);

    printReceipt("<main>Comanda</main>");

    expect(write).toHaveBeenCalledWith("<main>Comanda</main>");
    expect(close).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });
});
