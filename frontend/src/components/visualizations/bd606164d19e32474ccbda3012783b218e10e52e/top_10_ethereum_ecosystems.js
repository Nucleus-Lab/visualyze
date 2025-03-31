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

      d3.csv("/data/top_10_ethereum_ecosystems.csv").then(data => {
        data.forEach(d => {
          d.total_volume_usd = +d.total_volume_usd;
        });

        const x = d3.scaleBand()
          .domain(data.map(d => d.contract_address))
          .range([0, width - 100])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.total_volume_usd)])
          .nice()
          .range([height - 50, 0]);

        const xAxis = g => g
          .attr("transform", `translate(50,${height - 50})`)
          .call(d3.axisBottom(x).tickSizeOuter(0))
          .selectAll("text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end")
          .style("fill", "white");

        const yAxis = g => g
          .attr("transform", `translate(50,0)`)
          .call(d3.axisLeft(y).ticks(5, "~s"))
          .selectAll("text")
          .style("fill", "white");

        svg.append("g")
          .selectAll("rect")
          .data(data)
          .join("rect")
          .attr("x", d => x(d.contract_address) + 50)
          .attr("y", d => y(d.total_volume_usd))
          .attr("height", d => y(0) - y(d.total_volume_usd))
          .attr("width", x.bandwidth())
          .attr("fill", "#3C93FD");

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("fill", "white")
          .style("font-size", "16px")
          .text("Top 10 Ethereum Ecosystems by Transaction Volume");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};