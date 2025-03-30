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

      d3.csv("/data/price_trend_analysis.csv").then(data => {
        data.forEach(d => {
          d.avg_price_usd = +d.avg_price_usd;
          d.max_price_usd = +d.max_price_usd;
          d.min_price_usd = +d.min_price_usd;
        });

        const x = d3.scaleBand()
          .domain(data.map(d => d.block_month))
          .range([60, width - 20])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.max_price_usd)])
          .nice()
          .range([height - 40, 20]);

        const xAxis = g => g
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x).tickSizeOuter(0))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", width - 20)
            .attr("y", -4)
            .attr("fill", "#fff")
            .attr("text-anchor", "end")
            .text("Month"));

        const yAxis = g => g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y).ticks(null, "s"))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", 4)
            .attr("y", 20)
            .attr("dy", "-1em")
            .attr("fill", "#fff")
            .attr("text-anchor", "start")
            .text("Price (USD)"));

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        const line = d3.line()
          .x(d => x(d.block_month) + x.bandwidth() / 2)
          .y(d => y(d.avg_price_usd));

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#0CFCDD")
          .attr("stroke-width", 1.5)
          .attr("d", line);

        const lineMax = d3.line()
          .x(d => x(d.block_month) + x.bandwidth() / 2)
          .y(d => y(d.max_price_usd));

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#46E4FD")
          .attr("stroke-width", 1.5)
          .attr("d", lineMax);

        const lineMin = d3.line()
          .x(d => x(d.block_month) + x.bandwidth() / 2)
          .y(d => y(d.min_price_usd));

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 1.5)
          .attr("d", lineMin);

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "#fff")
          .text("Ethereum Price Trend Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};