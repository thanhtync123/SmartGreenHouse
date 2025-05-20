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
const lb_brightness_percent = document.getElementById("brightness_percent");
const light_range = document.getElementById("light_range");
const roof_status = document.getElementById("roof_status");
const roof_slider = document.getElementById("roof_slider");
// Sự kiện click cho nút thủ công
if (manual_mode) {
  manual_mode.addEventListener("click", function () {
    if (auto_mode) auto_mode.classList.remove("active");
    {
      manual_mode.classList.add("active");
      const message = new Paho.MQTT.Message(JSON.stringify({ mode: "manual" }));
      message.destinationName = "light_sensor_module";
      client.send(message);
    }
  });
}
// Sự kiện click cho nút tự động
if (auto_mode) {
  auto_mode.addEventListener("click", function () {
    if (manual_mode) manual_mode.classList.remove("active");
    {
      auto_mode.classList.add("active");
      const message = new Paho.MQTT.Message(JSON.stringify({ mode: "auto" }));
      message.destinationName = "light_sensor_module";
      client.send(message);
    }
  });
}

client.onMessageArrived = function (msg) {
  const json = JSON.parse(msg.payloadString);
  const brightness_percent = json.brightness_percent;
  const roof_status_value = json.roofStatus?.toLowerCase();

  if (tg_bulb?.parentElement)
    tg_bulb.parentElement.classList.toggle("active", brightness_percent !== 0);
  if (lb_brightness_percent)
    lb_brightness_percent.innerText = brightness_percent + "%";
  if (light_range) (light_range as HTMLInputElement).value = brightness_percent;
  if (roof_slider?.parentElement) {
    roof_slider.parentElement.classList.toggle(
      "active",
      roof_status_value === "open"
    );
  }
  if (roof_status)
    roof_status.innerText =
      roof_status_value === "open" ? "Đang mở" : "Đang đóng";

  console.log(JSON.stringify(json, null, 2)); // 1
};
