package replay

import (
	"sort"
)

// Event ordering at one timestamp. A replacement closes the old item before
// the new one opens, so the new item is not immediately cleared, and an open
// precedes damage so a hit in the same millisecond lands on the new item.
// Death is last so it clears anything equipped in that millisecond.
const (
	orderArmourClose uint8 = iota
	orderArmourOpen
	orderArmourDamage
	orderHealth
	orderCredits
	orderWeapon
	orderDeath
)

type stateEventKind int

const (
	eventHealth stateEventKind = iota
	eventCredits
	eventWeapon
	eventArmourOpen
	eventArmourClose
	eventArmourDamage
)

type stateEvent struct {
	TimeMS      uint32
	PacketID    uint32
	Index       int
	Seq         uint32
	Kind        stateEventKind
	HP          int
	Alive       bool
	Credits     int
	WeaponID    string
	ArmorItem   uint32
	ArmorID     string
	ArmorPoints int
}

func (e *stateEvent) order() uint8 {
	switch e.Kind {
	case eventArmourDamage:
		return orderArmourDamage
	case eventArmourClose:
		return orderArmourClose
	case eventHealth:
		if !e.Alive {
			return orderDeath
		}
		return orderHealth
	case eventCredits:
		return orderCredits
	case eventWeapon:
		return orderWeapon
	case eventArmourOpen:
		return orderArmourOpen
	default:
		return orderHealth
	}
}

type timelineBuilder struct {
	events []stateEvent
	seq    uint32
}

func (b *timelineBuilder) add(event stateEvent) {
	b.seq++
	event.Seq = b.seq
	b.events = append(b.events, event)
}

// build applies the events in absolute time order and records a snapshot only
// when the state changes. HealthTimeMS is part of the comparison because it is
// what makes the round-start rule independent of an unrelated credits or
// weapon write later in the round.
func (b *timelineBuilder) build() []stateSample {
	if len(b.events) == 0 {
		return nil
	}
	events := b.events
	sort.SliceStable(events, func(i, j int) bool {
		a, b := &events[i], &events[j]
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.order() != b.order() {
			return a.order() < b.order()
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		if a.Index != b.Index {
			return a.Index < b.Index
		}
		return a.Seq < b.Seq
	})

	current := defaultStateSample()
	currentArmorItem := uint32(0)
	timeline := make([]stateSample, 0, len(events))

	for i := range events {
		event := &events[i]
		switch event.Kind {
		case eventHealth:
			current.HP = event.HP
			current.Alive = event.Alive
			current.HealthTimeMS = event.TimeMS
			if !event.Alive {
				current.WeaponID = ""
				current.ArmorID = ""
				current.ArmorPoints = 0
				currentArmorItem = 0
			}
		case eventCredits:
			current.Credits = event.Credits
		case eventWeapon:
			current.WeaponID = event.WeaponID
		case eventArmourOpen:
			currentArmorItem = event.ArmorItem
			current.ArmorID = event.ArmorID
			current.ArmorPoints = event.ArmorPoints
		case eventArmourDamage:
			if event.ArmorItem == currentArmorItem {
				current.ArmorPoints = event.ArmorPoints
			}
		case eventArmourClose:
			if event.ArmorItem == currentArmorItem {
				currentArmorItem = 0
				current.ArmorID = ""
				current.ArmorPoints = 0
			}
		}

		if len(timeline) > 0 && sameState(timeline[len(timeline)-1], current) {
			continue
		}
		snapshot := current
		snapshot.TimeMS = event.TimeMS
		timeline = append(timeline, snapshot)
	}
	return timeline
}

func sameState(a, b stateSample) bool {
	return a.HP == b.HP &&
		a.Alive == b.Alive &&
		a.Credits == b.Credits &&
		a.WeaponID == b.WeaponID &&
		a.ArmorID == b.ArmorID &&
		a.ArmorPoints == b.ArmorPoints &&
		a.HealthTimeMS == b.HealthTimeMS
}

func defaultStateSample() stateSample {
	return stateSample{HP: 100, Alive: true}
}

// sampleAt returns the last state sample at or before absTimeMS, applying the
// round-start rule: a health value written before the round started is shown as
// a full bar and alive, regardless of how the previous round ended.
func sampleAt(timeline []stateSample, absTimeMS, roundStartMS uint32) stateSample {
	if len(timeline) == 0 {
		return defaultStateSample()
	}
	index := sort.Search(len(timeline), func(i int) bool {
		return timeline[i].TimeMS > absTimeMS
	}) - 1
	if index < 0 {
		return defaultStateSample()
	}
	sample := timeline[index]
	if sample.HealthTimeMS < roundStartMS {
		sample.HP = 100
		sample.Alive = true
	}
	return sample
}

func (s *stateScan) stateFor(subject string, absTimeMS, roundStartMS uint32) stateSample {
	if s == nil {
		return defaultStateSample()
	}
	return sampleAt(s.Timelines[subject], absTimeMS, roundStartMS)
}

// coverageWarning turns an unresolved count above 1 % of its stream into one
// user-facing warning. Smaller gaps stay in the parse log only.
func coverageWarning(unresolved, total int, message string) string {
	if unresolved <= 0 || total <= 0 || unresolved*100 <= total {
		return ""
	}
	return message
}
