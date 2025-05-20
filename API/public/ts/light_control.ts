const client = new Paho.MQTT.Client(
  "broker.emqx.io",
  8084,
  "client_" + Math.random()
);
client.connect({
  useSSL: true,
  onSuccess: () => {
    client.subscribe("light_sensor_module");
    console.log("Đã kết nối và subscribe.");
  },
});
// Lấy phần tử theo id
const manual_mode = document.getElementById("manual-mode");
const auto_mode = document.getElementById("auto-mode");
const tg_bulb = document.getElementById("tg_bulb");
// Sự kiện click cho nút thủ công
if (manual_mode) {
  manual_mode.addEventListener("click", function () {
    if (auto_mode) auto_mode.classList.remove("active");
    manual_mode.classList.add("active");
  });
}
// Sự kiện click cho nút tự động
if (auto_mode) {
  auto_mode.addEventListener("click", function () {
    if (manual_mode) manual_mode.classList.remove("active");
    auto_mode.classList.add("active");
  });
}

client.onMessageArrived = function (msg) {
  const json = JSON.parse(msg.payloadString);
  const brightness_percent = json.brightness_percent;
  if (tg_bulb && tg_bulb.parentElement) {
    if (brightness_percent == 0)
      tg_bulb.parentElement.classList.remove("active");
    else tg_bulb.parentElement.classList.add("active");
  }
  console.log(JSON.stringify(json, null, 2)); // In đẹp1123123
};
