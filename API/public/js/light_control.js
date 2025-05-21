"use strict";
const client = new Paho.MQTT.Client("broker.emqx.io", 8084, "client_" + Math.random());
client.connect({
    useSSL: true,
    onSuccess: () => {
        client.subscribe("light_module_state");
        console.log("Đã kết nối và subscribe.");
    },
});
alert("10");
const lb_trthaiden = document.getElementById("lb_trthaiden");
const lb_trthaimaiche = document.getElementById("lb_trthaimaiche");
const btn_batden = document.getElementById("btn_batden");
const btn_tatden = document.getElementById("btn_tatden");
const btn_momaiche = document.getElementById("btn_momaiche");
const btn_dongmaiche = document.getElementById("btn_dongmaiche");
const manualMode = document.getElementById("manual-mode");
const autoMode = document.getElementById("auto-mode");
if (!btn_batden ||
    !btn_tatden ||
    !btn_momaiche ||
    !btn_dongmaiche ||
    !lb_trthaiden ||
    !lb_trthaimaiche ||
    !manualMode ||
    !autoMode) {
    console.error("Một hoặc nhiều phần tử không tồn tại trong DOM.");
    throw new Error("Một hoặc nhiều phần tử không tồn tại trong DOM.");
}
btn_batden.hidden = true;
btn_tatden.hidden = true;
btn_momaiche.hidden = true;
btn_dongmaiche.hidden = true;
client.onMessageArrived = (message) => {
    if (message.destinationName === "light_module_state") {
        const data = JSON.parse(message.payloadString);
        if (typeof data.bulb_state === "number") {
            lb_trthaiden.textContent =
                data.bulb_state === 1 ? "Đang bật" : "Đang tắt";
        }
        if (typeof data.roof_state === "number") {
            lb_trthaimaiche.textContent =
                data.roof_state === 1 ? "Đang bật" : "Đang tắt";
        }
    }
};
manualMode.addEventListener("click", () => {
    manualMode.style.backgroundColor = "#90caf9"; // Lighter blue
    autoMode.style.backgroundColor = "white"; // Lighter gray
    btn_batden.style.display = "block";
    btn_tatden.style.display = "block";
    btn_momaiche.style.display = "block";
    btn_dongmaiche.style.display = "block";
});
autoMode.addEventListener("click", () => {
    const message = new Paho.MQTT.Message(JSON.stringify({ action: "no", mode: "auto" }));
    message.destinationName = "light_module_control";
    client.send(message);
    manualMode.style.backgroundColor = "white"; // Lighter gray
    autoMode.style.backgroundColor = "#90caf9"; // Lighter blue
    btn_batden.style.display = "none";
    btn_tatden.style.display = "none";
    btn_momaiche.style.display = "none";
    btn_dongmaiche.style.display = "none";
});
btn_batden.addEventListener("click", () => {
    const message = new Paho.MQTT.Message(JSON.stringify({ action: "turn_on_light", mode: "manual" }));
    message.destinationName = "light_module_control";
    client.send(message);
});
btn_tatden.addEventListener("click", () => {
    const message = new Paho.MQTT.Message(JSON.stringify({ action: "turn_off_light", mode: "manual" }));
    message.destinationName = "light_module_control";
    client.send(message);
});
btn_momaiche.addEventListener("click", () => {
    const message = new Paho.MQTT.Message(JSON.stringify({ action: "open_roof", mode: "manual" }));
    message.destinationName = "light_module_control";
    client.send(message);
});
btn_dongmaiche.addEventListener("click", () => {
    const message = new Paho.MQTT.Message(JSON.stringify({ action: "close_roof", mode: "manual" }));
    message.destinationName = "light_module_control";
    client.send(message);
});
