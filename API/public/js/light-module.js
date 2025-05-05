$(document).ready(function() {
  // Load sidebar component and set active menu
  loadComponent('#sidebar-container', 'components/sidebar.html', function() {
    setActiveMenu('nav-light');
  });
  
  // MQTT Configuration
  const MQTT_CONFIG = {
    broker: "broker.emqx.io",
    port: 8083,
    clientId: "mqttx_470f24bd",
    topics: {
      greenhouse: "myapp/greenhouse"  // Topic duy nhất cho tất cả dữ liệu và điều khiển
    },
    reconnectTimeout: 3000,
    cleanSession: true
  };
  
  // Variables
  let mqttClient = null;
  let reconnectCount = 0;
  let chartVisible = true;
  let chart = null;
  let isChartInitialized = false;
  let maxDataPoints = 20;
  let lightStatus = false;
  let curtainStatus = false;
  let currentLightIntensity = 0;
  let lightThreshold = 300;
  let curtainThreshold = 1000;
  let lightDataHistory = [];
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // UI Configuration
  const UI_CONFIG = {
    lightThresholds: {
      low: 100,
      medium: 500
    },
    colors: {
      lowLight: "#e0e0e0",
      mediumLight: "#fff8e1",
      brightLight: "#fffde7"
    }
  };
  
  // Initialize
  init();
  
  /**
   * Initialize the application
   */
  function init() {
    initMQTT();
    initializeChart();
    updateLightStatusDisplay();
    updateCurtainStatusDisplay();
    setupEventListeners();

  }
  
  /**
   * Update threshold displays in the UI
   */
  function updateThresholdDisplays() {
    $('#display-light-threshold, #display-light-threshold-upper').text(lightThreshold);
    $('#display-curtain-threshold, #display-curtain-threshold-lower').text(curtainThreshold);
  }
  
  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Light threshold change
    $('#light-threshold').on('input', function() {
      const value = $(this).val();
      $('#light-threshold-value').text(value + " lux");
      $('#display-light-threshold, #display-light-threshold-upper').text(value);
    });
    
    // Curtain threshold change
    $('#curtain-threshold').on('input', function() {
      const value = $(this).val();
      $('#curtain-threshold-value').text(value + " lux");
      $('#display-curtain-threshold, #display-curtain-threshold-lower').text(value);
    });
    
    // Save settings
    $('#save-settings').click(saveSettings);
    
    // Chart controls
    $('#toggleChart').on('click', toggleChart);
    $('#dataPointsLimit').on('change', changeDataPointLimit);
    
    // Device control buttons
    $('.btn-toggle-light').on('click', function() {
      toggleLight(!lightStatus);
    });
    
    $('.btn-toggle-curtain').on('click', function() {
      toggleCurtain(!curtainStatus);
    });
  }
  
  /**
   * Toggle light status
   * @param {boolean} turnOn - True to turn on, false to turn off
   */
  function toggleLight(turnOn) {
    const command = turnOn ? "light_on" : "light_off";
    sendControlCommand(command);
    // Optimistic update
    lightStatus = turnOn;
    updateLightStatusDisplay();
  }
  
  /**
   * Toggle curtain status
   * @param {boolean} close - True to close, false to open
   */
  function toggleCurtain(close) {
    const command = close ? "curtain_close" : "curtain_open";
    sendControlCommand(command);
    // Optimistic update
    curtainStatus = close;
    updateCurtainStatusDisplay();
  }
  
  /**
   * Cập nhật hiển thị trạng thái đèn
   */
  function updateLightStatusDisplay() {
    const statusElement = $('#light-status');
    
    if (lightStatus) {
      statusElement.text("ĐANG BẬT");
      statusElement.removeClass('status-off').addClass('status-indicator status-on');
    } else {
      statusElement.text("ĐANG TẮT");
      statusElement.removeClass('status-on').addClass('status-indicator status-off');
    }
  }
  
  /**
   * Cập nhật hiển thị trạng thái rèm
   */
  function updateCurtainStatusDisplay() {
    const statusElement = $('#curtain-status');
    
    if (curtainStatus) {
      statusElement.text("ĐANG ĐÓNG");
      statusElement.removeClass('curtain-open').addClass('status-indicator curtain-closed');
    } else {
      statusElement.text("ĐANG MỞ");
      statusElement.removeClass('curtain-closed').addClass('status-indicator curtain-open');
    }
  }
  
  /**
   * Khởi tạo kết nối MQTT
   */
  function initMQTT() {
    const uniqueClientId = generateUniqueClientId();
    console.log("Khởi tạo kết nối MQTT với ID: " + uniqueClientId);
    
    mqttClient = new Paho.MQTT.Client(
      MQTT_CONFIG.broker,
      Number(MQTT_CONFIG.port),
      uniqueClientId
    );
    
    setupMQTTCallbacks(mqttClient);
    connectMQTT(mqttClient);
    
    window.addEventListener('beforeunload', function() {
      if (mqttClient && mqttClient.isConnected()) {
        mqttClient.disconnect();
        console.log("Đã ngắt kết nối MQTT khi rời khỏi trang");
      }
    });
  }
  
  /**
   * Tạo ID client duy nhất
   */
  function generateUniqueClientId() {
    const timestamp = new Date().getTime().toString();
    const random = Math.random().toString(36).substring(2, 10);
    return MQTT_CONFIG.clientId + '_' + timestamp + '_' + random;
  }
  
  function setupMQTTCallbacks(client) {
    client.onConnectionLost = function(response) {
      handleConnectionLost(client, response);
    };
    
    client.onMessageArrived = function(message) {
      handleMessageArrived(message);
    };
  }
  
  function connectMQTT(client) {
    if (!client.isConnected()) {
      reconnectCount = 0;
    }
    
    client.connect({
      onSuccess: function() {
        onConnectSuccess(client);
      },
      useSSL: false,
      timeout: 10,
      keepAliveInterval: 30,
      cleanSession: MQTT_CONFIG.cleanSession,
      onFailure: function(message) {
        console.log("Kết nối MQTT thất bại: " + message.errorMessage);
        handleReconnect(client);
      }
    });
  }
  
  function handleReconnect(client) {
    reconnectCount++;
    
    if (reconnectCount <= MAX_RECONNECT_ATTEMPTS) {
      const timeout = MQTT_CONFIG.reconnectTimeout * Math.pow(2, reconnectCount - 1);
      const maxTimeout = 30000;
      const waitTime = Math.min(timeout, maxTimeout);
      
      console.log(`Thử kết nối lại lần ${reconnectCount}/${MAX_RECONNECT_ATTEMPTS} sau ${waitTime/1000} giây...`);
      
      $("#light-intensity").text("Đang kết nối lại...");
      
      setTimeout(function() {
        if (reconnectCount > 2) {
          const newUniqueId = generateUniqueClientId();
          console.log("Thử với ID mới: " + newUniqueId);
          
          mqttClient = new Paho.MQTT.Client(
            MQTT_CONFIG.broker,
            Number(MQTT_CONFIG.port),
            newUniqueId
          );
          
          setupMQTTCallbacks(mqttClient);
          connectMQTT(mqttClient);
        } else {
          connectMQTT(client);
        }
      }, waitTime);
    } else {
      console.log("Đã vượt quá số lần thử kết nối lại tối đa");
      $("#light-intensity").text("Lỗi kết nối");
    }
  }
  
  function onConnectSuccess(client) {
    console.log("Đã kết nối MQTT thành công");
    reconnectCount = 0;
    client.subscribe(MQTT_CONFIG.topics.greenhouse);
    $("#light-intensity").text("Đang chờ dữ liệu...");
  }
  
  function handleConnectionLost(client, response) {
    console.log("Mất kết nối MQTT: " + response.errorMessage);
    
    if (response.errorCode === 142) {
      console.log("Phát hiện lỗi 'Session taken over' - Tạo ID mới và kết nối lại");
      setTimeout(function() {
        initMQTT();
      }, 1000);
    } 
    else if (response.errorCode !== 0) {
      handleReconnect(client);
    }
  }
  
  function handleMessageArrived(message) {
    console.log("Nhận tin nhắn MQTT: " + message.payloadString);
    
    try {
      const data = JSON.parse(message.payloadString);
      
      // Cập nhật trạng thái đèn nếu có
      if (data.light_status !== undefined) {
        lightStatus = data.light_status === "on";
        updateLightStatusDisplay();
      }
      
      // Cập nhật trạng thái rèm nếu có
      if (data.curtain_status !== undefined) {
        curtainStatus = data.curtain_status === "closed";
        updateCurtainStatusDisplay();
      }
      
      // Xử lý phản hồi cập nhật ngưỡng
      if (data.update_status === "success") {
        showNotification("Thiết bị đã áp dụng ngưỡng mới thành công!", "success");
        
        // Cập nhật giá trị ngưỡng hiển thị nếu khác với giá trị đã gửi
        if (data.light_threshold) {
          $('#light-threshold').val(data.light_threshold);
          $('#light-threshold-value').text(data.light_threshold + " lux");
          lightThreshold = parseInt(data.light_threshold);
          $('#display-light-threshold, #display-light-threshold-upper').text(data.light_threshold);
        }
        
        if (data.curtain_threshold) {
          $('#curtain-threshold').val(data.curtain_threshold);
          $('#curtain-threshold-value').text(data.curtain_threshold + " lux");
          curtainThreshold = parseInt(data.curtain_threshold);
          $('#display-curtain-threshold, #display-curtain-threshold-lower').text(data.curtain_threshold);
        }
      }
      
      // Xử lý dữ liệu ánh sáng và trạng thái
      if (data.light_value !== undefined) {
        updateLightData(data.light_value);
        
        if (data.current_light_threshold !== undefined && 
            data.current_light_threshold !== lightThreshold) {
          $('#light-threshold').val(data.current_light_threshold);
          $('#light-threshold-value').text(data.current_light_threshold + " lux");
          lightThreshold = parseInt(data.current_light_threshold);
          $('#display-light-threshold, #display-light-threshold-upper').text(data.current_light_threshold);
        }
        
        if (data.current_curtain_threshold !== undefined && 
            data.current_curtain_threshold !== curtainThreshold) {
          $('#curtain-threshold').val(data.current_curtain_threshold);
          $('#curtain-threshold-value').text(data.current_curtain_threshold + " lux");
          curtainThreshold = parseInt(data.current_curtain_threshold);
          $('#display-curtain-threshold, #display-curtain-threshold-lower').text(data.current_curtain_threshold);
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý dữ liệu MQTT: " + error.message);
    }
  }
  
  /**
   * Send control command through MQTT
   * @param {string} command - Command string
   */
  function sendControlCommand(command) {
    if (!mqttClient || !mqttClient.isConnected()) {
      showNotification("Không thể kết nối đến thiết bị. Vui lòng thử lại sau!", "error");
      return;
    }
    
    console.log("Chuẩn bị gửi lệnh: " + command);
    
    const message = new Paho.MQTT.Message(command);
    message.destinationName = MQTT_CONFIG.topics.greenhouse;
    
    try {
      mqttClient.send(message);
      console.log("Đã gửi lệnh thành công: " + command);
      showNotification("Đã gửi lệnh " + command, "success");
    } catch (error) {
      console.error("Lỗi khi gửi lệnh: ", error);
      showNotification("Lỗi khi gửi lệnh: " + error.message, "error");
    }
  }
  
  /**
   * Send JSON command through MQTT
   * @param {Object} commandObj - Command object
   */
  function sendJsonCommand(commandObj) {
    if (!mqttClient || !mqttClient.isConnected()) {
      showNotification("Không thể kết nối đến thiết bị. Vui lòng thử lại sau!", "error");
      return;
    }
    
    const jsonStr = JSON.stringify(commandObj);
    const message = new Paho.MQTT.Message(jsonStr);
    message.destinationName = MQTT_CONFIG.topics.greenhouse;
    
    try {
      mqttClient.send(message);
      console.log("Đã gửi lệnh JSON thành công: ", commandObj);
    } catch (error) {
      console.error("Lỗi khi gửi lệnh JSON: ", error);
      showNotification("Lỗi khi gửi cài đặt: " + error.message, "error");
    }
  }
  
  /**
   * Update light data
   * @param {number|string} lightValue - Light intensity value
   */
  function updateLightData(lightValue) {
    currentLightIntensity = parseFloat(lightValue);
    
    $("#light-intensity").text(Math.round(currentLightIntensity));
    $('#last-updated').text("Cập nhật lần cuối: " + new Date().toLocaleTimeString());
    
    updateLightCardStyle(currentLightIntensity);
    addDataPoint(currentLightIntensity);
  }
  
  /**
   * Update light card style based on light intensity
   * @param {number} lightValue - Light intensity value
   */
  function updateLightCardStyle(lightValue) {
    const lightCard = $("#light-intensity-card");
    lightValue = parseInt(lightValue);
    
    if (lightValue < UI_CONFIG.lightThresholds.low) {
      lightCard.css("background-color", UI_CONFIG.colors.lowLight);
    } else if (lightValue < UI_CONFIG.lightThresholds.medium) {
      lightCard.css("background-color", UI_CONFIG.colors.mediumLight);
    } else {
      lightCard.css("background-color", UI_CONFIG.colors.brightLight);
    }
  }
  
  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success/error)
   */
  function showNotification(message, type) {
    const bgColor = type === 'success' ? '#4CAF50' : '#F44336';
    
    $('<div>')
      .addClass('notification')
      .css({
        backgroundColor: bgColor,
        color: 'white'
      })
      .text(message)
      .appendTo('body')
      .fadeIn()
      .delay(3000)
      .fadeOut(function() {
        $(this).remove();
      });
  }
  
  /**
   * Initialize chart
   */
  function initializeChart() {
    if (isChartInitialized) return;
    
    const ctx = $('#lightChart')[0].getContext('2d');
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Cường độ ánh sáng (lux)",
          data: [],
          borderColor: "#FF9900",
          backgroundColor: "rgba(255, 153, 0, 0.1)",
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            title: { display: true, text: "Thời gian" }
          },
          y: {
            grid: { color: "rgba(0, 0, 0, 0.05)" },
            title: { display: true, text: "Cường độ ánh sáng (lux)" }
          }
        }
      }
    });
    
    isChartInitialized = true;
  }
  
  /**
   * Add data point to chart
   * @param {number} value - Data point value
   */
  function addDataPoint(value) {
    const now = new Date();
    lightDataHistory.push({
      timestamp: now,
      value: value
    });
    
    if (lightDataHistory.length > maxDataPoints) {
      lightDataHistory = lightDataHistory.slice(lightDataHistory.length - maxDataPoints);
    }
    
    if (chartVisible && isChartInitialized) {
      updateChart();
    }
  }
  
  /**
   * Update chart with current data
   */
  function updateChart() {
    if (!chartVisible || !isChartInitialized || lightDataHistory.length === 0) return;

    const timestamps = lightDataHistory.map(item => item.timestamp.toLocaleTimeString());
    const values = lightDataHistory.map(item => item.value);

    chart.data.labels = timestamps;
    chart.data.datasets[0].data = values;
    chart.update('none'); // Use 'none' to avoid expensive animations
  }
  
  /**
   * Toggle chart visibility
   */
  function toggleChart() {
    chartVisible = !chartVisible;
    const chartContainer = $('#chartContainer');
    const toggleText = $('#toggleChartText');
    const toggleIcon = $('#toggleChart').find('i');
    
    if (chartVisible) {
      chartContainer.css('height', '300px');
      toggleText.text('Ẩn biểu đồ');
      toggleIcon.removeClass('fa-eye-slash').addClass('fa-eye');
      
      initializeChart();
      updateChart();
    } else {
      chartContainer.css('height', '0');
      toggleText.text('Hiển thị biểu đồ');
      toggleIcon.removeClass('fa-eye').addClass('fa-eye-slash');
    }
  }
  
  /**
   * Change data point limit
   */
  function changeDataPointLimit() {
    maxDataPoints = parseInt($(this).val());
    
    if (lightDataHistory.length > maxDataPoints) {
      lightDataHistory = lightDataHistory.slice(lightDataHistory.length - maxDataPoints);
    }
    
    if (chartVisible && isChartInitialized) {
      updateChart();
    }
  }
});