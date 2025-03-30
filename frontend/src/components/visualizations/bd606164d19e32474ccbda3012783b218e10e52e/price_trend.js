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

      d3.csv("/data/price_trend.csv").then(data => {
        data.forEach(d => {
          d.avg_price_usd = +d.avg_price_usd;
        });

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => new Date(d.block_month)))
          .range([50, width - 50]);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.avg_price_usd)])
          .range([height - 50, 50]);

        const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d"));
        const yAxis = d3.axisLeft(y).tickFormat(d3.format(".2s"));

        svg.append("g")
          .attr("transform", `translate(0,${height - 50})`)
          .call(xAxis)
          .append("text")
          .attr("fill", "#000")
          .attr("x", width - 60)
          .attr("y", 30)
          .attr("text-anchor", "end")
          .text("Date");

        svg.append("g")
          .attr("transform", `translate(50,0)`)
          .call(yAxis)
          .append("text")
          .attr("fill", "#000")
          .attr("x", -40)
          .attr("y", 20)
          .attr("text-anchor", "start")
          .text("Price (USD)");

        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(new Date(d.block_month)))
            .y(d => y(d.avg_price_usd))
          );

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("Ethereum Price Trend Over the Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};