
import "@babel/polyfill";
import fs from "fs"

////////////////////////////////////////////////////////////////////////////////////////
// Forge support for canvas and a few basic services so that the THREE module works
////////////////////////////////////////////////////////////////////////////////////////

let UseBinaryFlag = false

// https://discourse.threejs.org/t/nodejs-threejs-gltfexporter-server-side-blob-issue/4040/5

var atob = require('atob');
 
const THREE = require('three');
const Canvas = require('canvas');
const { Blob,FileReader } = require('vblob');
import GLTFExporter from 'three-gltf-exporter';

let toBlob = function (callback, type="image/png", quality = 1) {
  let canvas = this
  let str = canvas.toDataURL(type, quality).split(',')[1]
  let binStr = atob(str)
  let len = binStr.length
  let arr = new Uint8Array(len)
  for (var i = 0; i < len; i++ ) {
    arr[i] = binStr.charCodeAt(i)
  }
  callback( new Blob( [arr], {type: type || 'image/png'} ) )
}

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
    let canvas = Canvas.createCanvas(256, 256)
    let protos = Object.getPrototypeOf(canvas)
    protos.toBlob = toBlob
    return canvas;
  }

  // now rewrite all geometry to avoid two bugs in gltf exporter itself:
  // 1) explorer needs geometry userData to not be undefined
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
      },{binary:UseBinaryFlag})
    })
  }

  // get gltf as an arraybuffer of uint8array 
  let result = await gltfParsePromise(scene)

  // undefine the things we defined to avoid polluting global namespace
  delete(global.window)
  delete(global.Blob)
  delete(global.FileReader)
  delete(global.THREE)
  delete(global.document)

  // return gltf
  return result
}

////////////////////////////////////////////////////////////////////////
// a helper to invoke aterrain
////////////////////////////////////////////////////////////////////////

import TileServer from './TileServer.js';


function encode(input,out="") {
  for(let i = 0; i < input.length; i++ ) {
    out += input.charCodeAt(i).toString(16)
  }
  return out
}
function decode(input,out="") {
  for(let i = 0; i < input.length; i+=2 ) {
    out += String.fromCharCode(parseInt(input.substr(i, 2), 16))
  }
  return out
}


async function aterrain_wrapper(args) {

  // this is a typical aterrain request - for a piece of the grand canyon
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

  // values that this code is interested in changing

  let lat = data.lat
  let lon = data.lon
  let lod = data.lod
  let str = data.stretch
  let pad = data.padding
  let elev = data.elevation
  let rad = data.radius

  // a special option to circument some issues with hubs

  if(args.blob) {
    console.log("using blob")
    let blob = decode(args.blob)
    blob.split("&").forEach(part => {
      let terms = part.split("=")
      args[terms[0]]=terms[1]
      console.log(terms[0] + " = " + terms[1] )
    })
  }

  // inject the caller args into the aterrain request - with some error checking

  if(args.lat !== undefined ) { lat = parseFloat(args.lat); if(lat<-85)lat=-85; if(lat>85)lat=95; }
  if(args.lon !== undefined ) { lon = parseFloat(args.lon); if(lon<-180)lon=-180; if(lon>180)lon=180; }
  if(args.lod !== undefined ) { lod = parseInt(args.lod); if(lod<1)lod=1;if(lod>15)lod=15; }
  if(args.str !== undefined ) { str = parseInt(args.str); if(str<0.1)str=0.1;if(str>10)str=10; }
  if(args.pad !== undefined ) { pad = parseInt(args.pad); if(pad<0)pad=0;if(pad>4)pad=4; }
  if(args.elev !== undefined ) { elev = parseFloat(args.elev); if(elev<0)elev=0; if(elev>99999)elev=99999; }
  if(args.rad !== undefined ) { rad = parseFloat(args.rad); if(rad<1000)rad=1000; if(rad>6372798)rad=6372798; }

  data.lat = lat
  data.lon = lon
  data.lod = lod
  data.str = data.stretch = str
  data.padding = pad
  data.elevation = elev
  data.radius = rad

  // start a tile server
  let tileServer = await new TileServer()

  // get a 3js collection of some kind that contains 3js meshes
  let scene = await tileServer.produceManyTiles(data)

  // make a blob
  let blob  = await gltf_export(scene)

  // return uint8array or string
  return blob
}


///////////////////////////////////////////////////////////////////////
// example server to deal with client requests for tiles
///////////////////////////////////////////////////////////////////////

const http = require('http')
const urlhelper = require('url')

// cache the index.html
let pathname = __dirname + "/../public/index.html"
let index = 0
fs.readFile(pathname, (err, data) => {
  index = data
})

// helper to write the blob back to client
async function send_map(query,res) {
  try {
    let blob = await aterrain_wrapper(query)
    if(!UseBinaryFlag) {
      let str = JSON.stringify( blob, null, 2 );
      res.writeHead(200,{
        'Content-Disposition':'attachment; filename=atterrain_map.gltf',
        'Content-Type':'model/gltf+json',
        'Content-Length':str.length
      })
      res.write(str)
      res.end()
    } else {
      let buf = new Buffer(blob)
      res.writeHead(200,{
        'Content-Disposition':'attachment; filename=atterrain_map.glb',
        'Content-Type':'model/gltf-binary',
        'Content-Length':buf.length
      })
      res.write(buf)
      res.end()
    }
  } catch(e) {
    console.log(e)
    res.writeHead(400, {"Content-Type": "text/plain"})
    res.end(e)
  }
}

// catch request
function handleAllRequests(req, res) {
  var url = urlhelper.parse(req.url,true)
  console.log("Server :: got a request: " + url)
  if(url.href.length < 2) {
    // send the index.html page
    res.writeHead(200, {"Content-Type": "text/html" })
    res.write(index)
    res.end()
    return
  } else if(parseFloat(url.query.rad ? url.query.rad : 0) > 1) {
    // pass the request to the map generator
    UseBinaryFlag = url.query.binary == "true" ? true : false
    send_map(url.query,res)
  } else {
    res.writeHead(200, {"Content-Type": "text/html" })
    res.write("Something is wrong with params")
    res.end()
    return
  }
}

// start
console.log("Server: listening!")
let server = http.createServer(handleAllRequests).listen(3000)

