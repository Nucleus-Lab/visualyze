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

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      d3.csv("/data/total_fees_last_7_days.csv").then(data => {
        const totalFees = +data[0].total_fees;

        const x = d3.scaleBand()
          .domain(["Total Fees"])
          .range([0, innerWidth])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, totalFees])
          .range([innerHeight, 0]);

        g.append("g")
          .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
          .attr("class", "y-axis")
          .append("text")
          .attr("fill", "#000")
          .attr("x", -margin.left)
          .attr("y", -20)
          .attr("text-anchor", "start")
          .text("Fees (USD)");

        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(x))
          .attr("class", "x-axis")
          .append("text")
          .attr("fill", "#000")
          .attr("x", innerWidth)
          .attr("y", 40)
          .attr("text-anchor", "end")
          .text("Period");

        g.selectAll(".bar")
          .data([totalFees])
          .enter().append("rect")
          .attr("class", "bar")
          .attr("x", d => x("Total Fees"))
          .attr("y", d => y(d))
          .attr("width", x.bandwidth())
          .attr("height", d => innerHeight - y(d))
          .attr("fill", "#3C93FD");

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("Ethereum Transaction Fees Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};