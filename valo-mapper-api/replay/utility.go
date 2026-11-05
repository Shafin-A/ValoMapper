package replay

const (
	maxUtilityWarnings   = 9999
	maxUtilityIntervals  = 5000
	maxUtilitySamples    = 256
	maxUtilityPathPoints = 256
	nanoswarmSettledMS   = 251
	poisonCloudSettledMS = 251
	curveballFlightMS    = 600
	wallArmingMS         = 1500
)

type utilityActorEvent struct {
	TimeMS    uint32
	PacketID  uint32
	Event     string
	ClassPath string
	Spawn     *Position
	SpawnYaw  *float32
}

type utilityActor struct {
	GUID   uint32
	Class  string
	Events []utilityActorEvent
}

type utilityActorLife struct {
	guid            uint32
	ordinal         int
	class           utilityCatalogEntry
	openMS          uint32
	closeMS         uint32
	position        Position
	yaw             float64
	lengthM         float64
	hasYaw          bool
	owner           string
	attachParent    uint32
	activeIntervals []utilityInterval
	placedMS        uint32
}

type utilityInterval struct {
	startMS uint32
	endMS   uint32
}

type utilityOwnerWrite struct {
	TimeMS       uint32
	PacketID     uint32
	Owner        *uint32
	Instigator   *uint32
	Controller   *uint32
	AttachParent *uint32
}

type utilityPathWrite struct {
	TimeMS    uint32
	PacketID  uint32
	FieldName string
	Position  Position
}

type utilitySplineWrite struct {
	TimeMS    uint32
	PacketID  uint32
	DistanceM float64
}

type utilityFuelWrite struct {
	TimeMS   uint32
	PacketID uint32
	Fuel     *float64
	Draining *bool
}

type utilityDestroyWrite struct {
	TimeMS   uint32
	PacketID uint32
	Name     string
}

type utilityActivationWrite struct {
	TimeMS   uint32
	PacketID uint32
	Active   *bool
}

type utilitySegment struct {
	life               *utilityActorLife
	roundIndex         int
	startMS            uint32
	endMS              uint32
	position           Position
	yaw                float64
	lengthM            float64
	inactive           bool
	samples            []movementRow
	replicatedMovement []utilityPathWrite
	splineWrites       []utilitySplineWrite
	stopFraction       *float64
	path               []utilityPathWrite
	visionSamples      []UtilityVisionSample
	trajectorySamples  []UtilityPositionSample
	lengthSamples      []UtilityLengthSample
}
