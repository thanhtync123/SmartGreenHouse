(function () {
  // Tạo client Paho MQTT
  const client = new Paho.MQTT.Client(
    "broker.emqx.io",
    8084,
    "webClient-pump-" + parseInt(Math.random() * 1000)
  );

  // Kết nối MQTT
  client.connect({
    useSSL: true,
    onSuccess: onConnect,
    onFailure: (e) => console.log("Kết nối thất bại: " + e.errorMessage),
  });

  // Khi kết nối thành công
  function onConnect() {
    console.log("Đã kết nối MQTT cho điều khiển máy bơm!");
    client.subscribe("soil_sensor_pt");
    client.subscribe("control_mode");
  }

  let currentMode = "auto"; // Mặc định chế độ tự động

  // Xử lý message MQTT
  client.onMessageArrived = (message) => {
    try {
      const data = JSON.parse(message.payloadString);
      if (message.destinationName === "soil_sensor_pt") {
        const isWatering = data.isWatering;
        const pumpStatus = isWatering ? "Bật" : "Tắt";
        const statusClass = isWatering ? "active" : "inactive";

        // Cập nhật giao diện
        $(".card.control-panel:has(.fa-faucet) .control-status")
          .removeClass("active inactive")
          .addClass(statusClass)
          .find("span")
          .text(isWatering ? "Đang hoạt động" : "Không hoạt động");
        $(".card.control-panel:has(.fa-faucet) .control-value").text(
          pumpStatus
        );
        $(".card.control-panel:has(.fa-faucet) .toggle-switch").toggleClass(
          "active",
          isWatering
        );
      } else if (message.destinationName === "control_mode") {
        currentMode = data.mode;
        // Vô hiệu hóa toggle nếu ở chế độ tự động
        $(".card.control-panel:has(.fa-faucet) .toggle-switch").prop(
          "disabled",
          currentMode === "auto"
        );
      }
    } catch (e) {
      console.error("Lỗi parse JSON: ", e, message.payloadString);
    }
  };

  // Xử lý toggle switch
  $(document).ready(() => {
    $(".card.control-panel:has(.fa-faucet) .toggle-switch").click(function () {
      if (currentMode !== "manual") {
        alert("Chỉ có thể điều khiển máy bơm ở chế độ Thủ công!");
        return;
      }
      const isActive = $(this).hasClass("active");
      const action = isActive ? "stop_pump" : "start_pump";
      const message = new Paho.MQTT.Message(JSON.stringify({ action }));
      message.destinationName = "pump_control";
      client.send(message);
    });

    // Xử lý chế độ
    $('input[name="mode"]').change(function () {
      const mode = $(this).val();
      const message = new Paho.MQTT.Message(JSON.stringify({ mode }));
      message.destinationName = "control_mode";
      client.send(message);
    });
  });
})();
