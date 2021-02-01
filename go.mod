module alexandra.dk/D2D-WebVisualization

go 1.15

replace github.com/alexandrainst/D2D-communication => /Users/skov/Alexandra/Alexandra/D2D/src/comm

replace github.com/alexandrainst/agentlogic => /Users/skov/Alexandra/Alexandra/D2D/src/agentlogic

require (
	github.com/alexandrainst/D2D-communication v0.1.2
	github.com/alexandrainst/agentlogic v0.2.0
	github.com/eclipse/paho.mqtt.golang v1.2.0
	github.com/gorilla/websocket v1.4.2
	github.com/paulmach/orb v0.1.7 // indirect
)
