"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
/**
 * @typedef {'status' | 'wserror' | 'wsmessage' | 'connect' | 'disconnect' | 'participant update' | 'participant added' | 'participant removed' | 'count' | 'a' | 'b' | 'bye' | 'c' | 'ch' | 'hi' | 'ls' | 'm' | 'n' | 'notification' | 'nq' | 'p' | 't'} EventNames
 */
var MyEventEmitter = /** @class */ (function () {
    function MyEventEmitter() {
        this.listeners = new Map();
        this.listeners = new Map();
    }
    /**
     * @param {EventNames} event
     * @param {Function} listener
     */
    MyEventEmitter.prototype.on = function (event, listener) {
        var _a;
        if (!this.listeners.has(event))
            this.listeners.set(event, []);
        (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.push(listener);
        return;
    };
    /**
     * @param {EventNames} event
     * @param {Function} listener
     */
    MyEventEmitter.prototype.off = function (event, listener) {
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            var index = eventListeners.indexOf(listener);
            if (index !== -1) {
                eventListeners.splice(index, 1);
            }
        }
        return;
    };
    /**
     * @param {EventNames} event
     * @param {Function} listener
     */
    MyEventEmitter.prototype.once = function (event, listener) {
        var _this = this;
        var wrapper = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            _this.off(event, wrapper);
            listener.apply(null, args);
        };
        return this.on(event, wrapper);
    };
    /**
     * @param {EventNames} event
     * @param {Function} listener
     */
    MyEventEmitter.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            for (var _a = 0, eventListeners_1 = eventListeners; _a < eventListeners_1.length; _a++) {
                var listener = eventListeners_1[_a];
                listener.apply(null, args);
            }
        }
    };
    return MyEventEmitter;
}());
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client(uri) {
        var _this = _super.call(this) || this;
        _this.serverTimeOffset = 0;
        _this.ppl = {};
        _this.desiredChannelSettings = { color: "#ecfaed" };
        _this.canConnect = false;
        _this.noteBuffer = [];
        _this.noteBufferTime = 0;
        _this.offlineParticipant = { _id: "", name: "", color: "#777" };
        _this.uri = uri || "wss://game.multiplayerpiano.com:443";
        _this.bindEventListeners();
        _this.emit("status", "(Offline mode)");
        return _this;
    }
    Client.prototype.isSupported = function () {
        return typeof ws_1.WebSocket === "function";
    };
    Client.prototype.isConnected = function () {
        return (this.isSupported() && this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) || false;
    };
    Client.prototype.isConnecting = function () {
        return (this.isSupported() && this.ws && this.ws.readyState === ws_1.WebSocket.CONNECTING) || false;
    };
    Client.prototype.start = function () {
        this.canConnect = true;
        this.connect();
    };
    Client.prototype.stop = function () {
        this.canConnect = false;
        if (this.ws) {
            this.ws.close();
        }
    };
    Client.prototype.connect = function () {
        var _this = this;
        if (!this.canConnect || !this.isSupported() || this.isConnected() || this.isConnecting()) {
            return;
        }
        this.emit("status", "Connecting...");
        this.ws = new ws_1.WebSocket(this.uri, {
            origin: "https://game.multiplayerpiano.com",
        });
        if (this.ws) {
            this.ws.addEventListener("close", function (evt) {
                _this.user = undefined;
                _this.participantId = undefined;
                _this.channel = undefined;
                _this.setParticipants([]);
                clearInterval(_this.pingInterval);
                clearInterval(_this.noteFlushInterval);
                _this.emit("disconnect", evt);
                _this.emit("status", "Offline mode");
                // reconnect
                if (_this.connectionTime) {
                    _this.connectionTime = undefined;
                }
                setTimeout(_this.connect.bind(_this), 25);
            });
            this.ws.addEventListener("error", function (err) {
                _this.emit("wserror", err);
                if (_this.ws) {
                    _this.ws.close();
                }
            });
            this.ws.addEventListener("open", function (evt) {
                _this.connectionTime = Date.now();
                _this.sendArray([{ m: "hi", x: 1, y: 1 || undefined }]);
                _this.pingInterval = setInterval(function () {
                    _this.sendArray([{ m: "t", e: Date.now() }]);
                }, 20000);
                _this.sendArray([{ m: "t", e: Date.now() }]);
                _this.noteBuffer = [];
                _this.noteBufferTime = 0;
                _this.noteFlushInterval = setInterval(function () {
                    if (_this.noteBufferTime && _this.noteBuffer.length > 0) {
                        _this.sendArray([
                            { m: "n", t: _this.noteBufferTime + _this.serverTimeOffset, n: _this.noteBuffer },
                        ]);
                        _this.noteBufferTime = 0;
                        _this.noteBuffer = [];
                    }
                }, 100);
                _this.emit("connect");
                _this.emit("status", "Joining channel...");
            });
            this.ws.addEventListener("message", function (evt) {
                _this.emit('wsmessage', evt.data);
                var transmission = JSON.parse(evt.data);
                for (var i = 0; i < transmission.length; i++) {
                    var msg = transmission[i];
                    _this.emit(msg.m, msg);
                }
            });
        }
    };
    Client.prototype.bindEventListeners = function () {
        var self = this;
        this.on("hi", function (msg) {
            self.user = msg.u;
            self.receiveServerTime(msg.t, msg.e || undefined);
            if (self.desiredChannelId) {
                self.setChannel();
            }
        });
        this.on("t", function (msg) {
            self.receiveServerTime(msg.t, msg.e || undefined);
        });
        this.on("ch", function (msg) {
            self.desiredChannelId = msg.ch._id;
            self.desiredChannelSettings = msg.ch.settings;
            self.channel = msg.ch;
            if (msg.p)
                self.participantId = msg.p;
            self.setParticipants(msg.ppl);
        });
        this.on("p", function (msg) {
            self.participantUpdate(msg);
            self.emit("participant update", self.findParticipantById(msg.id));
        });
        this.on("m", function (msg) {
            if (self.ppl.hasOwnProperty(msg.id)) {
                self.participantUpdate(msg);
            }
        });
        this.on("bye", function (msg) {
            self.removeParticipant(msg.p);
        });
    };
    Client.prototype.send = function (raw) {
        if (this.isConnected() && this.ws) {
            this.ws.send(raw);
        }
    };
    Client.prototype.sendArray = function (arr) {
        this.send(JSON.stringify(arr));
    };
    Client.prototype.setChannel = function (id, set) {
        this.desiredChannelId = id || this.desiredChannelId || "lobby";
        this.desiredChannelSettings = set || this.desiredChannelSettings || undefined;
        this.sendArray([{ m: "ch", _id: this.desiredChannelId, set: this.desiredChannelSettings }]);
    };
    Client.prototype.getChannelSetting = function (key) {
        if (!this.isConnected() || !this.channel || !this.channel.settings) {
            if (key == 'color')
                return '#ecfaed';
            else
                return;
        }
        return this.channel.settings[key];
    };
    Client.prototype.setChannelSettings = function (settings) {
        if (!this.isConnected() || !this.channel || !this.channel.settings) {
            return;
        }
        if (this.desiredChannelSettings) {
            for (var key in settings) {
                if (settings.hasOwnProperty(key)) {
                    var keys = void 0;
                    if (keys.includes(key))
                        return this.desiredChannelSettings[key] = settings[key]; // @ts-ignore VSCode Sucks
                }
            }
            this.sendArray([{ m: "chset", set: this.desiredChannelSettings }]);
        }
    };
    Client.prototype.getOwnParticipant = function () {
        if (!this.participantId)
            return;
        return this.findParticipantById(this.participantId);
    };
    Client.prototype.setParticipants = function (ppl) {
        // remove participants who left
        for (var id in this.ppl) {
            if (this.ppl.hasOwnProperty(id)) {
                var found = false;
                for (var j = 0; j < ppl.length; j++) {
                    if (ppl[j].id === id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.removeParticipant(id);
                }
            }
        }
        // update all
        for (var i = 0; i < ppl.length; i++) {
            this.participantUpdate(ppl[i]);
        }
    };
    Client.prototype.countParticipants = function () {
        var count = 0;
        for (var i in this.ppl) {
            if (this.ppl.hasOwnProperty(i)) {
                ++count;
            }
        }
        return count;
    };
    Client.prototype.participantUpdate = function (update) {
        if (!update.id)
            return;
        var part = this.ppl[update.id] || null;
        if (part === null) {
            this.ppl[update.id] = update;
            this.emit("participant added", update);
            this.emit("count", this.countParticipants());
        }
        else {
            if (update.x)
                part.x = update.x;
            if (update.y)
                part.y = update.y;
            if (update.color)
                part.color = update.color;
            if (update.name)
                part.name = update.name;
        }
        return;
    };
    Client.prototype.removeParticipant = function (id) {
        if (this.ppl.hasOwnProperty(id)) {
            var part = this.ppl[id];
            delete this.ppl[id];
            this.emit("participant removed", part);
            this.emit("count", this.countParticipants());
        }
    };
    Client.prototype.findParticipantById = function (id) {
        return this.ppl[id] || this.offlineParticipant;
    };
    Client.prototype.isOwner = function () {
        return this.channel && this.channel.crown && this.channel.crown.participantId === this.participantId || false;
    };
    Client.prototype.preventsPlaying = function () {
        return this.isConnected() && !this.isOwner() && this.getChannelSetting("crownsolo") === true;
    };
    Client.prototype.receiveServerTime = function (time, echo) {
        var _this = this;
        var now = Date.now();
        var target = time - now;
        var duration = 1000;
        var steps = 50;
        var step_ms = duration / steps;
        var difference = target - this.serverTimeOffset;
        var inc = difference / steps;
        var step = 0;
        var iv = setInterval(function () {
            _this.serverTimeOffset += inc;
            if (++step >= steps) {
                clearInterval(iv);
                _this.serverTimeOffset = target;
            }
        }, step_ms);
    };
    Client.prototype.startNote = function (note, vel) {
        if (vel === void 0) { vel = 0.5; }
        if (this.isConnected()) {
            if (!this.noteBufferTime) {
                this.noteBufferTime = Date.now();
                this.noteBuffer.push({ d: 0, n: note, v: +(vel.toFixed(3)), s: false });
            }
            else {
                this.noteBuffer.push({ d: Date.now() - this.noteBufferTime, n: note, v: +(vel.toFixed(3)), s: false });
            }
        }
    };
    Client.prototype.stopNote = function (note) {
        if (this.isConnected()) {
            if (!this.noteBufferTime) {
                this.noteBufferTime = Date.now();
                this.noteBuffer.push({ d: 0, n: note, v: 0, s: true });
            }
            else {
                this.noteBuffer.push({ d: Date.now() - this.noteBufferTime, n: note, s: true, v: 0 });
            }
        }
    };
    return Client;
}(MyEventEmitter));
//module.exports = Client;
exports.default = Client;
