Server side tile generation test.

Build

npm run compile
or
./node_modules/.bin/babel src --out-dir build --presets=@babel/env

Run

npm start


Note

 - must use cesium 1.53 due to a bug
 - must manually stuff const THREE = require('three') into node_modules/three-gltf-exporter/
 - Right now compile.bat uses babel by hand to generate the es5 files. This could all use cleaning up!
 - right now the tile is hardcoded - will listen to server params later

If you take the sample gltf in this folder and throw it at a viewer you should see the below. An example viewer is at https://gltf-viewer.donmccurdy.com/ .

<img alt="sanfrancisco" target="_blank" src="https://github.com/anselm/servermap/blob/master/example_tile.png?raw=true" width="660"></a>



