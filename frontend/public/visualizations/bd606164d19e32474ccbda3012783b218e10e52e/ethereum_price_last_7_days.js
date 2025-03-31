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

      const parseDate = d3.timeParse("%Y-%m-%d");

      d3.csv("/data/ethereum_price_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.block_date = parseDate(d.block_date);
          d.avg_price_usd = +d.avg_price_usd;
        });

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => d.block_date))
          .range([0, innerWidth]);

        const y = d3.scaleLinear()
          .domain([d3.min(data, d => d.avg_price_usd) * 0.9, d3.max(data, d => d.avg_price_usd) * 1.1])
          .range([innerHeight, 0]);

        const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")).ticks(7);
        const yAxis = d3.axisLeft(y).tickFormat(d3.format(".2s"));

        const g = svg.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g")
          .call(yAxis)
          .selectAll("text")
          .attr("fill", "white");

        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(xAxis)
          .selectAll("text")
          .attr("fill", "white");

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#46E4FD")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.avg_price_usd))
          );

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "16px")
          .text("Ethereum Price Over the Last 7 Days");

        svg.append("text")
          .attr("x", width - margin.right)
          .attr("y", height - 10)
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .style("font-size", "12px")
          .text("Date");

        svg.append("text")
          .attr("x", margin.left)
          .attr("y", margin.top - 10)
          .attr("text-anchor", "start")
          .attr("fill", "white")
          .style("font-size", "12px")
          .text("Avg Price (USD)");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};