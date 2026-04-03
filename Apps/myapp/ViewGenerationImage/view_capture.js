
// Your access token can be found at: https://ion.cesium.com/tokens.
// Replace `your_access_token` with your Cesium ion access token.

// import $ from './jQuery/jquery-3.5.1.min.js';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNGVmYjNhMC00MmYxLTQwM2MtOGI4Ny00ZWI5Njg0NzkxMGUiLCJpZCI6MjMwNTIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODI2NDMxMjF9.25AEbjYl70Epztny5fpcVev7kHi0YaYGXORMsMKprSs';

const viewerOptions = {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  globe: false,
  // terrain: Cesium.Terrain.fromWorldTerrain(),
  contextOptions: {
    webgl: {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: true,
      premultipliedAlpha: true,
      //???canvas.toDataURL()???????????????????rue
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false
    }
  }
};


// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
export const viewer = new Cesium.Viewer('cesiumContainer', viewerOptions);

viewer.scene.skyAtmosphere.show = true;
// Keep default Sandcastle-like rendering baseline
if (viewer.scene.globe) {
  viewer.scene.globe.show = false;
}
viewer.scene.gamma = 1.0;

const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const captureBrightnessSlider = document.getElementById('captureBrightness');
const captureBrightnessValue = document.getElementById('captureBrightnessValue');
let captureBrightnessFactor = 1.0;
if (brightnessSlider) {
  brightnessSlider.addEventListener('input', function () {
    const val = parseFloat(brightnessSlider.value);
    if (Number.isFinite(val)) {
      viewer.scene.gamma = val;
      if (brightnessValue) {
        brightnessValue.textContent = val.toFixed(2);
      }
    }
  });
  if (brightnessValue) {
    brightnessValue.textContent = parseFloat(brightnessSlider.value).toFixed(2);
  }
}
if (captureBrightnessSlider) {
  captureBrightnessFactor = parseFloat(captureBrightnessSlider.value) || 1.0;
  if (captureBrightnessValue) {
    captureBrightnessValue.textContent = captureBrightnessFactor.toFixed(2);
  }
  captureBrightnessSlider.addEventListener('input', function () {
    const val = parseFloat(captureBrightnessSlider.value);
    if (Number.isFinite(val)) {
      captureBrightnessFactor = val;
      if (captureBrightnessValue) {
        captureBrightnessValue.textContent = val.toFixed(2);
      }
    }
  });
}

// viewer.camera.frustum.fov = 1.74533;

let camera_style = "square_view";

if (camera_style == "4_3_view") {

  document.getElementById("cesiumContainer").style.width = "1200px";
  document.getElementById("cesiumContainer").style.height = "900px";
  viewer.camera.frustum.fov = 1.16937;

} else if (camera_style == "square_view") {

  document.getElementById("cesiumContainer").style.width = "900px";
  document.getElementById("cesiumContainer").style.height = "900px";
  // viewer.camera.frustum.fov = 1.05786209;

}

let is_loading = 1;

let tilesetCenter = null;
let tilesetReady = false;
const HONG_KONG_START = {
  lon: 114.17544987949462,
  lat: 22.280048773761184,
  height: 1600.0,
  headingDeg: 15.0,
  pitchDeg: -35.0,
  rollDeg: 0.0,
};

try {
  const tileset = await Cesium.createGooglePhotorealistic3DTileset();
  viewer.scene.primitives.add(tileset);
  if (tileset.readyPromise) {
    await tileset.readyPromise;
  }
  tilesetCenter = Cesium.Cartesian3.clone(tileset.boundingSphere.center);
  tilesetReady = true;
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

  tileset.tileLoad.addEventListener(() => {
    is_loading = 1;
    // console.log(is_loading);
  });

  tileset.allTilesLoaded.addEventListener(function () {
    is_loading = 0;
    // console.log(is_loading);
  });
} catch (error) {
  console.log(`Failed to load Google photorealistic tileset: ${error}`);
}








//Function 1: load the dataSet
function loadCesiumViewer(x, y, z, heading, pitch, roll, viewer) {
  if (Math.abs(x) > 180) {
    viewer.camera.setView({
      destination: new Cesium.Cartesian3(x, y, z),
      orientation: {
        // 指向
        heading: heading,
        // 视角
        pitch: pitch,
        //-0.41921073975554046 -Cesium.Math.PI_OVER_TWO,
        roll: roll
      }
    });

  } else {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(x, y, z),
      orientation: {
        // 指向
        heading: heading,
        // 视角 1)-0.4591769606491214 bird view
        pitch: pitch,
        //-0.41921073975554046 -Cesium.Math.PI_OVER_TWO,
        roll: roll
      }
    });

  }

}

// Keep this off to keep Sandcastle initialization camera.
const USE_FIXED_START_VIEW = false;
if (USE_FIXED_START_VIEW) {
  // Hong Kong
  loadCesiumViewer(
    114.15673966410587,
    22.28062817058714,
    118.39999389648438,
    Cesium.Math.toRadians(48.299446189606115),
    0.0,
    0.0,
    viewer
  );
}

// Singapore
// loadCesiumViewer(-1526565.2001381784, 6191958.521633281, 140352.63942780223, 6.192215813838814, 0.00, 0.00, viewer);

// Newyork
// loadCesiumViewer(1334338.3007898722, -4657043.869870718, 4137187.363140642, 0.29619778327732327, 0.00, 0.00, viewer);


const btn_is_full_view = document.getElementById('is_full_view');

btn_is_full_view.addEventListener('click', function () {

  let cesium_container_width = document.getElementById("cesiumContainer").style.width;
  console.log(cesium_container_width);
  if (cesium_container_width == "900px") {
    console.log("Viewer size switched to full screen")
    document.getElementById("cesiumContainer").style.width = "100%";
    document.getElementById("cesiumContainer").style.width = "100%";


  } else {
    document.getElementById("cesiumContainer").style.width = "900px";
    document.getElementById("cesiumContainer").style.width = "900px";
  }


});



var lastPointLng = 0;
var lastPointLat = 0;
var lastPointHeight = 0;


// Function 2: get window view

const btn_get_window_view = document.getElementById('get_window_view');

btn_get_window_view.addEventListener('click', function () {

    if (lastPointLng != 0 || lastPointLat != 0 || lastPointHeight != 0) {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(lastPointLng, lastPointLat, lastPointHeight),
        orientation: {
          heading: viewer.camera.heading + 3.1415926,
          pitch: viewer.camera.pitch,
          roll: viewer.camera.roll
        }
      });
    }
    // <!-- viewer.camera.zoomIn(100); -->

});


var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(function (evt) {
      var scene = viewer.scene;
      // var pickedObject = scene.pick(evt.position); //know whether the model is clicked Cesium.defined(pickedObject)

      if (scene.pickPositionSupported) {

        //get cartesian coordinates of the target point
        var cartesian = scene.pickPosition(evt.position);
        // console.log(evt.position);

        if (Cesium.defined(cartesian)) {

          var cartographic = Cesium.Cartographic.fromCartesian(cartesian); //Cartesian to radian
          lastPointLng = Cesium.Math.toDegrees(cartographic.longitude); //radian.lon to degree
          lastPointLat = Cesium.Math.toDegrees(cartographic.latitude); //radian.lat to degree
          lastPointHeight = cartographic.height;//height of the point

          console.log("lon:"+lastPointLng);
          console.log("lat:"+lastPointLat);
          console.log("height:"+lastPointHeight);

          annotate(cartesian, lastPointLng, lastPointLat, lastPointHeight);

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

      // Show the geo info
      /* annotations.add({
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
      */
    }




/*********************************************************************************************************************/

/*
view capture
2022.7.7 
*/


const btn_getViewCapture = document.getElementById('getViewCapture');

btn_getViewCapture.addEventListener('click', function () {

  let canvas = viewer.scene.canvas;

  Canvas2Image.saveAsPNG(canvas, canvas.width, canvas.height);

});


const btn_clear_cookies = document.getElementById('clearCookies');

btn_clear_cookies.addEventListener('click', function () {

  document.cookie = "start_id=-1";
document.cookie = "current_id=-1";
document.cookie = "end_id=-1";

});

let csvMode = false;
let csvViews = [];
let zipEnabled = false;
let zip = null;
let zipTasks = [];
let zipName = "";
let totalViews = 0;
let processedViews = 0;
let zipFinalized = false;
let batchDone = false;
let csvRows = [];
let csvCartesianPoints = [];
let csvHeaders = [];
let csvStartIndex = 0;
let faceNormals = new Map();
let faceNormalsReady = false;
let view_info_split = "";
let currentCaptureName = "";
const defaultFilenameFields = ["uid", "bldgid", "officeid", "windowid", "lon", "lat", "elevation", "heading"];
let filenameFieldOrder = defaultFilenameFields.slice();

/*
batch capture controls
*/
var batch_no = 5;
var view_id = 1;
var max_view_no = 20000;

if ($.cookie('start_id') == undefined || parseInt($.cookie('start_id')) == -1) {
  view_id = 1;
  max_view_no = 20000;
} else {
  view_id = parseInt($.cookie('start_id'));
  max_view_no = parseInt($.cookie('end_id'));
  setTimeout(function () {
    batch_view_computing(view_id, batch_no);
  }, 0);
}

const btn_batch_computing = document.getElementById('batchCapture');
if (btn_batch_computing) {
  btn_batch_computing.addEventListener('click', function () {
    writeFilenameFieldsInput(parseFilenameFieldsInput());
    const startInput = document.getElementById('start_id');
    const endInput = document.getElementById('end_id');

    let startVal = startInput ? startInput.value.trim() : "";
    let endVal = endInput ? endInput.value.trim() : "";

    if (csvMode) {
      if (csvViews.length === 0) {
        alert('CSV mode enabled but no CSV loaded.');
        return;
      }
      if (!startVal) {
        startVal = "1";
      }
      if (!endVal) {
        endVal = String(Math.floor(csvViews.length / 7));
      }
      if (startInput) {
        startInput.value = startVal;
      }
      if (endInput) {
        endInput.value = endVal;
      }
    }

    document.cookie = "start_id=" + startVal;
    document.cookie = "current_id=" + startVal;
    document.cookie = "end_id=" + endVal;

    view_id = parseInt(startVal);
    max_view_no = parseInt(endVal);

    startZipSession();

    if (!Number.isFinite(view_id) || !Number.isFinite(max_view_no) || view_id <= 0 || max_view_no < view_id) {
      alert('Please provide valid Start ID and End ID.');
      return;
    }

    const maxFromCsv = csvMode ? Math.min(max_view_no, csvViews.length / 7) : max_view_no;
    totalViews = Math.max(0, Math.floor(maxFromCsv - view_id + 1));
    processedViews = 0;
    batchDone = false;
    updateProgress();
    setProgressStatus('Running...');

    batch_view_computing(view_id, batch_no);
  });
}

const csvFileInput = document.getElementById('csv_file');
const csvLocalList = document.getElementById('csv_local_list');
const csvLocalInfo = document.getElementById('csv_local_info');
const zipCheckbox = document.getElementById('zip_mode');
const btn_download_zip = document.getElementById('downloadZip');
const progressBar = document.getElementById('captureProgress');
const progressStatus = document.getElementById('captureStatus');
const flipNormalInput = document.getElementById('flipNormal');
const filenameFieldsInput = document.getElementById('filename_fields');
const filenameFieldSelect = document.getElementById('filename_field_select');
const btn_add_filename_field = document.getElementById('addFilenameField');
const btn_reset_filename_fields = document.getElementById('resetFilenameFields');
const btn_clear_filename_fields = document.getElementById('clearFilenameFields');

function normalizeFieldToken(value) {
  return String(value || "").trim();
}

function buildAvailableFilenameFields(headers) {
  const ordered = [];
  const seen = new Set();
  function pushField(name) {
    const key = normalizeFieldToken(name);
    if (!key) {
      return;
    }
    const lower = key.toLowerCase();
    if (seen.has(lower)) {
      return;
    }
    seen.add(lower);
    ordered.push(key);
  }

  defaultFilenameFields.forEach(pushField);
  ["ann_id", "height", "face_id"].forEach(pushField);
  (headers || []).forEach(pushField);
  pushField("heading");
  return ordered;
}

function parseFilenameFieldsInput() {
  if (!filenameFieldsInput) {
    return filenameFieldOrder.slice();
  }
  return filenameFieldsInput.value
    .split(",")
    .map((item) => normalizeFieldToken(item))
    .filter((item) => item.length > 0);
}

function writeFilenameFieldsInput(fields) {
  filenameFieldOrder = fields.slice();
  if (filenameFieldsInput) {
    filenameFieldsInput.value = filenameFieldOrder.join(",");
  }
}

function getDefaultFilenameOrder(headers) {
  const available = buildAvailableFilenameFields(headers);
  const lowerAvailable = new Set(available.map((f) => f.toLowerCase()));
  const order = [];
  for (let i = 0; i < defaultFilenameFields.length; i++) {
    const field = defaultFilenameFields[i];
    if (lowerAvailable.has(field.toLowerCase())) {
      order.push(field);
    }
  }
  if (order.length === 0) {
    return available.slice(0, 8);
  }
  return order;
}

function refreshFilenameFieldSelect(headers) {
  if (!filenameFieldSelect) {
    return;
  }
  filenameFieldSelect.innerHTML = "";
  const available = buildAvailableFilenameFields(headers);
  for (let i = 0; i < available.length; i++) {
    const opt = document.createElement("option");
    opt.value = available[i];
    opt.textContent = available[i];
    filenameFieldSelect.appendChild(opt);
  }
}

writeFilenameFieldsInput(defaultFilenameFields);
refreshFilenameFieldSelect(csvHeaders);

if (filenameFieldsInput) {
  filenameFieldsInput.addEventListener("change", function () {
    const fields = parseFilenameFieldsInput();
    const unique = [];
    const seen = new Set();
    for (let i = 0; i < fields.length; i++) {
      const lower = fields[i].toLowerCase();
      if (seen.has(lower)) {
        continue;
      }
      seen.add(lower);
      unique.push(fields[i]);
    }
    writeFilenameFieldsInput(unique);
  });
}

if (btn_add_filename_field) {
  btn_add_filename_field.addEventListener("click", function () {
    if (!filenameFieldSelect) {
      return;
    }
    const selected = normalizeFieldToken(filenameFieldSelect.value);
    if (!selected) {
      return;
    }
    const current = parseFilenameFieldsInput();
    const exists = current.some((f) => f.toLowerCase() === selected.toLowerCase());
    if (!exists) {
      current.push(selected);
      writeFilenameFieldsInput(current);
    }
  });
}

if (btn_reset_filename_fields) {
  btn_reset_filename_fields.addEventListener("click", function () {
    writeFilenameFieldsInput(getDefaultFilenameOrder(csvHeaders));
  });
}

if (btn_clear_filename_fields) {
  btn_clear_filename_fields.addEventListener("click", function () {
    writeFilenameFieldsInput([]);
  });
}

const btn_load_csv = document.getElementById('loadCsv');
let localCsvFiles = [];

function updateLocalCsvList() {
  if (!csvFileInput || !csvLocalList) {
    return;
  }
  const files = csvFileInput.files ? Array.from(csvFileInput.files) : [];
  localCsvFiles = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
  localCsvFiles.sort((a, b) => a.name.localeCompare(b.name));

  csvLocalList.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select CSV...";
  csvLocalList.appendChild(placeholder);

  for (let i = 0; i < localCsvFiles.length; i++) {
    const file = localCsvFiles[i];
    const opt = document.createElement("option");
    opt.value = String(i);
    const displayName = file.webkitRelativePath || file.name;
    opt.textContent = displayName;
    csvLocalList.appendChild(opt);
  }

  if (csvLocalInfo) {
    csvLocalInfo.textContent = localCsvFiles.length > 0 ? `${localCsvFiles.length} file(s)` : "";
  }
}

if (csvFileInput) {
  csvFileInput.addEventListener("change", updateLocalCsvList);
}

if (btn_load_csv) {
  btn_load_csv.addEventListener('click', async function () {
    if (!localCsvFiles || localCsvFiles.length === 0) {
      updateLocalCsvList();
    }
    if (!localCsvFiles || localCsvFiles.length === 0) {
      alert("Please select a CSV file or a folder containing CSV files.");
      return;
    }

    let file = localCsvFiles[0];
    if (csvLocalList && csvLocalList.value !== "") {
      const idx = Number.parseInt(csvLocalList.value, 10);
      if (Number.isFinite(idx) && localCsvFiles[idx]) {
        file = localCsvFiles[idx];
      }
    }

    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const text = String(reader.result || "");
        const parsed = parseCsvToViews(text);
        csvViews = parsed.views;
        csvRows = parsed.rows;
        csvCartesianPoints = parsed.cartesianPoints;
        csvHeaders = parsed.headers;
        csvMode = true;
        faceNormalsReady = false;
        faceNormals = new Map();
        refreshFilenameFieldSelect(csvHeaders);
        writeFilenameFieldsInput(getDefaultFilenameOrder(csvHeaders));
        await prepareCsvPlanes(parsed.rows, parsed.cartesianPoints);
        alert(`CSV loaded: ${csvViews.length / 7} views`);
      } catch (err) {
        console.error(err);
        alert(`Failed to load CSV: ${err.message}`);
      }
    };
    reader.onerror = function () {
      alert("Failed to read CSV file.");
    };
    reader.readAsText(file);
  });
}

function startZipSession() {
  zipEnabled = !!(zipCheckbox && zipCheckbox.checked);
  zipFinalized = false;
  if (!zipEnabled) {
    zip = null;
    zipTasks = [];
    return;
  }
  if (typeof JSZip === "undefined") {
    alert("JSZip is not loaded. Please check network/CDN access.");
    zipEnabled = false;
    return;
  }
  zip = new JSZip();
  zipTasks = [];
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  zipName = `captures_${ts}.zip`;
}

function queueZipCapture(pngName) {
  if (!zipEnabled || !zip) {
    return;
  }
  const safeName = String(pngName || "capture")
    .replace(/[\\/:*?"<>|]+/g, "_");
  const fileName = safeName.toLowerCase().endsWith(".png") ? safeName : `${safeName}.png`;
  const canvas = getCaptureCanvas();
  zipTasks.push(new Promise((resolve) => {
    canvas.toBlob(function (blob) {
      zip.file(fileName, blob);
      resolve();
    }, "image/png");
  }));
}

async function finalizeZip() {
  if (!zipEnabled || !zip) {
    return;
  }
  try {
    await Promise.all(zipTasks);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName || "captures.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(`Failed to generate zip: ${err.message}`);
  } finally {
    zip = null;
    zipTasks = [];
  }
}

if (btn_download_zip) {
  btn_download_zip.addEventListener("click", finalizeZip);
}

if (flipNormalInput) {
  flipNormalInput.addEventListener("change", async function () {
    if (csvRows.length >= 3 && csvCartesianPoints.length === csvRows.length) {
      await prepareCsvPlanes(csvRows, csvCartesianPoints);
    }
  });
}

function setProgressStatus(text) {
  if (progressStatus) {
    progressStatus.textContent = text;
  }
}

function updateProgress() {
  if (!progressBar) {
    return;
  }
  const max = totalViews > 0 ? totalViews : 1;
  const value = Math.min(processedViews, max);
  progressBar.max = max;
  progressBar.value = value;
  setProgressStatus(`Progress: ${value}/${max}`);
}

function maybeFinalizeZip() {
  if (!zipEnabled || zipFinalized) {
    return;
  }
  if (totalViews > 0 && processedViews >= totalViews) {
    zipFinalized = true;
    setProgressStatus('Zipping...');
    finalizeZip().then(function () {
      setProgressStatus('Done');
    });
  }
}

function computeCentroid(points) {
  let x = 0;
  let y = 0;
  let z = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    x += points[i].x;
    y += points[i].y;
    z += points[i].z;
  }
  return new Cesium.Cartesian3(x / n, y / n, z / n);
}

function jacobiEigenSymmetric3(m) {
  const a = [
    [m[0][0], m[0][1], m[0][2]],
    [m[1][0], m[1][1], m[1][2]],
    [m[2][0], m[2][1], m[2][2]]
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  for (let iter = 0; iter < 50; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[0][1]);
    const a02 = Math.abs(a[0][2]);
    const a12 = Math.abs(a[1][2]);
    if (a02 > max) {
      max = a02;
      p = 0;
      q = 2;
    }
    if (a12 > max) {
      max = a12;
      p = 1;
      q = 2;
    }
    if (max < 1e-12) {
      break;
    }

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let k = 0; k < 3; k++) {
      if (k !== p && k !== q) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = a[p][k] = c * akp - s * akq;
        a[k][q] = a[q][k] = s * akp + c * akq;
      }
    }

    const appNew = c * c * app - 2 * s * c * apq + s * s * aqq;
    const aqqNew = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][p] = appNew;
    a[q][q] = aqqNew;
    a[p][q] = a[q][p] = 0;

    for (let k = 0; k < 3; k++) {
      const vkp = v[k][p];
      const vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq;
      v[k][q] = s * vkp + c * vkq;
    }
  }

  return {
    values: [a[0][0], a[1][1], a[2][2]],
    vectors: v
  };
}

function computePlaneNormal(points) {
  if (!points || points.length < 3) {
    return null;
  }

  const center = computeCentroid(points);
  let cxx = 0;
  let cxy = 0;
  let cxz = 0;
  let cyy = 0;
  let cyz = 0;
  let czz = 0;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - center.x;
    const dy = points[i].y - center.y;
    const dz = points[i].z - center.z;
    cxx += dx * dx;
    cxy += dx * dy;
    cxz += dx * dz;
    cyy += dy * dy;
    cyz += dy * dz;
    czz += dz * dz;
  }

  const m = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz]
  ];
  const eig = jacobiEigenSymmetric3(m);
  let minIndex = 0;
  if (eig.values[1] < eig.values[minIndex]) {
    minIndex = 1;
  }
  if (eig.values[2] < eig.values[minIndex]) {
    minIndex = 2;
  }
  const normal = new Cesium.Cartesian3(
    eig.vectors[0][minIndex],
    eig.vectors[1][minIndex],
    eig.vectors[2][minIndex]
  );
  if (Cesium.Cartesian3.magnitudeSquared(normal) === 0) {
    return null;
  }
  Cesium.Cartesian3.normalize(normal, normal);
  return normal;
}

function rayDistance(origin, direction) {
  const dir = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3());
  const offset = Cesium.Cartesian3.multiplyByScalar(dir, 0.5, new Cesium.Cartesian3());
  const start = Cesium.Cartesian3.add(origin, offset, new Cesium.Cartesian3());
  const ray = new Cesium.Ray(start, dir);
  viewer.render();
  const hit = viewer.scene.pickFromRay(ray);
  if (hit && hit.position) {
    return Cesium.Cartesian3.distance(start, hit.position);
  }
  return Number.POSITIVE_INFINITY;
}

async function waitForTilesetReady() {
  let tries = 0;
  while (!tilesetReady && tries < 200) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    tries += 1;
  }
}

async function autoFlipPlaneNormal(points, normal) {
  if (!normal) {
    return null;
  }
  await waitForTilesetReady();
  const center = computeCentroid(points);
  const outDist = rayDistance(center, normal);
  const inDist = rayDistance(
    center,
    Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3())
  );
  if (Number.isFinite(outDist) && Number.isFinite(inDist)) {
    if (outDist < inDist) {
      return Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3());
    }
  } else if (Number.isFinite(outDist) && outDist < 5) {
    return Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3());
  }
  return normal;
}

async function prepareCsvPlanes(rows, cartesianPoints) {
  faceNormals = new Map();
  faceNormalsReady = false;
  if (!rows || !cartesianPoints || rows.length < 3 || cartesianPoints.length !== rows.length) {
    return;
  }

  const faceGroups = new Map();
  for (let i = 0; i < rows.length; i++) {
    const faceId = String(rows[i].face_id || "").trim();
    if (!faceId) {
      continue;
    }
    if (!faceGroups.has(faceId)) {
      faceGroups.set(faceId, []);
    }
    faceGroups.get(faceId).push(cartesianPoints[i]);
  }

  const applyFlip = flipNormalInput && flipNormalInput.checked;

  if (faceGroups.size === 0) {
    const fallbackNormal = computePlaneNormal(cartesianPoints);
    if (fallbackNormal) {
      let finalNormal = await autoFlipPlaneNormal(cartesianPoints, fallbackNormal);
      if (applyFlip) {
        finalNormal = Cesium.Cartesian3.negate(finalNormal, new Cesium.Cartesian3());
      }
      faceNormals.set("__all__", finalNormal);
    }
    faceNormalsReady = faceNormals.size > 0;
    return;
  }

  for (const [faceId, points] of faceGroups.entries()) {
    if (points.length < 3) {
      continue;
    }
    const normal = computePlaneNormal(points);
    if (!normal) {
      continue;
    }
    let finalNormal = await autoFlipPlaneNormal(points, normal);
    if (applyFlip) {
      finalNormal = Cesium.Cartesian3.negate(finalNormal, new Cesium.Cartesian3());
    }
    faceNormals.set(faceId, finalNormal);
  }

  faceNormalsReady = faceNormals.size > 0;
}

function computePlaneHeadingPitch(cartesian, normal) {
  if (!normal) {
    return null;
  }
  const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
  const inv = Cesium.Matrix4.inverse(enuTransform, new Cesium.Matrix4());
  const local = Cesium.Matrix4.multiplyByPointAsVector(
    inv,
    normal,
    new Cesium.Cartesian3()
  );
  local.z = 0;
  if (Cesium.Cartesian3.magnitudeSquared(local) === 0) {
    return null;
  }
  Cesium.Cartesian3.normalize(local, local);
  return {
    heading: Math.atan2(local.x, local.y),
    pitch: Cesium.Math.toRadians(-5)
  };
}

function computeOutwardHeadingPitch(cartesian) {
  if (!tilesetCenter) {
    return {
      heading: 0,
      pitch: 0
    };
  }

  const outward = Cesium.Cartesian3.subtract(
    cartesian,
    tilesetCenter,
    new Cesium.Cartesian3()
  );
  if (Cesium.Cartesian3.magnitudeSquared(outward) === 0) {
    return {
      heading: 0,
      pitch: 0
    };
  }
  Cesium.Cartesian3.normalize(outward, outward);

  const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
  const inv = Cesium.Matrix4.inverse(enuTransform, new Cesium.Matrix4());
  const local = Cesium.Matrix4.multiplyByPointAsVector(
    inv,
    outward,
    new Cesium.Cartesian3()
  );

  // Use horizontal projection for "window outward" view
  local.z = 0;
  if (Cesium.Cartesian3.magnitudeSquared(local) === 0) {
    return {
      heading: 0,
      pitch: Cesium.Math.toRadians(-5)
    };
  }
  Cesium.Cartesian3.normalize(local, local);

  // ENU: x = east, y = north
  const heading = Math.atan2(local.x, local.y);
  const pitch = Cesium.Math.toRadians(-5);

  return {
    heading,
    pitch
  };
}

function parseCsvToViews(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    return { views: [], cartesianPoints: [], rows: [], headers: [] };
  }

  const rawHeader = lines[0].split(',').map((h) => String(h || "").trim());
  const headers = [];
  const headerIndexByName = new Map();
  for (let i = 0; i < rawHeader.length; i++) {
    const key = rawHeader[i];
    if (!key) {
      continue;
    }
    const lower = key.toLowerCase();
    if (headerIndexByName.has(lower)) {
      continue;
    }
    headerIndexByName.set(lower, i);
    headers.push(key);
  }

  function findHeaderIndex(candidates) {
    for (let i = 0; i < candidates.length; i++) {
      const idx = headerIndexByName.get(String(candidates[i]).toLowerCase());
      if (typeof idx === "number") {
        return idx;
      }
    }
    return -1;
  }

  const annIdx = findHeaderIndex(["ann_id"]);
  const uidIdx = findHeaderIndex(["uid"]);
  const bldgIdx = findHeaderIndex(["bldgid", "building_id", "buildingid"]);
  const officeIdx = findHeaderIndex(["officeid", "office_id", "flatid", "flat_id", "roomid", "room_id"]);
  const windowIdx = findHeaderIndex(["windowid", "window_id"]);
  const faceIdx = findHeaderIndex(["face_id", "faceid"]);
  const elevationIdx = findHeaderIndex(["elevation"]);
  const lonIdx = findHeaderIndex(["lon", "lng", "longitude", "x"]);
  const latIdx = findHeaderIndex(["lat", "latitude", "y"]);
  const heightIdx = findHeaderIndex(["height", "z"]);

  const rows = [];
  let cartesianMode = false;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const rowFields = {};
    for (let h = 0; h < headers.length; h++) {
      const headerName = headers[h];
      const originalIndex = headerIndexByName.get(headerName.toLowerCase());
      rowFields[headerName] = originalIndex >= 0 ? String(cols[originalIndex] ?? "").trim() : "";
    }

    const lonVal = lonIdx >= 0 ? cols[lonIdx] : undefined;
    const latVal = latIdx >= 0 ? cols[latIdx] : undefined;
    const heightVal = heightIdx >= 0 ? cols[heightIdx] : undefined;

    const lon = parseFloat(lonVal);
    const lat = parseFloat(latVal);
    const height = parseFloat(heightVal);

    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(height)) {
      continue;
    }

    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      cartesianMode = true;
    }

    rows.push({
      ann_id: annIdx >= 0 ? String(cols[annIdx] ?? "").trim() : String(i),
      uid: uidIdx >= 0 ? String(cols[uidIdx] ?? "").trim() : "",
      bldgid: bldgIdx >= 0 ? String(cols[bldgIdx] ?? "").trim() : "",
      officeid: officeIdx >= 0 ? String(cols[officeIdx] ?? "").trim() : "",
      windowid: windowIdx >= 0 ? String(cols[windowIdx] ?? "").trim() : "",
      face_id: faceIdx >= 0 ? String(cols[faceIdx] ?? "").trim() : "",
      elevation: elevationIdx >= 0 ? String(cols[elevationIdx] ?? "").trim() : "",
      lon,
      lat,
      height,
      raw: rowFields
    });
  }

  const cartesianPoints = [];
  rows.forEach((r) => {
    const point = cartesianMode
      ? new Cesium.Cartesian3(r.lon, r.lat, r.height)
      : Cesium.Cartesian3.fromDegrees(r.lon, r.lat, r.height);
    cartesianPoints.push(point);
  });

  const views = [];
  rows.forEach((r) => {
    // 7 fields per view to match existing processing
    views.push(r.ann_id, r.lon, r.lat, r.height, 0, 0, 0);
  });

  return { views, cartesianPoints, rows, headers };
}

function sanitizeNamePart(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) {
    return fallback || "NA";
  }
  return text.replace(/[\\/:*?"<>|\s]+/g, "_");
}

function formatNumber(value, digits, fallback) {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) {
    return fallback || "NA";
  }
  return num.toFixed(digits);
}

function resolveFilenameFieldValue(row, fieldName, headingDeg) {
  const key = String(fieldName || "").trim();
  const lower = key.toLowerCase();
  if (lower === "heading") {
    return formatNumber(headingDeg, 6, "NA");
  }
  if (lower === "lon" || lower === "lng" || lower === "longitude" || lower === "x") {
    return formatNumber(row.lon, 6, "NA");
  }
  if (lower === "lat" || lower === "latitude" || lower === "y") {
    return formatNumber(row.lat, 6, "NA");
  }
  if (lower === "height" || lower === "z") {
    return formatNumber(row.height, 2, "NA");
  }
  if (lower === "elevation") {
    const elevationValue = Number.isFinite(parseFloat(row.elevation))
      ? parseFloat(row.elevation)
      : row.height;
    return formatNumber(elevationValue, 2, "NA");
  }

  if (row.raw && Object.prototype.hasOwnProperty.call(row.raw, key)) {
    return sanitizeNamePart(row.raw[key], "NA");
  }

  // Support case-insensitive matching from CSV headers.
  if (row.raw) {
    const wanted = key.toLowerCase();
    const rawKeys = Object.keys(row.raw);
    for (let i = 0; i < rawKeys.length; i++) {
      if (rawKeys[i].toLowerCase() === wanted) {
        return sanitizeNamePart(row.raw[rawKeys[i]], "NA");
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return sanitizeNamePart(row[key], "NA");
  }
  return "NA";
}

function buildCsvCaptureName(row, headingDeg) {
  if (!row) {
    return "capture";
  }
  const order = filenameFieldOrder.length > 0 ? filenameFieldOrder : defaultFilenameFields;
  const parts = [];
  for (let i = 0; i < order.length; i++) {
    const token = normalizeFieldToken(order[i]);
    if (!token) {
      continue;
    }
    parts.push(sanitizeNamePart(resolveFilenameFieldValue(row, token, headingDeg), "NA"));
  }
  if (parts.length === 0) {
    return "capture";
  }
  return parts.join("_");
}


function batch_view_computing(view_id, batch_no) {

  if (csvMode) {
    const startIndex = Math.max(0, view_id - 1);
    const endIndex = Math.min(max_view_no, csvViews.length / 7);
    csvStartIndex = startIndex;
    view_info_split = csvViews.slice(startIndex * 7, endIndex * 7);
    let capture_type = 0;
    switch_processing(view_info_split, capture_type);
    return;
  }
  // PHP mode disabled; use CSV only
  setProgressStatus('CSV only mode. Please load CSV.');
  alert('CSV only mode is enabled. Please load CSV and retry.');
  return;

}


var clickPerSecond;

function switch_processing(view_info_split, capture_type) {
  var indicator = 0;
  var view_computed_id = 0;
  currentCaptureName = "";

  clickPerSecond = setInterval(function () {

    if (batchDone) {
      clearInterval(clickPerSecond);
      return;
    }

    if ($.cookie('start_id') == undefined || parseInt($.cookie('start_id')) == -1) {
      clearInterval(clickPerSecond);
    }


    if (indicator == 0) {

      if (view_computed_id + batch_no >= view_info_split.length) {


        view_id = view_id + batch_no;

        // write current id to cookies
        document.cookie = "current_id=" + view_id;

        if (view_id - parseInt($.cookie('start_id')) >= 3000 && view_id < max_view_no) {
          document.cookie = "start_id=" + view_id;
          location.reload();
        }

        if (view_id < max_view_no) {
          batch_view_computing(view_id, batch_no)
        }

        if (view_id >= max_view_no) {
          clearInterval(clickPerSecond);
          if (!zipEnabled) {
            setProgressStatus('Done');
          }
          return;
        }

        clearInterval(clickPerSecond);

      } else {
        let destination;
        if (Math.abs(view_info_split[view_computed_id + 1]) > 180) {
          destination = new Cesium.Cartesian3(
            parseFloat(view_info_split[view_computed_id + 1]),
            parseFloat(view_info_split[view_computed_id + 2]),
            parseFloat(view_info_split[view_computed_id + 3])
          );
        } else {
          destination = Cesium.Cartesian3.fromDegrees(
            view_info_split[view_computed_id + 1],
            view_info_split[view_computed_id + 2],
            view_info_split[view_computed_id + 3]
          );
        }

        let heading;
        let pitch;
        let rowIndex = -1;
        let row = null;
        let faceNormal = null;
        if (csvMode) {
          rowIndex = csvStartIndex + Math.floor(view_computed_id / 7);
          row = csvRows[rowIndex];
          if (row) {
            const faceKey = String(row.face_id || "").trim();
            if (faceKey && faceNormals.has(faceKey)) {
              faceNormal = faceNormals.get(faceKey);
            } else if (faceNormals.has("__all__")) {
              faceNormal = faceNormals.get("__all__");
            }
          }
        }

        if (csvMode && faceNormalsReady) {
          const hp = computePlaneHeadingPitch(destination, faceNormal);
          if (hp) {
            heading = hp.heading;
            pitch = hp.pitch;
          }
        }
        if (!Number.isFinite(heading) || !Number.isFinite(pitch)) {
          if (csvMode) {
            const hp = computeOutwardHeadingPitch(destination);
            heading = hp.heading;
            pitch = hp.pitch;
          } else if (Math.abs(view_info_split[view_computed_id + 1]) > 180) {
            heading = parseFloat(view_info_split[view_computed_id + 4]);
            pitch = 0;
          } else {
            heading = Cesium.Math.toRadians(view_info_split[view_computed_id + 4]);
            pitch = 0;
          }
        }

        viewer.camera.setView({
          destination: destination,
          orientation: {
            heading: heading,
            pitch: pitch,
            roll: 0
          }
        });

        if (csvMode) {
          const headingDeg = Cesium.Math.toDegrees(heading);
          currentCaptureName = buildCsvCaptureName(row, headingDeg);
        } else {
          currentCaptureName = view_info_split[view_computed_id];
        }

      }
      indicator = 1;

    } else {

      if (is_loading == 0) {
        if (capture_type == 2) {

          const view_name = currentCaptureName || view_info_split[view_computed_id];
          view_capture(view_name);

          let dist_array = distance_computing();

          view_computed_id = view_computed_id + 7;
          processedViews += 1;
          updateProgress();
          maybeFinalizeZip();
          if (!zipEnabled && totalViews > 0 && processedViews >= totalViews) {
            setProgressStatus('Done');
          }
          if (totalViews > 0 && processedViews >= totalViews) {
            batchDone = true;
          }


        } else if (capture_type == 1) {
          let dist_array = distance_computing_full_view();

          const view_name = currentCaptureName || view_info_split[view_computed_id];
          record_matrix(dist_array, view_name);

          view_computed_id = view_computed_id + 7;
          processedViews += 1;
          updateProgress();
          maybeFinalizeZip();
          if (!zipEnabled && totalViews > 0 && processedViews >= totalViews) {
            setProgressStatus('Done');
          }
          if (totalViews > 0 && processedViews >= totalViews) {
            batchDone = true;
          }

        } else {

          const view_name = currentCaptureName || view_info_split[view_computed_id];
          view_capture(view_name);

          view_computed_id = view_computed_id + 7;
          processedViews += 1;
          updateProgress();
          maybeFinalizeZip();
          if (!zipEnabled && totalViews > 0 && processedViews >= totalViews) {
            setProgressStatus('Done');
          }
          if (totalViews > 0 && processedViews >= totalViews) {
            batchDone = true;
          }

        }

        indicator = 0;

        if (totalViews > 0 && processedViews >= totalViews) {
          setProgressStatus('Done');
        }
      }
      if (is_loading != 0) {
        setProgressStatus('Loading tiles...');
      }
    }

  }, 1000);

}


function view_point_distance() {

  var start = Date.now();
  viewer.render();



  var intersection = viewer.scene.pickPosition(new Cesium.Cartesian2(0, 9000));

  var distance = Cesium.Cartesian3.distance(viewer.camera.position, intersection);


}

// 2023.2.6 full view distance.
function distance_computing_full_view() {

  var start = Date.now();
  let t1 = new Date().getTime();
  console.log(t1);

  viewer.render();
  var width = document.getElementById('cesiumContainer').scrollWidth;
  var height = document.getElementById('cesiumContainer').scrollHeight;


  var sample_interval = 9;

  var height_samples = (height / sample_interval)
  var width_samples = (width / sample_interval)

  var rows = new Array(height_samples);


  for (var y = 1; y < height_samples + 1; y = y + 1) {
    console.log(y)
    var row = new Array(width_samples).fill(-1);
    for (var x = 0; x < width_samples; x = x + 1) {

      var x_coord = x * sample_interval;
      var y_coord = y * sample_interval;

      var intersection = viewer.scene.pickPosition(new Cesium.Cartesian2(x_coord, y_coord));


      if (typeof intersection !== "undefined") {
        row[x] = Cesium.Cartesian3.distance(viewer.camera.position, intersection);
      }
    }
    rows[y] = row;
  }

  var myJsonString = JSON.stringify(rows);

  console.log(myJsonString);

  console.log(new Date().getTime() - t1);


  return rows
}


function distance_computing() {

  var start = Date.now();
  viewer.render();
  var width = document.getElementById('cesiumContainer').scrollWidth;
  var height = document.getElementById('cesiumContainer').scrollHeight;

  sample_interval = 9

  height_samples = (height / sample_interval)
  width_samples = (width / sample_interval)

  var rows = new Array(height_samples + 1);


  for (var y = 0; y <= height_samples; y = y + 1) {
    console.log(y)
    var row = new Array(width_samples + 1).fill(-1);
    for (var x = 0; x <= width_samples; x = x + 1) {

      var x_coord = x * sample_interval;
      var y_coord = y * sample_interval;

      if (y == 0) {
        y_coord = (y + 1) * sample_interval;
      }

      if (x == width_samples) {
        x_coord = (x - 1) * sample_interval;
      }

      var intersection = viewer.scene.pickPosition(new Cesium.Cartesian2(x_coord, y_coord));

      if (typeof intersection !== "undefined") {
        row[x] = Cesium.Cartesian3.distance(viewer.camera.position, intersection);
      }
    }
    rows[y] = row;
  }

  var myJsonString = JSON.stringify(rows);

  console.log(myJsonString);
  // record_matrix(rows, "1");


  return rows
}


function view_capture(pngName) {
  var canvas = getCaptureCanvas();

  if (zipEnabled && zip) {
    queueZipCapture(pngName);
    return;
  }
  Canvas2Image.saveAsPNG(canvas, canvas.width, canvas.height, pngName);

}

function getCaptureCanvas() {
  const src = viewer.scene.canvas;
  const factor = captureBrightnessFactor;
  if (!Number.isFinite(factor) || Math.abs(factor - 1.0) < 0.001) {
    return src;
  }
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  ctx.filter = `brightness(${factor})`;
  ctx.drawImage(src, 0, 0);
  return canvas;
}


function record_matrix(dist_matrix, view_image_name) {


  $.ajax({
    url: 'http://localhost:82/3dwindowview/3Dviewdata/webpage/commonHub/Cesium-1.111/Apps/myapp/record_matrix.php',
    type: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    data: {
      dist_matrix: JSON.stringify(dist_matrix),
      view_image_name: view_image_name
    },
    dataType: 'text',
    success: function (data) {
    }

  })


  

}

function compute_and_record_view_distance() {

  rows = distance_computing_full_view();

  $.ajax({
    url: 'http://localhost:80/3dwindowview/3Dviewdata/webpage/3DCIM_Platform/record_matrix.php',
    type: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    data: {
      dist_matrix: JSON.stringify(rows),
      view_image_name: "3_-2418208.6204_5386916.4556_2403269.3405_6.0483"
    },
    dataType: 'text',
    success: function (data) {
    }

  })

}
