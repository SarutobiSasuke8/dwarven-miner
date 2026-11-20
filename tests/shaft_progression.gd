# godot --headless --path . --script res://tests/shaft_progression.gd
extends SceneTree

var failed := false
var profile_dir: String

func _initialize() -> void:
	# Exercise the real save/load path in a fresh, private player profile.
	ProjectSettings.set_setting("application/config/use_custom_user_dir", true)
	ProjectSettings.set_setting("application/config/custom_user_dir_name",
		"dwarven-miner-test-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()])
	profile_dir = OS.get_user_data_dir()
	if DirAccess.make_dir_absolute(profile_dir) != OK:
		push_error("Could not create the temporary test profile")
		quit(1)
		return
	run.call_deferred()

func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		push_error(message)

func click(button: Button) -> void:
	for pressed in [true, false]:
		var event := InputEventMouseButton.new()
		event.button_index = MOUSE_BUTTON_LEFT
		event.position = button.get_global_rect().get_center()
		event.global_position = event.position
		event.pressed = pressed
		root.push_input(event, true)

func run() -> void:
	var game = root.get_node("GameState")
	create_timer(10.0).timeout.connect(func():
		check(false, "Timed out waiting for mine progression")
		finish())
	change_scene_to_file(ProjectSettings.get_setting("application/run/main_scene"))
	while not current_scene:
		await process_frame
	await process_frame
	click(current_scene.get_node("VBox/PlayButton"))
	while not current_scene or current_scene.scene_file_path != "res://scenes/mine.tscn":
		await process_frame
	await process_frame
	var panel := current_scene.get_node("ShaftsLayer")
	var buttons: Array[Button] = panel.buttons
	check(buttons.size() == 4, "The mine should offer all four veins")
	check(buttons[0].disabled and buttons[1].disabled, "Empty purse and locked vein should disable upgrades")
	check(not game.try_upgrade_shaft(0) and game.shafts[0].level == 1, "An unaffordable purchase must do nothing")
	var dig: Button = current_scene.get_node("UI/Buttons/MineButton")

	for index in buttons.size():
		if index > 0:
			check(game.shafts[index].unlocked and game.shafts[index].level == 0, "A new vein should be available at level 0")
			check(game.get_shaft_rate(game.shafts[index]) == 0.0, "Opening cost must be paid before production")
		var target := 5 if index < buttons.size() - 1 else 1
		while game.shafts[index].level < target:
			var cost: float = game.get_shaft_upgrade_cost(index)
			while game.cash < cost:
				var prior_cash: float = game.cash
				click(dig)
				if game.cash <= prior_cash:
					check(false, "The Mine button must earn cash")
					finish()
					return
			await process_frame
			await process_frame
			if index + 1 < buttons.size():
				check(buttons[index + 1].disabled, "The next vein unlocked too soon")
				check(not game.try_upgrade_shaft(index + 1), "A locked vein must refuse purchases")
			var before: float = game.cash
			var level: int = game.shafts[index].level
			check(not buttons[index].disabled, "An affordable vein should accept a purchase")
			click(buttons[index])
			if game.shafts[index].level != level + 1:
				check(false, "Shaft button failed to buy a level")
				finish()
				return
			check(is_equal_approx(game.cash, before - cost), "A purchase must charge exactly once")

	check(game.get_total_shaft_rate() > 120.0, "Mithril must contribute to raw production")
	check(is_equal_approx(game.get_bottlenecked_rate(), 10.0), "Transport capacity should still limit delivery")
	game.save_game()
	var purchased: Array = game.shafts.duplicate(true)
	game.shafts.clear()
	game.load_game()
	check(game.shafts == purchased, "A reload should restore all four veins")

	# Saves from the one-button mine could reach Coal level 5 with Iron still locked.
	game.shafts.clear()
	game.initialize_mine()
	game.shafts[0].level = 5
	game.save_game()
	game.load_game()
	check(game.shafts[1].unlocked and game.shafts[1].level == 0, "Restore the earned opportunity to open Iron")
	check(not game.shafts[2].unlocked, "Existing saves should retain the remaining gates")
	click(current_scene.get_node("UI/MenuButton"))
	while not current_scene or current_scene.scene_file_path != "res://scenes/main_menu.tscn":
		await process_frame
	await process_frame
	click(current_scene.get_node("VBox/PlayButton"))
	while not current_scene or current_scene.scene_file_path != "res://scenes/mine.tscn":
		await process_frame
	var iron: Button = current_scene.get_node("ShaftsLayer").buttons[1]
	check("Open" in iron.text, "The returning player should see how to start Iron")
	finish()

func finish() -> void:
	DirAccess.remove_absolute(profile_dir.path_join("dwarven_miner.save"))
	DirAccess.remove_absolute(profile_dir)
	if not failed:
		print("PASS: menu to Mithril, purchase guards, transport cap, save round-trip and existing saves")
	quit(1 if failed else 0)
