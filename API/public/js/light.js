(function() {
    // Tạo client Paho MQTT
    const client = new Paho.MQTT.Client("broker.emqx.io", 8084, "webClient-" + parseInt(Math.random() * 1000));

    // Kết nối MQTT
    client.connect({
        useSSL: true,
        onSuccess: onConnect,
        onFailure: (e) => console.log("Kết nối thất bại: " + e.errorMessage)
    });

    // Khi kết nối thành công
    function onConnect() {
        console.log("Đã kết nối MQTT!");
        client.subscribe("light_sensor");
    }

    // Xác định trạng thái ánh sáng
    function getLightStatus(lux) {
        if (lux >= 32000) return { class: "sunny", text: "Trời nắng", icon: "sun" };
        if (lux >= 1000) return { class: "cloudy", text: "Trời nhiều mây", icon: "cloud" };
        if (lux >= 100) return { class: "rainy", text: "Mưa", icon: "cloud-showers-heavy" };
        return { class: "danger", text: "Dưới ngưỡng", icon: "exclamation-circle" };
    }

    // Lưu thời gian cập nhật cuối
    let lastUpdate = null;

    // Cập nhật thời gian hiển thị
    function updateTimeAgo() {
        if (!lastUpdate) return;
        const now = new Date();
        const diff = Math.floor((now - lastUpdate) / 1000);
        const text = diff === 0 ? "Vừa cập nhật" :
                     diff < 60 ? `Cập nhật ${diff} giây trước` :
                     diff < 3600 ? `Cập nhật ${Math.floor(diff / 60)} phút trước` :
                     `Cập nhật ${Math.floor(diff / 3600)} giờ trước`;
        $(".card:has(.card-icon.light) .card-footer span").first().text(text);
    }

    // Xử lý message MQTT
    client.onMessageArrived = (message) => {
        try {
            const data = JSON.parse(message.payloadString);
            const lux = data.light;
            const percent = Math.round(((lux - 1) / (65535 - 1)) * 100);
            const status = getLightStatus(lux);

            // Cập nhật card
            $(".card:has(.card-icon.light) #light_value").html(`${lux}<span class='card-unit'>lux</span>`);
            $(".card:has(.card-icon.light) .progress.light").css("width", percent + "%");
            $(".card:has(.card-icon.light) .progress-info span:last-child").text(percent + "%");
            const statusDiv = $(".card:has(.card-icon.light) .card-footer .status");
            statusDiv.removeClass().addClass("status light-status " + status.class);
            statusDiv.html(`<i class='fas fa-${status.icon}'></i><span>${status.text}</span>`);

            // Cập nhật thời gian
            lastUpdate = new Date();
            updateTimeAgo();

            // Thêm dữ liệu mới vào chart
            updateChartData(lux, lastUpdate);
        } catch (e) {
            console.error("Lỗi parse JSON: ", e);
        }
    };

    // Cập nhật thời gian mỗi 10s
    setInterval(updateTimeAgo, 10000);

    // Khởi tạo Chart.js
    let lightChartInstance = null;
    const chartData = {
        labels: [],
        values: [],
        timestamps: []
    };

    // Lưu dữ liệu chart vào localStorage
    function saveChartData() {
        localStorage.setItem('chartData', JSON.stringify(chartData));
    }

    // Khôi phục dữ liệu chart từ localStorage
    function restoreChartData() {
        const savedData = localStorage.getItem('chartData');
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
        const chartDiv = document.getElementById("light-history-chart");
        let canvas = chartDiv.querySelector("canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            chartDiv.appendChild(canvas);
        }

        lightChartInstance = new Chart(canvas, {
            type: "line",
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: "Light Intensity (lux)",
                    data: chartData.values,
                    borderColor: "#ffd600",
                    backgroundColor: "rgba(255,214,0,0.2)",
                    pointBackgroundColor: "#fff",
                    pointBorderColor: "#ffd600",
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { font: { size: 16, weight: 'bold' } } },
                    title: { display: true, text: 'Biểu đồ ánh sáng (5 phút gần nhất)', font: { size: 20 } },
                    tooltip: { backgroundColor: '#222', titleColor: '#ffd600', bodyColor: '#fff', borderColor: '#ffd600', borderWidth: 1 }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Thời gian', font: { size: 15 } },
                        ticks: { color: '#333', font: { size: 13 }, maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 15 }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Lux', font: { size: 15 } },
                        ticks: { color: '#333', font: { size: 13 } },
                        grid: { color: 'rgba(255,214,0,0.15)' }
                    }
                }
            }
        });
    }

    // Cập nhật dữ liệu chart
    function updateChartData(lux, timestamp) {
        const date = new Date(timestamp);
        const label = date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Thêm dữ liệu mới
        chartData.labels.push(label);
        chartData.values.push(lux);
        chartData.timestamps.push(date.getTime());

        // Lọc dữ liệu trong 5 phút (300000 ms)
        const now = Date.now();
        const fiveMinutesAgo = now - 300000;
        while (chartData.timestamps.length > 0 && chartData.timestamps[0] < fiveMinutesAgo) {
            chartData.labels.shift();
            chartData.values.shift();
            chartData.timestamps.shift();
        }

        // Cập nhật chart
        if (lightChartInstance) {
            lightChartInstance.update();
        }

        // Lưu dữ liệu vào localStorage
        saveChartData();
    }

    // AJAX cập nhật chart từ API
    function ajaxUpdateChart() {
        $.ajax({
            url: '/api/bh1750reading?limit=1',
            method: 'GET',
            dataType: 'json',
            success: (res) => {
                const data = res.data;
                if (!data || !data[0]) return;
                const lux = data[0].light_intensity;
                const timestamp = new Date(data[0].timestamp);
                updateChartData(lux, timestamp);

                // Cập nhật card nếu không có MQTT
                const percent = Math.round(((lux - 1) / (65535 - 1)) * 100);
                const status = getLightStatus(lux);
                $(".card:has(.card-icon.light) #light_value").html(`${lux}<span class='card-unit'>lux</span>`);
                $(".card:has(.card-icon.light) .progress.light").css("width", percent + "%");
                $(".card:has(.card-icon.light) .progress-info span:last-child").text(percent + "%");
                const statusDiv = $(".card:has(.card-icon.light) .card-footer .status");
                statusDiv.removeClass().addClass("status light-status " + status.class);
                statusDiv.html(`<i class='fas fa-${status.icon}'></i><span>${status.text}</span>`);
                lastUpdate = timestamp;
                updateTimeAgo();
            },
            error: (e) => console.error("Lỗi AJAX: ", e)
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