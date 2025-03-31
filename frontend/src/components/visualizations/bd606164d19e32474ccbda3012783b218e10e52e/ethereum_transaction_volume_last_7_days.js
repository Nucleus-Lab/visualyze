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

      d3.csv("/data/ethereum_transaction_volume_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.total_volume = +d.total_volume;
        });

        const x = d3.scaleLinear()
          .domain([0, data.length - 1])
          .range([50, width - 50]);

        const y = d3.scaleLog()
          .domain([d3.min(data, d => d.total_volume), d3.max(data, d => d.total_volume)])
          .range([height - 50, 50]);

        const line = d3.line()
          .x((d, i) => x(i))
          .y(d => y(d.total_volume));

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#0CFCDD")
          .attr("stroke-width", 2)
          .attr("d", line);

        svg.append("g")
          .attr("transform", `translate(0,${height - 50})`)
          .call(d3.axisBottom(x).ticks(data.length).tickFormat((d, i) => `Day ${i + 1}`))
          .selectAll("text")
          .attr("fill", "white");

        svg.append("g")
          .attr("transform", `translate(50,0)`)
          .call(d3.axisLeft(y).ticks(5, "~s"))
          .selectAll("text")
          .attr("fill", "white");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Ethereum Transaction Volume Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};