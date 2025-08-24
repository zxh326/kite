package utils

import "testing"

func TestEncryptDecryptString(t *testing.T) {
	original := "Hello, World!asdas"
	encrypted := EncryptString(original)
	decrypted, err := DecryptString(encrypted)
	t.Log("Encrypted:", encrypted)
	t.Log("Decrypted:", decrypted)
	if err != nil {
		t.Fatalf("DecryptString() failed: %v", err)
	}
	if decrypted != original {
		t.Errorf("DecryptString() = %q, want %q", decrypted, original)
	}
}
