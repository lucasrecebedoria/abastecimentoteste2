
# MoveBuss • Caixa Pago (GitHub Pages)

Site estático para registro de caixas pagos com Firebase Auth + Firestore.

## Páginas
- `index.html` — Login por **matrícula+senha** (`matricula@movebuss.local` internamente).
- `register.html` — Cadastro (matrícula, nome, senha). Usuários `4144`, `70029`, `6266` recebem papel **admin** automaticamente.
- `app.html` — Aplicação (abrir/fechar caixa, registrar abastecimento, sangria, relatórios).

## Coleta/coleções criadas
- `users` — Perfil do usuário (uid, matricula, nome, role).
- `caixas` — Sessões de caixa (abertura/fechamento, totais).
- `abastecimentos` — Um doc por abastecimento.
- `sangrias` — Solicitações de sangria (pendente/aprovada/reprovada).
- `relatorios` — Itens agregados por data (inclui **resumo final** ao fechar).

## Observações
- Valor do abastecimento = `bordos × 5` (bloqueado para edição).
- Prefixo sempre `55` + **3 dígitos**.
- Recebedor = matrícula do usuário logado (fixo).
- Recibo para **impressora térmica** abre em janela separada e imprime automaticamente.
- Persistência de login é **LOCAL** (permanece logado até clicar em *Sair*).
- Badge verde (usuário) e dourada (admin) com nome e matrícula no topo.
- Menu lateral abre via botão no canto superior esquerdo.

Coloque tudo em um repositório e habilite GitHub Pages (branch `main`, pasta `/root`). Acesse `index.html`.
