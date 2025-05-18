// Initialize Chart.js (assumed to be included via <script> tag)
const ctx = document.getElementById('dht22Chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [],
        borderColor: '#e63946', // Red
        backgroundColor: 'rgba(230, 57, 70, 0.2)',
        fill: false,
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: '#457b9d', // Blue
        backgroundColor: 'rgba(69, 123, 157, 0.2)',
        fill: false,
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'DHT22 Sensor Readings',
      },
    },
    scales: {
      x: { title: { display: true, text: 'Timestamp' } },
      y: { title: { display: true, text: 'Value' } },
    },
  },
});

// Function to fetch data from API
async function fetchSensorData() {
  try {
    const response = await fetch('http://localhost:3000/api/dht22readings/all');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error.message);
    // Fallback to sample data
    return {
      data: [
        {
          id: 23419,
          temperature: 62.3,
          humidity: 70,
          timestamp: '2025-05-18T03:38:25.000Z',
        },
      ],
      meta: { limit: 1, offset: 0, total: 1 },
    };
  }
}



// Function to filter data based on time range
function filterData(data, timeRange) {
  const now = new Date();
  let startTime;
  switch (timeRange) {
    case 'Last 1 Hour':
      startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      break;
    case 'Last 3 Hours':
      startTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      break;
    case 'Last 24 Hours':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'Last 7 Days':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'Last 30 Days':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(0); // Include all
  }

  const filteredData = data.data.filter(record => {
    const recordTime = new Date(record.timestamp);
    return recordTime >= startTime && recordTime <= now;
  });

  return {
    data: filteredData,
    meta: { limit: data.meta.limit, offset: data.meta.offset, total: filteredData.length },
  };
}

// Function to update chart and averages
async function updateChartAndAverages(timeRange) {
  try {
    const apiData = await fetchSensorData();
    const readings = filterData(apiData, timeRange);
    console.log('Fetched readings:', readings);

    // Update chart
    if (readings.data && readings.data.length > 0) {
      chart.data.labels = readings.data.map(r =>
        new Date(r.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      chart.data.datasets[0].data = readings.data.map(r => r.temperature || 0);
      chart.data.datasets[1].data = readings.data.map(r => r.humidity || 0);
      chart.options.plugins.title.text = `DHT22 Sensor Readings (Up to ${new Date(
        readings.data[0].timestamp
      ).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })})`;
    } else {
      chart.data.labels = [];
      chart.data.datasets.forEach(ds => (ds.data = []));
      chart.options.plugins.title.text = 'DHT22 Sensor Readings (No Data)';
      console.warn('No data available to display.');
    }
    chart.update();

    // Update averages
    const averages = await calculateAverages(timeRange);
    const tempElement = document.getElementById('temperature');
    const humElement = document.getElementById('humidity');
    if (averages.dataCount > 0) {
      tempElement.innerHTML = `${averages.averageTemperature}<span class='card-unit'>°C</span>`;
      humElement.innerHTML = `${averages.averageHumidity}<span class='card-unit'>%</span>`;
    } else {
      tempElement.innerHTML = `N/A<span class='card-unit'>°C</span>`;
      humElement.innerHTML = `N/A<span class='card-unit'>%</span>`;
    }

    // Update dashboard with the same filtered data
    await updateDashboard(timeRange);
  } catch (error) {
    console.error('Error updating chart and averages:', error.message);
    document.getElementById('temperature').innerHTML = `N/A<span class='card-unit'>°C</span>`;
    document.getElementById('humidity').innerHTML = `N/A<span class='card-unit'>%</span>`;
    document.getElementById('error').textContent = 'Failed to load data. Please try again later.';
    document.getElementById('error').style.display = 'block';
  }
}

// Function to calculate averages from fetched data
async function calculateAverages(timeRange) {
  try {
    const apiData = await fetchSensorData();
    const readings = filterData(apiData, timeRange);

    if (readings.data && readings.data.length > 0) {
      const total = readings.data.length;
      const tempSum = readings.data.reduce((sum, r) => sum + (r.temperature || 0), 0);
      const humSum = readings.data.reduce((sum, r) => sum + (r.humidity || 0), 0);

      const avgTemperature = (tempSum / total).toFixed(1);
      const avgHumidity = (humSum / total).toFixed(1);
      console.log(`Average Temperature: ${avgTemperature}°C`);
      console.log(`Average Humidity: ${avgHumidity}%`);
      return {
        averageTemperature: avgTemperature,
        averageHumidity: avgHumidity,
        dataCount: total,
      };
    } else {
      console.warn('No data available for averages.');
      return {
        averageTemperature: 0,
        averageHumidity: 0,
        dataCount: 0,
      };
    }
  } catch (error) {
    console.error('Error calculating averages:', error.message);
    return {
      averageTemperature: 0,
      averageHumidity: 0,
      dataCount: 0,
    };
  }
}

// Export chart as PNG
function exportChart() {
  const link = document.createElement('a');
  link.href = chart.toBase64Image();
  link.download = 'dht22-chart.png';
  link.click();
}

// Toggle fullscreen mode
function toggleFullscreen() {
  const chartContainer = document.querySelector('.main-chart');
  if (!chartContainer) {
    console.error('Chart container not found.');
    return;
  }
  if (!document.fullscreenElement) {
    chartContainer.requestFullscreen().catch(err => {
      console.error('Error enabling fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Event listener for "Apply Filter" button
document.getElementById('apply-button').addEventListener('click', async () => {
  const timeRange = document.querySelector('.filter-select')?.value || 'Last 24 Hours';
  await updateChartAndAverages(timeRange);
  const apiData = await fetchSensorData();
  const filteredResult = filterData(apiData, timeRange);
});

// Event listener for "Export Chart" button
document.getElementById('export-button')?.addEventListener('click', exportChart);

// Event listener for "Fullscreen" button (if exists)
document.getElementById('fullscreen-button')?.addEventListener('click', toggleFullscreen);

// Fetch and update chart and averages on page load
window.addEventListener('load', async () => {
  const defaultTimeRange = 'Last 1 Hour';
  await updateChartAndAverages(defaultTimeRange);
});

// Global pagination variables
const recordsPerPage = 20;
let currentPage = 1;
let totalRecords = 0;
let totalPages = 0;

// Function to update dashboard with paginated data
async function updateDashboard(timeRange) {
  const loading = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const tableBody = document.getElementById('data-table-body');
  const paginationSpan = document.querySelector('.table-pagination span');
  const paginationControls = document.querySelector('.pagination-controls');

  try {
    loading.style.display = 'block';
    errorDiv.style.display = 'none';
    tableBody.innerHTML = '';
    console.log('Fetching data for dashboard...');

    const apiData = await fetchSensorData();
    const readings = filterData(apiData, timeRange);

    // Pagination calculations
    totalRecords = readings.data.length;
    totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedData = readings.data.slice(startIndex, endIndex);

    // Update table with paginated data
    paginatedData.forEach(item => {
      const status = item.status || determineStatus(item);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(item.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}</td>
        <td>${(item.temperature || 0).toFixed(1)}</td>
        <td>${item.humidity || 0}</td>
        <td>${item.light || 'N/A'}</td>
        <td>${item.soilMoisture || 'N/A'}</td>
        <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
      `;
      tableBody.appendChild(row);
    });

    // Update pagination info
    paginationSpan.textContent = `Hiển thị ${startIndex + 1} đến ${endIndex} trong ${totalRecords} bản ghi`;

    // Update pagination controls
    updatePaginationControls();

    if (readings.data.length === 0) {
      errorDiv.textContent = 'No data available for the selected time range.';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating dashboard:', error.message);
    errorDiv.textContent = 'Failed to load data. Please try again later.';
    errorDiv.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// Function to update pagination controls
function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
  paginationControls.innerHTML = ''; // Clear existing controls

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'pagination-button';
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updateDashboard(document.querySelector('.filter-select')?.value || 'Last 1 Hour');
    }
  });
  paginationControls.appendChild(prevButton);

  // Page number buttons
  const maxButtons = 5; // Maximum number of page buttons to show
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    const firstPageButton = createPageButton(1);
    paginationControls.appendChild(firstPageButton);
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      paginationControls.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = createPageButton(i);
    paginationControls.appendChild(pageButton);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      paginationControls.appendChild(ellipsis);
    }
    const lastPageButton = createPageButton(totalPages);
    paginationControls.appendChild(lastPageButton);
  }

  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'pagination-button';
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateDashboard(document.querySelector('.filter-select')?.value || 'Last 1 Hour');
    }
  });
  paginationControls.appendChild(nextButton);
}

// Helper function to create a page button
function createPageButton(page) {
  const button = document.createElement('button');
  button.className = 'pagination-button';
  button.textContent = page;
  button.classList.toggle('active', page === currentPage);
  button.addEventListener('click', () => {
    currentPage = page;
    updateDashboard(document.querySelector('.filter-select')?.value || 'Last 1 Hour');
  });
  return button;
}

// Update the event listener for "Apply Filter" button to reset pagination
document.getElementById('apply-button').addEventListener('click', async () => {
  currentPage = 1; // Reset to first page on filter change
  const timeRange = document.querySelector('.filter-select')?.value || 'Last 1 Hour';
  await updateChartAndAverages(timeRange);
});

// Fetch and update chart and dashboard on page load
window.addEventListener('load', async () => {
  currentPage = 1; // Initialize page
  const defaultTimeRange = 'Last 1 Hour';
  await updateChartAndAverages(defaultTimeRange);
});

    // Determine status based on sensor readings (if not provided by API)
    function determineStatus(item) {
      if (item.temperature > 40 || item.humidity > 80) return 'Warning';
      if (item.temperature < 10 || item.humidity < 20) return 'Error';
      return 'Optimal';
    }