package model

import (
	"testing"
)

func TestSliceString_Scan(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected SliceString
		wantErr  bool
	}{
		{"nil value", nil, nil, false},
		{"empty string", "", SliceString{""}, false},
		{"comma separated string", "a,b,c", SliceString{"a", "b", "c"}, false},
		{"byte slice", []byte("x,y,z"), SliceString{"x", "y", "z"}, false},
		{"single value string", "single", SliceString{"single"}, false},
		{"unsupported type", 123, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var s SliceString
			err := s.Scan(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("Scan() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && !equalSliceString(s, tt.expected) {
				t.Errorf("Scan() got = %v, want %v", s, tt.expected)
			}
		})
	}
}

func TestSliceString_Value(t *testing.T) {
	tests := []struct {
		name     string
		input    SliceString
		expected string
	}{
		{"nil slice", nil, ""},
		{"empty slice", SliceString{}, ""},
		{"single value", SliceString{"foo"}, "foo"},
		{"multiple values", SliceString{"a", "b", "c"}, "a,b,c"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.input.Value()
			if err != nil {
				t.Errorf("Value() error = %v", err)
			}
			if val != tt.expected {
				t.Errorf("Value() got = %v, want %v", val, tt.expected)
			}
		})
	}
}

func TestLowerCaseString_Scan(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected LowerCaseString
		wantErr  bool
	}{
		{"nil value", nil, "", false},
		{"empty string", "", "", false},
		{"lowercase string", "hello", "hello", false},
		{"uppercase string", "HELLO", "hello", false},
		{"mixed case string", "HeLLo", "hello", false},
		{"byte slice", []byte("BYTES"), "bytes", false},
		{"unsupported type", 123, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var s LowerCaseString
			err := s.Scan(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("Scan() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && s != tt.expected {
				t.Errorf("Scan() got = %v, want %v", s, tt.expected)
			}
		})
	}
}

func TestLowerCaseString_Value(t *testing.T) {
	tests := []struct {
		name     string
		input    LowerCaseString
		expected string
	}{
		{"empty string", "", ""},
		{"already lowercase", "abc", "abc"},
		{"uppercase", "ABC", "abc"},
		{"mixed case", "AbC", "abc"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.input.Value()
			if err != nil {
				t.Errorf("Value() error = %v", err)
			}
			if val != tt.expected {
				t.Errorf("Value() got = %v, want %v", val, tt.expected)
			}
		})
	}
}

func equalSliceString(a, b SliceString) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
