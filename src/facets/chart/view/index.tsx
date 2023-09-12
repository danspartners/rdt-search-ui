import type { ChartFacetConfig, ChartFacetProps, ChartFacetState } from '../state'

import React from 'react'
import styled from 'styled-components'
import * as echarts from 'echarts'

import FacetWrapper from '../../wrapper'
import debounce from 'lodash.debounce'

const ChartFacetWrapper = styled(FacetWrapper)`
	height: 100%;

	.container {
		width: 100%;
	}

	&.facet__pie-chart .container {
		height: 100%;
		min-height: 160px;
	}

	&.facet__bar-chart .container,
	&.facet__date-chart .container {
		height: 100%;
		min-height: 280px;
	}
`


export function ChartFacet<Config extends ChartFacetConfig, State extends ChartFacetState> (
	props: ChartFacetProps<Config, State>
) {
	// Ref to the chart instance
	const chart = React.useRef<echarts.ECharts | null>(null)

	// Ref to the container element
	const containerRef = React.useRef<HTMLDivElement>(null)

	// Initialize the chart
	React.useEffect(() => {
		if (containerRef.current == null) return

		// Initialize the chart and set the container element
		chart.current = echarts.init(containerRef.current)

		const options = props.facet.setOptions()
		// Set the options
		chart.current.setOption(options)

		// Add click event listener
		chart.current.on('click', (params) => {
			props.facet.actions.setFilter(params.name)
		})

		chart.current.on('datazoom', debounce((params: any) => {
			props.facet.actions.setFilter([params.start, params.end])
		}, 1000))

		return () => chart.current?.dispose()
	}, [])

	// Update the chart when the values change
	React.useEffect(() => {
		if (
			props.values == null ||
			chart.current == null
		) return

		// console.log(props.facet.ID, props.values, props.facet.valueRange, zoomValue.current)

		// let option = updateValues[props.facet.type as ChartFacetType](props.values)

		// Define range upfront for type checking

		const options = props.facet.updateOptions(props.values)

		chart.current.setOption(options)
	}, [props.values])

	return (
		<ChartFacetWrapper
			className={`facet__${props.facet.type}-chart`}
			{...props}
		>
			<div
				className="container"
				ref={containerRef}
			>
			</div>
		</ChartFacetWrapper>
	)
}
