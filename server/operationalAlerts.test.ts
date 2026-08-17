import { describe, expect, it } from "vitest";
import { buildOperationalAcknowledgementEvent } from "./db";

describe("buildOperationalAcknowledgementEvent", () => {
  it("registra o pedido e o membro da equipe que reconheceu o alerta", () => {
    expect(buildOperationalAcknowledgementEvent(17, 4)).toEqual({
      orderId: 17,
      actorUserId: 4,
      eventType: "alert_acknowledged",
      message: "Alerta de novo pedido reconhecido pela equipe.",
    });
  });
});
