# Gestão de equipe e acessos — Marmitas TB

## Objetivo

Oferecer, no painel administrativo, uma interface simples para que administradores atribuam papéis operacionais aos usuários que já realizaram o primeiro login no sistema.

## Escopo aprovado

A tela reutilizará a consulta administrativa de usuários autenticados. Não haverá criação manual de contas, convites ou envio de e-mails nesta etapa. Cada pessoa exibirá nome, e-mail, último acesso e um controle de papel.

| Papel apresentado | Papel persistido | Acesso concedido |
| --- | --- | --- |
| Sem acesso | `user` | Nenhuma área operacional ou administrativa |
| Operação | `staff` | Fila operacional, status e comandas |
| Administrador | `admin` | Gestão de cardápio, equipe, configurações e operação |

## Interface e fluxo

O módulo será renomeado para **Equipe e acessos**. Cada membro terá um seletor com as três alternativas permitidas. Ao alterar a seleção, a interface enviará a mutação administrativa já protegida, apresentará estado de salvamento e atualizará a lista ao concluir. Erros serão informados perto da seção sem ocultar os dados existentes.

Somente administradores visualizam e executam esse controle. A interface não permitirá que papéis sejam alterados fora dos valores `user`, `staff` e `admin`, e o contrato do servidor continuará validando essas entradas.

## Estratégia técnica

O componente `StaffManager` continuará consumindo `admin.listStaff` e `admin.upsertStaff`. A mudança se limita à experiência administrativa: ampliação da assinatura de atualização para aceitar os três papéis e substituição dos botões condicionais por um controle selecionável e rotulado. Não haverá alteração de banco de dados ou mudança do contrato tRPC.

## Validação

Os testes de interface verificarão a exibição dos três papéis, o envio correto de `user`, `staff` e `admin`, o estado pendente e a mensagem de erro. A validação final executará a suíte Vitest completa, a checagem de tipos e o build de produção.
