package replay

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
)

func TestSanitiseOutputReplacesPaths(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "match.vrf")
	exportDir := filepath.Join(dir, "export-1")

	output := "failed to read " + filePath + " and " + exportDir
	slashed := filepath.ToSlash(exportDir)
	if slashed != exportDir {
		output += " and " + slashed
	}

	got := sanitiseOutput(output, filePath, exportDir)

	if strings.Contains(got, dir) {
		t.Fatalf("sanitised output still contains the temp directory: %q", got)
	}
	want := 2
	if slashed != exportDir {
		want = 3
	}
	if count := strings.Count(got, "<tmp>"); count != want {
		t.Fatalf("got %d placeholders, want %d in %q", count, want, got)
	}
}

func TestClassifyVRFKitErrorAttachesSanitisedOutput(t *testing.T) {
	output := "export failed: Oodle decompression error at <tmp>/match.vrf"
	got := classifyVRFKitError(context.Background(), errors.New("exit status 1"), output)

	if got.Code != CodeUnsupportedCompress {
		t.Fatalf("code = %q, want %q", got.Code, CodeUnsupportedCompress)
	}
	if !strings.Contains(got.Error(), output) {
		t.Fatalf("internal error does not carry VRFKit output: %q", got.Error())
	}
	if got.Message == output || strings.Contains(got.Message, "<tmp>") {
		t.Fatalf("user-facing message leaked VRFKit output: %q", got.Message)
	}
}

func TestClassifyVRFKitErrorOmitsEmptyOutput(t *testing.T) {
	got := classifyVRFKitError(context.Background(), errors.New("exit status 1"), "")
	if strings.HasSuffix(got.Error(), ": ") {
		t.Fatalf("empty output produced a dangling suffix: %q", got.Error())
	}
}
