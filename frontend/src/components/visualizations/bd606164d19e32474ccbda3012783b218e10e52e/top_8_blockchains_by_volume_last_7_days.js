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

      d3.csv("/data/top_8_blockchains_by_volume_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.total_volume = +d.total_volume;
        });

        const x = d3.scaleBand()
          .domain(data.map(d => d.blockchain))
          .range([40, width - 20])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.total_volume)])
          .range([height - 40, 20]);

        const color = d3.scaleOrdinal()
          .domain(data.map(d => d.blockchain))
          .range(["#0CFCDD", "#46E4FD", "#3C93FD", "#2669FC", "#7667E6"]);

        svg.append("g")
          .selectAll("rect")
          .data(data)
          .enter().append("rect")
          .attr("x", d => x(d.blockchain))
          .attr("y", d => y(d.total_volume))
          .attr("width", x.bandwidth())
          .attr("height", d => height - 40 - y(d.total_volume))
          .attr("fill", d => color(d.blockchain));

        svg.append("g")
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x))
          .selectAll("text")
          .attr("transform", "translate(0,10)")
          .style("text-anchor", "middle");

        svg.append("g")
          .attr("transform", `translate(40,0)`)
          .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "#FFFFFF")
          .text("Top 8 Blockchains by Transaction Volume in the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};