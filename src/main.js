
import "@babel/polyfill";
import fs from "fs"


////////////////////////////////////////////////////////////////////////////////////////
// Forge support for canvas and a few basic services so that the THREE module works
////////////////////////////////////////////////////////////////////////////////////////

// https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5
 
const THREE = require('three');
const Canvas = require('canvas');
const { Blob,FileReader } = require('vblob');
import GLTFExporter from 'three-gltf-exporter';

async function gltf_export(geometry,material) {

  // Munge the global namespace
  // however this has to occur after Cesium is done - something in Cesium looks for 'document' and behaves badly
  global.window = global;
  global.Blob = Blob;
  global.FileReader = FileReader;
  global.THREE = THREE;
  if(!global.document) global.document = {}
  global.document.createElement = function(nodeName) {
    if (nodeName !== 'canvas') throw new Error(`Cannot create node ${nodeName}`)
    const canvas = Canvas.createCanvas(256, 256)
    // This isn't working — currently need to avoid toBlob(), so export to embedded .gltf not .glb.
    // canvas.toBlob = function () {
    //   return new Blob([this.toBuffer()]);
    // };
    return canvas;
  }

  // work around a bug in the gltf exporter - the geometry needs userData to not be undefined
  // pre-process some of the expectations so that we can then set user data ....
  if(!geometry.isBufferGeometry ) {
    var geometryTemp = new THREE.BufferGeometry();
    geometryTemp.fromGeometry( geometry );
    geometry = geometryTemp
  }

  // Work around another bug in gltf exporter - userData has to be not undefined
  geometry.userData = {}

  // make a mesh out of this
  let mesh = new THREE.Mesh(geometry,material);

  // helper to synchronously generate a string representing the gtlf

  function gltfParsePromise(mesh) {
    return new Promise(function(resolve,reject) {
      let gltf = new GLTFExporter()
      gltf.parse(mesh,function(result) {
        resolve(result)
      })
    })
  }

  // return string to caller
  let result = await gltfParsePromise(mesh)

  return result
}

////////////////////////////////////////////////////////////////////////
// a hardcoded example query
////////////////////////////////////////////////////////////////////////

import TileServer from './TileServer.js';

let data = {
             lat: 37.7983222,
             lon: -122.3972797,
             lod: 15,                 // desired level of detail - will compute itself if not specified
         stretch: 1,                  // how much to stetch space vertically
         padding: 0,                  // how many extra tiles to fetch around area of interest
       elevation: 0,
          radius: 6372798.2,
    world_radius: 6372798.2,
             url: "https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
         project: 0,
   groundTexture: '',
    building_url: 'https://mozilla.cesium.com/SanFranciscoGltf15',
  building_flags: 2,
 buildingTexture: ''
}

async function test() {

  // start a tile server
  let tileServer = await new TileServer()

  // get some tiles
  let results = await tileServer.produceManyTiles(data)

  // make a gltf
  let gltf = await gltf_export(results.geometry,results.material)

  // turn it into a string
  let str = JSON.stringify( gltf, null, 2 );

  // dump it to fs
  fs.writeFileSync("test.gltf",str)

}

test()

///////////////////////////////////////////////////////////////////////
// example server to deal with client requests for tiles
///////////////////////////////////////////////////////////////////////

const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


