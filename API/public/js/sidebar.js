// Kiểm tra trạng thái đăng nhập
function checkAuthentication() {
  const username = localStorage.getItem("username");
  if (!username) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

// Load sidebar và hiển thị thông tin người dùng
fetch("../sidebar.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("sidebar-container").innerHTML = html;

    // Đánh dấu menu active
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".menu-item").forEach((link) => {
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });

    // Thiết lập sự kiện cho nút đăng xuất
    document
      .getElementById("logout-btn")
      .addEventListener("click", function () {
        // Xóa thông tin người dùng từ localStorage
        localStorage.removeItem("username");
        localStorage.removeItem("role");

        // Gọi API đăng xuất
        fetch("/api/logout", {
          method: "POST",
        })
          .then(() => {
            window.location.href = "/login";
          })
          .catch((error) => {
            console.error("Lỗi khi đăng xuất:", error);
          });
      });

    // Hiển thị tên người dùng nếu có phần tử hiển thị
    const username = localStorage.getItem("username");
    const userDisplayElement = document.querySelector(".user-display");
    if (userDisplayElement && username) {
      userDisplayElement.textContent = username;
    }
  });

// Chạy kiểm tra xác thực ngay khi trang tải
document.addEventListener("DOMContentLoaded", checkAuthentication);
