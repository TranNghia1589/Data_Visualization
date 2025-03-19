// Đọc dữ liệu từ tệp CSV
d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    // Kiểm tra dữ liệu có hợp lệ không
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    // Chuyển đổi ngày tháng từ cột "Thời gian tạo đơn"
    let parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S"); // Định dạng có cả giờ
    data.forEach(d => {
        d["Thời gian tạo đơn"] = parseDate(d["Thời gian tạo đơn"]);
        d["Tháng"] = `Tháng ${d3.timeFormat("%m")(d["Thời gian tạo đơn"])}`; // Định dạng "Tháng 01", "Tháng 02"...
    });

    // Nhóm dữ liệu theo tháng
    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0), // Tổng số lượng
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) // Tổng doanh số
        }),
        d => d["Tháng"] // Nhóm theo "Tháng xx"
    );

    // Chuyển đổi dữ liệu sang định dạng phù hợp để vẽ biểu đồ
    let processedData = groupedData.map(([thang, values]) => ({
        "Tháng": thang,
        "SL": values["SL"],
        "Thành tiền": values["Thành tiền"]
    }));

    // Sắp xếp dữ liệu theo thứ tự tháng
    processedData.sort((a, b) => d3.ascending(a["Tháng"], b["Tháng"]));

    console.log(processedData);

    // Xác định kích thước của biểu đồ
    let container = d3.select("#chart3").node().getBoundingClientRect();
    let maxWidth = 1000, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth);
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 20, bottom: 50, left: 50 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    // Tạo SVG chứa biểu đồ
    let svg = d3.select("#chart3")
        .append("svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight);

    // Thêm tiêu đề biểu đồ
    svg.append("text")
        .attr("x", fullWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#0077b6")
        .text("Doanh số bán hàng theo Tháng");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tạo thang đo cho trục X (tháng)
    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Tháng"]))
        .range([0, width])
        .padding(0.2);

    // Tạo thang đo cho trục Y (doanh số)
    let maxValue = d3.max(processedData, d => d["Thành tiền"]); // Lấy giá trị lớn nhất
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 100000000) * 100000000]) // Giới hạn động, bội số của 100M
        .range([height, 0]);

    // Tạo bảng màu cho Tháng
    let color = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));

    // Vẽ trục X
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Vẽ trục Y
    chartGroup.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d / 1000000}M`));

    // Đường lưới trục Y
    chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width) // Kéo dài đường lưới
            .tickFormat("") // Ẩn nhãn trục Y
        )
        .selectAll("line")
        .style("stroke", "#ddd"); // Màu đường lưới
    // Xoá đường viền 2 trục
    chartGroup.selectAll(".domain").remove();

    // Tạo tooltip hiển thị thông tin khi hover vào cột
    let tooltip1 = d3.select("body").append("div")
        .attr("class", "tooltip1")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "11px");

    // Vẽ các cột trong biểu đồ
    chartGroup.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Tháng"]))
        .attr("y", d => y(d["Thành tiền"]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d["Thành tiền"]))
        .attr("fill", d => color(d["Tháng"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`<strong>${d["Tháng"]}</strong><br>
                    Doanh số bán: ${Math.round(d["Thành tiền"] / 1_000_000).toLocaleString("vi-VN")} triệu VND <br>
                    Số lượng bán: ${d3.format(",.0f")(d["SL"])} SKUs
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip1.style("display", "none");
        });

    // Thêm nhãn giá trị doanh số vào trên mỗi cột
    chartGroup.selectAll(".label")
        .data(processedData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d["Tháng"]) + x.bandwidth() / 2)
        .attr("y", d => y(d["Thành tiền"]) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${d3.format(",.0f")(Math.round(d["Thành tiền"] / 1_000_000))} triệu VND`);
});
