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

int WATERING_THRESHOLD = 35;      // Ngưỡng cần tưới (mặc định Ớt)
int STOP_WATERING_THRESHOLD = 60; // Ngưỡng ngưng tưới (mặc định Ớt)
String plantType = "ot";          // Mặc định Ớt

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
int lastBrightness = -1;
String lastRoof = "";

// dht22
//  Định nghĩa chân cho các thiết bị mới
#define FAN_PIN 18
#define MIST_MAKER_PIN 23
#define HEATER_PIN 27

// Biến trạng thái cho các thiết bị
bool isFanOn = false;
bool isMistMakerOn = false;
bool isHeaterOn = false;

void controlFan(bool state)
{
  digitalWrite(FAN_PIN, state ? HIGH : LOW);
  isFanOn = state;
  Serial.print("Quạt: ");
  Serial.println(state ? "BẬT" : "TẮT");

  // Gửi trạng thái quạt qua MQTT
  DynamicJsonDocument fanDoc(128);
  fanDoc["fanState"] = String(state);
  char fanBuffer[128];
  serializeJson(fanDoc, fanBuffer);
  client.publish("fan_state_pt", fanBuffer);
}

void controlMistMaker(bool state)
{
  digitalWrite(MIST_MAKER_PIN, state ? HIGH : LOW);
  isMistMakerOn = state;
  Serial.print("Phun sương: ");
  Serial.println(state ? "BẬT" : "TẮT");

  // Gửi trạng thái phun sương qua MQTT
  DynamicJsonDocument mistDoc(128);
  mistDoc["mistMakerState"] = String(state);
  char mistBuffer[128];
  serializeJson(mistDoc, mistBuffer);
  client.publish("mist_maker_state_pt", mistBuffer);
}

void controlHeater(bool state)
{
  digitalWrite(HEATER_PIN, state ? HIGH : LOW);
  isHeaterOn = state;
  Serial.print("Máy sưởi: ");
  Serial.println(state ? "BẬT" : "TẮT");

  // Gửi trạng thái máy sưởi qua MQTT
  DynamicJsonDocument heaterDoc(128);
  heaterDoc["heaterState"] = String(state);
  char heaterBuffer[128];
  serializeJson(heaterDoc, heaterBuffer);
  client.publish("heater_state_pt", heaterBuffer);
}

void controlDevicesBasedOnDHT(float temperature, float humidity)
{
  // Điều khiển quạt dựa trên nhiệt độ
  if (!isControlled)
  { // Chỉ điều khiển tự động nếu không ở chế độ thủ công
    if (temperature > 30.0 && !isFanOn)
    {
      controlFan(true); // Bật quạt nếu nhiệt độ > 30°C
    }
    else if (temperature <= 28.0 && isFanOn)
    {
      controlFan(false); // Tắt quạt nếu nhiệt độ <= 28°C (hysteresis)
    }

    // Điều khiển phun sương dựa trên độ ẩm
    if (humidity < 40.0 && !isMistMakerOn)
    {
      controlMistMaker(true); // Bật phun sương nếu độ ẩm < 40%
    }
    else if (humidity >= 50.0 && isMistMakerOn)
    {
      controlMistMaker(false); // Tắt phun sương nếu độ ẩm >= 50% (hysteresis)
    }

    // Điều khiển máy sưởi dựa trên nhiệt độ
    if (temperature < 20.0 && !isHeaterOn)
    {
      controlHeater(true); // Bật máy sưởi nếu nhiệt độ < 20°C
    }
    else if (temperature >= 22.0 && isHeaterOn)
    {
      controlHeater(false); // Tắt máy sưởi nếu nhiệt độ >= 22°C (hysteresis)
    }
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
      client.subscribe(MQTT_TOPIC_LIGHT_THRESHOLD);
      client.subscribe(MQTT_TOPIC_SOIL_THRESHOLD);
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
    payload[length] = '\0';
    String message = String((char *)payload);
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
  else if (String(topic) == "light_threshold")
  {
    payload[length] = '\0';
    String msg = String((char *)payload);
    light_threshold = msg.toInt();
    Serial.print("Độ sáng ngưỡng: ");
    Serial.println(light_threshold);
  }
  else if (String(topic) == "soil_threshold")
  {
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

void setup()
{
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  Serial.begin(115200);
  dht.begin();
  WIFIConnect();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  pinMode(DENCHIEUSANG_PIN, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);        // Khởi tạo chân quạt
  pinMode(MIST_MAKER_PIN, OUTPUT); // Khởi tạo chân phun sương
  pinMode(HEATER_PIN, OUTPUT);     // Khởi tạo chân máy sưởi
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
  int soilMoisturePercentNow = map(soilMoisture, 4095, 0, 0, 100);

  // Điều khiển bơm nước dựa vào độ ẩm đất
  if (!isControlled)
  {
    if (soilMoisturePercentNow <= WATERING_THRESHOLD && !isWatering)
    {
      isWatering = true;
      digitalWrite(MOTOR_PIN, HIGH);
    }
    else if (soilMoisturePercentNow >= STOP_WATERING_THRESHOLD && isWatering)
    {
      isWatering = false;
      digitalWrite(MOTOR_PIN, LOW);
    }
  }

  // Gửi dữ liệu nếu độ ẩm đất thay đổi
  if (soilMoisturePercentNow != lastSoilMoisturePercent)
  {
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
  if (mode_L == "auto")
  {
    if (lux > light_threshold)
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

  if (millis10s())
  {
    client.publish(MQTT_TOPIC_LIGHT, lightBuffer, true);
    client.publish(MQTT_TOPIC, dhtBuffer, true);
    char thresholdBuffer[16];
    snprintf(thresholdBuffer, sizeof(thresholdBuffer), "%d", light_threshold);
    client.publish(MQTT_TOPIC_LIGHT_THRESHOLD, thresholdBuffer, true);
  }
}
