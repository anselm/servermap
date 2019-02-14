"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var index_1 = require("./index");

try {
  console.log("input: 01234567890");
  var blob = new index_1.Blob(['0', '1', '2', new Uint8Array([0x33, 0x34, 0x35]), 67, new Uint8Array([0x38, 0x39]).buffer]);
  console.log("size: " + blob.size);
  var sliced = blob.slice(5, 10);
  console.log("sliced size: " + sliced.size);
  var datamatched = [];
  var reader = new index_1.FileReader();

  reader.onloadstart = function () {
    return console.log('onloadstart');
  };

  reader.onloadend = function () {
    return console.log('onloadend');
  };

  reader.onload = function () {
    return console.log('onload: ' + JSON.stringify(reader.result));
  };

  reader.onabort = function () {
    return console.log('onabort');
  };

  reader.onerror = function () {
    return console.log(reader.error);
  };

  reader.readAsArrayBuffer(blob);
  reader.readAsBinaryString(blob);
  reader.readAsDataURL(blob);
  reader.readAsText(blob);
  reader.readAsArrayBuffer(sliced);
  reader.readAsBinaryString(sliced);
  reader.readAsDataURL(sliced);
  reader.readAsText(sliced);
} catch (err) {
  console.error(err);
}