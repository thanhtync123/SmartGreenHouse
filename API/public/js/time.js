function updateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Ho_Chi_Minh'
        };
        const formattedTime = now.toLocaleString('en-EN', options);
        document.getElementById('current-time').textContent = formattedTime;
    }

    // Cập nhật thời gian ngay khi tải trang
    updateTime();
    // Cập nhật mỗi giây
    setInterval(updateTime, 1000);