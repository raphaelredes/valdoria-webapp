# Trilha Sonora — Lendas de Valdoria

Arquivos MP3 de música ambiente para o jogo. O `audio-manager.js` carrega automaticamente
pelo nome do arquivo — basta colocar o MP3 aqui e o sistema já toca no bioma/tela correto.

## Formato obrigatório

- **Codec**: MP3 (máxima compatibilidade com Telegram WebView Android/iOS)
- **Bitrate**: 128kbps (equilíbrio qualidade vs tamanho — ~250-500KB por loop)
- **Duração**: 30-60s para loops ambiente, 10-15s para fanfarras
- **Loop**: Início e fim devem conectar sem clique audível (fade-in 0.5s + fade-out 0.5s)
- **Vocals**: NENHUM — apenas instrumental
- **Volume**: Normalizar para -14 LUFS (música de fundo, não dominante)

## Arquivos esperados

| Arquivo | Bioma/Situação | Duração | Usado em |
|---------|----------------|---------|----------|
| `tavern_ambient.mp3` | Taverna | 60s | Game Hub (city.tavern) |
| `city_day.mp3` | Cidade (dia) | 45-60s | Game Hub (city.hub, city.*) |
| `forest_explore.mp3` | Floresta | 45s | Explore + Navigate (bioma forest) |
| `combat_tense.mp3` | Combate | 45s | Combat WebApp, Arena |
| `desert_wind.mp3` | Deserto | 45s | Explore + Navigate (bioma desert) |
| `dungeon_dark.mp3` | Dungeon | 45s | Explore (bioma dungeon) |
| `swamp_mist.mp3` | Pântano | 45s | Explore + Navigate (bioma swamp) |
| `mountain_wind.mp3` | Montanha | 45s | Explore + Navigate (bioma mountain) |
| `snow_silence.mp3` | Neve/Tundra | 45s | Explore + Navigate (bioma snow) |
| `victory_fanfare.mp3` | Vitória | 15s | Combat (vitória), Explore (recompensa) |
| `defeat_somber.mp3` | Derrota | 15s | Combat (derrota) |

## Como gerar os MP3s

### Opção 1: Google MusicFX (gratuito)
1. Acesse https://aitestkitchen.withgoogle.com/tools/music-fx
2. Use os prompts abaixo (um por vez)
3. Baixe o resultado, renomeie para o nome da tabela acima
4. Se o loop não conectar bem, use Audacity para aplicar crossfade nas pontas

### Opção 2: Suno (melhor qualidade, ~$0.03/track)
1. Acesse https://suno.com
2. Use modo "Instrumental" (sem vocals)
3. Cole o prompt abaixo
4. Baixe em MP3, renomeie

### Opção 3: Mubert (real-time, API)
1. https://mubert.com — gera loops procedurais
2. Bom para ambient, menos para fanfarras

## Prompts de geração

Copie e cole diretamente na ferramenta escolhida:

### tavern_ambient.mp3
```
Medieval fantasy tavern ambient music. Warm crackling fireplace, soft bard playing lute,
gentle wooden flute melody, distant murmur of patrons. Cozy, inviting, relaxed atmosphere.
Celtic folk influence. Seamless loop, 60 seconds, instrumental only, no vocals.
```

### city_day.mp3
```
Medieval fantasy city daytime ambient. Bustling market atmosphere, distant church bells,
lute and recorder duet, horse hooves on cobblestone. Optimistic, adventurous mood.
Renaissance fair influence. Seamless loop, 50 seconds, instrumental only, no vocals.
```

### forest_explore.mp3
```
Enchanted forest exploration ambient music. Mysterious soft strings, gentle harp arpeggios,
bird songs, rustling leaves, distant owl. Ethereal, magical, slightly tense undertone.
Celtic woodland influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### combat_tense.mp3
```
Epic medieval fantasy combat music. Driving war drums, tense orchestral strings,
brass stabs, fast tempo, building intensity. Heroic but dangerous. D&D battle encounter feel.
Orchestral film score influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### desert_wind.mp3
```
Desert wasteland exploration ambient. Hot dry wind, sparse oud melody, soft frame drum rhythm,
distant sand shifting. Lonely, vast, ancient ruins atmosphere. Middle Eastern medieval influence.
Seamless loop, 45 seconds, instrumental only, no vocals.
```

### dungeon_dark.mp3
```
Dark dungeon crawl ambient music. Dripping water echoes, eerie low strings drone,
distant metallic clanks, subtle dissonant choir pad. Claustrophobic, tense, foreboding.
Dark fantasy horror influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### swamp_mist.mp3
```
Murky swamp exploration ambient. Bubbling marsh sounds, croaking frogs, low bassoon drone,
eerie theremin-like melody, humid oppressive atmosphere. Mysterious and slightly unsettling.
Gothic folk influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### mountain_wind.mp3
```
High mountain pass exploration ambient. Howling wind, distant eagle cry, bold French horn melody,
ethereal choir pad, sparse percussion. Majestic, exposed, awe-inspiring height.
Nordic folk influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### snow_silence.mp3
```
Frozen tundra exploration ambient. Crystalline bell chimes, soft celesta melody, muffled wind,
crunching ice texture, minimal sparse arrangement. Cold, isolated, hauntingly beautiful.
Scandinavian ambient influence. Seamless loop, 45 seconds, instrumental only, no vocals.
```

### victory_fanfare.mp3
```
Short triumphant victory fanfare. Bright brass melody, ascending strings, snare drum roll
into cymbal crash, major key resolution. Heroic, celebratory, satisfying conclusion.
Classic RPG victory theme influence. 15 seconds, instrumental only, no vocals.
```

### defeat_somber.mp3
```
Short somber defeat theme. Descending minor key strings, solo cello lament, muted horn,
fading into silence. Melancholic, reflective, not hopeless. Dignified loss.
Classical requiem influence. 15 seconds, instrumental only, no vocals.
```

## Pós-geração

1. Coloque todos os MP3s nesta pasta (`shared/audio/`)
2. Teste no navegador: abra qualquer WebApp e interaja — a música deve tocar após o primeiro toque
3. Se algum loop tiver "clique" na transição, use Audacity:
   - Selecione 0.5s do início e do fim
   - Efeitos → Crossfade (Fade In no início, Fade Out no fim)
   - Exporte como MP3 128kbps
4. Commit e push para GitHub Pages:
   ```bash
   cd valdoria-webapp
   git add shared/audio/*.mp3
   git commit -m "feat: add ambient music MP3 loops"
   git push origin main
   ```

## Mapeamento automático (audio-manager.js)

O `ValdoriaAudio.playBiome(biome)` mapeia automaticamente:

```
forest   → forest_explore.mp3
desert   → desert_wind.mp3
swamp    → swamp_mist.mp3
mountain → mountain_wind.mp3
snow     → snow_silence.mp3
dungeon  → dungeon_dark.mp3
city     → city_day.mp3
tavern   → tavern_ambient.mp3
combat   → combat_tense.mp3
```

Telas do Game Hub mapeiam via `_updateAmbientMusic(screenId)` em `game-renderer.js`.


---

## SFX de Combate (Efeitos Sonoros)

### Efeitos Procedurais (Web Audio API)

O arquivo \ gera SFX procedurais via Web Audio API (osciladores).
Estes funcionam sem arquivos MP3 — são criados em tempo real no navegador.

| Função | Uso | Tipo |
|--------|-----|------|
| \ | Rolagem de dado | Ruído branco 150ms |
| \ | Acerto normal | Sawtooth 120Hz, 250ms |
| \ | Acerto crítico | Sawtooth 220Hz + Sine 330Hz |
| \ | Erro | Sine 300Hz, 200ms |
| \ | Jogador atingido | Sawtooth 80Hz, 300ms |
| \ | Timer tick | Square 600Hz, 80ms |
| \ | Dano por tipo | Perfil por tipo (ver abaixo) |

### Perfis de sfxDamageType() por tipo de dano

| Tipo | Oscilador | Frequência | Duração | Sensação |
|------|-----------|------------|---------|----------|
| \ | Sawtooth | 180→80Hz | 350ms | Rugido de chamas |
| \ | Sine | 400→200Hz | 300ms | Vento gelado |
| \ | Square | 800→200Hz | 150ms | Estalo elétrico |
| \ | Sawtooth | 60→30Hz | 500ms | Trovão grave |
| \ | Triangle | 60→55Hz | 500ms | Pulso sombrio |
| \ | Sine | 600→900Hz | 400ms | Brilho ascendente |
| \ | Triangle | 150→100Hz | 400ms | Borbulhar ácido |
| \ | Sawtooth | 250→120Hz | 350ms | Corrosão |
| \ | Sine | 500→700Hz | 350ms | Ressonância mental |
| \ | Square | 300→150Hz | 250ms | Impacto mágico |
| \ | — | — | — | Usa \ genérico |

### Upgrade futuro: SFX com arquivos MP3

Para substituir os SFX procedurais por áudios gravados/gerados:

1. Crie MP3s curtos (100-500ms, mono, 64kbps) para cada tipo de dano
2. Coloque em \ com nomes como \, 3. Modifique \ em \ para carregar o MP3 em vez de usar oscilador

#### Prompts para Google MusicFX (SFX curtos)

> **Nota**: MusicFX gera mínimo 10s. Recorte para 0.3-0.5s com Audacity.

**sfx_fire.mp3**
**sfx_cold.mp3**
**sfx_lightning.mp3**
**sfx_thunder.mp3**
**sfx_necrotic.mp3**
**sfx_radiant.mp3**
**sfx_poison.mp3**
**sfx_psychic.mp3**
**sfx_force.mp3**
#### Pós-geração de SFX

1. Abra o arquivo no Audacity
2. Recorte para o trecho mais impactante (~300-500ms)
3. Aplique Fade In (50ms) e Fade Out (50ms) para evitar cliques
4. Exporte como MP3 Mono, 64kbps
5. Renomeie para o padrão 6. Coloque em 