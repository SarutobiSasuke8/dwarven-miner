# Dwarven Miner

Idle Miner Tycoon-style game with a dwarven theme. Built in Godot 4.

Classic loop: **Mine Shafts** → **Elevator** → **Warehouse** (with bottlenecks).

## Features in this slice
- Main Menu scene
- Visual mine layout scaffolding (TextureRects ready for art)
- Core pipeline (shafts / elevator / warehouse)
- Managers + automation
- Idle cash
- Upgrades
- Generated art assets ready to drop into `assets/`:
  - `miner.png` (dwarf character)
  - `mine_shafts_bg.png` (underground levels)
  - `elevator.png`
  - `warehouse.png` (surface forge)
  - `ui_button.png`

## How to run
1. Clone and open in **Godot 4.x**
2. Place the generated art files into the `assets/` folder (create it if needed)
3. In the Godot editor, reimport or drag the textures onto the TextureRect nodes in `scenes/mine.tscn`
4. Press F5 (starts at Main Menu)

## Art assets generated
The following were created and should be added to `res://assets/`:
- Miner sprite (side view, pickaxe)
- Mine shaft background (multi-level stone + glowing ore)
- Elevator cart with dwarf
- Surface warehouse / forge building
- Wooden UI button style

## Roadmap
- [x] Core loop
- [x] Menus
- [x] Art asset generation + scaffolding
- [ ] Full visual integration + animations
- [ ] Super Managers
- [ ] Continents / Prestige / Research
- [ ] Suno audio
- [ ] Polish for portals / mobile

Built for browser HTML5 export + future native mobile.
