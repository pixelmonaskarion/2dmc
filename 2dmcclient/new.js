var client = require("./Client");
var blockChanged = () => {};
var playerMoved = () => {};
var player_id = client.connect((event) => {playerMoved(event)}, (event) => {blockChanged(event)});
var canvas = document.getElementById("canvas");
var cvWidth = canvas.width;
var cvHeight = canvas.height;
var ctx = canvas.getContext("2d");
var x = 0;
var keysDown = [];
var codesDown = [];
var tiles = [];
var lightMap = [];
var liquids = [];
var particles = [];
var zoom = 30;
var textures = true;
var blocks = { "grass": { "rgb": { "r": 0, "g": 255, "b": 0 }, "image": "grass", "type": 0, "light": 0 }, "stone": { "rgb": { "r": 100, "g": 100, "b": 100 }, "image": "stone", "type": 0, "light": 0 }, "dirt": { "rgb": { "r": 100, "g": 50, "b": 0 }, "image": "dirt", "type": 0, "light": 0 }, "air": { "rgb": { "r": 255, "g": 255, "b": 255 }, "type": 1, "light": 0 }, "light": { "rgb": { "r": 255, "g": 255, "b": 0 }, "type": 1, "light": 10 } };
var loadedImages = {};
//var grassImg = document.getElementById("grass");
//var stoneImg = document.getElementById("stone");
//var dirtImg = document.getElementById("dirt");
//grassImg.remove();
//dirtImg.remove();
//stoneImg.remove();
console.log("before keys");
var keys = Object.keys(blocks);
console.log("before images");
for (var i = 0; i < keys.length; i++) {
	loadedImages[keys[i]] = document.getElementById(keys[i]);
	if (document.getElementById(keys[i]) != null) {
		document.getElementById(keys[i]).remove();
	}
}
console.log("done");
window.oncontextmenu = function () {
	return false;     // cancel default menu
}
ctx.mozImageSmoothingEnabled = true;
ctx.webkitImageSmoothingEnabled = true;
ctx.msImageSmoothingEnabled = true;
ctx.imageSmoothingEnabled = true;

function keyWentUp(e) {
	var index = keysDown.indexOf(e.key.toLowerCase());
	if (index > -1) {
		keysDown.splice(index, 1);
	}
	index = codesDown.indexOf(e.code);
	if (index > -1) {
		codesDown.splice(index, 1);
	}
}

let secondJump = () => {};
let inventory = [];
let slot = 0;

function keyWentDown(e) {
	//console.log(parseInt(e.key));
	if (!isNaN(parseInt(e.key))) {
		slot = Math.max(Math.min(parseInt(e.key) - 1, inventory.length - 1), 0);
	}
	if (e.key.toLowerCase() == "t") {
		textures = !textures;
	}
	if (e.key.toLowerCase() == "w") {
		if (!keysDown.includes("w")) {
			secondJump();
		}
	}
	if (!keysDown.includes(e.key.toLowerCase())) {
		keysDown.push(e.key.toLowerCase());
	}
	//console.log(e.code);
	if (!codesDown.includes(e.code)) {
		codesDown.push(e.code);
	}
}

document.addEventListener('keydown', keyWentDown);
document.addEventListener('keyup', keyWentUp);
var mouseDown = [0, 0, 0, 0, 0, 0, 0, 0, 0],
	mouseDownCount = 0;
document.body.onmousedown = function (evt) {
	++mouseDown[evt.button];
	++mouseDownCount;
}
document.body.onmouseup = function (evt) {
	--mouseDown[evt.button];
	--mouseDownCount;
}
var mx = 0;
var my = 0;
document.onmousemove = handleMouseMove;
function handleMouseMove(evt) {
	mx = evt.clientX - 8;//canvas position on the document
	my = evt.clientY - 8;
}

client.getWorld((world) => {
	var world_width = world.width;
	var world_height = world.height;
	for (var x = 0; x < world.width; x++) {
		for (var y = 0; y < world.height; y++) {
			tiles.push(newBlock(x, y, world.blocks[y + (world.width * x)].block_type));
		}
	}

	var lightBlocks = new Map();
	for (var x = 0; x < world_width; x++) {
		for (var y = 0; y < world_height; y++) {
			let type = getBlock(x, y).name;
			if (blocks[type].light != 0) {
				lightBlocks.set(x + "," + y, blocks[type].light);
			}
		}
	}

	blockChanged = (event) => {
		console.log("block changed!", event);
		setBlock(event.block_update.x, event.block_update.y, newBlock(event.block_update.x, event.block_update.y, event.block_update.new_block.block_type));
		lightWorld();
	}

	var online_players = new Map();
	playerMoved = (event) => {
		online_players.set(event.player_move.player.uuid, event.player_move);
	}

	lightWorld();
	var player = { "x": 0, "y": (getTopBlock(0).y - 1) * zoom, "sy": 0, inAir: 10, jumped: false };
	
	inventory = [{ "type": "air" }, { "type": "stone" }, { "type": "dirt" }, { "type": "grass" }, { "type": "light" }];
	var speed = 0.2;
	var scrollX = player.x;
	var scrollY = player.y;
	var ticks = 0;



	function newBlock(x, y, block) {
		return { "x": x, "y": y, "color": blocks[block].rgb, "type": blocks[block].type, "light": blocks[block].light, "img": loadedImages[blocks[block].image], "name": block };
	}

	secondJump = () => {
		if (player.jumped == 1) {
			player.sy = -1;
			player.jumped = 2;
			for (var i = 0; i < 10; i++) {
				var dir = (Math.random() * 10) % Math.PI - Math.PI / 2;
				particles.push({ "x": player.x + zoom / 2, "y": player.y + zoom / 2, "sx": Math.sin(dir) * 10, "sy": Math.cos(dir) * 10, "time": 100, "maxTime": 100, "dir": 45 });
			}
		}
	}

	function rotate(x, y, theta) {
		return { "x": x * Math.cos(theta) - y * Math.sin(theta), "y": x * Math.sin(theta) + y * Math.cos(theta) };
	}

	function animate() {
		ctx.clearRect(0, 0, cvWidth, cvHeight);
		ticks++;
		ctx.canvas.width = window.innerWidth - 16;
		ctx.canvas.height = window.innerHeight - 16;
		cvWidth = window.innerWidth - 16;
		cvHeight = window.innerHeight - 16;
		if (keysDown.includes("w")) {
			if (player.jumped == 0) {
				player.jumped = 1;
				player.sy += -0.7;
			}
		}

		if (ticks % 10 == 0) {
			let vx = 0;
			if (keysDown.includes("a")) {
				vx -= speed * zoom;
			}
			if (keysDown.includes("d")) {
				vx += speed * zoom;
			}
			client.playerUpdate(player, player_id, vx, player.sy * zoom);
		}

		player.sy += 0.05;
		player.inAir += 1;
		moveY(player, player.sy * zoom);

		if (keysDown.includes("a")) {
			moveX(player, -speed * zoom);
		}

		if (keysDown.includes("d")) {
			moveX(player, speed * zoom);
		}

		for (var x = Math.floor((scrollX - cvWidth / 2) / zoom); x < Math.floor((scrollX + cvWidth / 2 + zoom) / zoom); x++) {
			for (var y = Math.floor((scrollY - cvHeight / 2) / zoom); y < Math.floor((scrollY + cvHeight / 2 + zoom) / zoom); y++) {
				var index = y + world_width * x;
				if (index > -1 && index < world_width * world_height) {
					drawTile(tiles[index]);
				}
			}
		}

		var i = 0;
		while (i < liquids.length) {
			i += drawLiquid(liquids[i]);
			i++;
		}
		for (var i = liquids.length - 1; i > -1; i--) {
			if (liquids[i].amount < 0.1) {
				liquids.splice(i, 1);
			}
		}
		ctx.fillStyle = "red";
		ctx.fillRect(player.x - scrollX + cvWidth / 2, player.y - scrollY + cvHeight / 2, zoom, zoom);
		ctx.fillStyle = "blue";
		online_players.forEach((player, uuid) => {
			ctx.fillRect(player.x - scrollX + cvWidth / 2, player.y - scrollY + cvHeight / 2, zoom, zoom);
			if (player.vx != undefined) {
				moveX(player, player.vx);
			}
			if (player.vy != undefined) {
				moveY(player, player.vy);
				player.vy += 0.05 * zoom;
			}
			online_players.set(uuid, player);
		});
		if (particles.length > 0) {
			lightWorld();
		}
		for (var i = 0; i < particles.length; i++) {
			ctx.globalAlpha = particles[i].time / particles[i].maxTime;
			ctx.fillStyle = "hsl(" + (particles[i].maxTime - particles[i].time) * 5 + ", 100%, 50%)";
			ctx.beginPath();
			var points = [{ "x": -5, "y": -5 }, { "x": -5, "y": 5 }, { "x": 5, "y": 5 }, { "x": 5, "y": -5 }];
			for (var p = 0; p < points.length; p++) {
				var point = rotate(points[p].x, points[p].y, particles[i].time / 10);
				//var point = points[p];
				if (Math.floor(point.x + particles[i].x - scrollX + cvWidth / 2) < cvWidth && Math.floor(point.x + particles[i].x - scrollX + cvWidth / 2) > 0) {
					if (Math.floor(point.y + particles[i].y - scrollY + cvHeight / 2) < cvHeight && Math.floor(point.y + particles[i].y - scrollY + cvHeight / 2) > 0) {
						ctx.lineTo(Math.floor(point.x + particles[i].x - scrollX + cvWidth / 2), Math.floor(point.y + particles[i].y - scrollY + cvHeight / 2));
					}
				}
				//ctx.fillRect(point.x+particles[i].x-scrollX+cvWidth/2, point.y+particles[i].y-scrollY+cvHeight/2, 10, 10);
			}
			ctx.fill();

			ctx.globalAlpha = 1;
			particles[i].time--;
			//getBlock(Math.floor(particles[i].x/zoom), Math.floor(particles[i].y/zoom)).light += 0.1/(particles[i].time/particles[i].maxTime);
			// if (getBlock(Math.floor(particles[i].x/zoom), Math.floor(particles[i].y/zoom)).type == 1) {
			//	particles[i].y += particles[i].sy;
			//	particles[i].x += particles[i].sx;
			//}
			particles[i].y += particles[i].sy;
			if (particles[i].sy != 0) {
				while (getBlock(Math.floor(particles[i].x / zoom), Math.floor(particles[i].y / zoom)).type != 1) {
					particles[i].y -= particles[i].sy / Math.abs(particles[i].sy);
				}
			}
			particles[i].x += particles[i].sx;
			if (particles[i].sx != 0) {
				while (getBlock(Math.floor(particles[i].x / zoom), Math.floor(particles[i].y / zoom)).type != 1) {
					particles[i].x -= particles[i].sx / Math.abs(particles[i].sx);
				}
			}


			particles[i].sx *= 0.9;
			particles[i].sy *= 0.9;
			particles[i].sy += 0.5;
		}

		var finalL = particles.length;
		for (var i = finalL - 1; i > -1; i--) {
			if (particles[i].time <= 0) {
				particles.splice(i, 1);
				lightWorld();
			}
		}

		//getBlock(Math.floor(player.x/zoom), Math.floor(player.y/zoom)).light = 100;
		if (mouseDown[0] == 1 || keysDown.includes("x")) {
			var mbx = Math.floor((mx + scrollX - cvWidth / 2) / zoom);
			var mby = Math.floor((my + scrollY - cvHeight / 2) / zoom);
			placeBlock(mbx, mby);
			//ctx.fillText("("+mbx+","+mby+")", mx, my);
		}
		// if (mouseDown[2] == 1 || keysDown.includes("c")) {
		//		var mbx = Math.floor((mx+scrollX-cvWidth/2)/zoom);
		//		var mby = Math.floor((my+scrollY-cvHeight/2)/zoom);
		//		getBlock(mbx, mby).type = 0;
		//		getBlock(mbx, mby).color = {"r":0, "g":0, "b":0};
		//		getBlock(mbx, mby).img = null;
		//}
		// if (keysDown.includes("l")) {
		//		var mbx = Math.floor((mx+scrollX-cvWidth/2)/zoom);
		//		var mby = Math.floor((my+scrollY-cvHeight/2)/zoom);
		//		getBlock(mbx, mby).type = 1;
		//		getBlock(mbx, mby).color = {"r":255, "g":255, "b":0};
		//		getBlock(mbx, mby).img = null;
		//}
		var x = (player.x + zoom / 2);
		var y = (player.y + zoom / 2);
		if (codesDown.includes("ArrowLeft")) {
			placeBlock(Math.floor(x / zoom) - 1, Math.floor(y / zoom));
		}
		if (codesDown.includes("ArrowUp")) {
			placeBlock(Math.floor(x / zoom), Math.floor(y / zoom) - 1);
		}
		if (codesDown.includes("ArrowDown")) {
			placeBlock(Math.floor(x / zoom), Math.floor(y / zoom) + 1);
		}
		if (codesDown.includes("ArrowRight")) {
			placeBlock(Math.floor(x / zoom) + 1, Math.floor(y / zoom));
		}
		scroll();

		for (var i = 0; i < inventory.length; i++) {
			if (slot == i) {
				ctx.fillStyle = "grey";
			} else {
				ctx.fillStyle = "white";
			}
			ctx.fillRect(i * zoom * 2 + 10, 10, zoom * 2, zoom * 2);
			var block = blocks[inventory[i].type];
			if (block.image != null) {
				ctx.drawImage(loadedImages[block.image], i * zoom * 2 + 25, 25, zoom, zoom);
			} else {
				ctx.fillStyle = colorToString(block.rgb);
				ctx.fillRect(i * zoom * 2 + 25, 25, zoom, zoom);
			}
		}
		//ctx.fillRect(0,0,100,100);
		drawOutline();
	}
	function lightWorld() {
		lightMap = new Array(world_width * world_height).fill(0);
		let localLightBlocks = new Map(lightBlocks);
		particles.forEach((particle) => {
			let lightAmount = 3 * particle.time / particle.maxTime;
			if (localLightBlocks.get(Math.round(particle.x / zoom) + "," + Math.round(particle.y / zoom)) < lightAmount || localLightBlocks.get(Math.round(particle.x / zoom) + "," + Math.round(particle.y / zoom)) == undefined) {
				localLightBlocks.set(Math.round(particle.x / zoom) + "," + Math.round(particle.y / zoom), lightAmount);
			}
		});
		localLightBlocks.forEach((light, block) => {
			let x = Number(block.split(",")[0]);
			let y = Number(block.split(",")[1]);
			setBlockField(x, y, "light", light)
		});
		var timer = Date.now();
		timer = Date.now();
		while (localLightBlocks.size > 0) {
			let lightPos = localLightBlocks.keys().next().value;
			localLightBlocks.delete(lightPos);
			let x = Number(lightPos.split(",")[0]);
			let y = Number(lightPos.split(",")[1]);
			if (getLight(x + 1, y) < getLight(x, y)) {
				setBlockField(x + 1, y, "light", getLight(x, y) - 1);
				localLightBlocks.set((x + 1) + "," + y, getLight(x, y) - 1);
			}
			if (getLight(x - 1, y) < getLight(x, y)) {
				setBlockField(x - 1, y, "light", getLight(x, y) - 1);
				localLightBlocks.set((x - 1) + "," + y, getLight(x, y) - 1);
			}
			if (getLight(x, y + 1) < getLight(x, y)) {
				setBlockField(x, y + 1, "light", getLight(x, y) - 1);
				localLightBlocks.set(x + "," + (y + 1), getLight(x, y) - 1);
			}
			if (getLight(x, y - 1) < getLight(x, y)) {
				setBlockField(x, y - 1, "light", getLight(x, y) - 1);
				localLightBlocks.set(x + "," + (y - 1), getLight(x, y) - 1);
			}
		}
	}

	function placeBlock(x, y) {
		var before = Object.assign({}, getBlock(x, y));
		if (before.name == inventory[slot].type) return;
		let finished = false;
		lightBlocks.forEach((_, block) => {
			if (block == x + "," + y && !finished) {
				lightBlocks.delete(block);
				finished = true;
			}
		});

		setBlock(x, y, newBlock(x, y, inventory[slot].type));
		if (playerTouchingBlocks(player)) {
			setBlock(x, y, before);
		} else {
			client.changeBlock(newBlock(x, y, inventory[slot].type), player_id);
			if (blocks[getBlock(x, y).name].light != 0) {
				lightBlocks.set(x + "," + y, blocks[getBlock(x, y).name].light);
			}
			lightWorld()
		}
	}

	function scroll() {
		scrollX += (player.x - scrollX) / 10;
		scrollY += (player.y - scrollY) / 20;
	}

	function drawTile(tile) {
		if (tile.x * zoom - scrollX + cvWidth / 2 > -world_width && tile.x * zoom - scrollX + cvWidth / 2 < cvWidth) {
			if (tile.y * zoom - scrollY + cvHeight / 2 > -world_height && tile.y * zoom - scrollY + cvHeight / 2 < cvHeight) {
				if (tile.img == null || textures != true) {
					let skylight = Math.max(getTopBlock(tile.x).y - tile.y + 10, 0)
					ctx.fillStyle = colorToString(colorMultiply(tile.color, Math.min(Math.max(getLight(tile.x, tile.y), skylight) / 10, 1)));
					ctx.fillRect(tile.x * zoom - scrollX + cvWidth / 2, tile.y * zoom - scrollY + cvHeight / 2, zoom + 1, zoom + 1);
				} else {
					ctx.drawImage(tile.img, tile.x * zoom - scrollX + cvWidth / 2, tile.y * zoom - scrollY + cvHeight / 2, zoom + 1, zoom + 1);
				}
			}
		}
	}

	function drawLiquid(liquid) {
		if (liquid.x * zoom - scrollX + cvWidth / 2 > -world_width && liquid.x * zoom - scrollX + cvWidth / 2 < cvWidth) {
			if (liquid.y * zoom - scrollY + cvHeight / 2 > -world_height && liquid.y * zoom - scrollY + cvHeight / 2 < cvHeight) {
				ctx.fillStyle = colorToString(colorMultiply({ "r": 0, "g": 0, "b": 255 }, Math.min(getLight(liquid.x, liquid.y), 1)));
				ctx.fillRect(liquid.x * zoom - scrollX + cvWidth / 2, liquid.y * zoom - scrollY + cvHeight / 2 + zoom - ((zoom + 1) * liquid.amount), zoom + 1, (zoom + 1) * liquid.amount);
			}
		}
		if (getBlock(liquid.x, liquid.y + 1).type == 1 && getLiquid(liquid.x, liquid.y + 1) == null) {
			liquid.y++;
			liquid.evap++;
		} else {
			if (getBlock(liquid.x + liquid.dir, liquid.y).type == 1 && getLiquid(liquid.x + liquid.dir, liquid.y) == null) {
				liquid.x += liquid.dir;
				liquid.evap++;
				//liquids.push({"x":liquid.x+liquid.dir, "y":y, "type":0, "dir":1, "evap":0, "amount":liquid.amount/2});
				//liquids[getLiquidIndex(liquid.x, liquid.y)].amount = liquid.amount/2;
			} else {
				liquid.dir *= -1;
			}
		}
		if (getLiquid(liquid.x + liquid.dir, liquid.y) != null) {
			if (getLiquid(liquid.x + liquid.dir, liquid.y).amount < liquid.amount) {
				var half = (getLiquid(liquid.x + liquid.dir, liquid.y) - liquid.amount) / 2
				//getLiquid(liquid.x+liquid.dir, liquid.y).amount += half;
				//liquids[getLiquidIndex(liquid.x, liquid.y)].amount -= half;
			}
		}
		if (liquid.evap > 100) {
			var li = getLiquidIndex(liquid.x, liquid.y);
			liquids.splice(li, 1);
			return -1;
		}
		return 0;
	}

	function getLiquid(x, y) {
		for (var i = 0; i < liquids.length; i++) {
			if (liquids[i].x == x && liquids[i].y == y) {
				return liquids[i];
			}
		}
		return null;
	}

	function getLiquidIndex(x, y) {
		for (var i = 0; i < liquids.length; i++) {
			if (liquids[i].x == x && liquids[i].y == y) {
				return i;
			}
		}
		return -1;
	}

	function colorMultiply(color, mult) {
		return { "r": color.r * mult, "g": color.g * mult, "b": color.b * mult };
	}

	function colorToString(color) {
		return "rgb(" + color.r + "," + color.g + "," + color.b + ")";
	}

	function getTopBlock(x) {
		for (var y = 0; y < world_height; y++) {
			if (getBlock(x, y).type == 0) {
				return getBlock(x, y);
			}
		}
		return getBlock(x, world_height-1);
	}

	function drawOutline() {
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, cvWidth, 10);
		ctx.fillRect(0, 0, 10, cvHeight);
		ctx.fillRect(0, cvHeight - 10, cvWidth, 10);
		ctx.fillRect(cvWidth - 10, 0, 10, cvHeight);
	}

	setInterval(animate, 1000 / 60);

	function getBlock(x, y) {
		if (x > -1 && x < world_width && y > -1 && y < world_height) {
			var block = tiles[y + (world_width * x)];
			return block;
		} else {
			return newBlock(x, y, "air");
		}
	}

	function getLight(x, y) {
		if (x > -1 && x < world_width && y > -1 && y < world_height) {
			var block = lightMap[y + (world_width * x)];
			return block;
		} else {
			return 0;
		}
	}

	function setBlock(x, y, block) {
		//if (x > -1 && x < size && y > -1 && y < size) {
		//console.log(JSON.stringify(block));
		tiles[y + (world_width * x)] = block;
		lightMap[y + (world_width * x)] = block.light;
		//}
	}

	function setBlockField(x, y, field, value) {
		if (x > -1 && x < world_width && y > -1 && y < world_height) {
			//console.log(JSON.stringify(block));
			if (field == "light") {
				lightMap[y + (world_width * x)] = value;
			} else {
				tiles[y + (world_width * x)][field] = value;
			}
		}
	}

	function playerBlocks(player) {
		var blocks = [];
		blocks.push(getBlock(Math.floor((player.x + 1) / zoom), Math.floor((player.y + 1) / zoom)));
		blocks.push(getBlock(Math.floor((player.x + zoom - 1) / zoom), Math.floor((player.y + zoom - 1) / zoom)));
		blocks.push(getBlock(Math.floor((player.x + zoom - 1) / zoom), Math.floor((player.y + 1) / zoom)));
		blocks.push(getBlock(Math.floor((player.x + 1) / zoom), Math.floor((player.y + zoom - 1) / zoom)));
		return blocks;
	}

	function playerTouchingBlocks(player) {
		//if (player.x > size*zoom || player.x < 0 || player.y > size*zoom || player.y < 0) return true;
		var blocks = playerBlocks(player);
		for (var i = 0; i < blocks.length; i++) {
			if (blocks[i] != null) {
				if (blocks[i].type == 0) {
					return true;
				}
			}
		}
		return false;
	}

	function moveX(player, x) {
		player.x += x;
		while (playerTouchingBlocks(player)) {
			player.x -= x / Math.abs(x);
		}
	}

	function moveY(player, y) {
		player.y += y;
		if (player.jumped != 1 && player.jumped != 2) {
			player.jumped = 3;
		}
		while (playerTouchingBlocks(player)) {
			player.y -= y / Math.abs(y);
			player.sy = 0;
			player.vy = 0;
			if (y > 0) {
				player.jumped = 0;
			}
		}
	}

});