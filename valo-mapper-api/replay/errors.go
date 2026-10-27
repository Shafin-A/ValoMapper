package replay

import (
	"errors"
	"fmt"
	"net/http"
	"time"
)

// Code is the stable machine-readable error code in a replay response. The
// frontend maps on this value, never on the prose. Keep these names unchanged.
type Code string

const (
	CodeInvalidRequest      Code = "invalid_request"
	CodeNotAReplay          Code = "not_a_replay"
	CodeTooLarge            Code = "too_large"
	CodeNotFound            Code = "not_found"
	CodeUnsupportedBuild    Code = "unsupported_build"
	CodeUnsupportedMap      Code = "unsupported_map"
	CodeUnsupportedCompress Code = "unsupported_compression"
	CodeTransformCheck      Code = "transform_check_failed"
	CodeCorrupt             Code = "corrupt"
	CodeMissingTeamData     Code = "missing_team_data"
	CodeParseFailed         Code = "parse_failed"
	CodeRateLimited         Code = "rate_limited"
	CodeParserBusy          Code = "parser_busy"
	CodeParserUnavailable   Code = "parser_unavailable"
	CodeInternal            Code = "internal"
)

// Error is a replay-pipeline failure. Message is safe to return to the
// browser; Err may contain internal details and is only logged.
type Error struct {
	Code       Code
	Message    string
	Err        error
	RetryAfter time.Duration
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("replay %s: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("replay %s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Err }

// NewError builds a replay error. An empty message selects the default prose.
func NewError(code Code, message string, err error) *Error {
	if message == "" {
		message = DefaultMessage(code)
	}
	return &Error{Code: code, Message: message, Err: err}
}

// DefaultMessage returns the user-facing prose for a code.
func DefaultMessage(code Code) string {
	switch code {
	case CodeInvalidRequest:
		return "The replay upload was malformed."
	case CodeNotAReplay:
		return "That file is not a VALORANT replay."
	case CodeTooLarge:
		return "That replay is larger than the 250 MB limit."
	case CodeNotFound:
		return "This replay is no longer available. Open the .vrf file again."
	case CodeUnsupportedBuild:
		return "This replay was recorded on an unsupported game build."
	case CodeUnsupportedMap:
		return "This replay uses a map ValoMapper does not support yet."
	case CodeUnsupportedCompress:
		return "This replay uses a compression format we cannot decode."
	case CodeTransformCheck:
		return "This replay could not be decoded reliably."
	case CodeCorrupt:
		return "This replay file appears to be damaged."
	case CodeMissingTeamData:
		return "The teams could not be read from this replay."
	case CodeParseFailed:
		return "We could not parse this replay."
	case CodeRateLimited:
		return "Too many replays are being parsed. Try again later."
	case CodeParserBusy:
		return "The replay parser is busy. Try again in a moment."
	case CodeParserUnavailable:
		return "Replay parsing is unavailable right now."
	default:
		return "Something went wrong while opening this replay."
	}
}

// HTTPStatus maps a replay code to the HTTP status in the v1 contract.
func HTTPStatus(code Code) int {
	switch code {
	case CodeInvalidRequest, CodeNotAReplay:
		return http.StatusBadRequest
	case CodeTooLarge:
		return http.StatusRequestEntityTooLarge
	case CodeNotFound:
		return http.StatusNotFound
	case CodeUnsupportedBuild, CodeUnsupportedMap, CodeUnsupportedCompress,
		CodeTransformCheck, CodeCorrupt, CodeMissingTeamData, CodeParseFailed:
		return http.StatusUnprocessableEntity
	case CodeRateLimited:
		return http.StatusTooManyRequests
	case CodeParserBusy, CodeParserUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// AsError extracts a replay Error from an error chain.
func AsError(err error) (*Error, bool) {
	var replayErr *Error
	if errors.As(err, &replayErr) {
		return replayErr, true
	}
	return nil, false
}

// CodeOf returns the replay code for err, or CodeInternal.
func CodeOf(err error) Code {
	if replayErr, ok := AsError(err); ok {
		return replayErr.Code
	}
	return CodeInternal
}
