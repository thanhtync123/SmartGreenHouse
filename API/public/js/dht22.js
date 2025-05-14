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

// Hàm gọi API và cập nhật giao diện
async function updateSensorData() {
  try {
    console.log(
      "Fetching data from http://localhost:3000/api/dht22readings?limit=1"
    );
    const response = await fetch(
      "http://localhost:3000/api/dht22readings?limit=1"
    );
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const { data } = await response.json();
    console.log("Data received:", data);

    // Kiểm tra dữ liệu rỗng
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("No data returned from API");
      document.getElementById("temperature-value").innerHTML =
        "Không có dữ liệu<span class='card-unit'>°C</span>";
      document.getElementById("humidity-value").innerHTML =
        "Không có dữ liệu<span class='card-unit'>%</span>";
      return;
    }

    // Lấy bản ghi mới nhất
    const latestReading = data[0];

    // Kiểm tra xem temperature và humidity có tồn tại không
    if (
      typeof latestReading.temperature === "undefined" ||
      typeof latestReading.humidity === "undefined"
    ) {
      console.error("Missing temperature or humidity in data:", latestReading);
      document.getElementById("temperature-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>°C</span>";
      document.getElementById("humidity-value").innerHTML =
        "Lỗi dữ liệu<span class='card-unit'>%</span>";
      return;
    }

    const temperature = latestReading.temperature;
    const humidity = latestReading.humidity;
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
      latestReading.timestamp
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
      latestReading.timestamp
    );
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu cảm biến:", error);
    document.getElementById("temperature-value").innerHTML =
      "Lỗi<span class='card-unit'>°C</span>";
    document.getElementById("humidity-value").innerHTML =
      "Lỗi<span class='card-unit'>%</span>";
  }
}

// Gọi hàm cập nhật khi tải trang
document.addEventListener("DOMContentLoaded", updateSensorData);

// Cập nhật định kỳ mỗi 10 giây
setInterval(updateSensorData, 10000);
