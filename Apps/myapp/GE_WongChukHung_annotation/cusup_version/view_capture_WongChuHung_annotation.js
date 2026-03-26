//Sandcastle_Begin

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNGVmYjNhMC00MmYxLTQwM2MtOGI4Ny00ZWI5Njg0NzkxMGUiLCJpZCI6MjMwNTIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODI2NDMxMjF9.25AEbjYl70Epztny5fpcVev7kHi0YaYGXORMsMKprSs';

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
export const viewer = new Cesium.Viewer('cesiumContainer', {
  // globe: false,
  contextOptions: {
    webgl: {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: true,
      premultipliedAlpha: true,
      //通过canvas.toDataURL()实现截图需要将该项设置为true
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: true
    }
  }
});


viewer.scene.skyAtmosphere.show = true;


let is_loading = 1;

try {

  // Cesium.GoogleMaps.defaultApiKey = "AIzaSyAKl-2kZDHNFG-YZ-kSCNHaNmKyNXEaH6I";
  const tileset = await Cesium.createGooglePhotorealistic3DTileset(
  );
  viewer.scene.primitives.add(tileset);

  tileset.tileLoad.addEventListener(() => {
    is_loading = 1;
    console.log(is_loading);
  })

  tileset.allTilesLoaded.addEventListener(function () {
    is_loading = 0;
    console.log(is_loading);
  });
} catch (error) {
  console.log(`Failed to load tileset: ${error}`);
}

viewer.scene.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(114.1749447514, 22.2867094571, 150),
  orientation: {
    heading: Cesium.Math.toRadians(180),
    pitch: Cesium.Math.toRadians(0),
  },
  duration: 0,
}); //Sandcastle_End


var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);


    handler.setInputAction(function (evt) {
      var scene = viewer.scene;
      // var pickedObject = scene.pick(evt.position); //know whether the model is clicked Cesium.defined(pickedObject)

      if (scene.pickPositionSupported) {

        //get cartesian coordinates of the target point
        var cartesian = scene.pickPosition(evt.position);
        // console.log(evt.position);

        // console.log("cartesian:" + cartesian);

        var distance = Cesium.Cartesian3.distance(viewer.camera.position, cartesian);
        // console.log("distance is:" + distance);

        if (Cesium.defined(cartesian)) {

          var cartographic = Cesium.Cartographic.fromCartesian(cartesian); //Cartesian to radian
          var lastPointLng = Cesium.Math.toDegrees(cartographic.longitude); //radian.lon to degree
          var lastPointLat = Cesium.Math.toDegrees(cartographic.latitude); //radian.lat to degree
          var lastPointHeight = cartographic.height;//height of the point

          annotate(cartesian, lastPointLng, lastPointLat, lastPointHeight);

          addPointtotable(lastPointLng, lastPointLat, lastPointHeight);

        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK); //left_click listener


    var annotations = viewer.scene.primitives.add(new Cesium.LabelCollection());

    // Show the geospatial info of the point
    function annotate(cartesian, lng, lat, height) {

      //create a point
      var point = viewer.entities.add({
        position: cartesian,
        point: {
          color: Cesium.Color.WHITE,
          pixelSize: 5
        }
      });

      // text:
      // 'Lon: ' + lng.toFixed(5) + '\u00B0' +
      // '\nLat: ' + lat.toFixed(5) + '\u00B0' +
      // "\nheight: " + height.toFixed(2) + "m",

      // Show the geo info
      annotations.add({
        position: cartesian,
          text:"Here!",
        // "\nheading: " + 87.43 + "°",
        showBackground: true,
        font: '10px monospace',
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      });
    }

    var count = 1;




    // Put info to table
    function addPointtotable(lng, lat, height) {
      var uid = document.getElementById("uid").value;
      var layout_id = document.getElementById("layout_id").value;
      var building_id = document.getElementById("building_id").value;
      var unit_id = document.getElementById("unit_id").value;
      var room_id = document.getElementById("room_id").value;
      var pair_id = document.getElementById("pair_id").value;        
      var floor_id_start = document.getElementById("floor_id_start").value;
      var floor_id_end = document.getElementById("floor_id_end").value;

      var poiInfo = new Array(uid, layout_id, building_id,unit_id, room_id, pair_id, floor_id_start, floor_id_end, count, lng.toFixed(10), lat.toFixed(10), height.toFixed(2), );
      var tableHandle = document.getElementById("poiInfoTable");
      var rowHandle = tableHandle.insertRow(tableHandle.getElementsByTagName("tr").length);
      for (var i = 0; i < 12; i++) {
        rowHandle.insertCell(i).innerHTML = poiInfo[i];
      }
      count++;
    }

    const btn_datasubmit = document.getElementById('dataSubmit');

    btn_datasubmit.addEventListener('click',function(){

      var tableRows = document.getElementById("poiInfoTable").rows;

      let csvContent = 'uid,layout_id,building_id,flat_id,room_id,pair_id,floor_id_start,floor_id_end,ann_id,x,y,height,\n';
      
      var building_id = '';
      var uid='';
      
      // var result = [];
      for (var i = 1; i < tableRows.length; i++) {

        var tds = tableRows[i].cells;

        uid = tds[0].innerHTML;
        var layout_id = tds[1].innerHTML;
        building_id = tds[2].innerHTML;
        var unit_id = tds[3].innerHTML;
        var room_id = tds[4].innerHTML;
        var pair_id = tds[5].innerHTML;        
        var floor_id_start = tds[6].innerHTML;
        var floor_id_end = tds[7].innerHTML;


        var id = tds[8].innerHTML;
        var x = tds[9].innerHTML;
        var y = tds[10].innerHTML;
        var height = tds[11].innerHTML;

        csvContent += uid+","+layout_id+","+building_id+","+unit_id+","+room_id+","+pair_id+","+floor_id_start+","+floor_id_end+","+id+","+x+","+y+","+height+'\n';

        //var bankinfo={"name":"lalal","lalal":"lms"};
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = uid+"_"+building_id+'.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);


      // clear table
      tableClear();

      annotations.removeAll();

    });


    const btn_datadelete = document.getElementById('dataDelete');

    btn_datadelete.addEventListener('click',function(){


      var tableHandle = document.getElementById("poiInfoTable");
      
      if (tableHandle.getElementsByTagName("tr").length>1){
      tableHandle.deleteRow(tableHandle.getElementsByTagName("tr").length - 1);
      annotations.remove(annotations.get(annotations.length-1));

      }

    });

    function tableClear(){
      var tableHandle = document.getElementById("poiInfoTable");

      var current_len=tableHandle.getElementsByTagName("tr").length
      for (var i=0; i< current_len-1; i++){
        tableHandle.deleteRow(current_len -(i+1));
      }     

    }


    // const btn_viewer_size_switch = document.getElementById('ViewerSizeSwitch');


    // btn_viewer_size_switch.addEventListener('click',function(){

    //   var cesium_container_width = document.getElementById("cesiumContainer").style.width;
    //   console.log(cesium_container_width);
    //   if (cesium_container_width == "900px") {
    //     console.log("Viewer size switched to full screen")
    //     document.getElementById("cesiumContainer").style.width = "100%";
    //     document.getElementById("cesiumContainer").style.width = "100%";
    //     document.getElementById("windowsInfoContainer").style.display = "none"


    //   } else {
    //     document.getElementById("cesiumContainer").style.width = "900px";
    //     document.getElementById("cesiumContainer").style.width = "900px";
    //     document.getElementById("windowsInfoContainer").style.display = "show"
    //   }

    // });

    //Function 3: new control

    var flags = {
      looking: false,
      moveForward: false,
      moveBackward: false,
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false
    };

    //获得viewer的场景
    var scene = viewer.scene;
    var canvas = viewer.canvas;
    var ellipsoid = scene.globe.ellipsoid;

    function getFlagForKeyCode(keyCode) {
      switch (keyCode) {
        case 'W'.charCodeAt(0):
          return 'moveForward';
        case 'S'.charCodeAt(0):
          return 'moveBackward';
        case 'Q'.charCodeAt(0):
          return 'moveUp';
        case 'E'.charCodeAt(0):
          return 'moveDown';
        case 'D'.charCodeAt(0):
          return 'moveRight';
        case 'A'.charCodeAt(0):
          return 'moveLeft';
        default:
          return undefined;
      }
    }


    const btn_new_control = document.getElementById('newControl');


    btn_new_control.addEventListener('click',function(){
    
      canvas.setAttribute('tabindex', '0'); // needed to put focus on the canvas
      canvas.onclick = function () {
        canvas.focus();
      };

      // disable the default event handlers
      scene.screenSpaceCameraController.enableRotate = false;
      scene.screenSpaceCameraController.enableTranslate = false;
      scene.screenSpaceCameraController.enableZoom = false;
      scene.screenSpaceCameraController.enableTilt = false;
      scene.screenSpaceCameraController.enableLook = false;


      handler.setInputAction(mouseLeftdown, Cesium.ScreenSpaceEventType.LEFT_DOWN);
      handler.setInputAction(mouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction(mouseLeftup, Cesium.ScreenSpaceEventType.LEFT_UP);


      document.addEventListener('keydown', keydown, false);

      document.addEventListener('keyup', keyup, false);

      viewer.clock.onTick.addEventListener(clockAction);

    });

    var startMousePosition;
    var mousePosition;

    function clockAction(clock) {
      var camera = viewer.camera;

      //左键点下都是 true，抬起即为false.
      if (flags.looking) {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        // Coordinate (0.0, 0.0) will be where the mouse was clicked.
        var x = (mousePosition.x - startMousePosition.x) / width;
        var y = -(mousePosition.y - startMousePosition.y) / height;

        var lookFactor = 0.05;
        camera.lookRight(x * lookFactor);
        camera.lookUp(y * lookFactor);
      }

      // Change movement speed based on the distance of the camera to the surface of the ellipsoid.
      var cameraHeight = ellipsoid.cartesianToCartographic(camera.position).height;
      var moveRate = cameraHeight / 100.0;

      if (flags.moveForward) {
        camera.moveForward(moveRate);
      }
      if (flags.moveBackward) {
        camera.moveBackward(moveRate);
      }
      if (flags.moveUp) {
        camera.moveUp(moveRate);
      }
      if (flags.moveDown) {
        camera.moveDown(moveRate);
      }
      if (flags.moveLeft) {
        camera.moveLeft(moveRate);
      }
      if (flags.moveRight) {
        camera.moveRight(moveRate);
      }
    }

    function mouseLeftdown(movement) {
      flags.looking = true;
      mousePosition = startMousePosition = Cesium.Cartesian3.clone(movement.position);
    }

    function mouseMove(movement) {
      mousePosition = movement.endPosition;
    }

    function mouseLeftup(position) {
      flags.looking = false;
    }

    function keydown(e) {
      var flagName = getFlagForKeyCode(e.keyCode);
      if (typeof flagName !== 'undefined') {
        flags[flagName] = true;
      }
    }

    function keyup(e) {
      var flagName = getFlagForKeyCode(e.keyCode);
      if (typeof flagName !== 'undefined') {
        flags[flagName] = false;
      }
    }

    //Function 4: original control


    const btn_original_control = document.getElementById('originalControl');


    btn_original_control.addEventListener('click',function(){
    
      scene.screenSpaceCameraController.enableRotate = true;
      scene.screenSpaceCameraController.enableTranslate = true;
      scene.screenSpaceCameraController.enableZoom = true;
      scene.screenSpaceCameraController.enableTilt = true;
      scene.screenSpaceCameraController.enableLook = true;
      viewer.clock.onTick.removeEventListener(clockAction);
      handler.removeInputAction(mouseLeftdown);
      handler.removeInputAction(mouseMove);
      handler.removeInputAction(mouseLeftup);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('keyup', keyup);
    });


    // 22.280048773761184, 114.17544987949462
    
    const btn_flyto = document.getElementById('flyto');

    btn_flyto.addEventListener('click',function(){

      var lon=document.getElementById('lon').value;

      var lat=document.getElementById('lat').value;
  
      viewer.scene.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 300),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
        },
        duration: 0,
      }); //Sandcastle_End

    });



    // add one example window view
//     var hk_data_link_1 = "../GE_WongChukHung/withwindow/tileset.json";

//   // var myCesiumTileset_1 = new Cesium.Cesium3DTileset({
//   //   url: hk_data_link_1,
//   //   preferLeaves: true,
//   //   maximumMemoryUsage: 1024,
//   //   maximumScreenSpaceError: 16,
//   // });

//   try {
//     const myCesiumTileset_1 = await Cesium.Cesium3DTileset.fromUrl(
//       hk_data_link_1
//     );
//     viewer.scene.primitives.add(myCesiumTileset_1);


//     var set_positon=1;

//     var lng=114.1688895;
//     var lat=22.2452031;
//     var h=58.75;
//     var rx=90;
//     var ry=20;
//     var rz=0;

//     if (set_positon === 1) {
//       setPosition(myCesiumTileset_1, lng, lat, h, rx, ry, rz);
//     }
    
//     viewer.zoomTo(myCesiumTileset_1);

//     myCesiumTileset_1.tileLoad.addEventListener(() => {
//       is_loading = 1
//       // console.log('is_loading:' + is_loading);
//     })
  
//     myCesiumTileset_1.allTilesLoaded.addEventListener(function () {
//       console.log('tiles are loaded.');
//       is_loading = 0
//     });


//     function setPosition(tileset, lng, lat, h,  rx, ry, rz) {

//       // 计算出模型包围球的中心点(弧度制)，从世界坐标转弧度制
//       var cartographic = Cesium.Cartographic.fromCartesian(
//       tileset.boundingSphere.center
//       )
//       var { longitude, latitude, height } = cartographic
    
//       // 模型包围球的中心点坐标，输出以笛卡尔坐标系表示的三维坐标点
//       var current = Cesium.Cartesian3.fromRadians(
//       longitude,
//       latitude,
//       height
//       )
    
//       if (lng === undefined) {
//       lng = longitude
//       }
//       if (lat === undefined) {
//       lat = latitude
//       }
//       if (h === undefined) {
//       h = height
//       }
//       if (rx === undefined) {
//       rx = 0
//       }
//       if (ry === undefined) {
//       ry = 0
//       }
//       if (rz === undefined) {
//       rz = 0
//       }
    
//       // 旋转
//       var mx = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rx));
//       var my = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(ry));
//       var mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rz));
//       var rotationX = Cesium.Matrix4.fromRotationTranslation(mx);
//       var rotationY = Cesium.Matrix4.fromRotationTranslation(my);
//       var rotationZ = Cesium.Matrix4.fromRotationTranslation(mz);
    
//       var translation = Cesium.Cartesian3.fromDegrees(lng, lat, h);
//       var m = Cesium.Transforms.eastNorthUpToFixedFrame(translation);
//       //旋转、平移矩阵相乘
//       Cesium.Matrix4.multiply(m, rotationX, m);
//       Cesium.Matrix4.multiply(m, rotationY, m);
//       Cesium.Matrix4.multiply(m, rotationZ, m);
//       //赋值给tileset
//       tileset._root.transform = m;
    
//       // viewer.zoomTo(tileset);
//       console.log('set position', lng, lat, h, rx, ry, rz)
//       }
  



// } catch (error) {
//     console.error(`Error creating tileset: ${error}`);
//   }




