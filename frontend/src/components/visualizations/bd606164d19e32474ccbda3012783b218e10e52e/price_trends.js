const GeneratedViz = () => {
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    const container = chartRef.current;

    const renderChart = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      d3.select(container).select("svg").remove();

      const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      d3.csv("/data/price_trends.csv").then(data => {
        data.forEach(d => {
          d.avg_price_usd = +d.avg_price_usd;
          d.total_amount_usd = +d.total_amount_usd;
        });

        const x = d3.scaleBand()
          .domain(data.map(d => d.block_month))
          .range([60, width - 60])
          .padding(0.1);

        const y1 = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.avg_price_usd)])
          .nice()
          .range([height - 40, 20]);

        const y2 = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.total_amount_usd)])
          .nice()
          .range([height - 40, 20]);

        const xAxis = g => g
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x).tickSizeOuter(0))
          .call(g => g.select(".domain").remove());

        const y1Axis = g => g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y1).ticks(null, "s"))
          .call(g => g.select(".domain").remove());

        const y2Axis = g => g
          .attr("transform", `translate(${width - 60},0)`)
          .call(d3.axisRight(y2).ticks(null, "s"))
          .call(g => g.select(".domain").remove());

        svg.append("g").call(xAxis);
        svg.append("g").call(y1Axis);
        svg.append("g").call(y2Axis);

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(d => x(d.block_month) + x.bandwidth() / 2)
            .y(d => y1(d.avg_price_usd))
          );

        svg.append("g")
          .selectAll("rect")
          .data(data)
          .join("rect")
          .attr("x", d => x(d.block_month))
          .attr("y", d => y2(d.total_amount_usd))
          .attr("height", d => y2(0) - y2(d.total_amount_usd))
          .attr("width", x.bandwidth())
          .attr("fill", "#46E4FD");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "#fff")
          .text("Ethereum Price and Transaction Volume Trends");

        svg.append("text")
          .attr("x", width - 60)
          .attr("y", height - 5)
          .attr("text-anchor", "end")
          .style("font-size", "12px")
          .style("fill", "#fff")
          .text("Date");

        svg.append("text")
          .attr("x", 60)
          .attr("y", 15)
          .attr("text-anchor", "start")
          .style("font-size", "12px")
          .style("fill", "#fff")
          .text("Avg Price (USD)");

        svg.append("text")
          .attr("x", width - 60)
          .attr("y", 15)
          .attr("text-anchor", "end")
          .style("font-size", "12px")
          .style("fill", "#fff")
          .text("Total Amount (USD)");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};