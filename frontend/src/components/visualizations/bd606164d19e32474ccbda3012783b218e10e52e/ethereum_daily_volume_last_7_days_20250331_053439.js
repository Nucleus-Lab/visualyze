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

    d3.csv("/data/ethereum_daily_volume_last_7_days.csv").then(data => {
      data.forEach(d => {
        d.daily_volume_usd = +d.daily_volume_usd;
      });

      const x = d3.scaleBand()
        .domain(data.map(d => d.block_date))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.daily_volume_usd)])
        .nice()
        .range([height - 40, 0]);

      const xAxis = g => g
        .attr("transform", `translate(0,${height - 40})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.append("text")
          .attr("x", width)
          .attr("y", 35)
          .attr("fill", "#fff")
          .attr("text-anchor", "end")
          .text("Date"));

      const yAxis = g => g
        .call(d3.axisLeft(y).ticks(5, "~s"))
        .call(g => g.append("text")
          .attr("x", -10)
          .attr("y", 10)
          .attr("fill", "#fff")
          .attr("text-anchor", "start")
          .text("Volume (USD)"));

      svg.append("g")
        .call(xAxis);

      svg.append("g")
        .call(yAxis);

      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#3C93FD")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x(d => x(d.block_date) + x.bandwidth() / 2)
          .y(d => y(d.daily_volume_usd))
        );

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "16px")
        .text("Ethereum Daily Trading Volume (Last 7 Days)");
    });

    return () => {
      d3.select(container).select("svg").remove();
    };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};