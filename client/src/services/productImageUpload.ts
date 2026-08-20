export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateProductImageFile(file: File) {
  if (!acceptedImageTypes.has(file.type)) throw new Error("Envie uma imagem JPG, PNG ou WebP.");
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error("A foto deve ter no máximo 5 MB.");
}

function createImageSource(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível converter a imagem para WebP."));
    }, "image/webp", 0.84);
  });
}

export async function convertProductImageToWebp(file: File): Promise<File> {
  validateProductImageFile(file);
  const image = await createImageSource(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem para envio.");
  context.drawImage(image, 0, 0, width, height);
  const webp = await canvasToWebp(canvas);
  if (webp.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error("A foto convertida ultrapassou o limite de 5 MB.");
  const name = file.name.replace(/\.[^/.]+$/, "") || "produto";
  return new File([webp], `${name}.webp`, { type: "image/webp" });
}
