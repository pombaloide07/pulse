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

O app abre com **dados de demonstração** (9 semanas de histórico + grupo com 4 amigos),
gerados deterministicamente no primeiro load e persistidos em `localStorage`.
Pra resetar a demo: limpe os dados do site no navegador (ou `localStorage.removeItem("pulse-state-v1")`).

## O que está implementado

**Fase 1 — Treino + Presença**

- **Hoje** — saudação, anéis de presença da semana, próximo treino da rotação A→B→C, dieta do dia e presença do grupo.
- **Sessão** — registro série a série (carga × reps) com steppers grandes, feito pra usar com uma mão entre séries. Concluir exige ao menos 1 série; descartar pede confirmação.
- **Resumo / Termômetro de Coerência** — "Você apareceu." vem antes e maior que qualquer número; compara plano × realidade (recordes, cargas que subiram, exercícios pulados) sem vermelho e sem julgamento.
- **Treino** — hub com o **Plano** (split A/B/C editável, ~40 exercícios curados em PT-BR) e a **Progressão** (carga máxima por treino com sinal de platô ≥4 semanas, volume semanal, recordes).
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

## Fase 3 — Desafios

Prazo + grupo + check-in (a mágica do GymRats, PRD §7.4). O check-in é a presença:
concluiu treino num dia do prazo, pontuou — ranking por contagem de dias, nunca por
corpo. Desafios vivem na aba Grupo (criar: nome + 15/30/45 dias), funcionam offline
(demo) e no grupo real (tabela `challenges` com RLS + realtime). O grupo também vê a
variação % de carga de cada um (`profiles.stats`, só de sessões reais — nunca dados
de demonstração).

## Deploy

- **Código**: [github.com/pombaloide07/pulse](https://github.com/pombaloide07/pulse) (público).
- **Produção**: `https://pulse-pedro-budgets.vercel.app` — o build da Vercel clona o
  repo (`rm -rf repo && git clone … && npm install && npm run build`, output `repo/dist`).
  O `rm -rf` importa: a Vercel cacheia o diretório de build entre deploys e o clone
  falha se a pasta anterior voltar do cache. Pra redeployar: novo deploy do projeto
  `pulse` com essas mesmas settings (ele sempre builda o `main` mais recente).
- O auth do Supabase (site_url + allowlist) já aponta pra URL de produção e pro
  localhost de dev.

## Stack

Vite + React + TypeScript. Estado local-first em `localStorage`
([src/lib/store.tsx](src/lib/store.tsx)) + sync opcional via Supabase
([src/lib/sync.tsx](src/lib/sync.tsx), [src/lib/supabase.ts](src/lib/supabase.ts)).
A chave em `supabaseConfig.ts` é a **publicável** (segura no cliente; RLS protege os
dados) — o access token da conta vive só no `.mcp.json`, que está no `.gitignore`.
Fase 3 (desafios) segue o faseamento do PRD.
