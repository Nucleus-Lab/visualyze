import dspy
from pydantic import BaseModel
import json


class Plotter(dspy.Signature):
    """You are an expert in D3.js. You are given a user's prompt and a table. You need to plot the data in the table using d3js. Read the data from the csv file and plot the data using d3js. Remember, do not directly use the sample data of the table, you need to read the data from the csv file.

    # Guidelines
    1. Preprocess the data so that no missing values and no invalid data will impact the visualization.
    2. Include all the necessary information in the visualization (title, subtitle, x-axis, y-axis, legend, etc.).
    3. Put your rendering logic in a function and use a resize observer to call the rendering function so that the graph adjust dynamically based on the container size
    4. Directly return the d3js code without including ```javascript```
    5. Do not use negative dx dy, ensure all rendering happen within the container I set for you
    6. Do not overlap the elements, such as the axis labels and ticks
        - For the vertical axis (left), put the axis labels at top of the vertical axis, and
        - For the horizontal axis (bottom), put the axis labels at right of the horizontal axis
        - For the position of the vertical axis, the x in transform(x,y) should be bigger to leave enough space for the axis labels to be position within the container
    7. For the large numbers in the axis labels, render in SI Prefixes (K, M, etc).
    8. You must include a title for the visualization

    # Color Palette
    #0CFCDD #46E4FD #3C93FD #2669FC #7667E6

    # Coding Details
    1. Properly removes the SVG on unmount with:
    ```javascript
    d3.select(container).select("svg").remove();
    ```
    2. Make sure the d3js visualization code has dynamic dimensions
    ```javascript
    const container = chartRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    ```
    3. Responsive SVG creation
    ```javascript
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    ```
    4. Has proper classes for dynamic resizing
    ```javascript
    return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
    ```
    5. Must useRef for the ResizeObserver to work
    ```javascript
    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
    ```
    6. The function must be named GeneratedViz
    """

    prompt = dspy.InputField(prefix="User's prompt:")
    task = dspy.InputField(prefix="The current task split from the user's prompt:")
    file_name = dspy.InputField(prefix="The file name of the table:")
    description = dspy.InputField(prefix="The description of the table:")
    sample_data = dspy.InputField(prefix="The sample data of the table (first 5 rows):")
    reasoning = dspy.OutputField(
        prefix="Which information should be visualized based on the user's prompt?"
    )
    simple_responsive_idea = dspy.OutputField(
        prefix="Some simple ideas to make the visualization responsive:"
    )
    plot_code: str = dspy.OutputField(prefix="The plot d3.jscode:")


class CodeRefiner(dspy.Signature):
    """You are an expert in D3.js. You are given a user's prompt and a table. You need to plot the data in the table using d3js. Read the data from the csv file and plot the data using d3js.

    # Guidelines:
    1. Fix the bugs in the d3js code.
    2. Do not return jsx element, use this method:   return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
    3. Put your rendering logic in a function and use a resize observer to call the rendering function so that the graph adjust dynamically based on the container size
    ```javascript
    const resizeObserver = new ResizeObserver(() => { renderChart(); });
    resizeObserver.observe(chartRef.current);
    return () => { resizeObserver.disconnect(); };
    ```
    4. Do not overlap the elements, such as the axis labels and ticks
        - For the vertical axis, put the axis labels at top of the vertical axis, and
        - For the horizontal axis, put the axis labels at right of the horizontal axis
    5. Directly return the d3js code without including ```javascript```
    """

    prompt = dspy.InputField(prefix="User's prompt:")
    task = dspy.InputField(prefix="The task:")
    file_name = dspy.InputField(prefix="The file name of the table:")
    description = dspy.InputField(prefix="The description of the table:")
    sample_data = dspy.InputField(prefix="The sample data of the table (first 5 rows):")
    plot_code = dspy.InputField(prefix="The plot d3.js code:")
    refined_code: str = dspy.OutputField(prefix="The refined d3.js code:")


class ResponsivePlotter(dspy.Signature):
    """You are an expert in D3.js. You are given a user's prompt and a table. You need to refine the d3js code to make the visualization responsive. For example, when clicking on the legend, the visualization can be filtered; when hovered on the data point, the details for that data point can be shown; the line is generated with a simple animation etc. You can brainstorm some simple ideas first before generating the code.

    # Guidelines:
    1. Do not return jsx element, use this method:   return React.createElement("div", { ref: chartRef, className: "w-full h-full bg-[#22222E]" });
    2. Directly return the d3js code without including ```javascript```
    """

    prompt = dspy.InputField(prefix="User's prompt:")
    task = dspy.InputField(prefix="The task:")
    file_name = dspy.InputField(prefix="The file name of the table:")
    description = dspy.InputField(prefix="The description of the table:")
    sample_data = dspy.InputField(prefix="The sample data of the table (first 5 rows):")
    plot_code = dspy.InputField(prefix="The plot d3.js code:")
    simple_responsive_idea = dspy.OutputField(
        prefix="Some simple ideas to make the visualization responsive:"
    )
    refined_code: str = dspy.OutputField(prefix="The refined responsive d3.js code:")


class PlotterAgent:
    def __init__(self, engine=None) -> None:
        self.engine = engine
        self.plot_js = dspy.Predict(Plotter, max_tokens=16000)
        self.refine_js = dspy.Predict(CodeRefiner, max_tokens=16000)
        self.refine_responsive_js = dspy.Predict(ResponsivePlotter, max_tokens=16000)

    def plot_by_prompt(
        self, prompt: str, task: str, file_name: str, description: str, sample_data: str
    ):
        response = self.plot_js(
            prompt=prompt,
            task=task,
            file_name=file_name,
            description=description,
            sample_data=sample_data,
        )
        plot_code = response.plot_code
        # print(f"The plot code: {plot_code}")

        plot_code = self.refine_js(
            prompt=prompt,
            task=task,
            file_name=file_name,
            description=description,
            sample_data=sample_data,
            plot_code=plot_code,
        ).refined_code

        # response = self.refine_responsive_js(
        #     prompt=prompt,
        #     task=task,
        #     file_name=file_name,
        #     description=description,
        #     sample_data=sample_data,
        #     plot_code=plot_code,
        # )
        # plot_code = response.refined_code

        # print(f"Responsive idea: {response.simple_responsive_idea}")

        return plot_code
