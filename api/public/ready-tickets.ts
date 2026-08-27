import { asVercelNodeHandler } from "../../server/vercel/_lib/http.js";
import { createDefaultPublicReadyTicketsHandler } from "../../server/vercel/_lib/publicReadyTickets.js";

export default asVercelNodeHandler(createDefaultPublicReadyTicketsHandler());
