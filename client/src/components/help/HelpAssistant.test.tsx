// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AIChatBox", () => ({
  AIChatBox: ({ messages, onSendMessage, suggestedPrompts }: {
    messages: Array<{ role: string; content: string }>;
    onSendMessage: (content: string) => void;
    suggestedPrompts?: string[];
  }) => <div>
    {suggestedPrompts?.map(prompt => <button key={prompt} type="button" onClick={() => onSendMessage(prompt)}>{prompt}</button>)}
    {messages.map((message, index) => <p key={`${message.role}-${index}`}>{message.content}</p>)}
  </div>,
}));

import { HelpAssistantContent } from "./HelpAssistant";

afterEach(() => cleanup());

describe("assistente de ajuda", () => {
  it("abre ajuda de pedidos, envia uma dúvida e preserva o link do tutorial", async () => {
    const ask = vi.fn().mockResolvedValue("Abra a sacola e revise seus itens antes de continuar.");
    render(<HelpAssistantContent surface="storefront" ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente de pedidos" }));
    expect(await screen.findByRole("heading", { name: "Assistente de pedidos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver tutorial do cliente" }).getAttribute("href")).toBe("/ajuda/pedidos");

    fireEvent.click(screen.getByRole("button", { name: "Como finalizar meu pedido?" }));
    await waitFor(() => expect(ask).toHaveBeenCalledWith({
      surface: "storefront",
      messages: [{ role: "user", content: "Como finalizar meu pedido?" }],
    }));
    expect(await screen.findByText(/abra a sacola/i)).toBeTruthy();
  });

  it("informa falha recuperável sem esconder o tutorial", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("A ajuda está indisponível no momento. Consulte o tutorial desta página."));
    render(<HelpAssistantContent surface="admin" ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente de gestão" }));
    fireEvent.click(await screen.findByRole("button", { name: "Como acesso a fila operacional?" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/indisponível/i);
    expect(screen.getByRole("link", { name: "Ver tutorial de gestão" }).getAttribute("href")).toBe("/ajuda/gestao");
  });
});
