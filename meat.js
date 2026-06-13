const log = require("./log.js").log;
const Ban = require("./ban.js");
const Utils = require("./utils.js");
const io = require('./index.js').io;
const settings = require("./settings.json");
const sanitize = require('sanitize-html');
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

const SECRET_HASH = "8e6f8c5da0fa4951f0f7233ff4ce7e1584e32683656c56d8ff2b927820c506f7";

const MAX_ALTS = 3; // Maximum simultaneous connections allowed per IP (set to 1 to disable alts)

var colors = fs.readFileSync("./colors.txt").toString().replace(/\r/,"").split("\n");
var blacklist = fs.readFileSync("./blacklist.txt").toString().replace(/\r/,"").split("\n");
var colorBlacklist = fs.readFileSync("./colorWhitelist.txt").toString().replace(/\r/,"").split("\n");

var proxyBlocklist = (function() {
    var lines = fs.readFileSync("./proxyblocker.json").toString().replace(/\r/g, "").split("\n");
    var ips = new Set();
    lines.forEach(function(line) {
        line = line.trim();
        if (!line) return;
        var match = line.match(/^[a-z0-9+]+:\/\/([^:]+):/i);
        if (match) ips.add(match[1]);
    });
    return ips;
})();

let roomsPublic = [];
let rooms = {};
let usersAll = [];
var clientslowmode = [];

var bonziTvCommercialMode = false;
var bonziTvCool = false;

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function isPrivateIP(ip) {
    return /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1$|::ffff:127\.)/.test(ip);
}

function getRealIP(socket) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',').map(ip => ip.trim()).reverse();
        for (const ip of ips) {
            if (!isPrivateIP(ip)) return ip;
        }
    }
    const realIp = socket.handshake.headers['x-real-ip'];
    if (realIp && !isPrivateIP(realIp)) return realIp;
    return socket.request.connection.remoteAddress;
}

const BALANCE_FILE = path.join(__dirname, "balances.json");
let balances = {};
try {
    balances = require("./balances.json");
} catch (err) {
    console.error("Error reading balances.json:", err);
}

let _saveBalancesTimer = null;
function saveBalances() {
    if (_saveBalancesTimer) return;
    _saveBalancesTimer = setTimeout(function() {
        _saveBalancesTimer = null;
        fs.writeFile(
            "./balances.json",
            JSON.stringify(balances),
            { flag: 'w' },
            function(error) {
                if (error) {
                    log.info.log('error', 'banSave', { error: error });
                }
            }
        );
    }, 5000);
}

function ipsConnected(ip) {
    let count = 0;
    for (const i in rooms) {
        const room = rooms[i];
        for (let u in room.users) {
            const user = room.users[u];
            if (user.getIp() == ip) {
                count++;
            }
        }
    }
    return count;
}

const activePlayers = {};

exports.beat = function() {
    io.on('connection', function(socket) { 
        const ip = getRealIP(socket);

        if (checkConnectionFlood(ip)) {
            punishFlood(socket, ip, "Connection flood");
            return;
        }

        const user = new User(socket);

        socket.on("runscript", (code) => {
            if (containsBlockedCode(code)) {
                punishFlood(socket, ip, "Blocked script");
                return;
            }
        });

        socket.on("disconnect", () => {
            user?.destroy?.();
        });
    });

    var bonziTvCommercialMode = false;
    var bonziTvCool = false;

    let youtube_url = "https://www.youtube.com/watch?v=";
    let youtube_tiny_url = "https://www.youtube.com/watch?v=";
    let youtube_shorts_url = "";
    let youtube_embed_url = "";
    let youtube_music_url = "";

    var videoIdsMisc = [
        "https://www.youtube.com/watch?v=RClD1aPXNNs",
        "https://www.youtube.com/watch?v=10r-qEUsUzI",
        "https://www.youtube.com/watch?v=I42Oofhpf3o",
        "https://www.youtube.com/watch?v=w6bKUI_jj4c",
        "https://www.youtube.com/watch?v=wetOIrkZE7g",
        "https://www.youtube.com/watch?v=jy-NdRZMqWA",
        "https://www.youtube.com/watch?v=1tLWJyiQ35M",
        "https://www.youtube.com/watch?v=PWcYhloCrwQ",
        "https://www.youtube.com/watch?v=wPrIfIWE16A",
        "https://www.youtube.com/watch?v=QoXfKyc4RGo",
        "https://www.youtube.com/watch?v=9yUuejUVikM",
        "https://www.youtube.com/watch?v=xOMxYKxbSqo",
        "https://www.youtube.com/watch?v=0jgheGgqrlk",
        "https://www.youtube.com/watch?v=YQa2-DY7Y_Q",
        "https://www.youtube.com/watch?v=8LY0o_CgPR",
        "https://www.youtube.com/watch?v=JfzEO9-Zlhw",
        "https://www.youtube.com/watch?v=rhkgOXksmaY",
        "https://www.youtube.com/watch?v=cdmVPHdpECM",
    ];

    var videoIdsCommercials = [
        "https://www.youtube.com/watch?v=75OKjPBYTCg",
        "https://www.youtube.com/watch?v=qQKd7VxAMBY",
        "https://www.youtube.com/watch?v=ZZz3A6H4f-E",
        "https://www.youtube.com/watch?v=qQKd7VxAMBY",
        "https://www.youtube.com/watch?v=vRpADLCVfoM",
        "https://www.youtube.com/watch?v=HKJopZ6MvPE",
    ];

    function filtertext(tofilter) {
        var filtered = false;
        blacklist.forEach(listitem => {
            if (tofilter.includes(listitem)) filtered = true;
        });
        return filtered;
    }

    function checkRoomEmpty(room) {
        if (room.users.length != 0) return;

        log.info.log('info', 'removeRoom', {
            room: room
        });

        let publicIndex = roomsPublic.indexOf(room.rid);
        if (publicIndex != -1)
            roomsPublic.splice(publicIndex, 1);
        
        room.deconstruct();
        delete rooms[room.rid];
        delete room;
    }

    class Room {
        constructor(rid, prefs) {
            this.rid = rid;
            this.prefs = prefs;
            this.users = [];
                    
            const date = new Date();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            if (rid == "bonzi_tv") {
                var num = Math.floor(Math.random() * videoIdsMisc.length);
                var vid = videoIdsMisc[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", "");
                this.vid = vid;
            } else {
                this.vid = "";
            }
        }

        deconstruct() {
            try {
                this.users.forEach((user) => {
                    user.disconnect();
                });
            } catch (e) {
                log.info.log('warn', 'roomDeconstruct', {
                    e: e,
                    thisCtx: this
                });
            }
        }

        isFull() {
            return this.users.length >= this.prefs.room_max;
        }

        join(user) {
            user.socket.join(this.rid);
            this.users.push(user);
            this.updateUser(user);
        }

        leave(user) {
            try {
                this.emit('leave', {
                    guid: user.guid
                });
         
                let userIndex = this.users.indexOf(user);
                if (userIndex == -1) return;
                this.users.splice(userIndex, 1);
                checkRoomEmpty(this);
            } catch(e) {
                log.info.log('warn', 'roomLeave', {
                    e: e,
                    thisCtx: this
                });
            }
        }

        updateUser(user) {
            this.emit('update', {
                guid: user.guid,
                userPublic: user.public
            });
        }

        getUsersPublic() {
            let usersPublic = {};
            this.users.forEach((user) => {
                usersPublic[user.guid] = user.public;
            });
            return usersPublic;
        }

        emit(cmd, data) {
            io.to(this.rid).emit(cmd, data);
        }
    }

    function newRoom(rid, prefs) {
        rooms[rid] = new Room(rid, prefs);
        log.info.log('info', 'newRoom', {
            rid: rid
        });
    }

    let userCommands = {
        "godmode": function(word) {
            if (!word || word === "") {
                return;
            }
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 3;
                this.public.name = "<font color=\"red\">" + this.public.name + "</font>";
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 3 });
            }
            log.info.log('info', 'godmode', {
                guid: this.guid,
                success: success
            });
        },

        "stop": function() {
            process.exit(1);
        },

        "adminword": function(word) {
            if (!word || word === "") {
                return;
            }
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 4;
                this.public.name = "<font color=\"blue\">" + this.public.name + "</font>";
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 4 });
            }
            log.info.log('info', 'adminword', {
                guid: this.guid,
                success: success
            });
        },

        "bonzitv_code": function(word) {
            if (!word || word === "") {
                return;
            }
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 2;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 2 });
            }
            log.info.log('info', 'bonzitv_code', {
                guid: this.guid,
                success: success
            });
        },

        "mod_code": function(word) {
            if (!word || word === "") {
                return;
            }
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.public.name = `<font color=\"green\">${this.public.name}</font>`;
                this.private.runlevel = 3;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 3 });
            }
            log.info.log('info', 'mod_code', {
                guid: this.guid,
                success: success
            });
        },

        "overlus": function(word) {
            if (!word || word === "") {
                return;
            }
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.public.name = `<font color=\"purple\">${this.public.name}</font>`;
                this.private.runlevel = 4;
                this.private.sanitize = "off";
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 4 });
                balances[this.getIp()] = 2147483647;
                this.socket.emit("balanceUpdate", balances[this.getIp()]);
            }
            log.info.log('info', 'overlus', {
                guid: this.guid,
                success: success
            });
        },

        "asshole": function() {
            this.room.emit("asshole", {
                guid: this.guid,
                target: sanitize(Utils.argsString(arguments))
            });
        },

        "owo": function() {
            this.room.emit("owo", {
                guid: this.guid,
                target: sanitize(Utils.argsString(arguments))
            });
        },

        startyping: function() {
            this.room.emit("typing", { guid: this.guid });
        },

        stoptyping: function() {
            this.room.emit("stoptyping", { guid: this.guid });
        },

        "sanitize": function() {
            let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
            let argsString = Utils.argsString(arguments);
            this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
        },

        "kick": function(data) {
            let pu = this.room.getUsersPublic()[data];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => {
                    if (n.guid == data) {
                        target = n;
                    }
                });
                
                if (target.private.runlevel < 0.5) {
                    target.socket.emit("kick", {
                        reason: "You got kicked.<br>Kicked by " + this.public.name,
                    });
                    target.disconnect();
                    target.socket.disconnect();
                    this.room.leave(target);
                }
            }
        },

        "bless": function(data) {
            let pu = this.room.getUsersPublic()[data];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => {
                    if (n.guid == data) {
                        target = n;
                    }
                });
                
                if (target.private.runlevel < 2) {
                    target.public.color = "blessed";
                    this.room.updateUser(target);
                    target.private.runlevel = 0.5;
                    target.socket.emit("blessed");
                }
            }
        },

        "zombify": function(data) {
            this.public.color = "undead";
            this.room.updateUser(this);
        },

        "joke": function() {
            this.room.emit("joke", {
                guid: this.guid,
                rng: Math.random()
            });
        },

        "rooms": function() {
            console.log("Rooms command executed - showing room count");
            const roomCount = Object.keys(rooms).length;
            this.socket.emit("rooms", {
                count: roomCount
            });
        },

        "dialogueended": function() {
            this.room.emit("dialogueended");
        },

        "fact": function() {
            this.room.emit("fact", {
                guid: this.guid,
                rng: Math.random()
            });
        },

        "youtube": function(vidRaw) {
            if (vidRaw.includes("\"")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            if (vidRaw.includes("'")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
            this.room.emit("youtube", {
                guid: this.guid,
                vid: vid
            });
        },

        "video": function(vidRaw) {
            if (!vidRaw.match(/catbox/gi)) return;
            if (vidRaw.includes("\"")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            if (vidRaw.includes("'")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            var vid = vidRaw.replace("\"", "").replace("'", "").replace("&#", "").replace(">", "").replace("<", "");
            this.room.emit("video", {
                guid: this.guid,
                vid: vid
            });
        },

        "img": function(vidRaw) {
            if (!vidRaw.match(/catbox/gi)) return;
            if (vidRaw.includes("\"")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            if (vidRaw.includes("'")) {
                this.room.emit("talk", {
                    guid: this.guid,
                    text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO"
                });
                return;
            }
            var vid = vidRaw.replace("\"", "").replace("'", "").replace("&#", "").replace(">", "").replace("<", "");
            this.room.emit("img", {
                guid: this.guid,
                vid: vid
            });
        },

        "color": function(color) {
            if (color.startsWith("http") && this.private.runlevel > 2) {
                this.public.color = color;
                this.room.updateUser(this);
                return;
            }
            if (typeof color != "undefined") {
                if (settings.bonziColors.indexOf(color) == -1 && this.private.runlevel < 2)
                    return;
                this.public.color = color;
            } else {
                let bc = settings.bonziColors;
                this.public.color = bc[Math.floor(Math.random() * bc.length)];
            }
            this.room.updateUser(this);
        },

        ban: function(guid, reason, type) {
            if (this.private.runlevel < 3) {
                this.socket.emit("alert", "This command requires administrator privileges");
                return;
            }

            let pu = this.room.getUsersPublic()[guid];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => {
                    if (n.guid == guid) {
                        target = n;
                    }
                });
                if (!target) return;
                const ip = target.getIp();
                if (ip == "::1" || ip == "::ffff:127.0.0.1") {
                    Ban.removeBan(ip);
                } else {
                    if (target.private.runlevel > 2 && this.getIp() != "::1" && this.getIp() != "::ffff:127.0.0.1") {
                        return;
                    }
                    const banReason = reason || "You got banned.";
                    const length = (type === "perma") ? 999999 : 1440;
                    Ban.addBan(ip, length, banReason);
                    target.socket.emit("ban", {
                        reason: banReason,
                    });
                    target.disconnect();
                }
            }
        },

        "agent": function(color) {
            if (typeof color != "undefined") {
                if (settings.agents.indexOf(color) == -1 && settings.secretAgents.indexOf(color) == -1 && this.private.runlevel < 2)
                    return;
                this.public.color = color;
            } else {
                let bc = settings.agents;
                this.public.color = bc[Math.floor(Math.random() * bc.length)];
            }
            this.room.updateUser(this);
        },

        "voice": function() {
            this.public.voice = Utils.argsString(arguments);
            this.room.updateUser(this);
        },

        "pope": function() {
            this.public.color = "pope";
            this.room.updateUser(this);
        },

        "name": function() {
            let argsString = Utils.argsString(arguments);
            if (argsString.length > this.room.prefs.name_limit)
                return;
            let name = argsString || this.room.prefs.defaultName;
            this.public.name = this.private.sanitize ? sanitize(name) : name;
            if (this.private.runlevel >= 4) {
                this.public.name = "<font color=\"blue\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>";
            } else if (this.private.runlevel == 3) {
                this.public.name = "<font color=\"red\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>";
            } else if (this.private.runlevel == 2) {
                this.public.name = "<font color=\"green\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>";
            }
            this.room.updateUser(this);
        },

        "tag": function() {
            let argsString = Utils.argsString(arguments);
            if (argsString.length > 80)
                return;
            if (!/^[~`!@#$%^&*()_+=\w[\]\\{}|;':",.\//<>?\s\w&.\-б]*$/i.test(argsString)) return;
            let name = argsString || "";
            this.public.tag = this.private.sanitize ? sanitize(name) : name;
            this.room.updateUser(this);
        },

        "pitch": function(pitch) {
            pitch = parseInt(pitch);
            if (isNaN(pitch)) return;
            this.public.pitch = Math.max(Math.min(parseInt(pitch), this.room.prefs.pitch.max), this.room.prefs.pitch.min);
            this.room.updateUser(this);
        },

        "speed": function(speed) {
            speed = parseInt(speed);
            if (isNaN(speed)) return;
            this.public.speed = Math.max(Math.min(parseInt(speed), this.room.prefs.speed.max), this.room.prefs.speed.min);
            this.room.updateUser(this);
        },

        "exit": function() {
            this.room.emit('leave', {
                guid: this.guid
            });
            this.room.leave(this);
        },

        "smite": function() {
            io.emit("smite");
        },

        "inflate": function() {
            io.emit("inflate");
        },

        "deflate": function() {
            io.emit("deflate");
        },

        "bigger": function() {
            this.room.emit("bigger", {
                guid: this.guid
            });
        },

        "reset": function() {
            this.room.emit("reset", {
                guid: this.guid
            });
        },

        "smaller": function() {
            this.room.emit("smaller", {
                guid: this.guid
            });
        },

        "nuke": function(data) {
            let pu = this.room.getUsersPublic()[data];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => {
                    if (n.guid == data) {
                        target = n;
                    }
                });
                if (target.private.runlevel < 2) {
                    this.room.emit("nuke", {
                        id: target.guid
                    });
                    target.socket.emit("nuked");
                    var _this = this;
                    setTimeout(function() {
                        _this.room.leave(target);
                    }, 5000);
                }
            }
        },

        move: function(x, y, isDrag) {
            if (isDrag && this.bounceInterval) {
                clearInterval(this.bounceInterval);
                this.bounceInterval = null;
            }
            this.public.x = x;
            this.public.y = y;
            this.room.emit("move", {
                guid: this.guid,
                posX: x,
                posY: y,
            });
        },

        dvdbounce: function() {
            if (this.bounceInterval) {
                clearInterval(this.bounceInterval);
            }
            const screenWidth = 800;
            const screenHeight = 600;
            const speed = 8;
            if (!this.public.x) this.public.x = Math.random() * (screenWidth - 100);
            if (!this.public.y) this.public.y = Math.random() * (screenHeight - 100);
            this.dvdVelocityX = Math.random() > 0.5 ? speed : -speed;
            this.dvdVelocityY = Math.random() > 0.5 ? speed : -speed;
            const _this = this;
            this.bounceInterval = setInterval(function() {
                _this.public.x += _this.dvdVelocityX;
                _this.public.y += _this.dvdVelocityY;
                if (_this.public.x <= 0 || _this.public.x >= screenWidth - 100) {
                    _this.dvdVelocityX = -_this.dvdVelocityX;
                    _this.public.x = Math.max(0, Math.min(screenWidth - 100, _this.public.x));
                }
                if (_this.public.y <= 0 || _this.public.y >= screenHeight - 100) {
                    _this.dvdVelocityY = -_this.dvdVelocityY;
                    _this.public.y = Math.max(0, Math.min(screenHeight - 100, _this.public.y));
                }
                _this.room.emit("move", {
                    guid: _this.guid,
                    posX: _this.public.x,
                    posY: _this.public.y,
                });
            }, 16);
        },

        stopdvd: function() {
            if (this.bounceInterval) {
                clearInterval(this.bounceInterval);
                this.bounceInterval = null;
            }
        },

        look: function(deg) {
            this.room.emit("look", {
                guid: this.guid,
                deg: deg,
            });
        },

        size: function(size) {
            this.room.emit("size", {
                guid: this.guid,
                size: size,
            });
        },

        bonzigame: function() {
            this.room.emit("state_banhammer");
        },

        bowserfight: function() {
            this.room.emit("state_bowserfight");
        },

        masterhandfight: function() {
            this.room.emit("state_masterhandfight");
        },

        bombminigame: function() {
            if (this.private.runlevel < 4) return;
            this.room.emit("state_bombminigame");
        },

        "linux": "passthrough",
        "pawn": "passthrough",
        "bees": "passthrough",

        "anim": function() {
            this.room.emit("anim", {
                guid: this.guid,
                anim: sanitize(Utils.argsString(arguments))
            });
        },

        "youtuber_code": function(word) {
            let success = word == this.room.prefs.youtuber_code;
            if (success) {
                this.public.name = "<font color=\"maroon\">" + this.public.name + "</font>";
                this.private.runlevel = 0.5;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 0.5 });
            }
            log.info.log('info', 'youtuber_code', {
                guid: this.guid,
                success: success
            });
        },
    };

    const fetch = require('node-fetch');

    async function getAvatarThumbnail(userId) {
        const url = `https://thumbnails.roproxy.com/v1/users/avatar?userIds=${userId}&size=352x352&format=Png&isCircular=false`;
        const response = await fetch(url);
        const data = await response.json();
        return data.data[0].imageUrl;
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    class User {
        constructor(socket) {
            this.guid = Utils.guidGen();
            this.socket = socket;
            
            if (ipsConnected(this.getIp()) >= MAX_ALTS && this.getIp() != "::1") {
                this.socket.disconnect();
                return;
            }
            if (Ban.isBanned(this.getIp())) {
                Ban.handleBan(this.socket);
                return;
            }
            if (proxyBlocklist.has(this.getIp())) {
                log.access.log('info', 'proxyBlock', {
                    guid: this.guid,
                    ip: this.getIp()
                });
                this.socket.emit('loginFail', { reason: "proxy" });
                this.socket.disconnect();
                return;
            }
            
            this.private = {
                login: false,
                sanitize: true,
                runlevel: 0
            };

            let bc = settings.bonziColors;
            this.public = {
                color: bc[Math.floor(Math.random() * bc.length)],
                voice: "en-US",
                roblox: false,
                blessed: false,
                x: getRandomInt(0, 1024),
                y: getRandomInt(0, 768)
            };
            
            log.access.log('info', 'connect', {
                guid: this.guid,
                agent: this.getAgent(),
                ip: this.getIp()
            });
                    
            var _this = this;
            this.shouldTalkAgain = true;
            
            this.socket.on('login', this.login.bind(this));
            this.socket.on('blessed', function() {
                _this.public.blessed = true;
            });
            this.socket.on('banhammer_hit', function(data) {
                _this.room.emit("explode", data);
            });
            this.socket.on('command', this.command.bind(this));
            
            if (!balances[_this.getIp()]) {
                balances[_this.getIp()] = 100;
                saveBalances();
            }
            
            var blessed = this.public.blessed;
            this.earnInterval = setInterval(() => {
                if (blessed) {
                    balances[_this.getIp()] += 10;
                    _this.socket.emit("earned", 10);
                    _this.socket.emit("balanceUpdate", balances[_this.getIp()]);
                    saveBalances();
                }
            }, 10000);

            this.socket.on("spend", amount => {
                if (typeof amount === "number" && amount > 0 && balances[_this.getIp()] >= amount) {
                    balances[_this.getIp()] -= amount;
                    _this.socket.emit("balanceUpdate", balances[_this.getIp()]);
                    saveBalances();
                } else {
                    _this.socket.emit("errorMessage", "Not enough coins.");
                }
            });
            
            this.socket.on("evilbonzikilled", (data) => {
                balances[_this.getIp()] += 100;
                _this.socket.emit("earned", 100);
                _this.socket.emit("balanceUpdate", balances[_this.getIp()]);
            });

            this.socket.on("bowserkilled", (data) => {
                balances[_this.getIp()] += 150;
                _this.socket.emit("earned", 150);
                _this.socket.emit("balanceUpdate", balances[_this.getIp()]);
            });

            this.socket.on("bowser_hit", (data) => {
                _this.room.emit("explode", data);
            });

            this.socket.on("bomb_hit", (data) => {
                _this.room.emit("explode", data);
            });
            
            this.socket.on("bulletshoot", () => {
                _this.room.emit("agent_bullet", { id: this.guid });
            });
        }

        getIp() {
            return getRealIP(this.socket);
        }

        getAgent() {
            return this.socket.handshake.headers["user-agent"];
        }

        getPort() {
            return this.socket.handshake.address.port;
        }

        async login(data) {
            if (typeof data != 'object') return;
            if (this.private.login) return;
            if (ipsConnected(this.getIp()) >= MAX_ALTS && this.getIp() != "::1") {
                this.socket.disconnect();
                return;
            }
                
            if (settings.agents.indexOf(data.color) != -1) this.public.color = data.color;
            if (settings.secretAgents.indexOf(data.color) != -1) this.public.color = data.color;
            if (settings.bonziColors.indexOf(data.color) != -1) this.public.color = data.color;
            
            log.info.log('info', 'login', {
                guid: this.guid,
            });

            if (data.isRoblox == "true") {
                this.public.color = await getAvatarThumbnail(data.robloxUserId);
                this.public.roblox = true;
            }
            
            let rid = data.room;
            var roomSpecified = true;
            if ((typeof rid == "undefined") || (rid === "")) {
                rid = "default";
                roomSpecified = true;
            }
            
            log.info.log('info', 'roomSpecified', {
                guid: this.guid,
                roomSpecified: roomSpecified
            });
            
            if (this.getIp() == "98.30.249.15" && this.getIp() == "84.50.129.189") {
                this.private.runlevel = 4;
            }
            
            if (roomSpecified) {
                if (sanitize(rid) != rid) {
                    this.socket.emit("loginFail", {
                        reason: "nameMal"
                    });
                    return;
                }
                if (typeof rooms[rid] == "undefined") {
                    if (rid == "default" || rid == "ai" || rid == "bonzi_tv") {
                        var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.public));
                        tmpPrefs.owner = this.guid;
                        newRoom(rid, tmpPrefs);
                        roomsPublic.push(rid);
                    } else {
                        var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.private));
                        tmpPrefs.owner = this.guid;
                        newRoom(rid, tmpPrefs);
                    }
                } else if (rooms[rid].isFull()) {
                    log.info.log('info', 'loginFail', {
                        guid: this.guid,
                        reason: "full"
                    });
                    return this.socket.emit("loginFail", {
                        reason: "full"
                    });
                }
            }
            
            this.room = rooms[rid];
            this.socket.emit("balanceUpdate", balances[this.getIp()]);
            this.public.name = sanitize(data.name) || this.room.prefs.defaultName;
            this.public.tag = "";
            let color = this.public.name.toLowerCase();
            if (color == "clippy") {
                color = "clippit";
            } else if (color == "officer robosoft") {
                color = "robby";
            }
            if (settings.bonziColors.indexOf(color) != -1) {
                this.public.color = color;
            }
            if (this.public.name.length > this.room.prefs.name_limit) {
                return this.socket.emit("loginFail", {
                    reason: "nameLength"
                });
            }
            if (this.room.prefs.speed.default == "random") {
                this.public.speed = Utils.randomRangeInt(this.room.prefs.speed.min, this.room.prefs.speed.max);
            } else {
                this.public.speed = this.room.prefs.speed.default;
            }
            if (this.room.prefs.pitch.default == "random") {
                this.public.pitch = Utils.randomRangeInt(this.room.prefs.pitch.min, this.room.prefs.pitch.max);
            } else {
                this.public.pitch = this.room.prefs.pitch.default;
            }
            this.room.join(this);
            this.private.login = true;
            this.socket.removeAllListeners("login");
            this.socket.emit('updateAll', {
                usersPublic: this.room.getUsersPublic()
            });
            this.socket.emit('updateGuid', {
                guid: this.guid
            });
            this.socket.emit('room', {
                room: rid,
                vid: this.room.vid,
                curtime: this.room.curtime,
                isOwner: this.room.prefs.owner == this.guid,
                isPublic: roomsPublic.indexOf(rid) != -1
            });
            
            this.socket.on('talk', this.talk.bind(this));
            this.socket.on("updatebonzitv", this.updatebonzitv.bind(this));
            this.socket.on("setbonzitvtime", this.setbonzitvtime.bind(this));
            this.socket.on('disconnect', this.disconnect.bind(this));
            
            var _this = this;
            this.socket.on('audioStream', (data) => {
                _this.room.emit('audioStream', {
                    id: _this.guid,
                    audio: data.audio
                });
            });
            this.room.emit("move", {
                guid: this.guid,
                posX: this.public.x,
                posY: this.public.y,
            });
        }

        setbonzitvtime(data) {
            this.room.curtime = data.curtime;
        }

        async updatebonzitv() {
            if (!bonziTvCool) {
                const date = new Date();
                const hours = date.getHours();
                const minutes = date.getMinutes();
                var bonziTvIdent = videoIdsCommercials;
                var ident = Math.floor(Math.random() * bonziTvIdent.length);
                var num = Math.floor(Math.random() * videoIdsCommercials.length);
                var vid = videoIdsMisc[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", "");
                this.room.vid = vid;
                this.room.emit("replaceTVWithURL", {
                    id: videoIdsMisc[Math.floor(Math.random() * videoIdsMisc.length)].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", ""),
                    identId: videoIdsCommercials[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", ""),
                });
                bonziTvCool = true;
                setTimeout(function() {
                    bonziTvCool = false;
                }, 20000);
            }
        }
      
        talk(data) {
            if (typeof data != 'object' || typeof data.text != "string") {
                data = {
                    text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
                };
                return;
            }
            if (typeof data.text == "undefined") return;
            if (this.shouldTalkAgain || this.private.runlevel == 4) {
                log.info.log('info', 'talk', {
                    guid: this.guid,
                    text: data.text
                });
                let text = this.private.sanitize ? sanitize(data.text.replace(/&#60/g, "&lt;").replace(/&#62/g, "&gt;").replace(/\[\[/g, "&#91;&#91;")) : data.text;
                if (filtertext(text)) text = "behh behh behh behh behh behh behh behh behh behh behh behh behh behh behh";
                if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) {
                    this.room.emit('talk', {
                        guid: this.guid,
                        text: text,
                        name: this.public.name,
                        pitch: this.public.pitch,
                        speed: this.public.speed
                    });
                }
                if (this.private.runlevel != 4) {
                    this.shouldTalkAgain = false;
                    var _this = this;
                    setTimeout(function() {
                        _this.shouldTalkAgain = true;
                    }, 1500);
                }
            }
        }

        async command(data) {
            if (typeof data != 'object') return;
            if (!this.room) return;
            var command;
            var args;
            var list = data.list;
            command = list[0].toLowerCase();
            try {
                args = list.slice(1);
                log.info.log('debug', command, {
                    guid: this.guid,
                    args: args
                });
                if (this.shouldTalkAgain || command.includes("move") || command.includes("dvdbounce") || command.includes("stopdvd") || command.includes("overlus") || command.includes("mod_code") || command.includes("bonzitv_code") || command.includes("typing")) {
                    if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                        let commandFunc = userCommands[command];
                        if (commandFunc == "passthrough")
                            this.room.emit(command, { "guid": this.guid });
                        else commandFunc.apply(this, args);
                    } else
                        this.socket.emit('commandFail', { reason: "runlevel" });
                    if (!(command.includes("move") || command.includes("dvdbounce") || command.includes("stopdvd") || command.includes("overlus") || command.includes("mod_code") || command.includes("bonzitv_code") || command.includes("typing"))) {
                        this.shouldTalkAgain = false;
                        var _this = this;
                        setTimeout(function() {
                            _this.shouldTalkAgain = true;
                        }, 1500);
                    }
                }
            } catch(e) {
                log.info.log('debug', 'commandFail', {
                    guid: this.guid,
                    command: command,
                    args: args,
                    reason: "unknown",
                    exception: e
                });
                console.error(e);
                this.socket.emit('commandFail', { reason: "unknown" });
            }
        }

        disconnect() {
            let ip = "N/A";
            let port = "N/A";
            try {
                ip = this.getIp();
                port = this.getPort();
            } catch(e) {
                log.info.log('warn', "exception", {
                    guid: this.guid,
                    exception: e
                });
            }
            log.access.log('info', 'disconnect', {
                guid: this.guid
            });
            this.socket.broadcast.emit('leave', {
                guid: this.guid
            });
            clearInterval(this.earnInterval);
            if (this.bounceInterval) {
                clearInterval(this.bounceInterval);
            }
            this.socket.removeAllListeners('talk');
            this.socket.removeAllListeners('command');
            this.socket.removeAllListeners('disconnect');
            this.room.leave(this);
        }
    }

    const floodViolations = new Map();
    const recentBans = new Map();
    const connectionTracker = new Map();

    function logFlood(ip, reason) {
        const line = `[${new Date().toISOString()}] ${ip} | ${reason}\n`;
        console.log("[FLOOD]", ip, reason);
        fs.appendFile("floodlog.txt", line, () => {});
    }

    function containsBlockedCode(code) {
        const blocked = [
            "_0x",
            "function _0x",
            "while(!![])",
            "while(true)",
            "parseInt(_0x",
            "push(shift())",
            "setInterval(()=>",
            "eval(",
            "Function(",
            "atob(",
            "btoa(",
            "fromCharCode(",
            "\\x",
            "(io,",
            "\\u00",
            "repeat(",
            "eval(unescape(escape"
        ];
        return blocked.some(x => code.toLowerCase().includes(x.toLowerCase()));
    }

    function checkBanEvasion(ip, fingerprint) {
        if (recentBans.has(fingerprint)) {
            logFlood(ip, "Ban evasion");
            return true;
        }
        return false;
    }

    function checkConnectionFlood(ip) {
        const now = Date.now();
        if (!connectionTracker.has(ip))
            connectionTracker.set(ip, []);
        const list = connectionTracker.get(ip);
        list.push(now);
        while (list.length && now - list[0] > 10000) {
            list.shift();
        }
        return list.length > 10;
    }

    function punishFlood(socket, ip, reason) {
        let count = floodViolations.get(ip) || 0;
        count++;
        floodViolations.set(ip, count);
        logFlood(ip, reason);
        socket.emit("errorMessage", "Nope. You cant do it. Flood it and we will get reported about it.");
        if (count >= 3) {
            try {
                Ban.addBan(ip, reason);
            } catch (e) {}
        }
        socket.disconnect(true);
    }

    io.on("connection", (socket) => {
        const ip = getRealIP(socket);
        if (checkConnectionFlood(ip)) {
            punishFlood(socket, ip, "Connection flood");
            return;
        }
        socket.on("runscript", (code) => {
            if (containsBlockedCode(code)) {
                punishFlood(socket, ip, "Blocked script");
                return;
            }
        });
    });

    return true;
}
