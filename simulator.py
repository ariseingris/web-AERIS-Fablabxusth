import paho.mqtt.client as mqtt
import json, time, random, ssl

DEVICE_ID = "stm32_mq2"
HOST = "9df9b7f54e0b41cdb8afd8fab379c0a3.s1.eu.hivemq.cloud"
PORT = 8883
USER = "arise"
PASS = "789456123Aa"

client = mqtt.Client()
client.username_pw_set(USER, PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.connect(HOST, PORT)
client.loop_start()

print("Simulator running — publishing every 5s")
while True:
    raw = random.randint(300, 3500)
    pct = int(raw / 4095 * 100)
    aq  = "Good" if raw < 800 else "Moderate" if raw < 2000 else "Poor" if raw < 3200 else "Danger"

    client.publish(f"devices/{DEVICE_ID}/sensors/gas_raw",     json.dumps({"value": raw, "unit": "ADC"}))
    client.publish(f"devices/{DEVICE_ID}/sensors/gas_pct",     json.dumps({"value": pct, "unit": "%"}))
    client.publish(f"devices/{DEVICE_ID}/sensors/air_quality", json.dumps({"value": aq,  "unit": ""}))
    client.publish(f"devices/{DEVICE_ID}/status",              json.dumps({"power": True}))

    print(f"Published: raw={raw} ppm  pct={pct}%  air={aq}")
    time.sleep(5)