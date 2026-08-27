import { asVercelNodeHandler, jsonError } from "../../server/vercel/_lib/http.js";
import { createDefaultOperationsAlertsHandler } from "../../server/vercel/_lib/operations/alerts.js";
import { createDefaultInventoryUnavailableHandler } from "../../server/vercel/_lib/operations/inventory.js";
import { createDefaultOperationsOrdersHandler } from "../../server/vercel/_lib/operations/orders.js";
import { createDefaultPrintJobsHandler } from "../../server/vercel/_lib/operations/printJobs.js";

export type OperationResource = "orders" | "alerts" | "inventory" | "printJobs";
export type OperationHandler = (request: Request) => Promise<Response>;
export type OperationHandlerFactories = Record<OperationResource, () => OperationHandler>;

const defaultHandlerFactories: OperationHandlerFactories = {
  orders: createDefaultOperationsOrdersHandler,
  alerts: createDefaultOperationsAlertsHandler,
  inventory: createDefaultInventoryUnavailableHandler,
  printJobs: createDefaultPrintJobsHandler,
};

export function getOperationResource(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? null;
}

export function createOperationsResourceHandler(
  factories: OperationHandlerFactories = defaultHandlerFactories,
) {
  return async function operationsResourceHandler(request: Request): Promise<Response> {
    const resource = getOperationResource(request);
    if (!resource || !(resource in factories)) {
      return jsonError(404, "Recurso operacional não encontrado.");
    }

    return factories[resource as OperationResource]()(request);
  };
}

export default asVercelNodeHandler(createOperationsResourceHandler());
