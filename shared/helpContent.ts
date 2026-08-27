export type HelpAudience = "customer" | "management";

export type HelpSurface =
  | "storefront"
  | "tracking"
  | "admin"
  | "operations"
  | "counter"
  | "kitchen"
  | "inventory"
  | "totem"
  | "calls";

export type HelpRole = "customer" | "staff" | "admin";

export type HelpGuideSection = {
  id: string;
  title: string;
  body: string;
  steps: string[];
};

export type HelpGuide = {
  audience: HelpAudience;
  title: string;
  summary: string;
  returnPath: string;
  returnLabel: string;
  pdfUrl: string;
  pdfLabel: string;
  sections: HelpGuideSection[];
};

export type HelpProfile = {
  audience: HelpAudience;
  title: string;
  greeting: string;
  guidePath: string;
  guideLabel: string;
  prompts: string[];
};

const customerGuide: HelpGuide = {
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
      body: "A entrada mostra a sugestão do dia e leva diretamente ao cardápio. Os itens, valores e disponibilidade sempre são os exibidos no momento da compra.",
      steps: ["Abra a página inicial.", "Veja a sugestão em Marmita do dia.", "Selecione Realizar pedido para chegar ao cardápio."],
    },
    {
      id: "escolher-itens",
      title: "Escolher e personalizar",
      body: "No cardápio, escolha os pratos e adicionais que desejar. Alguns itens podem apresentar opções obrigatórias ou opcionais antes de entrar na sacola.",
      steps: ["Escolha uma categoria ou use a busca.", "Abra o item desejado.", "Selecione as opções disponíveis e adicione o item ao pedido."],
    },
    {
      id: "sacola",
      title: "Revisar a sacola",
      body: "A sacola reúne seus itens e permite conferir quantidades, observações, subtotal e total antes de seguir.",
      steps: ["Abra Sacola no topo ou na barra inferior do celular.", "Revise os itens e suas quantidades.", "Selecione Continuar para informar entrega ou retirada."],
    },
    {
      id: "finalizar",
      title: "Finalizar o pedido",
      body: "Escolha entrega ou retirada e preencha somente os dados solicitados pela própria tela. As formas de pagamento disponíveis aparecem no checkout.",
      steps: ["Escolha entrega ou retirada.", "Preencha os dados necessários para a modalidade escolhida.", "Revise o pedido e confirme somente quando estiver de acordo."],
    },
    {
      id: "acompanhar",
      title: "Acompanhar o pedido",
      body: "Depois da confirmação, use a página de acompanhamento para consultar a situação do pedido pelos dados indicados pelo sistema.",
      steps: ["Abra Acompanhar pedido.", "Informe somente o dado solicitado na página.", "Consulte a linha do tempo e as próximas orientações."],
    },
    {
      id: "ajuda-segura",
      title: "Pedir ajuda com segurança",
      body: "O assistente orienta o uso da Marmitas TB. Não envie senha, código de acesso, telefone, endereço, e-mail, CPF, dados de pagamento ou identificadores de pedido na conversa.",
      steps: ["Abra o botão Ajuda Marmitas TB.", "Escolha uma pergunta sugerida ou escreva sua dúvida de uso.", "Siga o tutorial indicado caso precise rever o passo completo."],
    },
  ],
};

const managementGuide: HelpGuide = {
  audience: "management",
  title: "Guia de gestão da Marmitas TB",
  summary: "Referência de uso para gestores e equipe interna, com orientações por módulo e limites operacionais.",
  returnPath: "/admin",
  returnLabel: "Voltar para a gestão",
  pdfUrl: "/manus-storage/tutorial-gestor-marmitas-tb_a382aaf5.pdf",
  pdfLabel: "Baixar tutorial de gestão em PDF",
  sections: [
    {
      id: "acesso",
      title: "Acessar e encerrar a sessão",
      body: "A gestão é restrita a perfis autorizados. Use sua credencial individual e encerre a sessão ao sair de um posto compartilhado.",
      steps: ["Entre por Acesso da equipe.", "Use o e-mail e a senha cadastrados para seu perfil.", "Use Sair ao encerrar o atendimento ou a gestão."],
    },
    {
      id: "visao-geral",
      title: "Usar o painel e os pedidos",
      body: "O painel reúne indicadores e atalhos para os módulos. A fila operacional é a referência para acompanhar e tratar pedidos confirmados.",
      steps: ["Abra Visão geral no menu da gestão.", "Consulte os indicadores do período exibido.", "Use Pedidos ou Fila operacional para continuar a operação."],
    },
    {
      id: "cardapio-equipe",
      title: "Gerir cardápio e equipe",
      body: "Administradores podem gerir categorias, produtos, opções, fotos e disponibilidade, além de administrar membros autorizados. Revise cada alteração antes de salvar.",
      steps: ["Abra Cardápio ou Equipe no menu lateral.", "Faça a alteração permitida ao seu perfil.", "Confirme o retorno visual de sucesso antes de seguir para outro módulo."],
    },
    {
      id: "financeiro-relatorios",
      title: "Consultar financeiro e relatórios",
      body: "Financeiro e relatórios usam dados registrados pelo sistema. Despesas da equipe podem exigir aprovação administrativa antes de impactarem o fluxo de caixa.",
      steps: ["Defina o período de consulta.", "Confira a origem e a situação dos valores exibidos.", "Use a exportação disponível somente para análise autorizada."],
    },
    {
      id: "operacao-pdv-cozinha",
      title: "Operar fila, PDV e cozinha",
      body: "A fila operacional centraliza pedidos. O PDV registra vendas presenciais; a cozinha permite apenas as transições permitidas para cada comanda. Pedidos COUNTER têm prioridade operacional de impressão.",
      steps: ["Abra Fila operacional para consultar comandas.", "Use PDV de balcão para vendas presenciais confirmadas no atendimento.", "Na Cozinha, avance apenas a comanda no estado mostrado pela ação disponível."],
    },
    {
      id: "estoque",
      title: "Controlar estoque por movimentações",
      body: "O saldo do estoque é calculado pelas movimentações registradas. Equipe registra entrada e consumo; administradores também cadastram, editam, inativam, registram perda e ajuste com motivo. O estoque não tem baixa automática por pedido.",
      steps: ["Abra Estoque pela área operacional.", "Consulte o saldo e histórico do insumo.", "Registre somente a movimentação correspondente ao fato ocorrido."],
    },
    {
      id: "chamadas-limites",
      title: "Painel de chamadas e limites externos",
      body: "O painel público de chamadas mostra somente senhas COUNTER prontas. Reimpressão requer ator e motivo. Asaas depende de credenciais configuradas; SMTP e domínio institucional continuam pendentes de definição externa.",
      steps: ["Abra Chamadas em um monitor de retirada quando necessário.", "Não use o painel público para consultar dados pessoais.", "Consulte as configurações e a documentação antes de habilitar qualquer serviço externo."],
    },
    {
      id: "ajuda-gestao-segura",
      title: "Usar o assistente de gestão",
      body: "O assistente esclarece onde e como executar passos já permitidos ao seu perfil, mas não faz alterações, transações ou comandos em seu lugar. Não informe senha, token, código de acesso ou dados de clientes.",
      steps: ["Abra Ajuda Marmitas TB na área interna.", "Faça perguntas de orientação sobre o módulo em uso.", "Abra este guia para consultar o processo completo."],
    },
  ],
};

const customerProfile: HelpProfile = {
  audience: "customer",
  title: "Assistente de pedidos",
  greeting: "Posso orientar você a escolher, revisar e acompanhar seu pedido.",
  guidePath: "/ajuda/pedidos",
  guideLabel: "Ver tutorial do cliente",
  prompts: ["Como escolher uma marmita?", "Como finalizar meu pedido?", "Como acompanho meu pedido?"],
};

const managementProfile: HelpProfile = {
  audience: "management",
  title: "Assistente de gestão",
  greeting: "Posso orientar o uso seguro dos módulos internos da Marmitas TB.",
  guidePath: "/ajuda/gestao",
  guideLabel: "Ver tutorial de gestão",
  prompts: ["Como acesso a fila operacional?", "Como registro uma venda no PDV?", "Como consulto o estoque?"],
};

export function getHelpGuide(audience: HelpAudience): HelpGuide {
  return audience === "customer" ? customerGuide : managementGuide;
}

export function getHelpProfile(surface: HelpSurface): HelpProfile | null {
  if (surface === "totem" || surface === "calls") return null;
  return surface === "storefront" || surface === "tracking" ? customerProfile : managementProfile;
}

export function buildHelpSystemPrompt(input: { audience: HelpAudience; role: HelpRole; surface: HelpSurface }): string {
  const guide = getHelpGuide(input.audience);
  const guideText = guide.sections
    .map(section => `- ${section.title}: ${section.body} Passos: ${section.steps.join(" ")}`)
    .join("\n");

  return [
    "Você é o assistente de ajuda da Marmitas TB.",
    "Responda somente em português brasileiro, de maneira objetiva, acolhedora e em até 5 passos quando for útil.",
    `Público: ${input.audience}; perfil derivado: ${input.role}; tela: ${input.surface}.`,
    "Você apenas orienta. Nunca cria, confirma, cancela ou altera pedidos; não registra pagamentos; não muda produtos, equipe, estoque, relatórios ou configurações.",
    "Nunca peça, aceite ou repita senha, código, token, e-mail, telefone, CPF, endereço, dados de pagamento ou identificadores de pedido.",
    "Se houver pedido de ação, dado sensível ou assunto fora do sistema, recuse brevemente e indique o tutorial ou a tela apropriada.",
    "Base factual permitida:",
    guideText,
  ].join("\n");
}
