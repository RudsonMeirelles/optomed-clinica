# PROJETO: OPTOTIPO MEIRELLES (Versão 2.0)

Plataforma profissional para apoio à avaliação visual em consultórios de oftalmologia e optometria, composta por dois sistemas autônomos e integráveis:

1. **SISTEMA A: OPTOTIPO MEIRELLES OFFLINE** (TV / Display Standalone)
2. **SISTEMA B: OPTOTIPO MEIRELLES CLINICAL** (Gestão Clínica, Prontuário e Controle Remoto)

---

## 📐 Regra Arquitetural Fundamental

O sistema **OFFLINE jamais depende do sistema CLINICAL ou de internet** para executar os testes.
Se não houver conexão com a internet, servidor ou rede local, o Optotipo Offline continua funcionando normalmente e com total autonomia.

---

## 🚀 Como Executar

### Opção 1: Execução Automática (Windows)
Dê um duplo clique no arquivo [`iniciar-sistema.bat`](iniciar-sistema.bat) ou execute o script PowerShell [`iniciar-sistema.ps1`](iniciar-sistema.ps1).

### Opção 2: Linha de Comando (NPM)

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar todos os sistemas em paralelo
npm run dev
```

Portas padrão:
- **Optotipo Offline TV**: [http://localhost:5173](http://localhost:5173)
- **Optotipo Clinical**: [http://localhost:5174](http://localhost:5174)
- **Servidor LAN Relay**: [http://localhost:8080](http://localhost:8080)

---

## 🧪 Testes Automatizados de Precisão Óptica

Para rodar a suíte de testes com validação das fórmulas trigonométricas de acuidade visual, escalas logMAR e proporções geométricas $5\times 5$:

```bash
npm test
```

---

## 📺 Módulos Clínicos Disponíveis na TV

1. **AV Longe**: Sloan, Snellen, Tumbling E ($5\times 5$), Landolt C ($5\times 5$, 4 e 8 orientações), Números e Figuras Pediátricas. Modos: Linha Completa, Reduzida, Isolado, Crowding e Randomização.
2. **AV Perto**: Tabela Jaeger contínua, logMAR de perto, distâncias de 33cm, 40cm, 50cm e 60cm, e módulo de Presbiopia com ajuste de adição.
3. **Refração Bicromático**: Painel dividido Vermelho / Verde balanceado.
4. **Relógio Astigmático**: Radial de Green com 12 meridianos e regra de cálculo do eixo negativo ($Hora \times 30^\circ$).
5. **Cilindro Cruzado (JCC)**: Alvos de pontos, anéis e letras com alternância entre Posição 1 e Posição 2.
6. **Worth 4 Dot**: Avaliação de fusão binocular, supressão monocular e diplopia (Longe e Perto).
7. **Schober**: Cruz vermelha central e anéis concêntricos verdes para heteroforias.
8. **Grade Cruzada (Cross Grid)**: Avaliação de acomodação e cilindro cruzado com inversão de contraste.
9. **Sensibilidade ao Contraste**: Níveis progressivos de 100% até 0.78% com escala logCS.
10. **Visão Cromática**: Triagem Cromática Digital com placas pseudo-isocromáticas.
11. **Retina / Tela de Amsler**: Grade padrão, invertida, diagonais e grade macular densa.
12. **Motilidade Ocular**: Padrão H clássico dos músculos extraoculares, movimentos sacádicos e acompanhamento suave com 3 velocidades.
13. **Alvos de Fixação**: Alvos luminosos e animados para retinoscopia e oftalmoscopia.
14. **Baixa Visão / Visão Subnormal**: Optotipos ampliados ($20/400$ a $20/1600$) e registros operacionais estruturados para CF (Conta Dedos), HM (Movimento de Mãos), LP (Percepção Luminosa) e NLP (Sem Percepção Luminosa).
15. **Pediátrico**: Ambiente lúdico com figuras geométricas infantis consistentes.
16. **Educacional**: Diagramas explicativos de Emetropia, Miopia, Hipermetropia, Astigmatismo e Presbiopia.
17. **Protocolos Rápidos**: Sequências configuráveis de atendimento (Consulta Geral, Pediátrico, Baixa Visão, Macular).
18. **Calibração Física**: Régua de $100\text{ mm}$ na tela para calibração milimétrica exata da TV.

---

## 📋 Módulos do Sistema Clinical

- **Dashboard**: Fila de espera e consultas do dia em tempo real.
- **Prontuário & Recepção**: Cadastro de pacientes seguro (UUIDs internos, sem uso de CPF como chave primária, em conformidade com a LGPD).
- **Workspace do Examinador**: Visão unificada com Anamnese, Lensometria, Autorefração, Refração Subjetiva e Painel de Controle Remoto do Optotipo.
- **Pontuação Automática**: Botões de pontuação rápida `[Correto ✓]`, `[Incorreto ✗]`, `[Não viu ?]` com cálculo automático da acuidade final.
- **Receita Óptica**: Geração e impressão formatada de prescrição oftálmica.
- **Relatório Clínico**: Emissão de resumo do atendimento, conduta e retorno recomendado.
- **Resiliência Offline**: Fila de sincronização local idempotente com IndexedDB.
- **Trilha de Auditoria & LGPD**: Logs de todos os acessos e exportação completa dos dados em JSON.

---

## 🔒 Conformidade LGPD e Limites Clínicos

- As ferramentas digitais de triagem funcionam como auxílio orientativo ao exame e **não substituem o julgamento clínico do profissional habilitado**.
- Nenhuma triagem gera diagnósticos médicos de forma automatizada.
- A plataforma foi projetada segundo os princípios de minimização de dados, finalidade e segurança da informação.
