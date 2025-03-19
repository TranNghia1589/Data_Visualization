
d3.csv("dataset/data_ggsheet-data.csv").then(function(data) {
    
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    
    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0), 
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0) 
        }),
        d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`, 
        d => `[${d["Mã mặt hàng"]}] ${d["Tên mặt hàng"]}` 
    );
    
    let processedData = [];

    groupedData.forEach(([nhomHang, matHangData]) => {
        matHangData.forEach(([matHang, values]) => {
            processedData.push({
                "Nhóm Hàng": nhomHang, 
                "Mặt Hàng": matHang, 
                "SL": values["SL"],
                "Thành tiền": values["Thành tiền"]
            });
        });
    });
    console.log(processedData);
    
    processedData.sort((a, b) => b["Thành tiền"] - a["Thành tiền"]);
    
    let container = d3.select("#chart1").node().getBoundingClientRect();
    let maxWidth = 850, maxHeight = 600;
    let fullWidth = Math.min(container.width || 800, maxWidth) +150 ;
    let fullHeight = Math.min(container.height || 600, maxHeight);

    let margin = { top: 50, right: 170, bottom: 50, left: 200 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    let svg = d3.select("#chart1")
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
        .text("Doanh số bán hàng theo Mặt hàng");
    
    let chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleLinear()
        .domain([0, 700000000]) 
        .range([0, width]);

    let y = d3.scaleBand()
        .domain(processedData.map(d => d["Mặt Hàng"]))
        .range([0, height])
        .padding(0.2);

    let color = d3.scaleOrdinal(d3.schemeCategory10);

    let uniqueGroups = [...new Set(processedData.map(d => d["Nhóm Hàng"]))];

    let legend = svg.append("g")
    .attr("transform", `translate(${fullWidth - 150}, ${margin.top})`); 

    uniqueGroups.forEach((group, i) => {
        let legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(group));

        legendRow.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("font-size", "12px")
            .style("fill", "#333")
            .text(group);
    });

    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => `${d / 1000000}M`))
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#333");

    chartGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickSize(-height) 
            .tickFormat("") 
        )
        .selectAll("line")
        .style("stroke", "#ddd"); 

    chartGroup.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#333");
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
        .attr("y", d => y(d["Mặt Hàng"]))
        .attr("width", d => x(d["Thành tiền"]))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d["Nhóm Hàng"]))
        .on("mouseover", function(event, d) {
            tooltip1.style("display", "block")
                .html(`
                    Mặt hàng: <strong>${d["Mặt Hàng"]}</strong><br>
                    Nhóm hàng: ${d["Nhóm Hàng"]}<br>
                    Doanh số bán: ${d3.format(",.0f")(Math.round(d["Thành tiền"] / 1_000_000))} triệu VND <br>
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
        .attr("x", d => x(d["Thành tiền"]) + 5)
        .attr("y", d => y(d["Mặt Hàng"]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${Math.round(d["Thành tiền"] / 1000000)} triệu VNĐ`);
});