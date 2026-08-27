import { apiRequest } from "@/lib/api";
import type { PublicReadyTicket } from "@/lib/publicCallsBoard";

export function createPublicCallsService(request = apiRequest) {
  return {
    listReadyTickets() {
      return request<PublicReadyTicket[]>("/api/public/ready-tickets");
    },
  };
}

export const publicCallsService = createPublicCallsService();
