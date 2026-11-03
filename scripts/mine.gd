extends Control

@onready var cash_label: Label = $UI/CashLabel
@onready var rate_label: Label = $UI/RateLabel
@onready var miner: Sprite2D = $Miner
@onready var shaft_button: Button = $UI/Buttons/UpgradeShaft
@onready var elev_button: Button = $UI/Buttons/UpgradeElev
@onready var ware_button: Button = $UI/Buttons/UpgradeWare
@onready var manager_button: Button = $UI/HireManager

# Placeholder manager prices, in hire order. Balance after a playtest.
const MANAGER_ORDER = ["shafts", "elevator", "warehouse"]
const MANAGER_COSTS = {"shafts": 100.0, "elevator": 250.0, "warehouse": 600.0}
const MANAGER_NAMES = {"shafts": "Shaft", "elevator": "Elevator", "warehouse": "Warehouse"}

var mining_time: float = 0.0
var is_mining: bool = true
var tap_timer: float = 0.0

func _ready() -> void:
	update_ui()
	# Auto-save every 30 seconds
	var timer = Timer.new()
	timer.wait_time = 30.0
	timer.timeout.connect(GameState.save_game)
	add_child(timer)
	timer.start()
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
	elif tap_timer > 0:
		GameState.cash += rate * delta * 2.0  # temporary tap boost
		tap_timer -= delta

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
	shaft_button.text = "Shaft Lv %d (%s)" % [GameState.shafts[0].level, format_number(10.0 * pow(1.25, GameState.shafts[0].level))]
	elev_button.text = "Elevator Lv %d (%s)" % [GameState.elevator_level, format_number(50.0 * pow(1.3, GameState.elevator_level))]
	ware_button.text = "Warehouse Lv %d (%s)" % [GameState.warehouse_level, format_number(50.0 * pow(1.3, GameState.warehouse_level))]
	var next = next_manager()
	if next == "":
		manager_button.text = "All Automated!"
		manager_button.disabled = true
	elif next == "shafts" and GameState.shafts[0].level < 5:
		manager_button.text = "Hire Shaft Manager (needs Shaft Lv 5)"
	else:
		manager_button.text = "Hire %s Manager (%s)" % [MANAGER_NAMES[next], format_number(MANAGER_COSTS[next])]

func next_manager() -> String:
	for key in MANAGER_ORDER:
		if not GameState.managers_hired.get(key, false):
			return key
	return ""

func format_number(n: float) -> String:
	if n < 1000:
		return "%.1f" % n
	var units = ["", "K", "M", "B", "T"]
	var i = 0
	while n >= 1000 and i < units.size() - 1:
		n /= 1000
		i += 1
	return "%.1f%s" % [n, units[i]]

func _on_mine_button_pressed() -> void:
	GameState.cash += GameState.get_bottlenecked_rate()
	tap_timer = 5.0  # 5 second boost from tapping

func _on_hire_manager_pressed() -> void:
	var next = next_manager()
	if next == "" or (next == "shafts" and GameState.shafts[0].level < 5):
		return
	if GameState.cash >= MANAGER_COSTS[next]:
		GameState.cash -= MANAGER_COSTS[next]
		GameState.managers_hired[next] = true

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
