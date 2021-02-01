

import * as THREE from './three/build/three.module.js';

import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import Stats from './three/examples/jsm/libs/stats.module.js';
//import { GUI } from './three/examples/jsm/libs/dat.gui.module.js';

//import { DragControls } from './three/examples/jsm/controls/DragControls.js';
//import { TransformControls } from './three/examples/jsm/controls/TransformControls.js'

//import * as UnitController from "./controller.js";

import {sendMessage}  from "./controller.js"

String.prototype.format = function () {

		var str = this;

		for ( var i = 0; i < arguments.length; i ++ ) {

			str = str.replace( '{' + i + '}', arguments[ i ] );

		}
		return str;

	};

var  stats;
var camera, scene, renderer, droneGroup, pathGroup, traveledGroup, reorgGroup;
// var splineHelperObjects = [];
// var splinePointsLength = 4;
// var positions = [];
// var point = new THREE.Vector3();

var drones = {};

// var geometry = new THREE.BoxBufferGeometry( 20, 20, 20 );
// var transformControl;

var container = document.getElementById( 'container' );

var raycaster = new THREE.Raycaster();
var intersects;
var mouse = new THREE.Vector3();
var width = 2000;
var height = 2000;

var widthTransFrom = [];
var widthTransTo = [-width/2,width/2];
var heightTransFrom = [];
var heightTransTo = [-height/2,height/2];
var controls; //camera controls

var missionPaths = {}

const ControllerAgent = 0
const ContextAgent    = 1


container.addEventListener('mousemove', onDocumentMouseMove, false);
container.addEventListener('mousedown', onDocumentMouseDown, false);
document.addEventListener('keyup', onDocumentKeyUp, false);


window.addEventListener('load', function () {
	init();
	animate();
	loadGoal();
})



/*var params = {
	uniform: true,
	tension: 0.5,
	centripetal: true,
	chordal: true,
	addPoint: addPoint,
	removePoint: removePoint,
	exportSpline: exportSpline
};*/



//let bounds = [[12.521023750305176, 55.7900991860081], [12.523276805877686, 55.791233191836255]]
//init(bounds);
//animate();

var sceneStarted = false;
function startScene(bounds){
	if(!sceneStarted){
		prepareTranslate(bounds)
		sceneStarted = true;
	}
}

// let bounds = {
// 	"Min":[12.521023750305176,55.7900991860081],
// 	"Max":[12.523276805877686, 55.791233191836255]
// };

// let arr = [
// 	// [12.521023750305176,55.7900991860081],
// 	// [12.523276805877686, 55.791233191836255]
// 	[ 12.521517276763916, 55.791233191836255 ],
// 	[ 12.521023750305176, 55.790376658569976 ],
// 	[ 12.522826194763184, 55.7900991860081 ],
// 	[ 12.523276805877686, 55.79095572537585 ],
// 	[ 12.521517276763916, 55.791233191836255 ]
// ];



// // points.push( new THREE.Vector3( - 1000, 20, -1000 ) );
// // points.push( new THREE.Vector3( -1000, 20, 1000 ) );
// // points.push( new THREE.Vector3( 1000, 20, 1000 ) );
// // points.push( new THREE.Vector3( 1000, 20, -1000 ) );
// // points.push( new THREE.Vector3( - 1000, 20, -1000 ) );
// prepareTranslate(bounds)
// addMissionArea(arr)

function addMissionPath(swarmGeo, color, height,id){
	if(id in missionPaths){
		return;
	}
	const points = [];
	let length = 0;
	swarmGeo.forEach(function(k,i){
		let p = transLngLat(k[0],k[1]);
		points.push( new THREE.Vector3( p[0], height, p[1] ) );
		length +=points[points.length-1].length()
		
	});

	const material = new THREE.LineBasicMaterial( { color: color} );
	const geometry = new THREE.BufferGeometry().setFromPoints( points );
	const line = new THREE.Line( geometry, material );

	line.name = id;
	missionPaths[id]={"path":line,"points":points,"length":length};
	
	//scene.add(line);
	pathGroup.add(line);
}


function prepareTranslate(bounds){
	//let bl = transLngLat(bounds["Min"][0],bounds["Min"][1]);
	// let tr = transLngLat(bounds["Max"][0],bounds["Max"][1]);
	// let width = Math.abs(bl[0] - tr[0]);
	// let height = Math.abs(bl[1] - tr[1]);
	// let bl = bounds["Min"];
	// let tr = bounds["Max"];

	// let widthStep = Math.abs(bounds['Min'][0]-bounds['Max'][0])*width;
	// let heightStep = Math.abs(bounds['Min'][1]-bounds['Max'][1])*height;

	widthTransFrom[0] = bounds['Min'][0];
	widthTransFrom[1] = bounds['Max'][0];

	heightTransFrom[0] = bounds['Min'][1];
	heightTransFrom[1] = bounds['Max'][1];
	
	// widthTrans = -width/2 + widthStep;
	// heightTrans = -height/2+heightStep;

	// widthTrans = -width/2+width/Math.abs(bounds['Min'][0]);
	// heightTrans = -height/2+height/Math.abs(bounds['Min'][1]);
}

function convertRange( value, r1, r2 ) { 
    return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
}


function transLngLat( lng, lat)
{
	let w = convertRange(lng,widthTransFrom,widthTransTo);
	let h = convertRange(lat,heightTransFrom, heightTransTo);
	// let af = lat.toString().split(".")[1].length
	// let realLat = lat*Math.pow(10,af-4);
	
	// let afLng = lng.toString().split(".")[1].length
	// let realLng = lng*Math.pow(10,afLng-4);

    // //let pos = [realLng,realLat];
	// let pos = [lng*100,lat*100];
	let pos = [w,h];
	//console.log(pos);
    return pos;

}

function init() {

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 250, 1000 );
	scene.add( camera );

	scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );
	var light = new THREE.SpotLight( 0xffffff, 1.5 );
	light.position.set( 100, 1500, 200 );
	light.angle = Math.PI * 0.2;
	light.castShadow = true;
	light.shadow.camera.near = 200;
	light.shadow.camera.far = 2000;
	light.shadow.bias = - 0.000222;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	scene.add( light );

	var planeGeometry = new THREE.PlaneBufferGeometry( width, height );
	//planeGeometry.rotateX( - Math.PI / 2 );
	
	var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );

	var plane = new THREE.Mesh( planeGeometry, planeMaterial );
	//plane.position.y = - 200;
	plane.receiveShadow = true;
	plane.name = "plane";
	scene.add( plane );
	
	var helper = new THREE.GridHelper( width, 100 );
	helper.position.y = - 20;
	helper.material.opacity = 0.25;
	helper.material.transparent = true;
	scene.add( helper );

	//var axes = new AxesHelper( 1000 );
	//axes.position.set( - 500, - 500, - 500 );
	//scene.add( axes );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	//renderer.setSize( window.innerWidth, window.innerHeight );
	
	renderer.setSize( container.clientWidth, container.clientHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	droneGroup = new THREE.Group();
	pathGroup = new THREE.Group();
	traveledGroup = new THREE.Group();
	reorgGroup = new THREE.Group();
	//droneGroup.rotateY(90);
	//droneGroup.rotateX( -Math.PI / 2 );
	scene.add(droneGroup);
	scene.add(pathGroup);
	scene.add(traveledGroup);
	scene.add(reorgGroup);


	/*var gui = new GUI();

	gui.add( params, 'uniform' );
	gui.add( params, 'tension', 0, 1 ).step( 0.01 ).onChange( function ( value ) {
		splines.uniform.tension = value;
		updateSplineOutline();
	} );

	gui.add( params, 'centripetal' );
	gui.add( params, 'chordal' );
	gui.add( params, 'addPoint' );
	gui.add( params, 'removePoint' );
	gui.add( params, 'exportSpline' );
	gui.open();*/

	// Controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;
	controls.addEventListener( 'change', render );
	
}

function animate() {

	requestAnimationFrame( animate );
	render();
	stats.update();

}


function render() {

	raycaster.setFromCamera(mouse, camera);
	intersects = raycaster.intersectObjects(droneGroup.children, true);
	
	let obj = getOOI(intersects);
	//show info about any ooi:
	let infoHolder = document.getElementById("info");
	if(obj!==null){
		let pos = obj.object.position;
		let agentId = obj.object.agentId
		let agent = drones[agentId];
		let realPos = agent.data.position;
		let content = "Id: "+agentId+"<br> Current Position: ("+pos.x+","+pos.y+","+pos.z+")<br> Real Position: ("+realPos.x+","+realPos.y+","+realPos.z+")";
		infoHolder.innerHTML=content;
		infoHolder.style.opacity = "1.0"; 
	}else{
		infoHolder.style.opacity = "0.0";
	}
	

	for(let k in reorgGroup.children){
		let line = reorgGroup.children[k];
		line.geometry.verticesNeedUpdate = true;
		line.material.opacity -=0.002;
		if(line.material.opacity<=0){
			reorgGroup.remove(line);
		}
	}

	renderer.render( scene, camera );
}



function loadGoal(){
	console.log("HEP")
	fetch("goal/goal.json")
  		.then(response => response.json())
  		.then(json => loadImg(json));

	function loadImg(json){
		console.log(json)
		var loader = new THREE.TextureLoader();

		// Load an image file into a custom material
		var material = new THREE.MeshLambertMaterial({
			map: loader.load(json['uri'])
		});
		console.log(material);
		// create a plane geometry for the image with a width of 10
		// and a height that preserves the image's aspect ratio
		var geometry = new THREE.PlaneGeometry(10, 10*.75);

		// combine our image geometry and material into a mesh
		var mesh = new THREE.Mesh(geometry, material);

		//NOTE: The position is the position in the visualization coordinate system
		let position = json['position'];
		
		//mesh.position.set(-607,0,742)
		//mesh.position.set(-700,0,450)
		mesh.position.set(position.X,position.Y,position.Z);
		mesh.scale.set(20,20,20);
		//mesh.rotation.y = Math.PI;

		// add the image to the scene
		scene.add(mesh);
	}


}



function updateAgent(data){
	
	if(!sceneStarted ){
		return;
	}
	let test = data.position.x.toString().split(".").length;
	data.vizPos = {}
	if(test>1){
		let tmp = transLngLat(data.position.x,data.position.y);
		
		data.vizPos.x = tmp[0];
		data.vizPos.y = data.position.z;
		data.vizPos.z = tmp[1];
	}else{
		data.vizPos.x = 0;
		data.vizPos.y = 80;
		data.vizPos.z = -height/2;
	}

	
	
		
	if(data.senderType == ContextAgent){
		if(data.id in drones){
			updateDrone(data);
		}else{
			addDrone(data);
		}
	}else{
		data.id="controller";
		if(data.id in drones){
			updateController(data);
		}else{
			addController(data);
		}
		
	}
}

function updateDrone(data){
	let drone = drones[data.id];
	
	
	drone.data = data;
	//let point = new THREE.Vector3(drone.mesh.position.x,drone.mesh.position.y,drone.mesh.position.z);
	let point = new THREE.Vector3(data.vizPos.x,data.vizPos.y,data.vizPos.z);
	//drone.path.push(JSON.parse(JSON.stringify(drone.mesh.position)));
	drone.path.push(point);
	if(drone.moving){
		drone.mesh.position.x = data.vizPos.x;
		drone.mesh.position.y = data.vizPos.y;
		drone.mesh.position.z = data.vizPos.z;
		let formerPos = drone.camera.position;
		let currentPos = drone.mesh.position;
		let look = formerPos.sub(currentPos);
		drone.camera.position.x = drone.mesh.position.x;
		drone.camera.position.y = drone.mesh.position.y;
		drone.camera.position.z = drone.mesh.position.z;
		drone.camera.lookAt(look);
		
	}else{
		drone.moving=true;
		drone.mesh.material.color = drone.color;
	}
	drone.mesh.scale.set(1,1,1);
	//send image
	renderer.render(scene, drone.camera);
    renderer.domElement.toBlob(function(blob){
		//console.log(blob);
		sendMessage(blob,drone.data.position, data.id);
		// var fd = new FormData();
		// fd.append('name', 'file');
		// fd.append('data', blob);
		// $.ajax({
		// 	type: 'POST',
		// 	url: 'http://localhost:8888/upload',
		// 	data: fd,
		// 	processData: false,
        //     contentType: false
		// });
	});
	
	let key = "travel-"+drone.data.id;
	removedTraveled(key);

	if(drone.pathVisible){
		let material = drone.mesh.material;
		
		var geometry = new THREE.BufferGeometry().setFromPoints( drone.path );
		var line = new THREE.Line( geometry, material );
		line.name = key;

		traveledGroup.add( line );
	}

	if(data.mission!=null && missionPaths[data.id]!=undefined){
		let pathHeight = -5;
		let currPathLen = missionPaths[data.id].length;
		let newLen = 0;
		data.mission[0].forEach(function(k,i){
			let p = transLngLat(k[0],k[1]);
			newLen +=new THREE.Vector3( p[0], pathHeight, p[1] ).length()
			
		});
		if(currPathLen!=newLen){
			//console.log("new mission!")
			//the agent's mission has been updated. We need to update the path as well
			pathGroup.remove(missionPaths[data.id].path);
			delete missionPaths[data.id];
			addMissionPath(data.mission[0], drone.pathColor,pathHeight, data.id)

		}
	}

	updateUIFields(drone);

}

function updateController(data){
	markMissionaire(data.id);
	let ctrl = drones[data.id];
	if(!ctrl.moving){
		ctrl.moving=true;
		ctrl.mesh.material.color = ctrl.color;
		ctrl.mesh.scale.set(1,1,1);
	}
}


function addDrone(droneData,pathColor){
	console.log("drone added");
	
	var width = 40;

	var droneId = droneData.id;
	
	var hColor = Math.floor(Math.random() * 361);
	var color = new THREE.Color("hsl("+hColor+", 100%, 50%)");
	if(pathColor==undefined){
		pathColor=color;
	}
	var geometry = new THREE.TetrahedronGeometry(width);
	var material = new THREE.MeshLambertMaterial({ color:color, transparent: true });
	var mesh = new THREE.Mesh( geometry, material ) ;
	material.opacity = 0.6;
	mesh.scale.set(3,3,3);
	
	let h = -5;
	
	if(droneData.mission!=null){
		addMissionPath(droneData.mission[0], pathColor,h, droneId)
	}
	
	mesh.position.x = droneData.vizPos.x;
	mesh.position.y = droneData.vizPos.y;
	mesh.position.z = droneData.vizPos.z;
	
	let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.x = mesh.position.x;
	camera.position.y = mesh.position.y;
	camera.position.z = mesh.position.z;

	var drone = {"data":droneData,"mesh":mesh,"path":[],"pathVisible":false, "color":color.clone(), "pathColor":pathColor,"moving":true, "camera":camera};
	drones[droneId] = drone;
	mesh.name = "OOI";
	mesh.agentId = droneId

	//scene.add( mesh );
	droneGroup.add( mesh );

	addUIElement(drone,false);
}


function addController(data){
	

	let color = new THREE.Color( 0x000000 );
	
	const geometry = new THREE.BoxGeometry( 40, 40, 200 );
	
	var material = new THREE.MeshLambertMaterial({ color:color, transparent: true });
	
	const rect = new THREE.Mesh( geometry, material );
	
	rect.position.x = data.vizPos.x;
	rect.position.y = data.vizPos.y;
	rect.position.z = data.vizPos.z;
	rect.rotateX( -Math.PI / 2 );
	
	rect.name = "OOI";

	console.log("add controller");
	// console.log(data);
	// console.log(drones);
	var ctrl = {"data":data,"mesh":rect,"path":[],"pathVisible":false, "color":color.clone()};
	drones[data.id] = ctrl;
	rect.agentId = data.id;


	//rect.rotateX( -Math.PI / 2 );
	let s = droneGroup.add(rect);
	console.log(rect);
	console.log(typeof rect.geometry)
	addUIElement(ctrl,true);
	
}


function newMission(msg){
	for(let i in missionPaths){
		if(i!="controller"){
			pathGroup.remove(missionPaths[i].path);
		}
		
	}
	addMissionPath(msg.MissionMessage.Geometry[0],0xff0000,20, msg.SenderId);
}

function reorganize(notice){
	let goneDrone = drones[notice.to];
	goneDrone.moving=false;
	goneDrone.mesh.scale.set(0.75,0.75,0.75);
	goneDrone.mesh.material.color.setHex(0x808080);
	//draw lines from observer
	let fromLocation = drones[notice.from].mesh.position;
	let toLocation = goneDrone.mesh.position;
	//et points = [fromLocation,toLocation];
	var lineGeom = new THREE.Geometry();
  	lineGeom.vertices.push(fromLocation);
  	lineGeom.vertices.push(toLocation);
	const material = new THREE.LineBasicMaterial( { color: 0xffff00 } );
	material.transparent = true;

	//const geometry = new THREE.BufferGeometry().setFromPoints( points );


	const line = new THREE.Line( lineGeom, material );
	reorgGroup.add(line);
}

function markMissionaire(id){
	for(let i in drones){
		let d = drones[i];
		
		if(i!="controller"){
			d.mesh.material.color.set(d.color);
		}
		
	}
	if(id!="controller"){
		let newC = drones[id];
		newC.mesh.material.color.setHex(0x000000);
	}
	
}




function addUIElement(agent,isCtrl){
	
	let tmp = document.getElementsByClassName("agentHolder")[0];
	
	let ui = tmp.cloneNode(true);
	ui.style.display = "inherit";
	let bgColor = agent.color.getStyle().slice(0,-1);
	bgColor = bgColor+",0.2)";

	ui.style.backgroundColor = bgColor;
	
	ui.id = "ah-"+agent.data.id;
	
	document.getElementById("gui").appendChild(ui);
	updateUIFields(agent);


	//set click handlers
	if(isCtrl) {
		ui.querySelector(".missionArea").style.display = "inherit";
		ui.querySelector("#missionAreaBtn").addEventListener('mousedown', function(evt){
			let line = missionPaths["controller"].path;
			if(scene.getObjectByName("controller") != undefined){
				//line visible
				pathGroup.remove(line);
			}else{
				pathGroup.add(line);
			}
		}, false);
	}
	

	ui.querySelector("#missionPathBtn").addEventListener('mousedown', function(evt){
		if(isCtrl){
			let show=false;
			let showBoundary=false;
			if(scene.getObjectByName("controller") != undefined){
				showBoundary=true;
			}
			
			for(let i in drones){
				if(scene.getObjectByName(i) == undefined){
					show=true;
				}
			}
			pathGroup.children = [];
			if(show){
				for(let i in missionPaths){
					pathGroup.add(missionPaths[i].path);
				}
			}
			if(showBoundary){
				if(scene.getObjectByName("controller") == undefined){
					pathGroup.add(missionPaths['controller'].path);
				}
			}

			
		}else{
			let line = missionPaths[agent.data.id].path;
			let pathShown = false;
			for(let k in pathGroup.children){
				let child = pathGroup.children[k];
				if(child.name==agent.data.id){
					pathGroup.remove(line);
					pathShown=true;
				}
			}
			if(!pathShown){
				pathGroup.add(line);
			}
		}
	}, false);

	ui.querySelector("#traveledPathBtn").addEventListener('mousedown', function(evt){
		if(isCtrl){
			let showPath = true;
			for(let i in drones){
				let drone = drones[i];
				if(drone.pathVisible){
					showPath=false;
					break;
				}
			}
			for(let i in drones){
				let drone = drones[i];
				drone.pathVisible=showPath;
			}
		}else{
			console.log("toggle");
			agent.pathVisible= !agent.pathVisible;
		}
	}, false);

	
}

function updateUIFields(agent){
	let id = "#ah-"+agent.data.id;
	let ui = document.querySelector(id);
	//set info
	ui.getElementsByClassName("title")[0].innerHTML = agent.data.id;
	ui.getElementsByClassName("vContent")[0].innerHTML = ""+agent.data.vizPos.x+",<br/>"+agent.data.vizPos.y+",<br/>"+agent.data.vizPos.z+"";
	ui.getElementsByClassName("rContent")[0].innerHTML = ""+agent.data.position.x+",<br/>"+agent.data.position.y+",<br/>"+agent.data.position.z+"";
}


function removedTraveled(key){
	let l = scene.getObjectByName(key)
	if(l != undefined){
		traveledGroup.remove(l);
	}
}



function getOOI(intersects){
	
	if(intersects.length>0){
		for(let i=0; i<intersects.length; i++){
			let obj = intersects[i];
			if(obj.object.name=="OOI"){
				//console.log(obj);
				return obj	
			}
		}
	}
	return null;
}


function onDocumentKeyUp(event){
	if(event.key=="r"){
		console.log("reset cam");
		if(controls!=undefined){
			controls.reset();
		}
		
	}
}



function onDocumentMouseMove(event) {
	event.preventDefault();

	/* mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; */
	mouse.x = (event.clientX / document.getElementById("container").offsetWidth) * 2 - 1;
	mouse.y = -(event.clientY / document.getElementById("container").offsetHeight) * 2 + 1;
	
}





function onDocumentMouseDown(event) {
	event.preventDefault();
  	console.info('mouseDown');

	let poi = scene.getObjectByName("plane");
	console.log(poi);
	intersects = raycaster.intersectObjects([poi], true);
	if(intersects.length>0){
		console.log(intersects[0].point);
	}else{
		console.log("no intersects");
	}
}

export {updateAgent, startScene, addMissionPath, newMission, reorganize, markMissionaire}