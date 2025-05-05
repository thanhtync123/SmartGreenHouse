#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>

// === ĐỊNH NGHĨA CHÂN KẾT NỐI ===
#define SLIDE_LIGHT 32     // Chân đọc giá trị từ biến trở (slide)
#define LIGHT_RELAY_PIN 19 // Chân điều khiển đèn
#define SERVO_PIN 17       // Chân điều khiển servo cho rèm

// === CẤU HÌNH LCD ===
#define LCD_ADDR 0x27
#define LCD_COLS 20
#define LCD_ROWS 4

// === CẤU HÌNH WIFI VÀ MQTT ===
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "myapp/greenhouse";
const char* MQTT_ID = "slide-reader-12301";

// === CẤU HÌNH NGƯỠNG CỐ ĐỊNH ===
const int LIGHT_THRESHOLD_LOW = 3000;  // Ngưỡng bật đèn
const int LIGHT_THRESHOLD_HIGH = 9999; // Ngưỡng đóng rèm

// === KHỞI TẠO ĐỐI TƯỢNG ===
WiFiClient espClient;
PubSubClient client(espClient);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
Servo curtainServo;

// === BIẾN TRẠNG THÁI ===
bool isLightOn = false;     // Trạng thái đèn
bool isCurtainClosed = false; // Trạng thái rèm

// === FUNCTION PROTOTYPES ===
void WIFIConnect();
void MQTT_Reconnect();
void callback(char* topic, byte* payload, unsigned int length);
void controlLight(bool turnOn);
void controlCurtain(bool close);
void sendStatusToMQTT();

// === KẾT NỐI WIFI ===
void WIFIConnect() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// === KẾT NỐI MQTT ===
void MQTT_Reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    if (client.connect(MQTT_ID)) {
      Serial.println("Connected to MQTT!");
      client.subscribe(MQTT_TOPIC);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// === XỬ LÝ DỮ LIỆU MQTT ===
void callback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  
  Serial.print("Message arrived: ");
  Serial.println(message);
}

// === ĐIỀU KHIỂN ĐÈN ===
void controlLight(bool turnOn) {
  digitalWrite(LIGHT_RELAY_PIN, turnOn ? HIGH : LOW);
  isLightOn = turnOn;
  
  Serial.println(turnOn ? "Đèn đã BẬT" : "Đèn đã TẮT");
  
  // Hiển thị trạng thái trên LCD
  lcd.setCursor(0, 2);
  lcd.print("Light: ");
  lcd.print(isLightOn ? "ON  " : "OFF ");
  
  sendStatusToMQTT();
}

// === ĐIỀU KHIỂN RÈM ===
void controlCurtain(bool close) {
  curtainServo.write(close ? 180 : 0);
  isCurtainClosed = close;
  
  Serial.println(close ? "Rèm đã ĐÓNG" : "Rèm đã MỞ");
  
  // Hiển thị trạng thái trên LCD
  lcd.setCursor(0, 3);
  lcd.print("Curtain: ");
  lcd.print(isCurtainClosed ? "CLOSED" : "OPEN  ");
  
  sendStatusToMQTT();
}

// === GỬI TRẠNG THÁI LÊN MQTT ===
void sendStatusToMQTT() {
  StaticJsonDocument<100> statusDoc;
  statusDoc["light_status"] = isLightOn ? "on" : "off";
  statusDoc["curtain_status"] = isCurtainClosed ? "closed" : "open";
  
  char statusBuffer[100];
  serializeJson(statusDoc, statusBuffer);
  client.publish(MQTT_TOPIC, statusBuffer);
}

// === HÀM SETUP ===
void setup() {
  Serial.begin(115200);
  
  // Kết nối WiFi và MQTT
  WIFIConnect();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
  
  // Khởi tạo LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart GreenHouse");
  
  // Cấu hình IO
  pinMode(LIGHT_RELAY_PIN, OUTPUT);
  digitalWrite(LIGHT_RELAY_PIN, LOW); // Tắt đèn khi khởi động
  
  // Khởi tạo servo
  curtainServo.attach(SERVO_PIN);
  curtainServo.write(0);  // Mở rèm khi khởi động
  
  // Đăng ký topic MQTT
  client.subscribe(MQTT_TOPIC);
}

// === HÀM LOOP ===
void loop() {
  // Đảm bảo kết nối MQTT
  if (!client.connected()) {
    MQTT_Reconnect();
  }
  client.loop();
  
  // Đọc giá trị ánh sáng
  int slideValue = analogRead(SLIDE_LIGHT);
  int lightValue = map(slideValue, 0, 4095, 0, 10000);
  
  Serial.print("Giá trị ánh sáng: ");
  Serial.println(lightValue);
  
  // Hiển thị giá trị ánh sáng trên LCD
  lcd.setCursor(0, 1);
  lcd.print("Light: ");
  lcd.print(lightValue);
  lcd.print(" lux    "); 

  // Điều khiển tự động dựa trên ngưỡng cố định
  if (lightValue < LIGHT_THRESHOLD_LOW && !isLightOn) {
    controlLight(true);
  } else if (lightValue >= LIGHT_THRESHOLD_LOW && isLightOn) {
    controlLight(false);
  }
  
  if (lightValue > LIGHT_THRESHOLD_HIGH && !isCurtainClosed) {
    controlCurtain(true);
  } else if (lightValue <= LIGHT_THRESHOLD_HIGH && isCurtainClosed) {
    controlCurtain(false);
  }

  // Gửi dữ liệu lên MQTT
  StaticJsonDocument<200> doc;
  doc["light_value"] = lightValue;
  doc["light_status"] = isLightOn ? "on" : "off";
  doc["curtain_status"] = isCurtainClosed ? "closed" : "open";
  
  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);
  client.publish(MQTT_TOPIC, jsonBuffer);

  delay(1000); // Đọc và gửi mỗi 1 giây
}
