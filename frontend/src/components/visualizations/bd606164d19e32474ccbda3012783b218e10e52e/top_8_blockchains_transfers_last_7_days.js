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

      d3.csv("/data/top_8_blockchains_transfers_last_7_days.csv").then(data => {
        // Preprocess data
        const transactionData = d3.rollup(data, v => v.length, d => d.blockchain);
        const blockchains = Array.from(transactionData.keys());
        const transactions = Array.from(transactionData.values());

        const x = d3.scaleBand()
          .domain(blockchains)
          .range([0, width - 100])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(transactions)])
          .nice()
          .range([height - 50, 0]);

        const xAxis = g => g
          .attr("transform", `translate(50,${height - 50})`)
          .call(d3.axisBottom(x))
          .call(g => g.select(".domain").remove());

        const yAxis = g => g
          .attr("transform", "translate(50,0)")
          .call(d3.axisLeft(y).ticks(null, "s"))
          .call(g => g.select(".domain").remove());

        svg.append("g")
          .selectAll("rect")
          .data(blockchains)
          .join("rect")
          .attr("x", d => x(d) + 50)
          .attr("y", d => y(transactionData.get(d)))
          .attr("height", d => y(0) - y(transactionData.get(d)))
          .attr("width", x.bandwidth())
          .attr("fill", "#3C93FD");

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "#FFFFFF")
          .text("Top 8 Blockchains Transactions in the Last 7 Days");

        svg.append("text")
          .attr("x", width - 50)
          .attr("y", height - 10)
          .attr("text-anchor", "end")
          .style("font-size", "12px")
          .style("fill", "#FFFFFF")
          .text("Blockchains");

        svg.append("text")
          .attr("x", 60)
          .attr("y", 10)
          .attr("text-anchor", "start")
          .style("font-size", "12px")
          .style("fill", "#FFFFFF")
          .text("Transactions");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};