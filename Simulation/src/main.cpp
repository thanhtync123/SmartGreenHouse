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
const char *MQTT_TOPIC_LIGHT_MODULE = "light_sensor_module";
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
  pinMode(FAN_PIN, OUTPUT);        // Khởi tạo chân quạt
  pinMode(MIST_MAKER_PIN, OUTPUT); // Khởi tạo chân phun sương
  pinMode(HEATER_PIN, OUTPUT);     // Khởi tạo chân máy sưởi
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

  // Đọc cảm biến DHT22

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
  if (lux < 4000)
  {
    digitalWrite(DENCHIEUSANG_PIN, HIGH);
    servoMaiChe.write(90);
  }
  else
  {
    digitalWrite(DENCHIEUSANG_PIN, LOW);
    servoMaiChe.write(0);
  }

  DynamicJsonDocument lightDoc(128);
  lightDoc["light"] = lux;
  char lightBuffer[128];
  serializeJson(lightDoc, lightBuffer);

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  controlDevicesBasedOnDHT(t, h);

  if (millis10s())
  {
    Serial.print("Nhiệt độ: ");
    Serial.print(t);
    Serial.println("°C");
    Serial.print("Độ ẩm: ");
    Serial.print(h);
    Serial.println("%");

    if (isnan(h) || isnan(t))
    {
      Serial.println("Không thể đọc dữ liệu từ cảm biến DHT!");
      return;
    }

    DynamicJsonDocument dhtDoc(200);
    dhtDoc["temperature"] = t;
    dhtDoc["humidity"] = h;
    char dhtBuffer[200];
    serializeJson(dhtDoc, dhtBuffer);

    client.publish(MQTT_TOPIC_LIGHT, lightBuffer, true);
    client.publish(MQTT_TOPIC, dhtBuffer, true);
    client.publish(MQTT_TOPIC_SOILSENSOR, soilBuffer, true);
  }
}
