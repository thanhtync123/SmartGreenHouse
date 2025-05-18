// Hàm tính thời gian "Cập nhật X phút trước"
function getTimeAgo(timestamp) {
  const now = new Date();
  const updatedTime = new Date(timestamp);
  const diffMs = now - updatedTime;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Vừa cập nhật";
  return `Cập nhật ${diffMinutes} phút trước`;
}

// Hàm xác định trạng thái nhiệt độ
function getTemperatureStatus(temperature) {
  if (temperature > 30) return { class: "danger", text: "Quá cao" };
  if (temperature > 27) return { class: "warning", text: "Hơi cao" };
  if (temperature < 18) return { class: "danger", text: "Quá thấp" };
  return { class: "optimal", text: "Tối ưu" };
}

// Hàm xác định trạng thái độ ẩm
function getHumidityStatus(humidity) {
  if (humidity > 80) return { class: "danger", text: "Quá cao" };
  if (humidity > 60) return { class: "warning", text: "Hơi cao" };
  if (humidity < 40) return { class: "danger", text: "Quá thấp" };
  return { class: "optimal", text: "Tối ưu" };
}

// Hàm cập nhật giao diện với dữ liệu cảm biến
function updateSensorData(data) {
  try {
    // Kiểm tra dữ liệu
    if (!data || typeof data.temperature === "undefined" || typeof data.humidity === "undefined") {
      console.error("Dữ liệu không hợp lệ:", data);
      document.getElementById("temperature-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>°C</span>";
      document.getElementById("humidity-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>%</span>";
      return;
    }

    const temperature = data.temperature;
    const humidity = data.humidity;
    const timestamp = data.timestamp || new Date().toISOString();
    const temperatureStatus = getTemperatureStatus(temperature);
    const humidityStatus = getHumidityStatus(humidity);

    // Cập nhật nhiệt độ
    document.getElementById(
      "temperature-value"
    ).innerHTML = `${temperature.toFixed(1)}<span class="card-unit">°C</span>`;
    document.getElementById("temperature-progress").textContent = `${Math.round(
      (temperature / 40) * 100
    )}%`;
    document.getElementById(
      "temperature-progress-bar"
    ).style.width = `${Math.round((temperature / 40) * 100)}%`;
    document.getElementById(
      "temperature-status"
    ).className = `status ${temperatureStatus.class}`;
    document.getElementById(
      "temperature-status"
    ).innerHTML = `<i class="fas fa-${
      temperatureStatus.class === "optimal"
        ? "check-circle"
        : "exclamation-circle"
    }"></i><span>${temperatureStatus.text}</span>`;
    document.getElementById("temperature-updated").textContent = getTimeAgo(
      timestamp
    );

    // Cập nhật độ ẩm
    document.getElementById("humidity-value").innerHTML = `${humidity.toFixed(
      1
    )}<span class="card-unit">%</span>`;
    document.getElementById("humidity-progress").textContent = `${Math.round(
      humidity
    )}%`;
    document.getElementById(
      "humidity-progress-bar"
    ).style.width = `${Math.round(humidity)}%`;
    document.getElementById(
      "humidity-status"
    ).className = `status ${humidityStatus.class}`;
    document.getElementById("humidity-status").innerHTML = `<i class="fas fa-${
      humidityStatus.class === "optimal" ? "check-circle" : "exclamation-circle"
    }"></i><span>${humidityStatus.text}</span>`;
    document.getElementById("humidity-updated").textContent = getTimeAgo(
      timestamp
    );
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu cảm biến:", error);
    document.getElementById("temperature-value").innerHTML =
      "Lỗi<span class='card-unit'>°C</span>";
    document.getElementById("humidity-value").innerHTML =
      "Lỗi<span class='card-unit'>%</span>";
  }
}

// Thiết lập kết nối MQTT với Paho
const client = new Paho.MQTT.Client("broker.emqx.io", 8084, "webClient-" + parseInt(Math.random() * 1000));

// Callback khi kết nối bị mất
client.onConnectionLost = (responseObject) => {
  if (responseObject.errorCode !== 0) {
    console.error("Kết nối bị mất:", responseObject.errorMessage);
    document.getElementById("temperature-value").innerHTML =
      "Lỗi kết nối<span class='card-unit'>°C</span>";
    document.getElementById("humidity-value").innerHTML =
      "Lỗi kết nối<span class='card-unit'>%</span>";
  }
};

// Callback khi nhận được tin nhắn (bao gồm retained message)
client.onMessageArrived = (message) => {
  try {
    const data = JSON.parse(message.payloadString);
    console.log("Dữ liệu nhận được từ topic dht22:", data);
    updateSensorData(data);
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu MQTT:", error);
  }
};

// Kết nối tới broker
client.connect({
  useSSL: true,
  onSuccess: () => {
    console.log("Đã kết nối tới broker.emqx.io");
    client.subscribe("dht22", {
      onSuccess: () => {
        console.log("Đã subscribe topic dht22");
        // Giao diện sẽ tự động cập nhật khi nhận retained message
      },
      onFailure: (err) => {
        console.error("Lỗi khi subscribe topic dht22:", err.errorMessage);
      }
    });
  },
  onFailure: (err) => {
    console.error("Lỗi kết nối MQTT:", err.errorMessage);
    document.getElementById("temperature-value").innerHTML =
      "Lỗi kết nối<span class='card-unit'>°C</span>";
    document.getElementById("humidity-value").innerHTML =
      "Lỗi kết nối<span class='card-unit'>%</span>";
  }
});

// Gọi hàm cập nhật khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  console.log("Trang đã tải, bắt đầu kết nối MQTT...");
  // Không cần gọi thêm hàm updateSensorData vì retained message sẽ tự động kích hoạt onMessageArrived
});