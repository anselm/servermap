"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fetch = require('node-fetch');

var _require = require('canvas'),
    Canvas = _require.Canvas,
    createCanvas = _require.createCanvas,
    loadImage = _require.loadImage;

var THREE = require('three'); /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// BingImageProvider - fetch tiles directly from Bing on demand as threejs materials
///
/// TODO - caches images but never flushes them - should flush old images
/// TODO - the key is hardcoded - should be supplied by caller
///
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var _BingImageProvider =
/*#__PURE__*/
function () {
  function _BingImageProvider() {
    _classCallCheck(this, _BingImageProvider);

    this.cached = {};
    return this._constructionPromise();
  }

  _createClass(_BingImageProvider, [{
    key: "_constructionPromise",
    value: function () {
      var _constructionPromise2 = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var scope, metadata, response, json, subdomains;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                scope = this;

                if (!scope.imageurl) {
                  _context.next = 3;
                  break;
                }

                return _context.abrupt("return", scope);

              case 3:
                metadata = "https://dev.virtualearth.net/REST/V1/Imagery/Metadata/Aerial?output=json&include=ImageryProviders&key=RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL";
                _context.next = 6;
                return fetch(metadata);

              case 6:
                response = _context.sent;
                _context.next = 9;
                return response.json();

              case 9:
                json = _context.sent;

                if (!json.resourceSets.length || !json.resourceSets[0].resources.length) {
                  console.error("Too many requests"); //setTimeout(function() { resolve(); },Math.random() * 10 + 1);
                } else {
                  subdomains = json.resourceSets[0].resources[0].imageUrlSubdomains;
                  scope.subdomain = subdomains[~~(subdomains.length * Math.random())];
                  scope.imageurl = json.resourceSets[0].resources[0].imageUrl;
                  scope.imageurl = scope.imageurl.replace("http", "https");
                  scope.imageurl = scope.imageurl.replace("{culture}", "en-US");
                  scope.imageurl = scope.imageurl.replace("{subdomain}", scope.subdomain);
                  scope.imageurl = scope.imageurl.replace("jpeg", "png");
                }

                return _context.abrupt("return", scope);

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function _constructionPromise() {
        return _constructionPromise2.apply(this, arguments);
      }

      return _constructionPromise;
    }()
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
      var key = x + "-" + y + "-" + lod;
      var c = scope.cached[key];

      if (c) {
        return new Promise(function (resolve, reject) {
          resolve(c);
        });
      }

      return new Promise(function (resolve, reject) {
        var quadkey = scope.quadkey(x, y, lod);
        var url = scope.imageurl.replace("{quadkey}", quadkey);
        loadImage(url).then(function (image) {
          image.url = url;
          scope.cached[key] = image;
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

  return _BingImageProvider;
}(); /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// ImageServer returns images on demand that match the terrain tile boundaries.
///
/// TODO Cesium access token should be settable
/// TODO Code is over-specialized around Bing Images + Cesium Elevation Tiles - but hard to generalize trivially.
///
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var ImageServer =
/*#__PURE__*/
function () {
  function ImageServer() {
    _classCallCheck(this, ImageServer);

    this.data = {};
    this.data.debug = false; // TODO - hard coded to go directly to for now - need to switch back to Cesium keys - but somehow tile organization differs?

    this.data.source = 0; // Build an asynchronous promise that the constructor can return that can be awaited on to return the actual 'this' property

    return this._constructionPromise();
  }

  _createClass(ImageServer, [{
    key: "_constructionPromise",
    value: function () {
      var _constructionPromise3 = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(this.data.source == 0)) {
                  _context2.next = 6;
                  break;
                }

                _context2.next = 3;
                return new _BingImageProvider();

              case 3:
                this.imageProvider = _context2.sent;
                _context2.next = 19;
                break;

              case 6:
                if (!(this.data.source == 1)) {
                  _context2.next = 14;
                  break;
                }

                // cesium for sf area - Something seems to be not working with this provider although it's the one I'd prefer to use right now - mar 1 2018
                this.data.CesiumionAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYmI0ZmY0My1hOTg5LTQzNWEtYWRjNy1kYzYzNTM5ZjYyZDciLCJpZCI6NjksImFzc2V0cyI6WzM3MDQsMzcwMywzNjk5LDM2OTNdLCJpYXQiOjE1MTY4MzA4ODZ9.kM-JnlG-00e7S_9fqS_QpXYTg7y5-cIEcZEgxKwRt5E';
                this.data.url = 'https://beta.cesium.com/api/assets/3693?access_token=' + this.data.CesiumionAccessToken;
                this.imageProvider = new Cesium.createTileMapServiceImageryProvider(this.data);
                _context2.next = 12;
                return this.imageProvider.readyPromise();

              case 12:
                _context2.next = 19;
                break;

              case 14:
                if (!(this.data.source == 2)) {
                  _context2.next = 19;
                  break;
                }

                // Cesium Bing abstraction in general - works ok although LOD is off by one?
                this.data.key = 'RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL';
                this.data.url = 'https://dev.virtualearth.net', this.imageProvider = new Cesium.BingMapsImageryProvider(this.data);
                _context2.next = 19;
                return this.imageProvider.readyPromise();

              case 19:
                return _context2.abrupt("return", this);

              case 20:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _constructionPromise() {
        return _constructionPromise3.apply(this, arguments);
      }

      return _constructionPromise;
    }() // this method calculates the image tile and fractional component (ie which pixel) of the image tile to fetch

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
    key: "provideImage",
    value: function () {
      var _provideImage = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3(scheme) {
        var uselod, image_lod, ty1, ty2, tx1, promises, i, p, results, _i, canvas, y, txy, image, yy, x, material;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                // For Mercator, check out Slide 39-43 of Rendering the Whole Wide World on the World Wide Web for some background and reprojectToGeographic() in ImageryLayer.js for how Cesium currently does it.
                // Here the reprojection is done on CPU...
                // circument a quirk with cesium data source - TODO cesium uses a different tile scheme than bing
                uselod = this.data.source == 2 ? scheme.lod + 1 : scheme.lod + 1; // get image tiles at one level deeper than terrain tiles to take advantage of x lining up

                image_lod = Math.pow(2, uselod); // where is the top and bottom tile?

                ty1 = this.projection2tile(scheme, image_lod, 0, 0);
                ty2 = this.projection2tile(scheme, image_lod, 255, 255);
                tx1 = scheme.xtile; // load entire range of tiles

                promises = [];

                for (i = Math.floor(ty1); i <= Math.floor(ty2); i++) {
                  p = this.imageProvider.requestImage(tx1, i, scheme.lod + 1);
                  console.log("ImageServer: pushing an image promise to load at tile xy = " + tx1 + " " + i + " over range " + Math.floor(ty1) + " to " + Math.floor(ty2));
                  promises.push(p);
                } // Wait for promises


                _context3.next = 9;
                return Promise.all(promises);

              case 9:
                results = _context3.sent;

                if (!(!results || !results.length)) {
                  _context3.next = 13;
                  break;
                }

                console.error("ImageServer: no image content error 1");
                return _context3.abrupt("return");

              case 13:
                _i = 0;

              case 14:
                if (!(_i < results.length)) {
                  _context3.next = 22;
                  break;
                }

                if (!(typeof results[_i] == 'undefined' || !results[_i])) {
                  _context3.next = 18;
                  break;
                }

                console.error("ImageServer: no image content error 2");
                return _context3.abrupt("return");

              case 18:
                this.canvas_from_image(results[_i]);

              case 19:
                _i++;
                _context3.next = 14;
                break;

              case 22:
                // get a canvas to paint to for final output
                canvas = this.canvas_new(); // walk the sources and copy pixels to a target - this is labor intensive

                for (y = 0; y < 256; y++) {
                  // get reverse mercator pixel location (only y is needed)
                  txy = this.projection2tile(scheme, image_lod, y); // get that tile (offset from the set of tiles we happen to have)

                  image = results[Math.floor(txy) - Math.floor(ty1)]; // get y in tile

                  yy = Math.floor(txy * 256) & 255; // copy that row (there is no horizontal reprojection only vertical)
                  // TODO this could be optimized such as by not setting the alpha here and copying uints

                  for (x = 0; x < 256; x++) {
                    canvas.imageData.data[(y * 256 + x) * 4 + 0] = image.imageData.data[(yy * 256 + x) * 4 + 0];
                    canvas.imageData.data[(y * 256 + x) * 4 + 1] = image.imageData.data[(yy * 256 + x) * 4 + 1];
                    canvas.imageData.data[(y * 256 + x) * 4 + 2] = image.imageData.data[(yy * 256 + x) * 4 + 2];
                    canvas.imageData.data[(y * 256 + x) * 4 + 3] = 255;
                  }
                } // return a material to the caller to be nice


                material = this.canvas_to_material_from_imagedata(canvas);
                return _context3.abrupt("return", material);

              case 26:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function provideImage(_x) {
        return _provideImage.apply(this, arguments);
      }

      return provideImage;
    }() //////////////////////////////////////////////////////////// canvas assistance

  }, {
    key: "canvas_new",
    value: function canvas_new() {
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
      return material;
    }
  }, {
    key: "canvas_to_material_from_imagedata",
    value: function canvas_to_material_from_imagedata(canvas) {
      // data[y * canvasWidth + x] = 0xff00000+b<<16+g<<8+r;
      // imageData.data.set(buf8);
      canvas.ctx.putImageData(canvas.imageData, 0, 0);
      return this.canvas_to_material(canvas);
    }
  }]);

  return ImageServer;
}(); // es6 glue


var _default = ImageServer;
exports["default"] = _default;