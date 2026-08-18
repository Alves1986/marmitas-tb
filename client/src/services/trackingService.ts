export type PublicTracking = {
  code: string;
  status: string;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  totalInCents: number;
  paymentStatus: "pending" | "confirmed";
  paymentMethod: "pix" | "credit_card" | "voucher" | "cash";
  paymentProvider: "asaas_test" | "asaas";
  fulfillmentMethod: "delivery" | "pickup";
  createdAt: string;
  events: Array<{ id: string; toStatus: string | null; message: string | null; createdAt: string }>;
};

type TrackingDependencies = {
  request: (path: string) => Promise<PublicTracking>;
};

function query(parameters: Record<string, string>): string {
  return new URLSearchParams(parameters).toString();
}

export function createVercelTrackingService({ request }: TrackingDependencies) {
  return {
    byPhone(phone: string) {
      return request(`/api/public/orders?${query({ phone })}`);
    },
    byCode(code: string, phone: string) {
      return request(`/api/public/orders?${query({ code: code.trim().toUpperCase(), phone })}`);
    },
  };
}
