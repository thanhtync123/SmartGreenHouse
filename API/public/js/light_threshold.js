"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const lightThresholdClient = new Paho.MQTT.Client("broker.emqx.io", 8084, "client_" + Math.random());
lightThresholdClient.connect({
    useSSL: true,
    onSuccess: () => {
        lightThresholdClient.subscribe("light_threshold");
        console.log("Đã kết nối và subscribe.");
        // Request current threshold after subscribing
        const requestMessage = new Paho.MQTT.Message("get_current_threshold");
        requestMessage.destinationName = "light_threshold/request";
        lightThresholdClient.send(requestMessage);
    },
});
const btn_threshold_set = document.getElementById("btn_threshold_set");
const txb_light_threshold = document.getElementById("txb_light_threshold");
const lb_current_threshold = document.getElementById("lb_current_threshold");
if (!btn_threshold_set || !txb_light_threshold || !lb_current_threshold) {
    console.error("Element not found");
    throw new Error("Element not found");
}
btn_threshold_set.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    const threshold = parseInt(txb_light_threshold.value);
    if (isNaN(threshold)) {
        alert("Please enter a valid number");
        return;
    }
    const message = new Paho.MQTT.Message(threshold.toString());
    message.destinationName = "light_threshold";
    lightThresholdClient.send(message);
}));
lightThresholdClient.onMessageArrived = (message) => {
    if (message.destinationName === "light_threshold") {
        const threshold = message.payloadString;
        console.log(threshold);
        lb_current_threshold.innerText = `${threshold}`;
    }
};
