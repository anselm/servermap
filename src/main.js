
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

async function gltf_export(scene) {

  // Munge the global namespace
  // this has to occur AFTER Cesium is done - something in Cesium looks for 'document' and behaves badly
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

  // rewrite all geometry for two bugs in exporter:
  // 1) exporer needs geometry userData to not be undefined
  // 2) can only deal with buffer geometry
  scene.traverse(node => {
    if (node instanceof THREE.Mesh ) {
      if(!node.geometry.isBufferGeometry ) {
        var geometryTemp = new THREE.BufferGeometry()
        geometryTemp.fromGeometry( node.geometry )
        node.geometry = geometryTemp
      }
      node.geometry.userData = {}
    }
  })

  // wrap promise around exporter
  function gltfParsePromise(scene) {
    return new Promise(function(resolve,reject) {
      let gltf = new GLTFExporter()
      gltf.parse(scene,function(result) {
        resolve(result)
      })
    })
  }

  // get gltf as a string
  let result = await gltfParsePromise(scene)

  // return gltf
  return result
}

////////////////////////////////////////////////////////////////////////
// a hardcoded example query
////////////////////////////////////////////////////////////////////////

import TileServer from './TileServer.js';

let data = {
             //lat: 37.7983222,
             lat: 36.1069652,
             //lon: -122.3972797,
             lon: -112.1129972,
             lod: 14,                 // desired level of detail - will compute itself if not specified
         stretch: 1,                  // how much to stetch space vertically
         padding: 1,                  // how many extra tiles to fetch around area of interest
       elevation: 1,
          radius: 100000, // 6372798.2,
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

  // get a 3js collection of some kind that contains 3js meshes
  let scene = await tileServer.produceManyTiles(data)

  // make a gltf
  let gltf = await gltf_export(scene)

  // turn it into a string
  let str = JSON.stringify( gltf, null, 2 );

  // dump it to fs
  fs.writeFileSync("test.gltf",str)

  console.log("saved file as test.gltf")
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


