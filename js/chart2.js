// Đọc dữ liệu từ tệp CSV
d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    // Kiểm tra dữ liệu có hợp lệ không
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    // Nhóm dữ liệu theo 'Nhóm hàng' thay vì 'Mặt hàng'
    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0), // Tổng số lượng
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) // Tổng doanh số
        }),
        d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}` // Nhóm theo "Mã nhóm hàng + Tên nhóm hàng"
    );

    // Chuyển đổi dữ liệu sang định dạng phù hợp để vẽ biểu đồ
    let processedData = groupedData.map(([nhomHang, values]) => ({
        "Nhóm Hàng": nhomHang,
        "SL": values["SL"],
        "Thành tiền": values["Thành tiền"]
    }));

    console.log(processedData);

    // Sắp xếp dữ liệu theo doanh số giảm dần
    processedData.sort((a, b) => b["Thành tiền"] - a["Thành tiền"]);

    // Xác định kích thước của biểu đồ
    let container = d3.select("#chart2").node().getBoundingClientRect();
    let maxWidth = 1050, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth);
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 100, bottom: 50, left: 150 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    // Tạo SVG chứa biểu đồ
    let svg = d3.select("#chart2")
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
        .text("Doanh số bán hàng theo Nhóm hàng");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tạo thang đo cho trục X
    let maxValue = d3.max(processedData, d => d["Thành tiền"]); // Lấy giá trị lớn nhất
    let x = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 100000000) * 100000000]) // Giới hạn động, bội số của 100M
        .range([0, width]);
    
    // Tạo thang đo cho trục Y (bây giờ là nhóm hàng thay vì mặt hàng)
    let y = d3.scaleBand()
        .domain(processedData.map(d => d["Nhóm Hàng"]))
        .range([0, height])
        .padding(0.2);

    // Tạo bảng màu cho nhóm hàng
    let color = d3.scaleOrdinal(d3.schemeCategory10);

    // Vẽ trục X
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickValues(d3.range(0, Math.ceil(x.domain()[1] / 100000000) * 100000000 + 1, 100000000)) // Bước nhảy 100M
            .tickFormat(d => `${d / 1000000}M`));

    // Đường lưới trục X (Grid)
    chartGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickValues(d3.range(0, Math.ceil(maxValue / 100000000) * 100000000 + 1, 100000000)) // Tick theo bước nhảy 100M
            .tickSize(-height) // Kéo dài đường lưới
            .tickFormat("") // Ẩn nhãn trên trục X
        )
        .selectAll("line")
        .style("stroke", "#ddd") // Màu đường lưới

        // Vẽ trục Y (Nhóm hàng thay vì Mặt hàng)
    chartGroup.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#333");

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
        .attr("y", d => y(d["Nhóm Hàng"]))
        .attr("width", d => x(d["Thành tiền"]))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d["Nhóm Hàng"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`
                    Nhóm hàng: <strong>${d["Nhóm Hàng"]}</strong><br>
                    Doanh số bán: ${d3.format(",.0f")(Math.round(d["Thành tiền"] / 1_000_000))} triệu VND <br>
                    Số lượng bán: ${d3.format(",.0f")(d["SL"])} SKUs
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip1.style("display", "none");
        });

    // Thêm nhãn giá trị doanh số vào cuối mỗi cột
    chartGroup.selectAll(".label")
        .data(processedData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d["Thành tiền"]) + 5)
        .attr("y", d => y(d["Nhóm Hàng"]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${d3.format(",.0f")(Math.round(d["Thành tiền"] / 1000000))} triệu VNĐ`);
});
