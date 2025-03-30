const GeneratedViz = () => {
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    const container = chartRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    d3.csv("/data/ethereum_daily_price_last_7_days.csv").then(data => {
      data.forEach(d => {
        d.average_price_usd = +d.average_price_usd;
        d.block_date = new Date(d.block_date);
      });

      const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.block_date))
        .range([40, width - 40]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.average_price_usd)])
        .nice()
        .range([height - 40, 20]);

      const xAxis = g => g
        .attr("transform", `translate(0,${height - 40})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
        .call(g => g.append("text")
          .attr("x", width - 40)
          .attr("y", 30)
          .attr("fill", "#fff")
          .attr("text-anchor", "end")
          .text("Date"));

      const yAxis = g => g
        .attr("transform", `translate(40,0)`)
        .call(d3.axisLeft(y).ticks(height / 40, "~s"))
        .call(g => g.append("text")
          .attr("x", -30)
          .attr("y", 20)
          .attr("fill", "#fff")
          .attr("text-anchor", "start")
          .text("Average Price (USD)"));

      svg.append("g").call(xAxis);
      svg.append("g").call(yAxis);

      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#3C93FD")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
          .x(d => x(d.block_date))
          .y(d => y(d.average_price_usd)));

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "16px")
        .text("Ethereum Average Daily Price Over the Last 7 Days");
    });

    return () => {
      d3.select(container).select("svg").remove();
    };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};