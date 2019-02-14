"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : new P(function (resolve) {
        resolve(result.value);
      }).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var tmp = require("tmp");

var fs = require("fs");

var EventTarget = require('eventtarget');

function getTempPath() {
  return new Promise(function (resolve, reject) {
    tmp.tmpName(function (err, path) {
      if (err) reject(err);else {
        tempFiles.add(path);
        resolve(path);
      }
    });
  });
}

function fdopen(path, flags) {
  return new Promise(function (resolve, reject) {
    return fs.open(path, flags, function (err, fd) {
      if (err) reject(err);else resolve(fd);
    });
  });
}

function fdclose(fd) {
  return new Promise(function (resolve, reject) {
    return fs.close(fd, function (err) {
      if (err) reject(err);else resolve();
    });
  });
}

function fdwriteFile(fd, path) {
  return new Promise(function (resolve, reject) {
    var writer = fs.createWriteStream(null, {
      fd: fd
    });
    var reader = fs.createReadStream(path);
    reader.on('error', reject);
    reader.on('end', resolve);
    writer.on('error', reject);
    reader.pipe(writer, {
      end: false
    });
  });
}

function fdwrite(fd, str) {
  return new Promise(function (resolve, reject) {
    return fs.write(fd, str, function (err) {
      if (err) reject(err);else resolve();
    });
  });
}

function fdread(fd, size, position) {
  var buffer = Buffer.alloc(size);
  return new Promise(function (resolve, reject) {
    return fs.read(fd, buffer, 0, size, position, function (err) {
      if (err) reject(err);else resolve(buffer);
    });
  });
}

var tempFiles = new Set();
var onExit = [];
process.on('exit', function (code) {
  for (var _i = 0; _i < onExit.length; _i++) {
    var cb = onExit[_i];
    cb();
  }

  process.exit(code);
});
onExit.push(function () {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = tempFiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var file = _step.value;
      fs.unlinkSync(file);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return != null) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
});

var VBlob =
/*#__PURE__*/
function () {
  function VBlob(array, options) {
    var _this = this;

    _classCallCheck(this, VBlob);

    this._path = '';
    this._offset = 0;
    this._writeTask = Promise.resolve(0);
    this._type = options && options.type || '';

    if (!array) {
      this._path = '';
      this._size = 0;
    } else {
      var size = 0;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        var _loop = function _loop() {
          var value = _step2.value;

          if (value instanceof ArrayBuffer) {
            if (value.byteLength === 0) return "continue";

            _this._write(function (fd) {
              return fdwrite(fd, new Uint8Array(value));
            });

            size += value.byteLength;
          } else if (value instanceof Uint8Array) {
            if (value.byteLength === 0) return "continue";

            _this._write(function (fd) {
              return fdwrite(fd, value);
            });

            size += value.byteLength;
          } else if (value instanceof Int8Array || value instanceof Uint8ClampedArray || value instanceof Int16Array || value instanceof Uint16Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Float32Array || value instanceof Float64Array || value instanceof DataView) {
            if (value.byteLength === 0) return "continue";

            _this._write(function (fd) {
              return fdwrite(fd, new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
            });

            size += value.byteLength;
          } else if (value instanceof VBlob) {
            if (value._size === 0) return "continue";

            _this._write(function (fd) {
              return fdwriteFile(fd, value._path);
            });

            size += value._size;
          } else {
            var str = value + '';
            if (str.length === 0) return "continue";

            _this._write(function (fd) {
              return fdwrite(fd, str);
            });

            size += str.length;
          }
        };

        for (var _iterator2 = array[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _ret = _loop();

          if (_ret === "continue") continue;
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      this._writeEnd();

      this._size = size;
    }
  }

  _createClass(VBlob, [{
    key: "_write",
    value: function _write(fn) {
      var _this2 = this;

      this._writeTask = this._writeTask.then(function (fd) {
        return __awaiter(_this2, void 0, void 0,
        /*#__PURE__*/
        regeneratorRuntime.mark(function _callee() {
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (fd) {
                    _context.next = 7;
                    break;
                  }

                  _context.next = 3;
                  return getTempPath();

                case 3:
                  this._path = _context.sent;
                  _context.next = 6;
                  return fdopen(this._path, 'w+');

                case 6:
                  fd = _context.sent;

                case 7:
                  _context.next = 9;
                  return fn(fd);

                case 9:
                  return _context.abrupt("return", fd);

                case 10:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));
      });
    }
  }, {
    key: "_writeEnd",
    value: function _writeEnd() {
      this._writeTask = this._writeTask.then(function (fd) {
        return fdclose(fd);
      }).then(function () {
        return 0;
      });
    }
  }, {
    key: "slice",
    value: function slice(start, end, contentType) {
      var _this3 = this;

      if (!start) start = 0;else if (start < 0) start = this._size + start;
      if (!end) end = this._size;
      if (end < 0) end = this._size - end;else if (end >= this._size) end = this._size;
      if (start >= end) return new VBlob([]);
      var newblob = new VBlob();
      newblob._type = contentType || this._type;
      newblob._writeTask = this._writeTask;
      newblob._offset = this._offset + start;
      newblob._size = end - start;

      this._writeTask.then(function () {
        return newblob._path = _this3._path;
      });

      return newblob;
    }
  }, {
    key: "readBuffer",
    value: function readBuffer(fd) {
      return fdread(fd, this._size, this._offset).then(function (buffer) {
        return buffer.buffer;
      });
    }
  }, {
    key: "size",
    get: function get() {
      return this._size;
    }
  }, {
    key: "type",
    get: function get() {
      return this._type;
    }
  }]);

  return VBlob;
}();

exports.Blob = global['Blob'] || VBlob;

var VFileReader =
/*#__PURE__*/
function (_EventTarget) {
  _inherits(VFileReader, _EventTarget);

  function VFileReader() {
    var _this4;

    _classCallCheck(this, VFileReader);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(VFileReader).call(this));
    _this4._workCount = 0;
    _this4._abort = null;
    _this4._abortPromise = null;
    _this4._readyState = 0;
    return _this4;
  }

  _createClass(VFileReader, [{
    key: "abort",
    value: function abort() {
      this._readyState = 2;

      if (this._abort) {
        this._abort(null);

        this._abort = null;
        this._abortPromise = null;
      }

      this.dispatchEvent({
        type: 'abort'
      });
    }
  }, {
    key: "_readBuffer",
    value: function _readBuffer(blob, cb) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3() {
        var _this5 = this;

        var data;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;

                if (this._workCount === 0) {
                  this.dispatchEvent({
                    type: 'loadstart'
                  });
                }

                this._workCount++;

                if (!(blob._size === 0)) {
                  _context3.next = 8;
                  break;
                }

                data = Buffer.alloc(0);
                this.result = cb(data);
                this.dispatchEvent({
                  type: 'load'
                });
                return _context3.abrupt("return");

              case 8:
                this._readyState = 1;

                if (!this._abortPromise) {
                  this._abortPromise = new Promise(function (resolve) {
                    _this5._abort = resolve;
                  });
                }

                _context3.next = 12;
                return Promise.race([this._abortPromise, function () {
                  return __awaiter(_this5, void 0, void 0,
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee2() {
                    var fd;
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            _context2.next = 2;
                            return blob._writeTask;

                          case 2:
                            _context2.next = 4;
                            return fdopen(blob._path, 'r');

                          case 4:
                            fd = _context2.sent;
                            _context2.prev = 5;
                            _context2.next = 8;
                            return fdread(fd, blob._size, blob._offset);

                          case 8:
                            return _context2.abrupt("return", _context2.sent);

                          case 9:
                            _context2.prev = 9;
                            fdclose(fd);
                            return _context2.finish(9);

                          case 12:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2, this, [[5,, 9, 12]]);
                  }));
                }()]);

              case 12:
                data = _context3.sent;

                if (data) {
                  this.result = cb(data);
                  this.dispatchEvent({
                    type: 'load'
                  });
                }

                _context3.next = 20;
                break;

              case 16:
                _context3.prev = 16;
                _context3.t0 = _context3["catch"](0);
                this.error = _context3.t0;
                this.dispatchEvent({
                  type: 'error',
                  message: _context3.t0 ? _context3.t0.message : "Error"
                });

              case 20:
                _context3.prev = 20;
                this._readyState = 2;
                this._workCount--;

                if (this._workCount === 0) {
                  if (data !== null) {
                    this.dispatchEvent({
                      type: 'loadend'
                    });
                  }
                }

                return _context3.finish(20);

              case 25:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 16, 20, 25]]);
      }));
    }
  }, {
    key: "readAsArrayBuffer",
    value: function readAsArrayBuffer(blob) {
      if (!(blob instanceof VBlob)) throw Error('Only for VBlob');

      this._readBuffer(blob, function (data) {
        return data.buffer;
      });
    }
  }, {
    key: "readAsBinaryString",
    value: function readAsBinaryString(blob) {
      if (!(blob instanceof VBlob)) throw Error('Only for VBlob');

      this._readBuffer(blob, function (data) {
        return data.toString('binary');
      });
    }
  }, {
    key: "readAsDataURL",
    value: function readAsDataURL(blob) {
      if (!(blob instanceof VBlob)) throw Error('Only for VBlob');

      this._readBuffer(blob, function (data) {
        return "data:" + blob._type + ";base64," + data.toString('base64');
      });
    }
  }, {
    key: "readAsText",
    value: function readAsText(blob) {
      if (!(blob instanceof VBlob)) throw Error('Only for VBlob');

      this._readBuffer(blob, function (data) {
        return data.toString();
      });
    }
  }, {
    key: "readyState",
    get: function get() {
      return this._readyState;
    }
  }]);

  return VFileReader;
}(EventTarget);

exports.FileReader = global['FileReader'] || VFileReader;