import paho.mqtt.client as mqtt
import json, time, random, ssl
from datetime import datetime, timezone

DEVICE_ID = "stm32_mq2"

HOST = "9df9b7f54e0b41cdb8afd8fab379c0a3.s1.eu.hivemq.cloud"
PORT = 8883
USER = "arise"
PASS = "789456123Aa"

# ─────────────────────────────────────────────────────────────
#  Sensor state — each value drifts gradually via random walk.
#  alpha  = smoothing (0 = frozen, 1 = fully random each step)
#  step   = max change per tick
#  lo/hi  = hard clamp (physical plausible range)
# ─────────────────────────────────────────────────────────────
sensors = {
    #          value   alpha   step   lo     hi
    "temp":   [27.0,   0.15,   0.3,  20.0,  35.0],
    "hum":    [65.0,   0.12,   1.0,  40.0,  95.0],
    "co2":    [550.0,  0.10,  15.0, 380.0, 1200.0],
    "ch4":    [4.0,    0.08,   0.4,   0.5,  20.0],
    "pressure":[1012.0,0.06,   0.4, 990.0, 1025.0],
    "lux":    [400.0,  0.18,  20.0,  50.0, 1200.0],
}

def walk(state):
    """
    Exponential moving average random walk:
      new_value = old_value * (1 - alpha) + target * alpha
    where target = old_value + random step.
    This produces smooth, correlated, realistic-looking drift.
    """
    val, alpha, step, lo, hi = state
    target = val + random.uniform(-step, step)
    target = max(lo, min(hi, target))       # clamp target
    new_val = val * (1 - alpha) + target * alpha
    new_val = max(lo, min(hi, new_val))     # clamp result too
    state[0] = new_val
    return new_val


client = mqtt.Client()
client.username_pw_set(USER, PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.connect(HOST, PORT)
client.loop_start()

print("🚀 Simulator running (smooth random-walk) — publishing every 5s...\n")

while True:
    ts = datetime.now(timezone.utc).isoformat()

    payload = {
        "ts":       ts,
        "temp":     round(walk(sensors["temp"]),    2),
        "hum":      round(walk(sensors["hum"]),     2),
        "co2":      int(walk(sensors["co2"])),
        "ch4":      round(walk(sensors["ch4"]),     2),
        "pressure": round(walk(sensors["pressure"]),1),
        "lux":      int(walk(sensors["lux"])),
        "gas":      0,
        "soil":     0,
        "fan":      0,
        "piston":   0,
    }

    topic = f"sgh-aeris/gateway/{DEVICE_ID}/sensors"
    client.publish(topic, json.dumps(payload), qos=1)

    print(f"📡 [{ts[:19]}Z]  "
          f"T={payload['temp']:.1f}°C  "
          f"H={payload['hum']:.1f}%  "
          f"CO2={payload['co2']}ppm  "
          f"CH4={payload['ch4']:.1f}%  "
          f"P={payload['pressure']}hPa  "
          f"Lux={payload['lux']}")

    time.sleep(5)