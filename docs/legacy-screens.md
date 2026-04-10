
# Telas Legadas & Dependências do Telegram Native

Em conformidade com a Regra Suprema de "Zero Texto Formatado para Telegram Native" (ver `CLAUDE.md`), todos os fluxos do jogo agora assumem que o formato principal  é puramente WebApp.

Algumas telas ainda sofrem de resquícios de arquitetura antiga que gerava conteúdo e design voltado a balões de chat inline do Telegram via strings formatadas de HTML (`format_msg`). Elas devem ser convertidas à medida que forem sendo atualizadas.

## Lista de Telas Obsoletas (Usando apenas texto pass-through)

1. **Atividades na Cidade**
   - Banco (`bank.py` e rotas anexas)
   - Estalagem (`inn.py` e rotas anexas)
   - Templo / Taverna (A interatividade já pode ser tabulada ou enviada em structs JSON mas frequentemente reverte para strings formatadas).

2. **Rankings e Registros Externos**
   - Mural dos Aventureiros (`heroes_wall.py`): Gera ranking interpolando HTML `<b>` e ícones `??`. Precisará de reestruturação para devolver endpoints JSON para o hub.

## Estratégia de Migração Obrigatória
Quando tocar nestes módulos, a orientação principal de refatoração será:
1. Eliminar constructos string intensivos formatados de resposta no core das mecânicas.
2. Inserir dicionários brutos em keys reservadas do dicionário `result` (e.g., `_heroes_wall = [{pos: 1, name: "Legolas", score: 50}]`).
3. Construir arquivos de design puro (`css`/`js`) em `valdoria-webapp` atrelados à rota para renderizar com visual rico e alinhado ao *Valdoria Design System*.

> O texto gerado (ex: `result["text"]`) deve tender a zero, substituído completamente pelos blocos estéticos nas requisições Frontend.

