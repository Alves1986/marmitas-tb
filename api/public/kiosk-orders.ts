import { createKioskOrdersHandler } from "./orders.js";
import { asVercelNodeHandler } from "../../server/vercel/_lib/http.js";
import { createSupabaseKioskOrder } from "../../server/vercel/_lib/ordersRepository.js";

export default asVercelNodeHandler(createKioskOrdersHandler({
  createOrder: createSupabaseKioskOrder,
}));
