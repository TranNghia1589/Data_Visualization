d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    // Kiểm tra dữ liệu có hợp lệ không
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }
    // Chuyển đổi dữ liệu ngày tháng
    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        d["Ngày trong tháng"] = d3.timeFormat("Ngày %d")(d["Thời gian tạo đơn"]);
        d["Count_dayofmonths"] = d3.timeFormat("%Y-%m")(d["Thời gian tạo đơn"]);
    });

    // Tính số ngày trong từng tháng
    let MonthCounts = d3.rollup(
        data,
        v => new Set(v.map(d => d["Count_dayofmonths"])).size,
        d => d["Ngày trong tháng"]
    );

    // Nhóm dữ liệu theo ngày trong tháng
    let groupedData = d3.rollups(
        data,
        v => ({
            "SL": d3.sum(v, d => +d["SL"] || 0), // Tổng số lượng
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) // Tổng doanh số
        }),
        d => d["Ngày trong tháng"] // Nhóm theo "Ngày trong tháng"
    );

    // Chuyển đổi dữ liệu sang định dạng phù hợp để vẽ biểu đồ
    let processedData = Array.from(groupedData, ([day, values]) => ({
        "Ngày trong tháng": day,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"],
        "Count_dayofmonths": MonthCounts.get(day),
        "SL_TB": Math.round(values["SL"] / MonthCounts.get(day)), 
        "ThanhTien_TB": Math.round(values["Thành tiền"] / MonthCounts.get(day)) 
    }));

    // Sắp xếp theo ngày trong tháng
    processedData.sort((a, b) => a["Ngày trong tháng"] - b["Ngày trong tháng"]);
    console.log(processedData);

    // Xác định kích thước của biểu đồ
    let container = d3.select("#chart5").node().getBoundingClientRect();
    let maxWidth = 900, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth) + 150;
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 50, bottom: 50, left: 5 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    // Tạo SVG chứa biểu đồ
    let svg = d3.select("#chart5")
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
        .text("Doanh số bán hàng theo Ngày trong tháng");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tạo thang đo cho trục X (ngày trong tháng)
    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Ngày trong tháng"]))
        .range([0, width])
        .padding(0.2);

    // Tạo thang đo cho trục Y (doanh số TB)
    let maxValue = d3.max(processedData, d => d["ThanhTien_TB"]); // Lấy giá trị lớn nhất
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 1000000) * 1000000])
        .range([height, 0])
        .nice(); 

    // Vẽ trục X
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text") // Chọn tất cả các nhãn
        .style("text-anchor", "end") // Căn chỉnh nhãn
        .attr("transform", "rotate(-45)"); // Xoay 90 độ

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

    // Tạo bảng màu cho ngày trong tháng
    let color = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));

    // Tạo tooltip
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
        .attr("x", d => x(d["Ngày trong tháng"]))
        .attr("y", d => y(d["ThanhTien_TB"]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d["ThanhTien_TB"]))
        .attr("fill", d => color(d["Ngày trong tháng"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`${d["Ngày trong tháng"]}</strong><br>
                    Doanh số bán TB: ${(d["ThanhTien_TB"] / 1000000).toFixed(1)} triệu VND <br>
                    Số lượng bán TB: ${d3.format(",.0f")(d["SL_TB"])} SKUs`)
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
        .attr("x", d => x(d["Ngày trong tháng"]) + x.bandwidth() / 2)
        .attr("y", d => y(d["ThanhTien_TB"]) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${(d["ThanhTien_TB"] / 1000000).toFixed(1)}tr`);
});
