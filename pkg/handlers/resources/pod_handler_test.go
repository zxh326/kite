package resources

import "testing"

func TestLsFileParsing(t *testing.T) {
	output := `
total 68K    
dr-xr-xr-x    1 root     root        4.0K 2025-12-10 16:22:19 +0000 .
dr-xr-xr-x    1 root     root        4.0K 2025-12-10 16:22:19 +0000 ..
drwxr-xr-x    1 root     root        4.0K 2025-10-02 12:23:51 +0000 bin
drwxr-xr-x    5 root     root         360 2025-12-10 16:22:19 +0000 dev
drwxr-xr-x    1 root     root        4.0K 2025-12-10 16:22:19 +0000 etc
drwxr-xr-x    2 root     root        4.0K 2025-05-30 12:13:44 +0000 home
drwxr-xr-x    1 root     root        4.0K 2025-05-30 12:13:44 +0000 lib
drwxr-xr-x    5 root     root        4.0K 2025-05-30 12:13:44 +0000 media
drwxr-xr-x    2 root     root        4.0K 2025-05-30 12:13:44 +0000 mnt
drwxr-xr-x    1 root     root        4.0K 2025-10-02 12:30:48 +0000 opt
dr-xr-xr-x  185 root     root           0 2025-12-10 16:22:19 +0000 proc
drwx------    2 root     root        4.0K 2025-05-30 12:13:44 +0000 root
drwxr-xr-x    1 root     root        4.0K 2025-12-10 16:22:19 +0000 run
drwxr-xr-x    1 root     root        4.0K 2025-10-02 12:23:47 +0000 sbin
drwxr-xr-x    2 root     root        4.0K 2025-05-30 12:13:44 +0000 srv
dr-xr-xr-x   13 root     root           0 2025-12-10 16:21:42 +0000 sys
drwxrwxrwt    2 root     root        4.0K 2025-05-30 12:13:44 +0000 tmp
drwxr-xr-x    1 root     root        4.0K 2025-05-30 12:13:44 +0000 usr
drwxr-xr-x    1 root     root        4.0K 2025-05-30 12:13:44 +0000 var	
	`
	files := parseLsOutput(output)
	expectedFileCount := 17
	if len(files) != expectedFileCount {
		t.Fatalf("expected %d files, got %d", expectedFileCount, len(files))
	}

	varFile := files[16]
	if varFile.Name != "var" {
		t.Errorf("expected file name 'var', got '%s'", varFile.Name)
	}
	if varFile.IsDir != true {
		t.Errorf("expected 'var' to be a directory")
	}
	if varFile.Size != "4.0K" {
		t.Errorf("expected 'var' size to be 4.0K, got %s", varFile.Size)
	}
	if varFile.Mode != "drwxr-xr-x" {
		t.Errorf("expected 'var' mode to be 'drwxr-xr-x', got '%s'", varFile.Mode)
	}
	if varFile.ModTime != "2025-05-30 12:13:44" {
		t.Errorf("expected 'var' mod time to be '2025-05-30 12:13:44', got '%s'", varFile.ModTime)
	}
	if varFile.UID != "root" {
		t.Errorf("expected 'var' uid to be 'root', got '%s'", varFile.UID)
	}
	if varFile.GID != "root" {
		t.Errorf("expected 'var' gid to be 'root', got '%s'", varFile.GID)
	}
}
