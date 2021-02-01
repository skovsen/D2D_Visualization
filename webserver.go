package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"

	comm "github.com/alexandrainst/D2D-communication"
	"github.com/alexandrainst/agentlogic"

	"github.com/gorilla/websocket"
)

var addr = flag.String("addr", "localhost:8080", "http service address")

var upgrader = websocket.Upgrader{} // use default options
var AgentsInfo = make(chan comm.VisualizationMessage, 128)
var GoalInfo = make(chan comm.GoalMessage, 128)

func output(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}

	if !writeToClient(c, 1, []byte("From Server: connection established")) {
		return
	}

	go func() {
		log.Println("sub started from website")
		defer c.Close()
		for {
			//log.Println("in loop")
			select {
			case vsMessage := <-AgentsInfo:
				agent, err := json.Marshal(vsMessage)
				if err != nil {
					log.Println("ERRR WS!")
					log.Println(err)
				}
				//drone, err := json.Marshal(update)
				if !writeToClient(c, 1, agent) {
					log.Println("faled")
					return
				}
			default:
				//log.Println("no message from agents")
			}
		}
	}()
	go func() {
		defer c.Close()
		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				break
			}
			var data map[string]interface{}
			err = json.Unmarshal(msg, &data)
			if err != nil {
				log.Println(err)
				continue
			}
			imgString := data["img"].(string)
			posString := data["position"].(map[string]interface{})
			pos := agentlogic.Vector{
				X: posString["x"].(float64),
				Y: posString["y"].(float64),
				Z: posString["z"].(float64),
			}
			//log.Println(posString)
			// gm := comm.GoalMessage{
			// 	AgentId:  data["id"].(string),
			// 	MsgType:  comm.GoalMessageType,
			// 	Position: pos,
			// 	Poi:      imgString,
			// }
			gm := comm.GoalMessage{
				MessageMeta: comm.MessageMeta{MsgType: comm.DiscoveryMessageType, SenderId: data["id"].(string), SenderType: comm.VisualizationAgentType},
				Position:    pos,
				Poi:         imgString,
			}

			select {
			case GoalInfo <- gm:

			default:
				//log.Println("no message from agents")
			}
			// log.Println(imgString)
			// fi, err := os.Create("tt.txt")
			// if err != nil {
			// 	panic(err)
			// }
			// defer fi.Close()
			// n3, err := fi.WriteString(imgString)
			// if err != nil {
			// 	panic(err)
			// }
			// fmt.Printf("wrote %d bytes\n", n3)
			// fi.Sync()
			//panic("S")

			// content, err := ioutil.ReadFile("tt.txt")
			// if err != nil {
			// 	log.Fatal(err)
			// }

			// // Convert []byte to string and print to screen
			// imgString := string(content)

			// reader := base64.NewDecoder(base64.StdEncoding, strings.NewReader(imgString))
			// m, formatString, err := image.Decode(reader)
			// if err != nil {
			// 	log.Fatal(err)
			// }

			// bounds := m.Bounds()
			// fmt.Println(bounds, formatString)

			// //Encode from image format to writer
			// pngFilename := "test.png"
			// f, err := os.OpenFile(pngFilename, os.O_WRONLY|os.O_CREATE, 0777)
			// if err != nil {
			// 	log.Fatal(err)
			// 	return
			// }

			// err = png.Encode(f, m)
			// if err != nil {
			// 	log.Fatal(err)
			// 	return
			// }
			// fmt.Println("Png file", pngFilename, "created")
		}
	}()
}

func input(w http.ResponseWriter, r *http.Request) {
	// c, err := upgrader.Upgrade(w, r, nil)
	// if err != nil {
	// 	log.Print("upgrade:", err)
	// 	return
	// }

	// go func() {
	// 	log.Println("sub started from agent")
	// 	defer c.Close()
	// 	for {

	// 		//agentsInfo <- []byte("hej")
	// 		_, message, err := c.ReadMessage()
	// 		if err != nil {
	// 			log.Println("read:", err)
	// 			break
	// 		}
	// 		//AgentsInfo <- []byte(message)
	// 		/* log.Printf("recv: %s", message)
	// 		msg := "hi"
	// 		select {
	// 		case agentsInfo <- []byte(msg):
	// 			fmt.Println("sent message", msg)
	// 		default:
	// 			fmt.Println("no message sent")
	// 		} */
	// 		/* select {
	// 		//case agentsInfo <- []byte(message):
	// 		case agentsInfo <- []byte("message"):
	// 			log.Println("update received and forwarded")
	// 		default:
	// 			//log.Println("updated receieved and ignored")
	// 		} */
	// 		//log.Println("on channel")
	// 	}
	// }()
}

func writeToClient(c *websocket.Conn, messageType int, message []byte) bool {
	err := c.WriteMessage(messageType, message)
	if err != nil {
		log.Println("write:", err)
		return false
	}
	return true
}

func StartWebServer() {
	flag.Parse()
	log.SetFlags(0)
	log.Println("Starting...")

	http.HandleFunc("/output", output)
	//go test()
	dir := http.Dir("html")
	fs := http.FileServer(dir)
	http.Handle("/", fs)

	go func() {
		log.Fatal(http.ListenAndServe(*addr, nil))
	}()
}
