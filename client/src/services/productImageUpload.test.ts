import { describe, expect, it } from "vitest";
import { PRODUCT_IMAGE_MAX_BYTES, validateProductImageFile } from "./productImageUpload";

describe("processamento de foto de produto", () => {
  it("aceita uma foto JPEG de até 5 MB para conversão em WebP", () => {
    const file = new File([new Uint8Array(1024)], "marmita.jpg", { type: "image/jpeg" });

    expect(() => validateProductImageFile(file)).not.toThrow();
  });

  it("recusa uma foto acima do limite de 5 MB antes de qualquer conversão", () => {
    const file = new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1)], "marmita.png", { type: "image/png" });

    expect(() => validateProductImageFile(file)).toThrow("A foto deve ter no máximo 5 MB.");
  });

  it("recusa arquivos que não sejam imagem", () => {
    const file = new File(["conteúdo"], "cardapio.pdf", { type: "application/pdf" });

    expect(() => validateProductImageFile(file)).toThrow("Envie uma imagem JPG, PNG ou WebP.");
  });
});
