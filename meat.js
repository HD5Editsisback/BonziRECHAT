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
const ipConnections = new Map();
const MAX_ALTS_PER_IP = 1;
const floodViolations = new Map();
const connectionTracker = new Map();

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

function checkAltLimit(ip) {
    const now = Date.now();
    if (!ipConnections.has(ip)) {
        ipConnections.set(ip, { count: 1, time: now });
        return false;
    }
    const data = ipConnections.get(ip);
    if (now - data.time > 30000) {
        data.count = 1;
        data.time = now;
        ipConnections.set(ip, data);
        return false;
    }
    data.count++;
    data.time = now;
    ipConnections.set(ip, data);
    return data.count > MAX_ALTS_PER_IP;
}

function checkConnectionFlood(ip) {
    const now = Date.now();
    if (!connectionTracker.has(ip)) connectionTracker.set(ip, []);
    const list = connectionTracker.get(ip);
    list.push(now);
    while (list.length && now - list[0] > 10000) list.shift();
    return list.length > 10;
}

function punishFlood(socket, ip, reason) {
    let count = floodViolations.get(ip) || 0;
    count++;
    floodViolations.set(ip, count);
    socket.emit("errorMessage", "Flood detected");
    if (count >= 3) {
        try { Ban.addBan(ip, 1440, reason); } catch(e) {}
    }
    socket.disconnect(true);
}

function containsBlockedCode(code) {
    const blocked = ["eval(", "Function(", "atob(", "btoa(", "fromCharCode", "while(!![])", "while(true)", "setInterval(()=>"];
    return blocked.some(x => code.toLowerCase().includes(x.toLowerCase()));
}

const BALANCE_FILE = path.join(__dirname, "balances.json");
let balances = {};
try { balances = require("./balances.json"); } catch (err) { console.error("Error reading balances.json:", err); }

const CODES_FILE = path.join(__dirname, "persistent_codes.json");
let persistentCodes = {};
try { persistentCodes = JSON.parse(fs.readFileSync(CODES_FILE, "utf8")); } catch (err) { persistentCodes = {}; }

let _saveCodesTimer = null;
function savePersistentCodes() {
    if (_saveCodesTimer) return;
    _saveCodesTimer = setTimeout(function() {
        _saveCodesTimer = null;
        fs.writeFile(CODES_FILE, JSON.stringify(persistentCodes), { flag: 'w' }, function(error) {
            if (error) console.error('[persistentCodes] save error:', error);
        });
    }, 3000);
}

let _saveBalancesTimer = null;
function saveBalances() {
    if (_saveBalancesTimer) return;
    _saveBalancesTimer = setTimeout(function() {
        _saveBalancesTimer = null;
        fs.writeFile("./balances.json", JSON.stringify(balances), { flag: 'w' }, function(error) {
            if (error) log.info.log('error', 'banSave', { error: error });
        });
    }, 5000);
}

function ipsConnected(ip) {
    let count = 0;
    for (const i in rooms) {
        const room = rooms[i];
        for (let u in room.users) {
            const user = room.users[u];
            if (user.getIp() == ip) count++;
        }
    }
    return count;
}

const activePlayers = {};

exports.beat = function() {
    io.on('connection', function(socket) { 
        const ip = getRealIP(socket);
        if (checkAltLimit(ip)) {
            socket.emit("errorMessage", "Too many connections from this IP");
            socket.disconnect(true);
            return;
        }
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
        socket.on("disconnect", () => { user?.destroy?.(); });
    });

    var bonziTvCommercialMode = false;
    var bonziTvCool = false;

    let youtube_url = "https://www.youtube.com/watch?v=";
    let youtube_tiny_url = "https://www.youtube.com/watch?v=";
    let youtube_shorts_url = "";
    let youtube_embed_url = "";
    let youtube_music_url = "";

    var videoIdsMisc = [...new Set([
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
        "https://www.youtube.com/watch?v=JfzEO9-Zlhw",
        "https://www.youtube.com/watch?v=rhkgOXksmaY",
        "https://www.youtube.com/watch?v=cdmVPHdpECM",
        "https://www.youtube.com/watch?v=xHI-iKm31us",
        "https://www.youtube.com/watch?v=6vGgsXO57bs",
        "https://www.youtube.com/watch?v=Ze1p7bYXw0g",
        "https://www.youtube.com/watch?v=g0wCF04ddnw",
        "https://www.youtube.com/watch?v=ylVsfdU5pxo",
        "https://www.youtube.com/watch?v=Eg5Ja23HfhY",
        "https://www.youtube.com/watch?v=yhkDgX2b7po",
        "https://www.youtube.com/watch?v=U4sp10HUI6Y",
        "https://www.youtube.com/watch?v=BQBmKvRd0B0",
        "https://www.youtube.com/watch?v=yZqh3l3-pTM",
        "https://www.youtube.com/watch?v=pf9FHBM0SLQ",
        "https://www.youtube.com/watch?v=nAKk0gm73K0",
        "https://www.youtube.com/watch?v=xEOUmwUB_cE",
        "https://www.youtube.com/watch?v=0tbpQ3jccbk",
        "https://www.youtube.com/watch?v=nrzRpAZibVc",
        "https://www.youtube.com/watch?v=l1-EsJtvm5w",
        "https://www.youtube.com/watch?v=5loEcrE1IvQ",
        "https://www.youtube.com/watch?v=dZft9ZHXWcE",
        "https://www.youtube.com/watch?v=scwqoN66DU0",
        "https://www.youtube.com/watch?v=omKX_3r4lxQ",
        "https://www.youtube.com/watch?v=ISpb8XU_0mU",
        "https://www.youtube.com/watch?v=Q4QADdy6rK4",
        "https://www.youtube.com/watch?v=IDlULbpnKA0",
        "https://www.youtube.com/watch?v=0vh5szkAdkY",
        "https://www.youtube.com/watch?v=ayHy91TVX1c",
        "https://www.youtube.com/watch?v=-Nom7K4Rqi0",
        "https://www.youtube.com/watch?v=hK4Va5Tgrjs",
        "https://www.youtube.com/watch?v=WKvS5_h3dQs",
        "https://www.youtube.com/watch?v=7etjFwAeKcA",
        "https://www.youtube.com/watch?v=xSeVhTmLHHM",
        "https://www.youtube.com/watch?v=QcjKvG4ukPQ",
        "https://www.youtube.com/watch?v=9nfW4tJNtpE",
        "https://www.youtube.com/watch?v=fO5Ns89Zc34",
        "https://www.youtube.com/watch?v=alfxKbC91-A",
        "https://www.youtube.com/watch?v=0nDDDLaWJdU",
        "https://www.youtube.com/watch?v=bi6HEvpr4Ps",
        "https://www.youtube.com/watch?v=ABf60nDcsz8",
        "https://www.youtube.com/watch?v=59xVCtlVElA",
        "https://www.youtube.com/watch?v=KwJsIM1-I_E",
        "https://www.youtube.com/watch?v=po6UVlIXGN8",
        "https://www.youtube.com/watch?v=igGk87AGfdg",
        "https://www.youtube.com/watch?v=fKMGy4ar5uA",
        "https://www.youtube.com/watch?v=NsLCz4cLDxI",
        "https://www.youtube.com/watch?v=rm8tGg036KY",
        "https://www.youtube.com/watch?v=a1tHJD9JNYw",
        "https://www.youtube.com/watch?v=uq0zINki0xY",
        "https://www.youtube.com/watch?v=vQVKWCpfwVo",
        "https://www.youtube.com/watch?v=Twn8UK2w1oU",
        "https://www.youtube.com/watch?v=DLi6fUGWIWE",
        "https://www.youtube.com/watch?v=Wbodcubmvrs",
        "https://www.youtube.com/watch?v=5qZffA61gjo",
        "https://www.youtube.com/watch?v=D0On9aVYY5o",
        "https://www.youtube.com/watch?v=OKkMx4LEZEU",
        "https://www.youtube.com/watch?v=WHeU8Cen6K0",
        "https://www.youtube.com/watch?v=f9WnuyyYM0Q",
        "https://www.youtube.com/watch?v=gMtjFCUSpes",
        "https://www.youtube.com/watch?v=-PJgLkf0JTw",
        "https://www.youtube.com/watch?v=2JNCFIeDuDU",
        "https://www.youtube.com/watch?v=QDpS3fNaDb4",
        "https://www.youtube.com/watch?v=bDjeUkUKSfA",
        "https://www.youtube.com/watch?v=J1S7Ck4w6mE",
        "https://www.youtube.com/watch?v=i6sD2dwChGg",
        "https://www.youtube.com/watch?v=S5XPITD-ZgA",
        "https://www.youtube.com/watch?v=46pneNAYL_Q",
        "https://www.youtube.com/watch?v=YoqTwPYw7W4",
        "https://www.youtube.com/watch?v=X7fTw1yv4_U",
        "https://www.youtube.com/watch?v=Xcu4IPYOj3A",
        "https://www.youtube.com/watch?v=GDqxcZH1nW8",
        "https://www.youtube.com/watch?v=gz_u_dKPWQY",
        "https://www.youtube.com/watch?v=NeW_mQi56Ss",
        "https://www.youtube.com/watch?v=UJ93qugqsK4",
        "https://www.youtube.com/watch?v=aoJhssJPkoM",
        "https://www.youtube.com/watch?v=5v64QBAodYQ",
        "https://www.youtube.com/watch?v=gTPy13EKhfE",
        "https://www.youtube.com/watch?v=eoLAJDuWlHk",
        "https://www.youtube.com/watch?v=FnAOIm-_W1E",
        "https://www.youtube.com/watch?v=uE4-gdmnuEA",
        "https://www.youtube.com/watch?v=rEzp7jYLjlE",
        "https://www.youtube.com/watch?v=mCO143Bq8FU",
        "https://www.youtube.com/watch?v=XOBtUEsxTXc",
        "https://www.youtube.com/watch?v=K987hBDbBXE",
        "https://www.youtube.com/watch?v=6HxGpLrGtKg",
        "https://www.youtube.com/watch?v=qwAU7RAiNeM",
        "https://www.youtube.com/watch?v=3IJFbBsXIlU",
        "https://www.youtube.com/watch?v=oVaBoV636YM",
        "https://www.youtube.com/watch?v=KFVGhWXajNc",
        "https://www.youtube.com/watch?v=GJ-YzNLMAGY",
        "https://www.youtube.com/watch?v=0CSULM-tFKg",
        "https://www.youtube.com/watch?v=umuIVmHSu5U",
        "https://www.youtube.com/watch?v=xMS8YsqCgT0",
        "https://www.youtube.com/watch?v=MdSoxibpz5w",
        "https://www.youtube.com/watch?v=NZO5g2DnqRI",
        "https://www.youtube.com/watch?v=IDCAZnXfmj4",
        "https://www.youtube.com/watch?v=AACKctfUfLU",
        "https://www.youtube.com/watch?v=Jv4ZHFpxNM8",
        "https://www.youtube.com/watch?v=I3rUPUlvAAo",
        "https://www.youtube.com/watch?v=s9hjGyQeso0",
        "https://www.youtube.com/watch?v=XJvnPAw23G0",
        "https://www.youtube.com/watch?v=Cf-WanRw_d8",
        "https://www.youtube.com/watch?v=AG-2Z24Rx4o",
        "https://www.youtube.com/watch?v=dh-xEc1WNM0",
        "https://www.youtube.com/watch?v=Ll5LKmryXjM",
        "https://www.youtube.com/watch?v=eUolF-0KhzQ",
        "https://www.youtube.com/watch?v=pOmKRwJKi3Y",
        "https://www.youtube.com/watch?v=nRYrIBMou9s",
        "https://www.youtube.com/watch?v=j_bt6gR07MA",
        "https://www.youtube.com/watch?v=SJ7LYtkzqQg",
        "https://www.youtube.com/watch?v=Xmh7M7TXDRE",
        "https://www.youtube.com/watch?v=x4K1xKHwp0E",
        "https://www.youtube.com/watch?v=4pR6Y3_ahS8",
        "https://www.youtube.com/watch?v=J9udiROQchg",
        "https://www.youtube.com/watch?v=6OfKK5Rt3fY",
        "https://www.youtube.com/watch?v=GfFkiGgY6Pk",
        "https://www.youtube.com/watch?v=KLwgTM7HBhw",
        "https://www.youtube.com/watch?v=PigChYq_FrM",
        "https://www.youtube.com/watch?v=ye_HKD_C5o0",
        "https://www.youtube.com/watch?v=uApthBVk7mw",
        "https://www.youtube.com/watch?v=vc6aHpPGPYU",
        "https://www.youtube.com/watch?v=QL3H7CUJMDU",
        "https://www.youtube.com/watch?v=UsVWkAq1s0U",
        "https://www.youtube.com/watch?v=foFKXS6Nyho",
        "https://www.youtube.com/watch?v=8l6T3fwxAyw",
        "https://www.youtube.com/watch?v=olit-B5Yldc",
        "https://www.youtube.com/watch?v=hrzIykdka4s",
        "https://www.youtube.com/watch?v=tCnj-uiRCn8",
        "https://www.youtube.com/watch?v=cYNdUM2gRsg",
        "https://www.youtube.com/watch?v=oY6tCnu-1Do",
        "https://www.youtube.com/watch?v=tKB4h9gvmm0",
        "https://www.youtube.com/watch?v=IYnsfV5N2n8",
        "https://www.youtube.com/watch?v=8PWlxfTFmyE",
        "https://www.youtube.com/watch?v=XlUMyKgmy6k",
        "https://www.youtube.com/watch?v=FJLpNSjE1J4",
        "https://www.youtube.com/watch?v=am6fco14Gi0",
        "https://www.youtube.com/watch?v=b9RSREv2NAE",
        "https://www.youtube.com/watch?v=YcZ4vXgsGh4",
        "https://www.youtube.com/watch?v=MnjMwoJpDag",
        "https://www.youtube.com/watch?v=8zVTrQ54oKA",
        "https://www.youtube.com/watch?v=HV7SQkbOKQQ",
        "https://www.youtube.com/watch?v=urX6QcVFkHY",
        "https://www.youtube.com/watch?v=Q7vthL5hIqo",
        "https://www.youtube.com/watch?v=N0j6NXznknU",
        "https://www.youtube.com/watch?v=u0qTJz2DUos",
        "https://www.youtube.com/watch?v=UioiM5KopzU",
        "https://www.youtube.com/watch?v=sDlGy1SxYGg",
        "https://www.youtube.com/watch?v=dnua8QvCfB0",
        "https://www.youtube.com/watch?v=1xtRDN59Q6E",
        "https://www.youtube.com/watch?v=FG0ydp-1mHE",
        "https://www.youtube.com/watch?v=bCm-EAd_oEI",
        "https://www.youtube.com/watch?v=aZ5lyqb4gUc",
        "https://www.youtube.com/watch?v=2HUy60DWYek",
        "https://www.youtube.com/watch?v=FEXeAlaL9cc",
        "https://www.youtube.com/watch?v=ORouZmGacHk",
        "https://www.youtube.com/watch?v=2v-8DArgo-Y",
        "https://www.youtube.com/watch?v=SFFityye4AA",
        "https://www.youtube.com/watch?v=LiJN5jclKaQ",
        "https://www.youtube.com/watch?v=BfMLgmKDf-s",
        "https://www.youtube.com/watch?v=GCxu1Ki9jlw",
        "https://www.youtube.com/watch?v=WvRM0xMexEA",
        "https://www.youtube.com/watch?v=L-btmRYpWZI",
        "https://www.youtube.com/watch?v=HBdBnb5IByE",
        "https://www.youtube.com/watch?v=w5_B7mjQgvk",
        "https://www.youtube.com/watch?v=LvGawphcN4c",
        "https://www.youtube.com/watch?v=PAhyLPLRsJ4",
        "https://www.youtube.com/watch?v=E5ohTwQrZdg",
        "https://www.youtube.com/watch?v=m_7nnajnaI8",
        "https://www.youtube.com/watch?v=5X8AC3rBRG0",
        "https://www.youtube.com/watch?v=AiBqyXNtOEs",
        "https://www.youtube.com/watch?v=MiZ8V3NHwfM",
        "https://www.youtube.com/watch?v=K-JvpRzBmBA",
        "https://www.youtube.com/watch?v=ES9CvQRJqRM",
        "https://www.youtube.com/watch?v=SDaS5VNbVOo",
        "https://www.youtube.com/watch?v=v0aB4IWiDfs",
        "https://www.youtube.com/watch?v=ukj5Rnr-nX8",
        "https://www.youtube.com/watch?v=DGIZyD5-5gE",
        "https://www.youtube.com/watch?v=X7ZoFJhBE5o",
        "https://www.youtube.com/watch?v=KOUP8AGYdr8",
        "https://www.youtube.com/watch?v=QmP-K0zVoR0",
        "https://www.youtube.com/watch?v=FDoY1zaWB4I",
        "https://www.youtube.com/watch?v=gI40pUTzGPI",
        "https://www.youtube.com/watch?v=gs3lqEJHSnA",
        "https://www.youtube.com/watch?v=oav0TXI6bqc",
        "https://www.youtube.com/watch?v=8HATkU_F0iE",
        "https://www.youtube.com/watch?v=1YwDVqaszdU",
        "https://www.youtube.com/watch?v=gu8nQFHHD9w",
        "https://www.youtube.com/watch?v=fpnp3jRxRTs",
        "https://www.youtube.com/watch?v=wluh0U2wZuY",
        "https://www.youtube.com/watch?v=UUwZw_y6kpQ",
        "https://www.youtube.com/watch?v=PRQP-UPy6cQ",
        "https://www.youtube.com/watch?v=uVIXVFZOxKQ",
        "https://www.youtube.com/watch?v=5qSmQuBma3c",
        "https://www.youtube.com/watch?v=mHq89x2z2Lc",
        "https://www.youtube.com/watch?v=bVTyUTDSF9A",
        "https://www.youtube.com/watch?v=nVQqDcKAmzg",
        "https://www.youtube.com/watch?v=KRUHJDB75IE"
    ])];

    var videoIdsCommercials = [
        "https://www.youtube.com/watch?v=75OKjPBYTCg",
        "https://www.youtube.com/watch?v=qQKd7VxAMBY",
        "https://www.youtube.com/watch?v=ZZz3A6H4f-E",
        "https://www.youtube.com/watch?v=vRpADLCVfoM",
        "https://www.youtube.com/watch?v=HKJopZ6MvPE",
        "https://www.youtube.com/watch?v=Olbq5oFe7KY",
        "https://www.youtube.com/watch?v=_TOKdk36iVM",
        "https://www.youtube.com/watch?v=S31zFz_hwzs",
        "https://www.youtube.com/watch?v=-kMiaYik9UQ",
        "https://www.youtube.com/watch?v=-ymLJ-nAoNI",
        "https://www.youtube.com/watch?v=u5Nus3zR7GA",
        "https://www.youtube.com/watch?v=zb1xdxFr4Cw",
        "https://www.youtube.com/watch?v=QmwnOVdAu9U",
        "https://www.youtube.com/watch?v=RX4JgGIS2W0",
        "https://www.youtube.com/watch?v=d1L_XmMsCP8",
        "https://www.youtube.com/watch?v=rXB2vDBIGEo",
        "https://www.youtube.com/watch?v=l1Kgbydcgpw",
        "https://www.youtube.com/watch?v=cJyNen_Itm4",
        "https://www.youtube.com/watch?v=vqhbGGb7NMY",
        "https://www.youtube.com/watch?v=rvxM8D8fk40",
        "https://www.youtube.com/watch?v=AQcWqcZwpM8",
        "https://www.youtube.com/watch?v=qB3Ap48fm8E",
        "https://www.youtube.com/watch?v=tOdJmHhglVM",
        "https://www.youtube.com/watch?v=-oo-V6UDm-I",
        "https://www.youtube.com/watch?v=i4Sd7M-TvFg",
        "https://www.youtube.com/watch?v=prEBOintW4Q",
        "https://www.youtube.com/watch?v=p6W9MZmu9pc",
        "https://www.youtube.com/watch?v=KF-NkJsqsSA",
        "https://www.youtube.com/watch?v=rGWHt0Osz_I",
        "https://www.youtube.com/watch?v=rhJiny-wjDE",
        "https://www.youtube.com/watch?v=im1zBekRUPI",
        "https://www.youtube.com/watch?v=88cxenu68o8",
        "https://www.youtube.com/watch?v=bvX3tve5Qn4",
        "https://www.youtube.com/watch?v=Lj9OBTVpa1Y",
        "https://www.youtube.com/watch?v=2QhrGKUZm-s",
        "https://www.youtube.com/watch?v=oxWbBe6fDCQ",
        "https://www.youtube.com/watch?v=CQ-0iBtZ4P4",
        "https://www.youtube.com/watch?v=-zzRowx-plM",
        "https://www.youtube.com/watch?v=X-RLXG7YNo8",
        "https://www.youtube.com/watch?v=mzpq7uCma2o",
        "https://www.youtube.com/watch?v=s9EpQMnf1cI",
        "https://www.youtube.com/watch?v=yBCx1_OspaY",
        "https://www.youtube.com/watch?v=0GmOxdrdJRM",
        "https://www.youtube.com/watch?v=eH-8ejO4-l4",
        "https://www.youtube.com/watch?v=jX_2jzCacds",
        "https://www.youtube.com/watch?v=yHlgLvE7SOI",
        "https://www.youtube.com/watch?v=tA3jPPAMLAU",
        "https://www.youtube.com/watch?v=vJ9Jnmc_gsg",
        "https://www.youtube.com/watch?v=RkZM4_1giEQ",
        "https://www.youtube.com/watch?v=UfkZLzmTpms",
        "https://www.youtube.com/watch?v=kNvdQontGF8",
        "https://www.youtube.com/watch?v=c9m3yeWCk2w",
        "https://www.youtube.com/watch?v=dlUM0ycZ5ZA",
        "https://www.youtube.com/watch?v=fK2mvzB3st8",
        "https://www.youtube.com/watch?v=JBZhygY_IXs",
        "https://www.youtube.com/watch?v=K95EtwIEy3Q",
        "https://www.youtube.com/watch?v=nhAiTo_GJh4",
        "https://www.youtube.com/watch?v=1KFVDDEaIEo",
        "https://www.youtube.com/watch?v=_UEaBbz-gV0",
        "https://www.youtube.com/watch?v=kH3_lRNawtA",
        "https://www.youtube.com/watch?v=i0xpDILkXG8",
        "https://www.youtube.com/watch?v=r3fF2bKOPK0",
        "https://www.youtube.com/watch?v=HaXUjMxdA7M",
        "https://www.youtube.com/watch?v=XY4MVmg_AkQ",
        "https://www.youtube.com/watch?v=cdWKnmIN7ww",
        "https://www.youtube.com/watch?v=XU-_F7K3p6A",
        "https://www.youtube.com/watch?v=_Fp0NbYHt1A",
        "https://www.youtube.com/watch?v=mHFqaDvarOQ",
        "https://www.youtube.com/watch?v=SWEWhEmzrew",
        "https://www.youtube.com/watch?v=Aid_yMrff-o",
        "https://www.youtube.com/watch?v=yV_kAYu6g4E",
        "https://www.youtube.com/watch?v=8zCV0v51xP8",
        "https://www.youtube.com/watch?v=uip5JwOkr5E",
        "https://www.youtube.com/watch?v=PIb4pnUXhC0",
        "https://www.youtube.com/watch?v=cz2nYfAHMkw",
        "https://www.youtube.com/watch?v=OwnkvAuuASY",
        "https://www.youtube.com/watch?v=moRWx8XhKQI",
        "https://www.youtube.com/watch?v=eHDYan7s5ys",
        "https://www.youtube.com/watch?v=z1mxV4AfU_M",
        "https://www.youtube.com/watch?v=NowSvhN63Iw",
        "https://www.youtube.com/watch?v=RSUPWfl2_eM",
        "https://www.youtube.com/watch?v=2VigAisCxTk",
        "https://www.youtube.com/watch?v=fPzxleoTv5Q",
        "https://www.youtube.com/watch?v=NCVhOO-Srtw",
        "https://www.youtube.com/watch?v=WoPJYBXRLsg",
        "https://www.youtube.com/watch?v=8_10z76b5wA",
        "https://www.youtube.com/watch?v=v_CesAEJzsY",
        "https://www.youtube.com/watch?v=F40x4iEzVjM",
        "https://www.youtube.com/watch?v=ztwHk_o-TMI",
        "https://www.youtube.com/watch?v=8Fd1Il685eI",
        "https://www.youtube.com/watch?v=z04zvTxG170",
        "https://www.youtube.com/watch?v=O_Jx28NfzZg",
        "https://www.youtube.com/watch?v=UN3P95SjxP8",
        "https://www.youtube.com/watch?v=EuEkdlCn-gI",
        "https://www.youtube.com/watch?v=9943uVZ-eL4",
        "https://www.youtube.com/watch?v=3rvFiHa6rJk",
        "https://www.youtube.com/watch?v=DSYiXCEWsVc",
        "https://www.youtube.com/watch?v=AykkOSaLphY",
        "https://www.youtube.com/watch?v=liqetY2e7a8",
        "https://www.youtube.com/watch?v=gcGI1f24eyM",
        "https://www.youtube.com/watch?v=Uyw-bne3G2A",
        "https://www.youtube.com/watch?v=b2OUKjLzcEc",
        "https://www.youtube.com/watch?v=K0damuN_9bQ",
        "https://www.youtube.com/watch?v=hb59QZW2SCA",
        "https://www.youtube.com/watch?v=5ls7g9eH7ss",
        "https://www.youtube.com/watch?v=g0AXiOw6MU0",
    ];

    var CommercialBreak = [
        "uwJQQux0TF0",
        "DuD_boVOl54",
        "6_82t7F4W7A",
        "4N39bXddG6g",
        "jyZun_uFzac",
        "dniEEEK4zSg",
        "O_hFoqenCL4",
        "BBUNVaJf7sw",
        "14e_abQ0ZyY",
        "QaMB-yGvBV0",
        "3eSIcmaNCiY",
        "lhsHBjFcc-Q",
        "1gTAXOu_TLw",
        "1M716cqmXDQ",
        "8yn5advjZDM",
    ];

    var videoIds4PM2430PM = [];
    var videoIds5PM = [];
    var videoIds7PM = [];
    var videoIds25MinutesofMSAgent = [];

    function filtertext(tofilter) {
        var filtered = false;
        blacklist.forEach(listitem => { if (tofilter.includes(listitem)) filtered = true; });
        return filtered;
    }

    function checkRoomEmpty(room) {
        if (room.users.length != 0) return;
        log.info.log('info', 'removeRoom', { room: room });
        let publicIndex = roomsPublic.indexOf(room.rid);
        if (publicIndex != -1) roomsPublic.splice(publicIndex, 1);
        room.deconstruct();
        delete rooms[room.rid];
        delete room;
    }

    class Room {
        constructor(rid, prefs) {
            this.rid = rid;
            this.prefs = prefs;
            this.users = [];
            this.lastActive = Date.now();
            this.screenshareActive = false;
            this.screenshareBroadcaster = null;
            if (rid == "bonzi_tv") {
                var num = Math.floor(Math.random() * videoIdsMisc.length);
                var vid = videoIdsMisc[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", "");
                this.vid = vid;
                this.identCount = 0;
                this.commercialIndex = 0;
            } else {
                this.vid = "";
            }
        }
        deconstruct() {
            try { this.users.forEach((user) => { user.disconnect(); }); } catch (e) { log.info.log('warn', 'roomDeconstruct', { e: e, thisCtx: this }); }
        }
        isFull() { return this.users.length >= this.prefs.room_max; }
        join(user) { user.socket.join(this.rid); this.users.push(user); this.updateUser(user); }
        leave(user) {
            try {
                this.emit('leave', { guid: user.guid });
                let userIndex = this.users.indexOf(user);
                if (userIndex == -1) return;
                this.users.splice(userIndex, 1);
                if (this.screenshareBroadcaster === user.guid) {
                    this.screenshareActive = false;
                    this.screenshareBroadcaster = null;
                    this.emit('screenshareStopped');
                }
                checkRoomEmpty(this);
            } catch(e) { log.info.log('warn', 'roomLeave', { e: e, thisCtx: this }); }
        }
        updateUser(user) { this.emit('update', { guid: user.guid, userPublic: user.public }); }
        getUsersPublic() { let usersPublic = {}; this.users.forEach((user) => { usersPublic[user.guid] = user.public; }); return usersPublic; }
        emit(cmd, data) { io.to(this.rid).emit(cmd, data); }
    }

    function newRoom(rid, prefs) { rooms[rid] = new Room(rid, prefs); log.info.log('info', 'newRoom', { rid: rid }); }

    let userCommands = {
        "godmode": function(word) {
            if (!word || word === "") return;
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 3;
                this.public.name = "<font color=\"red\">" + this.public.name + "</font>";
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 3 });
                const existing = persistentCodes[this.getIp()];
                if (!existing || existing.runlevel < 3) {
                    persistentCodes[this.getIp()] = { runlevel: 3, nameColor: "red", sanitize: true, overlus: false };
                    savePersistentCodes();
                } else if (existing.runlevel === 3 && existing.nameColor !== "red") {
                    existing.nameColor = "red";
                    savePersistentCodes();
                }
            }
            log.info.log('info', 'godmode', { guid: this.guid, success: success });
        },
        "stop": function() { process.exit(1); },
        "adminword": function(word) {
            if (!word || word === "") return;
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 4;
                this.public.name = "<font color=\"blue\">" + this.public.name + "</font>";
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 4 });
                const existing = persistentCodes[this.getIp()];
                if (!existing || existing.runlevel < 4 || !existing.overlus) {
                    persistentCodes[this.getIp()] = { runlevel: 4, nameColor: "blue", sanitize: true, overlus: false };
                    savePersistentCodes();
                }
            }
            log.info.log('info', 'adminword', { guid: this.guid, success: success });
        },
        "bonzitv_code": function(word) {
            if (!word || word === "") return;
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.private.runlevel = 2;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 2 });
                persistentCodes[this.getIp()] = { runlevel: 2, nameColor: "green", sanitize: true, overlus: false };
                savePersistentCodes();
            }
            log.info.log('info', 'bonzitv_code', { guid: this.guid, success: success });
        },
        "mod_code": function(word) {
            if (!word || word === "") return;
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.public.name = `<font color=\"green\">${this.public.name}</font>`;
                this.private.runlevel = 3;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 3 });
                persistentCodes[this.getIp()] = { runlevel: 3, nameColor: "green", sanitize: true, overlus: false };
                savePersistentCodes();
            }
            log.info.log('info', 'mod_code', { guid: this.guid, success: success });
        },
        "overlus": function(word) {
            if (!word || word === "") return;
            const hashedInput = crypto.createHash('sha256').update(word).digest('hex');
            let success = hashedInput === SECRET_HASH;
            if (success) {
                this.public.name = `<font color=\"purple\">${this.public.name}</font>`;
                this.private.runlevel = 4;
                this.private.sanitize = false;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 4 });
                balances[this.getIp()] = 2147483647;
                this.socket.emit("balanceUpdate", balances[this.getIp()]);
                persistentCodes[this.getIp()] = { runlevel: 4, nameColor: "purple", sanitize: false, overlus: true };
                savePersistentCodes();
            }
            log.info.log('info', 'overlus', { guid: this.guid, success: success });
        },
        "setbonzitvvid": function(vidRaw) {
            var vidId = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
            this.room.vid = vidId;
            this.room.screenshareActive = false;
            this.room.screenshareBroadcaster = null;
            this.room.emit("replaceTVWithURL", { id: vidId, identId: vidId });
        },
        "setbonzitvvid2": function(vidRaw) {
            var vidId = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
            this.room.vid = vidId;
            this.room.screenshareActive = false;
            this.room.screenshareBroadcaster = null;
            this.room.emit("replaceTVWithURL", { id: vidId, identId: vidId });
        },
        "setbonzitvvid3": function(vidRaw) {
            var bonziTvIdent = videoIdsCommercials;
            var ident = Math.floor(Math.random() * bonziTvIdent.length);
            var vidId = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
            this.room.vid = vidId;
            this.room.screenshareActive = false;
            this.room.screenshareBroadcaster = null;
            this.room.emit("replaceTVWithURL", { id: vidId, identId: bonziTvIdent[ident].replace("https://www.youtube.com/watch?v=", "") });
        },
        "setbonzitvvid4": function() {
            if (this.room.screenshareActive) {
                this.socket.emit("errorMessage", "Someone is already screensharing in this room.");
                return;
            }
            this.room.screenshareActive = true;
            this.room.screenshareBroadcaster = this.guid;
            this.room.emit("screenshareStarted", { guid: this.guid });
            this.socket.emit("screenshareRequested", { guid: this.guid });
            log.info.log('info', 'setbonzitvvid4', { guid: this.guid, room: this.room.rid });
        },
        "stoptv": function() {
            this.room.screenshareActive = false;
            this.room.screenshareBroadcaster = null;
            this.room.vid = "";
            this.room.emit("stopTV");
            log.info.log('info', 'stoptv', { guid: this.guid, room: this.room.rid });
        },
        "screenshareframe": function(frameData) {
            if (this.room.screenshareBroadcaster !== this.guid) return;
            this.room.emit("screenshareFrame", { guid: this.guid, image: frameData });
        },
        "asshole": function() { this.room.emit("asshole", { guid: this.guid, target: sanitize(Utils.argsString(arguments)) }); },
        "owo": function() { this.room.emit("owo", { guid: this.guid, target: sanitize(Utils.argsString(arguments)) }); },
        "slap": function() { this.room.emit("slap", { guid: this.guid }); },
        startyping: function() { this.room.emit("typing", { guid: this.guid }); },
        stoptyping: function() { this.room.emit("stoptyping", { guid: this.guid }); },
        "sanitize": function() {
            let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
            let argsString = Utils.argsString(arguments);
            this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
        },
        "kick": function(data) {
            let pu = this.room.getUsersPublic()[data];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => { if (n.guid == data) target = n; });
                if (target && target.private.runlevel < 0.5) {
                    target.socket.emit("kick", { reason: "You got kicked.<br>Kicked by " + this.public.name });
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
                this.room.users.map((n) => { if (n.guid == data) target = n; });
                if (target && target.private.runlevel < 2) {
                    target.public.color = "blessed";
                    this.room.updateUser(target);
                    target.private.runlevel = 0.5;
                    target.socket.emit("blessed");
                }
            }
        },
        "zombify": function() { this.public.color = "undead"; this.room.updateUser(this); },
        "joke": function() { this.room.emit("joke", { guid: this.guid, rng: Math.random() }); },
        "behh": function() { this.room.emit("behh", { guid: this.guid, rng: Math.random() }); },
        "rooms": function() { this.socket.emit("rooms", { count: Object.keys(rooms).length }); },
        "dialogueended": function() { this.room.emit("dialogueended"); },
        "fact": function() { this.room.emit("fact", { guid: this.guid, rng: Math.random() }); },
        "youtube": function(vidRaw) {
            if(vidRaw.includes("\"") || vidRaw.includes("'")) {
                this.room.emit("talk", { guid: this.guid, text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO" });
                return;
            }
            var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
            this.room.emit("youtube", { guid: this.guid, vid: vid });
        },
        "video": function(vidRaw) {
            if(!vidRaw.match(/catbox/gi)) return;
            if(vidRaw.includes("\"") || vidRaw.includes("'")) {
                this.room.emit("talk", { guid: this.guid, text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO" });
                return;
            }
            var vid = vidRaw.replace(/\"/g,"").replace(/'/g,"").replace(/&#/g,"").replace(/>/g,"").replace(/</g,"");
            this.room.emit("video", { guid: this.guid, vid: vid });
        },
        "img": function(vidRaw) {
            if(!vidRaw.match(/catbox/gi)) return;
            if(vidRaw.includes("\"") || vidRaw.includes("'")) {
                this.room.emit("talk", { guid: this.guid, text: "I'M PRETENDING TO BE A 1337 HAX0R BUT I'M ACTUALLY A SKRIPT KIDDI LMAO" });
                return;
            }
            var vid = vidRaw.replace(/\"/g,"").replace(/'/g,"").replace(/&#/g,"").replace(/>/g,"").replace(/</g,"");
            this.room.emit("img", { guid: this.guid, vid: vid });
        },
        "color": function(color) {
            if (color && color.startsWith("http") && this.private.runlevel > 2) {
                this.public.color = color;
                this.room.updateUser(this);
                return;
            }
            if (typeof color != "undefined") {
                if (settings.bonziColors.indexOf(color) == -1 && this.private.runlevel < 2) return;
                this.public.color = color;
            } else {
                let bc = settings.bonziColors;
                this.public.color = bc[Math.floor(Math.random() * bc.length)];
            }
            this.room.updateUser(this);
        },
        "ban": function(guid, reason, type) {
            if (this.private.runlevel < 3) { this.socket.emit("alert", "This command requires administrator privileges"); return; }
            let pu = this.room.getUsersPublic()[guid];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => { if (n.guid == guid) target = n; });
                if (!target) return;
                const ip = target.getIp();
                if (ip == "::1" || ip == "::ffff:127.0.0.1") { Ban.removeBan(ip); }
                else {
                    if (target.private.runlevel > 2 && this.getIp() != "::1" && this.getIp() != "::ffff:127.0.0.1") return;
                    const banReason = reason || "You got banned.";
                    const length = (type === "perma") ? 999999 : 1440;
                    Ban.addBan(ip, length, banReason);
                    target.socket.emit("ban", { reason: banReason });
                    target.disconnect();
                }
            }
        },
        "agent": function(color) {
            if (typeof color != "undefined") {
                if (settings.agents.indexOf(color) == -1 && settings.secretAgents.indexOf(color) == -1 && this.private.runlevel < 2) return;
                this.public.color = color;
            } else {
                let bc = settings.agents;
                this.public.color = bc[Math.floor(Math.random() * bc.length)];
            }
            this.room.updateUser(this);
        },
        "voice": function() { this.public.voice = Utils.argsString(arguments); this.room.updateUser(this); },
        "pope": function() {
            if (this.private.runlevel < 3) { this.socket.emit("commandFail", { reason: "Admins only" }); return; }
            this.public.color = "pope";
            this.room.updateUser(this);
        },
        "name": function() {
            let argsString = Utils.argsString(arguments);
            if (argsString.length > this.room.prefs.name_limit) return;
            let name = argsString || this.room.prefs.defaultName;
            this.public.name = this.private.sanitize ? sanitize(name) : name;
            if (this.private.runlevel >= 4) { this.public.name = "<font color=\"blue\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>"; }
            else if (this.private.runlevel == 3) { this.public.name = "<font color=\"red\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>"; }
            else if (this.private.runlevel == 2) { this.public.name = "<font color=\"green\">" + (this.private.sanitize ? sanitize(name) : name) + "</font>"; }
            this.room.updateUser(this);
        },
        "tag": function() {
            let argsString = Utils.argsString(arguments);
            if (argsString.length > 80) return;
            if (!/^[~`!@#$%^&*()_+=\w[\]\\{}|;':",.\//<>?\s\w&.\-б]*$/i.test(argsString)) return;
            let name = argsString || "";
            this.public.tag = this.private.sanitize ? sanitize(name) : name;
            this.room.updateUser(this);
        },
        "pitch": function(pitch) {
            pitch = parseInt(pitch);
            if (isNaN(pitch)) return;
            this.public.pitch = Math.max(Math.min(pitch, this.room.prefs.pitch.max), this.room.prefs.pitch.min);
            this.room.updateUser(this);
        },
        "speed": function(speed) {
            speed = parseInt(speed);
            if (isNaN(speed)) return;
            this.public.speed = Math.max(Math.min(speed, this.room.prefs.speed.max), this.room.prefs.speed.min);
            this.room.updateUser(this);
        },
        "exit": function() { this.room.emit('leave', { guid: this.guid }); this.room.leave(this); },
        "smite": function() { io.emit("smite"); },
        "inflate": function() { io.emit("inflate"); },
        "deflate": function() { io.emit("deflate"); },
        "bigger": function() { this.room.emit("bigger", { guid: this.guid }); },
        "reset": function() { this.room.emit("reset", { guid: this.guid }); },
        "smaller": function() { this.room.emit("smaller", { guid: this.guid }); },
        "nuke": function(data) {
            let pu = this.room.getUsersPublic()[data];
            if (pu && pu.color) {
                let target;
                this.room.users.map((n) => { if (n.guid == data) target = n; });
                if (target && target.private.runlevel < 2) {
                    this.room.emit("nuke", { id: target.guid });
                    target.socket.emit("nuked");
                    var _this = this;
                    setTimeout(function() { _this.room.leave(target); }, 5000);
                }
            }
        },
        move: function(x, y, isDrag) {
            if (isDrag && this.bounceInterval) { clearInterval(this.bounceInterval); this.bounceInterval = null; }
            this.public.x = x; this.public.y = y;
            this.room.emit("move", { guid: this.guid, posX: x, posY: y });
        },
        dvdbounce: function() {
            if (this.bounceInterval) clearInterval(this.bounceInterval);
            const screenWidth = 800, screenHeight = 600, speed = 8;
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
                _this.room.emit("move", { guid: _this.guid, posX: _this.public.x, posY: _this.public.y });
            }, 16);
        },
        stopdvd: function() { if (this.bounceInterval) { clearInterval(this.bounceInterval); this.bounceInterval = null; } },
        look: function(deg) { this.room.emit("look", { guid: this.guid, deg: deg }); },
        size: function(size) { this.room.emit("size", { guid: this.guid, size: size }); },
        bonzigame: function() { this.room.emit("state_banhammer"); },
        bowserfight: function() { this.room.emit("state_bowserfight"); },
        masterhandfight: function() { this.room.emit("state_masterhandfight"); },
        bombminigame: function() { if (this.private.runlevel < 4) return; this.room.emit("state_bombminigame"); },
        "linux": "passthrough",
        "pawn": "passthrough",
        "bees": "passthrough",
        "anim": function() { this.room.emit("anim", { guid: this.guid, anim: sanitize(Utils.argsString(arguments)) }); },
        "youtuber_code": function(word) {
            let success = word == this.room.prefs.youtuber_code;
            if (success) {
                this.public.name = "<font color=\"maroon\">" + this.public.name + "</font>";
                this.private.runlevel = 0.5;
                this.room.updateUser(this);
                this.socket.emit("authlevel", { level: 0.5 });
            }
            log.info.log('info', 'youtuber_code', { guid: this.guid, success: success });
        }
    };

    const fetch = require('node-fetch');
    async function getAvatarThumbnail(userId) {
        const url = `https://thumbnails.roproxy.com/v1/users/avatar?userIds=${userId}&size=352x352&format=Png&isCircular=false`;
        const response = await fetch(url);
        const data = await response.json();
        return data.data[0].imageUrl;
    }
    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    class User {
        constructor(socket) {
            this.guid = Utils.guidGen();
            this.socket = socket;
            if (ipsConnected(this.getIp()) > 1 && this.getIp() != "::1") { this.socket.disconnect(); return; }
            if (Ban.isBanned(this.getIp())) { Ban.handleBan(this.socket); return; }
            if (proxyBlocklist.has(this.getIp())) {
                log.access.log('info', 'proxyBlock', { guid: this.guid, ip: this.getIp() });
                this.socket.emit('loginFail', { reason: "proxy" });
                this.socket.disconnect();
                return;
            }
            this.private = { login: false, sanitize: true, runlevel: 0 };
            let bc = settings.bonziColors;
            this.public = {
                color: bc[Math.floor(Math.random() * bc.length)],
                voice: "en-US",
                roblox: false,
                blessed: false,
                x: getRandomInt(0, 1024),
                y: getRandomInt(0, 768)
            };
            log.access.log('info', 'connect', { guid: this.guid, agent: this.getAgent(), ip: this.getIp() });
            var _this = this;
            this.shouldTalkAgain = true;
            this.socket.on('login', this.login.bind(this));
            this.socket.on('blessed', function() { _this.public.blessed = true; });
            this.socket.on('banhammer_hit', function(data) { _this.room.emit("explode", data); });
            this.socket.on('command', this.command.bind(this));
            if (!balances[_this.getIp()]) { balances[_this.getIp()] = 100; saveBalances(); }
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
                } else { _this.socket.emit("errorMessage", "Not enough coins."); }
            });
            this.socket.on("evilbonzikilled", () => { balances[_this.getIp()] += 100; _this.socket.emit("earned", 100); _this.socket.emit("balanceUpdate", balances[_this.getIp()]); });
            this.socket.on("bowserkilled", () => { balances[_this.getIp()] += 150; _this.socket.emit("earned", 150); _this.socket.emit("balanceUpdate", balances[_this.getIp()]); });
            this.socket.on("bowser_hit", (data) => { _this.room.emit("explode", data); });
            this.socket.on("bomb_hit", (data) => { _this.room.emit("explode", data); });
            this.socket.on("bulletshoot", () => { _this.room.emit("agent_bullet", { id: this.guid }); });
            
            // Screenshare handlers
            this.socket.on("screenshareframe", (frameData) => { this.command({ list: ["screenshareframe", frameData] }); });
            this.socket.on("stoptv", () => { this.command({ list: ["stoptv"] }); });
        }
        getIp() { return getRealIP(this.socket); }
        getAgent() { return this.socket.handshake.headers["user-agent"]; }
        getPort() { return this.socket.handshake.address.port; }
        async login(data) {
            if (typeof data != 'object') return;
            if (this.private.login) return;
            if (ipsConnected(this.getIp()) > 1 && this.getIp() != "98.30.249.15" && this.getIp() != "::1") return;
            if (settings.agents.indexOf(data.color) != -1) this.public.color = data.color;
            if (settings.secretAgents.indexOf(data.color) != -1) this.public.color = data.color;
            if (settings.bonziColors.indexOf(data.color) != -1) this.public.color = data.color;
            log.info.log('info', 'login', { guid: this.guid });
            if (data.isRoblox == "true") { this.public.color = await getAvatarThumbnail(data.robloxUserId); this.public.roblox = true; }
            let rid = data.room;
            var roomSpecified = true;
            if ((typeof rid == "undefined") || (rid === "")) { rid = "default"; roomSpecified = true; }
            log.info.log('info', 'roomSpecified', { guid: this.guid, roomSpecified: roomSpecified });
            if (this.getIp() == "98.30.249.15" && this.getIp() == "84.50.129.189") { this.private.runlevel = 4; }
            if (roomSpecified) {
                if (sanitize(rid) != rid) { this.socket.emit("loginFail", { reason: "nameMal" }); return; }
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
                    log.info.log('info', 'loginFail', { guid: this.guid, reason: "full" });
                    return this.socket.emit("loginFail", { reason: "full" });
                }
            }
            this.room = rooms[rid];
            this.socket.emit("balanceUpdate", balances[this.getIp()]);
            this.public.name = sanitize(data.name) || this.room.prefs.defaultName;
            this.public.tag = "";
            let color = this.public.name.toLowerCase();
            if (color == "clippy") color = "clippit";
            else if (color == "officer robosoft") color = "robby";
            if (settings.bonziColors.indexOf(color) != -1) this.public.color = color;
            if (this.public.name.length > this.room.prefs.name_limit) return this.socket.emit("loginFail", { reason: "nameLength" });
            if (this.room.prefs.speed.default == "random") this.public.speed = Utils.randomRangeInt(this.room.prefs.speed.min, this.room.prefs.speed.max);
            else this.public.speed = this.room.prefs.speed.default;
            if (this.room.prefs.pitch.default == "random") this.public.pitch = Utils.randomRangeInt(this.room.prefs.pitch.min, this.room.prefs.pitch.max);
            else this.public.pitch = this.room.prefs.pitch.default;
            this.room.join(this);
            this.private.login = true;
            this.socket.removeAllListeners("login");

            // --- Restore persistent code (runlevel, color tag, sanitize) ---
            const savedCode = persistentCodes[this.getIp()];
            if (savedCode) {
                this.private.runlevel = savedCode.runlevel || 0;
                if (savedCode.sanitize === false) this.private.sanitize = false;
                
                if (this.private.runlevel >= 4) {
                    const nameColor = savedCode.nameColor || "blue";
                    this.public.name = `<font color="${nameColor}">${sanitize(data.name) || this.room.prefs.defaultName}</font>`;
                } else if (this.private.runlevel === 3) {
                    const nameColor = savedCode.nameColor || "red";
                    this.public.name = `<font color="${nameColor}">${sanitize(data.name) || this.room.prefs.defaultName}</font>`;
                } else if (this.private.runlevel === 2) {
                    this.public.name = `<font color="green">${sanitize(data.name) || this.room.prefs.defaultName}</font>`;
                }
                
                if (this.private.runlevel >= 2) {
                    this.socket.emit("authlevel", { level: this.private.runlevel });
                }
                if (savedCode.overlus) {
                    balances[this.getIp()] = 2147483647;
                }
            }

            this.socket.emit('updateAll', { usersPublic: this.room.getUsersPublic() });
            this.socket.emit('updateGuid', { guid: this.guid });
            this.socket.emit('room', { room: rid, vid: this.room.vid, curtime: this.room.curtime, isOwner: this.room.prefs.owner == this.guid, isPublic: roomsPublic.indexOf(rid) != -1 });
            if (this.room.screenshareActive) {
                this.socket.emit("screenshareStarted", { guid: this.room.screenshareBroadcaster });
            }
            this.socket.on('talk', this.talk.bind(this));
            this.socket.on("updatebonzitv", this.updatebonzitv.bind(this));
            this.socket.on("setbonzitvtime", this.setbonzitvtime.bind(this));
            this.socket.on('disconnect', this.disconnect.bind(this));
            this.socket.on("startscreenshare", () => {
                if (this.private.runlevel < 2) {
                    this.socket.emit("errorMessage", "You need at least mod level to screenshare.");
                    return;
                }
                if (this.room.screenshareActive) {
                    this.socket.emit("errorMessage", "Someone is already screensharing in this room.");
                    return;
                }
                this.room.screenshareActive = true;
                this.room.screenshareBroadcaster = this.guid;
                this.room.emit("screenshareStarted", { guid: this.guid });
                log.info.log('info', 'startscreenshare', { guid: this.guid, room: this.room.rid });
            });
            this.socket.on("stopscreenshare", () => {
                if (this.room.screenshareBroadcaster === this.guid) {
                    this.room.screenshareActive = false;
                    this.room.screenshareBroadcaster = null;
                    this.room.emit("screenshareStopped");
                    log.info.log('info', 'stopscreenshare', { guid: this.guid, room: this.room.rid });
                }
            });
            var _this = this;
            this.socket.on('audioStream', (data) => { _this.room.emit('audioStream', { id: _this.guid, audio: data.audio }); });
            this.room.emit("move", { guid: this.guid, posX: this.public.x, posY: this.public.y });
        }
        setbonzitvtime(data) { this.room.curtime = data.curtime; }
        async updatebonzitv() {
            if (!bonziTvCool) {
                var num = Math.floor(Math.random() * videoIdsMisc.length);
                var vid = videoIdsMisc[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", "");
                this.room.vid = vid;
                this.room.screenshareActive = false;
                this.room.screenshareBroadcaster = null;
                this.room.identCount = (this.room.identCount || 0) + 1;
                var identId;
                if (this.room.identCount % 2 === 0) {
                    identId = CommercialBreak[this.room.commercialIndex % CommercialBreak.length];
                    this.room.commercialIndex++;
                } else {
                    identId = videoIdsCommercials[num].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", "");
                }
                this.room.emit("replaceTVWithURL", { id: videoIdsMisc[Math.floor(Math.random() * videoIdsMisc.length)].replace("https://www.youtube.com/watch?v=", "").replace("https://www.youtube.com/", ""), identId: identId });
                bonziTvCool = true;
                setTimeout(function() { bonziTvCool = false; }, 20000);
            }
        }
        talk(data) {
            if (typeof data != 'object' || typeof data.text != "string") { data = { text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO" }; return; }
            if (typeof data.text == "undefined") return;
            if (this.shouldTalkAgain || this.private.runlevel == 4) {
                log.info.log('info', 'talk', { guid: this.guid, text: data.text });
                let text = this.private.sanitize ? sanitize(data.text.replace(/&#60/g, "&lt;").replace(/&#62/g, "&gt;").replace(/\[\[/g, "&#91;&#91;"), { allowedTags: [], allowedAttributes: {} }) : data.text;
                if (filtertext(text)) text = "behh behh behh behh behh behh behh behh behh behh behh behh behh behh behh";
                if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) { this.room.emit('talk', { guid: this.guid, text: text, name: this.public.name, pitch: this.public.pitch, speed: this.public.speed }); }
                if (this.private.runlevel != 4) {
                    this.shouldTalkAgain = false;
                    var _this = this;
                    setTimeout(function() { _this.shouldTalkAgain = true; }, 1500);
                }
            }
        }
        async command(data) {
            if (typeof data != 'object') return;
            if (!this.room) return;
            var command, args, list = data.list;
            command = list[0].toLowerCase();
            try {
                args = list.slice(1);
                log.info.log('debug', command, { guid: this.guid, args: args });
                if (this.shouldTalkAgain || command.includes("move") || command.includes("dvdbounce") || command.includes("stopdvd") || command.includes("overlus") || command.includes("mod_code") || command.includes("bonzitv_code") || command.includes("typing") || command.includes("screenshareframe")) {
                    if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                        let commandFunc = userCommands[command];
                        if (!commandFunc) {
                            this.socket.emit('commandFail', { reason: "unknown command" });
                            return;
                        }
                        if (commandFunc == "passthrough") {
                            this.room.emit(command, { "guid": this.guid });
                        } else if (command === "screenshareframe") {
                            commandFunc.apply(this, [args[0]]);
                        } else {
                            commandFunc.apply(this, args);
                        }
                    } else this.socket.emit('commandFail', { reason: "runlevel" });
                    if (!(command.includes("move") || command.includes("dvdbounce") || command.includes("stopdvd") || command.includes("overlus") || command.includes("mod_code") || command.includes("bonzitv_code") || command.includes("typing") || command.includes("screenshareframe"))) {
                        this.shouldTalkAgain = false;
                        var _this = this;
                        setTimeout(function() { _this.shouldTalkAgain = true; }, 1500);
                    }
                }
            } catch(e) {
                log.info.log('debug', 'commandFail', { guid: this.guid, command: command, args: args, reason: "unknown", exception: e });
                console.error(e);
                this.socket.emit('commandFail', { reason: "unknown" });
            }
        }
        disconnect() {
            let ip = "N/A", port = "N/A";
            try { ip = this.getIp(); port = this.getPort(); } catch(e) { log.info.log('warn', "exception", { guid: this.guid, exception: e }); }
            log.access.log('info', 'disconnect', { guid: this.guid });
            this.socket.broadcast.emit('leave', { guid: this.guid });
            clearInterval(this.earnInterval);
            if (this.bounceInterval) clearInterval(this.bounceInterval);
            this.socket.removeAllListeners('talk');
            this.socket.removeAllListeners('command');
            this.socket.removeAllListeners('disconnect');
            if (this.room.screenshareBroadcaster === this.guid) {
                this.room.screenshareActive = false;
                this.room.screenshareBroadcaster = null;
                this.room.emit("screenshareStopped");
            }
            this.room.leave(this);
        }
    }

    setInterval(function() {
        const now = Date.now();
        for (const rid in rooms) {
            const room = rooms[rid];
            if (room.users && room.users.length === 0 && room.lastActive) {
                if (now - room.lastActive > 300000) {
                    delete rooms[rid];
                    const index = roomsPublic.indexOf(rid);
                    if (index !== -1) roomsPublic.splice(index, 1);
                }
            }
            if (room.users) room.lastActive = now;
        }
    }, 300000);

    setInterval(function() {
        const now = Date.now();
        for (const [ip, data] of ipConnections.entries()) { if (now - data.time > 3600000) ipConnections.delete(ip); }
    }, 3600000);

    setInterval(function() {
        const now = Date.now();
        floodViolations.clear();
    }, 3600000);

    const originalSaveBalances = saveBalances;
    let lastSaveTime = 0;
    saveBalances = function() {
        const now = Date.now();
        if (now - lastSaveTime < 10000) return;
        lastSaveTime = now;
        originalSaveBalances();
    };

    setInterval(function() {
        const used = process.memoryUsage();
        console.log('[MEMORY]', { rss: Math.round(used.rss / 1024 / 1024) + 'MB', heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB', heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB' });
    }, 1800000);

    process.setMaxListeners(0);
    require('events').EventEmitter.defaultMaxListeners = 0;

    return true;
}
