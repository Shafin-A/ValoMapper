package replay

type killDataElement struct {
	Victim            uint32
	KillingEquippable uint32
	DamageType        uint32
}

// decodeKillDataArray reads the members the event log needs from a replicated
// KillData array. The export emits the array's typed children only on newer
// VRFKit builds, so the parent's raw window is the only portable source.
func decodeKillDataArray(raw []byte, bitCount int32) []killDataElement {
	if bitCount <= 0 || len(raw) != (int(bitCount)+7)/8 {
		return nil
	}

	bits := &bitWindow{raw: raw, end: int(bitCount)}
	capacity, ok := bits.packed()
	if !ok || capacity > 4096 {
		return nil
	}

	var elements []killDataElement
	for {
		encoded, ok := bits.packed()
		if !ok {
			return nil
		}
		if encoded == 0 {
			return elements
		}
		if encoded-1 >= capacity {
			return nil
		}

		var element killDataElement
		for {
			handle, ok := bits.packed()
			if !ok {
				return nil
			}
			if handle == 0 {
				break
			}
			width, ok := bits.packed()
			if !ok || width == 0 || width > 64*1024 {
				return nil
			}
			payload, ok := bits.take(int(width))
			if !ok {
				return nil
			}
			switch handle - 1 {
			case 3:
				element.Victim = decodePackedRef(payload, int(width))
			case 4:
				element.KillingEquippable = decodePackedRef(payload, int(width))
			case 9:
				element.DamageType = decodePackedRef(payload, int(width))
			}
		}
		elements = append(elements, element)
	}
}

type bitWindow struct {
	raw []byte
	pos int
	end int
}

func (b *bitWindow) take(width int) ([]byte, bool) {
	if width < 0 || width > b.end-b.pos {
		return nil, false
	}
	out := make([]byte, (width+7)/8)
	for i := 0; i < width; i++ {
		bit, ok := b.read(1)
		if !ok {
			return nil, false
		}
		if bit != 0 {
			out[i/8] |= 1 << (i % 8)
		}
	}
	return out, true
}

func (b *bitWindow) read(width int) (uint64, bool) {
	if width < 0 || width > 64 || width > b.end-b.pos {
		return 0, false
	}
	start := b.pos / 8
	shift := b.pos % 8
	span := (b.pos + width + 7) / 8
	var value uint64
	for i := start; i < span && i < len(b.raw); i++ {
		value |= uint64(b.raw[i]) << (8 * (i - start))
	}
	b.pos += width
	if width == 64 {
		return value >> shift, true
	}
	return (value >> shift) & ((1 << width) - 1), true
}

// packed reads Unreal's SerializeIntPacked: seven value bits and a continuation
// bit per byte.
func (b *bitWindow) packed() (uint64, bool) {
	var value uint64
	for i := 0; i < 5; i++ {
		byteValue, ok := b.read(8)
		if !ok {
			return 0, false
		}
		value |= (byteValue >> 1) << (7 * i)
		if byteValue&1 == 0 {
			return value, true
		}
	}
	return 0, false
}

func decodePackedRef(raw []byte, width int) uint32 {
	bits := &bitWindow{raw: raw, end: width}
	value, ok := bits.packed()
	if !ok || bits.pos != bits.end {
		return 0
	}
	return uint32(value)
}

func resolveKillData(
	writes []killDataWrite,
	paths map[uint32]string,
	index *playerIndex,
	outer map[uint32]uint32,
) []killDataSample {
	samples := make([]killDataSample, 0, len(writes))
	for _, write := range writes {
		killer, ok := killDataSubject(index, outer, write.KillerActor)
		if !ok {
			continue
		}
		victim, ok := killDataSubject(index, outer, write.VictimActor)
		if !ok {
			continue
		}

		source := resolveKillSource(paths[write.KillingEquippable], paths[write.DamageType])

		samples = append(samples, killDataSample{
			TimeMS:        write.TimeMS,
			KillerSubject: killer,
			VictimSubject: victim,
			DamageType:    source.DamageType,
			DamageItem:    source.DamageItem,
		})
	}
	return samples
}

func killDataSubject(
	index *playerIndex,
	outer map[uint32]uint32,
	actor uint32,
) (string, bool) {
	if subject, ok := index.subjectForActor(actor); ok {
		return subject, true
	}
	if outerActor, ok := outer[actor]; ok {
		return index.subjectForActor(outerActor)
	}
	return "", false
}
