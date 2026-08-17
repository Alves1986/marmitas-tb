# Posto de operação e impressão de comandas

Este procedimento prepara um computador exclusivo da cozinha para receber alertas, atualizar a fila e imprimir comandas de **80 mm**. Ele pressupõe que a Marmitas TB permaneça no modo de pagamento de teste até que as credenciais oficiais do Asaas sejam configuradas em ambiente seguro.

## Preparação da impressora

Conecte a impressora térmica ao computador da cozinha, instale o driver indicado pelo fabricante e imprima uma página de teste pelo sistema operacional. Em seguida, defina a térmica como **impressora padrão**. Configure o papel como 80 mm, margens mínimas e impressão em preto; o documento da comanda já inclui regras próprias para impressão térmica.

| Verificação | Resultado esperado |
|---|---|
| Driver instalado | A impressora aparece disponível no sistema operacional. |
| Impressora padrão | A térmica está definida como dispositivo padrão. |
| Papel | Largura de 80 mm e rolo disponível. |
| Página de teste | Texto legível, sem corte lateral e sem escala excessiva. |

## Acesso operacional

Abra a rota `/operacao` no computador dedicado e autentique-se com uma conta de perfil **admin** ou **staff**. A tela exibe apenas pedidos autorizados para a operação, permite reconhecer alertas, avançar estados permitidos e solicitar reimpressões. Mantenha a sessão autenticada e não use essa conta para tarefas administrativas comuns.

Faça inicialmente um pedido em **modo de teste**, confirme-o pelo fluxo do site e verifique se ele aparece na fila. A equipe deve reconhecer o alerta, conferir a pré-visualização térmica, imprimir a comanda e testar a reimpressão pelo botão correspondente. A fila mantém o histórico de trabalhos de impressão para apoiar a conferência operacional.

## Abertura em modo quiosque

No Chrome ou Chromium, crie um atalho que abra a rota operacional com os parâmetros abaixo. Substitua a URL pelo domínio publicado da loja antes do uso diário.

```bash
google-chrome --kiosk --kiosk-printing "https://SEU-DOMINIO/operacao"
```

Em algumas distribuições Linux, o executável pode ser `chromium` ou `chromium-browser`. No Windows, use o caminho de instalação do Chrome entre aspas e acrescente os mesmos parâmetros. O parâmetro `--kiosk-printing` envia a impressão para o dispositivo padrão sem abrir a caixa de diálogo, desde que o driver, a impressora padrão e as permissões locais estejam corretos.

> A supressão do diálogo de impressão depende do navegador e do sistema operacional do posto. Antes de operar, valide a impressão com uma cobrança de teste e mantenha a reimpressão manual disponível como contingência.

## Alertas sonoros e acessibilidade

Navegadores bloqueiam reprodução automática de áudio até que alguém interaja com a página. Ao iniciar o turno, toque ou clique uma vez na tela da operação para habilitar o alerta sonoro. Os avisos visuais e o anúncio acessível continuam disponíveis mesmo antes dessa interação; o som é repetido de forma moderada enquanto houver pedido confirmado ainda não reconhecido.

Se o áudio não tocar, verifique se a guia não está silenciada, se a saída de som do computador está ativa e se a primeira interação foi realizada. Não desative os alertas visuais: eles são o canal de contingência para falhas de áudio.

## Rotina diária e contingência

| Momento | Procedimento |
|---|---|
| Antes de abrir | Conferir energia, papel, impressora padrão, internet e áudio. |
| Início do turno | Abrir o quiosque, entrar com a conta operacional e realizar uma interação na tela. |
| Novo pedido | Reconhecer o alerta, conferir dados e imprimir a comanda. |
| Falha de impressão | Solicitar **Reimprimir** na fila e verificar papel, tampa, cabo, driver e impressora padrão. |
| Fim do turno | Finalizar os pedidos pendentes e sair da conta operacional. |

Mudanças de driver, navegador, sistema operacional, rede local ou impressora são responsabilidade da operação local e devem ser validadas com uma cobrança de teste antes do próximo atendimento. A ativação de cobranças oficiais requer, em etapa separada, uma chave de API do Asaas e um token exclusivo para o cabeçalho `asaas-access-token` do webhook; esses valores nunca devem ser inseridos no cliente ou no repositório.
