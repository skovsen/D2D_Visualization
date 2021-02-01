
import * as Scene from "./app.js";

const DiscoveryMessageType      = 0
const StateMessageType          = 1
const MissionMessageType        = 2
const ReorganizationMessageType = 3
const RecalculatorMessageType   = 4
var ws;
var reader = new FileReader();

function sendMessage(blob,position, droneId){
    
    if(!ws){
        console.log("no ws connection");
        return;
    }
    console.log(position);
    reader.readAsDataURL(blob); 
    reader.onloadend = function() {
        var base64data = reader.result.substring(22);                
        let data = {"img":base64data,"position":position, "id":droneId};
        ws.send(JSON.stringify(data));  
    }
    
}

window.addEventListener("load", function(evt) {
    
    connectWS();

    function connectWS(evt) {
		console.log("OPEN MG");
        if (ws) {
            return false;
        }
        ws = new WebSocket("ws://localhost:8080/output");
        console.log(ws);
        ws.onopen = function(evt) {
            console.log("OPEN");
        }
        ws.onclose = function(evt) {
            console.log("CLOSE");
            ws = null;
            setTimeout(connectWS, 2000)
        }
        var ctrlId = null;
        ws.onmessage = function(evt) {
            //console.log("RESPONSE: " + evt.data);
            let msg = null;
            try {
                msg = JSON.parse(evt.data);
            } catch (e) {
                console.log(evt.data);
                return;
            }
            //var drone = JSON.parse(evt.data);
            let drone = {}
            drone.id = msg.SenderId;
            drone.type = msg.SenderType;
            var id; 
            switch (msg.ContentType){
                
                case DiscoveryMessageType:
                    id = msg.SenderId;
                    if(msg.SenderId == ctrlId){
                        id = "controller";
                        Scene.markMissionaire(id);
                    }

                    return;
                case StateMessageType:

                    if(msg.MissionBound!=null){
                        let max = msg.MissionBound["Max"];
                        let min = msg.MissionBound["Min"];
                        let normal = max[0]+max[1]+min[0]+min[1];
                        if(normal>0){
                            Scene.startScene(msg.MissionBound);
                            
                            Scene.addMissionPath(msg.StateMessage.Mission.SwarmGeometry[0],0xff0000,20, "controller");
                            ctrlId = drone.id;
                        }
                    }

                    //console.log(msg);
                    drone.mission = msg.StateMessage.Mission.Geometry;
                    drone.senderType = msg.SenderType;
                    drone.batteryLevel = msg.StateMessage.Battery;
                    let pos = {};
                    pos.x = msg.StateMessage.Position.X;
                    pos.y = msg.StateMessage.Position.Y;
                    pos.z = msg.StateMessage.Position.Z;
                    
                    
                    drone.position = pos;
                    
                    break;
                case MissionMessageType:
                    //console.log("mission mesg")
                    //console.log(msg)
                    Scene.newMission(msg)
                    
                    return;
                    break;
                case ReorganizationMessageType:
                    let from = msg.SenderId;
                    if(msg.SenderId == ctrlId){
                        from = "controller";
                    }
                    let to = msg.DiscoveryMessage.UUID;
                    if(msg.DiscoveryMessage.UUID==ctrlId){
                        to = "controller"
                    }
                    let notice = {
                        from:from,
                        to:to
                    }
                    console.log(notice);
                    Scene.reorganize(notice);
                    return;
                    
                case RecalculatorMessageType:
                    console.log("recalc mesg")
                    console.log(msg);
                    id = msg.DiscoveryMessage.UUID;
                    if(msg.DiscoveryMessage.UUID==ctrlId){
                        id = "controller"
                    }
                    Scene.markMissionaire(id);
                    return;
                    //break;
            }
        
            Scene.updateAgent(drone);
            

        }
        ws.onerror = function(evt) {
            console.log("ERROR: " + evt.data);
        }
        return false;
    };
    
});

export {sendMessage}