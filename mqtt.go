package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"sync"

	comm "github.com/alexandrainst/D2D-communication"
	"github.com/alexandrainst/agentlogic"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type MqttSettings struct {
	Address            string
	Port               string
	ClientId           string
	Username           string
	Password           string
	MessageTopicPrefix string
	GoalTopicPrefix    string
	UseTLS             bool
	CertFileURI        string
}

var mqttAddr = flag.String("mqttAddr", "localhost:1883", "mosquitto broker address")
var client mqtt.Client
var knownAgents = make(map[string]bool)
var agentsMux = &sync.Mutex{}
var conf MqttSettings

func StartMQTT() {
	conf = loadConfig()
	// var broker = "localhost"
	// var port = 1883
	opts := mqtt.NewClientOptions()
	//opts.AddBroker(fmt.Sprintf("tcp://%s", *mqttAddr))
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", conf.Address, conf.Port))
	opts.SetClientID(conf.ClientId)
	opts.SetUsername(conf.Username)
	opts.SetPassword(conf.Password)
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler
	client = mqtt.NewClient(opts)

	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}
	if conf.UseTLS {
		tlsConfig := NewTlsConfig(conf.CertFileURI)
		opts.SetTLSConfig(tlsConfig)
	}

	sendMessages()

}

func loadConfig() MqttSettings {
	log.Println("Loading MQTT config file")
	data, err := ioutil.ReadFile("confs/mqttConf.json")
	if err != nil {
		log.Fatalf("unable to read MQTT conf file: %v", err)
		panic(err)
	}

	// we initialize the struct with default values
	settings := MqttSettings{
		Address:            "localhost",
		Port:               "1883",
		ClientId:           "D2D mqtt adaptor",
		Username:           "d2d",
		Password:           "176161",
		MessageTopicPrefix: "D2D/Agents/",
		GoalTopicPrefix:    "D2D/Agents/",
		UseTLS:             false,
		CertFileURI:        "",
	}

	json.Unmarshal(data, &settings)

	return settings
}

func sendMessages() {
	log.Println("Waiting to send messages via MQTT")
	go func() {
		for {
			select {
			case vsMessage := <-AgentsInfo:
				subIfMissing(vsMessage.SenderId)
				agent, err := json.Marshal(vsMessage)

				if err != nil {
					log.Println("ERRR WS!")
					log.Println(err)
				}
				suffix := ""
				switch vsMessage.ContentType {
				case comm.DiscoveryMessageType:
					suffix = "discovery"
					break
				case comm.StateMessageType:
					suffix = "state"
					break
				case comm.MissionMessageType:
					suffix = "mission"
					break
				case comm.ReorganizationMessageType:
					suffix = "reorganization"
					break
				case comm.RecalculatorMessageType:
					suffix = "recalculation"
					break
				case comm.GoalMessageType:
					suffix = "goal"
					break
				}
				suffix += "/"
				topic := conf.MessageTopicPrefix + vsMessage.SenderId + suffix
				token := client.Publish(topic, 0, false, agent)
				token.Wait()
				//drone, err := json.Marshal(update)

			default:
				//log.Println("no message from agents")
			}
		}

	}()

}

func subIfMissing(id string) {
	agentsMux.Lock()
	_, ok := knownAgents[id]
	agentsMux.Unlock()
	if !ok {
		agentsMux.Lock()
		knownAgents[id] = true
		agentsMux.Unlock()
		log.Println("Received message from new agent. Subscribing to correct topic")
		topic := conf.GoalTopicPrefix + id + "/goal/"
		log.Println("subscribing to: " + topic)
		token := client.Subscribe(topic, 1, nil)
		token.Wait()
	} else {
		//log.Println("Agent already known")
	}
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
	var data map[string]interface{}
	err := json.Unmarshal(msg.Payload(), &data)
	if err != nil {
		log.Println(err)
		return
	}

	imgString := data["img"].(string)
	posString := data["position"].(map[string]interface{})
	pos := agentlogic.Vector{
		X: posString["x"].(float64),
		Y: posString["y"].(float64),
		Z: posString["z"].(float64),
	}
	gm := comm.GoalMessage{
		MessageMeta: comm.MessageMeta{MsgType: comm.DiscoveryMessageType, SenderId: data["id"].(string), SenderType: comm.VisualizationAgentType},
		Position:    pos,
		Poi:         imgString,
	}

	select {
	case GoalInfo <- gm:

	default:
		log.Println("no message from agents")
	}

}

func NewTlsConfig(certURI string) *tls.Config {
	certpool := x509.NewCertPool()
	ca, err := ioutil.ReadFile(certURI)
	if err != nil {
		log.Fatalln(err.Error())
	}
	certpool.AppendCertsFromPEM(ca)
	return &tls.Config{
		RootCAs: certpool,
	}
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("Connected to MQTT broker")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("Connect lost to MQTT broker: %v", err)
}
