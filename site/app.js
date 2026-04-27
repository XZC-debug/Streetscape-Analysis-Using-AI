const neighborhoodConfig = {
  CALLOWHILL: {
    label: "Callowhill",
    outputsDir: "../result-yolo/CALLOWHILL/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "A compact Center City edge case with a smaller image pool and visible signal clusters."
  },
  "Center City": {
    label: "Center City",
    outputsDir: "../result-yolo/Center City/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "Dense downtown context where traffic-light detections are frequent and sidewalk geometry is highly connected."
  },
  CHINATOWN: {
    label: "Chinatown",
    outputsDir: "../result-yolo/CHINATOWN/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "A tight street grid with active intersections and short block structure."
  },
  EAST_KENSINGTON: {
    label: "East Kensington",
    outputsDir: "../result-yolo/EAST_KENSINGTON/outputs",
    sidewalkFile: "../regional_data/kensington_sidewalks.geojson",
    blurb: "Kensington-area deployment with a stronger stop-sign presence in the current detections."
  },
  FISHTOWN: {
    label: "Fishtown",
    outputsDir: "../result-yolo/FISHTOWN/outputs",
    sidewalkFile: "../regional_data/kensington_sidewalks.geojson",
    blurb: "The largest Street View sample among the deployment neighborhoods in this repository."
  },
  KENSINGTON: {
    label: "Kensington",
    outputsDir: "../result-yolo/KENSINGTON/outputs",
    sidewalkFile: "../regional_data/kensington_sidewalks.geojson",
    blurb: "A neighborhood where stop-sign detections remain comparatively common across the sampled views."
  },
  LOGAN_SQUARE: {
    label: "Logan Square",
    outputsDir: "../result-yolo/LOGAN_SQUARE/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "High traffic-light detection counts in a large center-city-adjacent sample."
  },
  OLD_CITY: {
    label: "Old City",
    outputsDir: "../result-yolo/OLD_CITY/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "Historic street fabric with a dense sidewalk backdrop and frequent control points."
  },
  POINT_BREEZE: {
    label: "Point Breeze",
    outputsDir: "../result-yolo/POINT_BREEZE/outputs",
    sidewalkFile: "../regional_data/south_philadelphia_sidewalks.geojson",
    blurb: "South Philadelphia deployment area with a more residential street pattern."
  },
  RITTENHOUSE: {
    label: "Rittenhouse",
    outputsDir: "../result-yolo/RITTENHOUSE/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "Center City west conditions with a tight, mature sidewalk network."
  },
  SOCIETY_HILL: {
    label: "Society Hill",
    outputsDir: "../result-yolo/SOCIETY_HILL/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "Historic center-city neighborhood with dense intersections and narrower streets."
  },
  UNIVERSITY_CITY: {
    label: "University City",
    outputsDir: "../result-yolo/UNIVERSITY_CITY/outputs",
    sidewalkFile: "../regional_data/west_philadelphia_sidewalks.geojson",
    blurb: "Key pilot context tied to training and deployment discussion in the presentation."
  },
  WASHINGTON_SQUARE_WEST: {
    label: "Washington Square West",
    outputsDir: "../result-yolo/WASHINGTON_SQUARE_WEST/outputs",
    sidewalkFile: "../regional_data/center_city_sidewalks.geojson",
    blurb: "Dense central grid where sidewalk continuity and control density are both visible."
  },
  WEST_KENSINGTON: {
    label: "West Kensington",
    outputsDir: "../result-yolo/WEST_KENSINGTON/outputs",
    sidewalkFile: "../regional_data/kensington_sidewalks.geojson",
    blurb: "Completes the Kensington cluster with shared sidewalk context and local detection differences."
  }
};

let map = null;

const layerState = {
  sidewalks: null,
  intersections: null,
  trafficLights: null,
  stopSigns: null
};

const elements = {
  select: document.getElementById("neighborhood-select"),
  summary: document.getElementById("neighborhood-summary"),
  featurePanel: document.getElementById("feature-panel"),
  coverageChart: document.getElementById("coverage-chart"),
  widthSummary: document.getElementById("width-summary"),
  trainingHistory: document.getElementById("training-history"),
  toggleSidewalks: document.getElementById("toggle-sidewalks"),
  toggleIntersections: document.getElementById("toggle-intersections"),
  toggleTraffic: document.getElementById("toggle-traffic"),
  toggleStopSigns: document.getElementById("toggle-stop-signs")
};

const numberFormatter = new Intl.NumberFormat("en-US");
const bundledData = window.STREETSCAPE_DATA;
const metrics = bundledData?.metrics ?? {
  detectionSummary: [],
  detectionMetrics: [],
  crossingWidths: [],
  trainingHistory: []
};

try {
  init();
} catch (error) {
  console.error(error);
  elements.summary.innerHTML = `
    <h3>Data load issue</h3>
    <p>The bundled data could not be loaded. Make sure <code>site/data-bundle.js</code> is present next to this page.</p>
  `;
}

function init() {
  if (!bundledData?.neighborhoods) {
    throw new Error("Missing bundled site data");
  }
  if (!window.L) {
    renderMapUnavailable(
      "Leaflet did not load. This page currently depends on online CDN assets, and the in-app browser may be blocking or failing to fetch them from a file:// page."
    );
    return;
  }

  map = window.L.map("map", {
    zoomControl: false,
    preferCanvas: true
  }).setView([39.9526, -75.1652], 13);

  window.L.control.zoom({ position: "bottomright" }).addTo(map);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
  }).addTo(map);

  populateNeighborhoodSelect();
  bindControls();

  renderCoverageChart();
  renderWidthSummary();
  renderTrainingHistory();
  loadNeighborhood(elements.select.value);
}

function populateNeighborhoodSelect() {
  const allOption = document.createElement("option");
  allOption.value = "__ALL__";
  allOption.textContent = "All neighborhoods";
  elements.select.appendChild(allOption);

  Object.keys(neighborhoodConfig).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = neighborhoodConfig[key].label;
    elements.select.appendChild(option);
  });

  elements.select.value = "__ALL__";
}

function bindControls() {
  elements.select.addEventListener("change", () => {
    loadNeighborhood(elements.select.value);
  });

  elements.toggleSidewalks.addEventListener("change", syncLayerVisibility);
  elements.toggleIntersections.addEventListener("change", syncLayerVisibility);
  elements.toggleTraffic.addEventListener("change", syncLayerVisibility);
  elements.toggleStopSigns.addEventListener("change", syncLayerVisibility);
}

function mergeAllNeighborhoods() {
  const merged = {
    sidewalks: { type: "FeatureCollection", features: [] },
    intersections: { type: "FeatureCollection", features: [] },
    trafficLights: { type: "FeatureCollection", features: [] },
    stopSigns: { type: "FeatureCollection", features: [] }
  };
  for (const key of Object.keys(bundledData.neighborhoods)) {
    const nd = bundledData.neighborhoods[key];
    merged.sidewalks.features.push(...nd.sidewalks.features);
    merged.intersections.features.push(...nd.intersections.features);
    merged.trafficLights.features.push(...nd.trafficLights.features);
    merged.stopSigns.features.push(...nd.stopSigns.features);
  }
  return merged;
}

function loadNeighborhood(neighborhood) {
  if (!map) return;

  let sidewalks, intersections, trafficLights, stopSigns;

  if (neighborhood === "__ALL__") {
    ({ sidewalks, intersections, trafficLights, stopSigns } = mergeAllNeighborhoods());
  } else {
    const config = neighborhoodConfig[neighborhood];
    const neighborhoodData = bundledData.neighborhoods[neighborhood];
    if (!config || !neighborhoodData) {
      throw new Error(`No bundled data for neighborhood: ${neighborhood}`);
    }
    ({ sidewalks, intersections, trafficLights, stopSigns } = neighborhoodData);
  }

  const isAll = neighborhood === "__ALL__";
  const r = isAll ? 3 : 6;

  clearMapLayers();

  layerState.sidewalks = L.geoJSON(sidewalks, {
    style: {
      color: "#6b7280",
      weight: 1,
      opacity: 0.22
    }
  });

  layerState.intersections = L.geoJSON(intersections, {
    pointToLayer: (_, latlng) => L.circleMarker(latlng, {
      radius: r,
      fillColor: "#0f1720",
      fillOpacity: 0.8,
      color: "#fffdf7",
      weight: isAll ? 0.5 : 1.5
    }),
    onEachFeature: (feature, layer) => {
      layer.on("click", () => renderFeaturePanel({
        title: "Detected intersection",
        description: "Street View sampling was generated around this intersection candidate.",
        rows: [
          { label: "Connected roads", value: feature.properties.num_roads },
          { label: "Latitude", value: Number(feature.properties.lat).toFixed(6) },
          { label: "Longitude", value: Number(feature.properties.lon).toFixed(6) }
        ],
        streetViewUrl: streetViewUrl(feature.properties.lat, feature.properties.lon)
      }));
    }
  });

  layerState.trafficLights = L.geoJSON(trafficLights, {
    pointToLayer: (_, latlng) => L.circleMarker(latlng, {
      radius: isAll ? 3 : 7,
      fillColor: "#ffb347",
      fillOpacity: 0.92,
      color: "#5a3c06",
      weight: isAll ? 0.5 : 1.3
    }),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      layer.on("click", () => renderFeaturePanel({
        title: "Traffic-light detection",
        description: "Detection attributes are attached to the Street View sample point used for this observation.",
        rows: [
          { label: "Point ID", value: props.point_id },
          { label: "Intersection index", value: props.intersection_idx },
          { label: "Arm direction", value: `${props.arm_direction} deg` },
          { label: "Street View heading", value: `${props.heading} deg` },
          { label: "Traffic lights", value: props.num_traffic_lights },
          { label: "Stop signs", value: props.num_stop_signs || 0 },
          { label: "Pano date", value: props.gsv_date || "n/a" }
        ],
        streetViewUrl: streetViewUrl(feature.geometry.coordinates[1], feature.geometry.coordinates[0], props.heading)
      }));
    }
  });

  layerState.stopSigns = L.geoJSON(stopSigns, {
    pointToLayer: (_, latlng) => L.circleMarker(latlng, {
      radius: isAll ? 3 : 7,
      fillColor: "#d95d39",
      fillOpacity: 0.94,
      color: "#fff1ed",
      weight: isAll ? 0.5 : 1.3
    }),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      layer.on("click", () => renderFeaturePanel({
        title: "Stop-sign detection",
        description: "This point records a stop-sign observation from the neighborhood Street View run.",
        rows: [
          { label: "Point ID", value: props.point_id },
          { label: "Intersection index", value: props.intersection_idx },
          { label: "Arm direction", value: `${props.arm_direction} deg` },
          { label: "Street View heading", value: `${props.heading} deg` },
          { label: "Stop signs", value: props.num_stop_signs || 0 },
          { label: "Traffic lights", value: props.num_traffic_lights || 0 },
          { label: "Pano date", value: props.gsv_date || "n/a" }
        ],
        streetViewUrl: streetViewUrl(feature.geometry.coordinates[1], feature.geometry.coordinates[0], props.heading)
      }));
    }
  });

  syncLayerVisibility();
  fitToVisibleData();
  renderNeighborhoodSummary(neighborhood, intersections, trafficLights, stopSigns);
  resetFeaturePanel();
}

function syncLayerVisibility() {
  if (!map) return;
  applyLayerVisibility(layerState.sidewalks, elements.toggleSidewalks.checked);
  applyLayerVisibility(layerState.intersections, elements.toggleIntersections.checked);
  applyLayerVisibility(layerState.trafficLights, elements.toggleTraffic.checked);
  applyLayerVisibility(layerState.stopSigns, elements.toggleStopSigns.checked);
}

function applyLayerVisibility(layer, visible) {
  if (!layer) return;
  if (visible) {
    if (!map.hasLayer(layer)) {
      layer.addTo(map);
    }
  } else if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
}

function fitToVisibleData() {
  const visibleLayers = Object.values(layerState).filter((layer) => layer && map.hasLayer(layer));
  const bounds = visibleLayers
    .map((layer) => layer.getBounds?.())
    .filter((layerBounds) => layerBounds && layerBounds.isValid());

  if (bounds.length === 0) return;

  const merged = bounds.reduce((acc, current) => acc.extend(current), bounds[0]);
  map.fitBounds(merged.pad(0.08), { animate: false });
}

function clearMapLayers() {
  if (!map) return;
  Object.values(layerState).forEach((layer) => {
    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
}

function renderNeighborhoodSummary(neighborhood, intersections, trafficLights, stopSigns) {
  if (neighborhood === "__ALL__") {
    const totalImages = metrics.detectionSummary.reduce((sum, row) => sum + Number(row.total_images || 0), 0);
    elements.summary.innerHTML = `
      <h3>All neighborhoods</h3>
      <p>Combined view across all ${Object.keys(neighborhoodConfig).length} deployment neighborhoods.</p>
      <p><strong>${numberFormatter.format(intersections.features.length)}</strong> detected intersections</p>
      <p><strong>${numberFormatter.format(trafficLights.features.length)}</strong> traffic-light points</p>
      <p><strong>${numberFormatter.format(stopSigns.features.length)}</strong> stop-sign points</p>
      ${totalImages > 0 ? `<p><strong>${numberFormatter.format(totalImages)}</strong> Street View images processed</p>` : ""}
    `;
    return;
  }

  const summaryRow = metrics.detectionSummary.find((row) => row.neighborhood === neighborhood);
  const metricRow = metrics.detectionMetrics.find((row) => row.Neighborhood === neighborhood);

  elements.summary.innerHTML = `
    <h3>${neighborhoodConfig[neighborhood].label}</h3>
    <p>${neighborhoodConfig[neighborhood].blurb}</p>
    <p><strong>${numberFormatter.format(intersections.features.length)}</strong> detected intersections</p>
    <p><strong>${numberFormatter.format(trafficLights.features.length)}</strong> traffic-light points</p>
    <p><strong>${numberFormatter.format(stopSigns.features.length)}</strong> stop-sign points</p>
    ${
      summaryRow
        ? `<p><strong>${numberFormatter.format(summaryRow.total_images)}</strong> Street View images processed</p>`
        : ""
    }
    ${
      metricRow
        ? `<p>Traffic-light detection rate: <strong>${metricRow["TL Detection Rate (%)"]}%</strong><br>Stop-sign detection rate: <strong>${metricRow["SS Detection Rate (%)"]}%</strong></p>`
        : ""
    }
  `;
}

function resetFeaturePanel() {
  elements.featurePanel.innerHTML = `
    <p class="feature-panel-tag">Selection</p>
    <h3>Map feature details</h3>
    <p>Click a point on the map to inspect model outputs, location details, and Street View links.</p>
  `;
}

function renderFeaturePanel({ title, description, rows, streetViewUrl }) {
  const rowsMarkup = rows.map((row) => `
    <div class="feature-meta-row">
      <span class="feature-meta-label">${escapeHtml(String(row.label))}</span>
      <span class="feature-meta-value">${escapeHtml(String(row.value))}</span>
    </div>
  `).join("");

  elements.featurePanel.innerHTML = `
    <p class="feature-panel-tag">Selection</p>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(description)}</p>
    <div class="feature-meta">${rowsMarkup}</div>
    <a class="feature-link" href="${streetViewUrl}" target="_blank" rel="noreferrer">Open in Google Street View</a>
  `;
}

function renderCoverageChart() {
  const rows = [...metrics.detectionSummary]
    .sort((a, b) => Number(b.total_tl_detections) - Number(a.total_tl_detections))
    .slice(0, 7);

  const maxValue = Math.max(...rows.map((row) => Number(row.total_tl_detections)));

  elements.coverageChart.innerHTML = rows.map((row) => {
    const trafficWidth = (Number(row.total_tl_detections) / maxValue) * 100;
    const stopShare = Number(row.total_ss_detections) / Math.max(Number(row.total_tl_detections), 1) * 100;
    return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(row.neighborhood)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${trafficWidth}%;"></div>
          <div class="bar-fill bar-secondary" style="width:${Math.min(trafficWidth * stopShare / 100, 100)}%; opacity:0.9;"></div>
          <div class="bar-value">${numberFormatter.format(Number(row.total_tl_detections))} TL / ${numberFormatter.format(Number(row.total_ss_detections))} SS</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderWidthSummary() {
  const widths = metrics.crossingWidths.map((row) => row.crossingWidthFt).sort((a, b) => a - b);
  const iqrValues = metrics.crossingWidths.map((row) => row.widthIqrFt).sort((a, b) => a - b);

  const summaryItems = [
    { label: "Median crossing width", value: `${median(widths).toFixed(1)} ft` },
    { label: "90th percentile width", value: `${percentile(widths, 0.9).toFixed(1)} ft` },
    { label: "Median width spread", value: `${median(iqrValues).toFixed(1)} ft IQR` },
    { label: "Valid approach records", value: numberFormatter.format(metrics.crossingWidths.length) }
  ];

  elements.widthSummary.innerHTML = summaryItems.map((item) => `
    <div class="width-pill">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderTrainingHistory() {
  elements.trainingHistory.innerHTML = metrics.trainingHistory.slice(0, 4).map((row) => `
    <div class="history-row">
      <div><strong>Epoch ${row.epoch}</strong></div>
      <div>Train loss ${row.trainLoss.toFixed(3)} | Val loss ${row.valLoss.toFixed(3)}</div>
      <div>Val dice ${row.valDice.toFixed(3)}</div>
    </div>
  `).join("");
}

function streetViewUrl(lat, lon, heading = 0) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&heading=${encodeURIComponent(heading)}`;
}

function median(values) {
  if (values.length === 0) return 0;
  const midpoint = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[midpoint - 1] + values[midpoint]) / 2
    : values[midpoint];
}

function percentile(values, target) {
  if (values.length === 0) return 0;
  const position = Math.min(values.length - 1, Math.max(0, Math.floor(values.length * target)));
  return values[position];
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMapUnavailable(message) {
  const mapElement = document.getElementById("map");
  mapElement.innerHTML = `
    <div style="height:100%;display:grid;place-items:center;padding:32px;background:#f6f1e8;color:#172126;text-align:left;">
      <div style="max-width:560px;">
        <p style="margin:0 0 10px;text-transform:uppercase;letter-spacing:0.08em;font-size:12px;font-weight:800;color:#0e7c86;">Map unavailable</p>
        <h3 style="margin:0 0 12px;font-size:28px;line-height:1.1;">The map library did not initialize.</h3>
        <p style="margin:0;color:#5c696a;line-height:1.7;">${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}
