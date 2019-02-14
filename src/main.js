
////////////////////////////////////////////////////////////////////////////////////////
// Forge support for canvas and a few basic services so that the THREE module works
////////////////////////////////////////////////////////////////////////////////////////

// https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5
 
const THREE = require('three');
const Canvas = require('canvas');
const { Blob,FileReader } = require('vblob');
import GLTFExporter from 'three-gltf-exporter';

function gltf_export(geometry,material) {
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
  // Work around a bug
  geometry.userData = {}

  // make a mesh out of this
  let mesh = new THREE.Mesh(geometry,material);

  // make exporter
  let gltf = new GLTFExporter()
  gltf.parse( mesh, function( result ) {
    var output = JSON.stringify( result, null, 2 );
    console.log( output );
  });

}

////////////////////////////////////////////////////////////////////////
// a hardcoded example query
////////////////////////////////////////////////////////////////////////

var TileServer = require('./TileServer.js')
TileServer = TileServer.default

let data = {
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
}

function test() {
  TileServer.instance().produceTile(data,scheme => {
    gltf_export(scheme.geometry,scheme.material)
  })
}

TileServer.instance().ready(data.url,function() {
   test()
})



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


