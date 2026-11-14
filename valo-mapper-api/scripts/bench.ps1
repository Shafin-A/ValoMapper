$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")
try {
    go test -run '^$' -bench . -benchmem ./models ./services
}
finally {
    Pop-Location
}
