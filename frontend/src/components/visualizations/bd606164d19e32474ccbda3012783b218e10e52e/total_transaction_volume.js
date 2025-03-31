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

      d3.csv("/data/total_transaction_volume.csv").then(data => {
        const volume = data.map(d => +d.total_transaction_volume);

        const x = d3.scaleBand()
          .domain(d3.range(volume.length))
          .range([40, width - 20])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, d3.max(volume)])
          .range([height - 40, 20]);

        svg.append("g")
          .attr("fill", "#46E4FD")
          .selectAll("rect")
          .data(volume)
          .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d))
          .attr("height", d => y(0) - y(d))
          .attr("width", x.bandwidth());

        svg.append("g")
          .attr("transform", `translate(0,${height - 40})`)
          .call(d3.axisBottom(x).tickFormat(i => `Day ${i + 1}`))
          .attr("color", "white")
          .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", "rotate(-65)");

        svg.append("g")
          .attr("transform", `translate(40,0)`)
          .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2s")))
          .attr("color", "white")
          .append("text")
          .attr("fill", "white")
          .attr("x", -5)
          .attr("y", 10)
          .attr("text-anchor", "end")
          .text("Volume");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Ethereum Total Transaction Volume Over 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};