# 📖 Manual Detalhado de Instalação e Execução - Optomed Clínica

Este manual explica como instalar, configurar e rodar o **Optomed Clínica** em qualquer notebook ou computador (Windows).

---

## 🚀 Método 1: Instalação 100% Automática / Autônoma (Recomendado)

Se você apenas transferiu a pasta ou descompactou o `.zip` no novo computador:

1. Abra a pasta do sistema: `optomed-clinica`.
2. Dê **dois cliques** no arquivo:
   👉 **`INSTALADOR_AUTOMATICO.bat`**
3. O script fará tudo sozinho:
   - ✅ Verifica se o **Node.js** está instalado (se não estiver, baixa e instala automaticamente em modo silencioso).
   - ✅ Baixa e configura todas as dependências (`npm install`).
   - ✅ Compila os módulos de tela e servidor (`npm run build`).
   - ✅ Cria o ícone de atalho **"Optomed Clinica"** na Área de Trabalho.
   - ✅ Abre o sistema pronto no seu navegador padrão (`http://localhost:8765/clinical/`).

---

## ⚡ Como Abrir o Sistema no Dia a Dia

Após a primeira instalação, você tem duas formas fáceis de abrir:

- **Pelo atalho da Área de Trabalho**: dê 2 cliques em **"Optomed Clinica"**.
- **Ou pelo arquivo na pasta**: dê 2 cliques em **`EXECUTAR_SISTEMA.bat`**.

O navegador abrirá automaticamente em:
`http://localhost:8765/clinical/`

---

## 🛠️ Como Editar o Código no Novo Notebook (Modo Desenvolvedor)

Para programar, editar telas, formulários ou relatórios com **recarregamento automático (Hot-Reload)**:

1. Dê dois cliques em:
   👉 **`MODO_DESENVOLVEDOR_EDICAO.bat`**
2. Abra a pasta no **VS Code** (`File -> Open Folder -> selecione a pasta optomed-clinica`).
3. Qualquer alteração salva nos arquivos será exibida instantaneamente na tela (`http://localhost:5173/`).

### Mapa das pastas principais para edição:
- **Telas e Prontuários**: `packages/clinical/src/pages/`
  - Workspace do Examinador: `DoctorWorkspacePage.tsx`
  - Gestão Financeira e Repasses: `FinancialManagementPage.tsx`
  - Fila e Recepção: `WaitingRoomPage.tsx`
  - Prontuário Completo: `ExaminationWorkspace.tsx`
- **Banco de Dados Local (JSONs)**: `packages/server/data/ivs/`
  - `patients.json` (Pacientes cadastrados)
  - `appointments.json` (Agendamentos e atendimentos)
  - `transactions.json` (Caixa e pagamentos)
- **Serviços de Sincronização**: `packages/clinical/src/services/`
  - `offlineDb.ts` (Lógica de dados locais e regras de repasse)
  - `remoteSync.ts` (Sincronização em tempo real com a nuvem)

---

## 📋 Método 2: Instalação Manual via Comandos (Terminal / Prompt)

Se preferir fazer manualmente pelo terminal:

### 1. Pré-requisito
Certifique-se de ter o **Node.js LTS** instalado ([nodejs.org](https://nodejs.org/)).

### 2. Comandos no Terminal (PowerShell ou CMD)
Navegue até a pasta onde salvou o projeto:
```bash
cd D:\optomed-clinica
```

Instale as dependências:
```bash
npm install
```

Compile a aplicação para produção:
```bash
npm run build
```

Inicie o servidor local:
```bash
npm --workspace=@optotipo/server run start
```

Acesse no seu navegador:
`http://localhost:8765/clinical/`

---

## ❓ Perguntas Frequentes & Resolução de Problemas

1. **O instalador automático deu erro de permissão no Windows:**
   - Clique com o botão direito no `INSTALADOR_AUTOMATICO.bat` e escolha **"Executar como Administrador"**.

2. **O Node.js não foi reconhecido após a instalação:**
   - Basta reiniciar o computador ou fechar e reabrir o terminal para o Windows atualizar as variáveis de ambiente (`PATH`).

3. **Como levar para outro computador via Pendrive:**
   - Copie o arquivo `D:\optomed-clinica-completo.zip` para o pendrive.
   - No outro notebook, clique com o botão direito nele e escolha **"Extrair Tudo..."**.
   - Entre na pasta extraída e execute o `INSTALADOR_AUTOMATICO.bat`.
