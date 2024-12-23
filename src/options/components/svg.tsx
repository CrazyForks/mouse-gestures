import * as d3 from "d3"
import { useEffect, useRef } from "react"

import type { Point } from "~core/trajectory"

type SvgProps = {
  points: Point[]
  width: number
  height: number
  animate?: boolean
  color?: string
}

export default (props: SvgProps) => {
  const svgRef = useRef(null)

  useEffect(() => {
    const data = props.points
    const width = props.width
    const height = props.height
    const centerX = width / 2
    const centerY = height / 2

    // Selecting SVG elements
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("class", "flex items-center justify-center")

    // Setting the Line Generator
    const line = d3
      .line<Point>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5)) // 可选：设置曲线类型

    // Clear previous content
    svg.selectAll("*").remove()

    // Bounding boxes for computational data
    const xExtent = d3.extent(data, (d) => d.x)
    const yExtent = d3.extent(data, (d) => d.y)
    const dataWidth = xExtent[1] - xExtent[0]
    const dataHeight = yExtent[1] - yExtent[0]

    // Calculating the scaling factor
    const scaleFactor = Math.min(width / dataWidth, height / dataHeight) * 0.6

    // Scaling and converting data
    const scaledData = data.map((d) => ({
      x: (d.x - xExtent[0]) * scaleFactor,
      y: (d.y - yExtent[0]) * scaleFactor
    }))

    // Add Path
    const path = svg
      .append("path")
      .datum(scaledData)
      .attr("fill", "none")
      .attr("stroke", "#2b3440")
      .attr("stroke-width", 10)
      .attr("d", line)
      .attr("marker-end", "url(#arrowhead)")

    const xData = scaledData.map((d) => d.x)
    const yData = scaledData.map((d) => d.y)

    const bboxCenterX = Math.abs(Math.min(...xData) - Math.max(...xData)) / 2
    const bboxCenterY = Math.abs(Math.min(...yData) - Math.max(...yData)) / 2
    const translateX = centerX - bboxCenterX
    const translateY = centerY - bboxCenterY

    // Application Offset
    path.attr("transform", `translate(${translateX}, ${translateY})`)

    // Creating a rounded starting point
    const startPointCoordinates = scaledData[0]
    const startPoint = svg
      .append("circle")
      .attr("cx", startPointCoordinates.x + translateX)
      .attr("cy", startPointCoordinates.y + translateY)
      .attr("r", 5)
      .attr("fill", "#2b3440")

    // Add arrows that follow the path
    const movingArrow = svg
      .append("path")
      .attr("viewBox", "0 -15 30 30")
      .attr("d", "M0,-15L30,0L0,15")
      .attr("refX", 9)
      .attr("refY", 0)
      .attr("markerWidth", 9)
      .attr("markerHeight", 9)
      .attr("fill", "#2b3440")

    // Calculate the total length of the path
    const totalLength = path.node().getTotalLength()

    // Update Arrow Position
    const updateArrowPosition = (t) => {
      const length = t * totalLength - 1

      const point = path.node().getPointAtLength(Math.max(length, 0))
      const previousPoint = path
        .node()
        .getPointAtLength(Math.max(length - 1, 0))

      const angle =
        (Math.atan2(point.y - previousPoint.y, point.x - previousPoint.x) *
          180) /
        Math.PI
      movingArrow.attr(
        "transform",
        `translate(${point.x + translateX}, ${point.y + translateY}) rotate(${angle})`
      )
    }

    updateArrowPosition(1)

    if (props.animate) {
      svg.selectAll("path, circle").style("pointer-events", "none")
      let isAnimating = false
      let isHovering = false
      let hoverTimer: string | number | NodeJS.Timeout
      svg.on("mouseover", () => {
        hoverTimer = setTimeout(() => {
          if (isAnimating) return
          if (props.color) {
            startPoint.attr("fill", props.color)
            path.attr("stroke", props.color)
            movingArrow.attr("fill", props.color)
          }

          // Path animation
          path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)

          // Arrow movement animation
          movingArrow
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .tween("pathTween", () => {
              return (t) => {
                updateArrowPosition(t)
              }
            })
            .on("start", () => {
              isAnimating = true
              isHovering = true
            })
            .on("end", () => {
              isAnimating = false
              if (isHovering) return
              startPoint.attr("fill", "#2b3440")
              path.attr("stroke", "#2b3440")
              movingArrow.attr("fill", "#2b3440")
            })
        }, 300)
      })
      svg.on("mouseout", () => {
        clearTimeout(hoverTimer)
        isHovering = false
        if (isAnimating) return
        startPoint.attr("fill", "#2b3440")
        path.attr("stroke", "#2b3440")
        movingArrow.attr("fill", "#2b3440")
      })
      path.attr("stroke-width", 7)
      startPoint.attr("r", 3)
      movingArrow.attr("viewBox", "0 -10 20 20").attr("d", "M0,-10L20,0L0,10")
    }
  }, [props])

  return <svg ref={svgRef}></svg>
}
