//Sandcastle_Begin

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNGVmYjNhMC00MmYxLTQwM2MtOGI4Ny00ZWI5Njg0NzkxMGUiLCJpZCI6MjMwNTIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODI2NDMxMjF9.25AEbjYl70Epztny5fpcVev7kHi0YaYGXORMsMKprSs';

const viewerOptions = {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  globe: false,
  contextOptions: {
    webgl: {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: true,
      premultipliedAlpha: true,
      //???canvas.toDataURL()???????????????????rue
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: true
    }
  }
};


// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
export const viewer = new Cesium.Viewer('cesiumContainer', viewerOptions);

// Keep default Sandcastle-like rendering baseline
if (viewer.scene.globe) {
  viewer.scene.globe.show = false;
}
viewer.scene.skyAtmosphere.show = true;
viewer.scene.gamma = 1.0;



let is_loading = 1;

// try {

//   // Cesium.GoogleMaps.defaultApiKey = "AIzaSyAKl-2kZDHNFG-YZ-kSCNHaNmKyNXEaH6I";
//   const tileset = await Cesium.createGooglePhotorealistic3DTileset(
//   );
//   viewer.scene.primitives.add(tileset);

//   tileset.tileLoad.addEventListener(() => {
//     is_loading = 1;
//     console.log(is_loading);
//   })

//   tileset.allTilesLoaded.addEventListener(function () {
//     is_loading = 0;
//     console.log(is_loading);
//   });
// } catch (error) {
//   console.log(`Failed to load tileset: ${error}`);
// }



var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);


    handler.setInputAction(function (evt) {
      var scene = viewer.scene;
      // var pickedObject = scene.pick(evt.position); //know whether the model is clicked Cesium.defined(pickedObject)

      if (scene.pickPositionSupported) {

        //get cartesian coordinates of the target point
        var cartesian = scene.pickPosition(evt.position);
        console.log(evt.position);

        console.log("cartesian:" + cartesian);

        var distance = Cesium.Cartesian3.distance(viewer.camera.position, cartesian);
        console.log("distance is:" + distance);

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
    var pointEntities = [];

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
      pointEntities.push(point);

      // Show the geo info
      annotations.add({
        position: cartesian,
        text:
          'Lon: ' + lng.toFixed(5) + '\u00B0' +
          '\nLat: ' + lat.toFixed(5) + '\u00B0' +
          "\nheight: " + height.toFixed(2) + "m",
        // "\nheading: " + 87.43 + "°",
        showBackground: true,
        font: '14px monospace',
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      });
    }

    var count = 1;
    var rowsData = [];
    var pointFieldConfigs = [
      { name: "uid", defaultValue: "" },
      { name: "bldgid", defaultValue: "" },
      { name: "officeid", defaultValue: "" },
      { name: "windowid", defaultValue: "" },
      { name: "face_id", defaultValue: "" },
      { name: "elevation", defaultValue: "" }
    ];
    var fixedCoordFields = ["lon", "lat", "height"];

    function sanitizeFieldName(name) {
      return String(name || "").trim().replace(/\s+/g, "_");
    }

    function hasField(fieldName, excludeIndex) {
      var lower = sanitizeFieldName(fieldName).toLowerCase();
      if (!lower) {
        return false;
      }
      for (var i = 0; i < pointFieldConfigs.length; i++) {
        if (typeof excludeIndex === "number" && i === excludeIndex) {
          continue;
        }
        if (pointFieldConfigs[i].name.toLowerCase() === lower) {
          return true;
        }
      }
      return false;
    }

    function csvEscape(value) {
      var text = String(value ?? "");
      if (text.includes('"')) {
        text = text.replace(/"/g, '""');
      }
      if (/[",\n\r]/.test(text)) {
        return '"' + text + '"';
      }
      return text;
    }

    function buildRowDefaults() {
      var fields = {};
      for (var i = 0; i < pointFieldConfigs.length; i++) {
        fields[pointFieldConfigs[i].name] = pointFieldConfigs[i].defaultValue || "";
      }
      if (Object.prototype.hasOwnProperty.call(fields, "uid")) {
        fields.uid = String(count);
      }
      return fields;
    }

    function renderFieldConfigTable() {
      var body = document.getElementById("field_config_body");
      if (!body) {
        return;
      }
      body.innerHTML = "";

      for (var i = 0; i < pointFieldConfigs.length; i++) {
        var config = pointFieldConfigs[i];
        var row = document.createElement("tr");

        var fieldCell = document.createElement("td");
        var fieldInput = document.createElement("input");
        fieldInput.type = "text";
        fieldInput.value = config.name;
        fieldInput.setAttribute("data-index", String(i));
        fieldInput.setAttribute("data-type", "name");
        fieldCell.appendChild(fieldInput);
        row.appendChild(fieldCell);

        var defaultCell = document.createElement("td");
        var defaultInput = document.createElement("input");
        defaultInput.type = "text";
        defaultInput.value = config.defaultValue || "";
        defaultInput.setAttribute("data-index", String(i));
        defaultInput.setAttribute("data-type", "default");
        defaultCell.appendChild(defaultInput);
        row.appendChild(defaultCell);

        var opCell = document.createElement("td");
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "x";
        removeBtn.setAttribute("data-index", String(i));
        removeBtn.setAttribute("data-type", "remove");
        opCell.appendChild(removeBtn);
        row.appendChild(opCell);

        body.appendChild(row);
      }
    }

    function renderPointTable() {
      var head = document.getElementById("poiInfoHead");
      var body = document.getElementById("poiInfoBody");
      if (!head || !body) {
        return;
      }

      head.innerHTML = "";
      var hr = document.createElement("tr");
      for (var i = 0; i < pointFieldConfigs.length; i++) {
        var th = document.createElement("th");
        th.textContent = pointFieldConfigs[i].name;
        th.style.width = "95px";
        hr.appendChild(th);
      }
      for (var j = 0; j < fixedCoordFields.length; j++) {
        var coordTh = document.createElement("th");
        coordTh.textContent = fixedCoordFields[j];
        coordTh.style.width = j < 2 ? "120px" : "90px";
        hr.appendChild(coordTh);
      }
      head.appendChild(hr);

      body.innerHTML = "";
      for (var rowIndex = 0; rowIndex < rowsData.length; rowIndex++) {
        var rowData = rowsData[rowIndex];
        var tr = document.createElement("tr");

        for (var fieldIndex = 0; fieldIndex < pointFieldConfigs.length; fieldIndex++) {
          var fieldName = pointFieldConfigs[fieldIndex].name;
          var td = document.createElement("td");
          var input = document.createElement("input");
          input.type = "text";
          input.value = rowData.fields[fieldName] ?? "";
          input.setAttribute("data-row-index", String(rowIndex));
          input.setAttribute("data-field", fieldName);
          td.appendChild(input);
          tr.appendChild(td);
        }

        var lonTd = document.createElement("td");
        lonTd.textContent = Number(rowData.lon).toFixed(10);
        tr.appendChild(lonTd);

        var latTd = document.createElement("td");
        latTd.textContent = Number(rowData.lat).toFixed(10);
        tr.appendChild(latTd);

        var heightTd = document.createElement("td");
        heightTd.textContent = Number(rowData.height).toFixed(2);
        tr.appendChild(heightTd);

        body.appendChild(tr);
      }
    }

    function addPointtotable(lng, lat, height) {
      rowsData.push({
        fields: buildRowDefaults(),
        lon: lng,
        lat: lat,
        height: height
      });
      count++;
      renderPointTable();
    }

    function syncFieldRename(oldName, newName) {
      if (oldName === newName) {
        return;
      }
      for (var i = 0; i < rowsData.length; i++) {
        var rowFields = rowsData[i].fields;
        rowFields[newName] = rowFields[oldName] ?? "";
        delete rowFields[oldName];
      }
    }

    function removeFieldAt(index) {
      var removed = pointFieldConfigs.splice(index, 1);
      if (removed.length === 0) {
        return;
      }
      var removedName = removed[0].name;
      for (var i = 0; i < rowsData.length; i++) {
        delete rowsData[i].fields[removedName];
      }
      renderFieldConfigTable();
      renderPointTable();
    }

    function addFieldConfig(name, defaultValue) {
      var normalized = sanitizeFieldName(name);
      if (!normalized) {
        alert("Field name is required.");
        return;
      }
      if (fixedCoordFields.indexOf(normalized.toLowerCase()) >= 0 || normalized.toLowerCase() === "ann_id") {
        alert("Field name is reserved.");
        return;
      }
      if (hasField(normalized)) {
        alert("Field name already exists.");
        return;
      }

      pointFieldConfigs.push({
        name: normalized,
        defaultValue: String(defaultValue || "")
      });
      for (var i = 0; i < rowsData.length; i++) {
        rowsData[i].fields[normalized] = String(defaultValue || "");
      }
      renderFieldConfigTable();
      renderPointTable();
    }

    const btn_datasubmit = document.getElementById('dataSubmit');

    btn_datasubmit.addEventListener('click',function(){

      if (rowsData.length === 0) {
        alert("No points to export.");
        return;
      }

      var headerFields = pointFieldConfigs.map(function (c) { return c.name; });
      let csvContent = ['ann_id'].concat(headerFields).concat(fixedCoordFields).join(',') + '\n';
      
      var firstUid = '';
      var firstBldgId = '';
      
      for (var i = 0; i < rowsData.length; i++) {
        var row = rowsData[i];
        var uid = String(row.fields.uid || "").trim();
        var bldgid = String(row.fields.bldgid || "").trim();

        if (!firstUid && uid) {
          firstUid = uid;
        }
        if (!firstBldgId && bldgid) {
          firstBldgId = bldgid;
        }

        var ann_id = uid || String(i + 1);
        var values = [ann_id];
        for (var f = 0; f < headerFields.length; f++) {
          values.push(csvEscape(row.fields[headerFields[f]] ?? ""));
        }
        values.push(csvEscape(Number(row.lon).toFixed(10)));
        values.push(csvEscape(Number(row.lat).toFixed(10)));
        values.push(csvEscape(Number(row.height).toFixed(2)));
        csvContent += values.join(',') + '\n';
      }

      const csvNameInput = document.getElementById("csv_name");
      let csvName = csvNameInput ? csvNameInput.value.trim() : "";
      if (!csvName) {
        csvName = firstBldgId || firstUid || "windows";
      }
      csvName = csvName.replace(/[\\/:*?"<>|]+/g, "_");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csvName + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      
      // var downloadLink = document.getElementById('downloadLink');
      // downloadLink.href = url;
      // console.log(url);



      // clear table
      tableClear();
      count = 1;

      annotations.removeAll();
      for (var p = 0; p < pointEntities.length; p++) {
        viewer.entities.remove(pointEntities[p]);
      }
      pointEntities = [];

    });


    const btn_datadelete = document.getElementById('dataDelete');

    btn_datadelete.addEventListener('click',function(){


      if (rowsData.length > 0){
        rowsData.pop();
        count = rowsData.length + 1;
        renderPointTable();
        if (annotations.length > 0) {
          annotations.remove(annotations.get(annotations.length - 1));
        }
        if (pointEntities.length > 0) {
          var target = pointEntities.pop();
          viewer.entities.remove(target);
        }
      }

    });

    function tableClear(){
      rowsData = [];
      renderPointTable();
    }

    var fieldConfigBody = document.getElementById("field_config_body");
    if (fieldConfigBody) {
      fieldConfigBody.addEventListener("input", function (evt) {
        var target = evt.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        var idx = parseInt(target.getAttribute("data-index"), 10);
        if (!Number.isFinite(idx) || !pointFieldConfigs[idx]) {
          return;
        }
        var type = target.getAttribute("data-type");
        if (type === "default") {
          pointFieldConfigs[idx].defaultValue = target.value;
          return;
        }
        if (type === "name") {
          var oldName = pointFieldConfigs[idx].name;
          var newName = sanitizeFieldName(target.value);
          if (!newName) {
            return;
          }
          if (fixedCoordFields.indexOf(newName.toLowerCase()) >= 0 || newName.toLowerCase() === "ann_id") {
            alert("Field name is reserved.");
            target.value = oldName;
            return;
          }
          if (hasField(newName, idx)) {
            alert("Field name already exists.");
            target.value = oldName;
            return;
          }
          pointFieldConfigs[idx].name = newName;
          syncFieldRename(oldName, newName);
          renderFieldConfigTable();
          renderPointTable();
        }
      });

      fieldConfigBody.addEventListener("click", function (evt) {
        var target = evt.target;
        if (!(target instanceof HTMLButtonElement)) {
          return;
        }
        if (target.getAttribute("data-type") !== "remove") {
          return;
        }
        var idx = parseInt(target.getAttribute("data-index"), 10);
        if (!Number.isFinite(idx) || !pointFieldConfigs[idx]) {
          return;
        }
        removeFieldAt(idx);
      });
    }

    var pointTableBody = document.getElementById("poiInfoBody");
    if (pointTableBody) {
      pointTableBody.addEventListener("input", function (evt) {
        var target = evt.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        var rowIndex = parseInt(target.getAttribute("data-row-index"), 10);
        var field = target.getAttribute("data-field");
        if (!Number.isFinite(rowIndex) || !rowsData[rowIndex] || !field) {
          return;
        }
        rowsData[rowIndex].fields[field] = target.value;
      });
    }

    var addFieldBtn = document.getElementById("add_field_btn");
    if (addFieldBtn) {
      addFieldBtn.addEventListener("click", function () {
        var nameInput = document.getElementById("new_field_name");
        var defaultInput = document.getElementById("new_field_default");
        var name = nameInput ? nameInput.value : "";
        var defaultValue = defaultInput ? defaultInput.value : "";
        addFieldConfig(name, defaultValue);
        if (nameInput) {
          nameInput.value = "";
        }
        if (defaultInput) {
          defaultInput.value = "";
        }
      });
    }

    renderFieldConfigTable();
    renderPointTable();


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
    var ellipsoid = scene.globe ? scene.globe.ellipsoid : Cesium.Ellipsoid.WGS84;

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


    const HONG_KONG_START = {
      lon: 114.17544987949462,
      lat: 22.280048773761184,
      height: 1600.0,
      headingDeg: 15.0,
      pitchDeg: -35.0,
      rollDeg: 0.0,
    };

    const lonInput = document.getElementById('lon');
    const latInput = document.getElementById('lat');
    const heightInput = document.getElementById('fly_height');
    if (lonInput && !lonInput.value) {
      lonInput.value = HONG_KONG_START.lon.toFixed(6);
    }
    if (latInput && !latInput.value) {
      latInput.value = HONG_KONG_START.lat.toFixed(6);
    }
    if (heightInput && !heightInput.value) {
      heightInput.value = "300";
    }
    
    const btn_flyto = document.getElementById('flyto');
    const btn_jump_to_coord = document.getElementById('jumpToCoord');

    function flyToInputCoordinate() {
      var lon = parseFloat(lonInput ? lonInput.value : "");
      var lat = parseFloat(latInput ? latInput.value : "");
      var height = parseFloat(heightInput ? heightInput.value : "");

      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        alert("Please input valid longitude and latitude.");
        return;
      }
      if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
        alert("Longitude/Latitude out of range.");
        return;
      }
      if (!Number.isFinite(height)) {
        height = 300;
      }

      viewer.scene.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        orientation: {
          heading: viewer.camera.heading,
          pitch: Cesium.Math.toRadians(-35),
          roll: 0.0,
        },
        duration: 1.2,
      });
    }

    if (btn_flyto) {
      btn_flyto.addEventListener('click', flyToInputCoordinate);
    }
    if (btn_jump_to_coord) {
      btn_jump_to_coord.addEventListener('click', flyToInputCoordinate);
    }
    if (lonInput) {
      lonInput.addEventListener('keydown', function (evt) {
        if (evt.key === "Enter") {
          flyToInputCoordinate();
        }
      });
    }
    if (latInput) {
      latInput.addEventListener('keydown', function (evt) {
        if (evt.key === "Enter") {
          flyToInputCoordinate();
        }
      });
    }
    if (heightInput) {
      heightInput.addEventListener('keydown', function (evt) {
        if (evt.key === "Enter") {
          flyToInputCoordinate();
        }
      });
    }

    // load Google photorealistic 3D tiles
  try {
    const myCesiumTileset_1 = await Cesium.createGooglePhotorealistic3DTileset();
    myCesiumTileset_1.shadows = Cesium.ShadowMode.DISABLED;
    viewer.scene.primitives.add(myCesiumTileset_1);
    if (myCesiumTileset_1.readyPromise) {
      await myCesiumTileset_1.readyPromise;
    }
    // Start in Hong Kong rather than Sandcastle's default Mountain View location.
    viewer.scene.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        HONG_KONG_START.lon,
        HONG_KONG_START.lat,
        HONG_KONG_START.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(HONG_KONG_START.headingDeg),
        pitch: Cesium.Math.toRadians(HONG_KONG_START.pitchDeg),
        roll: Cesium.Math.toRadians(HONG_KONG_START.rollDeg),
      },
    });

    myCesiumTileset_1.tileLoad.addEventListener(() => {
      is_loading = 1
      // console.log('is_loading:' + is_loading);
    })
  
    myCesiumTileset_1.allTilesLoaded.addEventListener(function () {
      console.log('tiles are loaded.');
      is_loading = 0
    });
  



} catch (error) {
    console.error(`Error creating Google photorealistic tileset: ${error}`);
  }




