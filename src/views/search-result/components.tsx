import styled from 'styled-components';

export const Header = styled.header`
	color: #888;
	display: grid;
	font-size: .85em;
	grid-template-rows: auto 32px auto;
	grid-template-columns: 1fr 1fr;
`

export const ResultList = styled.ul`
	list-style: none;
	margin: 0;
	padding: 0;
`

export const Result = styled.li`
	cursor: pointer;
`
