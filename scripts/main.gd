extends Control

@onready var cash_label: Label = $VBox/CashLabel
@onready var rate_label: Label = $VBox/RateLabel
@onready var elev_button: Button = $VBox/ElevatorButton
@onready var ware_button: Button = $VBox/WarehouseButton
@onready var manager_button: Button = $VBox/ManagerButton

var tap_boost: float = 0.0
var tap_timer: float = 0.0

func _ready() -> void:
	update_ui()
	# Auto-save every 30 seconds
	var timer = Timer.new()
	timer.wait_time = 30.0
	timer.timeout.connect(GameState.save_game)
	add_child(timer)
	timer.start()

func _process(delta: float) -> void:
	var rate = GameState.get_bottlenecked_rate()
	if GameState.managers_hired.shafts and GameState.managers_hired.elevator and GameState.managers_hired.warehouse:
		GameState.idle_rate = rate
		GameState.cash += rate * delta
	elif tap_timer > 0:
		GameState.cash += rate * delta * 2.0  # temporary tap boost
		tap_timer -= delta

	update_ui()

func update_ui() -> void:
	cash_label.text = "Cash: %s" % format_number(GameState.cash)
	rate_label.text = "Rate: %s/s (Bottlenecked)" % format_number(GameState.get_bottlenecked_rate())

	elev_button.text = "Elevator Lv %d  (%.1f/s)" % [GameState.elevator_level, GameState.get_elevator_rate()]
	ware_button.text = "Warehouse Lv %d  (%.1f/s)" % [GameState.warehouse_level, GameState.get_warehouse_rate()]

func format_number(n: float) -> String:
	if n < 1000:
		return "%.1f" % n
	var units = ["", "K", "M", "B", "T", "Qa"]
	var i = 0
	while n >= 1000 and i < units.size() - 1:
		n /= 1000
		i += 1
	return "%.1f%s" % [n, units[i]]

func _on_mine_area_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		tap_timer = 5.0  # 5 second boost from tapping

func _on_elevator_button_pressed() -> void:
	var cost = 50.0 * pow(1.3, GameState.elevator_level)
	if GameState.cash >= cost:
		GameState.cash -= cost
		GameState.elevator_level += 1

func _on_warehouse_button_pressed() -> void:
	var cost = 50.0 * pow(1.3, GameState.warehouse_level)
	if GameState.cash >= cost:
		GameState.cash -= cost
		GameState.warehouse_level += 1

func _on_manager_button_pressed() -> void:
	if not GameState.managers_hired.shafts and GameState.shafts[0].level >= 5:
		GameState.managers_hired.shafts = true
		manager_button.text = "Hire Elevator Manager"
	elif not GameState.managers_hired.elevator:
		GameState.managers_hired.elevator = true
		manager_button.text = "Hire Warehouse Manager"
	elif not GameState.managers_hired.warehouse:
		GameState.managers_hired.warehouse = true
		manager_button.text = "All Automated!"
		manager_button.disabled = true
