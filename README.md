# Dwarven Miner

Idle Miner Tycoon-style game with a dwarven theme. Built in Godot 4.

See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) for full status and next steps.

## Usable Art Assets
The generated sprites are usable in Godot but are currently JPGs with checkerboard backgrounds.
For best results (especially animation):
1. Open the images in an editor (or use remove.bg / Photoshop / GIMP)
2. Remove the checkerboard to make true transparent PNGs
3. Save as PNG and drop into `assets/`
4. Assign to the Sprite2D / TextureRect nodes

Recommended assets to prepare:
- `miner_idle.png` (standing pose)
- `miner_swing.png` (pickaxe raised — for 2-frame animation)
- `cart.png` (mine cart / elevator)
- `mine_bg.png` (background)
- `ui_panel.png` (for buttons / panels)

These are simple enough for AnimatedSprite2D (2 frames) or code-driven tweens (bob, swing, move).

## Current Features
- Main Menu
- Mine scene with Sprite2D miner ready for animation
- Simple mining bob / swing scaffolding in code
- Elevator/cart movement animation
- Core loop (shafts → elevator → warehouse)
- Managers, idle cash, upgrades

## How to run
1. Open in Godot 4.x
2. Add transparent PNG assets to `assets/` and assign them
3. Play from Main Menu

## Next
- Wire real AnimatedSprite2D frames
- More shafts visuals
- Super Managers, etc.
