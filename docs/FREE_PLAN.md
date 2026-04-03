# 📘 Tablix — Plano Free (Especificação Oficial)

## 1. Escopo do plano

- O usuário pode realizar **1 unificação de tabelas por mês**.
- A unificação é **pontual** e **não persistente**.

---

## 2. Upload de planilhas

- Máximo de **3 planilhas** por unificação.
- **Tamanho total máximo:** **1MB** (soma das planilhas).
- As planilhas podem conter **qualquer quantidade de colunas**.
- Não há restrição de tipo de dado nas colunas.

---

## 3. Validação de linhas (pré-processamento obrigatório)

Antes da unificação, o sistema deve calcular a soma total de linhas das planilhas de input.

### Regra

`totalLinhas = Σ(linhas de cada planilha)`

- Se `totalLinhas > 500`:
  - A unificação **não deve ser executada**
  - Deve ser exibida **notificação de erro clara**
- Se `totalLinhas ≤ 500`:
  - A unificação pode prosseguir
  - Deve ser exibida **notificação de sucesso**

> O limite de 500 linhas é **global**, não dividido por planilha.

---

## 4. Seleção de colunas

- O usuário pode selecionar **no máximo 3 colunas** para a unificação.
- As planilhas de input podem conter colunas ilimitadas.
- **Somente** as colunas selecionadas devem compor o arquivo final.
- Todas as demais colunas devem ser **ignoradas pelo backend**.

---

## 5. Arquivo de saída — Marca d’água obrigatória

No Plano Free, o arquivo final **sempre** deve conter marca d’água.

### 5.1 Aba "Sobre"

- Deve existir uma aba adicional chamada **"Sobre"**.
- A aba deve conter:
  - Identificação do Tablix
  - Informação de que o arquivo foi gerado no **Plano Free**
- A aba **não pode ser removida**.

### 5.2 Coluna "Gerado por Tablix"

- O arquivo unificado deve conter uma coluna adicional chamada **"Gerado por Tablix"**.
- A coluna deve estar presente em **todas as linhas** do resultado.
- O valor pode ser fixo (ex: `tablix.me`).
- A coluna **não pode ser removida**.

---

## 6. Histórico e persistência

- O sistema **não deve salvar**:
  - arquivos de input
  - arquivos de output
  - metadata da unificação
- **Não existe histórico** de unificações no Plano Free.
- Após a entrega do arquivo, todos os dados devem ser descartados.

---

## 7. Restrições e bloqueios

A unificação deve ser bloqueada quando:

- Mais de 3 planilhas forem enviadas
- Tamanho total das planilhas ultrapassar 1MB
- Soma total de linhas ultrapassar 500
- Mais de 3 colunas forem selecionadas
- Limite mensal de unificações for atingido

---

## 8. Notificações (obrigatoriamente claras)

Todas as notificações devem:

- Indicar **qual limite foi excedido**
- Informar **o valor permitido**
- Informar **o valor detectado**
- Quando aplicável, **apontar o arquivo causador**

### Exemplos de erro

- "O limite do Plano Free é **1MB no total**. O upload possui **1.4MB**."
- "A soma total de linhas permitida é **500**. Foram detectadas **642 linhas**."
- "Você selecionou **5 colunas**, mas o Plano Free permite apenas **3**."

### Sucesso

- "Unificação concluída com sucesso dentro dos limites do Plano Free."
- "Upload da planilha [nome do arquivo].[extensão do arquivo] realizado com sucesso."

---

## 9. Diferença explícita para outros planos

- As regras acima são **exclusivas do Plano Free**.
- Nos planos **Pro** e **Enterprise**:
  - Não existe marca d’água
  - O arquivo gerado é **100% limpo**
