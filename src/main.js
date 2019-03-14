
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
// a helper to invoke aterrain
////////////////////////////////////////////////////////////////////////

import TileServer from './TileServer.js';

async function aterrain_wrapper(args) {

  // an aterrain request - which happens to be over the grand canyon

  let data = {
               lat: 36.1069652,
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

  // inject the caller args into the aterrain request - with some error checking

  let lat = parseFloat(args.lat); if(lat<-85)lat=-85; if(lat>85)lat=95;
  let lon = parseFloat(args.lon); if(lon<-180)lon=-180; if(lon>180)lon=180;
  let lod = parseInt(args.lod); if(lod<1)lod=1;if(lod>15)lod=15;
  let str = parseInt(args.str); if(str<0.1)str=0.1;if(str>10)str=10;
  let pad = parseInt(args.pad); if(pad<0)pad=0;if(pad>4)pad=4;
  let elev = parseFloat(args.elev); if(elev<0)elev=0; if(elev>99999)elev=99999;
  let rad = parseFloat(args.rad); if(rad<1000)rad=1000; if(rad>6372798.2)rad=6372798.2;

  data.lat = lat
  data.lon = lon
  data.lod = lod
  data.str = str
  data.padding = pad
  data.elevation = elev
  data.radius = rad

  // start a tile server
  let tileServer = await new TileServer()

  // get a 3js collection of some kind that contains 3js meshes
  let scene = await tileServer.produceManyTiles(data)

  // make a gltf
  let gltf = await gltf_export(scene)

  // turn it into a string
  let json = JSON.stringify( gltf, null, 2 );

  // return the string representing the entirety of the data to the caller
  return json 

  // test: dump it to fs
  // fs.writeFileSync("test.gltf",str)
  // console.log("saved file as test.gltf")
}


///////////////////////////////////////////////////////////////////////
// example server to deal with client requests for tiles
///////////////////////////////////////////////////////////////////////

const http = require('http')
const urlhelper = require('url')

let pathname = __dirname + "/../public/index.html"
let index = 0
fs.readFile(pathname, (err, data) => {
  index = data
})

function handleRequest (req, res) {
  var url = urlhelper.parse(req.url,true)
  console.log("Server :: got a request: " + url)
  if(url.href.length < 2) {
    // send the index.html page
    res.writeHead(200, {"Content-Type": "text/html" })
    res.write(index)
    res.end()
    return
  } else {
    // pass the request to the map generator
    send_map(url.query,res)
  }
}

async function send_map(query,res) {
  try {
    let str = await aterrain_wrapper(query)
    res.writeHead(200,{
      'Content-Disposition':'attachment; filename=atterrain_map.gltf',
      'Content-Type':'model/gltf+json',
      'Content-Length':str.length
    })
    res.write(str)
    res.end()
  } catch(e) {
    console.log(e)
    res.writeHead(400, {"Content-Type": "text/plain"})
    res.end(e)
  }
}

console.log("Server: listening!")
let server = http.createServer(handleRequest).listen(3000)

