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

      d3.csv("/data/transaction_fees_trends_7_days.csv").then(data => {
        data.forEach(d => {
          d.avg_transaction_fee_usd = +d.avg_transaction_fee_usd;
        });

        const x = d3.scaleBand()
          .domain(data.map(d => d.block_date))
          .range([60, width - 20])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.avg_transaction_fee_usd)])
          .nice()
          .range([height - 40, 20]);

        const xAxis = g => g
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x).tickSizeOuter(0))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", width - 20)
            .attr("y", 30)
            .attr("fill", "#fff")
            .attr("text-anchor", "end")
            .text("Date"));

        const yAxis = g => g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y).ticks(5, "~s"))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", 0)
            .attr("y", 10)
            .attr("fill", "#fff")
            .attr("text-anchor", "start")
            .text("Avg Transaction Fee (USD)"));

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(d.block_date) + x.bandwidth() / 2)
            .y(d => y(d.avg_transaction_fee_usd))
          );

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .style("font-size", "16px")
          .text("Ethereum Transaction Fees Over the Past 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};