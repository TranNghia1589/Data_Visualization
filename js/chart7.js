// Đọc file CSV và xử lý dữ liệu
d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: Dữ liệu CSV trống hoặc không hợp lệ!");
        return;
    }

    // Đếm tổng số đơn hàng
    let total_orders = new Set(data.map(d => d["Mã đơn hàng"])).size;

    // Nhóm theo 'Mã đơn hàng' -> lấy ra các nhóm hàng duy nhất trong mỗi đơn
    let orderGroups = d3.rollups(
        data,
        v => new Set(v.map(d => d["Tên nhóm hàng"])), 
        d => d["Mã đơn hàng"]
    );

    // Đếm số đơn hàng có nhóm hàng cụ thể
    let nhomHangCount = new Map();
    orderGroups.forEach(([orderID, nhomSet]) => {
        nhomSet.forEach(nhom => {
            nhomHangCount.set(nhom, (nhomHangCount.get(nhom) || 0) + 1);
        });
    });

    // Tạo danh sách dữ liệu cho biểu đồ
    let groupedData = Array.from(nhomHangCount, ([nhomHang, soLuongDon]) => ({
        "Nhóm Hàng": nhomHang,
        "Số đơn hàng có nhóm này": soLuongDon,
        "Xác suất (%)": (soLuongDon / total_orders) * 100
    }));

    // Sắp xếp giảm dần theo Xác suất (%)
    groupedData.sort((a, b) => b["Xác suất (%)"] - a["Xác suất (%)"]);

    // Kích thước biểu đồ
    let maxWidth = 700;
    let maxHeight = 500;
    let margin = { top: 50, right: 80, bottom: 80, left: 180 };
    let width = maxWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    // SVG Container
    let svg = d3.select("#chart7").append("svg")
        .attr("width", maxWidth)
        .attr("height", maxHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Trục Y (Nhóm hàng)
    let y = d3.scaleBand()
        .domain(groupedData.map(d => d["Nhóm Hàng"]))
        .range([0, height])
        .padding(0.3);

    // Trục X (Xác suất %)
    let x = d3.scaleLinear()
        .domain([0, d3.max(groupedData, d => d["Xác suất (%)"])])
        .range([0, width]);

    // Danh sách màu cho từng nhóm hàng
    let colorScale = d3.scaleOrdinal()
        .domain(groupedData.map(d => d["Nhóm Hàng"]))
        .range(d3.schemeSet3); // Chọn bảng màu Set3

    // Trục Y (Tên nhóm hàng)
    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .attr("fill", "#4CAF50");

    // Trục X (Xác suất %)
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d === 0 ? "0" : `${d.toFixed(0)}%`)) // Hiển thị số nguyên nếu là 0
        .selectAll("text")
        .style("font-size", "10px");

    // Tooltip
    let tooltip7 = d3.select("body").append("div")
        .attr("class", "tooltip7")
        .style("position", "absolute")
        .style("background", "rgba(39, 44, 47, 0.8)")
        .style("color", "white")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "12px");

    // Vẽ thanh ngang
    svg.selectAll(".bar")
        .data(groupedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d["Nhóm Hàng"]))
        .attr("x", 0)
        .attr("width", d => x(d["Xác suất (%)"]))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d["Nhóm Hàng"]))
        .on("mouseover", function(event, d) {
            tooltip7.style("display", "block")
                .html(`
                    <strong>${d["Nhóm Hàng"]}</strong><br>
                    📦 Đơn hàng: <strong>${d["Số đơn hàng có nhóm này"]}</strong> <br>
                    🎯 Xác suất: <strong>${d["Xác suất (%)"] === 0 ? "0" : d["Xác suất (%)"].toFixed(1) + "%"}</strong>
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip7.style("display", "none");
        });
    svg.selectAll(".label")
    .data(groupedData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x(d["Xác suất (%)"]) + 5) // Đẩy chữ ra ngoài thanh bar
    .attr("y", d => y(d["Nhóm Hàng"]) + y.bandwidth() / 2 + 5) // Canh giữa
    .text(d => d["Xác suất (%)"] === 0 ? "0" : `${d["Xác suất (%)"].toFixed(1)}%`) // Hiển thị số nguyên nếu là 0
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .attr("fill", "#333");
    // Tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .attr("fill", "#4CAF50")
        .text("📊 Xác suất xuất hiện của Nhóm hàng");

    // Nhãn trục X
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Xác suất xuất hiện (%)");
});
