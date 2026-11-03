extends Control

@onready var cash_label: Label = $UI/CashLabel
@onready var rate_label: Label = $UI/RateLabel
@onready var miner: Sprite2D = $Miner

var mining_time: float = 0.0
var is_mining: bool = true

func _ready() -> void:
	update_ui()
	# Simple placeholder color so you can see the miner even without texture
	if miner.texture == null:
		var img = Image.create(128, 192, false, Image.FORMAT_RGBA8)
		img.fill(Color(0.8, 0.6, 0.2))
		miner.texture = ImageTexture.create_from_image(img)

func _process(delta: float) -> void:
	var rate = GameState.get_bottlenecked_rate()
	if GameState.managers_hired.get("shafts", false) and GameState.managers_hired.get("elevator", false) and GameState.managers_hired.get("warehouse", false):
		GameState.cash += rate * delta
		GameState.idle_rate = rate

	# Simple mining animation (bob + slight swing) — easy to replace with AnimatedSprite2D later
	if is_mining and miner:
		mining_time += delta
		var bob = sin(mining_time * 4.0) * 4.0
		var swing = sin(mining_time * 3.0) * 0.05
		miner.position.y = 320 + bob
		miner.rotation = swing

	update_ui()

func update_ui() -> void:
	cash_label.text = "Cash: %s" % format_number(GameState.cash)
	rate_label.text = "Rate: %s/s" % format_number(GameState.get_bottlenecked_rate())

func format_number(n: float) -> String:
	if n < 1000:
		return "%.1f" % n
	var units = ["", "K", "M", "B", "T"]
	var i = 0
	while n >= 1000 and i < units.size() - 1:
		n /= 1000
		i += 1
	return "%.1f%s" % [n, units[i]]

func _on_upgrade_shaft_pressed() -> void:
	var shaft = GameState.shafts[0]
	var cost = 10.0 * pow(1.25, shaft.level)
	if GameState.cash >= cost:
		GameState.cash -= cost
		shaft.level += 1
		GameState.shafts[0] = shaft

func _on_upgrade_elev_pressed() -> void:
	var cost = 50.0 * pow(1.3, GameState.elevator_level)
	if GameState.cash >= cost:
		GameState.cash -= cost
		GameState.elevator_level += 1

func _on_upgrade_ware_pressed() -> void:
	var cost = 50.0 * pow(1.3, GameState.warehouse_level)
	if GameState.cash >= cost:
		GameState.cash -= cost
		GameState.warehouse_level += 1

func _on_menu_button_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
