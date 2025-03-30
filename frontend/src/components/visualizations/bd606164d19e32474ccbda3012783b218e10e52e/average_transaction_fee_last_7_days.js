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

      const margin = { top: 40, right: 30, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const x = d3.scaleTime().range([0, innerWidth]);
      const y = d3.scaleLinear().range([innerHeight, 0]);

      const line = d3.line()
        .x(d => x(d.block_date))
        .y(d => y(d.avg_transaction_fee));

      d3.csv("/data/average_transaction_fee_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.block_date = new Date(d.block_date);
          d.avg_transaction_fee = +d.avg_transaction_fee;
        });

        x.domain(d3.extent(data, d => d.block_date));
        y.domain([0, d3.max(data, d => d.avg_transaction_fee)]);

        svg.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`)
          .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
          .append("text")
          .attr("fill", "#000")
          .attr("x", 5)
          .attr("y", -10)
          .attr("text-anchor", "start")
          .text("Avg Transaction Fee");

        svg.append("g")
          .attr("transform", `translate(${margin.left},${innerHeight + margin.top})`)
          .call(d3.axisBottom(x).ticks(7))
          .append("text")
          .attr("fill", "#000")
          .attr("x", innerWidth)
          .attr("y", 40)
          .attr("text-anchor", "end")
          .text("Date");

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 2)
          .attr("d", line)
          .attr("transform", `translate(${margin.left},${margin.top})`);

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("Ethereum Average Transaction Fee Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};