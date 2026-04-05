package websocket

import (
	"bytes"
	"testing"
	"time"
)

func newTestClient(lobbyCode, id, username string) *Client {
	return &Client{
		send:      make(chan []byte, 256),
		lobbyCode: lobbyCode,
		id:        id,
		username:  username,
		color:     "#ff0000",
	}
}

func TestHub_Stop(t *testing.T) {
	hub := NewHub()
	done := make(chan struct{})
	go func() {
		hub.Run()
		close(done)
	}()

	hub.Stop()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Hub.Run() did not exit after Stop()")
	}
}

func TestHub_RegisterClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	c := newTestClient("lobby1", "c1", "User1")
	hub.register <- c
	<-c.send // user_list broadcast after registration

	if got := hub.GetLobbyClients("lobby1"); got != 1 {
		t.Fatalf("expected 1 client in lobby, got %d", got)
	}
}

func TestHub_UnregisterClient_ClosesChannel(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	c := newTestClient("lobby1", "c1", "User1")
	hub.register <- c
	<-c.send // drain user_list

	hub.unregister <- c
	for range c.send {
		// drain any buffered messages; exits when channel is closed
	}

	if got := hub.GetLobbyClients("lobby1"); got != 0 {
		t.Fatalf("expected 0 clients after unregister, got %d", got)
	}
}

func TestHub_UnregisterLastClient_RemovesLobby(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	const code = "lobby-del"
	c := newTestClient(code, "c1", "User1")
	hub.register <- c
	<-c.send

	hub.unregister <- c
	for range c.send {
	}

	hub.mu.RLock()
	_, exists := hub.lobbies[code]
	hub.mu.RUnlock()

	if exists {
		t.Fatal("lobby map entry should be deleted after last client unregisters")
	}
}

func TestHub_BroadcastSkipsSender(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	receiver := newTestClient("lobby1", "r1", "Receiver")
	sender := newTestClient("lobby1", "s1", "Sender")

	// Register receiver; drain the user_list it receives.
	hub.register <- receiver
	<-receiver.send // user_list: [receiver]

	// Register sender; both receiver and sender get a new user_list.
	hub.register <- sender
	<-receiver.send // user_list: [receiver, sender]
	<-sender.send   // user_list: [receiver, sender]

	payload := []byte(`{"type":"line_drawn","data":{}}`)
	hub.broadcast <- &LobbyMessage{LobbyCode: "lobby1", Message: payload, Sender: sender}

	select {
	case msg := <-receiver.send:
		if !bytes.Equal(msg, payload) {
			t.Errorf("unexpected broadcast body: %s", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("receiver did not get broadcast message within timeout")
	}

	// Sender must not receive its own message.
	select {
	case <-sender.send:
		t.Fatal("sender received its own broadcast message")
	default:
	}
}

func TestHub_GetLobbyClients_EmptyLobby(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	if got := hub.GetLobbyClients("nonexistent"); got != 0 {
		t.Fatalf("expected 0 for unknown lobby, got %d", got)
	}
}

func TestHub_GetLobbyClients_MultipleClients(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	c1 := newTestClient("lobby2", "c1", "User1")
	c2 := newTestClient("lobby2", "c2", "User2")

	hub.register <- c1
	<-c1.send // user_list: [c1]

	hub.register <- c2
	<-c1.send // user_list: [c1, c2]
	<-c2.send // user_list: [c1, c2]

	if got := hub.GetLobbyClients("lobby2"); got != 2 {
		t.Fatalf("expected 2 clients, got %d", got)
	}
}

func TestHub_BroadcastOnlyToSameLobby(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer hub.Stop()

	inLobby := newTestClient("lobbyA", "a1", "Alice")
	otherLobby := newTestClient("lobbyB", "b1", "Bob")

	hub.register <- inLobby
	<-inLobby.send

	hub.register <- otherLobby
	<-otherLobby.send

	payload := []byte(`{"type":"agent_added","data":{}}`)
	// Broadcast to lobbyA only; no sender exclusion (sender is nil / not in lobby).
	hub.broadcast <- &LobbyMessage{LobbyCode: "lobbyA", Message: payload, Sender: nil}

	select {
	case msg := <-inLobby.send:
		if !bytes.Equal(msg, payload) {
			t.Errorf("unexpected message: %s", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("inLobby client did not receive broadcast")
	}

	// otherLobby client must not receive the lobbyA broadcast.
	select {
	case <-otherLobby.send:
		t.Fatal("otherLobby client received a message intended for lobbyA")
	default:
	}
}
