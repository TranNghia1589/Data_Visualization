d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    let daysMapping = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

    data.forEach(d => {
        let date = new Date(d["Thời gian tạo đơn"]);
        d["Ngày trong tuần"] = daysMapping[date.getDay()];  
        d["Count_dayofweeks"] = d3.timeFormat("%Y-%W")(date); 
    });

    let WeekCounts = d3.rollup(
        data,
        v => new Set(v.map(d => d["Count_dayofweeks"])).size, 
        d => d["Ngày trong tuần"] 
    );    

    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0), 
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) 
        }),
        d => d["Ngày trong tuần"] 
    );

    let processedData = Array.from(groupedData, ([day, values]) => ({
        "Ngày trong tuần": day,
        "Count_dayofweeks": WeekCounts.get(day),
        "SL": values["SL"],
        "Thành tiền": values["Thành tiền"],
        "SL_TB": Math.round(values["SL"] / WeekCounts.get(day)),
        "ThanhTien_TB": Math.round(values["Thành tiền"] / WeekCounts.get(day))
    }));

    let weekdaysOrder = [ "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
    processedData.sort((a, b) => weekdaysOrder.indexOf(a["Ngày trong tuần"]) - weekdaysOrder.indexOf(b["Ngày trong tuần"]));

    console.log(processedData);

    let container = d3.select("#chart4").node().getBoundingClientRect();
    let maxWidth = 900, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth) + 150;
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 50, bottom: 50, left: 50 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    let svg = d3.select("#chart4")
        .append("svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight);

    svg.append("text")
        .attr("x", fullWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#0077b6")
        .text("Doanh số bán hàng theo Ngày trong tuần");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Ngày trong tuần"]))
        .range([0, width])
        .padding(0.2);

    let maxValue = d3.max(processedData, d => d["ThanhTien_TB"]); 
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 1000000) * 1000000])
        .range([height, 0])
        .nice(); 

    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    chartGroup.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d / 1000000}M`));

    chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width) 
            .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "#ddd");

    chartGroup.selectAll(".domain").remove();

    let color = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));

    let tooltip1 = d3.select("body").append("div")
        .attr("class", "tooltip1")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "11px");

    chartGroup.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Ngày trong tuần"]))
        .attr("y", d => y(d["ThanhTien_TB"]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d["ThanhTien_TB"]))
        .attr("fill", d => color(d["Ngày trong tuần"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`<strong>${d["Ngày trong tuần"]}</strong><br>
                    Doanh số bán TB: ${d3.format(",.0f")(d["ThanhTien_TB"])} VND <br>
                    Số lượng bán TB: ${d3.format(",.0f")(d["SL_TB"])} SKUs`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip1.style("display", "none");
        });

    chartGroup.selectAll(".label")
        .data(processedData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d["Ngày trong tuần"]) + x.bandwidth() / 2)
        .attr("y", d => y(d["ThanhTien_TB"]) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${d3.format(",.0f")(d["ThanhTien_TB"])} VND`);
});

