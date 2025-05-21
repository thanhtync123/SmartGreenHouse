#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 40, 4);
#define DHTPIN 14
#define DHTTYPE DHT22

const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASSWORD = "";
const char *MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char *MQTT_TOPIC = "dht22";
const char *MQTT_TOPIC_LIGHT = "light_sensor";
const char *MQTT_TOPIC_LIGHT_MODULE_STATE = "light_module_state";
const char *MQTT_TOPIC_LIGHT_MODULE_CONTROL = "light_module_control";
const char *MQTT_TOPIC_SOILSENSOR = "soil_sensor_pt";
const char *MQTT_TOPIC_ISWATERING = "isWatering_pt";

bool isControlled = false;
bool isWatering = false;
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
Servo servoMaiChe;

#define LIGHT_SENSOR_PIN 32
#define DENCHIEUSANG_PIN 19
#define MAICHE_PIN 17
#define SOIL_SENSOR_PIN 33
#define MOTOR_PIN 5

unsigned long lastMillis10s = 0;

// Biến lưu trạng thái cũ để phát hiện thay đổi
int lastBulb_state = -1;
int lastRoof_state = -1;
String mode_L = "auto";
int bulb_state = -1;
int roof_state = -1;
int last_bulb_state = -1;
int last_roof_state = -1;
void sendLightModuleStateIfChanged()
{
  if (last_bulb_state != bulb_state || last_roof_state != roof_state)
  {
    last_bulb_state = bulb_state;
    last_roof_state = roof_state;
    DynamicJsonDocument doc(128);
    doc["bulb_state"] = bulb_state;
    doc["roof_state"] = roof_state;
    char buffer[128];
    serializeJson(doc, buffer);
    client.publish(MQTT_TOPIC_LIGHT_MODULE_STATE, buffer);
  }
}
void WIFIConnect()
{
  Serial.println("Kết nối WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi đã kết nối!");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
}

void MQTT_Reconnect()
{
  while (!client.connected())
  {
    Serial.print("Đang kết nối MQTT...");
    if (client.connect("hehehehhe"))
    {
      Serial.println("Đã kết nối MQTT!");
      client.subscribe(MQTT_TOPIC);
      client.subscribe(MQTT_TOPIC_LIGHT_MODULE_CONTROL);
    }
    else
    {
      Serial.print("Thất bại, rc=");
      Serial.print(client.state());
      Serial.println(" thử lại sau 5 giây...");
      delay(5000);
    }
  }
}

bool millis10s()
{
  if (millis() - lastMillis10s >= 10000)
  {
    lastMillis10s = millis();
    return true;
  }
  return false;
}
void callback(char *topic, byte *payload, unsigned int length)
{
  if (String(topic) == "light_module_control")
  {
    payload[length] = '\0';                   // Kết thúc chuỗi
    String message = String((char *)payload); // Chuyển payload thành chuỗi
    JsonDocument doc;
    deserializeJson(doc, message);
    const char *action = doc["action"];
    const char *mode = doc["mode"];
    mode_L = String(doc["mode"].as<String>());
    String action_L = doc["action"];
    if (action_L == "turn_on_light")
    {
      digitalWrite(DENCHIEUSANG_PIN, HIGH);
      bulb_state = 1;
      sendLightModuleStateIfChanged();
    }
    else if (action_L == "turn_off_light")
    {
      digitalWrite(DENCHIEUSANG_PIN, LOW);
      bulb_state = 0;
      sendLightModuleStateIfChanged();
    }
    else if (action_L == "open_roof")
    {
      servoMaiChe.write(0);
      roof_state = 1;
      sendLightModuleStateIfChanged();
    }
    else if (action_L == "close_roof")
    {
      servoMaiChe.write(90);
      roof_state = 0;

      sendLightModuleStateIfChanged();
    }

    Serial.println(mode_L);
  }
}

void setup()
{
  lcd.init();      // Khởi tạo LCD
  lcd.backlight(); // Bật đèn nền
  lcd.setCursor(0, 0);
  Serial.begin(115200);
  dht.begin();
  WIFIConnect();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  pinMode(DENCHIEUSANG_PIN, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  servoMaiChe.attach(MAICHE_PIN);
  servoMaiChe.write(0);
  client.setCallback(callback);
}

void loop()
{
  if (!client.connected())
  {
    MQTT_Reconnect();
  }
  client.loop();

  // Đọc cảm biến DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t))
  {
    Serial.println("Không thể đọc dữ liệu từ cảm biến DHT!");
    return;
  }

  // Serial.print("Nhiệt độ: ");
  // Serial.print(t);
  // Serial.println("°C");
  // Serial.print("Độ ẩm: ");
  // Serial.print(h);
  // Serial.println("%");

  DynamicJsonDocument dhtDoc(200);
  dhtDoc["temperature"] = t;
  dhtDoc["humidity"] = h;
  char dhtBuffer[200];
  serializeJson(dhtDoc, dhtBuffer);

  // Đọc độ ẩm đất
  int soilMoisture = analogRead(SOIL_SENSOR_PIN);
  int soilMoisturePercent = map(soilMoisture, 4095, 0, 0, 100);
  // Serial.print("Độ ẩm đất: ");
  // Serial.print(soilMoisturePercent);
  // Serial.println("%");

  DynamicJsonDocument soilDoc(128);
  soilDoc["soil_moisture"] = soilMoisturePercent;
  char soilBuffer[128];
  serializeJson(soilDoc, soilBuffer);

  // Điều khiển bơm nước dựa vào độ ẩm đất
  DynamicJsonDocument isWateringDoc(128);
  if (!isControlled)
  {
    if (soilMoisturePercent <= 35 && !isWatering)
    {
      isWatering = true;
      digitalWrite(MOTOR_PIN, HIGH);
      isWateringDoc["wateringState"] = String(isWatering);
      char isWateringBuffer[128];
      serializeJson(isWateringDoc, isWateringBuffer);
      client.publish(MQTT_TOPIC_ISWATERING, isWateringBuffer);
    }
    else if (soilMoisturePercent >= 60 && isWatering)
    {
      isWatering = false;
      digitalWrite(MOTOR_PIN, LOW);
      isWateringDoc["wateringState"] = String(isWatering);
      char isWateringBuffer[128];
      serializeJson(isWateringDoc, isWateringBuffer);
      client.publish(MQTT_TOPIC_ISWATERING, isWateringBuffer);
    }
  }

  // CẢM BIẾN ÁNH SÁNG ----------------------------------------
  int lux = 1 + (analogRead(LIGHT_SENSOR_PIN) / 4095.0) * (10000 - 1);
  if (mode_L == "auto")
  {
    if (lux < 4000)
    {
      digitalWrite(DENCHIEUSANG_PIN, 0);
      servoMaiChe.write(90);
      bulb_state = 0;
      roof_state = 0;
    }
    else
    {
      digitalWrite(DENCHIEUSANG_PIN, 1);
      servoMaiChe.write(0);
      bulb_state = 1;
      roof_state = 1;
    }
  }

  sendLightModuleStateIfChanged();

  // tạo json cho cảm biến ánh sáng
  DynamicJsonDocument lightDoc(128);
  lightDoc["light"] = lux;
  char lightBuffer[128];
  serializeJson(lightDoc, lightBuffer);
  // -------------------------------------------------------

  if (millis10s())
  {
    client.publish(MQTT_TOPIC_LIGHT, lightBuffer, true);
    client.publish(MQTT_TOPIC, dhtBuffer, true);
    client.publish(MQTT_TOPIC_SOILSENSOR, soilBuffer, true);
  }
}
