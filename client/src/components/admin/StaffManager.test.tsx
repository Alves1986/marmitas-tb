// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffManagerView } from "./StaffManager";

describe("StaffManagerView", () => {
  it("oferece criação de membro por convite com nome, e-mail e papel interno", () => {
    const onCreateMember = vi.fn();
    render(<StaffManagerView members={[]} onUpdateRole={vi.fn()} onCreateMember={onCreateMember} />);

    fireEvent.change(screen.getByLabelText(/nome do membro/i), { target: { value: "Equipe Cozinha" } });
    fireEvent.change(screen.getByLabelText(/e-mail do membro/i), { target: { value: "cozinha@marmitastb.com.br" } });
    fireEvent.change(screen.getByLabelText(/papel do novo membro/i), { target: { value: "staff" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar convite/i }));

    expect(onCreateMember).toHaveBeenCalledWith({
      displayName: "Equipe Cozinha",
      email: "cozinha@marmitastb.com.br",
      role: "staff",
    });
    expect(screen.getByText(/o membro criará a própria senha/i)).toBeTruthy();
  });

  it("permite reenviar o convite de um membro interno sem exibir links ou tokens", () => {
    const onInviteMember = vi.fn();
    render(<StaffManagerView
      members={[{ id: "f37a4e26-ae35-4f9d-824e-e4c348e5b7e3", name: "Equipe Cozinha", email: "cozinha@marmitastb.com.br", role: "staff" }]}
      onUpdateRole={vi.fn()}
      onCreateMember={vi.fn()}
      onInviteMember={onInviteMember}
    />);

    fireEvent.click(screen.getByRole("button", { name: /reenviar convite para equipe cozinha/i }));

    expect(onInviteMember).toHaveBeenCalledWith("f37a4e26-ae35-4f9d-824e-e4c348e5b7e3");
    expect(screen.queryByText(/token/i)).toBeNull();
  });
});
