export type PublicReadyTicket = {
  ticket: string;
  readyAt: string;
};

export type PublicCallsBoard = {
  featured: PublicReadyTicket | null;
  recent: PublicReadyTicket[];
};

export function buildPublicCallsBoard(tickets: PublicReadyTicket[]): PublicCallsBoard {
  return {
    featured: tickets[0] ?? null,
    recent: tickets.slice(1, 6),
  };
}
