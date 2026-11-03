# Dwarven Miner Idle Game - Development Roadmap

Classic Idle Miner Tycoon loop with dwarven theme, built in Godot 4.

## Current Status (as of 2026-11-03)
- Core game state: cash, idle rate, shafts (4 veins), elevator, warehouse, managers
- Bottlenecked production rate (min of shaft total, elev, warehouse)
- Upgrade costs with exponential scaling
- Idle earnings calculation and save/load
- Basic UI for upgrades and managers
- Miner sprite with bob/swing animation
- Placeholder textures if no assets loaded
- Main menu and mine scene

## Completed This Session
- [x] Basic elevator/cart movement animation (oscillating vertical + slight horizontal, speed scales with elevator rate)

## Next Priority Items
- [ ] Wire real AnimatedSprite2D frames for miner (replace bob/swing with 2-frame idle/swing)
- [ ] More shafts visuals (populate ShaftsLayer with visual ore veins or ColorRects)
- [ ] Super Managers / prestige system (gems, permanent upgrades)
- [ ] Multiple shaft upgrade buttons that unlock properly in UI
- [ ] Sound effects and better art pipeline (transparent PNGs)
- [ ] Offline progress polish and notifications
- [ ] Balance pass on costs and rates after playtesting

## Longer Term
- Prestige / Ancestral Tree style permanent upgrades
- Multiple regions / contracts
- Mobile export and ad integration (rewarded only)
- Online leaderboards or friends

Progress is tracked by checking items off and committing updates to main.
