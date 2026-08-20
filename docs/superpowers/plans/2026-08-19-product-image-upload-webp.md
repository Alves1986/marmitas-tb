# Upload WebP de fotos de produto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o campo manual de URL de foto por envio de imagem com prévia, limite de 5 MB, conversão WebP, upload assinado ao Supabase Storage e persistência do caminho no produto.

**Architecture:** O navegador valida e converte JPEG, PNG ou WebP para um arquivo WebP dimensionado antes do upload. Um endpoint administrativo autenticado cria uma URL de upload assinada e um caminho aleatório no bucket `marmitas-tb-assets`; o navegador envia o arquivo convertido diretamente ao Storage usando o token temporário. O formulário salva apenas o `image_path` retornado, que já é o campo persistido na tabela `products` e é transformado na URL pública existente para a vitrine.

**Tech Stack:** React 19, TypeScript, Canvas API, Supabase JS Storage, Supabase Storage, Vercel Functions, Zod, Vitest e Testing Library.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade depois da alteração |
|---|---|
| `client/src/lib/productImageUpload.ts` | Validar o arquivo de origem e convertê-lo em WebP com limite de dimensão. |
| `client/src/lib/productImageUpload.test.ts` | Cobrir tipos permitidos, limite de 5 MB, redimensionamento e erro de conversão. |
| `client/src/components/admin/ProductImageUploadField.tsx` | Exibir seletor de arquivo, prévia, estado de conversão e mensagem de limite. |
| `client/src/components/admin/ProductImageUploadField.test.tsx` | Cobrir prévia, erro de arquivo inválido e preservação de imagem existente. |
| `client/src/components/admin/MenuManager.tsx` | Orquestrar conversão, upload e gravação do caminho retornado no produto. |
| `client/src/components/admin/Admin.runtime.vercel.test.tsx` | Cobrir que um produto salvo após upload recebe o caminho WebP do servidor. |
| `client/src/services/adminService.ts` | Solicitar URL assinada e fazer upload com a sessão Supabase atual. |
| `api/admin/catalog.ts` | Autorizar `POST` para solicitar upload assinado de `image/webp`. |
| `server/vercel/_lib/productImageStorage.ts` | Criar caminho não previsível e URL assinada no bucket `marmitas-tb-assets`. |
| `server/vercel/admin/catalog.test.ts` | Cobrir autorização, validação e resposta do contrato de upload. |

### Task 1: Definir a conversão WebP no navegador em TDD

**Files:**
- Create: `client/src/lib/productImageUpload.ts`
- Create: `client/src/lib/productImageUpload.test.ts`

- [ ] **Step 1: Escrever testes que falham para a validação local.**

```ts
import { MAX_PRODUCT_IMAGE_BYTES, prepareProductImage } from "./productImageUpload";

it("rejeita arquivo maior que 5 MB antes da conversão", async () => {
  const tooLarge = new File([new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1)], "foto.jpg", { type: "image/jpeg" });
  await expect(prepareProductImage(tooLarge)).rejects.toThrow("A foto deve ter no máximo 5 MB.");
});

it("rejeita formato diferente de JPEG, PNG ou WebP", async () => {
  const pdf = new File(["x"], "cardapio.pdf", { type: "application/pdf" });
  await expect(prepareProductImage(pdf)).rejects.toThrow("Envie uma imagem JPEG, PNG ou WebP.");
});

it("gera arquivo WebP com extensão .webp", async () => {
  mockImageBitmap({ width: 2400, height: 1200 });
  mockCanvasBlob(new Blob(["webp"], { type: "image/webp" }));
  const image = new File(["jpeg"], "marmita.jpg", { type: "image/jpeg" });

  await expect(prepareProductImage(image)).resolves.toMatchObject({
    file: expect.objectContaining({ name: "marmita.webp", type: "image/webp" }),
    width: 1600,
    height: 800,
  });
});
```

- [ ] **Step 2: Rodar os testes para provar a falha inicial.**

Run: `pnpm vitest run client/src/lib/productImageUpload.test.ts`

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implementar validação e conversão mínima.**

```ts
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function prepareProductImage(source: File) {
  if (!ACCEPTED_TYPES.has(source.type)) throw new Error("Envie uma imagem JPEG, PNG ou WebP.");
  if (source.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("A foto deve ter no máximo 5 MB.");
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_PRODUCT_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível converter a foto para WebP.")), "image/webp", 0.84));
  const basename = source.name.replace(/\.[^.]+$/, "") || "produto";
  return { file: new File([blob], `${basename}.webp`, { type: "image/webp" }), width, height };
}
```

Garantir que `bitmap.close?.()` seja chamado em `finally` e que ausência de contexto 2D gere a mesma mensagem orientada ao usuário.

- [ ] **Step 4: Rodar o teste focal e confirmar passagem.**

Run: `pnpm vitest run client/src/lib/productImageUpload.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit lógico.**

```bash
git add client/src/lib/productImageUpload.ts client/src/lib/productImageUpload.test.ts
git commit -m "feat: prepare product photos as webp"
```

### Task 2: Criar a emissão de upload assinado restrita a administradores

**Files:**
- Create: `server/vercel/_lib/productImageStorage.ts`
- Modify: `api/admin/catalog.ts:42-68,131-139`
- Modify: `server/vercel/admin/catalog.test.ts`

- [ ] **Step 1: Escrever a regressão do endpoint de upload.**

```ts
it("emite upload assinado WebP somente para administrador", async () => {
  const createProductImageUpload = vi.fn().mockResolvedValue({ path: "catalog/products/id.webp", token: "signed-token" });
  const response = await createAdminCatalogHandler({
    ...dependencies,
    createProductImageUpload,
  })(new Request("https://site.test/api/admin/catalog", {
    method: "POST",
    body: JSON.stringify({ contentType: "image/webp" }),
  }));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ path: "catalog/products/id.webp", token: "signed-token" });
});

it("recusa solicitar upload para tipo diferente de WebP", async () => {
  const response = await handler(new Request("https://site.test/api/admin/catalog", { method: "POST", body: JSON.stringify({ contentType: "image/jpeg" }) }));
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Executar o teste e registrar a falha.**

Run: `pnpm vitest run server/vercel/admin/catalog.test.ts`

Expected: FAIL porque `POST` ainda retorna `405` e a dependência não existe.

- [ ] **Step 3: Implementar o helper de Storage e contrato HTTP.**

Em `server/vercel/_lib/productImageStorage.ts`, criar a função que usa o client de serviço somente para assinar o upload:

```ts
const PRODUCT_ASSET_BUCKET = "marmitas-tb-assets";

export async function createProductImageUpload(client: ReturnType<typeof createSupabaseAdmin>) {
  const path = `catalog/products/${crypto.randomUUID()}.webp`;
  const { data, error } = await client.storage.from(PRODUCT_ASSET_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error("Não foi possível preparar o envio da foto do produto.");
  return { path, token: data.token };
}
```

Em `api/admin/catalog.ts`, adicionar `const imageUploadInput = z.object({ contentType: z.literal("image/webp") });`, incluir `createProductImageUpload` em `AdminCatalogDependencies` e tratar `POST` após `GET`:

```ts
if (request.method === "POST") {
  const input = imageUploadInput.safeParse(await request.json());
  if (!input.success) return jsonError(400, "Envie uma imagem WebP válida.");
  return json(200, await dependencies.createProductImageUpload());
}
```

O default handler deve passar `() => createProductImageUpload(client)`. Não aceitar caminho, nome original ou bucket enviados pelo navegador.

- [ ] **Step 4: Rodar o teste focal e confirmar passagem.**

Run: `pnpm vitest run server/vercel/admin/catalog.test.ts`

Expected: PASS, incluindo o bloqueio de papel já existente.

- [ ] **Step 5: Commit lógico.**

```bash
git add api/admin/catalog.ts server/vercel/_lib/productImageStorage.ts server/vercel/admin/catalog.test.ts
git commit -m "feat: issue signed product image uploads"
```

### Task 3: Integrar o upload assinado ao serviço administrativo

**Files:**
- Modify: `client/src/services/adminService.ts`
- Modify: `client/src/services/adminService.test.ts` (criar se inexistente)

- [ ] **Step 1: Escrever testes que falham para o contrato de serviço.**

```ts
it("solicita token assinado e envia apenas arquivo WebP ao Storage", async () => {
  mockApiRequest.mockResolvedValue({ path: "catalog/products/id.webp", token: "token" });
  mockSupabase.storage.from.mockReturnValue({ uploadToSignedUrl: vi.fn().mockResolvedValue({ error: null }) });

  await createVercelAdminService().uploadProductImage(new File(["webp"], "produto.webp", { type: "image/webp" }));

  expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/catalog", expect.objectContaining({ method: "POST" }));
  expect(mockSupabase.storage.from).toHaveBeenCalledWith("marmitas-tb-assets");
  expect(mockSupabase.storage.from().uploadToSignedUrl).toHaveBeenCalledWith("catalog/products/id.webp", "token", expect.any(File), { contentType: "image/webp" });
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha inicial.**

Run: `pnpm vitest run client/src/services/adminService.test.ts`

Expected: FAIL porque `uploadProductImage` não existe.

- [ ] **Step 3: Implementar o método de serviço.**

Importar `supabase` de `@/lib/supabaseClient`. Adicionar a `createVercelAdminService`:

```ts
async uploadProductImage(file: File): Promise<{ path: string }> {
  if (file.type !== "image/webp") throw new Error("A foto precisa ser convertida para WebP antes do envio.");
  const signed = await request<{ path: string; token: string }>("/api/admin/catalog", {
    method: "POST",
    body: JSON.stringify({ contentType: "image/webp" }),
  });
  const { error } = await supabase.storage.from("marmitas-tb-assets").uploadToSignedUrl(signed.path, signed.token, file, { contentType: "image/webp" });
  if (error) throw new Error("Não foi possível enviar a foto do produto.");
  return { path: signed.path };
}
```

- [ ] **Step 4: Rodar o teste focal e confirmar passagem.**

Run: `pnpm vitest run client/src/services/adminService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit lógico.**

```bash
git add client/src/services/adminService.ts client/src/services/adminService.test.ts
git commit -m "feat: upload webp product images through signed storage"
```

### Task 4: Substituir o campo de URL pelo seletor de foto

**Files:**
- Create: `client/src/components/admin/ProductImageUploadField.tsx`
- Create: `client/src/components/admin/ProductImageUploadField.test.tsx`
- Modify: `client/src/components/admin/MenuManager.tsx:11-39,73-115` e o bloco visual do formulário de produto
- Modify: `client/src/components/admin/Admin.runtime.vercel.test.tsx`

- [ ] **Step 1: Escrever as regressões de interface.**

```tsx
it("informa o limite de 5 MB e mostra a prévia WebP preparada", async () => {
  render(<ProductImageUploadField productName="Marmita" imagePath="catalog/atual.webp" onPrepared={onPrepared} />);
  expect(screen.getByText(/máximo de 5 MB/i)).toBeInTheDocument();
  await userEvent.upload(screen.getByLabelText(/foto do produto/i), jpegFile);
  expect(await screen.findByAltText("Prévia da foto de Marmita")).toHaveAttribute("src", expect.stringMatching(/^blob:/));
  expect(onPrepared).toHaveBeenCalledWith(expect.objectContaining({ type: "image/webp" }));
});

it("mantém a imagem existente se uma nova imagem não for selecionada", () => {
  render(<ProductImageUploadField productName="Marmita" imagePath="catalog/atual.webp" onPrepared={onPrepared} />);
  expect(screen.getByAltText("Prévia da foto de Marmita")).toHaveAttribute("src", expect.stringContaining("catalog/atual.webp"));
});
```

No teste runtime de `MenuManager`, adicionar que `uploadProductImage` é chamado com arquivo `image/webp` e que `upsertProduct` recebe `imagePath: "catalog/products/id.webp"`.

- [ ] **Step 2: Executar as regressões e confirmar falha inicial.**

Run: `pnpm vitest run client/src/components/admin/ProductImageUploadField.test.tsx client/src/components/admin/Admin.runtime.vercel.test.tsx`

Expected: FAIL porque o seletor e o método de upload não existem.

- [ ] **Step 3: Criar o componente de campo de imagem.**

O componente deve conter o input abaixo, estado de preparação e prévia local. Não aceitar URL manual:

```tsx
<Input
  id="product-image"
  aria-label="Foto do produto"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
  disabled={disabled}
/>
<p className="text-xs text-[#765f50]">JPEG, PNG ou WebP, com no máximo 5 MB. A foto será otimizada e salva em WebP.</p>
```

`handleFile` deve chamar `prepareProductImage`, revogar o blob URL anterior antes de criar outro e exibir a mensagem de erro retornada. O `useEffect` de limpeza deve revogar o blob URL ao desmontar. A prévia local tem prioridade sobre `imagePath`; quando não existir nenhuma fonte, manter uma instrução acessível para selecionar a primeira foto.

- [ ] **Step 4: Integrar o componente ao formulário e salvar o caminho retornado.**

Em `MenuManager`, manter `imagePath` no modelo como referência persistida, adicionar `preparedImage: File | null` no estado e remover o `Input` textual de “Caminho ou URL da foto”. No `submitProduct`, antes de `upsertProduct`, realizar:

```ts
const uploadedImage = preparedImage ? await adminService.uploadProductImage(preparedImage) : null;
const imagePath = uploadedImage?.path ?? form.imagePath || null;
return adminService.upsertProduct({ ...productInput, imagePath });
```

Após salvar com sucesso, limpar `preparedImage` e o formulário. Ao editar sem selecionar arquivo, enviar `form.imagePath` sem reupload, preservando a foto já registrada. Em caso de falha de conversão ou upload, manter campos e a foto antiga visíveis para correção; não chamar `upsertProduct`.

- [ ] **Step 5: Executar os testes de componente e runtime.**

Run: `pnpm vitest run client/src/components/admin/ProductImageUploadField.test.tsx client/src/components/admin/Admin.runtime.vercel.test.tsx`

Expected: PASS, incluindo persistência de path WebP e preservação da imagem existente.

- [ ] **Step 6: Commit lógico.**

```bash
git add client/src/components/admin/ProductImageUploadField.tsx client/src/components/admin/ProductImageUploadField.test.tsx client/src/components/admin/MenuManager.tsx client/src/components/admin/Admin.runtime.vercel.test.tsx
git commit -m "feat: add webp product photo upload field"
```

### Task 5: Verificação integrada e documentação

**Files:**
- Modify: `todo.md`
- Modify: `docs/homologacao-producao-2026-08-19.md`

- [ ] **Step 1: Executar a suíte completa e os builds.**

Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime`

Expected: todos os testes aprovados, TypeScript sem erros e builds PWA/Vercel concluídos.

- [ ] **Step 2: Validar visualmente o cardápio administrativo.**

Abrir `/admin#admin-catalog`, selecionar um JPEG menor que 5 MB e confirmar: prévia, texto de limite, conversão WebP, botão de salvar, foto renderizada no card após atualização e ausência de campo para URL. Tentar um arquivo de 5 MB + 1 byte e confirmar mensagem sem envio.

- [ ] **Step 3: Atualizar controle e evidências.**

Marcar como concluída em `todo.md` a tarefa de envio WebP. No relatório, registrar que os bytes ficam no bucket público `marmitas-tb-assets`, enquanto `products.image_path` guarda o caminho WebP retornado; não registrar conteúdo binário em colunas do banco.

- [ ] **Step 4: Salvar checkpoint.**

```bash
# Use o checkpoint da plataforma após confirmar o todo.md.
```

