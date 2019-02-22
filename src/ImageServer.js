
const fetch = require('node-fetch');

const { Canvas, createCanvas, loadImage } = require('canvas')

var THREE = require('three')

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// BingImageProvider - fetch tiles directly from Bing on demand as threejs materials
///
/// TODO - caches images but never flushes them - should flush old images
/// TODO - the key is hardcoded - should be supplied by caller
///
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class _BingImageProvider {

  constructor() {
    this.cached = {};
    return this._constructionPromise()
  }

  async _constructionPromise() {
    let scope = this
    if(scope.imageurl) {
      return scope
    }
    let metadata = "https://dev.virtualearth.net/REST/V1/Imagery/Metadata/Aerial?output=json&include=ImageryProviders&key=RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL";
    let response = await fetch(metadata)
    let json = await response.json()
    if(!json.resourceSets.length || !json.resourceSets[0].resources.length) {
      console.error("Too many requests");
      //setTimeout(function() { resolve(); },Math.random() * 10 + 1);
    } else {
      let subdomains = json.resourceSets[0].resources[0].imageUrlSubdomains;
      scope.subdomain = subdomains[~~(subdomains.length * Math.random())];
      scope.imageurl = json.resourceSets[0].resources[0].imageUrl;
      scope.imageurl = scope.imageurl.replace("http", "https");
      scope.imageurl = scope.imageurl.replace("{culture}", "en-US");
      scope.imageurl = scope.imageurl.replace("{subdomain}",scope.subdomain);
      scope.imageurl = scope.imageurl.replace("jpeg", "png");
    }
    return scope
  }

  quadkey(x, y, z) {
    let quadKey = [];
    for (var i = z; i > 0; i--) {
      var digit = '0';
      var mask = 1 << (i - 1);
      if ((x & mask) != 0) {
          digit++;
      }
      if ((y & mask) != 0) {
          digit++;
          digit++;
      }
      quadKey.push(digit);
    }
    return quadKey.join('');
  }

  requestImage(x,y,lod) {
    let scope = this;
    let key = x + "-" + y + "-" + lod;
    let c = scope.cached[key];
    if(c) {
      return new Promise(function(resolve,reject) {
        resolve(c);
      });
    }

    return new Promise(function(resolve,reject) {
      let quadkey = scope.quadkey(x,y,lod);
      let url = scope.imageurl.replace("{quadkey}", quadkey);
      loadImage(url).then( (image) => {
        image.url = url
        scope.cached[key] = image;
        resolve(image);
      })
      //let image = new Image();
      //image.onload = unused => {
      //}
      ////fetch(url).then(response => { return response.blob(); }).then( blob => {
      ////  image.url = url;
      ////  image.src = URL.createObjectURL(blob);
      ////});
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// ImageServer returns images on demand that match the terrain tile boundaries.
///
/// TODO Cesium access token should be settable
/// TODO Code is over-specialized around Bing Images + Cesium Elevation Tiles - but hard to generalize trivially.
///
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class ImageServer {

  constructor() {
    this.data = {};
    this.data.debug = false;
    // TODO - hard coded to go directly to for now - need to switch back to Cesium keys - but somehow tile organization differs?
    this.data.source = 0;
    // Build an asynchronous promise that the constructor can return that can be awaited on to return the actual 'this' property
    return this._constructionPromise()
  }

  async _constructionPromise() {
    if(this.data.source == 0) {
      // This is a 'direct' provider that emulates Cesium's provider but just does everything itself
      this.imageProvider = await new _BingImageProvider();
    } else if(this.data.source == 1) {
      // cesium for sf area - Something seems to be not working with this provider although it's the one I'd prefer to use right now - mar 1 2018
      this.data.CesiumionAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYmI0ZmY0My1hOTg5LTQzNWEtYWRjNy1kYzYzNTM5ZjYyZDciLCJpZCI6NjksImFzc2V0cyI6WzM3MDQsMzcwMywzNjk5LDM2OTNdLCJpYXQiOjE1MTY4MzA4ODZ9.kM-JnlG-00e7S_9fqS_QpXYTg7y5-cIEcZEgxKwRt5E';
      this.data.url = 'https://beta.cesium.com/api/assets/3693?access_token=' + this.data.CesiumionAccessToken;
      this.imageProvider = new Cesium.createTileMapServiceImageryProvider(this.data);
      await this.imageProvider.readyPromise()
    } else if(this.data.source == 2) {
      // Cesium Bing abstraction in general - works ok although LOD is off by one?
      this.data.key = 'RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL';
      this.data.url = 'https://dev.virtualearth.net',
      this.imageProvider = new Cesium.BingMapsImageryProvider(this.data);
      await this.imageProvider.readyPromise()
    }
    return this
  }

  // this method calculates the image tile and fractional component (ie which pixel) of the image tile to fetch
  projection2tile(scheme,image_lod,y) {
    // which tile in the y axis - and retain fractional pixel pos
    let lat = scheme.rect.north - y*scheme.degrees_latrad/256; // range PI/2 to -PI/2
    // https://msdn.microsoft.com/en-us/library/bb259689.aspx -> no data past these points (I want max Y to be within the previous tile)
    if(lat >= 1.48442222975) lat = 1.48442222974;
    if(lat <= -1.48442222975) lat = -1.48442222974;
    let sinLat = Math.sin(lat);
    let tileY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * image_lod;
    return tileY;
  }

  async provideImage(scheme) {

    // For Mercator, check out Slide 39-43 of Rendering the Whole Wide World on the World Wide Web for some background and reprojectToGeographic() in ImageryLayer.js for how Cesium currently does it.
    // Here the reprojection is done on CPU...

    // circument a quirk with cesium data source - TODO cesium uses a different tile scheme than bing
    let uselod = (this.data.source == 2) ? scheme.lod+1 : scheme.lod+1;

    // get image tiles at one level deeper than terrain tiles to take advantage of x lining up
    let image_lod = Math.pow(2,uselod);

    // where is the top and bottom tile?
    let ty1 = this.projection2tile(scheme,image_lod,0,0);
    let ty2 = this.projection2tile(scheme,image_lod,255,255);
    let tx1 = scheme.xtile;

    // load entire range of tiles
    let promises = [];
    for(let i = Math.floor(ty1);i<=Math.floor(ty2);i++) {
      let p = this.imageProvider.requestImage(tx1,i,scheme.lod+1);
      console.log("ImageServer: pushing an image promise to load at tile xy = " + tx1 + " " + i )
      promises.push(p);
    }

    // Wait for promises
    let results = await Promise.all(promises)

    // convert the img to something that can be read and written
    if(!results || !results.length) {
      console.error("ImageServer: no image content error 1");
      return;        
    }

    // a canvas is required per image source in order to get at the pixels
    for(let i = 0; i < results.length;i++) {        
      if(typeof results[i] == 'undefined' || !results[i]) {
        console.error("ImageServer: no image content error 2");
        return;
      }
      this.canvas_from_image(results[i]);
    }

    // get a canvas to paint to for final output
    let canvas = this.canvas_new();

    // walk the sources and copy pixels to a target - this is labor intensive
    for(let y = 0;y<256;y++) {

      // get reverse mercator pixel location (only y is needed)
      let txy = this.projection2tile(scheme,image_lod,y);

      // get that tile (offset from the set of tiles we happen to have)
      let image = results[Math.floor(txy)-Math.floor(ty1)];

      // get y in tile
      let yy = Math.floor(txy*256) & 255;

      // copy that row (there is no horizontal reprojection only vertical)
      // TODO this could be optimized such as by not setting the alpha here and copying uints
      for(let x = 0; x<256;x++) {
        canvas.imageData.data[(y*256+x)*4+0] = image.imageData.data[(yy*256+x)*4+0];
        canvas.imageData.data[(y*256+x)*4+1] = image.imageData.data[(yy*256+x)*4+1];
        canvas.imageData.data[(y*256+x)*4+2] = image.imageData.data[(yy*256+x)*4+2];
        canvas.imageData.data[(y*256+x)*4+3] = 255;
      }
    }

    // return a material to the caller to be nice
    let material = this.canvas_to_material_from_imagedata(canvas)
    return material
  }

  //////////////////////////////////////////////////////////// canvas assistance

  canvas_new() {
    let canvas = createCanvas(256,256)
    // let canvas = document.createElement('canvas');
    canvas.id = "canvas";
    canvas.width = 256;
    canvas.height = 256;
    canvas.ctx = canvas.getContext("2d");
    canvas.ctx.fillStyle = "#ff0000";
    canvas.ctx.fillRect(0,0,256,256);
    canvas.imageData = canvas.ctx.getImageData(0,0,256,256);
    //  var buf = new ArrayBuffer(imageData.data.length);
    //  var buf8 = new Uint8ClampedArray(buf);
    //  var data = new Uint32Array(buf);
    console.log("made canvas")
    return canvas;
  }

  canvas_from_image(image) {
    //if(image.canvas) return;
    image.canvas = createCanvas(256,256)
    //image.canvas = document.createElement('canvas');
    image.canvas.width = 256;
    image.canvas.height = 256;
    image.canvas.ctx = image.canvas.getContext("2d");
    image.canvas.ctx.fillStyle = "#ffff00";
    image.canvas.ctx.fillRect(0,0,256,256);
    image.canvas.ctx.drawImage(image,0,0,256,256);
    image.imageData = image.canvas.ctx.getImageData(0,0,256,256);
  }

  canvas_to_material(canvas) {

    if(this.data.debug) {
      let ctx = canvas.ctx;
      ctx.beginPath();
      ctx.lineWidth="6";
      ctx.strokeStyle="red";
      ctx.rect(0,0,255,255); 
      ctx.stroke();
    }

    //let material = new THREE.MeshPhongMaterial( { color:0xffffff, wireframe:false });
    let material = new THREE.MeshLambertMaterial( { color:0xffffff, wireframe:false }); //shading: THREE.SmoothShading});
    material.map = new THREE.Texture(canvas);
    material.map.needsUpdate = true;
    return material;
  }

  canvas_to_material_from_imagedata(canvas) {
    // data[y * canvasWidth + x] = 0xff00000+b<<16+g<<8+r;
    // imageData.data.set(buf8);
    canvas.ctx.putImageData(canvas.imageData, 0, 0);
    return this.canvas_to_material(canvas);
  }

}

// es6 glue

export default ImageServer;

