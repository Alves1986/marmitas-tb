// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InstallAppPrompt } from "./InstallAppPrompt";
import { OfflineNotice } from "./OfflineNotice";

afterEach(cleanup);

describe("recursos instaláveis do PWA", () => {
  it("solicita instalação quando o navegador disponibiliza o evento", async () => {
    const deferredPrompt = {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    };

    render(<InstallAppPrompt deferredPrompt={deferredPrompt} isIos={false} isStandalone={false} />);
    fireEvent.click(screen.getByRole("button", { name: /instalar aplicativo/i }));

    expect(deferredPrompt.prompt).toHaveBeenCalledTimes(1);
  });

  it("apresenta instruções para adicionar à tela inicial no iOS", () => {
    render(<InstallAppPrompt deferredPrompt={null} isIos isStandalone={false} />);

    expect(screen.getByLabelText(/instalar aplicativo/i).textContent).toMatch(/compartilhar.*adicionar à tela de início/i);
  });

  it("informa modo offline sem bloquear o conteúdo já carregado", () => {
    render(<OfflineNotice online={false} />);

    expect(screen.getByRole("status").textContent).toMatch(/modo offline/i);
  });
});
