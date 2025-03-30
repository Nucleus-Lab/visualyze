function GeneratedViz() {
  const chartRef = React.useRef(null);
  const [activeCategories, setActiveCategories] = React.useState(["direct", "staking", "lending", "swaps", "governance"]);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const renderChart = () => {
      d3.select(chartRef.current).selectAll("*").remove();

      const container = chartRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      console.log("Rendering area chart with dimensions:", { width, height });

      // Adjust margins based on container width
      const margin = { 
        top: width < 600 ? 80 : 60,  // More top margin for wrapped title
        right: width < 600 ? 100 : 150,  // Less right margin for legend
        bottom: width < 600 ? 90 : 70,  // More bottom margin for wrapped axis labels
        left: width < 600 ? 80 : 70  // More left margin for wrapped axis labels
      };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const data = [
        { month: "Jan", direct: 100, staking: 50, lending: 80, swaps: 60, governance: 40 },
        { month: "Feb", direct: 150, staking: 80, lending: 110, swaps: 90, governance: 60 },
        { month: "Mar", direct: 180, staking: 100, lending: 140, swaps: 120, governance: 80 },
        { month: "Apr", direct: 130, staking: 90, lending: 120, swaps: 100, governance: 70 },
        { month: "May", direct: 200, staking: 130, lending: 160, swaps: 150, governance: 90 },
        { month: "Jun", direct: 170, staking: 120, lending: 150, swaps: 130, governance: 85 },
        { month: "Jul", direct: 250, staking: 160, lending: 200, swaps: 180, governance: 100 },
        { month: "Aug", direct: 220, staking: 140, lending: 190, swaps: 170, governance: 95 },
        { month: "Sep", direct: 210, staking: 130, lending: 170, swaps: 160, governance: 90 },
        { month: "Oct", direct: 280, staking: 180, lending: 220, swaps: 200, governance: 110 },
        { month: "Nov", direct: 260, staking: 170, lending: 210, swaps: 190, governance: 105 },
        { month: "Dec", direct: 240, staking: 150, lending: 190, swaps: 170, governance: 95 },
      ];

      const colors = { direct: "#0CFCDD", staking: "#46E4FD", lending: "#3C93FD", swaps: "#2669FC", governance: "#7667E6" };

      const stack = d3.stack().keys(activeCategories);
      const series = stack(data);

      const x = d3.scaleBand().domain(data.map(d => d.month)).range([0, innerWidth]).padding(0.1);
      const y = d3.scaleLinear().domain([0, d3.max(series[series.length - 1], d => d[1])]).range([innerHeight, 0]);

      const area = d3.area().x(d => x(d.data.month) + x.bandwidth() / 2).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveCatmullRom);

      svg.selectAll(".layer").data(series).enter().append("path").attr("class", "layer").attr("d", area).style("fill", d => colors[d.key]).style("opacity", 0.8);

      // Add responsive axis labels
      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "white")
        .style("font-size", width < 600 ? "10px" : "12px");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "white")
        .style("font-size", width < 600 ? "10px" : "12px");

      // Add responsive title with word wrap
      // Generated from prompt: sdjsdhfjsdfs
  const titleText = "sdjsdhfjsdfs...";
      const titleWidth = Math.min(innerWidth, 400); // Limit title width
      const titleFontSize = width < 600 ? "14px" : "18px";
      
      const title = svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", titleFontSize)
        .style("font-weight", "bold")
        .text(titleText);

      // Add responsive axis labels with word wrap
      const xAxisLabel = svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + (width < 600 ? 60 : 50))
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", width < 600 ? "12px" : "14px")
        .text("Month");

      const yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -(width < 600 ? 60 : 50))
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", width < 600 ? "12px" : "14px")
        .text("Transaction Volume");

      // Add responsive legend
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth + 10}, 20)`);
      
      Object.keys(colors).forEach((key, i) => {
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${i * (width < 600 ? 20 : 25)})`);
        
        legendRow.append("rect")
          .attr("width", width < 600 ? 12 : 15)
          .attr("height", width < 600 ? 12 : 15)
          .attr("fill", colors[key]);
        
        legendRow.append("text")
          .attr("x", width < 600 ? 15 : 20)
          .attr("y", width < 600 ? 10 : 12)
          .style("fill", "white")
          .style("font-size", width < 600 ? "10px" : "12px")
          .text(key)
          .style("cursor", "pointer")
          .on("click", () => setActiveCategories(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          ));
      });
    };

    renderChart();
    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
  }, [activeCategories]);

  return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
};