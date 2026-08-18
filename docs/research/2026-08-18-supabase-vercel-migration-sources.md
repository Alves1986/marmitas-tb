# Fontes — Migração para Supabase e Vercel

## Supabase: migração de MySQL para Postgres

A documentação oficial descreve a migração de MySQL para Supabase Postgres, orientando a coletar as credenciais da origem e a usar a ferramenta de migração do Supabase ou `pgloader`. Para bases maiores que 6 GB, recomenda provisionar capacidade de disco antecipadamente. A Marmitas TB tem atualmente um volume inicial muito baixo, mas a migração deve preservar chaves, índices e relações antes de qualquer corte.

Fonte: [Migrar de MySQL para Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/mysql).

## Supabase: autenticação e autorização

O Supabase Auth disponibiliza login sem senha por e-mail via Magic Link ou código OTP. Ambos dependem da configuração da URL principal e das URLs de redirecionamento permitidas. O método `signInWithOtp` permite impedir o cadastro automático com `shouldCreateUser: false`, adequando-se ao acesso restrito da equipe operacional.

O Supabase recomenda manter funções e políticas de autorização no Postgres com Row Level Security (RLS). Todas as tabelas expostas ao cliente devem habilitar RLS; a chave de serviço ignora essas regras e precisa permanecer exclusivamente no servidor. A documentação de RBAC ilustra o uso de uma tabela de papéis associada a `auth.users`, de um Custom Access Token Hook e de claims no JWT para proteger políticas.

Fontes: [Login sem senha por e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless), [RBAC com claims personalizados](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Vercel: implantação por Git

A Vercel cria deploys de prévia para branches que não são de produção e deploys de produção quando mudanças chegam à branch configurada, normalmente `main`. Um branch persistente, como `staging`, pode ter domínio e variáveis específicos, permitindo homologação independente antes da produção.

Fonte: [Deploy por Git na Vercel](https://vercel.com/docs/deployments/git).

## Integração Supabase e Vercel

A integração nativa apresentada pela Vercel contempla Postgres, Auth e Storage do Supabase, além da sincronização de variáveis de ambiente e da criação de URLs de redirecionamento para ambientes de prévia. Esta capacidade deve ser usada somente após a conexão dos projetos existentes autorizada pelo usuário.

Fonte: [Supabase na Vercel Marketplace](https://vercel.com/marketplace/supabase).
