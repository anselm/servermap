Server side tile generator based on aterrain

#Build

npm run compile
or
./node_modules/.bin/babel src --out-dir build --presets=@babel/env

#Run

npm start

Visit the web page with a browser - now you can manually produce tile area gltfs

#Note

 - must use cesium 1.53 due to a bug
 - must manually stuff const THREE = require('three') into node_modules/three-gltf-exporter/
 - There seems to be a bug with HUBS - I find that saving to Sketchfab first seems to clean up the data.

If you take the sample gltf in this folder and throw it at a viewer you should see the below. An example viewer is at https://gltf-viewer.donmccurdy.com/ .

<img alt="sanfrancisco" target="_blank" src="https://github.com/anselm/servermap/blob/master/example_tile.png?raw=true" width="660"></a>



