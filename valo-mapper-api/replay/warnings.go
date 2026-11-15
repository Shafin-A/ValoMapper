package replay

// warningList de-duplicates decoded-output warnings; they never fail a parse.
type warningList struct {
	list []string
	seen map[string]struct{}
}

func newWarnings() *warningList {
	return &warningList{seen: make(map[string]struct{})}
}

func (w *warningList) add(message string) {
	if message == "" {
		return
	}
	if w.seen == nil {
		w.seen = make(map[string]struct{})
	}
	if _, exists := w.seen[message]; exists {
		return
	}
	w.seen[message] = struct{}{}
	w.list = append(w.list, message)
}

func (w *warningList) addAll(messages []string) {
	for _, message := range messages {
		w.add(message)
	}
}

func (w *warningList) all() []string {
	if len(w.list) == 0 {
		return nil
	}
	return append([]string(nil), w.list...)
}
