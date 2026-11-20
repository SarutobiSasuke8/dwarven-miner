extends VBoxContainer

var buttons: Array[Button] = []

func _ready() -> void:
	for index in GameState.shafts.size():
		var button := Button.new()
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.custom_minimum_size.y = 40.0
		button.add_theme_color_override("font_disabled_color", Color(0.68, 0.63, 0.57))
		button.pressed.connect(_on_upgrade_pressed.bind(index))
		add_child(button)
		buttons.append(button)
	refresh_labels()

func _process(_delta: float) -> void:
	# Mining changes the balance between purchases.
	refresh_affordability()

func refresh_affordability() -> void:
	for index in buttons.size():
		var affordable := GameState.cash >= GameState.get_shaft_upgrade_cost(index)
		buttons[index].disabled = not GameState.shafts[index].unlocked or not affordable

func refresh_labels() -> void:
	for index in buttons.size():
		var shaft: Dictionary = GameState.shafts[index]
		var caption: String
		if not shaft.unlocked:
			var previous: Dictionary = GameState.shafts[index - 1]
			caption = "%s   ·   Requires %s level %d" % [
				shaft.name, previous.name, GameState.SHAFT_UNLOCK_LEVEL]
		elif shaft.level == 0:
			caption = "%s   ·   Open for %.1f cash" % [shaft.name, GameState.get_shaft_upgrade_cost(index)]
		else:
			caption = "%s   Lv %d (%.1f/s)   ·   Upgrade for %.1f cash" % [
				shaft.name, shaft.level, GameState.get_shaft_rate(shaft), GameState.get_shaft_upgrade_cost(index)]
		buttons[index].text = caption
	refresh_affordability()

func _on_upgrade_pressed(index: int) -> void:
	if GameState.try_upgrade_shaft(index):
		refresh_labels()
