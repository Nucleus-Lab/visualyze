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

      const margin = { top: 40, right: 20, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const parseDate = d3.timeParse("%Y-%m-%d");

      d3.csv("/data/ethereum_daily_closing_prices_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.block_date = parseDate(d.block_date);
          d.closing_price = +d.closing_price;
        });

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => d.block_date))
          .range([0, innerWidth]);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.closing_price)])
          .nice()
          .range([innerHeight, 0]);

        const xAxis = d3.axisBottom(x).ticks(7).tickSizeOuter(0);
        const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2s"));

        const g = svg.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g")
          .call(yAxis)
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", -margin.left)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("Closing Price (USD)"));

        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(xAxis)
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", innerWidth)
            .attr("y", 40)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text("Date"));

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.closing_price)));

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .attr("fill", "white")
          .text("Ethereum Daily Closing Prices - Last 7 Days");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};