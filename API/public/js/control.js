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

/* Biến để theo dõi chế độ hiện tại */
let currentMode = "manual"; // Mặc định là thủ công

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

  // Chỉ cập nhật giao diện nếu ở chế độ thủ công hoặc khi nhận dữ liệu từ MQTT
  if (currentMode === "manual" || timestamp) {
    deviceStatus.innerHTML = `<span>${
      isActive ? "Đang hoạt động" : "Đã tắt"
    }</span>`;
    deviceStatus.className = `control-status ${isActive ? "active" : ""}`;
    deviceValue.textContent = `${label}: ${value}${unit}`;
    deviceToggle.className = `toggle-switch ${isActive ? "active" : ""} ${
      currentMode !== "manual" ? "disabled" : ""
    }`;
    deviceSlider.value = value;
    deviceSlider.disabled = currentMode !== "manual";
    deviceUpdated.textContent = getTimeAgo(timestamp);
  }

  // Lưu trạng thái thiết bị vào localStorage
  localStorage.setItem(
    `${device}-state`,
    JSON.stringify({ isActive, value, timestamp })
  );
}

/* Hàm gửi lệnh điều khiển qua MQTT */
function sendControlCommands(device, command) {
  try {
    if (!client || !client.isConnected()) {
      console.error("MQTT client chưa được kết nối");
      return;
    }
    const topic = `control/${device}`;
    const message = new Paho.MQTT.Message(JSON.stringify(command));
    message.destinationName = topic;
    message.retained = true;
    client.send(message);
    console.log(`Đã gửi lệnh điều khiển đến ${topic}:`, command);
  } catch (error) {
    console.error(`Lỗi khi gửi lệnh điều khiển đến ${device}:`, error);
  }
}

/* Hàm gửi lệnh chế độ qua MQTT */
function sendModeCommand(mode) {
  try {
    if (!client || !client.isConnected()) {
      console.error("MQTT client chưa được kết nối");
      return;
    }
    const topic = "control/mode";
    const message = new Paho.MQTT.Message(JSON.stringify({ mode }));
    message.destinationName = topic;
    message.retained = true;
    client.send(message);
    console.log(`Đã gửi lệnh chế độ đến ${topic}:`, { mode });
  } catch (error) {
    console.error("Lỗi khi gửi lệnh chế độ:", error);
    setErrorState();
  }
}

/* Hàm cập nhật trạng thái điều khiển dựa trên chế độ */
function updateControlState() {
  const devices = ["fan", "mist", "heater"];
  devices.forEach((device) => {
    const toggle = document.getElementById(`${device}-toggle`);
    const slider = document.getElementById(`${device}-slider`);

    if (!toggle || !slider) {
      console.error(`Element for device '${device}' not found in DOM`);
      return;
    }

    if (currentMode === "auto") {
      toggle.classList.add("disabled");
      slider.disabled = true;
      toggle.style.pointerEvents = "none";
      slider.style.pointerEvents = "none";
    } else {
      toggle.classList.remove("disabled");
      slider.disabled = false;
      toggle.style.pointerEvents = "auto";
      slider.style.pointerEvents = "auto";
    }
  });
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

    toggle.addEventListener("click", () => {
      if (currentMode !== "manual") return; // Chỉ cho phép ở chế độ thủ công
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

    slider.addEventListener("change", () => {
      if (currentMode !== "manual") return; // Chỉ cho phép ở chế độ thủ công
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

/* Hàm xử lý sự kiện chọn chế độ */
function setupModeSelection() {
  const modeOptions = {
    "auto-mode": "auto",
    "manual-mode": "manual",
    "schedule-mode": "schedule",
  };

  Object.keys(modeOptions).forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with ID '${id}' not found in DOM`);
      return;
    }

    element.addEventListener("click", () => {
      document.querySelectorAll(".mode-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      element.classList.add("active");

      currentMode = modeOptions[id];
      console.log(`Chuyển sang chế độ: ${currentMode}`);

      sendModeCommand(currentMode);
      updateControlState();
    });
  });
}

/* Hàm tải trạng thái thiết bị từ localStorage */
function loadDeviceStatesFromLocalStorage() {
  const devices = ["fan", "mist", "heater"];
  devices.forEach((device) => {
    const state = localStorage.getItem(`${device}-state`);
    if (state) {
      try {
        const { isActive, value, timestamp } = JSON.parse(state);
        const label =
          device === "fan"
            ? "Tốc độ"
            : device === "mist"
            ? "Cường độ"
            : "Nhiệt độ";
        const unit = device === "heater" ? "°C" : "%";
        updateDeviceUI(device, isActive, value, label, unit, timestamp);
      } catch (error) {
        console.error(
          `Lỗi khi tải trạng thái từ localStorage cho ${device}:`,
          error
        );
      }
    }
  });
}

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

/* Biến để theo dõi việc nhận retained message */
let receivedInitialRetainedMessage = false;

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

  /* Callback khi nhận được tin nhắn MQTT */
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

      if (message.destinationName === "control/mode") {
        currentMode = data.mode;
        document.querySelectorAll(".mode-option").forEach((opt) => {
          opt.classList.remove("active");
        });
        const modeElement = document.getElementById(`${data.mode}-mode`);
        if (modeElement) {
          modeElement.classList.add("active");
        }
        updateControlState();
      } else if (message.destinationName === "control/fan") {
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
      } else if (
        message.destinationName === "dht22" &&
        currentMode === "auto"
      ) {
        // Auto mode logic for dht22 data
        const { temperature, humidity, timestamp } = data;

        // Fan: Turn on if temperature > 30°C
        const fanState = {
          active: temperature > 20,
          value: temperature > 20 ? 50 : 0, // Example: 50% speed
          timestamp: timestamp || new Date().toISOString(),
        };
        sendControlCommands("fan", fanState);
        updateDeviceUI(
          "fan",
          fanState.active,
          fanState.value,
          "Tốc độ",
          "%",
          fanState.timestamp
        );

        // Mist: Turn on if humidity < 50%
        const mistState = {
          active: humidity < 50,
          value: humidity < 50 ? 50 : 0, // Example: 50% intensity
          timestamp: timestamp || new Date().toISOString(),
        };
        sendControlCommands("mist", mistState);
        updateDeviceUI(
          "mist",
          mistState.active,
          mistState.value,
          "Cường độ",
          "%",
          mistState.timestamp
        );

        // Heater: Turn on if temperature < 20°C
        const heaterState = {
          active: temperature < 20,
          value: temperature < 20 ? 25 : 0, // Example: 25°C
          timestamp: timestamp || new Date().toISOString(),
        };
        sendControlCommands("heater", heaterState);
        updateDeviceUI(
          "heater",
          heaterState.active,
          heaterState.value,
          "Nhiệt độ",
          "°C",
          heaterState.timestamp
        );
      } else if (message.destinationName === "light_sensor_module") {
        // Xử lý dữ liệu từ light_sensor_module nếu cần
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
      const topics = [
        "control/fan",
        "control/mist",
        "control/heater",
        "control/mode",
        "dht22",
        // "light_sensor_module",
      ];
      topics.forEach((topic) => {
        client.subscribe(topic, {
          onSuccess: () => {
            console.log(`Đã subscribe topic ${topic}`);
            receivedInitialRetainedMessage = true;
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

      setTimeout(() => {
        if (!receivedInitialRetainedMessage) {
          console.log("Không nhận được retained message, dùng localStorage");
          loadDeviceStatesFromLocalStorage();
        }
      }, 2000);
    },
    onFailure: (err) => {
      console.error("Lỗi kết nối MQTT:", err.errorMessage);
      setErrorState();
      loadDeviceStatesFromLocalStorage();
    },
  });
}

/* Khởi tạo khi trang tải */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Trang đã tải, bắt đầu khởi tạo...");
    setupControlEvents();
    setupModeSelection();
    connectMQTT();
  },
  { once: true }
);

/* Ngắt kết nối MQTT khi rời trang */
window.addEventListener("beforeunload", () => {
  if (client && client.isConnected()) {
    client.disconnect();
    console.log("Đã ngắt kết nối MQTT trước khi rời trang");
  }
});
