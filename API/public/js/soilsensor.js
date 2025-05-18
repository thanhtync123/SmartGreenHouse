(function () {
  // Tạo client Paho MQTT
  const client = new Paho.MQTT.Client(
    "broker.emqx.io",
    8084,
    "webClient-soil-" + parseInt(Math.random() * 1000)
  );

  // Kết nối MQTT
  client.connect({
    useSSL: true,
    onSuccess: onConnect,
    onFailure: (e) => console.log("Kết nối thất bại: " + e.errorMessage),
  });

  // Khi kết nối thành công
  function onConnect() {
    console.log("Đã kết nối MQTT cho soil sensor!");
    client.subscribe("soil_sensor_pt");
  }

  // Xác định trạng thái độ ẩm đất
  function getSoilStatus(percent) {
    if (percent >= 60)
      return { class: "optimal", text: "Tối ưu", icon: "check-circle" };
    if (percent >= 35)
      return { class: "moderate", text: "Bình thường", icon: "leaf" };
    return { class: "danger", text: "Cần tưới", icon: "exclamation-circle" };
  }

  // Lưu thời gian cập nhật cuối
  let lastUpdate = null;

  // Cập nhật thời gian hiển thị
  function updateTimeAgo() {
    if (!lastUpdate) return;
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    const text =
      diff === 0
        ? "Vừa cập nhật"
        : diff < 60
        ? `Cập nhật ${diff} giây trước`
        : diff < 3600
        ? `Cập nhật ${Math.floor(diff / 60)} phút trước`
        : `Cập nhật ${Math.floor(diff / 3600)} giờ trước`;
    $(".card:has(.card-icon.soil) .card-footer span").first().text(text);
  }

  // Xử lý message MQTT
  client.onMessageArrived = (message) => {
    try {
      const data = JSON.parse(message.payloadString);
      const soilMoisture = data.soil_moisture;
      const status = getSoilStatus(soilMoisture);

      // Cập nhật card
      $("#soilsensor_value").html(
        `${soilMoisture}<span class='card-unit'>%</span>`
      );
      $(".card:has(.card-icon.soil) .progress.soil").css(
        "width",
        soilMoisture + "%"
      );
      $(".card:has(.card-icon.soil) .progress-info span:last-child").text(
        soilMoisture + "%"
      );
      const statusDiv = $(".card:has(.card-icon.soil) .card-footer .status");
      statusDiv.removeClass().addClass("status soil-status " + status.class);
      statusDiv.html(
        `<i class='fas fa-${status.icon}'></i><span>${status.text}</span>`
      );

      // Cập nhật thời gian
      lastUpdate = new Date();
      updateTimeAgo();

      // Thêm dữ liệu mới vào chart
      updateChartData(soilMoisture, lastUpdate);
    } catch (e) {
      console.error("Lỗi parse JSON: ", e);
    }
  };

  // Cập nhật thời gian mỗi 10s
  setInterval(updateTimeAgo, 10000);

  // Khởi tạo Chart.js
  let soilChartInstance = null;
  const chartData = {
    labels: [],
    values: [],
    timestamps: [],
  };

  // Lưu dữ liệu chart vào localStorage
  function saveChartData() {
    localStorage.setItem("soilChartData", JSON.stringify(chartData));
  }

  // Khôi phục dữ liệu chart từ localStorage
  function restoreChartData() {
    const savedData = localStorage.getItem("soilChartData");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      const now = Date.now();
      const fiveMinutesAgo = now - 300000; // 5 phút

      // Lọc dữ liệu trong 5 phút
      parsedData.timestamps.forEach((ts, index) => {
        if (ts >= fiveMinutesAgo) {
          chartData.labels.push(parsedData.labels[index]);
          chartData.values.push(parsedData.values[index]);
          chartData.timestamps.push(ts);
        }
      });
    }
  }

  function initChart() {
    const chartDiv = document.getElementById("soil-history-chart");
    let canvas = chartDiv.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      chartDiv.appendChild(canvas);
    }

    soilChartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Soil Moisture (%)",
            data: chartData.values,
            borderColor: "#4caf50",
            backgroundColor: "rgba(76,175,80,0.2)",
            pointBackgroundColor: "#fff",
            pointBorderColor: "#4caf50",
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { font: { size: 16, weight: "bold" } },
          },
          title: {
            display: true,
            text: "Biểu đồ độ ẩm đất (5 phút gần nhất)",
            font: { size: 20 },
          },
          tooltip: {
            backgroundColor: "#222",
            titleColor: "#4caf50",
            bodyColor: "#fff",
            borderColor: "#4caf50",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Thời gian", font: { size: 15 } },
            ticks: {
              color: "#333",
              font: { size: 13 },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 15,
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: "%", font: { size: 15 } },
            ticks: { color: "#333", font: { size: 13 } },
            grid: { color: "rgba(76,175,80,0.15)" },
          },
        },
      },
    });
  }

  // Cập nhật dữ liệu chart
  function updateChartData(soilMoisture, timestamp) {
    const date = new Date(timestamp);
    const label = date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Thêm dữ liệu mới
    chartData.labels.push(label);
    chartData.values.push(soilMoisture);
    chartData.timestamps.push(date.getTime());

    // Lọc dữ liệu trong 5 phút (300000 ms)
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    while (
      chartData.timestamps.length > 0 &&
      chartData.timestamps[0] < fiveMinutesAgo
    ) {
      chartData.labels.shift();
      chartData.values.shift();
      chartData.timestamps.shift();
    }

    // Cập nhật chart
    if (soilChartInstance) {
      soilChartInstance.update();
    }

    // Lưu dữ liệu vào localStorage
    saveChartData();
  }

  // AJAX cập nhật chart từ API
  function ajaxUpdateChart() {
    $.ajax({
      url: "/api/soilreading?limit=1",
      method: "GET",
      dataType: "json",
      success: (res) => {
        const data = res.data;
        if (!data || !data[0]) return;
        const soilMoisture = data[0].soil_moisture;
        const timestamp = new Date(data[0].timestamp);
        updateChartData(soilMoisture, timestamp);

        // Cập nhật card nếu không có MQTT
        const status = getSoilStatus(soilMoisture);
        $("#soilsensor_value").html(
          `${soilMoisture}<span class='card-unit'>%</span>`
        );
        $(".card:has(.card-icon.soil) .progress.soil").css(
          "width",
          soilMoisture + "%"
        );
        $(".card:has(.card-icon.soil) .progress-info span:last-child").text(
          soilMoisture + "%"
        );
        const statusDiv = $(".card:has(.card-icon.soil) .card-footer .status");
        statusDiv.removeClass().addClass("status soil-status " + status.class);
        statusDiv.html(
          `<i class='fas fa-${status.icon}'></i><span>${status.text}</span>`
        );
        lastUpdate = timestamp;
        updateTimeAgo();
      },
      error: (e) => console.error("Lỗi AJAX: ", e),
    });
  }

  // Khởi tạo khi trang tải
  $(document).ready(() => {
    restoreChartData(); // Khôi phục dữ liệu từ localStorage
    initChart();
    ajaxUpdateChart();
    setInterval(ajaxUpdateChart, 5000); // Cập nhật mỗi 5s
  });
})();
