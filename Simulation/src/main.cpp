#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>

#define SLIDE_LIGHT 32 // Chân đọc giá trị từ biến trở (slide)
#define LCD_ADDR 0x27  // Địa chỉ I2C mặc định của LCD 20x4
#define LCD_COLS 20
#define LCD_ROWS 4
#define LIGHT_RELAY_PIN 19 // Chân điều khiển đèn
#define SERVO_PIN 17       // Chân điều khiển servo cho rèm

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "myapp/greenhouse"; // Topic duy nhất cho tất cả dữ liệu và điều khiển
const char* MQTT_ID = "slide-reader-12301";

WiFiClient espClient;
PubSubClient client(espClient);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
Servo curtainServo;

// Định nghĩa các ngưỡng - giờ có thể thay đổi từ MQTT
int LIGHT_THRESHOLD_LOW = 300;  // Ngưỡng bật đèn
int LIGHT_THRESHOLD_HIGH = 1000; // Ngưỡng đóng rèm

bool isLightOn = false;  // Trạng thái đèn
bool isCurtainClosed = false; // Trạng thái rèm

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

// Thêm khai báo hàm (function prototypes) ở đây
void controlLight(bool turnOn);
void controlCurtain(bool close);

void callback(char* topic, byte* payload, unsigned int length) {
  // Tạo bộ đệm để lưu trữ tin nhắn
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  Serial.print("Message arrived: ");
  Serial.println(message);
  
  // Kiểm tra xem có phải là JSON không
  if (message[0] == '{') {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (!error) {
      // Kiểm tra nếu tin nhắn chứa cài đặt ngưỡng
      if (doc.containsKey("light_threshold")) {
        LIGHT_THRESHOLD_LOW = doc["light_threshold"];
        Serial.print("Đã cập nhật ngưỡng ánh sáng: ");
        Serial.println(LIGHT_THRESHOLD_LOW);
        
        // Hiển thị ngưỡng mới trên LCD
        lcd.setCursor(0, 2);
        lcd.print("Light threshold: ");
        lcd.print(LIGHT_THRESHOLD_LOW);
        lcd.print("   ");
      }
      
      if (doc.containsKey("curtain_threshold")) {
        LIGHT_THRESHOLD_HIGH = doc["curtain_threshold"];
        Serial.print("Đã cập nhật ngưỡng rèm: ");
        Serial.println(LIGHT_THRESHOLD_HIGH);
        
        // Hiển thị ngưỡng mới trên LCD
        lcd.setCursor(0, 3);
        lcd.print("Curtain threshold: ");
        lcd.print(LIGHT_THRESHOLD_HIGH);
        lcd.print("   ");
      }
    }
  }
}

// Hàm điều khiển đèn
void controlLight(bool turnOn) {
  if (turnOn) {
    digitalWrite(LIGHT_RELAY_PIN, HIGH);
    isLightOn = true;
    Serial.println("Đèn đã BẬT");
  } else {
    digitalWrite(LIGHT_RELAY_PIN, LOW);
    isLightOn = false;
    Serial.println("Đèn đã TẮT");
  }
  
  // Gửi trạng thái đèn lên MQTT
  StaticJsonDocument<100> statusDoc;
  statusDoc["light_status"] = isLightOn ? "on" : "off";
  statusDoc["curtain_status"] = isCurtainClosed ? "closed" : "open";
  char statusBuffer[100];
  serializeJson(statusDoc, statusBuffer);
  client.publish(MQTT_TOPIC, statusBuffer);
  
  // Hiển thị trạng thái trên LCD
  lcd.setCursor(0, 2);
  lcd.print("Light: ");
  lcd.print(isLightOn ? "ON  " : "OFF ");
}

// Hàm điều khiển rèm
void controlCurtain(bool close) {
  int angle;
  if (close) {
    angle = 180; // Góc đóng rèm
    isCurtainClosed = true;
    Serial.println("Rèm đã ĐÓNG");
  } else {
    angle = 0;  // Góc mở rèm
    isCurtainClosed = false;
    Serial.println("Rèm đã MỞ");
  }
  
  curtainServo.write(angle);
  
  // Gửi trạng thái rèm lên MQTT
  StaticJsonDocument<100> statusDoc;
  statusDoc["light_status"] = isLightOn ? "on" : "off";
  statusDoc["curtain_status"] = isCurtainClosed ? "closed" : "open";
  char statusBuffer[100];
  serializeJson(statusDoc, statusBuffer);
  client.publish(MQTT_TOPIC, statusBuffer);
  
  // Hiển thị trạng thái trên LCD
  lcd.setCursor(0, 3);
  lcd.print("Curtain: ");
  lcd.print(isCurtainClosed ? "CLOSED" : "OPEN  ");
}

void setup() {
  Serial.begin(115200);
  WIFIConnect();
  
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
  
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart GreenHouse");
  
  pinMode(LIGHT_RELAY_PIN, OUTPUT);
  digitalWrite(LIGHT_RELAY_PIN, LOW); // Tắt đèn khi khởi động
  
  curtainServo.attach(SERVO_PIN);
  curtainServo.write(0);  // Mở rèm khi khởi động
  
  // Đăng ký topic điều khiển
  client.subscribe(MQTT_TOPIC);
}

void loop() {
  if (!client.connected()) {
    MQTT_Reconnect();
  }
  client.loop();
  
  int slideValue = analogRead(SLIDE_LIGHT);
  int lightValue = map(slideValue, 0, 4095, 0, 10000); // Chuyển đổi giá trị analog sang lux
  
  Serial.print("Giá trị ánh sáng: ");
  Serial.println(lightValue);
  
  // Hiển thị giá trị ánh sáng trên LCD
  lcd.setCursor(0, 1);
  lcd.print("Light: ");
  lcd.print(lightValue);
  lcd.print(" lux    "); 

  // Kiểm tra và điều khiển đèn dựa trên ngưỡng
  if (lightValue < LIGHT_THRESHOLD_LOW && !isLightOn) {
    controlLight(true); // Bật đèn khi ánh sáng < 300 lux
  } else if (lightValue >= LIGHT_THRESHOLD_LOW && isLightOn) {
    controlLight(false); // Tắt đèn khi ánh sáng >= 300 lux
  }
  
  // Kiểm tra và điều khiển rèm dựa trên ngưỡng
  if (lightValue > LIGHT_THRESHOLD_HIGH && !isCurtainClosed) {
    controlCurtain(true); // Đóng rèm khi ánh sáng > 1000 lux
  } else if (lightValue <= LIGHT_THRESHOLD_HIGH && isCurtainClosed) {
    controlCurtain(false); // Mở rèm khi ánh sáng <= 1000 lux
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
