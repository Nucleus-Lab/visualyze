const GeneratedViz = () => {
    const chartRef = React.useRef(null);
  
    React.useEffect(() => {
      const container = chartRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
  
      d3.select(container).select("svg").remove();
  
      const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);
  
      d3.csv("/data/0x5e89f8d81c74e311458277ea1be3d3247c7cd7d1_1inch_txs_results.csv").then(data => {
        data.forEach(d => {
          d.block_date = new Date(d.block_date);
          d.amount = +d.amount;
        });
  
        const x = d3.scaleTime()
          .domain(d3.extent(data, d => d.block_date))
          .range([50, width - 50]);
  
        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.amount)])
          .range([height - 50, 50]);
  
        const xAxis = g => g
          .attr("transform", `translate(0,${height - 50})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
          .call(g => g.append("text")
            .attr("x", width - 50)
            .attr("y", 40)
            .attr("fill", "#fff")
            .attr("text-anchor", "end")
            .text("Date"));
  
        const yAxis = g => g
          .attr("transform", `translate(50,0)`)
          .call(d3.axisLeft(y).ticks(height / 50, "s"))
          .call(g => g.append("text")
            .attr("x", -40)
            .attr("y", 10)
            .attr("fill", "#fff")
            .attr("text-anchor", "start")
            .text("Amount"));
  
        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);
  
        svg.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#3C93FD")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(d => x(d.block_date))
            .y(d => y(d.amount)));
  
        svg.append("text")
          .attr("x", (width / 2))
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "#fff")
          .text("1inch Token Buy Transactions Over Time");
      });
  
      const resizeObserver = new ResizeObserver(() => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        svg.attr("width", newWidth).attr("height", newHeight);
      });
  
      resizeObserver.observe(container);
  
      return () => resizeObserver.disconnect();
    }, []);
  
    return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
  };