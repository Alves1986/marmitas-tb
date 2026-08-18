# Referência de runtime Vercel

Em 18 de agosto de 2026, a documentação oficial da Vercel foi consultada para confirmar que as funções TypeScript no diretório `api/` podem expor handlers baseados nas APIs Web padrão, recebendo `Request` e devolvendo `Response`. A infraestrutura desta migração adota esse contrato para manter os endpoints testáveis sem acoplamento a Express.

Fonte: [Using the Node.js Runtime with Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js).
