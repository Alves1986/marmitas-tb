// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentModeNotice, toPaymentNoticeMode, toPaymentNoticeModeFromConfirmation, toPaymentNoticeModeFromProvider } from "./PaymentModeNotice";

describe("PaymentModeNotice", () => {
  it("informa claramente que o modo de teste não gera cobrança real", () => {
    render(<PaymentModeNotice mode="test" />);
    expect(screen.getByText(/ambiente de teste/i)).toBeTruthy();
    expect(screen.getByText(/nenhuma cobrança real/i)).toBeTruthy();
  });

  it("traduz o modo configurado do Asaas para o aviso oficial do checkout", () => {
    expect(toPaymentNoticeMode("asaas")).toBe("official");
    expect(toPaymentNoticeMode("test")).toBe("test");
  });

  it("deriva o aviso da confirmação e do provedor persistido no acompanhamento", () => {
    expect(toPaymentNoticeModeFromConfirmation(true)).toBe("test");
    expect(toPaymentNoticeModeFromConfirmation(false)).toBe("official");
    expect(toPaymentNoticeModeFromProvider("asaas_test")).toBe("test");
    expect(toPaymentNoticeModeFromProvider("asaas")).toBe("official");
  });
});
