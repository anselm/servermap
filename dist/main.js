"use strict";

require("@babel/polyfill");

var _fs = _interopRequireDefault(require("fs"));

var _threeGltfExporter = _interopRequireDefault(require("three-gltf-exporter"));

var _TileServer = _interopRequireDefault(require("./TileServer.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

////////////////////////////////////////////////////////////////////////////////////////
// Forge support for canvas and a few basic services so that the THREE module works
////////////////////////////////////////////////////////////////////////////////////////
var UseBinaryFlag = false; // https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5

var atob = require('atob');

var THREE = require('three');

var Canvas = require('canvas');

var _require = require('vblob'),
    Blob = _require.Blob,
    FileReader = _require.FileReader;

var toBlob = function toBlob(callback) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "image/png";
  var quality = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  var canvas = this;
  var str = canvas.toDataURL(type, quality).split(',')[1];
  var binStr = atob(str);
  var len = binStr.length;
  var arr = new Uint8Array(len);

  for (var i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }

  callback(new Blob([arr], {
    type: type || 'image/png'
  }));
};

function gltf_export(_x) {
  return _gltf_export.apply(this, arguments);
} ////////////////////////////////////////////////////////////////////////
// a helper to invoke aterrain
////////////////////////////////////////////////////////////////////////


function _gltf_export() {
  _gltf_export = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(scene) {
    var gltfParsePromise, result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            gltfParsePromise = function _ref(scene) {
              return new Promise(function (resolve, reject) {
                var gltf = new _threeGltfExporter.default();
                gltf.parse(scene, function (result) {
                  resolve(result);
                }, {
                  binary: UseBinaryFlag
                });
              });
            };

            // Munge the global namespace
            // this has to occur AFTER Cesium is done - something in Cesium looks for 'document' and behaves badly
            global.window = global;
            global.Blob = Blob;
            global.FileReader = FileReader;
            global.THREE = THREE;
            if (!global.document) global.document = {};

            global.document.createElement = function (nodeName) {
              if (nodeName !== 'canvas') throw new Error("Cannot create node ".concat(nodeName));
              var canvas = Canvas.createCanvas(256, 256);
              var protos = Object.getPrototypeOf(canvas);
              protos.toBlob = toBlob;
              return canvas;
            }; // rewrite all geometry for two bugs in exporter:
            // 1) exporer needs geometry userData to not be undefined
            // 2) can only deal with buffer geometry


            scene.traverse(function (node) {
              if (node instanceof THREE.Mesh) {
                if (!node.geometry.isBufferGeometry) {
                  var geometryTemp = new THREE.BufferGeometry();
                  geometryTemp.fromGeometry(node.geometry);
                  node.geometry = geometryTemp;
                }

                node.geometry.userData = {};
              }
            }); // wrap promise around exporter

            _context.next = 10;
            return gltfParsePromise(scene);

          case 10:
            result = _context.sent;
            // undefine the things we defined so that cesium stops freaking out
            delete global.window;
            delete global.Blob;
            delete global.FileReader;
            delete global.THREE;
            delete global.document; // return gltf

            return _context.abrupt("return", result);

          case 17:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _gltf_export.apply(this, arguments);
}

function aterrain_wrapper(_x2) {
  return _aterrain_wrapper.apply(this, arguments);
} ///////////////////////////////////////////////////////////////////////
// example server to deal with client requests for tiles
///////////////////////////////////////////////////////////////////////


function _aterrain_wrapper() {
  _aterrain_wrapper = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(args) {
    var data, lat, lon, lod, str, pad, elev, rad, tileServer, scene, gltf, json;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            // an aterrain request - which happens to be over the grand canyon
            data = {
              lat: 36.1069652,
              lon: -112.1129972,
              lod: 14,
              // desired level of detail - will compute itself if not specified
              stretch: 1,
              // how much to stetch space vertically
              padding: 1,
              // how many extra tiles to fetch around area of interest
              elevation: 1,
              radius: 100000,
              // 6372798.2,
              world_radius: 6372798.2,
              url: "https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
              project: 0,
              groundTexture: '',
              building_url: 'https://mozilla.cesium.com/SanFranciscoGltf15',
              building_flags: 2,
              buildingTexture: '' // inject the caller args into the aterrain request - with some error checking

            };
            lat = parseFloat(args.lat);
            if (lat < -85) lat = -85;
            if (lat > 85) lat = 95;
            lon = parseFloat(args.lon);
            if (lon < -180) lon = -180;
            if (lon > 180) lon = 180;
            lod = parseInt(args.lod);
            if (lod < 1) lod = 1;
            if (lod > 15) lod = 15;
            str = parseInt(args.str);
            if (str < 0.1) str = 0.1;
            if (str > 10) str = 10;
            pad = parseInt(args.pad);
            if (pad < 0) pad = 0;
            if (pad > 4) pad = 4;
            elev = parseFloat(args.elev);
            if (elev < 0) elev = 0;
            if (elev > 99999) elev = 99999;
            rad = parseFloat(args.rad);
            if (rad < 1000) rad = 1000;
            if (rad > 6372798.2) rad = 6372798.2;
            data.lat = lat;
            data.lon = lon;
            data.lod = lod;
            data.str = str;
            data.padding = pad;
            data.elevation = elev;
            data.radius = rad; // start a tile server

            _context2.next = 31;
            return new _TileServer.default();

          case 31:
            tileServer = _context2.sent;
            _context2.next = 34;
            return tileServer.produceManyTiles(data);

          case 34:
            scene = _context2.sent;
            _context2.next = 37;
            return gltf_export(scene);

          case 37:
            gltf = _context2.sent;
            // turn it into a string
            json = JSON.stringify(gltf, null, 2); // return the string representing the entirety of the data to the caller

            return _context2.abrupt("return", json);

          case 40:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _aterrain_wrapper.apply(this, arguments);
}

var http = require('http');

var urlhelper = require('url');

var pathname = __dirname + "/../public/index.html";
var index = 0;

_fs.default.readFile(pathname, function (err, data) {
  index = data;
});

function handleRequest(req, res) {
  var url = urlhelper.parse(req.url, true);
  console.log("Server :: got a request: " + url);

  if (url.href.length < 2) {
    // send the index.html page
    res.writeHead(200, {
      "Content-Type": "text/html"
    });
    res.write(index);
    res.end();
    return;
  } else if (parseFloat(url.query.rad ? url.query.rad : 0) > 1) {
    // pass the request to the map generator
    UseBinaryFlag = url.query.binary == "true" ? true : false;
    send_map(url.query, res);
  } else {
    res.writeHead(200, {
      "Content-Type": "text/html"
    });
    res.write("Something is wrong with params");
    res.end();
    return;
  }
}

function send_map(_x3, _x4) {
  return _send_map.apply(this, arguments);
}

function _send_map() {
  _send_map = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(query, res) {
    var str;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return aterrain_wrapper(query);

          case 3:
            str = _context3.sent;

            if (!UseBinaryFlag) {
              res.writeHead(200, {
                'Content-Disposition': 'attachment; filename=atterrain_map.gltf',
                'Content-Type': 'model/gltf+json',
                'Content-Length': str.length
              });
            } else {
              res.writeHead(200, {
                'Content-Disposition': 'attachment; filename=atterrain_map.glb',
                'Content-Type': 'model/gltf-binary',
                'Content-Length': str.length
              });
            }

            res.write(str);
            res.end();
            _context3.next = 14;
            break;

          case 9:
            _context3.prev = 9;
            _context3.t0 = _context3["catch"](0);
            console.log(_context3.t0);
            res.writeHead(400, {
              "Content-Type": "text/plain"
            });
            res.end(_context3.t0);

          case 14:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, null, [[0, 9]]);
  }));
  return _send_map.apply(this, arguments);
}

console.log("Server: listening!");
var server = http.createServer(handleRequest).listen(3000);