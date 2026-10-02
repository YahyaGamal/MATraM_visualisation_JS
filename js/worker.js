import { Node } from "./node.js";
import { Edge } from "./edge.js";



var canvas = null;
var ctx = null;
var scaleX = 0.0;
var scaleY = 0.0;
var scale = 0;
var nodes = {};
var edges ={};
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
    }
}


function draw() {
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

async function init(e) {
    canvas = e.data.canvas;
    ctx = canvas.getContext("2d");
    await loadNodes(e);
    await loadEdges(e);
    draw();
}


onmessage = function (e) {
    switch (e.data.type) {
        case "init":
            init(e);
            break;
    }
}