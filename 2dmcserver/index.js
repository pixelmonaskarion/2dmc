const PROTO_PATH = __dirname + '/../mcgame.proto';
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var perlin = require("./perlin.js").noise;

var packageDefinition = protoLoader.loadSync(
	PROTO_PATH,
	{
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true
	});
var protoDescriptor = packageDefinition;

function getServer() {
	var server = new grpc.Server();
	server.addService(protoDescriptor.McGame, {
		getWorld: (call, callback) => { callback(null, getWorld(call.request)) },
		events: events,
		sendEvent: (call, callback) => { callback(null, sendEvent(call.request)) }
	});
	return server;
}

var size = 500;
var world = [];

function getWorld(_empty) {

	world_proto = {
		width: size,
		height: size,
		blocks: world,
	};
	return world_proto;
}

var players = new Map();

function events(call) {
	console.log("connection opened with client", call.request.uuid);
	players.set(call.request.uuid, call);
}

function sendEvent(playerEvent) {
	players.forEach((call, playerUUID) => {
		if (playerUUID != playerEvent.player.uuid) {
			call.write(playerEvent.event);
		}
	});
}

function getBlock(x, y) {
	if (x > -1 && x < size && y > -1 && y < size) {
		var block = world[y + (size * x)];
		return block;
	} else {
		return {block_type: "air"};
	}
}

function setBlock(x, y, block) {
	if (x > -1 && x < size && y > -1 && y < size) {
		world[y + (size * x)] = block;
	}
}

function getTopY(x) {
	for (var y = 0; y < size; y++) {
		if (getBlock(x,y).block_type != "air") {
			return y;
		}
	}
	return size;
}

function createWorld() {
	for(var x = 0; x < size; x++) {
		var height = Math.floor((perlin.perlin2(x / 20, 0) + 10) * 20);
		for (var y = 0; y < size; y++) {
			var cave = Math.abs(perlin.perlin2(x / 50, y / 50)) * 255;
			var block = {};
			if (y < height) {
				block = { block_type: "air" };
			} else {
				block = { block_type: "stone" };
			}
			if (cave > 80) {
				block = { block_type: "air" };
			}
			setBlock(x, y, block);
		}
		var by = getTopY(x);
		setBlock(x, by, { block_type: "grass" });
		for (var dirt = 1; dirt < 6; dirt++) {
			if (getBlock(x, by + dirt).block_type == "stone") {
				setBlock(x, by + dirt, { block_type: "dirt" });
			}
		}
	}

	for (var i = 0; i < size / 10; i++) {
		var position = { "x": Math.floor(Math.random() * size), "y": Math.floor(Math.random() * size) };
		for (var length = 0; length < 10; length++) {
			var dir = perlin.perlin2(position.x / 10, position.y / 10) * 10;
			for (var step = 0; step < 4; step++) {
				var radius = 5;
				for (var dx = -radius; dx < radius + 1; dx++) {
					for (var dy = -radius; dy < radius + 1; dy++) {
						var bx = position.x + dx;
						var by = position.y + dy;
						var dist = Math.abs(Math.sqrt(Math.pow(position.x - bx, 2) + Math.pow(position.y - by, 2)));
						if (dist < radius) {
							setBlock(bx, by, {block_type: "air"});
						}
					}
				}
				position.x += Math.floor(Math.sin(dir) * 3);
				position.y += Math.floor(Math.cos(dir) * 3);
			}
		}
	}
}

createWorld();
var routeServer = getServer();
routeServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
	console.log("Starting GRPC server");
	routeServer.start();
});