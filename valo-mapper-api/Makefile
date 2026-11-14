.PHONY: test test-short bench lint

test:
	go test ./...

test-short:
	go test -short ./...

bench:
	go test -run '^$$' -bench . -benchmem ./models ./services

lint:
	golangci-lint run --timeout=5m
