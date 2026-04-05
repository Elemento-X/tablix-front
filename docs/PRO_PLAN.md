# Tablix — Plano Pro (Especificacao Oficial)

## 1. Escopo do plano

- O usuário pode realizar **até 40 unificações de tabelas por mês**.
- O Plano Pro possui **histórico de 30 dias** para download posterior.

---

## 2. Upload de planilhas

- Máximo de **15 planilhas** por unificação.
- **Tamanho máximo por planilha:** **2MB**.
- O tamanho total permitido é a **soma do limite individual**.
  - Exemplo: 15 planilhas → até **30MB** no total.
- As planilhas podem conter **qualquer quantidade de colunas**.
- Não há restrição de tipo de dado nas colunas.

---

## 3. Validação de linhas

- Cada planilha pode conter **até 5.000 linhas**.
- Caso **qualquer planilha** ultrapasse esse limite:
  - a unificação deve ser **bloqueada**
  - deve ser exibida **notificação de erro clara**
- Não existe limite global de linhas somadas entre planilhas.

---

## 4. Seleção de colunas

- O usuário pode selecionar **até 10 colunas** para a unificação.
- As planilhas de input podem conter colunas ilimitadas.
- Apenas as colunas selecionadas devem compor o arquivo final.
- Todas as demais colunas devem ser **ignoradas pelo backend**.

---

## 5. Processamento

- Unificações do Plano Pro devem utilizar **processamento prioritário**.
- Processos Pro não devem entrar na mesma fila do Plano Free.
- O tempo de resposta deve ser inferior ao Free sempre que possível.

---

## 6. Arquivo de saída

- O arquivo final **não deve conter marca d’água**.
- Não deve existir:
  - aba "Sobre"
  - coluna "Gerado por Tablix"
- O arquivo deve ser **100% limpo**.

---

## 7. Histórico e persistência

- O sistema **não deve salvar** arquivos de input ou output permanentemente.
- O Plano Pro possui **histórico de 30 dias** para download posterior.
- Após o período de retenção, todos os dados devem ser descartados automaticamente.

---

## 8. Restrições e bloqueios

A unificação deve ser bloqueada quando:

- Mais de 15 planilhas forem enviadas
- Alguma planilha ultrapassar **2MB**
- Alguma planilha ultrapassar **5.000 linhas**
- Mais de 10 colunas forem selecionadas
- O limite mensal de 40 unificações for atingido

---

## 9. Notificações (obrigatoriamente claras)

Todas as notificações devem:

- Indicar **qual limite foi excedido**
- Informar **o valor permitido**
- Informar **o valor detectado**
- **Apontar o arquivo específico** quando o erro for por tamanho ou linhas

### Exemplos de erro

- "O arquivo **clientes_janeiro.xlsx** possui **2.6MB**.  
  O limite do Plano Pro é **2MB por planilha**."
- "A planilha **leads.csv** possui **5.842 linhas**.  
  O limite do Plano Pro é **5.000 linhas por planilha**."
- "Você selecionou **12 colunas**, mas o Plano Pro permite apenas **10**."

### Sucesso

- "Unificação concluída com sucesso com processamento prioritário."

---

## 10. Diferença explícita para outros planos

- Em relação ao **Plano Free**:
  - limites maiores
  - processamento prioritário
  - sem marca d’água
- Em relação ao **Plano Enterprise**:
  - histórico de 30 dias (Enterprise: 90 dias)
  - não possui customizações contratuais
