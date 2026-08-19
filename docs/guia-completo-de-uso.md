# Guia completo de uso — Marmitas TB

**Público:** clientes, equipe operacional e administradores.  
**Endereço de produção previsto:** [https://marmitastb.vercel.app](https://marmitastb.vercel.app)  
**Última atualização:** 19 de agosto de 2026.

> Este documento orienta o uso da Marmitas TB como vitrine, canal de pedidos, painel operacional e administração do cardápio. Ele também registra as limitações atuais que devem ser observadas antes do início de uma operação comercial com cobrança real.

## 1. Visão geral e acessos

O sistema centraliza a jornada do pedido: o cliente consulta o cardápio e envia o pedido, a equipe acompanha e movimenta a fila, e a administração mantém produtos, equipe e parâmetros da loja. Todos os valores são exibidos em reais (R$) e as telas públicas são responsivas para celular e computador.

| Perfil | Endereço | Finalidade | Acesso necessário |
|---|---|---|---|
| Cliente | `/` | Consultar cardápio, personalizar itens e realizar pedido | Não requer login |
| Cliente | `/acompanhar` | Consultar o pedido ativo pelo telefone ou por código | Telefone usado no pedido; código quando aplicável |
| Equipe | `/acesso` | Solicitar e validar o código de acesso por e-mail | Conta previamente autorizada |
| Operação | `/operacao` | Receber alertas, imprimir comandas e movimentar pedidos | Papel **staff** ou **admin** |
| Administração | `/admin` | Gerenciar cardápio, equipe e configurações | Papel **admin** |

Os endereços podem ser abertos diretamente após o domínio de produção. Por exemplo, a fila da cozinha ficará em `https://marmitastb.vercel.app/operacao`.

## 2. Informações importantes antes de operar

No estado atual, o sistema está configurado para **modo de teste** de pagamentos. PIX, cartão e vale-alimentação podem ser escolhidos na tela de checkout, mas **não existe cobrança oficial ativa pelo Asaas**. O modo oficial depende de credenciais Asaas válidas, configuração segura do webhook e uma homologação própria; não altere o modo de pagamento para Asaas enquanto essa ativação não tiver sido concluída.

Também há uma restrição conhecida no acesso da equipe: a tela `/acesso` espera um **código OTP numérico de seis dígitos**, enquanto o provedor de autenticação padrão pode enviar apenas links por e-mail. A operação diária com login por código deve começar somente depois da configuração de um SMTP transacional e do teste de recebimento do código numérico. Até essa validação, não se deve depender do acesso OTP como único procedimento operacional.

| Recurso | Situação atual | Procedimento seguro |
|---|---|---|
| Catálogo, carrinho e pedido | Disponíveis | Usar normalmente e conferir os dados antes de confirmar |
| Acompanhamento por telefone | Disponível com conexão à internet | Consultar o pedido ativo mais recente pelo telefone informado no checkout |
| Pagamentos | Teste, sem cobrança real | Não prometer QR Code, débito, crédito ou voucher processados pelo sistema |
| Acesso de equipe por OTP | Depende de SMTP transacional | Validar o e-mail/código antes do primeiro turno |
| Impressão automática | Depende do computador e impressora locais | Testar com pedido de teste antes de abrir a loja |

## 3. Como o cliente faz um pedido

### 3.1 Consultar o cardápio

1. Abra a página inicial da Marmitas TB.
2. Use os filtros de categoria ou o campo de busca para localizar a opção desejada.
3. Toque ou clique em um produto para abrir os detalhes. A tela mostra a foto, a descrição, o preço e, quando houver, opções de personalização.
4. Escolha as opções necessárias, informe uma observação quando disponível e selecione **Adicionar à sacola**.

A sacola é persistida localmente no navegador. Isso ajuda o cliente a retomar a seleção no mesmo aparelho, mas não substitui a confirmação final do pedido.

### 3.2 Conferir a sacola

Abra a **Sacola** para revisar quantidade, complementos, observações, subtotal, eventual taxa de entrega e total. Antes de avançar, remova itens indevidos ou ajuste quantidades.

> O pedido só é enviado após a ação **Confirmar pedido** na última etapa do checkout. Fechar o navegador ou voltar de tela antes disso não cria um pedido na fila.

### 3.3 Finalizar o checkout

O checkout possui quatro etapas. Os campos obrigatórios impedem o avanço quando estiverem vazios ou inválidos.

| Etapa | O que o cliente informa | Observações |
|---|---|---|
| **1. Seus dados** | Nome e telefone/WhatsApp | O telefone identifica o pedido no acompanhamento |
| **2. Recebimento** | Entrega ou retirada | Para entrega: endereço, bairro e referência opcional; para retirada: levar o número do pedido |
| **3. Pagamento** | PIX, dinheiro, cartão ou voucher | Dinheiro pode incluir valor para troco; os demais meios continuam em modo de teste nesta fase |
| **4. Revisão** | Conferência final dos itens, recebimento e total | Pressionar **Confirmar pedido** somente após revisar tudo |

Ao final, anote ou guarde o número/código do pedido apresentado na confirmação. Em pedidos para entrega, o sistema mostra uma estimativa de preparo e entrega; em retirada, mostra uma estimativa de preparo. Esses prazos são referências operacionais e devem ser confirmados pela equipe quando necessário.

## 4. Como acompanhar um pedido

Abra `https://marmitastb.vercel.app/acompanhar`. Existem duas formas de consulta:

1. **Por telefone:** informe o mesmo número utilizado no checkout. O sistema exibirá apenas o pedido ativo mais recente vinculado a esse telefone.
2. **Por código e telefone:** utilize esta alternativa quando o cliente tiver mais de um pedido ou quiser consultar um pedido específico.

A tela apresenta o código, a forma de recebimento, o valor em R$, a situação do pagamento e a linha do tempo do pedido. Os estados que podem aparecer são descritos a seguir.

| Status exibido | Significado para o cliente |
|---|---|
| Aguardando pagamento | A equipe ainda não confirmou a condição de pagamento necessária para seguir |
| Novo pedido | Pedido confirmado e aguardando início da produção |
| Em preparo | A cozinha iniciou o preparo |
| Em rota | Pedido saiu para entrega |
| Pronto para retirada | Pedido está pronto para ser retirado no local |
| Concluído | Entrega ou retirada foi finalizada |
| Cancelado | Pedido foi encerrado pela operação |

O rastreamento requer conexão com a internet. O PWA pode manter o shell da vitrine e imagens já abertas em cache, mas **consultas de pedido, pagamentos, operação e administração não funcionam offline**, para evitar informações desatualizadas.

## 5. Instalar como aplicativo (PWA)

Em aparelhos compatíveis, o navegador pode oferecer a ação **Instalar aplicativo**. Ao aceitar, a Marmitas TB passa a ter um ícone na tela inicial e pode abrir em uma janela própria. No Android, a opção normalmente aparece no aviso do site ou no menu do navegador; no iPhone/iPad, use o menu Compartilhar do Safari e escolha **Adicionar à Tela de Início**.

A instalação não cria uma conta, não substitui a conexão à internet e não altera a forma de pagamento. Ela apenas facilita o acesso recorrente ao cardápio e ao acompanhamento.

## 6. Rotina da equipe operacional

### 6.1 Acesso e preparação do turno

O acesso da operação é restrito a pessoas com os papéis **staff** ou **admin**. Abra `/acesso`, informe o e-mail previamente autorizado e, após receber e validar o código, acesse `/operacao`. Caso o código numérico não seja recebido, aplique a limitação de SMTP descrita na seção 2 e não tente contornar o controle de acesso.

Antes do primeiro pedido do turno, confira internet, energia, papel térmico, impressora padrão e saída de áudio. Na tela operacional, toque ou clique uma vez após o login para liberar os alertas sonoros: navegadores impedem áudio automático antes da primeira interação do usuário.

### 6.2 Receber e reconhecer novos pedidos

A fila operacional é atualizada periodicamente e apresenta alertas visuais e sonoros para pedidos confirmados ainda não reconhecidos. Quando um alerta chegar:

1. Selecione a ação para **reconhecer** o alerta.
2. Confira número, itens, personalizações, observações, forma de recebimento, telefone e forma de pagamento.
3. Abra a pré-visualização da comanda e imprima-a.
4. Inicie o preparo somente após a conferência.

O reconhecimento evita que o mesmo aviso continue disparando, mas não substitui a impressão nem a mudança de status do pedido.

### 6.3 Movimentar o pedido na fila

As transições são deliberadamente limitadas para manter uma linha do tempo coerente. A equipe deve usar a ação disponível na fila, e não comunicar um status ao cliente antes de registrá-lo no sistema.

| Situação atual | Ações disponíveis | Uso recomendado |
|---|---|---|
| Aguardando pagamento | Nenhuma ação de preparo | Conferir a condição de pagamento antes de seguir |
| Novo pedido | **Iniciar preparo** ou **Cancelar pedido** | Iniciar após validar os itens e a comanda |
| Em preparo | **Saiu para entrega**, **Pronto para retirada** ou **Cancelar pedido** | Escolher a ação compatível com o recebimento escolhido pelo cliente |
| Em rota | **Concluir entrega** ou **Cancelar pedido** | Concluir somente após a entrega efetiva |
| Pronto para retirada | **Concluir retirada** ou **Cancelar pedido** | Concluir somente quando o cliente retirar |
| Concluído ou cancelado | Nenhuma ação adicional | Manter apenas como histórico da fila |

### 6.4 Imprimir e reimprimir comandas

O sistema é preparado para impressora térmica de **80 mm**. O computador da cozinha deve ter o driver instalado, a impressora térmica definida como padrão e papel disponível. A opção de impressão automática depende da configuração da loja e das permissões locais do navegador; a reimpressão manual deve permanecer disponível como contingência.

Para uma estação dedicada, use Chrome ou Chromium em modo quiosque, substituindo o domínio conforme necessário:

```bash
google-chrome --kiosk --kiosk-printing "https://marmitastb.vercel.app/operacao"
```

O parâmetro `--kiosk-printing` só envia diretamente à impressora padrão quando o navegador, o sistema operacional, o driver e as permissões locais estiverem corretamente configurados. Em caso de falha, use **Reimprimir** na fila e verifique papel, tampa, cabo, energia, driver e impressora padrão. Consulte também o procedimento técnico em [Posto de operação e impressão de comandas](./operation-kiosk-printing.md).

### 6.5 Encerramento do turno

Ao encerrar, confira se não há pedidos em **Novo pedido**, **Em preparo**, **Em rota** ou **Pronto para retirada**. Resolva as pendências, registre cancelamentos quando aplicável, confira a fila de impressão e encerre a sessão do navegador no computador compartilhado.

## 7. Administração da loja

Somente administradores acessam `/admin`. O painel reúne cardápio, equipe e configurações. Faça alterações de forma controlada, preferencialmente fora do pico de pedidos, e confirme o resultado na vitrine pública em seguida.

### 7.1 Gerenciar cardápio

No módulo de cardápio, o administrador pode criar e editar categorias, cadastrar produtos, alterar preço, descrição, imagem, promoção, disponibilidade e opções de personalização. Produtos pausados deixam de estar disponíveis para novos pedidos, mas permanecem preservados para gestão.

Para cadastrar ou editar um item, revise com atenção o nome, o valor, a categoria, a foto e as opções obrigatórias ou opcionais. Antes de divulgar um novo item, abra a página pública em uma janela anônima ou outro aparelho e valide foto, preço, descrição, opções e comportamento de adicionar à sacola.

| Situação | Procedimento recomendado |
|---|---|
| Produto temporariamente indisponível | Usar **Pausar**; não apagar o item se ele poderá retornar |
| Item com nova foto | Usar URL pública segura e conferir a pré-visualização antes de salvar |
| Mudança de preço | Atualizar preço e conferir no card do catálogo e na sacola |
| Novo acompanhamento ou adicional | Criar ou ajustar as opções e testar a seleção no produto |
| Categoria sem produtos | Revisar o catálogo antes de deixá-la exposta ao cliente |

### 7.2 Gerenciar equipe e permissões

Uma pessoa só aparece na lista de equipe depois de autenticar-se pelo menos uma vez. O administrador pode ajustar o papel de cada perfil entre **Administrador**, **Operação** e **Sem acesso**.

| Papel | Permissões |
|---|---|
| Administrador | Acessa operação, cardápio, equipe e configurações da loja |
| Operação | Acessa a fila operacional, alertas e impressão; não altera cardápio ou equipe |
| Sem acesso | Não acessa a operação nem a administração |

Utilize o menor privilégio necessário: contas da cozinha devem permanecer como **Operação**, e somente responsáveis confiáveis devem receber o papel **Administrador**. Remova imediatamente o acesso de quem não integra mais a equipe.

### 7.3 Configurações da loja

O administrador pode alterar o nome exibido, taxa de entrega, horários de atendimento, modo de pagamento e impressão automática de comandas. Após salvar, revise a vitrine e faça um pedido de teste antes de atender clientes com a nova regra.

> Mantenha o modo **Teste — sem cobrança real** até que a integração oficial com Asaas esteja configurada, validada e aprovada. Trocar para o modo oficial sem credenciais válidas pode comprometer o atendimento e não deve ser usado como tentativa de ativação.

## 8. Solução de problemas

| Problema | Causa provável | Ação inicial |
|---|---|---|
| Cliente não localiza pedido pelo telefone | Número diferente do usado no checkout ou pedido já finalizado | Conferir o telefone e tentar código + telefone; a busca simples mostra apenas o pedido ativo mais recente |
| Pagamento não gera cobrança real | Sistema está em modo de teste | Não solicitar pagamento por link/QR Code do sistema; seguir o procedimento comercial definido pela loja |
| Equipe não recebe código de seis dígitos | SMTP transacional ainda não configurado ou e-mail não autorizado | Não contornar o login; validar a configuração de SMTP e a lista de perfis autorizados |
| Alerta sonoro não toca | Navegador ainda não recebeu interação, guia silenciada ou áudio indisponível | Clique na tela, confira o volume/guia e mantenha os alertas visuais ativos |
| Comanda não imprime | Falha de papel, driver, cabo, energia, impressora padrão ou política do navegador | Usar **Reimprimir** e validar a estação conforme a seção 6.4 |
| Página parece desatualizada | Cache local/PWA ou conexão instável | Atualizar a página, verificar internet e fechar/abrir o aplicativo; não use dados offline para operar pedidos |
| Acesso negado em `/operacao` ou `/admin` | Papel insuficiente ou sessão ausente | Entrar pela rota `/acesso` com conta autorizada; um administrador deve revisar o papel do perfil |

## 9. Segurança e boas práticas

Não compartilhe contas de equipe, códigos de acesso, credenciais do Supabase, chaves Asaas ou tokens de implantação. Use contas individuais, encerre a sessão em computadores compartilhados e mantenha a máquina de impressão dedicada apenas à operação.

Evite inserir informações de pagamento do cliente em campos de observação. O telefone e o endereço devem ser usados somente para atendimento e entrega do pedido. Ao testar o fluxo, prefira dados de teste autorizados e cancele ou conclua o pedido de teste para não poluir a fila operacional.

## 10. Checklist de abertura da loja

- [ ] Confirmar que o site abre no domínio de produção.
- [ ] Revisar horários, taxa de entrega, itens disponíveis e produtos pausados.
- [ ] Verificar internet, energia, áudio e carregamento do catálogo.
- [ ] Testar impressora térmica, papel e impressora padrão.
- [ ] Abrir `/operacao`, autenticar a equipe e clicar uma vez para habilitar o som.
- [ ] Fazer um pedido de teste e validar alerta, comanda, impressão, status e acompanhamento.
- [ ] Confirmar que o modo de pagamento está correto para a etapa atual da operação.

## 11. Referências internas

- [Posto de operação e impressão de comandas](./operation-kiosk-printing.md)
- [Validação de rastreamento por telefone e PWA](./pwa-phone-tracking-validation.md)
- [Notas de homologação e publicação Vercel](./vercel-homologation-notes.md)
- [Especificação de migração do histórico operacional](./superpowers/specs/2026-08-19-legacy-operational-migration.md)

Este guia deve ser atualizado sempre que houver alteração de pagamentos, autenticação, impressoras, funções da equipe ou regras de atendimento.
