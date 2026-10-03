console.log("worker V02")
import { Node } from "./node.js";
import { Edge } from "./edge.js";
import { Car } from "./car.js";



var canvas = null;
var nodeCanvas = null
var ctx = null;
var nodeCtx = null;
var scaleX = 0.0;
var scaleY = 0.0;
var scale = 0;
const nodes = {};
const edges = {};
var cars = {};
var H = 0;
var W = 0;
const steps =[];
var stepCount=0;


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
        edges[id] = new Edge(id, nodes[start], nodes[end], speed, juntion);
        nodes[start].link(edges[id]);
        nodes[end].link(edges[id]);
    }
}

async function loadCars(e, step) {
    steps.push([]);
    const carFile = e.data.carFile + step + ".csv"
    const response = await fetch(carFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);

    for (let line of lines) {
        var parts = line.split(",");
        var id = parts[2];
        var x = parseFloat(parts[3]);
        var y = parseFloat(parts[4]);
        if (!(id in cars)) {
            cars[id] = new Car(id, x, y);
        }

        steps[stepCount].push([id, x, y])
    }
    stepCount++;
}


function drawNetwork(ct) {
    ct.clearRect(0, 0, W, H);
    ct.fillStyle = "black";
    ct.strokeStyle = "#999";
    ct.lineWidth = 1;
    for (var key in nodes) {
        const node = nodes[key];
        ct.beginPath();
        ct.arc(node.x * scale, H - node.y * scale, 1.3, 0, Math.PI * 2);
        ct.fill();
    }
    for (var key in edges) {
        const edge = edges[key];
        ct.beginPath();
        ct.moveTo(edge.start.x * scale, H - edge.start.y * scale);
        ct.lineTo(edge.end.x * scale, H - edge.end.y * scale);
        ct.stroke();
    }
}

function firstDraw(nodeCanvas, bufferCanvas, bufferCtx, ctx){
    bufferCtx.drawImage(nodeCanvas, 0, 0);
    ctx.drawImage(bufferCanvas, 0, 0);  
}

function draw(i) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(nodeCanvas, 0, 0);
    drawCar(ctx);
    console.log("*",i)
}
function drawCar(ct) {
    ct.fillStyle = "red";
    for (var key in cars) {
        const car = cars[key];
        ct.beginPath();
        ct.arc(car.x * scale, H - car.y * scale, 3.0, 0, Math.PI * 2);
        ct.fill();
    }
}

async function init(e) {
    canvas = e.data.canvas;
    const bufWidth = canvas.width || e.data.desiredWidth;
    const bufHeight = canvas.height || e.data.desiredHeight;

    nodeCanvas = new OffscreenCanvas(bufWidth, bufHeight);
    nodeCtx = nodeCanvas.getContext("2d");
    ctx = canvas.getContext("2d");

    await loadNodes(e);
    await loadEdges(e);
    await loadCars(e, 0)

    drawNetwork(nodeCtx);
    draw(0);
}

async function start(e) {
    console.log("Loading")
    for(let step = 8726; step<15000;step++){
        await loadCars(e,step);
        console.log(step);
    }
    console.log("moving",stepCount)
    for(var i=0; i<stepCount;i++){
        for(var j=0;j<steps[i].length;j++){
            var car=steps[i][j];
            cars[car[0]].x = car[1];
            cars[car[0]].y = car[2];
        }
        await new Promise(r => setTimeout(r, 50));
        draw(i);
    }
}


onmessage = function (e) {
    switch (e.data.type) {
        case "init":
            init(e);
            break;
        case "start":
            start(e);
            break;
    }
}