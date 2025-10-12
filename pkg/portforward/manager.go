package portforward

import (
	"sync"

	"github.com/google/uuid"
)

type Session struct {
	ID        string   `json:"id"`
	Namespace string   `json:"namespace"`
	PodName   string   `json:"podName"`
	Ports     []string `json:"ports"`
	stopChan  chan struct{}
}

type Manager struct {
	sessions map[string]*Session
	mu       sync.Mutex
}

var GlobalManager = NewManager()

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
	}
}

func (m *Manager) Add(namespace, podName string, ports []string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := uuid.New().String()
	session := &Session{
		ID:        id,
		Namespace: namespace,
		PodName:   podName,
		Ports:     ports,
		stopChan:  make(chan struct{}, 1),
	}
	m.sessions[id] = session
	return session
}

func (m *Manager) Get(id string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sessions[id]
}

func (m *Manager) Remove(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, id)
}

func (m *Manager) List() []*Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	list := make([]*Session, 0, len(m.sessions))
	for _, session := range m.sessions {
		list = append(list, session)
	}
	return list
}

func (m *Manager) Stop(id string) {
	session := m.Get(id)
	if session != nil {
		close(session.stopChan)
		m.Remove(id)
	}
}

func (s *Session) StopChan() chan struct{} {
	return s.stopChan
}
