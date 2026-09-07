import paho.mqtt.client as mqtt
import json, time, random, ssl
from datetime import datetime, timezone

DEVICE_ID = "aeris_pod"

HOST = "9df9b7f54e0b41cdb8afd8fab379c0a3.s1.eu.hivemq.cloud"
PORT = 8883
USER = "arise"
PASS = "789456123Aa"

SENSORS_TOPIC = f"sgh-aeris/gateway/{DEVICE_ID}/sensors"
CONTROL_TOPIC = f"sgh-aeris/gateway/{DEVICE_ID}/control"

# Toggled remotely by the "Raw / Normalized" button in the dashboard
display_mode = "normalized"   # "normalized" | "raw" | "both"

# ─────────────────────────────────────────────────────────────
#  Sensor state — each value drifts gradually via random walk.
#  alpha  = smoothing (0 = frozen, 1 = fully random each step)
#  step   = max change per tick
#  lo/hi  = hard clamp (physical plausible range)
#  adc_lo/adc_hi = simulated raw 12-bit ADC counts at lo/hi —
#                  the un-converted reading before calibration.
# ─────────────────────────────────────────────────────────────
sensors = {
    #          value   alpha   step   lo     hi      adc_lo  adc_hi
    "temp":    [27.0,  0.15,   0.3,  20.0,   35.0,    620,   2480],
    "hum":     [65.0,  0.12,   1.0,  40.0,   95.0,    410,   3690],
    "co2":     [550.0, 0.10,  15.0, 380.0, 1200.0,    300,   3200],
    "ch4":     [4.0,   0.08,   0.4,   0.5,   20.0,     80,   3500],
    "pressure":[1012.0,0.06,   0.4, 990.0, 1025.0,    500,   3700],
    "lux":     [400.0, 0.18,  20.0,  50.0, 1200.0,     50,   4000],
}

def walk(state):
    val, alpha, step, lo, hi, *_ = state
    target = val + random.uniform(-step, step)
    target = max(lo, min(hi, target))
    new_val = val * (1 - alpha) + target * alpha
    new_val = max(lo, min(hi, new_val))
    state[0] = new_val
    return new_val

def to_raw(value, state):
    """Map a normalized physical value back to a simulated 12-bit ADC count."""
    _, _, _, lo, hi, adc_lo, adc_hi = state
    ratio = (value - lo) / (hi - lo) if hi != lo else 0
    raw = adc_lo + ratio * (adc_hi - adc_lo)
    return int(round(raw + random.uniform(-3, 3)))  # small ADC noise

def on_control_message(client, userdata, msg):
    global display_mode
    cmd = msg.payload.decode(errors="ignore").strip().upper()
    if cmd == "DISPLAY_RAW":
        display_mode = "raw"
        print("🔀  Dashboard button → hiển thị RAW")
    elif cmd == "DISPLAY_NORMALIZED":
        display_mode = "normalized"
        print("🔀  Dashboard button → hiển thị NORMALIZED")
    elif cmd == "DISPLAY_BOTH":
        display_mode = "both"
        print("🔀  Dashboard button → hiển thị RAW + NORMALIZED")

client = mqtt.Client()
client.username_pw_set(USER, PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.on_message = on_control_message
client.connect(HOST, PORT)
client.subscribe(CONTROL_TOPIC, qos=1)
client.loop_start()

print("🚀 Simulator running (smooth random-walk) — publishing every 5s...")
print(f"👂 Listening for display-mode commands on {CONTROL_TOPIC}\n")

while True:
    ts = datetime.now(timezone.utc).isoformat()

    normalized = {
        "temp":     round(walk(sensors["temp"]),    2),
        "hum":      round(walk(sensors["hum"]),     2),
        "co2":      int(walk(sensors["co2"])),
        "ch4":      round(walk(sensors["ch4"]),     2),
        "pressure": round(walk(sensors["pressure"]),1),
        "lux":      int(walk(sensors["lux"])),
    }
    raw = {key: to_raw(val, sensors[key]) for key, val in normalized.items()}

    payload = {
        "ts": ts,
        **normalized,   # giữ nguyên field phẳng để mqttBridge.js cũ vẫn đọc được
        "raw": raw,     # mới — dữ liệu ADC thô cho view "Raw"
        "gas": 0, "soil": 0, "fan": 0, "piston": 0,
    }

    client.publish(SENSORS_TOPIC, json.dumps(payload), qos=1)

    if display_mode in ("normalized", "both"):
        print(f"📡 [{ts[:19]}Z] NORMALIZED  "
              f"T={normalized['temp']:.1f}°C  H={normalized['hum']:.1f}%  "
              f"CO2={normalized['co2']}ppm  CH4={normalized['ch4']:.1f}%  "
              f"P={normalized['pressure']}hPa  Lux={normalized['lux']}")

    if display_mode in ("raw", "both"):
        print(f"🔧 [{ts[:19]}Z] RAW ADC     "
              f"T={raw['temp']}  H={raw['hum']}  CO2={raw['co2']}  "
              f"CH4={raw['ch4']}  P={raw['pressure']}  Lux={raw['lux']}")

    time.sleep(5)