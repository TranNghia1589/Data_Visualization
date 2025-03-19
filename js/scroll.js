let scrollTimeout = null;

function checkVisibility() {
    document.querySelectorAll(".chart-container:not(.visible)").forEach(chart => {
        let rect = chart.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            chart.classList.add("visible");
        }
    });
}

function optimizedScrollHandler() {
    if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
            checkVisibility();
            scrollTimeout = null;
        });
    }
}

document.addEventListener("scroll", optimizedScrollHandler);

document.addEventListener("DOMContentLoaded", checkVisibility);
