var stub = null;

function connect(playerMoved, blockChanged) {
    const path = require('path'); var PROTO_PATH;
    const process = require('node:process');
    if (false) {
        // Production mode
        PROTO_PATH = path.join(process.resourcesPath, 'mcgame.proto');
    } else {
        // Development mode
        PROTO_PATH = path.join(__dirname, 'mcgame.proto');
    }
    var grpc = require('@grpc/grpc-js');
    var protoLoader = require('@grpc/proto-loader');
    const { randomUUID } = require('crypto');
    var packageDefinition = protoLoader.loadSync(
        PROTO_PATH,
        {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
    var mcgame = grpc.loadPackageDefinition(packageDefinition);
    console.log(mcgame);
    stub = new mcgame.McGame("10.0.7.216:50051", grpc.credentials.createInsecure());
    let player_id = randomUUID();
    let player = { uuid: player_id }
    var call = stub.events(player);
    call.on('data', function (event) {
        if (event.event_type == "BlockUpdateEvent") {
            blockChanged(event);
        } else if (event.event_type == "PlayerMoveEvent") {
            playerMoved(event);
        }
    });
    call.on('end', function () {
        console.log("connection ended ");
    });
    call.on('error', function (e) {
        console.log("connection error: ", e);
    });
    call.on('status', function (status) {
        console.log("connection status: ", status);
    });
    return player_id;
}

function getWorld(callback) {
    stub.getWorld({}, (err, res) => {
        if (err) {
            console.error(err);
        }
        callback(res);
    });
}

function changeBlock(block, id) {
    stub.sendEvent({
        player: {
            uuid: id,
        },
        event: {
            event_type: "BlockUpdateEvent",
            block_update: {
                x: block.x,
                y: block.y,
                new_block: {
                    block_type: block.name,
                }
            },
        },
    }, (err, res) => {});
}

let last_move;

function playerUpdate(player, id, vx, vy) {
    let player_event = {
        player: {
            uuid: id,
        },
        event: {
            event_type: "PlayerMoveEvent",
            player_move: {
                x: player.x,
                y: player.y,
                vx: vx,
                vy: vy,
                player: {
                    uuid: id,
                },
            },
        },
    };
    if (last_move == undefined) {
        last_move = player_event.event.player_move;
        stub.sendEvent(player_event, (err, res) => { });
    } else if (player_event.event.player_move.x != last_move.x || player_event.event.player_move.y != last_move.y || player_event.event.player_move.vx != last_move.vx || player_event.event.player_move.vy != last_move.vy) {
        last_move = player_event.event.player_move;
        stub.sendEvent(player_event, (err, res) => { });
    }
}

module.exports = {
    connect,
    getWorld,
    changeBlock,
    playerUpdate,
}