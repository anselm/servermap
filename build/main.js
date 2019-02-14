"use strict";

var _threeGltfExporter = _interopRequireDefault(require("three-gltf-exporter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

////////////////////////////////////////////////////////////////////////////////////////
// Forge support for canvas and a few basic services so that the THREE module works
////////////////////////////////////////////////////////////////////////////////////////
// https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5
var THREE = require('three');

var Canvas = require('canvas');

var _require = require('vblob'),
    Blob = _require.Blob,
    FileReader = _require.FileReader;

function gltf_export(geometry, material) {
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
    var geometryTemp = new THREE.BufferGeometry();
    geometryTemp.fromGeometry(geometry);
    geometry = geometryTemp;
  } // Work around a bug


  geometry.userData = {}; // make a mesh out of this

  var mesh = new THREE.Mesh(geometry, material); // make exporter

  var gltf = new _threeGltfExporter.default();
  gltf.parse(mesh, function (result) {
    var output = JSON.stringify(result, null, 2);
    console.log(output);
  });
} ////////////////////////////////////////////////////////////////////////
// a hardcoded example query
////////////////////////////////////////////////////////////////////////


var TileServer = require('./TileServer.js');

TileServer = TileServer.default;
var data = {
  lat: 37.7983222,
  lon: -122.3972797,
  lod: 15,
  stretch: 1,
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
  TileServer.instance().produceTile(data, function (scheme) {
    gltf_export(scheme.geometry, scheme.material);
  });
}

TileServer.instance().ready(data.url, function () {
  test();
}); ///////////////////////////////////////////////////////////////////////
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