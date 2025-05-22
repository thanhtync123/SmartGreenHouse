#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 20, 4);
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
const char *MQTT_TOPIC_LIGHT_THRESHOLD = "light_threshold";
const char *MQTT_TOPIC_SOIL_THRESHOLD = "soil_threshold";

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

int WATERING_THRESHOLD = 35; // Ngưỡng cần tưới (mặc định Ớt)
int STOP_WATERING_THRESHOLD = 60; // Ngưỡng ngưng tưới (mặc định Ớt)
String plantType = "ot"; // Mặc định Ớt

unsigned long lastMillis10s = 0;
int lastSoilMoisturePercent = -1;
int lastBulb_state = -1;
int lastRoof_state = -1;
String mode_L = "auto";
int bulb_state = -1;
int roof_state = -1;
int last_bulb_state = -1;
int last_roof_state = -1;
int light_threshold = 4000;

void sendLightModuleStateIfChanged() {
  if (last_bulb_state != bulb_state || last_roof_state != roof_state) {
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

void WIFIConnect() {
  Serial.println("Kết nối WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi đã kết nối!");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
}

void MQTT_Reconnect() {
  while (!client.connected()) {
    Serial.print("Đang kết nối MQTT...");
    if (client.connect("hehehehhe")) {
      Serial.println("Đã kết nối MQTT!");
      client.subscribe(MQTT_TOPIC);
      client.subscribe(MQTT_TOPIC_LIGHT_MODULE_CONTROL);
      client.subscribe(MQTT_TOPIC_LIGHT_THRESHOLD);
      client.subscribe(MQTT_TOPIC_SOIL_THRESHOLD);
    } else {
      Serial.print("Thất bại, rc=");
      Serial.print(client.state());
      Serial.println(" thử lại sau 5 giây...");
      delay(5000);
    }
  }
}

bool millis10s() {
  if (millis() - lastMillis10s >= 10000) {
    lastMillis10s = millis();
    return true;
  }
  return false;
}

void callback(char *topic, byte *payload, unsigned int length) {
  if (String(topic) == "light_module_control") {
    payload[length] = '\0';
    String message = String((char *)payload);
    JsonDocument doc;
    deserializeJson(doc, message);
    const char *action = doc["action"];
    const char *mode = doc["mode"];
    mode_L = String(doc["mode"].as<String>());
    String action_L = doc["action"];
    if (action_L == "turn_on_light") {
      digitalWrite(DENCHIEUSANG_PIN, HIGH);
      bulb_state = 1;
      sendLightModuleStateIfChanged();
    } else if (action_L == "turn_off_light") {
      digitalWrite(DENCHIEUSANG_PIN, LOW);
      bulb_state = 0;
      sendLightModuleStateIfChanged();
    } else if (action_L == "open_roof") {
      servoMaiChe.write(0);
      roof_state = 1;
      sendLightModuleStateIfChanged();
    } else if (action_L == "close_roof") {
      servoMaiChe.write(90);
      roof_state = 0;
      sendLightModuleStateIfChanged();
    }
    Serial.println(mode_L);
  } else if (String(topic) == "light_threshold") {
    payload[length] = '\0';
    String msg = String((char *)payload);
    light_threshold = msg.toInt();
    Serial.print("Độ sáng ngưỡng: ");
    Serial.println(light_threshold);
  } else if (String(topic) == "soil_threshold") {
    payload[length] = '\0';
    String message = String((char *)payload);
    DynamicJsonDocument doc(128);
    deserializeJson(doc, message);
    plantType = doc["plantType"].as<String>();
    WATERING_THRESHOLD = doc["wateringThreshold"];
    STOP_WATERING_THRESHOLD = doc["stopWateringThreshold"];
    Serial.println("Cập nhật ngưỡng: Loại cây=" + plantType + ", Tưới=" + String(WATERING_THRESHOLD) + "%, Ngưng=" + String(STOP_WATERING_THRESHOLD) + "%");
  }
}

void setup() {
  lcd.init();
  lcd.backlight();
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

void loop() {
  if (!client.connected()) {
    MQTT_Reconnect();
  }
  client.loop();

  // Đọc cảm biến DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Không thể đọc dữ liệu từ cảm biến DHT!");
    return;
  }

  DynamicJsonDocument dhtDoc(200);
  dhtDoc["temperature"] = t;
  dhtDoc["humidity"] = h;
  char dhtBuffer[200];
  serializeJson(dhtDoc, dhtBuffer);

  // Đọc độ ẩm đất
  int soilMoisture = analogRead(SOIL_SENSOR_PIN);
  int soilMoisturePercentNow = map(soilMoisture, 4095, 0, 0, 100);

  // Điều khiển bơm nước dựa vào độ ẩm đất
  if (!isControlled) {
    if (soilMoisturePercentNow <= WATERING_THRESHOLD && !isWatering) {
      isWatering = true;
      digitalWrite(MOTOR_PIN, HIGH);
    } else if (soilMoisturePercentNow >= STOP_WATERING_THRESHOLD && isWatering) {
      isWatering = false;
      digitalWrite(MOTOR_PIN, LOW);
    }
  }

  // Gửi dữ liệu nếu độ ẩm đất thay đổi
  if (soilMoisturePercentNow != lastSoilMoisturePercent) {
    DynamicJsonDocument soilDoc(256);
    soilDoc["lastSoilMoisturePercent"] = lastSoilMoisturePercent;
    soilDoc["soilMoisturePercentNow"] = soilMoisturePercentNow;
    soilDoc["isWatering"] = isWatering;
    soilDoc["isControlled"] = isControlled;
    soilDoc["wateringThreshold"] = WATERING_THRESHOLD;
    soilDoc["stopWateringThreshold"] = STOP_WATERING_THRESHOLD;
    soilDoc["plantType"] = plantType;
    char soilBuffer[256];
    serializeJson(soilDoc, soilBuffer);
    client.publish(MQTT_TOPIC_SOILSENSOR, soilBuffer, true);
    lastSoilMoisturePercent = soilMoisturePercentNow;
  }

  // CẢM BIẾN ÁNH SÁNG
  int lux = 1 + (analogRead(LIGHT_SENSOR_PIN) / 4095.0) * (10000 - 1);
  if (mode_L == "auto") {
    if (lux > light_threshold) {
      digitalWrite(DENCHIEUSANG_PIN, 0);
      servoMaiChe.write(90);
      bulb_state = 0;
      roof_state = 0;
    } else {
      digitalWrite(DENCHIEUSANG_PIN, 1);
      servoMaiChe.write(0);
      bulb_state = 1;
      roof_state = 1;
    }
  }
  sendLightModuleStateIfChanged();

  DynamicJsonDocument lightDoc(128);
  lightDoc["light"] = lux;
  char lightBuffer[128];
  serializeJson(lightDoc, lightBuffer);

  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(t);
  lcd.print("C");
  lcd.print("        ");
  lcd.setCursor(0, 1);
  lcd.print("Humidity: ");
  lcd.print(h);
  lcd.print("%");
  lcd.print("        ");
  lcd.setCursor(0, 2);
  lcd.print("Soil: ");
  lcd.print(soilMoisturePercentNow);
  lcd.print("%");
  lcd.print("        ");
  lcd.setCursor(0, 3);
  lcd.print("Lux: ");
  lcd.print(lux);
  lcd.print("        ");

  if (millis10s()) {
    client.publish(MQTT_TOPIC_LIGHT, lightBuffer, true);
    client.publish(MQTT_TOPIC, dhtBuffer, true);
    char thresholdBuffer[16];
    snprintf(thresholdBuffer, sizeof(thresholdBuffer), "%d", light_threshold);
    client.publish(MQTT_TOPIC_LIGHT_THRESHOLD, thresholdBuffer, true);
  }
}