# Pulse

> Treino, presença e progresso — o app que te faz aparecer.

Implementação das **Fases 1 e 2** do [PRD](PRD-Pulse-v1.md) — treino + presença e
dieta + corpo — com backend Supabase (auth, sync e grupo real).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5199
npm run build    # build de produção em dist/
```

Deslogado, o app abre na **landing page** (`src/screens/Landing.tsx`): o fluxo
principal é **e-mail + senha**, sem etapa de confirmação — cadastro entra na hora
(o e-mail nasce confirmado por trigger, migração 0009, e o cliente faz login
direto). O e-mail só aparece no **"esqueci a senha"** (link de recuperação → o app
pede a senha nova ao voltar, via evento `PASSWORD_RECOVERY`). "Explorar sem conta"
abre o **modo demonstração** (9 semanas de histórico + grupo com 4 amigos, gerados
deterministicamente e persistidos em `localStorage`; a opção fica na flag
`pulse-demo-optin`, limpa no logout). Pra resetar a demo: limpe os dados do site
no navegador (ou `localStorage.removeItem("pulse-state-v1")`).

**Ajustes** (`src/screens/Ajustes.tsx`, ícone de conta no header → `/ajustes`):
perfil (foto, nome editável, e-mail), preferências, código de amigo, grupo e
**sair da conta**. Também é onde ficam as **notificações**.

**Notificações** (`src/lib/notifications.tsx`, sino no header + inbox): um provider
com detectores que produzem avisos no inbox interno e, com permissão do navegador,
como notificação do sistema. Tipos: lembrete de treino (no horário que você define
**por dia da semana** em Ajustes, se ainda não treinou), check-in novo de alguém,
macro perto do limite (kcal/carbo/gordura em 90–115% da meta), comemoração de 7
dias seguindo o cronograma, e desafio (te passaram / prazo acabando). Dedupe por
chave; baseline silencioso no primeiro load pra não spammar; limpa no logout. As
prefs vivem em `state.notify` (sincronizam). Observação: avisos com o app fechado
dependeriam de push server + service worker — hoje disparam com o app aberto.

## O que está implementado

**Fase 1 — Treino + Presença**

- **Hoje** — saudação, anéis de presença da semana, próximo treino da rotação A→B→C, dieta do dia e presença do grupo.
- **Sessão** — registro série a série (carga × reps) com steppers grandes, feito pra usar com uma mão entre séries. Concluir exige ao menos 1 série; descartar pede confirmação.
- **Resumo / Termômetro de Coerência** — "Você apareceu." vem antes e maior que qualquer número; compara plano × realidade (recordes, cargas que subiram, exercícios pulados) sem vermelho e sem julgamento.
- **Treino** — hub com o **Plano** (split A/B/C editável, ~40 exercícios curados em PT-BR) e a **Progressão** (carga máxima por treino com sinal de platô ≥4 semanas, volume semanal, recordes).
- **Lançar treino** (registro rápido) — treinou e esqueceu de abrir o app? Registra o treino de hoje ou de qualquer um dos últimos 7 dias em dois toques, como planejado (todas as séries no alvo). Entra na rotação, na progressão e na presença do grupo (o banco aceita presença retroativa de até 7 dias — migração 0006).
- **Grupo** — quem apareceu hoje, a semana de cada um, constância. Sem ranking, sem peso, sem foto (PRD §11).

**Fase 2 — Dieta + Corpo**

- **Dieta** — proteína como métrica-herói; **Meus Pratos** (marmita definida uma vez, registrada em um toque), repetir ontem, busca em **~640 alimentos brasileiros** (curadoria com porções + **TACO completa** embutida, busca sem acento) e em **milhões de produtos embalados** via Open Food Facts (instância BR, ODbL, com atribuição), refeições do dia e o padrão de 7/28 dias com linha de meta.
- **Metas & calculadora** — Mifflin-St Jeor (TMB/GET), bulking com superávit moderado / cutting / manutenção, metas ajustáveis na mão, piso calórico com aviso e **modo só proteína** (§11).
- **Corpo** — registro de peso em dois toques e a **leitura do loop**: comida × peso × carga das últimas 4 semanas numa frase honesta e gentil. Peso privado por padrão.

**Onboarding**

- Primeiro login de conta nova: escolhe o nome e o app nasce limpo — plano A/B/C e
  pratos padrão como ponto de partida, zero dados de demonstração (o demo existe só
  pra quem navega deslogado). O estado demo nunca sobe pra nuvem.

**Backend (Supabase)**

- Projeto `pulse` (região `sa-east-1`), schema em [supabase/migrations](supabase/migrations): `groups`, `profiles`, `presence`, `states` — tudo com RLS. O grupo vê **apenas** presença e perfil; o estado pessoal (plano, sessões, dieta, peso) fica em `states`, visível só pro dono (testado: usuário A não lê nem escreve dados de B).
- Login por magic link (PKCE) na aba Grupo; criar grupo / entrar por código de convite (`create_group` / `join_group`, security definer com EXECUTE restrito a `authenticated`).
- Sync local-first: o app funciona offline; logado, o estado sobe com debounce (last-write-wins) e a presença de hoje vira linha na tabela `presence`, com **realtime** atualizando o "quem apareceu" do grupo.
- O e-mail de login usa o template padrão do Supabase (free tier não permite customizar sem SMTP próprio); limite de ~3 e-mails/hora no SMTP embutido.

## Design

Base visual: app Kenko (Behance) — papel claro quente, serifa editorial, cards muito
arredondados, gradientes suaves — **com paleta autoral própria**:

| Token | Cor | Papel |
|---|---|---|
| `--paper` | `#F6F1E7` | fundo osso quente |
| `--ink` | `#221B13` | tinta espresso |
| `--pulse` | `#E4573D` | coral-pulso (o batimento, ação) |
| `--mata` | `#2F6B52` | verde-mata (constância, "apareceu") |
| `--ambar` | `#D9950F` | âmbar (recorde, destaque) |

Tipografia: **Fraunces** (títulos, números-herói) + **Instrument Sans** (UI e dados).
Cores de gráfico validadas (contraste/CVD) contra a superfície creme.

## Fase 3 — Desafios, check-in por foto e amigos

A aba Grupo tem três seções: **Turma** (presença da semana), **Desafios** e
**Amigos**.

**Desafios com foto** (grupo real; a demo continua por presença): o check-in do
dia é uma **foto** — tirada na hora ou escolhida da galeria, comprimida no
cliente (`lib/image.ts`) e subida pro bucket `checkins`. Dá pra ter **vários
desafios ao mesmo tempo** (trilha de chips pra transitar entre eles), e na hora
do check-in você escolhe **pra quais desafios a foto vale** (ou faz outro
check-in com outra foto). Cada desafio tem ranking por contagem de check-ins e
um **feed por dia** com as fotos de todo mundo (tabelas `checkins` +
`checkin_challenges`, realtime).

**Amigos** (rede própria, independente do grupo): cada conta tem um código de
amigo; pedido → aceite → cada lado escolhe **o que o outro vê** (presença,
progressão de carga, metas, dieta, peso — presença e treino por padrão, o resto
opt-in). O app publica um blob `profiles.shared` com os blocos pré-computados e
o amigo só lê via RPC `friend_view`, que **filtra no servidor** pelo share
daquela direção (`friendships.share_a/share_b`). Foto de perfil no bucket
`avatars` aparece no grupo, nos desafios e nos amigos.

O grupo também vê a variação % de carga de cada um (`profiles.stats`, só de
sessões reais — nunca dados de demonstração).

## Deploy

- **Código**: [github.com/pombaloide07/pulse](https://github.com/pombaloide07/pulse) (público).
- **Produção**: `https://pulse-pedro-budgets.vercel.app` — o build da Vercel clona o
  repo (`rm -rf repo && git clone … && npm install && npm run build`, output `repo/dist`).
  O `rm -rf` importa: a Vercel cacheia o diretório de build entre deploys e o clone
  falha se a pasta anterior voltar do cache. Pra redeployar: novo deploy do projeto
  `pulse` com essas mesmas settings (ele sempre builda o `main` mais recente).
- O auth do Supabase (site_url + allowlist) já aponta pra URL de produção e pro
  localhost de dev.
- **Headers de segurança** (CSP, X-Frame-Options, nosniff etc.) vivem no
  [vercel.json](vercel.json). Atenção: como o build clona o repo pra dentro de
  `repo/`, a Vercel lê o `vercel.json` da **raiz do deployment** — ao redeployar
  via bootstrap, inclua uma cópia dele junto do `package.json` de bootstrap.

## Stack

Vite + React + TypeScript. Estado local-first em `localStorage`
([src/lib/store.tsx](src/lib/store.tsx)) + sync opcional via Supabase
([src/lib/sync.tsx](src/lib/sync.tsx), [src/lib/supabase.ts](src/lib/supabase.ts)).
A chave em `supabaseConfig.ts` é a **publicável** (segura no cliente; RLS protege os
dados) — o access token da conta vive só no `.mcp.json`, que está no `.gitignore`.
Fase 3 (desafios) segue o faseamento do PRD.
