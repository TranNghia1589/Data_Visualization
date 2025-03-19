d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {

    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    let parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S"); 
    data.forEach(d => {
        d["Thời gian tạo đơn"] = parseDate(d["Thời gian tạo đơn"]);
        d["Tháng"] = `Tháng ${d3.timeFormat("%m")(d["Thời gian tạo đơn"])}`; 
    });

    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0), 
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) 
        }),
        d => d["Tháng"] 
    );

    let processedData = groupedData.map(([thang, values]) => ({
        "Tháng": thang,
        "SL": values["SL"],
        "Thành tiền": values["Thành tiền"]
    }));

    processedData.sort((a, b) => d3.ascending(a["Tháng"], b["Tháng"]));

    console.log(processedData);

    let container = d3.select("#chart3").node().getBoundingClientRect();
    let maxWidth = 1000, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth);
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 20, bottom: 50, left: 50 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    let svg = d3.select("#chart3")
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
        .text("Doanh số bán hàng theo Tháng");

    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Tháng"]))
        .range([0, width])
        .padding(0.2);

    let maxValue = d3.max(processedData, d => d["Thành tiền"]); 
    let y = d3.scaleLinear()
        .domain([0, Math.ceil(maxValue / 100000000) * 100000000]) 
        .range([height, 0]);

    let color = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemeSet3));

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
