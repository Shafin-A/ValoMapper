package websocket

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait = 10 * time.Second

	pongWait = 60 * time.Second

	pingPeriod = (pongWait * 9) / 10

	maxMessageSize = 512 * 1024 // 512KB
)

type Client struct {
	hub *Hub

	conn *websocket.Conn

	send chan []byte

	lobbyCode string

	id string

	username string

	color string
}

func NewClient(hub *Hub, conn *websocket.Conn, lobbyCode string, username string, color string) *Client {
	return &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 256),
		lobbyCode: lobbyCode,
		id:        uuid.New().String(),
		username:  username,
		color:     color,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("Error setting read deadline: %v", err)
		return
	}
	c.conn.SetPongHandler(func(string) error {
		if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			log.Printf("Error setting read deadline in pong handler: %v", err)
		}
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		msg, err := ParseMessage(message)
		if err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		if msg.Type == MessageTypeCursorMove {
			msg.Data["userId"] = c.id
			msg.Data["username"] = c.username
			msg.Data["color"] = c.color

			msgBytes, err := msg.Marshal()
			if err != nil {
				continue
			}

			c.hub.broadcast <- &LobbyMessage{
				LobbyCode: c.lobbyCode,
				Message:   msgBytes,
				Sender:    c,
			}
			continue
		}

		c.hub.broadcast <- &LobbyMessage{
			LobbyCode: c.lobbyCode,
			Message:   message,
			Sender:    c,
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if !ok {
				if err := c.conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("Error writing close message: %v", err)
				}
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(message); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}

			n := len(c.send)
			for range n {
				if _, err := w.Write([]byte{'\n'}); err != nil {
					log.Printf("Error writing newline: %v", err)
					return
				}
				if _, err := w.Write(<-c.send); err != nil {
					log.Printf("Error writing queued message: %v", err)
					return
				}
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
