// Biến flag để kiểm soát việc gọi checkVisibility
let scrollTimeout = null;

// Hàm kiểm tra tầm nhìn
function checkVisibility() {
    document.querySelectorAll(".chart-container:not(.visible)").forEach(chart => {
        let rect = chart.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            chart.classList.add("visible");
        }
    });
}

// Tối ưu sự kiện scroll bằng requestAnimationFrame
function optimizedScrollHandler() {
    if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
            checkVisibility();
            scrollTimeout = null;
        });
    }
}

// Gắn sự kiện scroll (tối ưu hơn)
document.addEventListener("scroll", optimizedScrollHandler);

// Chạy ngay khi trang tải xong
document.addEventListener("DOMContentLoaded", checkVisibility);
