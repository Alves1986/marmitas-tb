export const orderStatuses = [
  "aguardando_pagamento",
  "confirmado",
  "em_preparo",
  "saiu_para_entrega",
  "pronto_para_retirada",
  "concluido",
  "cancelado",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  aguardando_pagamento: ["confirmado", "cancelado"],
  confirmado: ["em_preparo", "cancelado"],
  em_preparo: ["saiu_para_entrega", "pronto_para_retirada", "cancelado"],
  saiu_para_entrega: ["concluido", "cancelado"],
  pronto_para_retirada: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}
