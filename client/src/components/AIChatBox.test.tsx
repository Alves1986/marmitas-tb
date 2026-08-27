/** @vitest-environment happy-dom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AIChatBox } from "./AIChatBox";

describe("AIChatBox", () => {
  it("mostra o indicador de digitação acessível somente durante o carregamento", () => {
    const { rerender } = render(<AIChatBox messages={[]} onSendMessage={() => undefined} isLoading />);

    expect(screen.getByRole("status").textContent).toContain("Preparando orientação");
    expect(screen.getByLabelText("Assistente está preparando uma resposta")).toBeTruthy();
    expect(screen.getAllByTestId("typing-dot")).toHaveLength(3);

    rerender(<AIChatBox messages={[]} onSendMessage={() => undefined} isLoading={false} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
