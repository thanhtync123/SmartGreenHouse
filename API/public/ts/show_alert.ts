// Interface định nghĩa cấu trúc dữ liệu cảnh báo
interface Alert {
  id: number;
  sensor_type: string;
  value: number;
  timestamp: string;
  message: string;
}

// Interface định nghĩa cấu trúc phản hồi từ API
interface AlertResponse {
  data: Alert[];
}

// Biến lưu trạng thái phân trang và lọc
let currentPage: number = 1;
let itemsPerPage: number = 5; // Số thông báo trên mỗi trang
let totalPages: number = 1;
let allAlerts: Alert[] = []; // Lưu toàn bộ dữ liệu để lọc và phân trang
let filteredAlerts: Alert[] = []; // Lưu dữ liệu sau khi lọc
let trashedAlerts: Alert[] = []; // Lưu thông báo đã xóa (đưa vào thùng rác)

// Enum định nghĩa các loại cảm biến
enum SensorType {
  ALL = "all",
  LIGHT = "bh1750",
  TEMPERATURE_HUMIDITY = "dht22",
  SOIL_MOISTURE = "soil_moisture",
}

// Hàm để định dạng thời gian từ timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) {
    return "Vừa xong";
  } else if (diffMin < 60) {
    return `${diffMin} phút trước`;
  } else if (diffHour < 24) {
    return `${diffHour} giờ trước`;
  } else if (diffDay === 1) {
    return `Hôm qua, ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()}, ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
}

// Hàm để xác định loại thông báo dựa trên loại cảm biến và giá trị
function determineAlertType(alert: Alert): string {
  // Có thể điều chỉnh logic này dựa trên yêu cầu cụ thể
  if (alert.sensor_type === "dht22" && alert.value > 30) {
    return "alert"; // Cảnh báo nghiêm trọng
  } else if (alert.sensor_type === "soil_moisture" && alert.value < 40) {
    return "warning"; // Cảnh báo
  } else if (alert.sensor_type === "bh1750" && alert.value > 5000) {
    return "alert"; // Cảnh báo nghiêm trọng
  } else if (alert.sensor_type === "bh1750" && alert.value > 3000) {
    return "warning"; // Cảnh báo
  } else {
    return "info"; // Thông tin
  }
}

// Hàm để xác định icon dựa trên loại thông báo
function determineAlertIcon(alertType: string): string {
  switch (alertType) {
    case "alert":
      return '<i class="fas fa-exclamation-circle"></i>';
    case "warning":
      return '<i class="fas fa-exclamation-triangle"></i>';
    case "info":
      return '<i class="fas fa-info-circle"></i>';
    default:
      return '<i class="fas fa-bell"></i>';
  }
}

// Hàm để tạo HTML cho một thông báo
function createAlertHTML(alert: Alert): string {
  const alertType = determineAlertType(alert);
  const alertIcon = determineAlertIcon(alertType);
  const formattedTime = formatTimestamp(alert.timestamp);

  return `
        <div class="notification-item unread ${alertType}" data-alert-id="${
    alert.id
  }">
            <div class="notification-icon">
                ${alertIcon}
            </div>
            <div class="notification-content">
                <div class="notification-title">${
                  alert.sensor_type === "bh1750"
                    ? "Cảnh báo ánh sáng"
                    : alert.sensor_type === "dht22"
                    ? "Cảnh báo nhiệt độ/độ ẩm"
                    : alert.sensor_type === "soil_moisture"
                    ? "Cảnh báo độ ẩm đất"
                    : "Cảnh báo hệ thống"
                }</div>
                <div class="notification-message">
                    ${alert.message}
                </div>
                <div class="notification-time">${formattedTime}</div>
            </div>
            <div class="notification-actions">
                <button class="action-icon"><i class="fas fa-check"></i></button>
                <button class="action-icon"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `;
}

// Hàm để cập nhật số lượng thông báo chưa đọc
function updateUnreadCount(alerts: Alert[]): void {
  const unreadCount = alerts.length; // Giả sử tất cả đều chưa đọc
  const notificationCountElement = document.querySelector(
    ".notification-count"
  );
  if (notificationCountElement) {
    notificationCountElement.textContent = `${unreadCount} chưa đọc`;
  }
}

// Hàm chính để fetch dữ liệu từ API và hiển thị
async function fetchAndDisplayAlerts(): Promise<void> {
  try {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.href = "login.html";
      return;
    }

    // Khôi phục thùng rác từ localStorage nếu có
    const trashedAlertsFromStorage = localStorage.getItem("trashedAlerts");
    if (trashedAlertsFromStorage) {
      trashedAlerts = JSON.parse(trashedAlertsFromStorage);
      console.log(
        "Đã khôi phục từ localStorage:",
        trashedAlerts.length,
        "thông báo"
      );
    }

    const response = await fetch("http://localhost:3000/api/alert_reading");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const alertData: AlertResponse = await response.json();
    console.log(
      "Tổng số thông báo từ API:",
      alertData.data ? alertData.data.length : 0
    );

    // Lưu tất cả thông báo để dùng cho lọc và phân trang
    allAlerts = alertData.data || [];

    // Loại bỏ các thông báo đã có trong thùng rác
    if (trashedAlerts.length > 0) {
      const trashedIds = trashedAlerts.map((alert) => alert.id);
      console.log("IDs đã xóa:", trashedIds);
      const filteredCount = allAlerts.length;
      allAlerts = allAlerts.filter((alert) => !trashedIds.includes(alert.id));
      console.log("Đã lọc bỏ:", filteredCount - allAlerts.length, "thông báo");
    }

    console.log(
      "Số thông báo còn lại sau khi loại bỏ thùng rác:",
      allAlerts.length
    );

    // Mặc định, ban đầu filteredAlerts sẽ chứa tất cả thông báo
    filteredAlerts = [...allAlerts]; // Hiển thị thông báo với phân trang
    displayAlerts(filteredAlerts);

    // Cập nhật số lượng thông báo chưa đọc
    updateUnreadCount(allAlerts);

    // Tạo các nút phân trang
    createPagination();
  } catch (error) {
    console.error("Lỗi khi fetch dữ liệu cảnh báo:", error);
    const notificationsListElement = document.querySelector(
      ".notifications-list"
    );
    if (notificationsListElement) {
      notificationsListElement.innerHTML =
        '<div class="no-notifications">Lỗi khi tải thông báo. Vui lòng thử lại sau.</div>';
    }
  }
}

// Hàm hiển thị thông báo với phân trang
function displayAlerts(alerts: Alert[]): void {
  const notificationsListElement = document.querySelector(
    ".notifications-list"
  );

  if (!notificationsListElement) return;

  // Luôn xóa sạch nội dung hiện có trước
  notificationsListElement.innerHTML = "";

  // Tính toán phân trang
  totalPages = Math.ceil(alerts.length / itemsPerPage);

  // Xác định chỉ mục bắt đầu và kết thúc cho trang hiện tại
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, alerts.length);

  // Lấy các mục cho trang hiện tại
  const currentPageAlerts = alerts.slice(startIndex, endIndex);

  if (currentPageAlerts.length > 0) {
    // Hiển thị thông báo cho trang hiện tại
    currentPageAlerts.forEach((alert) => {
      notificationsListElement.innerHTML += createAlertHTML(alert);
    });
  } else {
    notificationsListElement.innerHTML =
      '<div class="no-notifications">Không có thông báo phù hợp</div>';
  }

  // Thêm lại các sự kiện sau khi DOM đã được cập nhật
  addNotificationActions();
}

// Hàm tạo các nút phân trang
function createPagination(): void {
  const paginationContainer = document.querySelector(
    ".notifications-pagination"
  );
  if (!paginationContainer) return;

  paginationContainer.innerHTML = "";

  // Nút Previous
  const prevButton = document.createElement("button");
  prevButton.className = "pagination-button";
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayAlerts(filteredAlerts);
      createPagination();
    }
  });
  paginationContainer.appendChild(prevButton);

  // Các nút số trang
  const maxVisiblePages = 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Điều chỉnh startPage nếu không đủ trang ở cuối
  if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.className =
      "pagination-button" + (i === currentPage ? " active" : "");
    pageButton.textContent = i.toString();
    pageButton.addEventListener("click", () => {
      currentPage = i;
      displayAlerts(filteredAlerts);
      createPagination();
    });
    paginationContainer.appendChild(pageButton);
  }

  // Nút Next
  const nextButton = document.createElement("button");
  nextButton.className = "pagination-button";
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages || totalPages === 0;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayAlerts(filteredAlerts);
      createPagination();
    }
  });
  paginationContainer.appendChild(nextButton);
}

// Hàm lọc thông báo theo loại cảm biến
function filterAlertsBySensorType(sensorType: SensorType): void {
  // Reset trang về 1 khi lọc
  currentPage = 1;

  if (sensorType === SensorType.ALL) {
    filteredAlerts = [...allAlerts];
  } else {
    filteredAlerts = allAlerts.filter(
      (alert) => alert.sensor_type === sensorType
    );
  }

  displayAlerts(filteredAlerts);
  createPagination();
}

// Hàm để tìm thông báo theo ID trong mảng
function findAlertById(id: number, alertArray: Alert[]): Alert | undefined {
  return alertArray.find((alert) => alert.id === id);
}

// Hàm để đưa thông báo vào thùng rác
function moveToTrash(alertId: number): void {
  // Tìm thông báo trong mảng allAlerts
  const alertToTrash = findAlertById(alertId, allAlerts);

  if (alertToTrash) {
    // Thêm vào mảng trashedAlerts
    trashedAlerts.push(alertToTrash);

    // Lưu vào localStorage để giữ lại khi tải lại trang
    localStorage.setItem("trashedAlerts", JSON.stringify(trashedAlerts));

    // Xóa khỏi mảng allAlerts và filteredAlerts
    allAlerts = allAlerts.filter((alert) => alert.id !== alertId);
    filteredAlerts = filteredAlerts.filter((alert) => alert.id !== alertId);

    // Xóa phần tử khỏi DOM trực tiếp để hiệu ứng tức thì
    const notificationItem = document.querySelector(
      `.notification-item[data-alert-id="${alertId}"]`
    );
    if (notificationItem) {
      notificationItem.remove();
    }

    // Cập nhật hiển thị và phân trang
    displayAlerts(filteredAlerts);
    createPagination();
    updateUnreadCount(allAlerts); // Cập nhật số lượng thông báo chưa đọc

    // Hiển thị thông báo
    showTrashNotification();
  }
}

// Hàm hiển thị thông báo khi đưa vào thùng rác
function showTrashNotification(): void {
  const trashNotification = document.createElement("div");
  trashNotification.className = "trash-notification";
  trashNotification.innerHTML = `
    <div class="trash-message">Đã chuyển thông báo vào thùng rác</div>
    <button class="undo-button">Hoàn tác</button>
  `;

  document.body.appendChild(trashNotification);

  // Xử lý sự kiện nút hoàn tác
  const undoButton = trashNotification.querySelector(".undo-button");
  if (undoButton) {
    undoButton.addEventListener("click", () => {
      if (trashedAlerts.length > 0) {
        const lastTrashedAlert = trashedAlerts.pop();
        if (lastTrashedAlert) {
          allAlerts.push(lastTrashedAlert);
          filteredAlerts.push(lastTrashedAlert);

          // Lưu vào localStorage
          localStorage.setItem("trashedAlerts", JSON.stringify(trashedAlerts));

          // Cập nhật hiển thị
          displayAlerts(filteredAlerts);
          createPagination();
        }
      }
      trashNotification.remove();
    });
  }

  // Tự động ẩn thông báo sau 5 giây
  setTimeout(() => {
    trashNotification.remove();
  }, 5000);
}

// Hàm thêm sự kiện cho các nút đánh dấu đã đọc và xóa
function addNotificationActions(): void {
  document.querySelectorAll(".action-icon").forEach((button) => {
    button.addEventListener("click", function (this: HTMLElement) {
      const notificationItem = this.closest(".notification-item");
      if (notificationItem) {
        if (this.querySelector(".fa-check")) {
          notificationItem.classList.remove("unread");
          // Cập nhật lại số lượng chưa đọc
          const unreadItems = document.querySelectorAll(
            ".notification-item.unread"
          ).length;
          const notificationCountElement = document.querySelector(
            ".notification-count"
          );
          if (notificationCountElement) {
            notificationCountElement.textContent = `${unreadItems} chưa đọc`;
          }
        } else if (this.querySelector(".fa-trash-alt")) {
          // Lấy ID của thông báo
          const alertId = parseInt(
            notificationItem.getAttribute("data-alert-id") || "0"
          );
          if (alertId) {
            // Đưa vào thùng rác
            moveToTrash(alertId);
          } else {
            // Nếu không có ID thì xóa bình thường
            notificationItem.remove();
            // Cập nhật lại số lượng chưa đọc
            const unreadItems = document.querySelectorAll(
              ".notification-item.unread"
            ).length;
            const notificationCountElement = document.querySelector(
              ".notification-count"
            );
            if (notificationCountElement) {
              notificationCountElement.textContent = `${unreadItems} chưa đọc`;
            }
          }
        }
      }
    });
  });
}

// Lắng nghe sự kiện khi tài liệu đã tải xong
document.addEventListener("DOMContentLoaded", () => {
  // Kiểm tra xem có phải trang notifications.html không
  if (window.location.pathname.includes("notifications.html")) {
    fetchAndDisplayAlerts();

    // Thêm sự kiện cho nút "Đánh dấu đã đọc"
    const markAllReadButton = document.querySelector(".action-button");
    if (markAllReadButton) {
      markAllReadButton.addEventListener("click", () => {
        document
          .querySelectorAll(".notification-item.unread")
          .forEach((item) => {
            item.classList.remove("unread");
          });
        updateUnreadCount([]);
      });
    }

    // Xóa các nút lọc không cần thiết
    const filterButtons = document.querySelectorAll(".filter-button");
    for (let i = 1; i < filterButtons.length; i++) {
      if (filterButtons[i].textContent?.trim().toLowerCase() !== "tất cả") {
        filterButtons[i].remove();
      }
    }

    // Thêm sự kiện cho nút lọc "Tất cả"
    const allFilterButton = document.querySelector(".filter-button");
    if (allFilterButton) {
      allFilterButton.classList.add("active");
      allFilterButton.addEventListener("click", function () {
        filterAlertsBySensorType(SensorType.ALL);
      });
    }

    // Thêm nút lọc theo loại cảm biến vào giao diện người dùng
    const filterGroup = document.querySelector(".button-group");
    if (filterGroup) {
      // Thêm nút lọc ánh sáng
      const lightFilterButton = document.createElement("button");
      lightFilterButton.className = "filter-button";
      lightFilterButton.textContent = "Ánh sáng";
      lightFilterButton.addEventListener("click", () => {
        filterAlertsBySensorType(SensorType.LIGHT);
      });
      filterGroup.appendChild(lightFilterButton);

      // Thêm nút lọc nhiệt độ/độ ẩm
      const tempHumFilterButton = document.createElement("button");
      tempHumFilterButton.className = "filter-button";
      tempHumFilterButton.textContent = "Nhiệt độ & Độ ẩm";
      tempHumFilterButton.addEventListener("click", () => {
        filterAlertsBySensorType(SensorType.TEMPERATURE_HUMIDITY);
      });
      filterGroup.appendChild(tempHumFilterButton);

      // Thêm nút lọc độ ẩm đất
      const soilFilterButton = document.createElement("button");
      soilFilterButton.className = "filter-button";
      soilFilterButton.textContent = "Độ ẩm đất";
      soilFilterButton.addEventListener("click", () => {
        filterAlertsBySensorType(SensorType.SOIL_MOISTURE);
      });
      filterGroup.appendChild(soilFilterButton);
    }
  }
});

// Cập nhật dữ liệu mỗi 60 giây
setInterval(fetchAndDisplayAlerts, 60000);
