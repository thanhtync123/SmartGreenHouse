#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h> // Thêm thư viện JSON
#include <ESP32Servo.h>

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
// Module chức năng của cảm biến ánh sáng
#define LIGHT_SENSOR_PIN 32
#define DENCHIEUSANG_PIN 19
#define MAICHE_PIN 17
Servo servoMaiChe;

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
  if (millis() - lastMillis10s >= 3000)
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

  // Khai báo nháp máy bơm nước, có gì thì đổi số 5 thành tên
  pinMode(5, OUTPUT); 
  // PinMode của cảm biến ánh sáng
  pinMode(DENCHIEUSANG_PIN, OUTPUT);
  servoMaiChe.attach(MAICHE_PIN);
  servoMaiChe.write(0);
}

void loop()
{
  if (!client.connected())
  {
    MQTT_Reconnect();
  }
  client.loop();

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



 // Xử lý cảm biến ánh sáng-----------------------------------
int lux = 1 + (analogRead(LIGHT_SENSOR_PIN) / 4095.0) * (6000 - 1);
Serial.print("Gia tri anh sang: ");
Serial.println(lux);

int brightness_percent = 0;

// Xử lý mức sáng
if (lux >= 4000) {
  brightness_percent = 0; // Trời nắng
  digitalWrite(DENCHIEUSANG_PIN, LOW); // Tắt đèn
} else if (lux >= 1500) {
  brightness_percent = 25; // Nhiều mây
  digitalWrite(DENCHIEUSANG_PIN, HIGH);
} else if (lux >= 200) {
  brightness_percent = 63; // Trời âm u / mưa
  digitalWrite(DENCHIEUSANG_PIN, HIGH);
} else {
  brightness_percent = 100; // Rất tối / ban đêm
  digitalWrite(DENCHIEUSANG_PIN, HIGH);
}

// Xử lý mái che
const char* roofStatus;
if (lux >= 3000) {
  servoMaiChe.write(90); // Đóng rèm
  roofStatus = "close";
} else {
  servoMaiChe.write(0); // Mở rèm
  roofStatus = "open";
}

// Parse dữ liệu ánh sáng JSON 
StaticJsonDocument<128> lightDoc;
lightDoc["light"] = lux;
lightDoc["brightness"] = brightness_percent;
lightDoc["roof"] = roofStatus;

char lightBuffer[128];
serializeJson(lightDoc, lightBuffer);


// Gửi dữ liệu lên MQTT
  if (millis10s())
  {
    client.publish(MQTT_TOPIC_LIGHT, lightBuffer);
    client.publish(MQTT_TOPIC, jsonBuffer);
  }


  
}
