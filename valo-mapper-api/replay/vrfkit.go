package replay

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"valo-mapper-api/valorant"
)

const (
	defaultInspectTimeout = 15 * time.Second
	defaultExportTimeout  = 3 * time.Minute
	maxProcessOutput      = 64 << 10
)

// InspectResult is the small subset of `vrfkit inspect` M0 needs.
type InspectResult struct {
	Branch string
	Build  string
	// Output is sanitised stdout/stderr for logs. It is never sent to a client.
	Output string
}

// Exporter is the VRFKit seam. Tests substitute a fake that writes a synthetic
// Parquet export, so the normaliser can be exercised without Rust or fixtures.
type Exporter interface {
	Inspect(ctx context.Context, filePath string) (InspectResult, error)
	Export(ctx context.Context, filePath, exportDir string) error
}

// VRFKit runs the pinned CLI. Arguments are fixed; only paths vary, and no
// shell is involved.
type VRFKit struct {
	bin            string
	inspectTimeout time.Duration
	exportTimeout  time.Duration
	lookPath       func(string) (string, error)
}

func NewVRFKit(bin string, inspectTimeout, exportTimeout time.Duration) *VRFKit {
	if strings.TrimSpace(bin) == "" {
		bin = "vrfkit"
	}
	if inspectTimeout <= 0 {
		inspectTimeout = defaultInspectTimeout
	}
	if exportTimeout <= 0 {
		exportTimeout = defaultExportTimeout
	}
	return &VRFKit{
		bin:            bin,
		inspectTimeout: inspectTimeout,
		exportTimeout:  exportTimeout,
		lookPath:       exec.LookPath,
	}
}

// Available reports whether the binary can be resolved. Replay routes return
// parser_unavailable when it cannot; the rest of the API keeps working.
func (v *VRFKit) Available() bool {
	if v == nil {
		return false
	}
	path, err := v.lookPath(v.bin)
	return err == nil && path != ""
}

func (v *VRFKit) Inspect(ctx context.Context, filePath string) (InspectResult, error) {
	ctx, cancel := context.WithTimeout(ctx, v.inspectTimeout)
	defer cancel()

	stdout := &limitedBuffer{limit: maxProcessOutput}
	stderr := &limitedBuffer{limit: maxProcessOutput}
	cmd := exec.CommandContext(ctx, v.bin, "inspect", filePath, "--redact-identifiers")
	cmd.Stdout = stdout
	cmd.Stderr = stderr

	err := cmd.Run()
	output := sanitiseOutput(stdout.String()+"\n"+stderr.String(), filePath)
	if err != nil {
		return InspectResult{Output: output}, classifyVRFKitError(ctx, err, output)
	}

	build, ok := valorant.ParseBuild(output)
	if !ok {
		return InspectResult{Output: output}, NewError(CodeParseFailed,
			"The replay's game build could not be determined.", nil)
	}

	return InspectResult{
		Branch: firstBranchLine(output),
		Build:  build,
		Output: output,
	}, nil
}

func (v *VRFKit) Export(ctx context.Context, filePath, exportDir string) error {
	ctx, cancel := context.WithTimeout(ctx, v.exportTimeout)
	defer cancel()

	stdout := &limitedBuffer{limit: maxProcessOutput}
	stderr := &limitedBuffer{limit: maxProcessOutput}
	cmd := exec.CommandContext(ctx, v.bin, "export", filePath, "--out", exportDir)
	cmd.Stdout = stdout
	cmd.Stderr = stderr

	if err := cmd.Run(); err != nil {
		output := sanitiseOutput(stdout.String()+"\n"+stderr.String(), filePath, exportDir)
		return classifyVRFKitError(ctx, err, output)
	}
	return nil
}

// classifyVRFKitError maps VRFKit's prose onto the stable HTTP codes. Raw
// output is attached as the internal error for logs; the user-facing message is
// always a fixed string.
func classifyVRFKitError(ctx context.Context, err error, output string) *Error {
	if output != "" {
		// Keep VRFKit's bounded, path-sanitised output on the internal error so
		// it reaches the parse log without leaking request paths or crossing the
		// wire (the handler only sends Error.Message).
		err = fmt.Errorf("%w: %s", err, output)
	}
	if errors.Is(ctx.Err(), context.Canceled) {
		return NewError(CodeParseFailed, "", err)
	}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) {
		return NewError(CodeParseFailed, "The replay took too long to decode.", err)
	}

	lower := strings.ToLower(output)
	switch {
	case strings.Contains(lower, "file magic mismatch"),
		strings.Contains(lower, "network magic mismatch"):
		return NewError(CodeNotAReplay, "", err)
	case strings.Contains(lower, "unsupported file version"):
		return NewError(CodeUnsupportedBuild, "", err)
	case strings.Contains(lower, "unsupported branch"):
		return NewError(CodeUnsupportedBuild, "", err)
	case strings.Contains(lower, "oodle decompression error"),
		strings.Contains(lower, "oodleunsupported"):
		return NewError(CodeUnsupportedCompress, "", err)
	case strings.Contains(lower, "truncated"),
		strings.Contains(lower, "unexpected eof"),
		strings.Contains(lower, "invalid chunk"),
		strings.Contains(lower, "chunk walk"):
		return NewError(CodeCorrupt, "", err)
	case strings.Contains(lower, "encrypted replay data"):
		return NewError(CodeParseFailed,
			"Encrypted replays are not supported.", err)
	case errors.Is(err, os.ErrNotExist):
		return NewError(CodeParserUnavailable, "", err)
	default:
		return NewError(CodeParseFailed, "", err)
	}
}

func firstBranchLine(output string) string {
	for _, line := range strings.Split(output, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToLower(trimmed), "branch:") {
			return strings.TrimSpace(trimmed[len("branch:"):])
		}
	}
	return ""
}

// sanitiseOutput removes request-specific paths from text that may be logged.
// The caller still never forwards this text to a client.
func sanitiseOutput(output string, paths ...string) string {
	trimmed := strings.TrimSpace(output)
	for _, path := range paths {
		if path == "" {
			continue
		}
		trimmed = strings.ReplaceAll(trimmed, path, "<tmp>")
		// VRFKit may echo a cleaned or slash-normalised form of the path.
		if cleaned := filepath.Clean(path); cleaned != path {
			trimmed = strings.ReplaceAll(trimmed, cleaned, "<tmp>")
		}
		if slashed := filepath.ToSlash(path); slashed != path {
			trimmed = strings.ReplaceAll(trimmed, slashed, "<tmp>")
		}
	}
	if len(trimmed) > maxProcessOutput {
		trimmed = trimmed[:maxProcessOutput]
	}
	return trimmed
}

// limitedBuffer keeps at most limit bytes. VRFKit is trusted enough to run but
// not trusted to keep its output bounded.
type limitedBuffer struct {
	buffer bytes.Buffer
	limit  int
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	written := len(p)
	remaining := b.limit - b.buffer.Len()
	if remaining > 0 {
		if len(p) > remaining {
			p = p[:remaining]
		}
		_, _ = b.buffer.Write(p)
	}
	return written, nil
}

func (b *limitedBuffer) String() string {
	return b.buffer.String()
}
