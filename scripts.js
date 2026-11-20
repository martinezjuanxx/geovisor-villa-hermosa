var map = L.map('map', {
  zoomControl: false
}).setView([6.24, -75.58], 13);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

function resolveAssetUrl(relativePath) {
  if (!relativePath) return relativePath;
  if (/^(https?:)?\/\//i.test(relativePath)) return relativePath;
  return new URL(relativePath, window.location.href).toString();
}

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  crossOrigin: 'anonymous',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  crossOrigin: 'anonymous',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});

Esri_WorldImagery.addTo(map);
var layerControl = L.control.layers({ 'Imagen satelital': Esri_WorldImagery, 'Mapa vial': Esri_WorldStreetMap }, null, { position: 'topright', collapsed: true }).addTo(map);
var mapPreviewDialog = document.getElementById('map-preview-dialog');
var mapPreviewCanvas = null;
var mapPreviewImage = document.getElementById('map-preview-image');
var mapPreviewLoading = document.getElementById('map-preview-loading');
var mapPreviewStatus = document.getElementById('map-preview-status');
var mapPreviewDetails = document.getElementById('map-preview-details');
var previewDownloadButton = document.getElementById('preview-download-button');
var previewPrintButton = document.getElementById('preview-print-button');

function getMapExportMetadata() {
  var center = map.getCenter();
  return {
    latitude: center.lat,
    longitude: center.lng,
    zoom: map.getZoom(),
    baseMap: map.hasLayer(Esri_WorldImagery) ? 'Imagen satelital' : 'Mapa vial',
    activeLayers: villaLayerConfigs.filter(function (config) { return config.layer && map.hasLayer(config.layer); }),
    date: new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date())
  };
}

function getMapPreviewDetails(metadata) {
  return metadata.latitude.toFixed(5) + ', ' + metadata.longitude.toFixed(5) + ' · Zoom ' + metadata.zoom + ' · ' + metadata.baseMap + ' · ' + metadata.activeLayers.length + ' capas activas';
}

function drawWrappedLabelText(context, text, x, y, maxWidth, lineHeight) {
  var words = String(text).split(/\s+/);
  var line = '';
  words.forEach(function (word) {
    var candidate = line ? line + ' ' + word : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) {
    context.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawNorthArrow(canvas, screenWidth) {
  var context = canvas.getContext('2d');
  var scale = canvas.width / screenWidth;
  context.save();
  var arrowSize = Math.round(34 * scale);
  var arrowX = canvas.width - Math.round(34 * scale);
  var arrowY = Math.round(35 * scale);
  context.fillStyle = 'rgba(255,255,255,.94)';
  context.beginPath();
  context.arc(arrowX, arrowY, arrowSize / 2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#536b79';
  context.lineWidth = Math.max(1, scale);
  context.beginPath();
  context.arc(arrowX, arrowY, arrowSize / 2, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#bd5d3a';
  context.beginPath();
  context.moveTo(arrowX, arrowY - Math.round(10 * scale));
  context.lineTo(arrowX - Math.round(6 * scale), arrowY + Math.round(7 * scale));
  context.lineTo(arrowX, arrowY + Math.round(4 * scale));
  context.lineTo(arrowX + Math.round(6 * scale), arrowY + Math.round(7 * scale));
  context.closePath();
  context.fill();
  context.fillStyle = '#273746';
  context.font = '800 ' + Math.round(7 * scale) + 'px Manrope, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('N', arrowX, arrowY + Math.round(13 * scale));
  context.restore();
}

function createMapSheet(mapCanvas, screenWidth, metadata) {
  var scale = mapCanvas.width / screenWidth;
  var padding = Math.round(12 * scale);
  var labelWidth = Math.round(mapCanvas.height * 0.3);
  var sheet = document.createElement('canvas');
  sheet.width = mapCanvas.width + labelWidth;
  sheet.height = mapCanvas.height;
  var context = sheet.getContext('2d');
  var labelX = mapCanvas.width;
  var contentX = labelX + padding;
  var contentWidth = labelWidth - padding * 2;
  var y = padding;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, sheet.width, sheet.height);
  context.drawImage(mapCanvas, 0, 0);
  context.fillStyle = '#f7f9fa';
  context.fillRect(labelX, 0, labelWidth, sheet.height);
  context.fillStyle = '#bd5d3a';
  context.fillRect(labelX, 0, Math.max(5, Math.round(3 * scale)), sheet.height);
  context.strokeStyle = '#d8e1e6';
  context.lineWidth = Math.max(1, scale);
  context.beginPath();
  context.moveTo(labelX, 0);
  context.lineTo(labelX, sheet.height);
  context.stroke();

  context.textBaseline = 'top';
  context.fillStyle = '#8a9aa4';
  context.font = '700 ' + Math.round(9 * scale) + 'px Manrope, sans-serif';
  y = drawWrappedLabelText(context, 'GEOVISOR TERRITORIAL', contentX, y, contentWidth, Math.round(12 * scale));
  y += Math.round(29 * scale);
  context.fillStyle = '#273746';
  context.font = '800 ' + Math.round(18 * scale) + 'px Manrope, sans-serif';
  y = drawWrappedLabelText(context, 'ZONAS DE RIESGO', contentX, y, contentWidth, Math.round(23 * scale));
  context.fillStyle = '#536b79';
  context.font = '700 ' + Math.round(11 * scale) + 'px Manrope, sans-serif';
  y = drawWrappedLabelText(context, 'Comuna 8 · Villa Hermosa · Medellín', contentX, y + Math.round(4 * scale), contentWidth, Math.round(16 * scale));
  y += Math.round(15 * scale);

  context.strokeStyle = '#d7e0e5';
  context.lineWidth = Math.max(1, scale);
  context.beginPath();
  context.moveTo(contentX, y);
  context.lineTo(sheet.width - padding, y);
  context.stroke();
  y += Math.round(20 * scale);

  context.fillStyle = '#8998a2';
  context.font = '800 ' + Math.round(8 * scale) + 'px Manrope, sans-serif';
  context.fillText('DATOS DE LA VISTA', contentX, y);
  y += Math.round(17 * scale);
  context.fillStyle = '#344b5a';
  context.font = '600 ' + Math.round(10 * scale) + 'px Manrope, sans-serif';
  [
    ['Fecha', metadata.date],
    ['Centro', metadata.latitude.toFixed(5) + ', ' + metadata.longitude.toFixed(5)],
    ['Zoom', String(metadata.zoom)],
    ['Mapa base', metadata.baseMap]
  ].forEach(function (item) {
    context.fillStyle = '#81919b';
    context.font = '700 ' + Math.round(8 * scale) + 'px Manrope, sans-serif';
    context.fillText(item[0].toUpperCase(), contentX, y);
    y += Math.round(11 * scale);
    context.fillStyle = '#344b5a';
    context.font = '600 ' + Math.round(10 * scale) + 'px Manrope, sans-serif';
    y = drawWrappedLabelText(context, item[1], contentX, y, contentWidth, Math.round(14 * scale));
    y += Math.round(7 * scale);
  });

  y += Math.round(8 * scale);
  context.strokeStyle = '#d7e0e5';
  context.beginPath();
  context.moveTo(contentX, y);
  context.lineTo(sheet.width - padding, y);
  context.stroke();
  y += Math.round(19 * scale);
  context.fillStyle = '#8998a2';
  context.font = '800 ' + Math.round(8 * scale) + 'px Manrope, sans-serif';
  context.fillText('CAPAS VISIBLES', contentX, y);
  y += Math.round(16 * scale);

  if (!metadata.activeLayers.length) {
    context.fillStyle = '#71818d';
    context.font = '600 ' + Math.round(9 * scale) + 'px Manrope, sans-serif';
    drawWrappedLabelText(context, 'No hay capas temáticas activas.', contentX, y, contentWidth, Math.round(13 * scale));
  } else {
    metadata.activeLayers.forEach(function (config) {
      context.fillStyle = config.color || '#536b79';
      context.beginPath();
      context.arc(contentX + Math.round(4 * scale), y + Math.round(5 * scale), Math.max(2, Math.round(3 * scale)), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#344b5a';
      context.font = '600 ' + Math.round(9 * scale) + 'px Manrope, sans-serif';
      y = drawWrappedLabelText(context, config.name, contentX + Math.round(12 * scale), y, contentWidth - Math.round(12 * scale), Math.round(13 * scale));
      y += Math.round(5 * scale);
    });
  }

  context.fillStyle = '#8998a2';
  context.font = '500 ' + Math.round(7 * scale) + 'px Manrope, sans-serif';
  drawWrappedLabelText(context, 'Cartografía base: Esri', contentX, sheet.height - padding - Math.round(26 * scale), contentWidth, Math.round(9 * scale));
  drawWrappedLabelText(context, 'Datos temáticos: capas locales', contentX, sheet.height - padding - Math.round(13 * scale), contentWidth, Math.round(9 * scale));
  return sheet;
}

async function createMapPreview() {
  var openButton = document.getElementById('open-map-preview');
  openButton.disabled = true;
  mapPreviewDialog.classList.remove('hidden');
  mapPreviewImage.classList.add('hidden');
  mapPreviewLoading.classList.remove('hidden');
  mapPreviewLoading.textContent = 'Preparando mapa en alta resolución…';
  mapPreviewStatus.textContent = 'Capturando la vista, el mapa base y las capas activas.';
  var exportMetadata = getMapExportMetadata();
  mapPreviewDetails.textContent = getMapPreviewDetails(exportMetadata);
  mapPreviewCanvas = null;
  previewDownloadButton.disabled = true;
  previewPrintButton.disabled = true;

  try {
    map.invalidateSize({ pan: false });
    var mapElement = map.getContainer();
    var originalMapStyle = mapElement.getAttribute('style') || '';
    var originalCenter = map.getCenter();
    var originalZoom = map.getZoom();
    var originalZoomSnap = map.options.zoomSnap;
    var originalWidth = mapElement.clientWidth;
    var originalHeight = mapElement.clientHeight;
    var pixelArea = originalWidth * originalHeight;
    var activeBaseLayer = map.hasLayer(Esri_WorldImagery) ? Esri_WorldImagery : Esri_WorldStreetMap;
    var sourceZoomHeadroom = Math.max(0, (activeBaseLayer.options.maxZoom || 18) - originalZoom);
    var sheetAreaFactor = 1 + (originalHeight / originalWidth) * 0.3;
    var exportScale = Math.min(6, Math.sqrt(32000000 / (pixelArea * sheetAreaFactor)), Math.pow(2, sourceZoomHeadroom));
    var zoomBoost = Math.log(exportScale) / Math.LN2;

    try {
      map.options.zoomSnap = 0;
      mapElement.style.cssText = 'position:fixed;left:0;top:0;width:' + Math.round(originalWidth * exportScale) + 'px;height:' + Math.round(originalHeight * exportScale) + 'px;z-index:1;pointer-events:none;';
      map.invalidateSize({ pan: false });
      map.setView(originalCenter, originalZoom + zoomBoost, { animate: false });
      var pendingTiles = Array.prototype.map.call(mapElement.querySelectorAll('img.leaflet-tile'), function (tile) {
        if (tile.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          tile.addEventListener('load', resolve, { once: true });
          tile.addEventListener('error', resolve, { once: true });
        });
      });
      await new Promise(function (resolve) {
        var timeout = window.setTimeout(resolve, 7000);
        Promise.all(pendingTiles).then(function () {
          window.clearTimeout(timeout);
          resolve();
        });
      });
      await new Promise(function (resolve) { window.setTimeout(resolve, 250); });
      var mapCaptureCanvas = await html2canvas(mapElement, {
        backgroundColor: '#ffffff',
        logging: false,
        scale: 1,
        useCORS: true,
        imageTimeout: 20000,
        windowWidth: Math.max(window.innerWidth, mapElement.clientWidth),
        windowHeight: Math.max(window.innerHeight, mapElement.clientHeight),
        ignoreElements: function (element) {
          return element.classList && (element.classList.contains('leaflet-control-layers') || element.classList.contains('leaflet-control-zoom'));
        }
      });
      drawNorthArrow(mapCaptureCanvas, originalWidth);
      mapPreviewCanvas = createMapSheet(mapCaptureCanvas, originalWidth, exportMetadata);
    } finally {
      mapElement.setAttribute('style', originalMapStyle);
      map.options.zoomSnap = originalZoomSnap;
      map.invalidateSize({ pan: false });
      map.setView(originalCenter, originalZoom, { animate: false });
    }
    mapPreviewImage.src = mapPreviewCanvas.toDataURL('image/png');
    mapPreviewImage.classList.remove('hidden');
    mapPreviewLoading.classList.add('hidden');
    mapPreviewStatus.textContent = 'Vista previa lista · Alta resolución (' + mapPreviewCanvas.width + ' × ' + mapPreviewCanvas.height + ' px).';
    previewDownloadButton.disabled = false;
    previewPrintButton.disabled = false;
  } catch (error) {
    console.error('No se pudo preparar la vista previa del mapa:', error);
    mapPreviewLoading.textContent = 'No se pudo preparar la vista previa. Comprueba tu conexión e inténtalo otra vez.';
    mapPreviewStatus.textContent = 'La imagen del mapa no pudo capturarse.';
  } finally {
    openButton.disabled = false;
  }
}

document.getElementById('open-map-preview').addEventListener('click', createMapPreview);
document.getElementById('close-map-preview').addEventListener('click', function () {
  mapPreviewDialog.classList.add('hidden');
});
mapPreviewDialog.addEventListener('click', function (event) {
  if (event.target === mapPreviewDialog) mapPreviewDialog.classList.add('hidden');
});
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !mapPreviewDialog.classList.contains('hidden')) mapPreviewDialog.classList.add('hidden');
});

previewDownloadButton.addEventListener('click', function () {
  if (!mapPreviewCanvas) return;
  previewDownloadButton.disabled = true;
  mapPreviewStatus.textContent = 'Generando PDF en calidad original…';
  try {
    var JsPDF = window.jspdf.jsPDF;
    var landscape = mapPreviewCanvas.width >= mapPreviewCanvas.height;
    var pdf = new JsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
    var pageWidth = pdf.internal.pageSize.getWidth();
    var pageHeight = pdf.internal.pageSize.getHeight();
    var margin = 9;
    var availableWidth = pageWidth - margin * 2;
    var availableHeight = pageHeight - margin * 2;
    var imageRatio = Math.min(availableWidth / mapPreviewCanvas.width, availableHeight / mapPreviewCanvas.height);
    var imageWidth = mapPreviewCanvas.width * imageRatio;
    var imageHeight = mapPreviewCanvas.height * imageRatio;
    pdf.addImage(mapPreviewCanvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight, undefined, 'FAST');
    pdf.save('geovisor-villa-hermosa.pdf');
    mapPreviewStatus.textContent = 'PDF descargado con la misma imagen de la vista previa.';
  } catch (error) {
    console.error('No se pudo generar el PDF del mapa:', error);
    mapPreviewStatus.textContent = 'No se pudo generar el PDF. Inténtalo nuevamente.';
  } finally {
    previewDownloadButton.disabled = false;
  }
});
previewPrintButton.addEventListener('click', function () {
  if (!mapPreviewCanvas) return;
  window.print();
});
window.addEventListener('beforeprint', function () { map.invalidateSize({ pan: false }); });
window.addEventListener('afterprint', function () { map.invalidateSize({ pan: false }); });
var villaLayerConfigs = [
  { id: 'villa-layer-toggle', statusId: 'villa-layer-status', name: 'Comuna Villa Hermosa', url: resolveAssetUrl('Data/Comuna%20Villa%20Hermosa.zip'), color: '#b64f35', fill: false, pane: 'communePane', bounds: true },
  { id: 'lote-predio-toggle', statusId: 'lote-predio-status', name: 'Lote_Predio', url: resolveAssetUrl('Data/Lote_Predio.zip'), color: '#000000', fill: false, pane: 'parcelsPane' },
  { id: 'amenaza-alta-toggle', statusId: 'amenaza-alta-status', name: 'Amenaza alta por movimiento en masa', url: resolveAssetUrl('Data/Amenaza_alta.zip'), color: '#c62828', fillColor: '#e34d3d', pane: 'riskPane' },
  { id: 'amenaza-media-toggle', statusId: 'amenaza-media-status', name: 'Amenaza media por movimiento en masa', url: resolveAssetUrl('Data/Amenaza_media.zip'), color: '#d97818', fillColor: '#efa43b', pane: 'riskPane' },
  { id: 'amenaza-muybaja-toggle', statusId: 'amenaza-muybaja-status', name: 'Amenaza baja por movimiento en masa', url: resolveAssetUrl('Data/Amenaza_muybaja.zip'), color: '#39764b', fillColor: '#68a873', pane: 'riskPane' },
  { id: 'amenaza-inundacion-toggle', statusId: 'amenaza-inundacion-status', name: 'Amenaza por inundación', url: resolveAssetUrl('Data/Amenaza_inundacion.zip'), color: '#216f9b', fillColor: '#52a8d1', pane: 'riskPane' },
  { id: 'buffer-toggle', statusId: 'buffer-status', name: 'Retiro obligatorio de vías', url: resolveAssetUrl('Data/buffer.zip'), color: '#7b2cbf', fillColor: '#a78bfa', fillOpacity: 0.25, pane: 'riskPane' },
  { id: 'vias-toggle', statusId: 'vias-status', name: 'Vías', url: resolveAssetUrl('Data/Vias.zip'), color: '#7b2cbf', pane: 'roadsPane', line: true }
];

map.createPane('riskPane').style.zIndex = 410;
map.createPane('roadsPane').style.zIndex = 420;
map.createPane('communePane').style.zIndex = 430;
map.createPane('parcelsPane').style.zIndex = 440;
map.createPane('streetViewCoveragePane').style.zIndex = 435;

var attributeLayerSelect = document.getElementById('attribute-layer-select');
var attributeLayerState = document.getElementById('attribute-layer-state');
var attributePanel = document.getElementById('attribute-panel');
var attributePanelTitle = document.getElementById('attribute-panel-title');
var attributeTableWrapper = document.getElementById('attribute-table-wrapper');
var attributeRecordCount = document.getElementById('attribute-record-count');
var attributeExportScope = document.getElementById('attribute-export-scope');
var attributeExportStatus = document.getElementById('attribute-export-status');
var selectedAttributeRows = new Set();
var currentAttributeFeatures = [];
var currentAttributeColumns = [];

function downloadFile(filename, content, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function collectAttributeColumns(features) {
  var columns = [];
  features.forEach(function (feature) {
    Object.keys(feature.properties || {}).forEach(function (key) {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  return columns;
}

function csvCell(value) {
  var text = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  return '"' + text.replace(/"/g, '""') + '"';
}

var historyPanel = document.getElementById('history-panel');
var historyStatus = document.getElementById('history-status');
var historyControls = document.getElementById('history-controls');
var historyTimeline = document.getElementById('history-timeline');
var historyDate = document.getElementById('history-date');
var historyItems = [];
var historyLayer = null;
var historyIndex = 0;
var historyPlayback = null;
var historyQueryKey = '';
var historyWaybackCore = null;

function getWaybackTileUrl(item) {
  return item.itemURL
    .replace('{level}', '{z}')
    .replace('{row}', '{y}')
    .replace('{col}', '{x}');
}

function displayHistoryVersion(index) {
  if (!historyItems.length) return;
  historyIndex = Math.max(0, Math.min(historyItems.length - 1, index));
  var item = historyItems[historyIndex];
  historyTimeline.value = historyIndex;
  historyDate.textContent = item.releaseDateLabel;
  var tileUrl = getWaybackTileUrl(item);
  if (historyLayer) historyLayer.setUrl(tileUrl);
  else {
    historyLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      opacity: Number(document.getElementById('history-opacity').value) / 100,
      attribution: 'Historical imagery © Esri, Maxar, Earthstar Geographics and contributors'
    }).addTo(map);
  }
}

function loadHistoryVersions() {
  var center = map.getCenter();
  // Wayback skips exact-image deduplication at zoom 11 and below; use at least
  // level 12 so identical imagery releases are actually compared and filtered.
  var zoom = Math.max(12, map.getZoom());
  var queryKey = center.lat.toFixed(4) + ',' + center.lng.toFixed(4) + ',' + zoom;
  if (historyQueryKey === queryKey) {
    displayHistoryVersion(historyIndex);
    return Promise.resolve();
  }
  historyStatus.textContent = 'Buscando imágenes con cambios en esta ubicación…';
  historyControls.classList.add('hidden');
  if (historyLayer) {
    map.removeLayer(historyLayer);
    historyLayer = null;
  }
  if (!historyWaybackCore) {
    historyWaybackCore = import('https://esm.sh/@esri/wayback-core@2.0.0');
  }
  return historyWaybackCore
    .then(function (waybackCore) {
      return waybackCore.getWaybackItemsWithLocalChanges(
        { latitude: center.lat, longitude: center.lng },
        zoom,
        { onlyUseSizeToFilterDuplicates: false }
      );
    })
    .then(function (items) {
      historyItems = items.sort(function (a, b) {
        return a.releaseDatetime - b.releaseDatetime;
      });
      historyQueryKey = queryKey;
      if (!historyItems.length) {
        historyStatus.textContent = 'Esri no reporta cambios de imagen en el centro del mapa para este nivel de zoom.';
        return;
      }
      historyTimeline.max = historyItems.length - 1;
      historyControls.classList.remove('hidden');
      historyStatus.textContent = historyItems.length + ' versiones con cambios visuales en esta ubicación.';
      if (!historyPanel.classList.contains('hidden')) displayHistoryVersion(historyItems.length - 1);
    })
    .catch(function (error) {
      console.error('No se pudieron buscar cambios en las imágenes históricas:', error);
      historyWaybackCore = null;
      historyStatus.textContent = 'No se pudieron detectar cambios en el archivo histórico. Revisa tu conexión e inténtalo de nuevo.';
      throw error;
    });
}

function stopHistoryPlayback() {
  if (historyPlayback) window.clearInterval(historyPlayback);
  historyPlayback = null;
  document.getElementById('history-play').textContent = 'Reproducir';
}

function closeHistoryPanel() {
  stopHistoryPlayback();
  historyPanel.classList.add('hidden');
  if (historyLayer) {
    map.removeLayer(historyLayer);
    historyLayer = null;
  }
}

historyTimeline.addEventListener('input', function () {
  displayHistoryVersion(Number(historyTimeline.value));
});
document.getElementById('history-opacity').addEventListener('input', function (event) {
  if (historyLayer) historyLayer.setOpacity(Number(event.target.value) / 100);
});
document.getElementById('history-previous').addEventListener('click', function () {
  displayHistoryVersion(historyIndex - 1);
});
document.getElementById('history-next').addEventListener('click', function () {
  displayHistoryVersion(historyIndex + 1);
});
document.getElementById('history-play').addEventListener('click', function () {
  if (historyPlayback) {
    stopHistoryPlayback();
    return;
  }
  document.getElementById('history-play').textContent = 'Pausar';
  historyPlayback = window.setInterval(function () {
    displayHistoryVersion(historyIndex >= historyItems.length - 1 ? 0 : historyIndex + 1);
  }, 1200);
});
document.getElementById('history-close').addEventListener('click', closeHistoryPanel);

function setLayerStatus(config, message, isError) {
  var status = document.getElementById(config.statusId);
  status.textContent = message;
  status.classList.toggle('layer-status-error', Boolean(isError));
}

function createFeaturePopup(feature, layer, layerName) {
  var properties = feature.properties || {};
  var content = document.createElement('div');
  var heading = document.createElement('strong');
  heading.textContent = layerName;
  content.appendChild(heading);
  Object.keys(properties).forEach(function (key) {
    var row = document.createElement('div');
    var label = document.createElement('strong');
    label.textContent = key + ': ';
    row.appendChild(label);
    row.appendChild(document.createTextNode(String(properties[key])));
    content.appendChild(row);
  });
  layer.bindPopup(content);
}

function getAttributeConfig() {
  return villaLayerConfigs.find(function (config) {
    return config.id === attributeLayerSelect.value && config.layer;
  });
}

function getAttributeFeatures() {
  var config = getAttributeConfig();
  return config ? (config.layer.toGeoJSON().features || []) : [];
}

function updateAttributeLayerOptions() {
  var previousValue = attributeLayerSelect.value;
  villaLayerConfigs.filter(function (config) { return config.layer; }).forEach(function (config) {
    var option = Array.prototype.find.call(attributeLayerSelect.options, function (item) { return item.value === config.id; });
    var visible = map.hasLayer(config.layer);
    var label = config.name + (visible ? ' · Visible' : ' · Oculta');
    if (!option) {
      option = document.createElement('option');
      option.value = config.id;
      attributeLayerSelect.appendChild(option);
    }
    option.textContent = label;
  });
  if (previousValue && getAttributeConfig()) attributeLayerSelect.value = previousValue;
  else if (!attributeLayerSelect.value) {
    var visibleConfig = villaLayerConfigs.find(function (config) { return config.layer && map.hasLayer(config.layer); });
    var firstConfig = visibleConfig || villaLayerConfigs.find(function (config) { return config.layer; });
    if (firstConfig) attributeLayerSelect.value = firstConfig.id;
  }
  renderAttributeTable();
}

function updateAttributeSelectionControls() {
  var selectedOption = attributeExportScope.querySelector('option[value="selected"]');
  selectedOption.textContent = 'Seleccionados (' + selectedAttributeRows.size + ')';
  selectedOption.disabled = selectedAttributeRows.size === 0;
  if (!selectedAttributeRows.size && attributeExportScope.value === 'selected') attributeExportScope.value = 'all';
  var exportFeatures = attributeExportScope.value === 'selected'
    ? currentAttributeFeatures.filter(function (feature, index) { return selectedAttributeRows.has(index); })
    : currentAttributeFeatures;
  var hasFields = currentAttributeColumns.length > 0;
  document.getElementById('attribute-xlsx').disabled = !exportFeatures.length || !hasFields;
  document.getElementById('attribute-csv').disabled = !exportFeatures.length || !hasFields;
  document.getElementById('attribute-geojson').disabled = !exportFeatures.some(function (feature) { return Boolean(feature.geometry); });
}

function renderAttributeTable() {
  var config = getAttributeConfig();
  if (!config) {
    attributeTableWrapper.innerHTML = '<div class="attribute-table-empty">Cargando capas geográficas…</div>';
    attributeLayerState.textContent = 'Esperando capas…';
    return;
  }
  currentAttributeFeatures = config.layer.toGeoJSON().features || [];
  currentAttributeColumns = collectAttributeColumns(currentAttributeFeatures);
  attributePanelTitle.textContent = 'Atributos · ' + config.name;
  attributeRecordCount.textContent = currentAttributeFeatures.length + (currentAttributeFeatures.length === 1 ? ' registro' : ' registros');
  attributeLayerState.textContent = map.hasLayer(config.layer) ? 'Visible en el mapa' : 'Capa cargada, actualmente oculta';

  var table = document.createElement('table');
  table.className = 'attribute-table';
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  var selectHeader = document.createElement('th');
  var selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.checked = currentAttributeFeatures.length > 0 && selectedAttributeRows.size === currentAttributeFeatures.length;
  selectAll.setAttribute('aria-label', 'Seleccionar todos los registros');
  selectHeader.appendChild(selectAll);
  headerRow.appendChild(selectHeader);
  if (config.imported) {
    var colorHeader = document.createElement('th');
    colorHeader.textContent = config.classification ? 'Color · ' + config.classification.field : 'Color';
    headerRow.appendChild(colorHeader);
  }
  currentAttributeColumns.forEach(function (column) {
    var th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  currentAttributeFeatures.forEach(function (feature, index) {
    var properties = feature.properties || {};
    var row = document.createElement('tr');
    var selectorCell = document.createElement('td');
    var selector = document.createElement('input');
    selector.type = 'checkbox';
    selector.checked = selectedAttributeRows.has(index);
    selector.setAttribute('aria-label', 'Seleccionar registro ' + (index + 1));
    if (selector.checked) row.classList.add('attribute-row-selected');
    selector.addEventListener('change', function () {
      if (selector.checked) selectedAttributeRows.add(index);
      else selectedAttributeRows.delete(index);
      row.classList.toggle('attribute-row-selected', selector.checked);
      updateAttributeSelectionControls();
    });
    selectorCell.appendChild(selector);
    row.appendChild(selectorCell);
    if (config.imported) {
      var colorCell = document.createElement('td');
      colorCell.className = 'attribute-color-cell';
      var colorSwatch = document.createElement('span');
      var featureColor = getImportedFeatureColor(feature, config);
      colorSwatch.className = 'attribute-color-swatch';
      colorSwatch.style.backgroundColor = featureColor;
      colorSwatch.setAttribute('aria-label', 'Color ' + featureColor);
      colorCell.appendChild(colorSwatch);
      var classValue = getImportedClassValue(feature, config);
      colorCell.appendChild(document.createTextNode(classValue === null ? featureColor : String(classValue) + ' · ' + featureColor));
      row.appendChild(colorCell);
    }
    currentAttributeColumns.forEach(function (column) {
      var cell = document.createElement('td');
      var value = properties[column];
      cell.textContent = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
      cell.title = cell.textContent;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  selectAll.disabled = currentAttributeFeatures.length === 0;
  selectAll.addEventListener('change', function () {
    tbody.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox, index) {
      checkbox.checked = selectAll.checked;
      if (selectAll.checked) selectedAttributeRows.add(index);
      else selectedAttributeRows.delete(index);
      checkbox.closest('tr').classList.toggle('attribute-row-selected', selectAll.checked);
    });
    updateAttributeSelectionControls();
  });
  attributeTableWrapper.innerHTML = '';
  if (!currentAttributeFeatures.length) attributeTableWrapper.innerHTML = '<div class="attribute-table-empty">La capa no contiene registros.</div>';
  else attributeTableWrapper.appendChild(table);
  updateAttributeSelectionControls();
}

function getAttributeExportFeatures() {
  return attributeExportScope.value === 'selected'
    ? currentAttributeFeatures.filter(function (feature, index) { return selectedAttributeRows.has(index); })
    : currentAttributeFeatures;
}

function getAttributeFilename(extension) {
  var config = getAttributeConfig();
  var slug = (config ? config.name : 'capa').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug + '_villa_hermosa.' + extension;
}

function exportAttributeCsv() {
  var features = getAttributeExportFeatures();
  if (!features.length || !currentAttributeColumns.length) return;
  var rows = [currentAttributeColumns.map(csvCell).join(',')];
  features.forEach(function (feature) {
    var properties = feature.properties || {};
    rows.push(currentAttributeColumns.map(function (column) { return csvCell(properties[column]); }).join(','));
  });
  downloadFile(getAttributeFilename('csv'), '\uFEFF' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  attributeExportStatus.textContent = 'CSV descargado: ' + features.length + ' registros.';
}

function exportAttributeXlsx() {
  var features = getAttributeExportFeatures();
  if (!features.length || !currentAttributeColumns.length) return;
  if (!window.XLSX) {
    attributeExportStatus.textContent = 'No se pudo cargar el componente para generar Excel. Revisa tu conexión.';
    return;
  }
  var rows = features.map(function (feature) {
    var row = {};
    currentAttributeColumns.forEach(function (column) { row[column] = (feature.properties || {})[column]; });
    return row;
  });
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: currentAttributeColumns }), 'Atributos');
  XLSX.writeFile(workbook, getAttributeFilename('xlsx'));
  attributeExportStatus.textContent = 'Excel descargado: ' + features.length + ' registros.';
}

function exportAttributeGeoJson() {
  var config = getAttributeConfig();
  var features = getAttributeExportFeatures().filter(function (feature) { return Boolean(feature.geometry); });
  if (!config || !features.length) return;
  downloadFile(getAttributeFilename('geojson'), JSON.stringify({ type: 'FeatureCollection', name: config.name, features: features }, null, 2), 'application/geo+json;charset=utf-8');
  attributeExportStatus.textContent = 'GeoJSON descargado: ' + features.length + ' elementos.';
}

attributeLayerSelect.addEventListener('change', function () {
  selectedAttributeRows.clear();
  attributeExportScope.value = 'all';
  attributeExportStatus.textContent = 'Marca filas para descargar solo los registros seleccionados.';
  renderAttributeTable();
});
attributeExportScope.addEventListener('change', updateAttributeSelectionControls);
document.getElementById('attribute-xlsx').addEventListener('click', exportAttributeXlsx);
document.getElementById('attribute-csv').addEventListener('click', exportAttributeCsv);
document.getElementById('attribute-geojson').addEventListener('click', exportAttributeGeoJson);

function openAttributeTable(layerId) {
  var config = villaLayerConfigs.find(function (item) { return item.id === layerId && item.layer; });
  if (!config) return;
  updateAttributeLayerOptions();
  attributeLayerSelect.value = config.id;
  if (attributeLayerSelect.value !== config.id) {
    var option = document.createElement('option');
    option.value = config.id;
    option.textContent = config.name + (map.hasLayer(config.layer) ? ' · Visible' : ' · Oculta');
    attributeLayerSelect.appendChild(option);
    attributeLayerSelect.value = config.id;
  }
  selectedAttributeRows.clear();
  attributeExportScope.value = 'all';
  attributeExportStatus.textContent = 'Marca filas para descargar solo los registros seleccionados.';
  renderAttributeTable();
  attributePanel.classList.remove('hidden');
  attributePanel.scrollTop = 0;
}

document.querySelectorAll('.layer-table-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    openAttributeTable(button.dataset.attributeLayer);
  });
});
var clearAllLayersButton = document.getElementById('layers-clear-all');

function updateClearAllLayersButton() {
  clearAllLayersButton.hidden = !Array.prototype.some.call(document.querySelectorAll('.layer-toggle'), function (toggle) {
    return toggle.checked;
  });
}

clearAllLayersButton.addEventListener('click', function () {
  document.querySelectorAll('.layer-toggle:checked').forEach(function (toggle) {
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  updateClearAllLayersButton();
});

document.getElementById('attribute-panel-close').addEventListener('click', function () {
  attributePanel.classList.add('hidden');
});

villaLayerConfigs.forEach(function (config) {
  var toggle = document.getElementById(config.id);

  shp(config.url).then(function (geojson) {
    var isLineLayer = Boolean(config.line);
    config.layer = L.geoJSON(geojson, {
      pane: config.pane,
      style: isLineLayer
        ? { color: config.color, weight: 1.5, opacity: 1 }
        : {
            color: config.color,
            weight: config.bounds ? 2.5 : 1,
            opacity: 1,
            fill: config.fill !== false && !config.bounds,
            fillColor: config.fillColor || config.color,
            fillOpacity: config.fillOpacity !== undefined ? config.fillOpacity : 1
          },
      onEachFeature: function (feature, layer) {
        createFeaturePopup(feature, layer, config.name);
      }
    });

    if (toggle.checked) config.layer.addTo(map);
    var attributeButton = document.querySelector('[data-attribute-layer="' + config.id + '"]');
    if (attributeButton) attributeButton.disabled = false;
    updateAttributeLayerOptions();
    setLayerStatus(config, toggle.checked ? 'Visible' : 'Cargada', false);
    updateClearAllLayersButton();

    if (config.bounds && config.layer.getLayers().length) {
      map.fitBounds(config.layer.getBounds(), { padding: [24, 24], maxZoom: 15 });
    }
    if (config.id === 'vias-toggle' && streetViewActive) loadStreetViewCoverage();
  }).catch(function (error) {
    console.error('No se pudo cargar la capa ' + config.name + ':', error);
    toggle.checked = false;
    var attributeButton = document.querySelector('[data-attribute-layer="' + config.id + '"]');
    if (attributeButton) attributeButton.title = 'No se pudo cargar esta capa';
    setLayerStatus(config, 'Error', true);
  });

  toggle.addEventListener('change', function () {
    if (!config.layer) return;
    if (toggle.checked) {
      config.layer.addTo(map);
      setLayerStatus(config, 'Visible', false);
      attributeLayerSelect.value = config.id;
      selectedAttributeRows.clear();
      attributeExportScope.value = 'all';
      attributeExportStatus.textContent = 'Mostrando todos los registros de la capa activa.';
    } else {
      map.removeLayer(config.layer);
      setLayerStatus(config, 'Cargada', false);
    }
    updateAttributeLayerOptions();
    updateClearAllLayersButton();
  });
});

map.on('overlayadd', function (event) {
  villaLayerConfigs.forEach(function (config) {
    if (event.layer === config.layer) {
      document.getElementById(config.id).checked = true;
      attributeLayerSelect.value = config.id;
      selectedAttributeRows.clear();
      attributeExportScope.value = 'all';
      attributeExportStatus.textContent = 'Mostrando todos los registros de la capa activa.';
    }
  });
  updateAttributeLayerOptions();
  updateClearAllLayersButton();
});
map.on('overlayremove', function (event) {
  villaLayerConfigs.forEach(function (config) {
    if (event.layer === config.layer) document.getElementById(config.id).checked = false;
  });
  updateAttributeLayerOptions();
  updateClearAllLayersButton();
});

var localLayerFiles = document.getElementById('local-layer-files');
var layerImportStatus = document.getElementById('layer-import-status');
var importedLayersList = document.getElementById('imported-layers-list');
var importedLayerCounter = 0;
var importedLayerColors = ['#1473e6', '#9b5b28', '#2d806c', '#9b4773', '#687c2f', '#6852a1'];
var importedCategoryPalette = ['#c74343', '#dc7828', '#d2a329', '#38845c', '#2879ae', '#7154a3', '#bf557e', '#488f91', '#8a6935', '#637748'];

function getImportedClassification(features) {
  var properties = {};
  features.forEach(function (feature) {
    Object.keys(feature.properties || {}).forEach(function (key) { properties[key] = true; });
  });
  var keys = Object.keys(properties);
  var preferredKeys = keys.filter(function (key) { return /estrat|socio.?econ/i.test(key); });
  var categoricalKeys = keys.filter(function (key) {
    return !preferredKeys.includes(key) && /categor|clase|nivel|tipo|class|category|grade|grupo|uso|zona/i.test(key);
  });
  var fallbackKeys = keys.filter(function (key) {
    return !preferredKeys.includes(key) && !categoricalKeys.includes(key) && !/^(id|fid|gid|objectid|shape|area|perimetro|longitud|latitud|fecha|codigo)$/i.test(key);
  });

  var candidates = preferredKeys.concat(categoricalKeys, fallbackKeys);
  for (var index = 0; index < candidates.length; index++) {
    var field = candidates[index];
    var values = features.map(function (feature) {
      var value = (feature.properties || {})[field];
      return value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();
    }).filter(function (value) { return value !== null; });
    var distinct = Array.from(new Set(values));
    if (distinct.length < 2 || distinct.length > 12) continue;
    var explicitlyCategorical = preferredKeys.includes(field) || categoricalKeys.includes(field);
    if (features.length > 0 && distinct.length / features.length > 0.6 && !explicitlyCategorical) continue;
    distinct.sort(new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare);
    var colors = new Map();
    distinct.forEach(function (value, colorIndex) {
      colors.set(value.toLocaleLowerCase('es'), importedCategoryPalette[colorIndex % importedCategoryPalette.length]);
    });
    return { field: field, colors: colors };
  }
  return null;
}

function getImportedClassValue(feature, config) {
  if (!config.classification) return null;
  var value = (feature.properties || {})[config.classification.field];
  return value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();
}

function getImportedFeatureColor(feature, config) {
  var value = getImportedClassValue(feature, config);
  if (value !== null) {
    var categoryColor = config.classification.colors.get(value.toLocaleLowerCase('es'));
    if (categoryColor) return categoryColor;
  }
  return config.color;
}

function normalizeImportedGeoJson(data) {
  if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) return data;
  if (data && data.type === 'Feature') return { type: 'FeatureCollection', features: [data] };
  if (data && data.type && data.coordinates) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: data }] };
  }
  throw new Error('El archivo no contiene datos GeoJSON válidos.');
}

function createImportedLayerRow(config, geojson) {
  var row = document.createElement('div');
  row.className = 'layer-row imported-layer-row';

  var label = document.createElement('label');
  label.className = 'layer-toggle-label';
  label.htmlFor = config.id;

  var toggle = document.createElement('input');
  toggle.className = 'layer-toggle';
  toggle.id = config.id;
  toggle.type = 'checkbox';
  toggle.checked = true;

  var symbol = document.createElement('span');
  symbol.className = 'layer-symbol imported-layer-symbol';
  symbol.style.setProperty('--imported-layer-color', config.color);
  if (config.classification) {
    var swatchColors = Array.from(config.classification.colors.values());
    symbol.style.background = 'linear-gradient(90deg,' + swatchColors.map(function (color, index) {
      var start = index / swatchColors.length * 100;
      var end = (index + 1) / swatchColors.length * 100;
      return color + ' ' + start + '% ' + end + '%';
    }).join(',') + ')';
    symbol.title = config.classification.field + ': ' + Array.from(config.classification.colors.keys()).join(', ');
  }

  var name = document.createElement('span');
  name.className = 'layer-name';
  name.textContent = config.name;
  name.title = config.name;
  label.append(toggle, symbol, name);

  var status = document.createElement('span');
  status.className = 'layer-status';
  status.id = config.statusId;
  status.textContent = 'Visible';

  var tableButton = document.createElement('button');
  tableButton.className = 'layer-table-btn';
  tableButton.type = 'button';
  tableButton.dataset.attributeLayer = config.id;
  tableButton.title = 'Ver tabla de atributos';
  tableButton.setAttribute('aria-label', 'Abrir tabla de atributos de ' + config.name);
  tableButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3" width="15" height="14" rx="1.5"/><path d="M2.5 7h15M7.5 7v10m5-10v10M2.5 11.5h15"/></svg>';
  tableButton.addEventListener('click', function () { openAttributeTable(config.id); });

  var removeButton = document.createElement('button');
  removeButton.className = 'imported-layer-remove';
  removeButton.type = 'button';
  removeButton.textContent = '×';
  removeButton.title = 'Quitar capa';
  removeButton.setAttribute('aria-label', 'Quitar capa ' + config.name);
  removeButton.addEventListener('click', function () {
    if (map.hasLayer(config.layer)) map.removeLayer(config.layer);
    villaLayerConfigs = villaLayerConfigs.filter(function (item) { return item !== config; });
    var option = attributeLayerSelect.querySelector('option[value="' + config.id + '"]');
    if (option) option.remove();
    row.remove();
    updateAttributeLayerOptions();
    updateClearAllLayersButton();
  });

  row.append(label, status, tableButton, removeButton);
  importedLayersList.appendChild(row);

  toggle.addEventListener('change', function () {
    if (toggle.checked) {
      config.layer.addTo(map);
      setLayerStatus(config, 'Visible', false);
      attributeLayerSelect.value = config.id;
      selectedAttributeRows.clear();
      attributeExportScope.value = 'all';
      attributeExportStatus.textContent = 'Mostrando todos los registros de la capa activa.';
    } else {
      map.removeLayer(config.layer);
      setLayerStatus(config, 'Cargada', false);
    }
    updateAttributeLayerOptions();
    updateClearAllLayersButton();
  });

  config.layer = L.geoJSON(geojson, {
    style: function (feature) {
      var featureColor = getImportedFeatureColor(feature, config);
      return { color: featureColor, weight: 1.8, opacity: 1, fillColor: featureColor, fillOpacity: 1 };
    },
    pointToLayer: function (feature, latlng) {
      var featureColor = getImportedFeatureColor(feature, config);
      return L.circleMarker(latlng, { radius: 5, color: featureColor, weight: 1.5, fillColor: featureColor, fillOpacity: 1 });
    },
    onEachFeature: function (feature, layer) {
      createFeaturePopup(feature, layer, config.name);
    }
  });
  villaLayerConfigs.push(config);
  config.layer.addTo(map);
  updateAttributeLayerOptions();
  updateClearAllLayersButton();
  if (config.layer.getLayers().length) map.fitBounds(config.layer.getBounds(), { padding: [30, 30], maxZoom: 17 });
}

function addImportedGeoJson(fileName, data, datasetName) {
  var geojson = normalizeImportedGeoJson(data);
  if (!geojson.features.length) throw new Error('La capa no contiene entidades.');
  var baseName = fileName.replace(/\.(geojson|json|zip)$/i, '');
  var name = datasetName ? baseName + ' · ' + datasetName : baseName;
  var id = 'imported-layer-' + (++importedLayerCounter);
  var config = {
    id: id,
    statusId: id + '-status',
    name: name,
    color: importedLayerColors[(importedLayerCounter - 1) % importedLayerColors.length],
    classification: getImportedClassification(geojson.features),
    imported: true,
    layer: null
  };
  createImportedLayerRow(config, geojson);
}

async function importLocalLayer(file) {
  if (file.size > 100 * 1024 * 1024) throw new Error(file.name + ': el archivo supera el límite de 100 MB.');
  var extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'geojson' || extension === 'json') {
    addImportedGeoJson(file.name, JSON.parse(await file.text()));
    return;
  }
  if (extension === 'zip') {
    var result = await shp(await file.arrayBuffer());
    if (Array.isArray(result)) {
      result.forEach(function (dataset, index) { addImportedGeoJson(file.name, dataset, 'Capa ' + (index + 1)); });
      return;
    }
    if (result && result.type === 'FeatureCollection') {
      addImportedGeoJson(file.name, result);
      return;
    }
    var datasets = Object.keys(result || {}).filter(function (key) {
      return result[key] && result[key].type === 'FeatureCollection';
    });
    if (!datasets.length) throw new Error(file.name + ': el ZIP no contiene shapefiles válidos.');
    datasets.forEach(function (key) { addImportedGeoJson(file.name, result[key], key); });
    return;
  }
  throw new Error(file.name + ': formato no admitido. Usa GeoJSON o Shapefile ZIP.');
}

document.getElementById('add-local-layer').addEventListener('click', function () { localLayerFiles.click(); });
localLayerFiles.addEventListener('change', async function () {
  var files = Array.prototype.slice.call(localLayerFiles.files || []);
  if (!files.length) return;
  var initialLayerCount = importedLayerCounter;
  var errors = [];
  layerImportStatus.classList.remove('layer-import-status-error');
  layerImportStatus.textContent = 'Cargando ' + files.length + (files.length === 1 ? ' archivo…' : ' archivos…');
  for (var index = 0; index < files.length; index++) {
    try {
      await importLocalLayer(files[index]);
    } catch (error) {
      console.error('No se pudo cargar ' + files[index].name + ':', error);
      errors.push(error.message || ('No se pudo cargar ' + files[index].name));
    }
  }
  localLayerFiles.value = '';
  var addedLayerCount = importedLayerCounter - initialLayerCount;
  if (errors.length) {
    layerImportStatus.classList.add('layer-import-status-error');
    layerImportStatus.textContent = (addedLayerCount ? addedLayerCount + ' capas agregadas. ' : '') + errors.join(' ');
  } else {
    layerImportStatus.textContent = addedLayerCount + (addedLayerCount === 1 ? ' capa agregada al mapa.' : ' capas agregadas al mapa.');
  }
});

var basemaps = {
  'Imagen satelital': Esri_WorldImagery,
  'Mapa vial': Esri_WorldStreetMap
};

var activeTool = 'move';
// La vista Street View funciona mediante Google Maps sin requerir API key.
var GOOGLE_MAPS_EMBED_API_KEY = '';
var streetViewPanel = document.getElementById('street-view-panel');
var streetViewFrame = document.getElementById('street-view-frame');
var streetViewMessage = document.getElementById('street-view-message');
var streetViewButton = document.querySelector('[data-tool="streetview"]');
var coordinateReadout = document.getElementById('map-coordinate');
var toolHint = document.getElementById('tool-hint');
var streetViewMarker = null;
var streetViewAbortController = null;
var streetViewActive = false;
var streetViewLocationLabel = document.createElement('small');
streetViewLocationLabel.className = 'street-view-location';
streetViewLocationLabel.textContent = 'Seleccione una ubicación';
if (streetViewPanel.querySelector('.street-view-header')) {
  streetViewPanel.querySelector('.street-view-header').appendChild(streetViewLocationLabel);
}

map.on('mousemove', function (event) {
  if (!streetViewActive) {
    coordinateReadout.textContent = event.latlng.lat.toFixed(5) + '°, ' + event.latlng.lng.toFixed(5) + '°';
  }
});
map.on('mouseout', function () {
  if (!streetViewActive) coordinateReadout.textContent = 'Seleccione una ubicación';
});

function getPegmanIcon() {
  return L.divIcon({
    className: 'pegman-marker',
    iconSize: [46, 58],
    iconAnchor: [23, 58],
    html: '<span class="pegman-label">Arrastra a una calle</span><span class="pegman-shadow"></span><span class="pegman-figure" aria-hidden="true"><svg viewBox="0 0 48 60"><ellipse cx="24" cy="52" rx="10" ry="3" fill="rgba(0,0,0,.18)"/><circle cx="24" cy="13" r="8" fill="#ffda44" stroke="#fff" stroke-width="2"/><path d="M16 21h16l3 18-7 2-4-11-4 11-7-2 3-18Z" fill="#ffda44" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="m16 39-8 13m24-13 8 13" fill="none" stroke="#ffda44" stroke-width="5" stroke-linecap="round"/></svg></span>'
  });
}

function reverseStreetName(latlng) {
  if (streetViewAbortController) streetViewAbortController.abort();
  streetViewAbortController = new AbortController();

  fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(latlng.lat) + '&lon=' + encodeURIComponent(latlng.lng) + '&zoom=18&addressdetails=1&accept-language=es', {
    headers: { 'Accept': 'application/json' },
    signal: streetViewAbortController.signal
  }).then(function (response) {
    if (!response.ok) throw new Error('No se pudo consultar la vía');
    return response.json();
  }).then(function (data) {
    var address = data.address || {};
    var road = address.road || address.pedestrian || address.residential || address.neighbourhood || address.suburb || 'Vía no identificada';
    var district = address.suburb || address.neighbourhood || 'Villa Hermosa';
    streetViewMessage.textContent = road + ' · ' + district;
    streetViewLocationLabel.textContent = road;
  }).catch(function (error) {
    if (error.name !== 'AbortError') {
      streetViewMessage.textContent = 'Ubicación encontrada · identificando vía…';
      streetViewLocationLabel.textContent = latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5);
    }
  });
}

function updateStreetView(latlng) {
  if (!latlng) latlng = map.getCenter();
  var location = latlng.lat.toFixed(6) + ',' + latlng.lng.toFixed(6);
  streetViewPanel.classList.remove('hidden');
  streetViewMessage.classList.remove('hidden');
  streetViewFrame.classList.add('hidden');
  streetViewMessage.innerHTML = 'Buscando el panorama más cercano…';
  reverseStreetName(latlng);

  var panoramaUrl = 'https://www.mapillary.com/app/?lat=' + latlng.lat + '&lng=' + latlng.lng + '&z=18&focus=map&pause=0';

  streetViewFrame.onload = function () {
    streetViewMessage.classList.add('hidden');
    streetViewFrame.classList.remove('hidden');
  };
  streetViewFrame.src = panoramaUrl;

  if (!streetViewMarker) {
    streetViewMarker = L.marker(latlng, {
      icon: getPegmanIcon(),
      draggable: true,
      zIndexOffset: 2000,
      keyboard: true,
      title: 'Arrastra el muñeco hasta una calle'
    }).addTo(map);
  } else {
    streetViewMarker.setLatLng(latlng);
  }

  streetViewMarker.off('dragstart dragend');
  streetViewMarker.on('dragstart', function () {
    streetViewPanel.classList.add('hidden');
  });
  streetViewMarker.on('dragend', function (event) {
    var latlng = event.target.getLatLng();
    streetViewPanel.classList.remove('hidden');
    streetViewMarker.setLatLng(latlng);
    updateStreetView(latlng);
  });
  coordinateReadout.textContent = latlng.lat.toFixed(5) + '°, ' + latlng.lng.toFixed(5) + '°';

  loadKartaViewPanorama(latlng).then(function (photoUrl) {
    if (photoUrl) {
      streetViewFrame.classList.remove('hidden');
      streetViewMessage.classList.add('hidden');
      streetViewFrame.src = 'about:blank';
      var imageData = document.getElementById('street-view-image-data');
      if (!imageData) {
        imageData = document.createElement('div');
        imageData.id = 'street-view-image-data';
        imageData.className = 'street-view-image-data';
        streetViewPanel.appendChild(imageData);
      }
      imageData.innerHTML = '<img src="' + photoUrl.replace(/"/g, '%22') + '" alt="Imagen panorámica callejera"><span>Fotografía de calle · ' + streetViewPhotoId + '</span>';
      imageData.classList.remove('hidden');
      return;
    }
    if (imageData = document.getElementById('street-view-image-data')) imageData.classList.add('hidden');
  });
}

function openStreetView() {
  streetViewActive = true;
  loadStreetViewCoverage();
  if (streetViewPanel) streetViewPanel.classList.add('hidden');
  if (streetViewFrame) streetViewFrame.src = '';

  // Nueva cobertura de Street View
  loadStreetViewCoverage();

  setStreetViewToolState(true);

  if (!streetViewMarker) {
    streetViewMarker = L.marker(map.getCenter(), {
      icon: getPegmanIcon(),
      draggable: true,
      zIndexOffset: 2000,
      keyboard: true,
      title: 'Arrastra el muñeco hasta una calle'
    }).addTo(map);
  } else {
    streetViewMarker.setLatLng(map.getCenter());
    if (!map.hasLayer(streetViewMarker)) streetViewMarker.addTo(map);
  }

  streetViewMarker.off('dragstart drag dragend');
  streetViewMarker.on('dragstart', function () {
    if (streetViewPanel) streetViewPanel.classList.add('hidden');
  });
  streetViewMarker.on('dragend', function (event) {
    updateStreetView(event.target.getLatLng());
  });

  if (toolHint) toolHint.textContent = 'Arrastra el muñeco amarillo hasta la calle que deseas visualizar.';
}

function closeStreetView() {
  streetViewPhotoRequestId++;
  setStreetViewToolState(false);
  clearStreetViewCoverage();
  streetViewActive = false;
  if (streetViewPanel) streetViewPanel.classList.add('hidden');
  if (streetViewFrame) streetViewFrame.src = '';
  if (streetViewMarker) {
    map.removeLayer(streetViewMarker);
    streetViewMarker = null;
  }
}

document.getElementById('street-view-close').addEventListener('click', closeStreetView);
map.on('moveend', function () {
  if (!streetViewPanel.classList.contains('hidden') && !streetViewMarker && streetViewActive) {
    updateStreetView(map.getCenter());
  }
  if (streetViewActive) loadStreetViewCoverage();
});

var drawLayerGroup = new L.FeatureGroup();
map.addLayer(drawLayerGroup);

var measureLine = null;
var measureStart = null;
var measurePopup = null;
function setActiveTool(tool) {
  activeTool = tool;

  document.querySelectorAll('.tool-btn').forEach(function (button) {
    button.classList.toggle('active', button.dataset.tool === tool);
  });

  var hints = {
    move: 'Arrastra el mapa para explorar el territorio.',
    measure: 'Selecciona dos ubicaciones para medir distancia.',
    marker: 'Haz clic en el mapa para agregar un punto.',
    polyline: 'Selecciona dos puntos para trazar una línea.',
    polygon: 'Selecciona tres puntos para trazar un polígono.',
    streetview: 'Vista compacta de Street View centrada en el mapa.',
    history: 'Explora imágenes satelitales históricas de la zona.'
  };
  if (toolHint) toolHint.textContent = hints[tool] || 'Selecciona una herramienta cartográfica.';

  if (tool === 'move') {
    map.getContainer().style.cursor = 'grab';
    map.dragging.enable();
    map.removeEventListener('click', handleMapClick);
    return;
  }

  map.getContainer().style.cursor = 'crosshair';
  map.dragging.disable();
  map.off('click', handleMapClick);
  map.on('click', handleMapClick);
}

function clearAllDrawings() {
  drawLayerGroup.clearLayers();
  if (measureLine) {
    map.removeLayer(measureLine);
    measureLine = null;
  }
  if (measurePopup) {
    measurePopup.remove();
    measurePopup = null;
  }
  measureStart = null;
}

function addMarker(latlng) {
  var marker = L.marker(latlng, {
    icon: L.divIcon({
      className: 'custom-pin',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(drawLayerGroup);

  marker.bindPopup('<strong>Punto</strong><br>Marcador creado.');
  marker.openPopup();
}

function addPolyline(points) {
  var line = L.polyline(points, {
    color: '#d7263d',
    weight: 4,
    opacity: 0.95
  }).addTo(drawLayerGroup);

  var length = line.getLength();
  line.bindPopup('<strong>Línea</strong><br>Longitud: ' + length.toFixed(1) + ' m');
  line.openPopup();
}

function addPolygon(points) {
  var polygon = L.polygon(points, {
    color: '#7b2cbf',
    fillColor: '#a78bfa',
    fillOpacity: 0.25,
    weight: 2
  }).addTo(drawLayerGroup);

  polygon.bindPopup('<strong>Polígono</strong><br>Área creada.');
  polygon.openPopup();
}

function handleMapClick(event) {
  var latlng = event.latlng;

  if (activeTool === 'marker') {
    addMarker(latlng);
    setActiveTool('move');
    return;
  }

  if (activeTool === 'measure') {
    if (!measureStart) {
      measureStart = latlng;
      measureLine = L.polyline([latlng, latlng], {
        color: '#d7263d',
        weight: 4,
        opacity: 0.9
      }).addTo(map);

      measurePopup = L.popup()
        .setLatLng(latlng)
        .setContent('Medición iniciada')
        .openOn(map);
      return;
    }

    var distance = measureStart.distanceTo(latlng);
    measureLine.setLatLngs([measureStart, latlng]);
    if (measurePopup) {
      measurePopup.remove();
    }
    measurePopup = L.popup()
      .setLatLng(latlng)
      .setContent('<strong>Distancia</strong><br>' + distance.toFixed(1) + ' m')
      .openOn(map);

    measureStart = null;
    setActiveTool('move');
    return;
  }

  if (activeTool === 'polyline') {
    if (!map._polylineDraft) {
      map._polylineDraft = [latlng];
      var draftLine = L.polyline([latlng, latlng], {
        color: '#d7263d',
        weight: 4,
        opacity: 0.9
      }).addTo(drawLayerGroup);
      map._polylineDraftLayer = draftLine;
      return;
    }

    map._polylineDraft.push(latlng);
    map._polylineDraftLayer.setLatLngs(map._polylineDraft);

    if (map._polylineDraft.length >= 2) {
      addPolyline(map._polylineDraft);
      map._polylineDraft = null;
      map._polylineDraftLayer = null;
      setActiveTool('move');
    }
    return;
  }

  if (activeTool === 'polygon') {
    if (!map._polygonDraft) {
      map._polygonDraft = [latlng];
      map._polygonDraftLayer = L.polygon([latlng, latlng, latlng], {
        color: '#7b2cbf',
        fillColor: '#a78bfa',
        fillOpacity: 0.25,
        weight: 2
      }).addTo(drawLayerGroup);
      return;
    }

    map._polygonDraft.push(latlng);
    map._polygonDraftLayer.setLatLngs(map._polygonDraft);

    if (map._polygonDraft.length >= 3) {
      addPolygon(map._polygonDraft);
      map._polygonDraft = null;
      map._polygonDraftLayer = null;
      setActiveTool('move');
    }
  }

  if (activeTool === 'streetview') {
    return;
  }
}

document.querySelectorAll('.tool-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    var tool = button.dataset.tool;

    if (tool === 'clear') {
      clearAllDrawings();
      setActiveTool('move');
      return;
    }

    if (tool === 'streetview') {
      if (streetViewActive) {
        closeStreetView();
      } else {
        openStreetView();
      }
      return;
    }

    if (tool === 'history') {
      setActiveTool('move');
      historyPanel.classList.remove('hidden');
      loadHistoryVersions().catch(function () {});
      return;
    }

    setActiveTool(tool);
  });
});

var streetViewToggle = document.getElementById('streetview-toggle');
var streetViewToolStatus = document.getElementById('streetview-tool-status');

function setStreetViewToolState(active) {
  if (streetViewToggle) streetViewToggle.checked = active;
  if (streetViewToolStatus) streetViewToolStatus.textContent = active ? 'Activado' : 'Desactivado';
  if (streetViewToggle && streetViewToggle.closest('.streetview-tool-section')) {
    streetViewToggle.closest('.streetview-tool-section').classList.toggle('active', active);
  }
}

if (streetViewToggle) {
  streetViewToggle.addEventListener('change', function () {
    if (streetViewToggle.checked) openStreetView();
    else closeStreetView();
  });
}

var streetViewRoadBase = Esri_WorldStreetMap;

var originalViasStyle = null;

function setAvailableViasActive(active) {
  if (active) {
    if (map.hasLayer(Esri_WorldImagery)) map.removeLayer(Esri_WorldImagery);
    if (!map.hasLayer(Esri_WorldStreetMap)) Esri_WorldStreetMap.addTo(map);
  } else {
    if (map.hasLayer(Esri_WorldStreetMap)) map.removeLayer(Esri_WorldStreetMap);
    if (!map.hasLayer(Esri_WorldImagery)) Esri_WorldImagery.addTo(map);
  }
}

// Cobertura de Street View
var streetViewCoverageLayer = null;
var streetViewCoverageRequest = null;

function clearStreetViewCoverage() {
  if (streetViewCoverageRequest) {
    streetViewCoverageRequest.abort();
    streetViewCoverageRequest = null;
  }
  if (streetViewCoverageLayer) {
    map.removeLayer(streetViewCoverageLayer);
    streetViewCoverageLayer = null;
  }
}

function loadStreetViewCoverage() {
  clearStreetViewCoverage();
  var viasConfig = villaLayerConfigs.find(function (config) { return config.id === 'vias-toggle'; });
  if (!viasConfig || !viasConfig.layer) return;
  var coverageGeoJson = viasConfig.layer.toGeoJSON();
  streetViewCoverageLayer = L.geoJSON(coverageGeoJson, {
    pane: 'streetViewCoveragePane',
    interactive: false,
    style: { color: '#1473e6', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }
  }).addTo(map);
}

var streetViewNavigation = null;

function addStreetViewNavigation() {
  if (streetViewNavigation) {
    streetViewNavigation.classList.remove('hidden');
    return;
  }
  streetViewNavigation = document.createElement('div');
  streetViewNavigation.className = 'street-view-navigation';
  streetViewNavigation.innerHTML = '<button type="button" data-nav="north" title="Norte">▲</button><button type="button" data-nav="west" title="Oeste">◀</button><button type="button" data-nav="east" title="Este">▶</button><button type="button" data-nav="south" title="Sur">▼</button>';
  streetViewNavigation.addEventListener('click', function (event) {
    var button = event.target.closest('[data-nav]');
    if (!button || !streetViewMarker) return;
    var point = streetViewMarker.getLatLng();
    var nextPoint = L.latLng(point.lat, point.lng);
    var step = 0.00035;
    if (button.dataset.nav === 'north') nextPoint.lat += step;
    if (button.dataset.nav === 'south') nextPoint.lat -= step;
    if (button.dataset.nav === 'east') nextPoint.lng += step;
    if (button.dataset.nav === 'west') nextPoint.lng -= step;
    updateStreetView(nextPoint);
  });
  streetViewPanel.appendChild(streetViewNavigation);
}

addStreetViewNavigation();

var streetViewPhotoId = null;
var streetViewPhotoRequestId = 0;

async function loadKartaViewPanorama(latlng) {
  var radius = 500;
  var url = 'https://api.kartaview.org/2.0/photo/?lat=' + latlng.lat + '&lng=' + latlng.lng + '&zoomLevel=18&radius=' + radius + '&join=sequence&orderBy=id&orderDirection=desc';
  try {
    var response = await fetch(url);
    if (!response.ok) return null;
    var payload = await response.json();
    var photos = payload.result && payload.result.data ? payload.result.data : [];
    if (!photos.length) return null;
    var photo = photos[0];
    streetViewPhotoId = photo.id;
    return photo.fileurlProc || photo.fileurl || photo.fileurlTh || null;
  } catch (error) {
    return null;
  }
}

var streetViewLocalMap = null;

function loadLocalStreetFallback(latlng) {
  var fallback = document.getElementById('street-view-image-data');
  if (!fallback) {
    fallback = document.createElement('div');
    fallback.id = 'street-view-image-data';
    fallback.className = 'street-view-image-data street-view-fallback';
    fallback.innerHTML = '<div id="street-view-local-map"></div><img class="street-view-photo hidden" alt="Fotografía panorámica de la vía"><span class="street-view-caption">Sin fotografía panorámica · Mapa vial del entorno</span>';
    streetViewPanel.appendChild(fallback);
  }
  fallback.classList.remove('has-photo');
  fallback.classList.remove('hidden');
  var previousPhoto = fallback.querySelector('.street-view-photo');
  if (previousPhoto) {
    previousPhoto.classList.add('hidden');
    previousPhoto.removeAttribute('src');
  }
  fallback.querySelector('.street-view-caption').textContent = 'Sin fotografía panorámica · Mapa vial del entorno';
  streetViewFrame.classList.add('hidden');

  if (!streetViewLocalMap) {
    streetViewLocalMap = L.map('street-view-local-map', { zoomControl: true, attributionControl: false }).setView([latlng.lat, latlng.lng], 16);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(streetViewLocalMap);
  } else {
    streetViewLocalMap.setView([latlng.lat, latlng.lng], 16);
  }
  setTimeout(function () { if (streetViewLocalMap) streetViewLocalMap.invalidateSize(); }, 100);
}

// Nueva función para cargar el mapa local de Street View
function loadStreetViewLocalMap(latlng) {
  if (!latlng) latlng = map.getCenter();
  var location = latlng.lat.toFixed(6) + ',' + latlng.lng.toFixed(6);
  streetViewPanel.classList.remove('hidden');
  streetViewMessage.classList.remove('hidden');
  streetViewFrame.classList.add('hidden');
  streetViewMessage.innerHTML = 'Buscando el panorama más cercano…';
  reverseStreetName(latlng);

  // Mostrar el mapa local en lugar de Mapillary
  loadLocalStreetFallback(latlng);

  if (!streetViewMarker) {
    streetViewMarker = L.marker(latlng, {
      icon: getPegmanIcon(),
      draggable: true,
      zIndexOffset: 2000,
      keyboard: true,
      title: 'Arrastra el muñeco hasta una calle'
    }).addTo(map);
  } else {
    streetViewMarker.setLatLng(latlng);
  }

  streetViewMarker.off('dragstart dragend');
  streetViewMarker.on('dragstart', function () {
    streetViewPanel.classList.add('hidden');
  });
  streetViewMarker.on('dragend', function (event) {
    var latlng = event.target.getLatLng();
    streetViewPanel.classList.remove('hidden');
    streetViewMarker.setLatLng(latlng);
    updateStreetView(latlng);
  });
  coordinateReadout.textContent = latlng.lat.toFixed(5) + '°, ' + latlng.lng.toFixed(5) + '°';
}

// Modificación en la función updateStreetView para usar el mapa local
function updateStreetView(latlng) {
  if (!latlng) latlng = map.getCenter();
  streetViewPanel.classList.remove('hidden');
  streetViewMessage.classList.add('hidden');
  streetViewFrame.classList.remove('hidden');
  var imageData = document.getElementById('street-view-image-data');
  if (imageData) imageData.classList.add('hidden');
  reverseStreetName(latlng);
  streetViewFrame.src = 'https://maps.google.com/maps?q=&layer=c&cbll=' + encodeURIComponent(latlng.lat + ',' + latlng.lng) + '&cbp=12%2C0%2C0%2C0%2C0&output=svembed';

  if (!streetViewMarker) {
    streetViewMarker = L.marker(latlng, {
      icon: getPegmanIcon(),
      draggable: true,
      zIndexOffset: 2000,
      keyboard: true,
      title: 'Arrastra el muñeco hasta una calle'
    }).addTo(map);
  } else {
    streetViewMarker.setLatLng(latlng);
  }

  streetViewMarker.off('dragstart dragend');
  streetViewMarker.on('dragstart', function () {
    streetViewPanel.classList.add('hidden');
  });
  streetViewMarker.on('dragend', function (event) {
    var latlng = event.target.getLatLng();
    streetViewPanel.classList.remove('hidden');
    streetViewMarker.setLatLng(latlng);
    updateStreetView(latlng);
  });
  coordinateReadout.textContent = latlng.lat.toFixed(5) + '°, ' + latlng.lng.toFixed(5) + '°';
}


