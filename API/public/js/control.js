/* Hàm xác định thời gian cập nhật */
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

/* Hàm hiển thị trạng thái lỗi */
function setErrorState() {
  const elements = [
    { id: "fan-value", text: "Tốc độ: Lỗi kết nối" },
    { id: "mist-value", text: "Cường độ: Lỗi kết nối" },
    { id: "heater-value", text: "Nhiệt độ: Lỗi kết nối" },
    { id: "fan-status", html: "<span>Lỗi kết nối</span>" },
    { id: "mist-status", html: "<span>Lỗi kết nối</span>" },
    { id: "heater-status", html: "<span>Lỗi kết nối</span>" },
    { id: "fan-updated", text: "Lỗi" },
    { id: "mist-updated", text: "Lỗi" },
    { id: "heater-updated", text: "Lỗi" },
  ];

  elements.forEach(({ id, html, text }) => {
    const element = document.getElementById(id);
    if (element) {
      if (html) element.innerHTML = html;
      if (text) element.textContent = text;
    } else {
      console.error(`Element with ID '${id}' not found in DOM`);
    }
  });
}

/* Hàm hiển thị trạng thái loading cho các thiết bị điều khiển */
function setControlLoadingState() {
  const elements = [
    { id: "fan-value", text: "Tốc độ: Đang tải..." },
    { id: "mist-value", text: "Cường độ: Đang tải..." },
    { id: "heater-value", text: "Nhiệt độ: Đang tải..." },
    { id: "fan-status", html: "<span>Đang tải...</span>" },
    { id: "mist-status", html: "<span>Đang tải...</span>" },
    { id: "heater-status", html: "<span>Đang tải...</span>" },
    { id: "fan-updated", text: "" },
    { id: "mist-updated", text: "" },
    { id: "heater-updated", text: "" },
  ];

  let allElementsExist = true;
  elements.forEach(({ id }) => {
    if (!document.getElementById(id)) {
      console.error(`Element with ID '${id}' not found in DOM`);
      allElementsExist = false;
    }
  });

  if (!allElementsExist) {
    setErrorState();
    return;
  }

  elements.forEach(({ id, html, text }) => {
    const element = document.getElementById(id);
    if (html) element.innerHTML = html;
    if (text) element.textContent = text;
  });
}

/* Hàm cập nhật giao diện thiết bị */
function updateDeviceUI(device, isActive, value, label, unit, timestamp) {
  const elements = [
    `${device}-status`,
    `${device}-value`,
    `${device}-toggle`,
    `${device}-slider`,
    `${device}-updated`,
  ];

  for (const id of elements) {
    if (!document.getElementById(id)) {
      console.error(`Element with ID '${id}' not found in DOM`);
      setErrorState();
      return;
    }
  }

  const deviceStatus = document.getElementById(`${device}-status`);
  const deviceValue = document.getElementById(`${device}-value`);
  const deviceToggle = document.getElementById(`${device}-toggle`);
  const deviceSlider = document.getElementById(`${device}-slider`);
  const deviceUpdated = document.getElementById(`${device}-updated`);

  deviceStatus.innerHTML = `<span>${
    isActive ? "Đang hoạt động" : "Đã tắt"
  }</span>`;
  deviceStatus.className = `control-status ${isActive ? "active" : ""}`;
  deviceValue.textContent = `${label}: ${value}${unit}`;
  deviceToggle.className = `toggle-switch ${isActive ? "active" : ""}`;
  deviceSlider.value = value;
  deviceUpdated.textContent = getTimeAgo(timestamp);

  // Save device state to localStorage as backup
}

/* Hàm gửi lệnh điều khiển qua MQTT */
/* Hàm gửi lệnh điều khiển qua MQTT */
function sendControlCommands(device, command) {
  try {
    if (!client || !client.isConnected()) {
      console.error("MQTT client chưa được kết nối");
      return;
    }
    const topic = `control/${device}`; // Topic riêng cho từng thiết bị
    const message = new Paho.MQTT.Message(JSON.stringify(command));
    message.destinationName = topic;
    message.retained = true;
    client.send(message);
    console.log(`Đã gửi lệnh điều khiển đến ${topic}:`, command);
  } catch (error) {
    console.error(`Lỗi khi gửi lệnh điều khiển đến ${device}:`, error);
  }
}

/* Hàm xử lý sự kiện toggle và slider */
function setupControlEvents() {
  ["fan", "mist", "heater"].forEach((device) => {
    const toggle = document.getElementById(`${device}-toggle`);
    const slider = document.getElementById(`${device}-slider`);
    const valueDisplay = document.getElementById(`${device}-value`);
    const statusDisplay = document.getElementById(`${device}-status`);
    const updatedDisplay = document.getElementById(`${device}-updated`);

    if (
      !toggle ||
      !slider ||
      !valueDisplay ||
      !statusDisplay ||
      !updatedDisplay
    ) {
      console.error(
        `One or more elements for device '${device}' not found in DOM`
      );
      setErrorState();
      return;
    }

    // Xử lý toggle
    toggle.addEventListener("click", () => {
      const isActive = !toggle.classList.contains("active");
      toggle.className = `toggle-switch ${isActive ? "active" : ""}`;
      statusDisplay.innerHTML = `<span>${
        isActive ? "Đang hoạt động" : "Đã tắt"
      }</span>`;
      statusDisplay.className = `control-status ${isActive ? "active" : ""}`;
      const value = slider.value;
      const unit = device === "heater" ? "°C" : "%";
      const label =
        device === "fan"
          ? "Tốc độ"
          : device === "mist"
          ? "Cường độ"
          : "Nhiệt độ";
      valueDisplay.textContent = `${label}: ${value}${unit}`;
      updatedDisplay.textContent = getTimeAgo(new Date());

      sendControlCommands(device, { active: isActive, value: parseInt(value) });
    });

    // Xử lý slider
    slider.addEventListener("change", () => {
      const value = slider.value;
      const unit = device === "heater" ? "°C" : "%";
      const label =
        device === "fan"
          ? "Tốc độ"
          : device === "mist"
          ? "Cường độ"
          : "Nhiệt độ";
      valueDisplay.textContent = `${label}: ${value}${unit}`;
      updatedDisplay.textContent = getTimeAgo(new Date());
      const isActive = toggle.classList.contains("active");

      sendControlCommands(device, { active: isActive, value: parseInt(value) });
    });
  });
}

/* Hàm load trạng thái thiết bị từ localStorage (dùng làm fallback) */

/* Thiết lập kết nối MQTT với Paho */
let client;
try {
  client = new Paho.MQTT.Client(
    "broker.emqx.io",
    8084,
    "webClient-" + parseInt(Math.random() * 1000)
  );
} catch (error) {
  console.error("Lỗi khi khởi tạo MQTT client:", error);
  setErrorState();
}

/* Callback khi kết nối bị mất */
if (client) {
  client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      console.error("Kết nối bị mất:", responseObject.errorMessage);
      setErrorState();
      setTimeout(() => {
        console.log("Đang thử kết nối lại...");
        connectMQTT();
      }, 5000);
    }
  };

  client.onMessageArrived = (message) => {
    try {
      const data = JSON.parse(message.payloadString);
      console.log(
        `Dữ liệu nhận được từ topic ${message.destinationName}:`,
        data
      );
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }

      // Xử lý tin nhắn từ các topic riêng
      if (message.destinationName === "control/fan") {
        updateDeviceUI(
          "fan",
          data.active,
          data.value,
          "Tốc độ",
          "%",
          data.timestamp
        );
      } else if (message.destinationName === "control/mist") {
        updateDeviceUI(
          "mist",
          data.active,
          data.value,
          "Cường độ",
          "%",
          data.timestamp
        );
      } else if (message.destinationName === "control/heater") {
        updateDeviceUI(
          "heater",
          data.active,
          data.value,
          "Nhiệt độ",
          "°C",
          data.timestamp
        );
      } else if (message.destinationName === "light_sensor_module") {
        // Handle light_sensor_module data if needed
      }
    } catch (error) {
      console.error(
        `Lỗi khi xử lý dữ liệu từ topic ${message.destinationName}:`,
        error
      );
      setErrorState();
    }
  };
}

/* Kết nối tới broker */
function connectMQTT() {
  if (!client) {
    console.error("MQTT client không được khởi tạo");
    setErrorState();
    loadDeviceStatesFromLocalStorage();
    return;
  }

  if (client.isConnected()) {
    console.log("MQTT client đã được kết nối, bỏ qua kết nối mới");
    return;
  }

  setControlLoadingState();
  client.connect({
    useSSL: true,
    onSuccess: () => {
      console.log("Đã kết nối tới broker.emqx.io");
      // Subscribe vào các topic riêng
      const topics = ["control/fan", "control/mist", "control/heater"];
      topics.forEach((topic) => {
        client.subscribe(topic, {
          onSuccess: () => {
            console.log(`Đã subscribe topic ${topic}`);
            receivedInitialRetainedMessage = true; // Cập nhật khi nhận được retained message
          },
          onFailure: (err) => {
            console.error(
              `Lỗi khi subscribe topic ${topic}:`,
              err.errorMessage
            );
            setErrorState();
            loadDeviceStatesFromLocalStorage();
          },
        });
      });

      // Subscribe các topic khác nếu cần
      client.subscribe("dht22", {
        onSuccess: () => console.log("Đã subscribe topic dht22"),
        onFailure: (err) => {
          console.error("Lỗi khi subscribe topic dht22:", err.errorMessage);
          setErrorState();
        },
      });
      client.subscribe("light_sensor_module", {
        onSuccess: () => console.log("Đã subscribe topic light_sensor_module"),
        onFailure: (err) => {
          console.error(
            "Lỗi khi subscribe topic light_sensor_module:",
            err.errorMessage
          );
          setErrorState();
        },
      });

      // Wait briefly for retained messages to arrive before falling back to localStorage
      setTimeout(() => {
        if (!receivedInitialRetainedMessage) {
          console.log("Không nhận được retained message, dùng localStorage");
          loadDeviceStatesFromLocalStorage();
        }
      }, 2000); // Adjust timeout as needed
    },
    onFailure: (err) => {
      console.error("Lỗi kết nối MQTT:", err.errorMessage);
      setErrorState();
      loadDeviceStatesFromLocalStorage();
    },
  });
}

// Biến để theo dõi việc nhận retained message
let receivedInitialRetainedMessage = false;

/* Khởi tạo khi trang tải */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Trang đã tải, bắt đầu khởi tạo...");
    setupControlEvents();
    connectMQTT();
  },
  { once: true }
);

window.addEventListener("beforeunload", () => {
  if (client && client.isConnected()) {
    client.disconnect();
    console.log("Đã ngắt kết nối MQTT trước khi rời trang");
  }
});
