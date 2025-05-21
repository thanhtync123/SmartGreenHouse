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

// Lấy phần tử DOM
const manual_mode = document.getElementById("manual-mode");
const auto_mode = document.getElementById("auto-mode");
const tg_bulb = document.getElementById("tg_bulb");
const btn_toggle_bulb = document.getElementById("btn_toggle_bulb");
const lb_brightness_percent = document.getElementById("brightness_percent");
const light_range = document.getElementById("light_range");
const roof_status = document.getElementById("roof_status");
const roof_slider = document.getElementById("roof_slider");
const btn_batden = document.getElementById(
  "btn_batden"
) as HTMLButtonElement | null;
const btn_tatden = document.getElementById(
  "btn_tatden"
) as HTMLButtonElement | null;

if (btn_batden) btn_batden.disabled = true;
if (btn_tatden) btn_tatden.disabled = true;

btn_batden?.addEventListener("click", function () {
  const message = new Paho.MQTT.Message(
    JSON.stringify({ mode: "auto", bulb: "high" })
  );
  message.destinationName = "light_sensor_module";
  client.send(message);
});
btn_tatden?.addEventListener("click", function () {
  const message = new Paho.MQTT.Message(
    JSON.stringify({ mode: "manual", bulb: "low" })
  );
  message.destinationName = "light_sensor_module";
  client.send(message);
});
// Gửi mode: manual
if (manual_mode) {
  manual_mode.addEventListener("click", function () {
    auto_mode?.classList.remove("active");
    manual_mode.classList.add("active");
    if (btn_batden) btn_batden.disabled = false;
    if (btn_tatden) btn_tatden.disabled = false;
  });
}

// Gửi mode: auto
if (auto_mode) {
  auto_mode.addEventListener("click", function () {
    manual_mode?.classList.remove("active");
    auto_mode.classList.add("active");
    if (btn_batden) btn_batden.disabled = true;
    if (btn_tatden) btn_tatden.disabled = true;
  });
}

// Nhận trạng thái từ MQTT và đồng bộ giao diện
client.onMessageArrived = function (msg) {
  const json = JSON.parse(msg.payloadString);
  const brightness_percent = json.brightness_percent;
  const roof_status_value = json.roofStatus?.toLowerCase();

  // Đồng bộ giao diện chỉ khi ở chế độ auto

  if (tg_bulb?.parentElement)
    tg_bulb.parentElement.classList.toggle("active", brightness_percent !== 0);

  if (lb_brightness_percent)
    lb_brightness_percent.innerText = brightness_percent + "%";

  if (light_range) (light_range as HTMLInputElement).value = brightness_percent;

  if (roof_slider?.parentElement)
    roof_slider.parentElement.classList.toggle(
      "active",
      roof_status_value === "open"
    );

  if (roof_status)
    roof_status.innerText =
      roof_status_value === "open" ? "Đang mở" : "Đang đóng";

  console.log("Dữ liệu gửi:", JSON.stringify(json, null, 2));
};
