"use strict";

var TileServer = require('./TileServer.js');

TileServer = TileServer.default; ////////////////////////////////////////////////////////////////////////

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
  console.log("loading a tile");
  TileServer.instance().produceTile(data, function (scheme) {
    console.log("************** DONE *********************");
  });
}

TileServer.instance().ready(data.url, function () {
  console.log("Lower level TileServer is ready");
  test();
}); ///////////////////////////////////////////////////////////////////////

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