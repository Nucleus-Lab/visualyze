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

      d3.csv("/data/top_20_ethereum_projects_volume.csv").then(data => {
        data.forEach(d => {
          d.total_volume_usd = +d.total_volume_usd;
        });

        const x = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.total_volume_usd)])
          .range([0, width - 150]);

        const y = d3.scaleBand()
          .domain(data.map(d => d.symbol))
          .range([0, height - 100])
          .padding(0.1);

        svg.append("g")
          .selectAll("rect")
          .data(data)
          .enter()
          .append("rect")
          .attr("x", 150)
          .attr("y", d => y(d.symbol))
          .attr("width", d => x(d.total_volume_usd))
          .attr("height", y.bandwidth())
          .attr("fill", "#46E4FD");

        svg.append("g")
          .attr("transform", `translate(150,0)`)
          .call(d3.axisLeft(y))
          .selectAll("text")
          .attr("fill", "white");

        svg.append("g")
          .attr("transform", `translate(150,${height - 100})`)
          .call(d3.axisBottom(x).tickFormat(d3.format(".2s")))
          .selectAll("text")
          .attr("fill", "white");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Top 20 Ethereum Projects - 7 Day Transaction Volume");

        svg.append("text")
          .attr("x", width - 10)
          .attr("y", height - 60)
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .style("font-size", "12px")
          .text("Transaction Volume (USD)");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};