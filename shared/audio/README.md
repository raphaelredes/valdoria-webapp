# Trilha Sonora + SFX — Lendas de Valdoria

Audio completo do jogo: musica ambiente (14 tracks x 4 variantes) + SFX combate (13 efeitos x 2 variantes).
`audio-manager.js` v1.2 gerencia tudo — basta colocar os arquivos aqui.

## Formato obrigatorio

### Musica Ambiente
- **Codec**: MP3 (maxima compatibilidade Telegram WebView Android/iOS)
- **Bitrate**: 128kbps (~250-500KB por loop)
- **Duracao**: 30-60s para loops, 10-15s para fanfarras
- **Loop**: Crossfade automatico pelo audio-manager (1.2s)
- **Vocals**: NENHUM — apenas instrumental
- **Volume**: Normalizar para -14 LUFS
- **Variantes**: 4 por track (ex: tavern_ambient.mp3, _2.mp3, _3.mp3, _4.mp3)

### SFX (Efeitos Sonoros)
- **Codec**: MP3 (Suno) ou WAV (sintetizado)
- **Bitrate**: MP3 64-128kbps, WAV 16-bit 22050Hz mono
- **Duracao**: 300-800ms (one-shot)
- **Variantes**: 2 por efeito (ex: sfx_hit.mp3, sfx_hit_02.mp3)
- **Volume**: Tocados a 1.5x do volume de musica via playSFX()

## Catalogo Completo

### Musica (56 MP3s)

| Track | Arquivos | Bioma/Situacao | Loop |
|-------|----------|----------------|------|
| tavern | tavern_ambient[_2/_3/_4].mp3 | Taverna | Sim |
| city | city_day[_2/_3/_4].mp3 | Cidade | Sim |
| forest | forest_explore[_2/_3/_4].mp3 | Floresta | Sim |
| combat | combat_tense[_2/_3/_4].mp3 | Combate normal | Sim |
| desert | desert_wind[_2/_3/_4].mp3 | Deserto | Sim |
| dungeon | dungeon_dark[_2/_3/_4].mp3 | Dungeon/Caverna | Sim |
| swamp | swamp_mist[_2/_3/_4].mp3 | Pantano | Sim |
| mountain | mountain_wind[_2/_3/_4].mp3 | Montanha | Sim |
| snow | snow_silence[_2/_3/_4].mp3 | Neve/Tundra | Sim |
| victory | victory_fanfare[_2/_3/_4].mp3 | Vitoria combate | Nao |
| defeat | defeat_somber[_2/_3/_4].mp3 | Derrota combate | Nao |
| levelup | levelup_theme[_2/_3/_4].mp3 | Level up | Nao |
| prologue | prologue_theme[_2/_3/_4].mp3 | Prologo | Sim |
| boss | boss_battle[_2/_3/_4].mp3 | Boss (legendary) | Sim |

### SFX Combate (26 arquivos)

| Efeito | Arquivos | Tipo | Fonte |
|--------|----------|------|-------|
| sfx_hit | sfx_hit.mp3, sfx_hit_02.mp3 | Acerto normal | Suno Sounds |
| sfx_crit | sfx_crit.mp3, sfx_crit_2.mp3 | Acerto critico | Suno Sounds |
| sfx_miss | sfx_miss.mp3, sfx_miss_2.mp3 | Erro/esquiva | Suno Sounds |
| sfx_fire | sfx_fire.mp3, sfx_fire_2.mp3 | Dano fogo | Suno Sounds |
| sfx_cold | sfx_cold.mp3, sfx_cold_2.mp3 | Dano gelo | Suno Sounds |
| sfx_lightning | sfx_lightning.mp3, sfx_lightning_2.mp3 | Dano relampago | Suno Sounds |
| sfx_heal | sfx_heal.mp3, sfx_heal_2.mp3 | Cura (HP sobe) | Suno Sounds |
| sfx_thunder | sfx_thunder.wav, sfx_thunder_2.wav | Dano trovao | Sintetizado Python |
| sfx_poison | sfx_poison.wav, sfx_poison_2.wav | Dano veneno/acido | Sintetizado Python |
| sfx_radiant | sfx_radiant.wav, sfx_radiant_2.wav | Dano radiante | Sintetizado Python |
| sfx_necrotic | sfx_necrotic.wav, sfx_necrotic_2.wav | Dano necrotico | Sintetizado Python |
| sfx_psychic | sfx_psychic.wav, sfx_psychic_2.wav | Dano psiquico | Sintetizado Python |
| sfx_enemy_death | sfx_enemy_death.wav, sfx_enemy_death_2.wav | Morte inimigo | Sintetizado Python |

## Geracao de Audio

### Musica — Suno Pro (recomendado)
1. Acesse https://suno.com no modo "Create Song"
2. Use "Instrumental" (sem vocals), duracao ~45s
3. Gere 4 variantes por prompt (variar seeds)
4. Baixe MP3, renomeie para o padrao acima

### SFX — Suno Sounds
1. No Suno, selecione modo "Sounds" (nao "Create Song")
2. Escolha "One Shot" para efeitos curtos
3. Descreva o som de forma direta e concreta
4. Gere 2 variantes por efeito
5. Recorte para 300-500ms se necessario

### SFX — Sintese Python (fallback)
Para sons que o Suno nao consegue gerar bem:
```bash
.venv/Scripts/python.exe c:/tmp/generate_sfx.py
```
Gera WAV 22050Hz mono 16-bit usando stdlib (wave, math, random).

## Integracao

### Registrar novo track
1. Adicione arquivos nesta pasta
2. Adicione entrada em `audio-manager.js` no objeto `TRACKS`
3. Se nao faz loop, adicione ao array `NO_LOOP_TRACKS`
4. Commit e push para GitHub Pages

### Usar no codigo
```javascript
// Musica (loop com crossfade)
ValdoriaAudio.play('tavern');
ValdoriaAudio.playBiome('forest');

// SFX (one-shot)
ValdoriaAudio.playSFX('sfx_hit');
```

### Deploy
```bash
cd valdoria-webapp
git add shared/audio/*
git commit -m "feat: add audio files"
git push origin main
```

## Pendente

### SFX P1 — Interacao/Inventario
- sfx_coins, sfx_equip, sfx_chest_open, sfx_door, sfx_potion

### SFX P2 — UI/Feedback
- sfx_success, sfx_error, sfx_quest_complete, sfx_scroll

### SFX P3 — Exploracao
- sfx_discover, sfx_trap, sfx_campfire

### Musicas Extras
- inn_rest, shop_browse, mystery_event, creation_theme, lore_reading (4 variantes cada)
