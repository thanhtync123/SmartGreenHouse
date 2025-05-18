#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h> // Thêm thư viện JSON

#define DHTPIN 14     // Chân kết nối với DHT
#define DHTTYPE DHT22 // Sử dụng cảm biến DHT22

const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASSWORD = "";
const char *MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char *MQTT_TOPIC = "dht22";
const char *MQTT_ID = "hehehehhe";
const char *MQTT_TOPIC_LIGHT = "light_sensor";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
// Cảm biến ánh sáng
#define LIGHT_SENSOR_PIN 32

void WIFIConnect()
{
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void MQTT_Reconnect()
{
  while (!client.connected())
  {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(MQTT_ID))
    {
      Serial.println("Connected to MQTT!");
      client.subscribe(MQTT_TOPIC);
    }
    else
    {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

unsigned long lastMillis10s = 0;

bool millis10s()
{
  if (millis() - lastMillis10s >= 10000)
  {
    lastMillis10s = millis();
    return true;
  }
  return false;
}

void setup()
{
  Serial.begin(115200);
  dht.begin();
  WIFIConnect();
  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop()
{
  if (!client.connected())
  {
    MQTT_Reconnect();
  }
  client.loop();

  if (millis10s())
  {
    // Đọc nhiệt độ, độ ẩm, ánh sáng và gửi MQTT
    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t))
    {
      Serial.println("Không thể đọc dữ liệu từ cảm biến DHT!");
      return;
    }

    Serial.print("Nhiet do: ");
    Serial.print(t);
    Serial.println("°C");
    Serial.print("Do am: ");
    Serial.print(h);
    Serial.println("%");
    StaticJsonDocument<200> doc;
    doc["temperature"] = t;
    doc["humidity"] = h;

    char jsonBuffer[200];
    serializeJson(doc, jsonBuffer);
    client.publish(MQTT_TOPIC, jsonBuffer);

    // Xử lý cảm biến ánh sáng
    int lux = 1 + (analogRead(LIGHT_SENSOR_PIN) / 4095.0) * (6000 - 1);

    if (lux)
    {
      Serial.print("Gia tri anh sang: ");
      Serial.println(lux);
    }

    int brightness_percent;
    if (lux >= 4000)
      brightness_percent = 0;
    else if (lux >= 1500)
      brightness_percent = 25;
    else if (lux >= 200)
      brightness_percent = 63;
    else
      brightness_percent = 100;

    StaticJsonDocument<128> lightDoc;
    lightDoc["light"] = lux;
    lightDoc["brightness"] = brightness_percent;

    char lightBuffer[128];
    serializeJson(lightDoc, lightBuffer);
    client.publish(MQTT_TOPIC_LIGHT, lightBuffer);
  }
}
