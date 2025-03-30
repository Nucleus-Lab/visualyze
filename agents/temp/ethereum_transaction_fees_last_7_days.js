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

      const margin = { top: 40, right: 40, bottom: 50, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const x = d3.scaleTime().range([0, innerWidth]);
      const y = d3.scaleLinear().range([innerHeight, 0]);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      d3.csv("/data/ethereum_transaction_fees_last_7_days.csv").then(data => {
        data.forEach(d => {
          d.block_date = new Date(d.block_date);
          d.total_amount_usd = +d.total_amount_usd;
        });

        x.domain(d3.extent(data, d => d.block_date));
        y.domain([0, d3.max(data, d => d.total_amount_usd)]);

        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y-%m-%d")).ticks(7))
          .selectAll("text")
          .style("fill", "#FFFFFF")
          .style("text-anchor", "end")
          .attr("dx", "-0.8em")
          .attr("dy", "0.15em")
          .attr("transform", "rotate(-65)");

        g.append("g")
          .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
          .selectAll("text")
          .style("fill", "#FFFFFF");

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#0CFCDD")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.total_amount_usd))
          );

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .style("fill", "#FFFFFF")
          .style("font-size", "16px")
          .text("Ethereum Transaction Fees Over the Last 7 Days");

        svg.append("text")
          .attr("x", width - margin.right)
          .attr("y", height - 10)
          .attr("text-anchor", "end")
          .style("fill", "#FFFFFF")
          .text("Date");

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", margin.left / 4)
          .attr("x", -margin.top - innerHeight / 2)
          .attr("dy", "1em")
          .attr("text-anchor", "middle")
          .style("fill", "#FFFFFF")
          .text("Transaction Fees (USD)");
      });
    };

    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};