# D2D web visualization tool

This is a ThreeJS based visualization tool for assisting in developing the D2D protocol

## Installation

The tool is built in Go with a JS frontend based on ThreeJS

To install Go on your platform, see here: https://golang.org/doc/install

## Usage

Run the server:
```bash
cd src/server
go run .
```
Now point your favorite browser to: localhost:8080

To start (currently) dummy agents:
Run the server:
```bash
cd src/agents
go run . -number=4
```
Where number is the number of agents you want to start



## Note
This is still a work in progress and only meets the basic needs so far.
