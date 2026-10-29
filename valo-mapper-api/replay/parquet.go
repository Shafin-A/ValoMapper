package replay

import (
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/parquet-go/parquet-go"
)

const parquetBatchSize = 8192

// fieldRow projects only the sparse columns the normaliser reads. The parquet
// tags must match vrfkit's fields schema exactly; nullable columns are pointers
// so a missing value is distinguishable from zero.
type fieldRow struct {
	TimeMS        uint32   `parquet:"time_ms"`
	PacketID      uint32   `parquet:"packet_id"`
	ActorNetGUID  uint32   `parquet:"actor_net_guid"`
	ObjectNetGUID *uint32  `parquet:"object_net_guid,optional"`
	GroupPath     string   `parquet:"group_path"`
	FieldName     *string  `parquet:"field_name,optional"`
	ValueI64      *int64   `parquet:"value_i64,optional"`
	ValueF64      *float64 `parquet:"value_f64,optional"`
	ValueBool     *bool    `parquet:"value_bool,optional"`
	ValueStr      *string  `parquet:"value_str,optional"`
	// RawBits keeps a replicated array's undecoded members. Only KillData rows
	// are inspected; every other row leaves it nil.
	BitCount int32  `parquet:"bit_count"`
	RawBits  []byte `parquet:"raw_bits,optional"`
}

// movementRow is one decoded pose. Only the columns needed for round-start
// frames and the transform plausibility gate are projected.
type movementRow struct {
	TimeMS           uint32  `parquet:"time_ms"`
	CharacterNetGUID uint32  `parquet:"character_net_guid"`
	PosX             float32 `parquet:"pos_x"`
	PosY             float32 `parquet:"pos_y"`
	PosZ             float32 `parquet:"pos_z"`
	Yaw              float32 `parquet:"yaw"`
	Pitch            float32 `parquet:"pitch"`
}

// eventRow projects the server event timeline.
type eventRow struct {
	Group string  `parquet:"group"`
	Time1 uint32  `parquet:"time1"`
	Word0 *uint32 `parquet:"word0,optional"`
	Word1 *uint32 `parquet:"word1,optional"`
}

// readParquetRows streams a Parquet file in bounded batches. Generic readers
// panic on a schema mismatch instead of returning an error, so construction is
// wrapped; a malformed export must become a replay error, never a crash.
func readParquetRows[T any](path string, handle func([]T) error) (int64, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return 0, err
	}

	parquetFile, err := parquet.OpenFile(file, info.Size())
	if err != nil {
		return 0, err
	}

	reader, err := newGenericReader[T](parquetFile)
	if err != nil {
		return 0, err
	}
	defer reader.Close()

	buffer := make([]T, parquetBatchSize)
	var total int64

	for {
		n, readErr := reader.Read(buffer)
		if n > 0 {
			total += int64(n)
			if handleErr := handle(buffer[:n]); handleErr != nil {
				return total, handleErr
			}
		}

		if errors.Is(readErr, io.EOF) {
			return total, nil
		}
		if readErr != nil {
			return total, readErr
		}
		if n == 0 {
			return total, nil
		}
	}
}

func newGenericReader[T any](file *parquet.File) (reader *parquet.GenericReader[T], err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			reader = nil
			err = fmt.Errorf("parquet reader: %v", recovered)
		}
	}()

	reader = parquet.NewGenericReader[T](file)
	return reader, nil
}
