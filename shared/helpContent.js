const customerGuide = {
  audience: "customer",
  title: "Como pedir na Marmitas TB",
  summary: "Um guia simples para escolher a marmita, montar a sacola, finalizar e acompanhar seu pedido.",
  returnPath: "/",
  returnLabel: "Voltar para pedir",
  pdfUrl: "/manus-storage/tutorial-cliente-marmitas-tb_fda78c4c.pdf",
  pdfLabel: "Baixar tutorial do cliente em PDF",
  sections: [
    {
      id: "marmita-do-dia",
      title: "Ver a marmita do dia",
      body: "A entrada mostra a sugest\xE3o do dia e leva diretamente ao card\xE1pio. Os itens, valores e disponibilidade sempre s\xE3o os exibidos no momento da compra.",
      steps: ["Abra a p\xE1gina inicial.", "Veja a sugest\xE3o em Marmita do dia.", "Selecione Realizar pedido para chegar ao card\xE1pio."]
    },
    {
      id: "escolher-itens",
      title: "Escolher e personalizar",
      body: "No card\xE1pio, escolha os pratos e adicionais que desejar. Alguns itens podem apresentar op\xE7\xF5es obrigat\xF3rias ou opcionais antes de entrar na sacola.",
      steps: ["Escolha uma categoria ou use a busca.", "Abra o item desejado.", "Selecione as op\xE7\xF5es dispon\xEDveis e adicione o item ao pedido."]
    },
    {
      id: "sacola",
      title: "Revisar a sacola",
      body: "A sacola re\xFAne seus itens e permite conferir quantidades, observa\xE7\xF5es, subtotal e total antes de seguir.",
      steps: ["Abra Sacola no topo ou na barra inferior do celular.", "Revise os itens e suas quantidades.", "Selecione Continuar para informar entrega ou retirada."]
    },
    {
      id: "finalizar",
      title: "Finalizar o pedido",
      body: "Escolha entrega ou retirada e preencha somente os dados solicitados pela pr\xF3pria tela. As formas de pagamento dispon\xEDveis aparecem no checkout.",
      steps: ["Escolha entrega ou retirada.", "Preencha os dados necess\xE1rios para a modalidade escolhida.", "Revise o pedido e confirme somente quando estiver de acordo."]
    },
    {
      id: "acompanhar",
      title: "Acompanhar o pedido",
      body: "Depois da confirma\xE7\xE3o, use a p\xE1gina de acompanhamento para consultar a situa\xE7\xE3o do pedido pelos dados indicados pelo sistema.",
      steps: ["Abra Acompanhar pedido.", "Informe somente o dado solicitado na p\xE1gina.", "Consulte a linha do tempo e as pr\xF3ximas orienta\xE7\xF5es."]
    },
    {
      id: "ajuda-segura",
      title: "Pedir ajuda com seguran\xE7a",
      body: "O assistente orienta o uso da Marmitas TB. N\xE3o envie senha, c\xF3digo de acesso, telefone, endere\xE7o, e-mail, CPF, dados de pagamento ou identificadores de pedido na conversa.",
      steps: ["Abra o bot\xE3o Ajuda Marmitas TB.", "Escolha uma pergunta sugerida ou escreva sua d\xFAvida de uso.", "Siga o tutorial indicado caso precise rever o passo completo."]
    }
  ]
};
const managementGuide = {
  audience: "management",
  title: "Guia de gest\xE3o da Marmitas TB",
  summary: "Refer\xEAncia de uso para gestores e equipe interna, com orienta\xE7\xF5es por m\xF3dulo e limites operacionais.",
  returnPath: "/admin",
  returnLabel: "Voltar para a gest\xE3o",
  pdfUrl: "/manus-storage/tutorial-gestor-marmitas-tb_a382aaf5.pdf",
  pdfLabel: "Baixar tutorial de gest\xE3o em PDF",
  sections: [
    {
      id: "acesso",
      title: "Acessar e encerrar a sess\xE3o",
      body: "A gest\xE3o \xE9 restrita a perfis autorizados. Use sua credencial individual e encerre a sess\xE3o ao sair de um posto compartilhado.",
      steps: ["Entre por Acesso da equipe.", "Use o e-mail e a senha cadastrados para seu perfil.", "Use Sair ao encerrar o atendimento ou a gest\xE3o."]
    },
    {
      id: "visao-geral",
      title: "Usar o painel e os pedidos",
      body: "O painel re\xFAne indicadores e atalhos para os m\xF3dulos. A fila operacional \xE9 a refer\xEAncia para acompanhar e tratar pedidos confirmados.",
      steps: ["Abra Vis\xE3o geral no menu da gest\xE3o.", "Consulte os indicadores do per\xEDodo exibido.", "Use Pedidos ou Fila operacional para continuar a opera\xE7\xE3o."]
    },
    {
      id: "cardapio-equipe",
      title: "Gerir card\xE1pio e equipe",
      body: "Administradores podem gerir categorias, produtos, op\xE7\xF5es, fotos e disponibilidade, al\xE9m de administrar membros autorizados. Revise cada altera\xE7\xE3o antes de salvar.",
      steps: ["Abra Card\xE1pio ou Equipe no menu lateral.", "Fa\xE7a a altera\xE7\xE3o permitida ao seu perfil.", "Confirme o retorno visual de sucesso antes de seguir para outro m\xF3dulo."]
    },
    {
      id: "financeiro-relatorios",
      title: "Consultar financeiro e relat\xF3rios",
      body: "Financeiro e relat\xF3rios usam dados registrados pelo sistema. Despesas da equipe podem exigir aprova\xE7\xE3o administrativa antes de impactarem o fluxo de caixa.",
      steps: ["Defina o per\xEDodo de consulta.", "Confira a origem e a situa\xE7\xE3o dos valores exibidos.", "Use a exporta\xE7\xE3o dispon\xEDvel somente para an\xE1lise autorizada."]
    },
    {
      id: "operacao-pdv-cozinha",
      title: "Operar fila, PDV e cozinha",
      body: "A fila operacional centraliza pedidos. O PDV registra vendas presenciais; a cozinha permite apenas as transi\xE7\xF5es permitidas para cada comanda. Pedidos COUNTER t\xEAm prioridade operacional de impress\xE3o.",
      steps: ["Abra Fila operacional para consultar comandas.", "Use PDV de balc\xE3o para vendas presenciais confirmadas no atendimento.", "Na Cozinha, avance apenas a comanda no estado mostrado pela a\xE7\xE3o dispon\xEDvel."]
    },
    {
      id: "estoque",
      title: "Controlar estoque por movimenta\xE7\xF5es",
      body: "O saldo do estoque \xE9 calculado pelas movimenta\xE7\xF5es registradas. Equipe registra entrada e consumo; administradores tamb\xE9m cadastram, editam, inativam, registram perda e ajuste com motivo. O estoque n\xE3o tem baixa autom\xE1tica por pedido.",
      steps: ["Abra Estoque pela \xE1rea operacional.", "Consulte o saldo e hist\xF3rico do insumo.", "Registre somente a movimenta\xE7\xE3o correspondente ao fato ocorrido."]
    },
    {
      id: "chamadas-limites",
      title: "Painel de chamadas e limites externos",
      body: "O painel p\xFAblico de chamadas mostra somente senhas COUNTER prontas. Reimpress\xE3o requer ator e motivo. Asaas depende de credenciais configuradas; SMTP e dom\xEDnio institucional continuam pendentes de defini\xE7\xE3o externa.",
      steps: ["Abra Chamadas em um monitor de retirada quando necess\xE1rio.", "N\xE3o use o painel p\xFAblico para consultar dados pessoais.", "Consulte as configura\xE7\xF5es e a documenta\xE7\xE3o antes de habilitar qualquer servi\xE7o externo."]
    },
    {
      id: "ajuda-gestao-segura",
      title: "Usar o assistente de gest\xE3o",
      body: "O assistente esclarece onde e como executar passos j\xE1 permitidos ao seu perfil, mas n\xE3o faz altera\xE7\xF5es, transa\xE7\xF5es ou comandos em seu lugar. N\xE3o informe senha, token, c\xF3digo de acesso ou dados de clientes.",
      steps: ["Abra Ajuda Marmitas TB na \xE1rea interna.", "Fa\xE7a perguntas de orienta\xE7\xE3o sobre o m\xF3dulo em uso.", "Abra este guia para consultar o processo completo."]
    }
  ]
};
const customerProfile = {
  audience: "customer",
  title: "Assistente de pedidos",
  greeting: "Posso orientar voc\xEA a escolher, revisar e acompanhar seu pedido.",
  guidePath: "/ajuda/pedidos",
  guideLabel: "Ver tutorial do cliente",
  prompts: ["Como escolher uma marmita?", "Como finalizar meu pedido?", "Como acompanho meu pedido?"]
};
const managementProfile = {
  audience: "management",
  title: "Assistente de gest\xE3o",
  greeting: "Posso orientar o uso seguro dos m\xF3dulos internos da Marmitas TB.",
  guidePath: "/ajuda/gestao",
  guideLabel: "Ver tutorial de gest\xE3o",
  prompts: ["Como acesso a fila operacional?", "Como registro uma venda no PDV?", "Como consulto o estoque?"]
};
function getHelpGuide(audience) {
  return audience === "customer" ? customerGuide : managementGuide;
}
function getHelpProfile(surface) {
  if (surface === "totem" || surface === "calls") return null;
  return surface === "storefront" || surface === "tracking" ? customerProfile : managementProfile;
}
function buildHelpSystemPrompt(input) {
  const guide = getHelpGuide(input.audience);
  const guideText = guide.sections.map((section) => `- ${section.title}: ${section.body} Passos: ${section.steps.join(" ")}`).join("\n");
  return [
    "Voc\xEA \xE9 o assistente de ajuda da Marmitas TB.",
    "Responda somente em portugu\xEAs brasileiro, de maneira objetiva, acolhedora e em at\xE9 5 passos quando for \xFAtil.",
    `P\xFAblico: ${input.audience}; perfil derivado: ${input.role}; tela: ${input.surface}.`,
    "Voc\xEA apenas orienta. Nunca cria, confirma, cancela ou altera pedidos; n\xE3o registra pagamentos; n\xE3o muda produtos, equipe, estoque, relat\xF3rios ou configura\xE7\xF5es.",
    "Nunca pe\xE7a, aceite ou repita senha, c\xF3digo, token, e-mail, telefone, CPF, endere\xE7o, dados de pagamento ou identificadores de pedido.",
    "Se houver pedido de a\xE7\xE3o, dado sens\xEDvel ou assunto fora do sistema, recuse brevemente e indique o tutorial ou a tela apropriada.",
    "Base factual permitida:",
    guideText
  ].join("\n");
}
export {
  buildHelpSystemPrompt,
  getHelpGuide,
  getHelpProfile
};
