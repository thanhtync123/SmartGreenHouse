// Fetch data from the API
async function fetchDHT22Data() {
  try {
    const response = await fetch('http://localhost:3000/api/dht22readings');
    const data = await response.json();
    return data.data[0]; // Access the first object in the 'data' array
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

async function fetchDHT22DataAll() {
  try {
    const response = await fetch('http://localhost:3000/api/dht22readings/all');
    const data = await response.json();
    return data.data; // Access the first object in the 'data' array
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Initialize Chart.js
const ctx = document.getElementById('dht22Chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line', // Changed to bar chart
  data: {
    labels: ['Latest Reading'], // Single label for the latest data point
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [0], // Initial placeholder
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        yAxisID: 'y-temp' // Assign to temperature Y-axis
      },
      {
        label: 'Humidity (%)',
        data: [0], // Initial placeholder
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
        yAxisID: 'y-hum' // Assign to humidity Y-axis
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      'y-temp': {
        beginAtZero: true,
        position: 'left',
        title: {
          display: true,
          text: 'Temperature (°C)'
        }
      },
      'y-hum': {
        beginAtZero: true,
        position: 'right',
        title: {
          display: true,
          text: 'Humidity (%)'
        },
        grid: {
          drawOnChartArea: false // Avoid overlapping grid lines
        }
      },
      x: {
        title: {
          display: true,
          text: 'Reading'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Latest DHT22 Sensor Readings'
      }
    }
  }
});

// Update chart with fetched data
async function updateChart() {
  const readings = await fetchDHT22DataAll(); // Fetch all readings
  console.log('Fetched readings:', readings);
  if (readings && readings.length > 0) {
    // Prepare data for the chart
    chart.data.labels = readings.map(r => new Date(r.timestamp).toLocaleString());
    chart.data.datasets[0].data = readings.map(r => r.temperature || 0);
    chart.data.datasets[1].data = readings.map(r => r.humidity || 0);
    // Update chart title
    chart.options.plugins.title.text = `DHT22 Sensor Readings (Up to ${new Date(readings[0].timestamp).toLocaleString()})`;
    chart.update();
  } else {
    console.warn('No data available to display.');
  }
}

// Export chart as PNG
function exportChart() { 
  const link = document.createElement('a');
  link.href = chart.toBase64Image();
  link.download = 'dht22_chart.png';
  link.click();
}

// Toggle fullscreen mode
function toggleFullscreen() {
  const chartContainer = document.querySelector('.main-chart');
  if (!document.fullscreenElement) {
    chartContainer.requestFullscreen().catch(err => {
      console.error('Error attempting to enable fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Fetch and update chart on page load
updateChart();