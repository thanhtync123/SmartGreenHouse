#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>  // Thêm thư viện JSON

#define DHTPIN 19      // Chân kết nối với DHT
#define DHTTYPE DHT22  // Sử dụng cảm biến DHT22

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "dht22";
const char* MQTT_ID = "";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

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

void setup() {
  Serial.begin(115200);
  dht.begin();

  WIFIConnect();
  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!client.connected()) {
    MQTT_Reconnect();
  }
  client.loop();

  // Đọc nhiệt độ và độ ẩm từ cảm biến
  float h = dht.readHumidity();
  float t = dht.readTemperature(); // Mặc định là độ C

  if (isnan(h) || isnan(t)) {
    Serial.println("Không thể đọc dữ liệu từ cảm biến DHT!");
    return;
  }

  Serial.print("Nhiet do: "); Serial.print(t); Serial.println("°C");
  Serial.print("Do am: "); Serial.print(h); Serial.println("%");

  float sum = 0;
  for (int i = 0; i < 3; i++) {
      float t = dht.readTemperature(); // Đọc giá trị mới mỗi lần
      sum += t;
      delay(1000); // Chờ một chút giữa các lần đo để tránh đọc trùng
  }


  
  // Tạo JSON object
  StaticJsonDocument<200> doc;
  doc["temperature"] = t;
  doc["humidity"] = h;

  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);

  // Gửi JSON lên MQTT
  client.publish(MQTT_TOPIC, jsonBuffer);

  delay(500);  // Gửi dữ liệu mỗi 5 giây
}
