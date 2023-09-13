import type { SearchState } from '..'
import type { SearchProps } from '../../props'
import type { FacetsDataReducerAction } from '../actions'

import React from 'react'

import { ESRequestWithFacets } from './request-with-facets-creator'
import { ESResponseWithFacetsParser, getBuckets } from './response-with-facets-parser'
import { ESResponseParser } from './response-parser'
import { fetchSearchResult } from './fetch'
import { ESRequest } from './request-creator'
import { FacetController } from '../../../facets'

export function useSearch(searchProps: SearchProps, searchState: SearchState, dispatch: React.Dispatch<FacetsDataReducerAction>) {
	const prev = usePrevious(searchState)

	React.useEffect(() => {
		if (searchProps.url == null || searchProps.url.length === 0) return  // || searchState.isInitialSearch) return

		const changedProps = prev == null
			? Object.keys(searchState)
			: Object.keys(searchState).filter(key => searchState[key as keyof SearchState] !== prev[key as keyof SearchState])

		// Only the sort order or page has changed, only update the search result
		if (
			changedProps.length === 1 &&
			(changedProps[0] === 'sortOrder' || changedProps[0] === 'currentPage')
		) {
			fetchSearchResultOnly(searchState, searchProps)
				.then(searchResult => {
					dispatch({
						type: 'SET_SEARCH_RESULT',
						searchResult
					})
				})
			return

		// Only facet states have changed, only update the facet values of one facet
		} else if (
			changedProps.length === 1 &&
			changedProps[0] === 'facetStates'
		) {
			// Get the ID of the changed facet
			const facetID = Array.from(searchState.facetStates.keys()).find(key => {
				return searchState.facetStates.get(key) !== prev?.facetStates?.get(key)
			})

			const facet = searchProps.facets.find(f => f.ID === facetID)
			if (facet == null) return

			fetchFacetValuesOnly(searchState, searchProps, facet)
				.then(values => {
					dispatch({
						type: 'UPDATE_FACET_VALUES',
						values,
						ID: facet.ID
					})
				})

		// The URL, query or facet filters have changed, update the search result and facets
		} else {
			fetchSearchResultWithFacets(searchState, searchProps)
				.then(([searchResult, facetValues]) => {
					dispatch({
						type: 'SET_SEARCH_RESULT',
						searchResult,
						facetValues
					})
				})
			}
	}, [
		// Update the search result and facets
		searchProps.url,
		searchState.query,
		searchState.facetFilters,

		// Update only the search result
		searchState.currentPage,
		searchState.sortOrder,

		searchState.facetStates,
	])
}

async function fetchSearchResultOnly(searchState: SearchState, searchProps: SearchProps) {
	const { payload } = new ESRequest(searchState, searchProps)
	const response = await fetchSearchResult(searchProps.url, payload)
	const result = ESResponseParser(response)
	return result
}

async function fetchSearchResultWithFacets(searchState: SearchState, searchProps: SearchProps) {
	const { payload } = new ESRequestWithFacets(searchState, searchProps)
	const response = await fetchSearchResult(searchProps.url, payload)
	const result = ESResponseWithFacetsParser(response, searchProps.facets)
	return result
}

async function fetchFacetValuesOnly(searchState: SearchState, searchProps: SearchProps, facet: FacetController<any, any>) {
	// Create a regular payload of a search with facets
	const { payload } = new ESRequestWithFacets(searchState, searchProps)

	// Remove the aggregations of the other facets
	Object.keys(payload.aggs!).forEach(key => {
		// If the key of the aggregation does not start with the facet ID, remove it
		// For example a key can be: "some_list_facet" and "some_list_facet-count",
		// the count is not strictly needed, but that is an optimization for later
		if (key.slice(0, facet.ID.length) !== facet.ID) {
			delete payload.aggs![key]
		}
	})

	// The search result is not needed
	payload.size = 0
	payload.track_total_hits = false

	// Fetch the response 
	const response = await fetchSearchResult(searchProps.url, payload)

	// Parse only the facet values of the requested facet
	let buckets = getBuckets(response, facet.ID)
	return facet.responseParser(buckets, response)
}

function usePrevious(value: SearchState) {
	const ref = React.useRef<SearchState>()

	React.useEffect(() => {
		ref.current = value;
	}, [value])

	return ref.current
}