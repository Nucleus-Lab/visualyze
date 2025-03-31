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

      const margin = { top: 40, right: 60, bottom: 40, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      d3.csv("/data/net_profit_transactions.csv").then(data => {
        const netProfit = +data[0].net_profit;

        const xScale = d3.scaleLinear()
          .domain([0, Math.abs(netProfit)])
          .range([0, innerWidth]);

        const yScale = d3.scaleBand()
          .domain(["Net Profit"])
          .range([0, innerHeight])
          .padding(0.1);

        g.append("g")
          .call(d3.axisLeft(yScale))
          .selectAll("text")
          .attr("fill", "white");

        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).tickFormat(d3.format(".2s")))
          .selectAll("text")
          .attr("fill", "white");

        g.append("rect")
          .attr("x", 0)
          .attr("y", yScale("Net Profit"))
          .attr("width", xScale(Math.abs(netProfit)))
          .attr("height", yScale.bandwidth())
          .attr("fill", netProfit < 0 ? "#3C93FD" : "#0CFCDD");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Net Profit from Transactions (Last 7 Days)");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};