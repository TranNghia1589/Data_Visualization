d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        let hourStart = new Date(d["Thời gian tạo đơn"]);
        hourStart.setMinutes(0, 0, 0);
        let hourEnd = new Date(hourStart);
        hourEnd.setHours(hourEnd.getHours() + 1);
    
        let hourStr = d3.timeFormat("%H")(hourStart);
        d["Khung giờ"] = `${hourStr}:00 - ${hourStr}:59`;
        // Lưu ngày để đếm số ngày duy nhất
        d["Ngày"] = d3.timeFormat("%Y-%m-%d")(d["Thời gian tạo đơn"]);
    });
    
    // Đếm số ngày duy nhất của từng khung giờ
    let HourCounts = d3.rollup(
        data,
        v => new Set(v.map(d => d["Ngày"])).size, // Đếm số ngày duy nhất
        d => d["Khung giờ"]
    );

    // Tính tổng doanh thu và số lượng theo khung giờ
    let groupedData = d3.rollups(
        data, 
        v => ({
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0),
            "SL": d3.sum(v, d => +d["SL"] || 0)
        }), 
        d => d["Khung giờ"]
    );

    // Chuẩn hóa dữ liệu
    let processedData = groupedData.map(([khungGio, values]) => {
        let count = HourCounts.get(khungGio) || 1; 
        return {
            "Khung giờ": khungGio,
            "Thành tiền": values["Thành tiền"],
            "SL": values["SL"],
            "Count_Hour": count,
            "SL_TB": Math.round(values["SL"] / count),
            "ThanhTien_TB": Math.round(values["Thành tiền"] / count)
        };
    });

    // Sắp xếp theo thứ tự thời gian
    processedData.sort((a, b) => {
        let timeA = parseInt(a["Khung giờ"].split(":")[0]);
        let timeB = parseInt(b["Khung giờ"].split(":")[0]);
        return timeA - timeB;
    });

    // Xác định kích thước của Warszhed
    let container = d3.select("#chart6").node()?.getBoundingClientRect() || {width: 800, height: 600};
    let maxWidth = 900, maxHeight = 600;
    let fullWidth = Math.min(container.width, maxWidth) + 150;
    let fullHeight = Math.min(container.height, maxHeight);

    let margin = { top: 50, right: 50, bottom: 70, left: 40 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    // Tạo SVG chứa biểu đồ
    let svg = d3.select("#chart6")
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
        .text("Doanh số bán hàng theo Khung Giờ");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tạo thang đo cho trục X (Khung giờ)
    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Khung giờ"]))
        .range([0, width])
        .padding(0.2);

    // Tạo thang đo cho trục Y (doanh số TB)
    let maxValue = d3.max(processedData, d => d["ThanhTien_TB"]);
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 1000) * 1000])
        .range([height, 0])
        .nice();

    // Vẽ trục X
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    // Vẽ trục Y
    chartGroup.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d/1000}K`));

    // Đường lưới trục Y
    chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "#ddd");

    // Xoá đường viền 2 trục
    chartGroup.selectAll(".domain").remove();

    // Tạo bảng màu cho Khung giờ
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
        .attr("x", d => x(d["Khung giờ"]))
        .attr("y", d => y(d["ThanhTien_TB"]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d["ThanhTien_TB"]))
        .attr("fill", d => color(d["Khung giờ"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`Khung giờ: <strong>${d["Khung giờ"]}</strong><br>
                    Doanh số bán TB: ${d3.format(",.0f")(d["ThanhTien_TB"])} VND <br>
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
        .attr("x", d => x(d["Khung giờ"]) + x.bandwidth() / 2)
        .attr("y", d => y(d["ThanhTien_TB"]) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${d3.format(",.0f")(d["ThanhTien_TB"])} VND`);

}).catch(error => {
    console.error("Error loading CSV:", error);
});