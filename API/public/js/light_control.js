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
