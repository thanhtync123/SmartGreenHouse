fetch("../sidebar.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("sidebar-container").innerHTML = html;
    // Đánh dấu menu active
    const path = location.pathname.split("/").pop();
    document.querySelectorAll(".menu-item").forEach((link) => {
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });
  });
