// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const categoryId = "18e59e53-81f3-494d-90b9-420dbe4a0892";
const staffId = "b1e9f8d4-5e0d-4a3f-a4d7-2f1f15c31e21";

const mocks = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  upsertCategory: vi.fn(),
  upsertProduct: vi.fn(),
  setAvailability: vi.fn(),
  listStaff: vi.fn(),
  setStaffRole: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  legacyCatalogQuery: vi.fn(),
  legacySaveCategory: vi.fn(),
  legacySaveProduct: vi.fn(),
  legacySetAvailability: vi.fn(),
  legacyStaffQuery: vi.fn(),
  legacyUpdateStaff: vi.fn(),
  legacySettingsQuery: vi.fn(),
  legacyUpdateSettings: vi.fn(),
}));

vi.mock("@/lib/runtimeConfig", () => ({ isVercelRuntime: () => true }));
vi.mock("@/services/adminService", () => ({
  createVercelAdminService: () => ({
    getCatalog: mocks.getCatalog,
    upsertCategory: mocks.upsertCategory,
    upsertProduct: mocks.upsertProduct,
    setAvailability: mocks.setAvailability,
    listStaff: mocks.listStaff,
    setStaffRole: mocks.setStaffRole,
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
  }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      catalog: { listAdmin: { invalidate: vi.fn() } },
      admin: { listStaff: { invalidate: vi.fn() }, getSettings: { invalidate: vi.fn() } },
    }),
    catalog: {
      listAdmin: { useQuery: mocks.legacyCatalogQuery },
      upsertCategory: { useMutation: () => ({ mutateAsync: mocks.legacySaveCategory, isPending: false }) },
      upsertProduct: { useMutation: () => ({ mutateAsync: mocks.legacySaveProduct, isPending: false }) },
      setAvailability: { useMutation: () => ({ mutate: mocks.legacySetAvailability, isPending: false }) },
    },
    admin: {
      listStaff: { useQuery: mocks.legacyStaffQuery },
      upsertStaff: { useMutation: () => ({ mutateAsync: mocks.legacyUpdateStaff, isPending: false, error: null }) },
      getSettings: { useQuery: mocks.legacySettingsQuery },
      updateSettings: { useMutation: () => ({ mutateAsync: mocks.legacyUpdateSettings, isPending: false }) },
    },
  },
}));

import { MenuManager } from "./MenuManager";
import { StaffManager } from "./StaffManager";
import { StoreSettingsForm } from "./StoreSettingsForm";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCatalog.mockResolvedValue({
    categories: [{ id: categoryId, name: "Marmitas", slug: "marmitas", sort_order: 1, is_active: true }],
    products: [],
    options: [],
  });
  mocks.listStaff.mockResolvedValue([{ id: staffId, display_name: "Joana", role: "customer", created_at: "2026-08-18T00:00:00.000Z" }]);
  mocks.getSettings.mockResolvedValue({ storeName: "Marmitas TB", deliveryFeeInCents: 500, openingHours: "Segunda a sábado", paymentMode: "test", autoPrint: true });
  mocks.upsertCategory.mockResolvedValue({ id: categoryId });
  mocks.setStaffRole.mockResolvedValue({ id: staffId, role: "staff" });
  mocks.updateSettings.mockResolvedValue(undefined);
  mocks.legacyCatalogQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  mocks.legacyStaffQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  mocks.legacySettingsQuery.mockReturnValue({ data: null, isLoading: false, error: null });
});

afterEach(cleanup);

describe("gerenciadores administrativos no runtime Vercel", () => {
  it("edita categoria com UUID pelo serviço Vercel sem chamar o legado", async () => {
    render(<MenuManager />);

    await screen.findByRole("heading", { name: "Marmitas" });
    fireEvent.click(screen.getByRole("button", { name: /editar categoria/i }));
    fireEvent.change(screen.getByLabelText(/nome da categoria marmitas/i), { target: { value: "Marmitas do dia" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar categoria/i }));

    await waitFor(() => expect(mocks.upsertCategory).toHaveBeenCalledWith(expect.objectContaining({ id: categoryId, name: "Marmitas do dia" })));
    expect(mocks.legacySaveCategory).not.toHaveBeenCalled();
    expect(mocks.legacyCatalogQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });

  it("atribui papel pelo UUID Supabase sem chamar o legado", async () => {
    render(<StaffManager />);

    await screen.findByText("Joana");
    fireEvent.change(screen.getByLabelText(/papel de joana/i), { target: { value: "staff" } });

    await waitFor(() => expect(mocks.setStaffRole).toHaveBeenCalledWith(staffId, "staff"));
    expect(mocks.legacyUpdateStaff).not.toHaveBeenCalled();
    expect(mocks.legacyStaffQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });

  it("salva configurações pelo serviço Vercel sem chamar o legado", async () => {
    render(<StoreSettingsForm />);

    await screen.findByDisplayValue("Marmitas TB");
    fireEvent.change(screen.getByLabelText(/nome da loja/i), { target: { value: "Marmitas TB Centro" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar configurações/i }));

    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ storeName: "Marmitas TB Centro" })));
    expect(mocks.legacyUpdateSettings).not.toHaveBeenCalled();
    expect(mocks.legacySettingsQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });
});
