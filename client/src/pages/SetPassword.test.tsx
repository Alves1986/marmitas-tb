// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  setNewPassword: vi.fn().mockResolvedValue(undefined),
  loadSessionUser: vi.fn(),
}));
const navigationMocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  setNewPassword: authMocks.setNewPassword,
  loadSessionUser: authMocks.loadSessionUser,
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: {} },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/definir-senha", navigationMocks.setLocation],
}));

import SetPassword from "./SetPassword";

afterEach(cleanup);
beforeEach(() => {
  authMocks.setNewPassword.mockReset();
  authMocks.setNewPassword.mockResolvedValue(undefined);
  authMocks.loadSessionUser.mockReset();
  authMocks.loadSessionUser.mockResolvedValue({ id: "staff-1", email: "equipe@marmitastb.com.br", name: "Equipe", role: "staff" });
  navigationMocks.setLocation.mockReset();
});

describe("SetPassword", () => {
  it("define a senha confirmada e direciona a pessoa da operação", async () => {
    render(<SetPassword />);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar senha/i }));

    await waitFor(() => {
      expect(authMocks.setNewPassword).toHaveBeenCalledWith(expect.anything(), "senha-nova-segura-123");
      expect(navigationMocks.setLocation).toHaveBeenCalledWith("/operacao");
    });
  });

  it("direciona o administrador à gestão após definir a senha", async () => {
    authMocks.loadSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "cassia.andinho@gmail.com", name: "Cássia", role: "admin" });
    render(<SetPassword />);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar senha/i }));

    await waitFor(() => {
      expect(navigationMocks.setLocation).toHaveBeenCalledWith("/admin");
    });
  });

  it("não envia a senha quando as confirmações divergem", () => {
    render(<SetPassword />);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "outra-senha-segura" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar senha/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/não coincidem/i);
    expect(authMocks.setNewPassword).not.toHaveBeenCalled();
  });

  it("bloqueia uma nova senha com menos de doze caracteres", () => {
    render(<SetPassword />);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "curta" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "curta" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar senha/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/pelo menos 12 caracteres/i);
    expect(authMocks.setNewPassword).not.toHaveBeenCalled();
  });

  it("não expõe detalhes do link de convite ou recuperação quando a atualização falha", async () => {
    authMocks.setNewPassword.mockRejectedValueOnce(new Error("Token inválido"));
    render(<SetPassword />);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senha-nova-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/não foi possível definir a senha/i);
    });
    expect(screen.queryByText(/token inválido/i)).toBeNull();
  });
});
