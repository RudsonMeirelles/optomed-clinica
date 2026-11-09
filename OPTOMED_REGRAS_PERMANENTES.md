# REGRAS PERMANENTES DE EVOLUÇÃO DO OPTOMED (FASE 21.0)
## GUIA DEFINITIVO PARA FUTUROS DESENVOLVIMENTOS E MANUTENÇÕES

Este documento estabelece as diretrizes perpétuas de engenharia e governança de software para a plataforma **OPTOMED**. Toda evolução técnica, refatoração ou correção de bugs deve obrigatoriamente respeitar os princípios abaixo:

---

### PRINCÍPIO 1 — PRESERVAÇÃO
Antes de modificar qualquer código existente:
* Entender a regra de negócio que motivou a implementação.
* Mapear o impacto nos 4 workspaces do monorepo.
* Preservar contratos consolidados sem quebras não planejadas.

---

### PRINCÍPIO 2 — UMA ÚNICA FONTE DE VERDADE
É estritamente proibido criar estruturas ou mecanismos concorrentes:
* **Pacientes:** Um único modelo centralizado com `patientGlobalId`.
* **Prontuário:** Um único fluxo de episódios, consultas (`Encounter`) e prescrições.
* **Sincronização:** Um único serviço de fila (`RemoteSyncService` + `syncQueue`).
* **Autenticação:** Uma única camada de controle de acesso (`SecurityService` + `AuthService`).

---

### PRINCÍPIO 3 — OFFLINE-FIRST COMO REQUISITO BÁSICO
Toda tela ou funcionalidade que realiza mutação de dados deve operar com 100% de autonomia sem conexão com a internet.
* Persistência primária local atômica em IndexedDB / LocalStorage.
* Enfileiramento na fila durável com resolução automática na reconexão.

---

### PRINCÍPIO 4 — SEGURANÇA E PRIVACIDADE INEGOCIÁVEIS
Nenhuma facilidade de desenvolvimento justifica redução de segurança:
* Senhas exclusivamente em PBKDF2 com 100.000 iterações e salt aleatório.
* Tokens de sessão assinados via HMAC-SHA-256 e validados com `crypto.timingSafeEqual`.
* O `clinicId` enviado pelo cliente nunca é aceito cegamente como autoridade; a autorização do token é validada pelo servidor.
* Zero dados de prontuário, receitas ou diagnósticos em painéis públicos de TV.

---

### PRINCÍPIO 5 — DADOS CLÍNICOS E AUDITORIA
* Dados médicos são imutáveis e auditáveis; novas evoluções complementam consultas anteriores sem sobrescrever o histórico longitudinal do paciente.
* Toda ação crítica gera entrada no log de auditoria com identificação do operador.

---

### PRINCÍPIO 6 — ARITMÉTICA FINANCEIRA SEGURA
* Todo valor monetário é manipulado como centavos inteiros (`toCents`/`fromCents`), impedindo discrepâncias de ponto flutuante IEEE-754.

---

### PRINCÍPIO 7 — A REGRA PERMANENTE DOS QUATRO WORKSPACES
* Caso haja alteração em `@optotipo/shared` ou em contratos transversais, é **obrigatório** compilar e validar os 4 pacotes:
  1. `packages/shared`
  2. `packages/server`
  3. `packages/offline-tv`
  4. `packages/clinical`
* Build com sucesso é requisito mínimo de compilação, mas **não equivale à homologação funcional**.

---

### PRINCÍPIO 8 — TESTES AUTOMATIZADOS E NÃO REGRESSÃO
* Nenhuma funcionalidade é considerada concluída sem testes unitários ou integrados.
* É terminantemente proibido comentar ou apagar testes anteriores para "fazer o build passar".

---

### PRINCÍPIO 9 — ESTABILIDADE EM PRODUÇÃO
* O sistema em produção prioriza **estabilidade e confiabilidade clínica** sobre quantidade de novas ferramentas cosméticas.
* Toda alteração deve ser incremental, reversível, testável e homologada antes de ser promovida.
