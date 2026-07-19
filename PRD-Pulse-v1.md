# PRD — "Pulse" (codinome)
### O hub de quem quer sair de magro pra encorpado — treino, comida e grupo num loop só

> **Codinome:** *Pulse* — o ritmo cardíaco, a batida, a consistência. O app mede e celebra seu pulso de presença: a regularidade que te faz aparecer. Mesmo quando a vida aperta, seu pulso segue aí. Placeholder; troque à vontade.
>
> **Origem:** derivado do módulo "treino" + "mercado" do Temaki, agora com profundidade e propósito.
>
> **Status:** Rascunho v1 · Documento vivo · Custo operacional ~R$0

---

## 1. TL;DR

Um webapp onde **plano de treino, alimentação e peso viram um sistema só**: você monta o plano, registra o treino do dia, o app te diz se bateu com o plano e como sua carga progride; você configura macros e meta calórica por uma calculadora de bulking/cutting/manutenção, registra o que come (com **comida brasileira de verdade**), e vê o peso responder ao longo do tempo. Por cima disso, um **grupo de amigos** que vê que você apareceu — porque é isso que faz você aparecer.

**Nicho:** a jornada **magro → encorpado** (hardgainer/recomposição), que nenhum app grande atende — todos são moldados pra quem quer emagrecer. **Grupo zero:** você e os amigos que treinam.

---

## 2. O reframe (leia isto antes de qualquer feature)

Você pediu "um GymRats mais completo". Mas **completude não é por que o GymRats funciona.** Ele é pobre de features e ganha assim mesmo, porque resolve a única coisa que importa: **fazer você aparecer.**

Todo app de fitness morre da mesma morte: a pessoa registra tudo religiosamente por três semanas e some. **Tracking nunca foi o problema. Aderência é.** Um tracker mais completo corre o risco de ser pior naquilo que o GymRats faz bem, e mais complexo.

E o diagnóstico veio de você: *"Ultimamente não tenho tido tanto ânimo ou tempo para treinar."* Você está construindo um app de treino enquanto luta pra treinar. Isso não é ironia — é **a especificação do problema.** O produto não é "me dá mais gráficos". É **"não me deixa cair fora quando a vida aperta"**.

**Consequência de design:** cada feature responde à pergunta *"isso me faz aparecer amanhã?"*. Se não faz, ela desce no roadmap.

---

## 3. Por que "hub" se justifica aqui (e não se justificava no Temaki)

O Temaki morria de ser horizontal: mercado + agenda + filmes + livros + treino não têm nada a ver um com o outro. **Aqui é diferente.** Treino, comida e peso formam um **sistema causal único**:

> comida → energia e proteína → carga que sobe → músculo → o que a balança mostra → ajusta a comida

A integração não é arbitrária — **ela é o valor**. Nenhum app grande fecha esse loop bem: Strong/Hevy fazem treino, MyFitnessPal faz comida, GymRats faz grupo. Ninguém junta os três com uma leitura só.

---

## 4. O nicho: magro → encorpado

Este é o coração e é o que te diferencia.

**O MyFitnessPal inteiro é moldado pra emagrecer**: a linguagem, a UX, o gráfico que desce, o "calorias restantes" como punição. Pra quem quer *construir*, as perguntas são outras:

- Comi proteína suficiente hoje? (não "estourei minhas calorias?")
- Estou em superávit de verdade ou só acho que estou?
- Minha carga está subindo?
- Esse peso que subiu é músculo ou é a barriguinha voltando?

**Persona primária:** homem, 19-28, magro com barriguinha ("skinny-fat"), quer ficar encorpado, treina (ou tenta), come mal ou de menos sem perceber, motivado principalmente por **estética** e pela sensação de estar "vivendo o corpo". Universitário ou início de carreira, rotina apertada, come marmita e bandejão. **É você e é boa parte dos seus amigos de academia em Barão.**

**JTBD:** *"Me faz aparecer, me mostra se estou comendo e treinando o suficiente pra crescer, e me diz se está funcionando — sem eu virar nutricionista nem planilheiro."*

---

## 5. Grupo zero

Mesma lógica do casal zero do Xodó: o social morre de cold-start (GymRats sem grupo = app vazio). A solução é o **grupo real que já existe** — você e os amigos que treinam. Pequeno, conhecido, e com vergonha na cara suficiente pra funcionar.

Regra: **a unidade social é o grupo** (o *tenant*), não o app inteiro. Cada grupo é privado. Nada de feed público, nada de estranhos, nada de rede social.

---

## 6. Princípios

- **Aparecer > perfeição.** O app celebra presença, não 100% de cumprimento. Quem está sem ânimo não precisa de um juiz.
- **O grupo é o motor, não o enfeite.** A presença dos amigos é o que gera aderência. Mas nunca vira vigilância nem humilhação.
- **Comida brasileira de verdade.** Marmita, bandejão, PF, pão de queijo. Se o registro for chato, o hub de dieta morre em duas semanas.
- **Um toque pro que se repete.** 90% do que você come é a mesma coisa. O app tem que saber disso.
- **Nada de vergonha.** Sem mecânica de punição, sem vermelho de "você falhou", sem comparação de corpo. (ver seção 11)
- **O app não é seu nutricionista nem seu personal.** Ele calcula estimativas e mostra dados. Não prescreve.
- **Reaproveite o Temaki.** Registro de refeição e módulo de treino já existem lá em forma bruta. É base, não reconstrução.

---

## 7. O produto — três sistemas e um loop

### 7.1 O Treino (o núcleo)

**O Plano.** Você monta seu split (A/B/C, push-pull-legs, o que for): exercícios, séries, reps-alvo, carga-alvo. O plano é vivo — muda quando você quer.

**O Registro do dia.** Abre o treino de hoje, já pré-carregado com o que o plano manda. Marca série por série (carga × reps). Feito pra ser usado **com o celular na mão, entre séries, suado** — mobile-first, poucos toques, nada de formulário.

**O Termômetro de Coerência** ⭐ *(sua ideia mais original — ninguém faz isso)*
Strong e Hevy registram o que você fez. **Nenhum deles te diz se bateu com o plano.** O Forja compara plano × realidade e devolve uma leitura honesta e gentil:

> *"Você fez 4 dos 5 exercícios do Treino B. O supino subiu pra 42kg (era 40). Pulou a remada."*

Isso transforma o plano de enfeite em contrato — e te dá o dado que ninguém tem: **o quanto você realmente segue o que planeja.**

> ⚠️ **Cuidado de design:** com ânimo baixo, um medidor que te dá 62% todo dia faz você desinstalar. O termômetro **informa, não julga**. Aparecer já é vitória: "você apareceu" vem antes e maior que a %. Nunca vermelho. Nunca "você falhou".

**A Progressão de Carga.** O gráfico que importa de verdade: a carga subindo por exercício ao longo dos meses. Mais volume total, recordes pessoais, e o sinal de platô ("seu supino está em 42kg há 5 semanas"). É o retorno visual que prova que você está construindo.

### 7.2 A Dieta

**A Calculadora.** Perfil (peso, altura, idade, sexo, nível de atividade) → **TMB e gasto energético estimados** (Mifflin-St Jeor) → escolhe **bulking / cutting / manutenção** → sai a meta calórica e a divisão de macros (proteína/carbo/gordura), ajustável na mão. Pro nicho: proteína puxada e superávit moderado no bulking, com o aviso de que superávit agressivo = mais barriguinha, não mais músculo.

**O Registro (a parte que faz ou quebra).**
- Busca em **comida brasileira de verdade** (TACO) + produtos embalados por **código de barras** (Open Food Facts) — whey, barrinha, o iogurte do mercado.
- **"Meus Pratos"** ⭐ *— a feature mais importante do hub de dieta.* Você define **a marmita uma vez** (arroz + frango + brócolis + azeite) e depois registra em **um toque**, todo dia. O MyFitnessPal te obriga a lançar ingrediente por ingrediente e é por isso que ninguém aguenta. Sua vida é marmita de fim de semana, shake pré-treino e bandejão da Unicamp — **três "pratos" salvos cobrem uns 80% da sua semana.**
- **Refeições recorrentes**: o shake pré-treino do dia é o mesmo de ontem. Um toque.
- **O bandejão** e outros lugares fixos viram pratos customizados (nenhuma base do mundo tem o RU da Unicamp).

**O Acompanhamento.** No dia: quanto já entrou de kcal e macros, com foco em **proteína** (a métrica que importa pro nicho). No longo prazo: média semanal/mensal de calorias e proteína — porque **um dia não significa nada; o padrão de 4 semanas significa tudo.**

### 7.3 O Corpo

**Registro de peso** (rápido, sem drama) + **a leitura do loop** — a coisa mais valiosa do app inteiro:

> *"Nas últimas 4 semanas você comeu em média 2.780 kcal/dia (meta: 2.900) e ganhou 0,9kg. Sua carga total subiu 6%. O superávit está funcionando, mas leve — dá pra ser mais agressivo se quiser acelerar."*

Isso é o **treino + comida + peso lidos como uma história só.** É o que nenhum app faz e é a razão de o hub existir.

*Opcional (v2):* medidas (cintura, braço) e foto de progresso — porque a balança mente pra quem faz recomposição. Foto de progresso é **privada por padrão**, sempre.

### 7.4 O Grupo

**Presença** ⭐ *(o mínimo viável de aderência — vem já na Fase 1)*
Os amigos veem **que você apareceu hoje**. Só isso. Sem ranking, sem competição, sem nota. Saber que o grupo vê é o que te tira da cama — é a peça mais barata de construir e a que mais move o ponteiro.

**Desafios** *(estilo GymRats, Fase 3)*
Desafio com prazo (30 dias), grupo fechado, check-in diário, ranking simples. A mágica do GymRats é **prazo + grupo + check-in**, não sofisticação.

**Progresso dos amigos**
Ver a evolução de quem você treina junto — carga, presença, streak. **Nunca peso corporal nem foto** sem escolha explícita (ver seção 11).

---

## 8. Escopo e faseamento

> **Aviso honesto:** o que você descreveu é, na real, **três produtos** (Strong + MyFitnessPal + GymRats). Cada um é uma startup com time. Você é um estudante de economia com agenda maluca, construindo sozinho com IA. **O faseamento abaixo não é preguiça — é sobrevivência.** Tentar tudo de uma vez é o jeito mais garantido de não terminar nada.

### Fase 1 — Treino + Presença *(o coração da aderência)*
Plano de treino · Registro do dia · Termômetro de Coerência · Progressão de carga · Grupo vê quem apareceu.
**Por que primeiro:** é o mais diferenciado (a coerência), o mais tratável tecnicamente, é o que você faz toda manhã, e já ataca a aderência com a peça social mais barata que existe.

### Fase 2 — Dieta + Corpo *(fecha o loop)*
Calculadora · Registro com TACO + código de barras · **Meus Pratos** · acompanhamento diário e de longo prazo · peso · **a leitura do loop**.
**Por que segundo:** os dados estão resolvidos, mas a UX do registro é o que mata apps de dieta. Merece atenção inteira, não sobra de atenção.

### Fase 3 — Desafios *(a competição do GymRats)*
Desafios com prazo, ranking, streaks, medalhas.
**Por que por último:** precisa das duas primeiras pra ter o que disputar, e precisa de grupo ativo.

### Fora do escopo
Cardio/corrida com GPS · integração com wearable · treino em vídeo · IA que prescreve treino ou dieta · qualquer coisa social pública · app nativo (v1 é PWA, o Temaki já é).

---

## 9. Fundação de dados e custo zero

Boa notícia: **as três bases existem, são gratuitas e não dependem de ninguém.**

| Camada | Fonte | Custo | Detalhe |
|---|---|---|---|
| **Alimentos brasileiros** | **TACO (NEPA/UNICAMP)** | R$0 | O padrão-ouro nacional, feito **pela sua própria universidade**. Já existe em JSON aberto no GitHub → **embuta local, sem API**. Zero dependência, zero latência. |
| **Produtos embalados** | **Open Food Facts** | R$0 | Código de barras, ~4M produtos, licença **ODbL**, sem chave de API, **uso comercial liberado**. Exige atribuição + User-Agent descritivo; cachear os dados. Instância BR disponível. |
| **Exercícios** | **ExerciseDB** (ou **wger**) | R$0 | Open source, milhares de exercícios com músculo-alvo, equipamento, GIF e instruções. Deploy de 1 clique na Vercel, com setup pro Supabase. Nomes em inglês → **traduzir/curar os ~80 exercícios que seu grupo usa** (curadoria pequena vence base gigante). |
| **Banco + auth + realtime** | Supabase (free) | R$0 | Unidade = usuário e grupo. Realtime serve o "quem apareceu hoje". |
| **Hospedagem** | Vercel/Cloudflare (free) | R$0 | Checar termos de uso comercial só se um dia cobrar. |

**Por que isso é melhor que o Norte:** lá a entrada de dados (B3/Open Finance) era o gargalo estrutural. **Aqui não tem gargalo** — tudo é aberto e embutível. É o mais fácil de construir dos três produtos.

**Sobre a comida brasileira:** as APIs gringas tipo USDA não têm pão de queijo, feijoada nem açaí, e o MyFitnessPal é poluído com alimentos incorretos, o que o torna pouco confiável pra dieta limpa. A TACO + Meus Pratos resolve isso — e é **exatamente a brecha que te dá razão de existir.**

---

## 10. Design & tom

Herda a paleta escura do Temaki/Atlas. Mas o contexto de uso muda tudo: **é na academia, entre séries, com uma mão, suado.** Botões grandes, contraste alto, zero formulário. O registro de série tem que ser mais rápido que abrir o WhatsApp.

Tom: energia de amigo, não de personal gritando. A linhagem leve do Temaki funciona aqui — "bora", não "NO PAIN NO GAIN".

---

## 11. Saúde, segurança e ética (leia com atenção)

Este produto junta três coisas que, misturadas, têm risco real: **motivação estética + contagem de calorias + comparação social**. Esse é literalmente o perfil de risco de transtorno alimentar e dismorfia muscular em homens jovens — e seu público **é** homem jovem de 19-25 querendo ficar "no shape". Isso não é moralismo; é design responsável de um app que seus amigos vão usar.

**Decisões de produto, não avisos legais:**
- **Sem mecânica de vergonha.** Nada de vermelho, "você falhou", streak quebrada punitiva. O termômetro de coerência informa; não julga.
- **Peso e foto são privados por padrão.** O grupo vê presença e carga — **nunca** peso corporal ou corpo, salvo escolha explícita. Comparar corpo entre amigos é o caminho mais curto pro problema.
- **Dá pra esconder os números.** Quem quiser acompanhar sem ver kcal na cara pode. Modo "só proteína e presença".
- **Piso calórico com aviso.** Se a calculadora cair abaixo de um mínimo razoável, o app avisa em vez de obedecer calado.
- **Um dia ruim não é nada.** A média de 4 semanas é a métrica-herói; o dia é ruído. Isso é verdade *e* protege a cabeça de quem usa.

**Limites explícitos:**
- Não sou médico nem nutricionista, e **o app também não é.** TMB/GET são **estimativas** (Mifflin-St Jeor tem margem de erro real por pessoa). Deixe isso visível.
- O app **calcula e mostra**; não prescreve dieta nem treino. Ninguém deve trocar acompanhamento profissional por ele.
- Se um dia virar produto pago para estranhos, vale conferir os limites com um profissional — prescrição de dieta é atividade regulamentada (CFN) no Brasil.

---

## 12. O que é sucesso

**North star: presença.** Sessões de treino registradas por semana, por pessoa, sustentadas ao longo de meses. Se o app não te faz aparecer, ele falhou — não importa quantos gráficos tenha.

- **Aderência ao registro:** o registro sobrevive à semana 4? (é onde todo tracker morre)
- **O loop foi lido?** As pessoas abrem a leitura de 4 semanas?
- **Carga subiu?** O resultado que o usuário veio buscar.
- **O teste sentido:** se o app sumisse, o grupo ficaria sem ele — ou voltaria pro Notes sem sentir falta?
- **Teste pessoal honesto:** *você voltou a treinar com constância?* Se o app não resolve o seu ânimo, não vai resolver o de ninguém.

---

## 13. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| **Escopo (são 3 produtos)** | **Alta** | Faseamento rígido. Fase 1 sozinha já é um app útil. Não começar a dieta antes do treino estar vivo. |
| **Morte na semana 4** (registro é chato) | **Alta** | Meus Pratos, recorrentes, um toque, mobile-first. Se o registro não for trivial, nada mais importa. |
| **Grupo vazio = app morto** | Alta | Grupo zero real (você + amigos de academia). Presença já na Fase 1. Sem grupo, não lance o social. |
| **Risco de saúde mental / TA** | Alta | Seção 11 inteira. Isso é requisito, não enfeite. |
| **Termômetro vira juiz e afasta** | Média | Celebra presença antes de %. Nunca punir. |
| **Seu tempo e seu ânimo** | Média | O app é pra você primeiro. Se você não usa, é sinal — não force. |
| **Competir com Strong/Hevy/MFP em features** | Média | Não competir. Vencer no loop integrado + comida brasileira + grupo real + nicho. |

---

## 14. Próximos passos

1. **Fase 1, minúscula.** Plano + registro + coerência + progressão + presença. Reaproveita Temaki + Supabase + ExerciseDB.
2. **Cure ~80 exercícios em português** — os que você e seus amigos realmente fazem. Curadoria pequena e certa vence base de 11 mil em inglês.
3. **Use você, por 4 semanas reais.** Você é o usuário zero. Se o app não te fizer aparecer, o problema é o app — descubra isso antes de chamar alguém.
4. **Chame 3-5 amigos da academia** pro grupo zero. Não mais. É deles que sai o v1.1.
5. **Só então** a dieta. Ela é o dobro de trabalho da fase 1 — e merece atenção inteira.

---

## Apêndice — os três produtos, lado a lado

| | **Norte** | **Xodó** | **Forja** |
|---|---|---|---|
| **Pra quem** | investidores jovens | vocês dois | você + amigos de academia |
| **Motor** | clareza | afeto | aderência |
| **Unidade social** | indivíduo | o casal | o grupo |
| **Gargalo de dados** | **alto** (B3/Open Finance) | baixo (TMDB) | **nenhum** (tudo aberto) |
| **Custo** | ~R$0 | ~R$0 | ~R$0 |
| **Dificuldade real** | média | **baixa** | **alta** (escopo) |
| **Usuário zero** | você | vocês | você |

**Leitura honesta:** o Xodó é o mais fácil de terminar e o mais provável de ser amado. O Forja é o mais ambicioso e o que mais mexe na sua vida — mas é três vezes o trabalho. O Norte é o que mais parece um negócio. Se for construir um agora, o Xodó te dá vitória rápida; o Forja te dá o corpo que você quer. Nenhum dos dois é errado — mas **construir os três ao mesmo tempo é escolher não terminar nenhum.**
