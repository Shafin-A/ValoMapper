package testutils

import (
	"context"
	"sync/atomic"

	"github.com/jackc/pgx/v5"
)

type QueryCounter struct {
	queries atomic.Int64
}

func (c *QueryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.queries.Add(1)
	return ctx
}

func (c *QueryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func (c *QueryCounter) Count() int64 {
	return c.queries.Load()
}

func (c *QueryCounter) Reset() {
	c.queries.Store(0)
}
