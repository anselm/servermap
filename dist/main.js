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
// https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5
var THREE = require('three');

var Canvas = require('canvas');

var _require = require('vblob'),
    Blob = _require.Blob,
    FileReader = _require.FileReader;

function gltf_export(_x, _x2) {
  return _gltf_export.apply(this, arguments);
} ////////////////////////////////////////////////////////////////////////
// a hardcoded example query
////////////////////////////////////////////////////////////////////////


function _gltf_export() {
  _gltf_export = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(geometry, material) {
    var geometryTemp, mesh, gltfParsePromise, result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            gltfParsePromise = function _ref(mesh) {
              return new Promise(function (resolve, reject) {
                var gltf = new _threeGltfExporter.default();
                gltf.parse(mesh, function (result) {
                  resolve(result);
                });
              });
            };

            // Munge the global namespace
            // however this has to occur after Cesium is done - something in Cesium looks for 'document' and behaves badly
            global.window = global;
            global.Blob = Blob;
            global.FileReader = FileReader;
            global.THREE = THREE;
            if (!global.document) global.document = {};

            global.document.createElement = function (nodeName) {
              if (nodeName !== 'canvas') throw new Error("Cannot create node ".concat(nodeName));
              var canvas = Canvas.createCanvas(256, 256); // This isn't working — currently need to avoid toBlob(), so export to embedded .gltf not .glb.
              // canvas.toBlob = function () {
              //   return new Blob([this.toBuffer()]);
              // };

              return canvas;
            }; // work around a bug in the gltf exporter - the geometry needs userData to not be undefined
            // pre-process some of the expectations so that we can then set user data ....


            if (!geometry.isBufferGeometry) {
              geometryTemp = new THREE.BufferGeometry();
              geometryTemp.fromGeometry(geometry);
              geometry = geometryTemp;
            } // Work around another bug in gltf exporter - userData has to be not undefined


            geometry.userData = {}; // make a mesh out of this

            mesh = new THREE.Mesh(geometry, material); // helper to synchronously generate a string representing the gtlf

            _context.next = 12;
            return gltfParsePromise(mesh);

          case 12:
            result = _context.sent;
            return _context.abrupt("return", result);

          case 14:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return _gltf_export.apply(this, arguments);
}

var data = {
  lat: 37.7983222,
  lon: -122.3972797,
  lod: 15,
  // desired level of detail - will compute itself if not specified
  stretch: 1,
  // how much to stetch space vertically
  padding: 0,
  // how many extra tiles to fetch around area of interest
  elevation: 0,
  radius: 6372798.2,
  world_radius: 6372798.2,
  url: "https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
  project: 0,
  groundTexture: '',
  building_url: 'https://mozilla.cesium.com/SanFranciscoGltf15',
  building_flags: 2,
  buildingTexture: ''
};

function test() {
  return _test.apply(this, arguments);
}

function _test() {
  _test = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2() {
    var tileServer, results, gltf, str;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return new _TileServer.default();

          case 2:
            tileServer = _context2.sent;
            _context2.next = 5;
            return tileServer.produceManyTiles(data);

          case 5:
            results = _context2.sent;
            _context2.next = 8;
            return gltf_export(results.geometry, results.material);

          case 8:
            gltf = _context2.sent;
            // turn it into a string
            str = JSON.stringify(gltf, null, 2); // dump it to fs

            _fs.default.writeFileSync("test.gltf", str);

          case 11:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));
  return _test.apply(this, arguments);
}

test(); ///////////////////////////////////////////////////////////////////////
// example server to deal with client requests for tiles
///////////////////////////////////////////////////////////////////////

var http = require('http');

var hostname = '127.0.0.1';
var port = 3000;
var server = http.createServer(function (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});
server.listen(port, hostname, function () {
  console.log("Server running at http://".concat(hostname, ":").concat(port, "/"));
});