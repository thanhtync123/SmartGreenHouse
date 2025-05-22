// Hàm tính thời gian "Cập nhật X phút trước"
function getTimeAgo(timestamp) {
  const now = new Date();
  const updatedTime = new Date(timestamp);
  const diffMs = now - updatedTime;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Vừa cập nhật";
  if (diffMinutes < 60) return `Cập nhật ${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Cập nhật ${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `Cập nhật ${diffDays} ngày trước`;
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

// Hàm hiển thị trạng thái loading
function setLoadingState() {
  document.getElementById("temperature-value").innerHTML =
    "Đang tải...<span class='card-unit'>°C</span>";
  document.getElementById("humidity-value").innerHTML =
    "Đang tải...<span class='card-unit'>%</span>";
  document.getElementById("temperature-status").innerHTML = "";
  document.getElementById("humidity-status").innerHTML = "";
  document.getElementById("temperature-updated").textContent = "";
  document.getElementById("humidity-updated").textContent = "";
}

// Hàm cập nhật giao diện với dữ liệu cảm biến
function updateSensorData(data) {
  try {
    // Kiểm tra dữ liệu
    if (
      !data ||
      typeof data.temperature === "undefined" ||
      typeof data.humidity === "undefined" ||
      !data.timestamp
    ) {
      console.error("Dữ liệu không hợp lệ hoặc thiếu timestamp:", data);
      document.getElementById("temperature-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>°C</span>";
      document.getElementById("humidity-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>%</span>";
      document.getElementById("temperature-updated").textContent =
        "Lỗi dữ liệu";
      document.getElementById("humidity-updated").textContent = "Lỗi dữ liệu";
      console.log(timestamp);
      return;
    }

    const temperature = data.temperature;
    const humidity = data.humidity;
    const timestamp = data.timestamp; // Timestamp từ payload
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
    document.getElementById("temperature-updated").textContent =
      getTimeAgo(timestamp);
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
    document.getElementById("humidity-updated").textContent =
      getTimeAgo(timestamp);
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu cảm biến:", error);
    document.getElementById("temperature-value").innerHTML =
      "Lỗi<span class='card-unit'>°C</span>";
    document.getElementById("humidity-value").innerHTML =
      "Lỗi<span class='card-unit'>%</span>";
    document.getElementById("temperature-updated").textContent = "Lỗi";
    document.getElementById("humidity-updated").textContent = "Lỗi";
  }
}

// Thiết lập kết nối MQTT với Paho
const client = new Paho.MQTT.Client(
  "broker.emqx.io",
  8084,
  "webClient-" + parseInt(Math.random() * 1000)
);

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
    // Nếu không có timestamp trong payload, sử dụng thời gian nhận message
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }
    updateSensorData(data);
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu MQTT:", error);
  }
};

// Kết nối tới broker
function connectMQTT() {
  setLoadingState(); // Hiển thị trạng thái loading khi bắt đầu kết nối
  client.connect({
    useSSL: true,
    onSuccess: () => {
      console.log("Đã kết nối tới broker.emqx.io");
      client.subscribe("dht22", {
        onSuccess: () => {
          console.log("Đã subscribe topic dht22");
          // Retained message sẽ tự động được gửi và xử lý trong onMessageArrived
        },
        onFailure: (err) => {
          console.error("Lỗi khi subscribe topic dht22:", err.errorMessage);
          document.getElementById("temperature-value").innerHTML =
            "Lỗi kết nối<span class='card-unit'>°C</span>";
          document.getElementById("humidity-value").innerHTML =
            "Lỗi kết nối<span class='card-unit'>%</span>";
        },
      });
    },
    onFailure: (err) => {
      console.error("Lỗi kết nối MQTT:", err.errorMessage);
      document.getElementById("temperature-value").innerHTML =
        "Lỗi kết nối<span class='card-unit'>°C</span>";
      document.getElementById("humidity-value").innerHTML =
        "Lỗi kết nối<span class='card-unit'>%</span>";
    },
  });
}

// Gọi hàm cập nhật khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  console.log("Trang đã tải, bắt đầu kết nối MQTT...");
  connectMQTT();
});
