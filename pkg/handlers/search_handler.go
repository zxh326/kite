package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/handlers/resources"
	"github.com/zxh326/kite/pkg/utils"
)

type SearchHandler struct {
	cache *expirable.LRU[string, []common.SearchResult]
}
type SearchResponse struct {
	Results []common.SearchResult `json:"results"`
	Total   int                   `json:"total"`
}

func NewSearchHandler() *SearchHandler {
	return &SearchHandler{
		cache: expirable.NewLRU[string, []common.SearchResult](100, nil, time.Minute*10),
	}
}

func (h *SearchHandler) createCacheKey(query string) string {
	return fmt.Sprintf("search:%s", query)
}

func (h *SearchHandler) Search(c *gin.Context, query string, limit int) ([]common.SearchResult, error) {
	var allResults []common.SearchResult

	// Search in different resource types
	searchFuncs := resources.SearchFuncs
	guessSearchResources, q := utils.GuessSearchResources(query)
	for name, searchFunc := range searchFuncs {
		if guessSearchResources == "all" || name == guessSearchResources {
			results, err := searchFunc(c, q, int64(limit))
			if err != nil {
				continue
			}
			allResults = append(allResults, results...)
		}
	}

	queryLower := strings.ToLower(q)
	sortResults(allResults, queryLower)

	// Limit total results
	if len(allResults) > limit {
		allResults = allResults[:limit]
	}

	h.cache.Add(h.createCacheKey(query), allResults)
	return allResults, nil
}

// GlobalSearch handles global search across multiple resource types
func (h *SearchHandler) GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	if len(query) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query must be at least 2 characters long"})
		return
	}

	// Parse limit parameter
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit > 100 {
		limit = 50
	}

	cacheKey := h.createCacheKey(query)

	if cachedResults, found := h.cache.Get(cacheKey); found {
		response := SearchResponse{
			Results: cachedResults,
			Total:   len(cachedResults),
		}
		go func() {
			// Perform search in the background to update cache
			_, _ = h.Search(c, query, limit)
		}()
		c.JSON(http.StatusOK, response)
		return
	}

	allResults, err := h.Search(c, query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to perform search"})
		return
	}

	response := SearchResponse{
		Results: allResults,
		Total:   len(allResults),
	}

	c.JSON(http.StatusOK, response)
}

func getResourceOrder(resourceType string) int {
	resourceOrder := map[string]int{
		"deployments":  1,
		"pods":         2,
		"daemonsets":   3,
		"statefulsets": 4,
		"configmaps":   5,
		"services":     6,
		"secrets":      7,
		"ingresses":    8,
		"namespaces":   9,
	}
	if order, exists := resourceOrder[resourceType]; exists {
		return order
	}
	return len(resourceOrder) // Default to the end if not found
}

// sortResults sorts the search results with exact matches first, then by resource type
func sortResults(results []common.SearchResult, query string) {
	var exactMatches, partialMatches []common.SearchResult

	for _, result := range results {
		if strings.ToLower(result.Name) == query {
			exactMatches = append(exactMatches, result)
		} else {
			partialMatches = append(partialMatches, result)
		}
	}

	// sort by resources
	sortByResources := func(a, b common.SearchResult) bool {
		return getResourceOrder(a.ResourceType) < getResourceOrder(b.ResourceType)
	}

	// Simple bubble sort for demonstration
	for i := 0; i < len(exactMatches)-1; i++ {
		for j := 0; j < len(exactMatches)-i-1; j++ {
			if !sortByResources(exactMatches[j], exactMatches[j+1]) {
				exactMatches[j], exactMatches[j+1] = exactMatches[j+1], exactMatches[j]
			}
		}
	}

	for i := 0; i < len(partialMatches)-1; i++ {
		for j := 0; j < len(partialMatches)-i-1; j++ {
			if !sortByResources(partialMatches[j], partialMatches[j+1]) {
				partialMatches[j], partialMatches[j+1] = partialMatches[j+1], partialMatches[j]
			}
		}
	}

	// Combine results
	copy(results, append(exactMatches, partialMatches...))
}
