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

      d3.csv("/data/ethereum_transaction_volume.csv").then(data => {
        data.forEach(d => {
          d.transaction_count = +d.transaction_count;
          d.block_date = new Date(d.block_date);
        });

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => d.block_date))
          .range([60, width - 20]);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.transaction_count)])
          .range([height - 40, 20]);

        const xAxis = d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0);
        const yAxis = d3.axisLeft(y).ticks(height / 50).tickFormat(d3.format(".2s"));

        svg.append("g")
          .attr("transform", `translate(0,${height - 40})`)
          .call(xAxis)
          .call(g => g.append("text")
            .attr("x", width - 20)
            .attr("y", 30)
            .attr("fill", "#fff")
            .attr("text-anchor", "end")
            .text("Date"));

        svg.append("g")
          .attr("transform", `translate(60,0)`)
          .call(yAxis)
          .call(g => g.append("text")
            .attr("x", -40)
            .attr("y", 20)
            .attr("fill", "#fff")
            .attr("text-anchor", "start")
            .text("Transaction Count"));

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.transaction_count)));

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .style("font-size", "16px")
          .text("Ethereum Transaction Volume Over Time");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};