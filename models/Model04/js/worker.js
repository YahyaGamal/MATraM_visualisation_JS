console.log("worker V04")
import { Node } from "./node.js";
import { Edge } from "./edge.js";
import { Car } from "./car.js";
import { Building } from "./building.js";
import { Pedestrians} from "./pedestrians.js";


// ========================
// CONFIGURATION CONSTANTS
// ========================
var ANIMATION_DELAY_MS = 5;
var NODE_RADIUS = 1.3;
var CAR_RADIUS = 2.0;
var PEDESTRIANS_RADIUS = 2;
var NODE_COLOR = "black";
var EDGE_COLOR = "#999";
var CAR_COLOR = "#d00";
var PEDESTRIANS_COLOR = "#0d0";
var BUILDING_COLOR = "#FF8C00";
var HOUSE_COLOR = "#00d";
var BUILDING_SIZE = 3.0;

// ========================
// GLOBAL STATE GROUPED
// ========================

// Canvas contexts
var canvas = null;
var nodeCanvas = null;
var bufferCanvas = null;
var ctx = null;
var bufferCtx = null;
var nodeCtx = null;

// Scaling
var scaleX = 0.0;
var scaleY = 0.0;
var scale = 0;

// Network data
var nodes = {};
var edges = {};
var buildings = {};

// Animation state
var cars = {};
var pedestrians = {};
var allSteps = {};  
var minStep = Number.MAX_VALUE;
var maxStep = 0;
var running = false;
var animationFrame = null;
var currentStepIndex = 0;

// Viewport
var H = 0;
var W = 0;

// ========================
// LOADERS
// ========================

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
    W = e.data.desiredWidth;
    scaleX = W / (maxX - minX);
    scaleY = H / (maxY - minY);
    scale = Math.min(scaleX, scaleY);
}

async function loadBuildings(e) {
    const response = await fetch(e.data.buildingFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);
    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(',');
        var id = parts[0];
        var x = parseFloat(parts[1]);
        var y = parseFloat(parts[2]);
        
        // Register each building once
        if (!(id in buildings)) {
            buildings[id] = new Building("building",id, x, y);
            buildings[id].x = x;
            buildings[id].y = y;
        }
    }
}


async function loadHouses(e) {
    const response = await fetch(e.data.houseFile);
    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);
    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(',');
        var id = parts[0];
        var x = parseFloat(parts[1]);
        var y = parseFloat(parts[2]);
        
        // Register each building once
        if (!(id in buildings)) {
            buildings[id] = new Building("house",id, x, y);
            buildings[id].x = x;
            buildings[id].y = y;
        }
    }
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

async function loadAllCars(e) {
    console.log("Loading all car data...");

    var response = await fetch(e.data.carsFile);
    var text = await response.text();
    var lines = text.trim().split('\n').slice(1);

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(',');
        var row = parts[0];
        var step = Number(parts[1]);
        var id = parts[2];
        var x = parseFloat(parts[3]);
        var y = parseFloat(parts[4]);

        if(step<minStep){
            minStep=step;
        }
        if(step>maxStep){
            maxStep = step;
        }

        // Build step index
        if (!allSteps[step]) {
            allSteps[step] = [];
        }

        allSteps[step].push({
            type : 'car',
            id: id,
            x: x,
            y: y
        });

        // Register each car once
        if (!(id in cars)) {
            cars[id] = new Car(id, x, y);
            cars[id].x = x;
            cars[id].y = y;
        }
    }
    console.log("cars",Object.keys(cars).length,Object.keys(cars)[9]);
}


async function loadAllPedestrians(e) {
    console.log("Loading all pedestrians data...");

    var response = await fetch(e.data.pedestrianFile);
    var text = await response.text();
    var lines = text.trim().split('\n').slice(1);

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(',');
        var row = parts[0];
        var step = Number(parts[1]);
        var id = parts[2];
        var x = parseFloat(parts[3]);
        var y = parseFloat(parts[4]);

        if(step<minStep){
            minStep=step;
        }
        if(step>maxStep){
            maxStep = step;
        }

        // Build step index
        if (!allSteps[step]) {
            allSteps[step] = [];
        }

        allSteps[step].push({
            type: 'pedestrian',
            id: id,
            x: x,
            y: y
        });

        // Register each car once
        if (!(id in pedestrians)) {
            pedestrians[id] = new Pedestrians(id, x, y);
            pedestrians[id].x = x;
            pedestrians[id].y = y;
        }
    }
    console.log("pedestrians",Object.keys(pedestrians).length,Object.keys(pedestrians)[9]);
}

// ========================
// RENDERING
// ========================

function drawNetwork(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = NODE_COLOR;
    ctx.strokeStyle = EDGE_COLOR;
    ctx.lineWidth = 1;

    for (var key in edges) {
        const edge = edges[key];
        ctx.beginPath();
        ctx.moveTo(edge.start.x * scale, H - edge.start.y * scale);
        ctx.lineTo(edge.end.x * scale, H - edge.end.y * scale);
        ctx.stroke();
    }

    

    for (var key in buildings) {
        const building = buildings[key];
        if (building.type =='building'){
            ctx.strokeStyle = BUILDING_COLOR;
        }else{
            ctx.strokeStyle = HOUSE_COLOR;
        }
        ctx.beginPath();
        ctx.strokeRect(
            building.x * scale,
            H - building.y * scale,
            BUILDING_SIZE,
            BUILDING_SIZE,
        );
        ctx.fill();
    }
}

function drawCar(ctx) {
    ctx.fillStyle = CAR_COLOR;
    for (var key in cars) {
        const car = cars[key];
        ctx.beginPath();
        ctx.arc(car.x * scale, H - car.y * scale, CAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPedestrians(ctx) {
    ctx.fillStyle = PEDESTRIANS_COLOR;
    for (var key in pedestrians) {
        const car = pedestrians[key];
        ctx.beginPath();
        ctx.arc(car.x * scale, H - car.y * scale, PEDESTRIANS_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
}


function draw(nodeCanvas, bufferCanvas, bufferCtx, ctx) {
    ctx.clearRect(0, 0, W, H);
    bufferCtx.clearRect(0, 0, W, H);
    bufferCtx.drawImage(nodeCanvas, 0, 0);
    drawCar(bufferCtx);
    drawPedestrians(bufferCtx);
    ctx.drawImage(bufferCanvas, 0, 0);
}

// ========================
// ANIMATION CONTROLS
// ========================

// Bounds-checked position update
function updatePositions(step) {
    if (!(step in allSteps)) return;
    var stepData = allSteps[step];
    for (var i = 0; i < stepData.length; i++) {

        var data = stepData[i];
        var id = data.id;
        var x = data.x;
        var y = data.y;
        if(data.type == 'car'){
            if (id in cars) {
                cars[id].x = x;
                cars[id].y = y;
            }
        }
        if(data.type == 'pedestrian'){
            if (id in pedestrians) {
                pedestrians[id].x = x;
                pedestrians[id].y = y;
            }
        }
    }
}

// Centralised render call
function renderCurrentStep() {
    updatePositions(currentStepIndex);
    self.postMessage({
        type: "step",
        step: currentStepIndex,
    },)
    draw(nodeCanvas, bufferCanvas, bufferCtx, ctx);
}

function animate() {
    if (!running) return;

    renderCurrentStep();
    currentStepIndex++;

    if (currentStepIndex < maxStep) {
        setTimeout(function () {
            animationFrame = requestAnimationFrame(animate);
        }, ANIMATION_DELAY_MS);
    } else {
        console.log("Animation complete at step " + currentStepIndex);
        running = false;
    }
}

function play() {
    running = true;
    animate();
}

function stop() {
    running = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

// ========================
// INITIALIZATION
// ========================

async function setup(e) {
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
    await loadAllCars(e);
    await loadAllPedestrians(e);
    await loadBuildings(e);
    await loadHouses(e);

    // Draw first frame
    drawNetwork(nodeCtx);
    updatePositions(0);
    draw(nodeCanvas, bufferCanvas, bufferCtx, ctx);

    // Start animation
    currentStepIndex = 4000;
}

// ========================
// MESSAGE HANDLERS
// ========================

function handleInit(e) {
    setup(e);
}

function handlePlay(e) {
    play();
}

function handleStop(e) {
    stop();
}

function handleSeek(e) {
    var targetIndex = parseInt(e.data.step);
    if (targetIndex >= 0 && targetIndex < stepCount) {
        currentStepIndex = targetIndex;
        renderCurrentStep();
    }
}

onmessage = function (e) {
    switch (e.data.type) {
        case "init":
            handleInit(e);
            break;
        case "play":
            handlePlay(e);
            break;
        case "stop":
            handleStop(e);
            break;
        case "seek":
            handleSeek(e);
            break;
    }
};