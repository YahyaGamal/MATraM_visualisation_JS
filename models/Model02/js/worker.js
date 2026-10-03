console.log("worker V02")
import { Node } from "./node.js";
import { Edge } from "./edge.js";
import { Car } from "./car.js";



var canvas = null;
var nodeCanvas = null
var bufferCanvas = null
var ctx = null;
var bufferCtx = null;
var nodeCtx = null;
var scaleX = 0.0;
var scaleY = 0.0;
var scale = 0;
var nodes = {};
var edges ={};
var cars ={};
var H = 0;
var W = 0;


async function loadNodes(e) {
    const response = await fetch(e.data.nodeFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    

    for (let line of lines) {
        var parts = line.split(",");
        var id = parts[0];
        var x = parseFloat(parts[1]);
        var y = parseFloat(parts[2]);
        var stopPoint = parseFloat(parts[3]);

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        nodes[id] = new Node(id, x, y, stopPoint);
    }
    H = e.data.desiredHeight;
    W = e.data.desiredWidth
    scaleX = W / (maxX - minX);
    scaleY = H / (maxY - minY);
    scale = Math.min(scaleX, scaleY);

}


async function loadEdges(e) {
    const response = await fetch(e.data.edgeFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);

    for (let line of lines) {
        var parts = line.split(",");
        var id = parts[0];
        var start = parts[1];
        var end = parts[2];
        var speed = parts[3];
        var juntion = parts[4];
        edges[id] = new Edge(id, nodes[start], nodes[end], speed,juntion);
        nodes[start].link(edges[id]);
        nodes[end].link(edges[id]);
    }
}

async function loadCars(e,step) {
    const carFile = e.data.carFile+step+".csv"
    console.log(carFile);
    const response = await fetch(carFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);

    for (let line of lines) {
        var parts = line.split(",");
        var id = parts[2];
        var x = parseFloat(parts[3]);
        var y = parseFloat(parts[4]);
        if(id in cars){
            cars[id].x = x;
            cars[id].y = y;
        }else{
            cars[id]= new Car(id,x,y);
        }
    }  
}


function drawNetwork(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "black";
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    for (var key in nodes) {
        const node = nodes[key];
        ctx.beginPath();
        ctx.arc(node.x * scale, H - node.y * scale, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
    for (var key in edges) {
        const edge = edges[key];
        ctx.beginPath();
        ctx.moveTo(edge.start.x * scale, H - edge.start.y * scale);
        ctx.lineTo(edge.end.x * scale , H - edge.end.y * scale);
        ctx.stroke();
    }
}

function draw(nodeCanvas,bufferCanvas,bufferCtx,ctx){
    bufferCtx.drawImage(nodeCanvas, 0, 0);
    drawCar(bufferCtx);
    ctx.drawImage(bufferCanvas, 0, 0);    
}
function drawCar(ctx){
    console.log("drawCar");
    ctx.fillStyle = "#d00";
    for (var key in cars) {
        console.log("C")
        const car = cars[key];
        ctx.beginPath();
        ctx.arc(car.x * scale, H - car.y * scale, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

async function init(e) {

    canvas = e.data.canvas;
    const bufWidth = canvas.width || e.data.desiredWidth;
    const bufHeight = canvas.height || e.data.desiredHeight;
  
    bufferCanvas = new OffscreenCanvas(bufWidth, bufHeight);
    bufferCtx = bufferCanvas.getContext("2d");
    nodeCanvas = new OffscreenCanvas(bufWidth, bufHeight);
    nodeCtx = nodeCanvas.getContext("2d");
    ctx = canvas.getContext("2d");

    await loadNodes(e);
    
    await loadEdges(e);
    await loadCars(e,0)
    
    drawNetwork(nodeCtx);
    
    draw(nodeCanvas,bufferCanvas,bufferCtx,ctx);
}


onmessage = function (e) {
    switch (e.data.type) {
        case "init":
            
            init(e);
            break;
    }
}