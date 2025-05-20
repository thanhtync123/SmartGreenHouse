// Initialize Chart.js
const ctx = document.getElementById("dht22Chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "#e63946",
        backgroundColor: "rgba(230, 57, 70, 0.2)",
        fill: false,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderColor: "#457b9d",
        backgroundColor: "rgba(69, 123, 157, 0.2)",
        fill: false,
      },
      {
        label: "Light Intensity (lux)",
        data: [],
        borderColor: "#f4a261",
        backgroundColor: "rgba(244, 162, 97, 0.2)",
        fill: false,
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: "DHT22 & BH1750 Sensor Readings",
      },
    },
    scales: {
      x: { title: { display: true, text: "Timestamp" } },
      y: { title: { display: true, text: "Value" } },
    },
  },
});

// Function to fetch data from API
async function fetchDHT22Data() {
  try {
    const response = await fetch("http://localhost:3000/api/dht22readings/all");
    if (!response.ok) throw new Error("Failed to fetch DHT22 data");
    const data = await response.json();
    console.log("DHT22 Data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching DHT22 data:", error.message);
    throw error;
  }
}

async function fetchLightData() {
  try {
    const response = await fetch("http://localhost:3000/api/bh1750reading");
    if (!response.ok) throw new Error("Failed to fetch light data");
    const data = await response.json();
    console.log("BH1750 Data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching light data:", error.message);
    throw error;
  }
}

// Function to fetch sensor data for averages (DHT22 only)
async function fetchSensorData() {
  return await fetchDHT22Data();
}

// Function to filter data based on time range
function filterData(data, timeRange) {
  const now = new Date();
  let startTime;
  let endTime = now;

  // Check if datetime pickers are being used
  const startDatePicker = document.getElementById("start-date");
  const endDatePicker = document.getElementById("end-date");

  if (startDatePicker.value && endDatePicker.value) {
    // Use datetime picker values
    startTime = new Date(startDatePicker.value);
    endTime = new Date(endDatePicker.value);
  } else {
    // Use select dropdown values
    switch (timeRange) {
      case "Last 1 Hour":
        startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case "Last 3 Hours":
        startTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        break;
      case "Last 24 Hours":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "Last 7 Days":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "Last 30 Days":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(0);
    }
  }

  const filteredData = data.data.filter((record) => {
    const recordTime = new Date(record.timestamp);
    return recordTime >= startTime && recordTime <= endTime;
  });

  return {
    data: filteredData,
    meta: {
      limit: data.meta?.limit || 1000,
      offset: data.meta?.offset || 0,
      total: filteredData.length,
    },
  };
}

// Function to calculate averages from DHT22 data
async function calculateAverages(timeRange) {
  try {
    const [dhtApiData, lightApiData] = await Promise.all([
      fetchDHT22Data(),
      fetchLightData(),
    ]);

    const dhtReadings = filterData(dhtApiData, timeRange);
    const lightReadings = filterData(lightApiData, timeRange);

    const total = dhtReadings.data.length;

    if (total > 0) {
      const tempSum = dhtReadings.data.reduce(
        (sum, r) => sum + (r.temperature || 0),
        0
      );
      const humSum = dhtReadings.data.reduce(
        (sum, r) => sum + (r.humidity || 0),
        0
      );

      // Đồng bộ độ dài dữ liệu ánh sáng theo dhtReadings để tính trung bình ánh sáng
      const lightValues = dhtReadings.data.map((_, index) => {
        const lightRecord = lightReadings.data[index];
        return lightRecord ? lightRecord.light_intensity || 0 : 0;
      });

      const lightSum = lightValues.reduce((sum, l) => sum + l, 0);

      const avgTemperature = (tempSum / total).toFixed(1);
      const avgHumidity = (humSum / total).toFixed(1);
      const avgLight = (lightSum / total).toFixed(1);

      return {
        averageTemperature: avgTemperature,
        averageHumidity: avgHumidity,
        averageLight: avgLight,
        dataCount: total,
      };
    } else {
      return {
        averageTemperature: 0,
        averageHumidity: 0,
        averageLight: 0,
        dataCount: 0,
      };
    }
  } catch (error) {
    console.error("Error calculating averages:", error.message);
    return {
      averageTemperature: 0,
      averageHumidity: 0,
      averageLight: 0,
      dataCount: 0,
    };
  }
}

// Function to update chart and averages
async function updateChartAndAverages(timeRange) {
  try {
    const [dhtData, lightData] = await Promise.all([
      fetchDHT22Data(),
      fetchLightData(),
    ]);

    const dhtReadings = filterData(dhtData, timeRange);
    const lightReadings = filterData(lightData, timeRange);

    // Log để kiểm tra dữ liệu
    console.log("Filtered DHT Readings:", dhtReadings);
    console.log("Filtered Light Readings:", lightReadings);

    // Tạo nhãn từ dữ liệu DHT22
    chart.data.labels = dhtReadings.data.map((r) =>
      new Date(r.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    // Lấy trạng thái của các checkbox
    const showTempHumid = document.getElementById("show-temp-humid").checked;
    const showLight = document.getElementById("show-light").checked;

    // Cập nhật dữ liệu và hiển thị cho từng dataset
    chart.data.datasets[0].data = showTempHumid
      ? dhtReadings.data.map((r) => r.temperature || 0)
      : [];
    chart.data.datasets[0].hidden = !showTempHumid;

    chart.data.datasets[1].data = showTempHumid
      ? dhtReadings.data.map((r) => r.humidity || 0)
      : [];
    chart.data.datasets[1].hidden = !showTempHumid;

    chart.data.datasets[2].data = showLight
      ? chart.data.labels.map((_, index) => {
          const lightRecord = lightReadings.data[index];
          return lightRecord ? lightRecord.light_intensity || 0 : 0;
        })
      : [];
    chart.data.datasets[2].hidden = !showLight;

    // Kiểm tra dữ liệu ánh sáng
    if (showLight && chart.data.datasets[2].data.every((val) => val === 0)) {
      console.warn("No valid light intensity data to display.");
    }

    chart.options.plugins.title.text = `Sensor Readings (Updated ${new Date().toLocaleString()})`;
    chart.update();

    // Cập nhật giá trị trung bình
    const averages = await calculateAverages(timeRange);
    document.getElementById(
      "temperature"
    ).innerHTML = `${averages.averageTemperature}<span class='card-unit'>°C</span>`;
    document.getElementById(
      "humidity"
    ).innerHTML = `${averages.averageHumidity}<span class='card-unit'>%</span>`;
    document.getElementById(
      "tb_light"
    ).innerHTML = `${averages.averageLight}<span class='card-unit'> lux</span>`;
    await updateDashboard(timeRange);
  } catch (error) {
    console.error("Error updating chart and averages:", error.message);
    document.getElementById(
      "temperature"
    ).innerHTML = `N/A<span class='card-unit'>°C</span>`;
    document.getElementById(
      "humidity"
    ).innerHTML = `N/A<span class='card-unit'>%</span>`;
    document.getElementById("error").textContent =
      "Failed to load data. Please try again later.";
    document.getElementById("error").style.display = "block";
  }
}

// Export chart as PNG
function exportChart() {
  const link = document.createElement("a");
  link.href = chart.toBase64Image();
  link.download = "sensor-chart.png";
  link.click();
}

// Toggle fullscreen mode
function toggleFullscreen() {
  const chartContainer = document.querySelector(".main-chart");
  if (!chartContainer) {
    console.error("Chart container not found.");
    return;
  }
  if (!document.fullscreenElement) {
    chartContainer.requestFullscreen().catch((err) => {
      console.error("Error enabling fullscreen:", err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Global pagination variables
const recordsPerPage = 20;
let currentPage = 1;
let totalRecords = 0;
let totalPages = 0;

// Function to update dashboard with paginated data
async function updateDashboard(timeRange) {
  const loading = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const tableBody = document.getElementById("data-table-body");
  const paginationSpan = document.querySelector(".table-pagination span");
  const paginationControls = document.querySelector(".pagination-controls");

  try {
    loading.style.display = "block";
    errorDiv.style.display = "none";
    tableBody.innerHTML = "";
    console.log("Fetching data for dashboard...");

    const [dhtData, lightData] = await Promise.all([
      fetchDHT22Data(),
      fetchLightData(),
    ]);

    const dhtReadings = filterData(dhtData, timeRange);
    const lightReadings = filterData(lightData, timeRange);

    // Kết hợp dữ liệu DHT22 và BH1750
    let combinedData = dhtReadings.data.map((dht, index) => ({
      ...dht,
      light_intensity: lightReadings.data[index]?.light_intensity || "N/A",
    }));

    // Filter by date if date pickers have values
    const tableStartDate = document.getElementById("table-start-date").value;
    const tableEndDate = document.getElementById("table-end-date").value;

    if (tableStartDate && tableEndDate) {
      combinedData = filterTableByDate(
        combinedData,
        new Date(tableStartDate),
        new Date(tableEndDate)
      );
    }

    // Pagination calculations
    totalRecords = combinedData.length;
    totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedData = combinedData.slice(startIndex, endIndex);

    // Update table with paginated data
    paginatedData.forEach((item) => {
      const status = determineStatus(item);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(item.timestamp).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}</td>
        <td>${(item.temperature || 0).toFixed(1)}</td>
        <td>${item.humidity || 0}</td>
        <td>${item.light_intensity || "N/A"}</td>
        <td>${item.soilMoisture || "N/A"}</td>
        <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
      `;
      tableBody.appendChild(row);
    });

    // Update pagination info
    paginationSpan.textContent = `Hiển thị ${
      startIndex + 1
    } đến ${endIndex} trong ${totalRecords} bản ghi`;

    // Update pagination controls
    updatePaginationControls();

    if (combinedData.length === 0) {
      errorDiv.textContent = "No data available for the selected time range.";
      errorDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error updating dashboard:", error.message);
    errorDiv.textContent = "Failed to load data. Please try again later.";
    errorDiv.style.display = "block";
  } finally {
    loading.style.display = "none";
  }
}

// Function to update pagination controls
function updatePaginationControls() {
  const paginationControls = document.querySelector(".pagination-controls");
  paginationControls.innerHTML = "";

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.className = "pagination-button";
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updateDashboard(
        document.querySelector(".filter-select")?.value || "Last 1 Hour"
      );
    }
  });
  paginationControls.appendChild(prevButton);

  // Page number buttons
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    const firstPageButton = createPageButton(1);
    paginationControls.appendChild(firstPageButton);
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      paginationControls.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = createPageButton(i);
    paginationControls.appendChild(pageButton);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      paginationControls.appendChild(ellipsis);
    }
    const lastPageButton = createPageButton(totalPages);
    paginationControls.appendChild(lastPageButton);
  }

  // Next button
  const nextButton = document.createElement("button");
  nextButton.className = "pagination-button";
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateDashboard(
        document.querySelector(".filter-select")?.value || "Last 1 Hour"
      );
    }
  });
  paginationControls.appendChild(nextButton);
}

// Helper function to create a page button
function createPageButton(page) {
  const button = document.createElement("button");
  button.className = "pagination-button";
  button.textContent = page;
  button.classList.toggle("active", page === currentPage);
  button.addEventListener("click", () => {
    currentPage = page;
    updateDashboard(
      document.querySelector(".filter-select")?.value || "Last 1 Hour"
    );
  });
  return button;
}

// Determine status based on sensor readings
function determineStatus(item) {
  if (item.temperature > 40 || item.humidity > 80) return "Warning";
  if (item.temperature < 10 || item.humidity < 20) return "Error";
  return "Optimal";
}

// Initialize datetime pickers
function initializeDateTimePickers() {
  // Chart datetime pickers
  const startDatePicker = flatpickr("#start-date", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    locale: "vi",
    onChange: function (selectedDates, dateStr) {
      // Update end date picker's min date
      endDatePicker.set("minDate", selectedDates[0]);
    },
  });

  const endDatePicker = flatpickr("#end-date", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    locale: "vi",
    onChange: function (selectedDates, dateStr) {
      // Update start date picker's max date
      startDatePicker.set("maxDate", selectedDates[0]);
    },
  });

  // Table datetime pickers
  const tableStartDatePicker = flatpickr("#table-start-date", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    locale: "vi",
    onChange: function (selectedDates, dateStr) {
      // Update table end date picker's min date
      tableEndDatePicker.set("minDate", selectedDates[0]);
    },
  });

  const tableEndDatePicker = flatpickr("#table-end-date", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    locale: "vi",
    onChange: function (selectedDates, dateStr) {
      // Update table start date picker's max date
      tableStartDatePicker.set("maxDate", selectedDates[0]);
    },
  });

  return {
    startDatePicker,
    endDatePicker,
    tableStartDatePicker,
    tableEndDatePicker,
  };
}

// Function to filter table data by date range
function filterTableByDate(data, startDate, endDate) {
  if (!startDate || !endDate) return data;

  return data.filter((record) => {
    const recordDate = new Date(record.timestamp);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

// Add event listeners
document.getElementById("apply-button").addEventListener("click", async () => {
  currentPage = 1;
  const timeRange =
    document.querySelector(".filter-select")?.value || "Last 1 Hour";
  await updateChartAndAverages(timeRange);
});

document
  .getElementById("export-button")
  ?.addEventListener("click", exportChart);

document
  .getElementById("fullscreen-button")
  ?.addEventListener("click", toggleFullscreen);

// Add event listeners for checkboxes
document.getElementById("show-temp-humid").addEventListener("change", () => {
  const timeRange =
    document.querySelector(".filter-select")?.value || "Last 1 Hour";
  updateChartAndAverages(timeRange);
});

document.getElementById("show-light").addEventListener("change", () => {
  const timeRange =
    document.querySelector(".filter-select")?.value || "Last 1 Hour";
  updateChartAndAverages(timeRange);
});

// Add event listener for table search button
document.getElementById("table-search-button").addEventListener("click", () => {
  currentPage = 1; // Reset to first page when searching
  const timeRange =
    document.querySelector(".filter-select")?.value || "Last 1 Hour";
  updateDashboard(timeRange);
});

// Initialize on page load
window.addEventListener("load", async () => {
  currentPage = 1;
  const defaultTimeRange = "Last 1 Hour";
  initializeDateTimePickers();
  await updateChartAndAverages(defaultTimeRange);
});
