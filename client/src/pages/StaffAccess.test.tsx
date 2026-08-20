// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  loadSessionUser: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(undefined),
}));
const navigationMocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  signInWithPassword: authMocks.signInWithPassword,
  loadSessionUser: authMocks.loadSessionUser,
  requestPasswordReset: authMocks.requestPasswordReset,
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: {} },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/acesso", navigationMocks.setLocation],
}));

import StaffAccess from "./StaffAccess";

afterEach(cleanup);
beforeEach(() => {
  authMocks.signInWithPassword.mockReset();
  authMocks.signInWithPassword.mockResolvedValue(undefined);
  authMocks.loadSessionUser.mockReset();
  authMocks.loadSessionUser.mockResolvedValue({ id: "staff-1", email: "equipe@marmitastb.com.br", name: "Equipe", role: "staff" });
  authMocks.requestPasswordReset.mockReset();
  authMocks.requestPasswordReset.mockResolvedValue(undefined);
  navigationMocks.setLocation.mockReset();
});

describe("StaffAccess", () => {
  it("mantém um caminho explícito para a gestão, além do retorno ao cardápio público", () => {
    render(<StaffAccess />);

    expect(screen.getByRole("link", { name: /ir para gestão/i }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: /voltar ao cardápio/i }).getAttribute("href")).toBe("/");
  });

  it("autentica a equipe diariamente por e-mail e senha, sem pedir magic link", async () => {
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "cassia.andinho@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar na operação/i }));

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith(
        expect.anything(),
        "cassia.andinho@gmail.com",
        "senha-segura-123",
      );
      expect(navigationMocks.setLocation).toHaveBeenCalledWith("/operacao");
    });

    expect(screen.queryByText(/enviamos um link de acesso/i)).toBeNull();
    expect(screen.queryByText(/abra o e-mail e toque no link/i)).toBeNull();
  });

  it("direciona o administrador autenticado à gestão", async () => {
    authMocks.loadSessionUser.mockResolvedValueOnce({
      id: "admin-1",
      email: "cassia.andinho@gmail.com",
      name: "Cássia",
      role: "admin",
    });
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "cassia.andinho@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar na operação/i }));

    await waitFor(() => {
      expect(navigationMocks.setLocation).toHaveBeenCalledWith("/admin");
    });
  });

  it("bloqueia a senha com menos de doze caracteres antes de chamar a autenticação", async () => {
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "cassia.andinho@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "curta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar na operação/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/pelo menos 12 caracteres/i);
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("mostra uma mensagem neutra quando as credenciais não são aceitas", async () => {
    authMocks.signInWithPassword.mockRejectedValueOnce(new Error("Invalid login credentials"));
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "naoexiste@marmitastb.com.br" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar na operação/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/não foi possível entrar com essas credenciais/i);
    });
    expect(screen.queryByText(/invalid login credentials/i)).toBeNull();
  });

  it("explica que a senha foi aceita quando o perfil autenticado não possui papel interno", async () => {
    authMocks.loadSessionUser.mockResolvedValueOnce({
      id: "customer-1",
      email: "cliente@marmitastb.com.br",
      name: "Cliente",
      role: "user",
    });
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "cliente@marmitastb.com.br" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar na operação/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/senha foi aceita.*não possui acesso interno/i);
    });
  });

  it("solicita a recuperação de senha sem confirmar se o e-mail possui uma conta", async () => {
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "equipe@marmitastb.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(authMocks.requestPasswordReset).toHaveBeenCalledWith(expect.anything(), "equipe@marmitastb.com.br");
    });
    expect(screen.getByRole("status").textContent).toMatch(/se houver uma conta interna vinculada/i);
  });

  it("não exibe detalhes do provedor quando a solicitação de recuperação falha", async () => {
    authMocks.requestPasswordReset.mockRejectedValueOnce(new Error("Rate limit exceeded"));
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "equipe@marmitastb.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/não foi possível enviar as instruções/i);
    });
    expect(screen.queryByText(/rate limit exceeded/i)).toBeNull();
  });
});
