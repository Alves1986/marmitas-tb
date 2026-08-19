// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseAuth", () => ({
  requestTeamOtp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: {} },
}));

import StaffAccess from "./StaffAccess";

describe("StaffAccess", () => {
  it("orienta a equipe a abrir o link enviado por e-mail, sem pedir um código inexistente", async () => {
    render(<StaffAccess />);

    fireEvent.change(screen.getByLabelText(/e-mail autorizado/i), {
      target: { value: "cassia.andinho@gmail.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar link de acesso/i }));

    await waitFor(() => {
      expect(screen.getByText(/enviamos um link de acesso/i)).toBeTruthy();
    });

    expect(screen.getByText(/abra o e-mail e toque no link/i)).toBeTruthy();
    expect(screen.queryByText(/digite o código/i)).toBeNull();
    expect(screen.queryByLabelText(/código de acesso/i)).toBeNull();
  });
});
