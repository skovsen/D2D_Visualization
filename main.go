package main

import (
	"flag"
	"log"
	"strings"

	comm "github.com/alexandrainst/D2D-communication"
)

func main() {
	whatType := flag.String("type", "WS", "Communication type to visualization {ws|mqtt}")
	flag.Parse()
	log.Println(*whatType)
	if strings.ToUpper(*whatType) == "WS" {
		log.Println("Starting webserver")
		StartWebServer()
	} else if strings.ToUpper(*whatType) == "MQTT" {
		log.Println("Starting mqtt communication")
		StartMQTT()
	} else {
		panic("No proper communication form selected")
	}

	log.Println("Starting P2P communication")
	go startVizwork()
	select {}

}

func startVizwork() {
	comm.InitD2DCommuncation(comm.VisualizationAgentType)
	vizChannel := comm.InitVisualizationMessages(true)
	log.Println("Wating for visualization message")
	go func() {
		for {

			msg := <-vizChannel.Messages
			if msg.StateMessage.Mission.SwarmGeometry != nil {
				msg.MissionBound = msg.StateMessage.Mission.SwarmGeometry.Bound()
			}

			select {
			case AgentsInfo <- *msg:
				//log.Println("sent message")
			default:

			}

		}
	}()
	for {
		goal := <-GoalInfo
		comm.SendVizGoal(goal)
	}

}
