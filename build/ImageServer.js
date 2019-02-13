"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

///
/// BingImageProvider - fetch tiles directly from Bing on demand as threejs materials
///
/// TODO - caches images but never flushes them - should flush old images
/// TODO - the key is hardcoded - should be supplied by caller
///
var fetch = require('node-fetch');

var _require = require('canvas'),
    Canvas = _require.Canvas,
    createCanvas = _require.createCanvas,
    loadImage = _require.loadImage;

var THREE = require('three');

var BingImageProvider =
/*#__PURE__*/
function () {
  function BingImageProvider() {
    _classCallCheck(this, BingImageProvider);

    this.cached = {};
  }

  _createClass(BingImageProvider, [{
    key: "readyPromise",
    value: function readyPromise(resolve) {
      var scope = this;
      console.log("ready promise");

      if (scope.imageurl) {
        resolve();
        return;
      }

      console.log("fetching details");
      var metadata = "https://dev.virtualearth.net/REST/V1/Imagery/Metadata/Aerial?output=json&include=ImageryProviders&key=RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL";
      fetch(metadata).then(function (response) {
        return response.json();
      }).then(function (json) {
        console.log("got results");
        console.log(json);

        if (!json.resourceSets.length || !json.resourceSets[0].resources.length) {
          console.error("Too many requests");
          setTimeout(function () {
            resolve();
          }, Math.random() * 10 + 1);
        } else {
          var subdomains = json.resourceSets[0].resources[0].imageUrlSubdomains;
          scope.subdomain = subdomains[~~(subdomains.length * Math.random())];
          scope.imageurl = json.resourceSets[0].resources[0].imageUrl;
          scope.imageurl = scope.imageurl.replace("http", "https");
          scope.imageurl = scope.imageurl.replace("{culture}", "en-US");
          scope.imageurl = scope.imageurl.replace("{subdomain}", scope.subdomain);
          scope.imageurl = scope.imageurl.replace("jpeg", "png");
          console.log("done fetching details");
          resolve();
        }
      });
    }
  }, {
    key: "quadkey",
    value: function quadkey(x, y, z) {
      var quadKey = [];

      for (var i = z; i > 0; i--) {
        var digit = '0';
        var mask = 1 << i - 1;

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
  }, {
    key: "requestImage",
    value: function requestImage(x, y, lod) {
      var scope = this;
      console.log("requesting image");
      console.log(this.imageurl);
      var key = x + "-" + y + "-" + lod;
      var c = scope.cached[key];

      if (c) {
        return new Promise(function (resolve, reject) {
          resolve(c);
        });
      }

      return new Promise(function (resolve, reject) {
        var quadkey = scope.quadkey(x, y, lod);
        console.log(scope);
        console.log(scope.imageurl);
        console.log(quadkey);
        var url = scope.imageurl.replace("{quadkey}", quadkey);
        loadImage(url).then(function (image) {
          image.url = url;
          scope.cached[key] = image;
          console.log("fetched " + url);
          resolve(image);
        }); //let image = new Image();
        //image.onload = unused => {
        //}
        ////fetch(url).then(response => { return response.blob(); }).then( blob => {
        ////  image.url = url;
        ////  image.src = URL.createObjectURL(blob);
        ////});
      });
    }
  }]);

  return BingImageProvider;
}(); ///
/// ImageServer returns images on demand that match the terrain tile boundaries.
///
/// TODO Cesium access token should be settable
/// TODO Code is over-specialized around Bing Images + Cesium Elevation Tiles - but hard to generalize trivially.
///


var ImageServer =
/*#__PURE__*/
function () {
  function ImageServer() {
    _classCallCheck(this, ImageServer);

    this.data = {};
    this.data.debug = false; //this.data.mapStyle = Cesium.BingMapsStyle.AERIAL;

    this.data.source = 0;

    if (this.data.source == 0) {
      // bypass cesium
      this.imageProvider = new BingImageProvider();
    } else if (this.data.source == 1) {
      // cesium for sf area - Something seems to be not working with this provider although it's the one I'd prefer to use right now - mar 1 2018
      this.data.CesiumionAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYmI0ZmY0My1hOTg5LTQzNWEtYWRjNy1kYzYzNTM5ZjYyZDciLCJpZCI6NjksImFzc2V0cyI6WzM3MDQsMzcwMywzNjk5LDM2OTNdLCJpYXQiOjE1MTY4MzA4ODZ9.kM-JnlG-00e7S_9fqS_QpXYTg7y5-cIEcZEgxKwRt5E';
      this.data.url = 'https://beta.cesium.com/api/assets/3693?access_token=' + this.data.CesiumionAccessToken;
      this.imageProvider = new Cesium.createTileMapServiceImageryProvider(this.data);
    } else if (this.data.source == 2) {
      // Cesium Bing abstraction in general - works ok although LOD is off by one?
      this.data.key = 'RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL';
      this.data.url = 'https://dev.virtualearth.net', this.imageProvider = new Cesium.BingMapsImageryProvider(this.data);
    }
  }

  _createClass(ImageServer, [{
    key: "isReady",
    value: function isReady() {
      // TODO examine why do the readypromises differ?
      if (this.data.source == 0) {
        return this.imageProvider && this.imageProvider.imageurl;
      } else {
        return this.imageProvider && this.imageProvider.ready;
      }
    }
  }, {
    key: "ready",
    value: function ready(callback) {
      // TODO examine why do the readypromises differ?
      if (this.data.source == 0) {
        this.imageProvider.readyPromise(callback);
      } else {
        Cesium.when(this.imageProvider.readyPromise).then(callback);
      }
    } // this method calculates the image tile and fractional component (ie which pixel) of the image tile to fetch

  }, {
    key: "projection2tile",
    value: function projection2tile(scheme, image_lod, y) {
      // which tile in the y axis - and retain fractional pixel pos
      var lat = scheme.rect.north - y * scheme.degrees_latrad / 256; // range PI/2 to -PI/2
      // https://msdn.microsoft.com/en-us/library/bb259689.aspx -> no data past these points (I want max Y to be within the previous tile)

      if (lat >= 1.48442222975) lat = 1.48442222974;
      if (lat <= -1.48442222975) lat = -1.48442222974;
      var sinLat = Math.sin(lat);
      var tileY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * image_lod;
      return tileY;
    }
  }, {
    key: "provideImageProjected",
    value: function provideImageProjected(scheme, callback) {
      var _this = this;

      // For Mercator, check out Slide 39-43 of Rendering the Whole Wide World on the World Wide Web for some background and reprojectToGeographic() in ImageryLayer.js for how Cesium currently does it.
      // Here the reprojection is done on CPU...
      // circument a quirk with cesium data source
      var uselod = this.data.source == 2 ? scheme.lod + 1 : scheme.lod + 1; // get image tiles at one level deeper than terrain tiles to take advantage of x lining up

      var image_lod = Math.pow(2, uselod); // where is the top and bottom tile?

      var ty1 = this.projection2tile(scheme, image_lod, 0, 0);
      var ty2 = this.projection2tile(scheme, image_lod, 255, 255);
      var tx1 = scheme.xtile; // load entire range of tiles

      var promises = [];

      for (var i = Math.floor(ty1); i <= Math.floor(ty2); i++) {
        var p = this.imageProvider.requestImage(tx1, i, scheme.lod + 1);
        console.log("pushing " + tx1 + " " + i);
        promises.push(p);
      }

      console.log("done pushing promises"); // get canvas to paint to for final output
      // TODO may as well put this indie the promise

      var canvas = this.canvas_new(); // Paint once loaded

      console.log("waiting to finish doing promises");
      Promise.all(promises).then(function (results) {
        console.log("done promises"); // convert the img to something that can be read and written

        if (!results.length) {
          console.error("Image server no image content error 1");
          return;
        } // a canvas is required per image source in order to get at the pixels


        for (var _i = 0; _i < results.length; _i++) {
          if (typeof results[_i] == 'undefined' || !results[_i]) {
            console.error("Image server no image content error 2");
            return;
          }

          _this.canvas_from_image(results[_i]);
        } // walk the sources and copy pixels to a target - this is labor intensive


        for (var y = 0; y < 256; y++) {
          // get reverse mercator pixel location (only y is needed)
          var txy = _this.projection2tile(scheme, image_lod, y); // get that tile (offset from the set of tiles we happen to have)


          var image = results[Math.floor(txy) - Math.floor(ty1)]; // get y in tile

          var yy = Math.floor(txy * 256) & 255; // copy that row (there is no horizontal reprojection only vertical)
          // TODO this could be optimized such as by not setting the alpha here and copying uints

          for (var x = 0; x < 256; x++) {
            canvas.imageData.data[(y * 256 + x) * 4 + 0] = image.imageData.data[(yy * 256 + x) * 4 + 0];
            canvas.imageData.data[(y * 256 + x) * 4 + 1] = image.imageData.data[(yy * 256 + x) * 4 + 1];
            canvas.imageData.data[(y * 256 + x) * 4 + 2] = image.imageData.data[(yy * 256 + x) * 4 + 2];
            canvas.imageData.data[(y * 256 + x) * 4 + 3] = 255;
          }
        } // return to the caller


        callback(_this.canvas_to_material_from_imagedata(canvas));
      });
    }
  }, {
    key: "provideImage",
    value: function provideImage(scheme, callback) {
      this.provideImageProjected(scheme, callback);
    } //////////////////////////////////////////////////////////// canvas assistance

  }, {
    key: "canvas_new",
    value: function canvas_new() {
      console.log("making canvas");
      var canvas = createCanvas(256, 256); // let canvas = document.createElement('canvas');

      canvas.id = "canvas";
      canvas.width = 256;
      canvas.height = 256;
      canvas.ctx = canvas.getContext("2d");
      canvas.ctx.fillStyle = "#ff0000";
      canvas.ctx.fillRect(0, 0, 256, 256);
      canvas.imageData = canvas.ctx.getImageData(0, 0, 256, 256); //  var buf = new ArrayBuffer(imageData.data.length);
      //  var buf8 = new Uint8ClampedArray(buf);
      //  var data = new Uint32Array(buf);

      console.log("made canvas");
      return canvas;
    }
  }, {
    key: "canvas_from_image",
    value: function canvas_from_image(image) {
      //if(image.canvas) return;
      image.canvas = createCanvas(256, 256); //image.canvas = document.createElement('canvas');

      image.canvas.width = 256;
      image.canvas.height = 256;
      image.canvas.ctx = image.canvas.getContext("2d");
      image.canvas.ctx.fillStyle = "#ffff00";
      image.canvas.ctx.fillRect(0, 0, 256, 256);
      image.canvas.ctx.drawImage(image, 0, 0, 256, 256);
      image.imageData = image.canvas.ctx.getImageData(0, 0, 256, 256);
    }
  }, {
    key: "canvas_to_material",
    value: function canvas_to_material(canvas) {
      if (this.data.debug) {
        var ctx = canvas.ctx;
        ctx.beginPath();
        ctx.lineWidth = "6";
        ctx.strokeStyle = "red";
        ctx.rect(0, 0, 255, 255);
        ctx.stroke();
      } //let material = new THREE.MeshPhongMaterial( { color:0xffffff, wireframe:false });


      var material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        wireframe: false
      }); //shading: THREE.SmoothShading});

      material.map = new THREE.Texture(canvas);
      material.map.needsUpdate = true;
      console.log("canvas converted to material...");
      return material;
    }
  }, {
    key: "canvas_to_material_from_imagedata",
    value: function canvas_to_material_from_imagedata(canvas) {
      // data[y * canvasWidth + x] = 0xff00000+b<<16+g<<8+r;
      // imageData.data.set(buf8);
      canvas.ctx.putImageData(canvas.imageData, 0, 0);
      console.log("canvas converted to image data .... ");
      return this.canvas_to_material(canvas);
    }
  }]);

  return ImageServer;
}(); ///
/// Singelton convenience handles
/// TODO an AFrame System could do this https://aframe.io/docs/0.7.0/core/systems.html
///


ImageServer.instance = function () {
  console.log("Image Server instance() ");
  if (ImageServer.imageServer) return ImageServer.imageServer;
  ImageServer.imageServer = new ImageServer();
  console.log("Image Server Ready");
  return ImageServer.imageServer;
}; // es6 glue


var _default = ImageServer;
exports.default = _default;