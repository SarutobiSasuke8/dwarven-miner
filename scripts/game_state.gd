extends Node

# Core currencies and rates
var cash: float = 0.0
var idle_rate: float = 0.0  # cash per second when offline / automated
var last_save_time: int = 0

# Mine components
var shafts: Array = []
var elevator_level: int = 1
var warehouse_level: int = 1
var managers_hired: Dictionary = {"shafts": false, "elevator": false, "warehouse": false}

const SAVE_PATH = "user://dwarven_miner.save"

func _ready() -> void:
	initialize_mine()
	load_game()
	calculate_idle_earnings()

func initialize_mine() -> void:
	if shafts.is_empty():
		# Start with a few shafts (Coal, Iron, Gold...)
		shafts.append({"name": "Coal Vein", "level": 1, "base_rate": 1.0, "unlocked": true})
		shafts.append({"name": "Iron Deep", "level": 0, "base_rate": 5.0, "unlocked": false})
		shafts.append({"name": "Gold Hall", "level": 0, "base_rate": 25.0, "unlocked": false})
		shafts.append({"name": "Mithril Cavern", "level": 0, "base_rate": 120.0, "unlocked": false})

func get_shaft_rate(shaft: Dictionary) -> float:
	if not shaft.unlocked or shaft.level <= 0:
		return 0.0
	return shaft.base_rate * pow(1.15, shaft.level - 1)

func get_elevator_rate() -> float:
	return 10.0 * pow(1.12, elevator_level - 1)

func get_warehouse_rate() -> float:
	return 10.0 * pow(1.12, warehouse_level - 1)

func get_total_shaft_rate() -> float:
	var total := 0.0
	for shaft in shafts:
		total += get_shaft_rate(shaft)
	return total

func get_bottlenecked_rate() -> float:
	var shaft_rate = get_total_shaft_rate()
	var elev_rate = get_elevator_rate()
	var ware_rate = get_warehouse_rate()
	return min(shaft_rate, elev_rate, ware_rate)

func calculate_idle_earnings() -> void:
	var now = Time.get_unix_time_from_system()
	if last_save_time > 0:
		var offline_seconds = now - last_save_time
		var earned = idle_rate * offline_seconds
		cash += earned
		print("Idle earnings: ", earned)
	last_save_time = now

func save_game() -> void:
	var data = {
		"cash": cash,
		"elevator_level": elevator_level,
		"warehouse_level": warehouse_level,
		"shafts": shafts,
		"managers_hired": managers_hired,
		"last_save_time": Time.get_unix_time_from_system()
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_var(data)
		file.close()

func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var data = file.get_var()
		file.close()
		cash = data.get("cash", 0.0)
		elevator_level = data.get("elevator_level", 1)
		warehouse_level = data.get("warehouse_level", 1)
		shafts = data.get("shafts", shafts)
		managers_hired = data.get("managers_hired", managers_hired)
		last_save_time = data.get("last_save_time", 0)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		save_game()
