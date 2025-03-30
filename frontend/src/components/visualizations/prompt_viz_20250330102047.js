// Sample data - in real app this would come from your backend
const sampleData = {
    protocols: [
      { name: "Uniswap", activity: 150000 },
      { name: "Aave", activity: 120000 },
      { name: "Compound", activity: 90000 },
      { name: "Curve", activity: 80000 },
      { name: "MakerDAO", activity: 70000 }
    ]
  };
  
  // Define the component
  function GeneratedViz() {
    const chartRef = React.useRef(null);
  
    React.useEffect(() => {
      if (!chartRef.current) return;
  
      const renderChart = () => {
        // Clear any existing SVG
        d3.select(chartRef.current).selectAll("*").remove();
  
        // Get current dimensions
        const container = chartRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
  
        if (width === 0 || height === 0) return;
  
        console.log('Rendering chart with dimensions:', { width, height });
  
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
  
        // Create SVG
        const svg = d3.select(container)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height]);
  
        // Create scales
        const xScale = d3.scaleBand()
          .domain(sampleData.protocols.map(d => d.name))
          .range([margin.left, innerWidth + margin.left])
          .padding(0.1);
  
        const yScale = d3.scaleLinear()
          .domain([0, d3.max(sampleData.protocols, d => d.activity)])
          .range([innerHeight + margin.top, margin.top]);
  
        // Create and style the bars
        svg.selectAll("rect")
          .data(sampleData.protocols)
          .enter()
          .append("rect")
          .attr("x", d => xScale(d.name))
          .attr("y", d => yScale(d.activity))
          .attr("width", xScale.bandwidth())
          .attr("height", d => innerHeight + margin.top - yScale(d.activity))
          .attr("fill", "steelblue")
          .attr("rx", 4)
          .on("mouseover", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("fill", "rgb(70, 130, 180, 0.7)");
          })
          .on("mouseout", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("fill", "steelblue");
          });
  
        // Add axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);
  
        svg.append("g")
          .attr("transform", `translate(0,${innerHeight + margin.top})`)
          .call(xAxis)
          .selectAll("text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end")
          .attr("fill", "white");
  
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(yAxis)
          .selectAll("text")
          .attr("fill", "white");
  
        // Add labels
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height - 5)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .text("DeFi Protocols");
  
        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -(height / 2))
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .text("Activity (Transactions)");
      };
  
      // Initial render
      renderChart();
  
      // Set up resize observer
      const resizeObserver = new ResizeObserver(() => {
        renderChart();
      });
  
      resizeObserver.observe(chartRef.current);
  
      // Cleanup
      return () => {
        resizeObserver.disconnect();
      };
    }, []);
  
    // Replace JSX return with React.createElement equivalent
    return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
  }
