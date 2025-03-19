d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        d["Ngày trong tháng"] = d3.timeFormat("Ngày %d")(d["Thời gian tạo đơn"]);
        d["Count_dayofmonths"] = d3.timeFormat("%Y-%m")(d["Thời gian tạo đơn"]);
    });


    let MonthCounts = d3.rollup(
        data,
        v => new Set(v.map(d => d["Count_dayofmonths"])).size,
        d => d["Ngày trong tháng"]
    );

    let groupedData = d3.rollups(
        data,
        v => ({
            "SL": d3.sum(v, d => +d["SL"] || 0), 
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) 
        }),
        d => d["Ngày trong tháng"] 
    );

    let processedData = Array.from(groupedData, ([day, values]) => ({
        "Ngày trong tháng": day,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"],
        "Count_dayofmonths": MonthCounts.get(day),
        "SL_TB": Math.round(values["SL"] / MonthCounts.get(day)), 
        "ThanhTien_TB": Math.round(values["Thành tiền"] / MonthCounts.get(day)) 
    }));

    processedData.sort((a, b) => a["Ngày trong tháng"] - b["Ngày trong tháng"]);
    console.log(processedData);

    let container = d3.select("#chart5").node().getBoundingClientRect();
    let maxWidth = 900, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth) + 150;
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 50, bottom: 50, left: 5 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    let svg = d3.select("#chart5")
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
        .text("Doanh số bán hàng theo Ngày trong tháng");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Ngày trong tháng"]))
        .range([0, width])
        .padding(0.2);

    let maxValue = d3.max(processedData, d => d["ThanhTien_TB"]); 
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 1000000) * 1000000])
        .range([height, 0])
        .nice(); 

    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text") 
        .style("text-anchor", "end") 
        .attr("transform", "rotate(-45)"); 

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
