package prometheus

import (
	"context"
	"testing"
)

func TestDurationValidation(t *testing.T) {
	// Test the duration validation helper function
	validDurations := []string{"30m", "1h", "24h"}
	invalidDurations := []string{"15m", "2h", "48h", "invalid"}
	
	for _, duration := range validDurations {
		timeRange, step, err := validateDurationAndGetTimeParams(duration)
		if err != nil {
			t.Errorf("Valid duration %s was rejected: %v", duration, err)
		} else {
			// Use time values to avoid import error
			_ = timeRange
			_ = step
			t.Logf("Valid duration %s: timeRange=%v, step=%v", duration, timeRange, step)
		}
	}
	
	for _, duration := range invalidDurations {
		_, _, err := validateDurationAndGetTimeParams(duration)
		if err == nil {
			t.Errorf("Invalid duration %s was accepted", duration)
		} else {
			t.Logf("Invalid duration %s correctly rejected: %v", duration, err)
		}
	}
}

func TestWorkloadMetricsExists(t *testing.T) {
	// Just test that the GetWorkloadMetrics method exists on the Client struct
	client := &Client{}
	
	// Test that method exists and duration validation works
	_, err := client.GetWorkloadMetrics(context.Background(), "", "", "", "invalid")
	if err == nil {
		t.Error("Expected error for invalid duration")
	} else if err.Error() == "unsupported duration: invalid" {
		t.Log("Duration validation works correctly")
	} else {
		t.Logf("Got error: %v", err)
	}
}