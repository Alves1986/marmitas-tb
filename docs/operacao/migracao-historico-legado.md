# Migração do histórico operacional legado

## Finalidade

O comando `pnpm migration:export-legacy` cria um **snapshot somente leitura** das cinco coleções operacionais que ainda usam IDs numéricos no MySQL/TiDB legado: pedidos, itens, eventos de pedido, eventos de pagamento e trabalhos de impressão. Ele não chama o Supabase, não modifica o banco legado e não muda a rota de produção.

O arquivo é salvo em `migration-artifacts/` com permissões restritas ao usuário local e está excluído do Git. Por conter dados de clientes, endereços e histórico de pedidos, o snapshot não deve ser enviado por e-mail, anexado a tickets, publicado no GitHub ou armazenado em local público.

## Execução autorizada

Use o exportador somente após confirmar que o ambiente possui `DATABASE_URL` e que há autorização operacional para produzir uma cópia local dos dados históricos.

```bash
pnpm migration:export-legacy
```

O comando emite apenas o caminho do arquivo e as contagens por coleção. Não imprime pedidos, telefones, endereços ou conteúdo de eventos no terminal.

| Coleção exportada | Referência de migração | Tratamento futuro |
| --- | --- | --- |
| `orders` | `id` numérico legado | Novo UUID no Supabase; conservar `code` como chave de reconciliação. |
| `orderItems` | `orderId` numérico | Mapear ao UUID do pedido importado. |
| `orderEvents` | `actorUserId` numérico | Manter a referência original em tabela de mapeamento; não gravar diretamente em `profiles.id`. |
| `paymentEvents` | `orderId` numérico | Mapear ao UUID do pedido e manter a chave idempotente do provedor. |
| `printJobs` | `orderId` numérico | Mapear ao UUID do pedido somente após validar a fila operacional. |

## Revisão antes da importação

Antes de desenvolver o importador, compare as contagens do JSON com o banco legado e defina uma tabela de mapeamento auditável de IDs numéricos para UUIDs. Registros com `configurationJson` ou `payloadJson` inválidos são preservados como texto pelo exportador; devem ser corrigidos ou explicitamente aprovados, nunca descartados silenciosamente.

> Não execute importação no Supabase enquanto o ambiente de prévia não estiver autorizado, o snapshot não estiver revisado e a estratégia de autoria de `order_events` e `store_settings` não estiver aprovada.
