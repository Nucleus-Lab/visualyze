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

      d3.csv("/data/ethereum_transaction_fees_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.block_date = new Date(d.block_date);
          d.total_amount_usd = +d.total_amount_usd;
        });

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => d.block_date))
          .range([60, width - 20]);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.total_amount_usd)])
          .nice()
          .range([height - 40, 20]);

        const xAxis = g => g
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", width - 20)
            .attr("y", -4)
            .attr("fill", "white")
            .attr("text-anchor", "end")
            .text("Date"));

        const yAxis = g => g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y).ticks(height / 40, "~s"))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", 4)
            .attr("y", 20)
            .attr("fill", "white")
            .attr("text-anchor", "start")
            .text("Transaction Fees (USD)"));

        svg.append("g")
          .call(xAxis);

        svg.append("g")
          .call(yAxis);

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#46E4FD")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.total_amount_usd)));

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Ethereum Transaction Fees Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};