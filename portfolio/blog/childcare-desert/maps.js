/*

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------------------------------
  // MAP 1: Neighborhood Ratio Map
  // -------------------------------------------------------------
  const mapRatio = new maplibregl.Map({
    container: "map-ratio",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-79.38329, 43.71149],
    zoom: 9.8,
    bearing: -16.8,
  });

  mapRatio.addControl(new maplibregl.NavigationControl(), "top-right");

  mapRatio.on("load", () => {
    mapRatio.addSource("neighbourhood-ratio", {
      type: "geojson",
      data: "./data/neighbourhood_childcare.geojson",
    });

    mapRatio.addSource("childcare-center", {
      type: "geojson",
      data: "./data/childcarecenter.geojson",
    });

    // Add Layers
    mapRatio.addLayer({
      id: "ratio-layer",
      type: "fill",
      source: "neighbourhood-ratio",
      layout: { visibility: "visible" },
      paint: {
        // Fill color driven by the 'desert_ratio' property in your GeoJSON
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "Neighbourhood_ChildCare_Summarized.desert_ratio"],
          0.0,
          "#BE1A1A",
          0.25,
          "#D0311E",
          0.5,
          "#FB6C00",
          0.75,
          "#f99e37",
          1.0,
          "#F7D87F",
        ],
        "fill-opacity": 0.8,
        "fill-outline-color": "#ffffff",
      },
    });

    mapRatio.addLayer({
      id: "centers-points-layer",
      type: "circle",
      source: "childcare-center",
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": 3.5,
        "circle-color": "hsl(236, 69%, 21%)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Search

    const searchInput = document.getElementById("neighborhood-search");
    const suggestionsList = document.getElementById("search-suggestions");
    const clearBtn = document.getElementById("clear-search-btn");

    let neighborhoodFeatures = [];

    function initSearchIndex() {
      const features = mapRatio.querySourceFeatures("neighbourhood-ratio", {
        sourceLayer: "neighbourhood-ratio",
      });

      // Store unique feature objects by AREA_NAME
      const uniqueMap = new Map();
      features.forEach((feat) => {
        const name =
          feat.properties["AREA_NAME"] || feat.properties["Neighbourhood"];
        if (name && !uniqueMap.has(name)) {
          uniqueMap.set(name, feat);
        }
      });

      neighborhoodFeatures = Array.from(uniqueMap.values());
    }

    mapRatio.once("idle", initSearchIndex);

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        suggestionsList.innerHTML = "";

        if (query.length === 0) {
          suggestionsList.style.display = "none";
          clearBtn.style.display = "none";
          return;
        }

        clearBtn.style.display = "block";

        // Filter features where AREA_NAME includes search query
        const matches = neighborhoodFeatures.filter((feat) => {
          const name = (
            feat.properties["AREA_NAME"] ||
            feat.properties["Neighbourhood"] ||
            ""
          ).toLowerCase();
          return name.includes(query);
        });

        if (matches.length === 0) {
          suggestionsList.style.display = "none";
          return;
        }

        matches.slice(0, 8).forEach((feat) => {
          // Limit to top 8 suggestions
          const name =
            feat.properties["AREA_NAME"] || feat.properties["Neighbourhood"];
          const li = document.createElement("li");
          li.textContent = name;

          // When a user selects a suggestion:
          li.addEventListener("click", () => {
            selectNeighborhood(feat, name);
          });

          suggestionsList.appendChild(li);
        });

        suggestionsList.style.display = "block";
      });
    }

    function selectNeighborhood(feature, name) {
      searchInput.value = name;
      suggestionsList.style.display = "none";

      // Calculate bounding box or geometry center
      const bounds = new maplibregl.LngLatBounds();

      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0].forEach((coord) =>
          bounds.extend(coord),
        );
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((poly) => {
          poly[0].forEach((coord) => bounds.extend(coord));
        });
      }

      mapRatio.fitBounds(bounds, {
        padding: 60,
        maxZoom: 13,
        duration: 1200,
      });

      if (mapRatio.getLayer("ratio-hover-border")) {
        mapRatio.setFilter("ratio-hover-border", [
          "==",
          ["get", "AREA_NAME"],
          name,
        ]);
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        suggestionsList.style.display = "none";
        clearBtn.style.display = "none";

        // Clear highlight border if active
        if (mapRatio.getLayer("ratio-hover-border")) {
          mapRatio.setFilter("ratio-hover-border", [
            "==",
            ["get", "AREA_NAME"],
            "",
          ]);
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".map-search-container")) {
        suggestionsList.style.display = "none";
      }
    });

    const btnAll = document.getElementById("filter-all");
    const btnSevere = document.getElementById("filter-severe");
    const btnModerate = document.getElementById("filter-moderate");

    function setActiveButton(activeBtn) {
      [btnAll, btnSevere, btnModerate].forEach((btn) => {
        if (btn) btn.classList.remove("active", "selected");
      });
      if (activeBtn) activeBtn.classList.add("active", "selected");
    }

    const propKey = "Neighbourhood_ChildCare_Summarized.desert_ratio";

    if (btnAll) {
      btnAll.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", null);
        setActiveButton(btnAll);
      });
    }

    if (btnSevere) {
      btnSevere.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", ["<", ["get", propKey], 0.25]);
        setActiveButton(btnSevere);
      });
    }

    if (btnModerate) {
      btnModerate.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", [
          "all",
          [">=", ["get", propKey], 0.25],
          ["<=", ["get", propKey], 0.75],
        ]);
        setActiveButton(btnModerate);
      });
    }

    // Pill Toggle Helper
    function setupPillToggle(buttonId, layerId) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;

      btn.addEventListener("click", () => {
        const visibility = mapRatio.getLayoutProperty(layerId, "visibility");

        if (visibility === "visible") {
          mapRatio.setLayoutProperty(layerId, "visibility", "none");
          btn.classList.remove("active");
          btn.classList.add("inactive", "selected");
        } else {
          mapRatio.setLayoutProperty(layerId, "visibility", "visible");
          btn.classList.remove("inactive", "selected");
          btn.classList.add("active", "selected");
        }
      });
    }

    setupPillToggle("toggle-centers", "centers-points-layer");

    // Hover popup on map
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    // 2. Change cursor to pointer and display popup on mousemove
    mapRatio.on("mousemove", "ratio-layer", (e) => {
      // Change mouse cursor to a pointer
      mapRatio.getCanvas().style.cursor = "pointer";

      if (e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties;

        // Retrieve attributes (Adjust property keys to match your GeoJSON)
        const neighName =
          props["Neighbourhood"] || props["AREA_NAME"] || "Neighbourhood";
        const ratioVal =
          props["Neighbourhood_ChildCare_Summarized.desert_ratio"];
        const capacityVal = props["SUM_childcare_capacity"] || "N/A";
        const popVal = props["years_0_4"] || "N/A";

        // Format ratio to 2 decimal places if numerical
        const formattedRatio =
          typeof ratioVal === "number" ? ratioVal.toFixed(2) : ratioVal;

        // Build Popup HTML Content
        const popupContent = `
      <div class="map-popup-content">
        <h4 class="popup-title">${neighName}</h4>
        <hr class="popup-divider">
        <p><strong>Desert Ratio:</strong> <span class="popup-highlight">${formattedRatio}</span></p>
        <p><strong>Total Capacity:</strong> ${capacityVal}</p>
        <p><strong>Population (0-4):</strong> ${popVal}</p>
      </div>
    `;

        // Position popup at cursor location and set content
        popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(mapRatio);
      }
    });

    // 3. Remove popup and reset cursor when mouse leaves the layer
    mapRatio.on("mouseleave", "ratio-layer", () => {
      mapRatio.getCanvas().style.cursor = "";
      popup.remove();
    });
  });

  // -------------------------------------------------------------
  // MAP 2: 10-Minute Walkability Gap Islands Map
  // -------------------------------------------------------------
  const mapWalkability = new maplibregl.Map({
    container: "map-walkability",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-79.38329, 43.71149],
    zoom: 9.8,
    bearing: -16.8,
  });

  mapWalkability.addControl(new maplibregl.NavigationControl(), "top-right");

  mapWalkability.on("load", () => {
    mapWalkability.addSource("neighbourhood", {
      type: "geojson",
      data: "./data/neighbourhood_childcare.geojson",
    });
    mapWalkability.addSource("childcare-center", {
      type: "geojson",
      data: "./data/childcarecenter.geojson",
    });
    mapWalkability.addSource("childcare-walk-desert", {
      type: "geojson",
      data: "./data/walkDesert.geojson",
    });
    mapWalkability.addSource("cchildcare-walk-area", {
      type: "geojson",
      data: "./data/walkArea.geojson",
    });

    mapWalkability.addLayer({
      id: "walkability-gaps-layer",
      type: "fill",
      source: "walkability-gaps-data",
      paint: {
        "fill-color": "#d90429",
        "fill-opacity": 0.6,
        "fill-outline-color": "#ffffff",
      },
    });

    mapWalkability.addLayer({
      id: "childcare-walk-desert",
      type: "fill",
      source: "childcare-walk-desert",
      layout: { visibility: "visible" },
      paint: {
        // Fill color driven by the 'desert_ratio' property in your GeoJSON
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "desert_ratio"],
          0.0,
          "#BE1A1A",
          0.25,
          "#D0311E",
          0.5,
          "#FB6C00",
          0.75,
          "#f99e37",
          1.0,
          "#F7D87F",
        ],
        "fill-opacity": 0.8,
        "fill-outline-color": "#ffffff",
      },
    });

    mapWalkability.addLayer({
      id: "neighbourhood",
      type: "line",
      source: "neighbourhood",
      layout: { visibility: "visible" },
      paint: {
        "line-color": "#27272781",
        "line-width": 1.5, // Adjust thickness as needed
        "line-opacity": 1.0,
      },
    });

    mapWalkability.addLayer({
      id: "centers-points-layer",
      type: "circle",
      source: "childcare-center",
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": 3.5,
        "circle-color": "hsl(236, 69%, 21%)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  });
});
*/

// blog/childcare-deserts/blog-post.js

/**
 *  SECTION 1: Map Utilities and Global Configurations
 * @param {string} containerId
 * @returns {maplibregl.Map}
 */

function createBaseMap(containerId) {
  const map = new maplibregl.Map({
    container: containerId,
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-79.38329, 43.71149],
    zoom: 9.8,
    bearing: -16.8,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  return map;
}

////////////////////////////////////////////////////////////
// SECTION 2: GENERIC GIS CONTROL HOOKS

/**
 * Mouse hovering on map properties
 * @param {maplibregl.Map} map
 * @param {string} layerId
 * @param {string} borderLayerId
 * @param {string} idField
 * @param {function} popupHTMLBuilder
 */

function setupLayerHover(
  map,
  layerId,
  borderLayerId,
  idField,
  popupHTMLBuilder,
) {
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  // Listens continuously as the cursor tracks across polgon bound
  map.on("mousemove", layerId, (e) => {
    map.getCanvas().style.cursor = "pointer";

    if (e.features.length > 0) {
      const feature = e.features[0];
      const name = feature.properties[idField];

      // Update the highlight line layer
      if (borderLayerId && map.getLayer(borderLayerId)) {
        map.setFilter(borderLayerId, ["==", ["get", idField], name || ""]);
      }

      // Inject popup content
      const content = popupHTMLBuilder(feature.properties);
      popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
    }
  });

  // Listens for when mouse leaves boundary matrix
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    popup.remove();

    if (borderLayerId && map.getLayer(borderLayerId)) {
      map.setFilter(borderLayerId, ["==", ["get", idField], ""]);
    }
  });
}

/**
 * Map Search setup
 * @param {maplibregl.Map} map
 * @param {string} sourceId
 * @param {Object} inputElements
 * @param {Arrag <string>} nameFields
 * @param {string} borderLayerId
 */

function setupMapSearch(
  map,
  sourceId,
  inputElements,
  nameFields,
  borderLayerId,
) {
  const searchInput = document.getElementById(inputElements.inputId);
  const suggestionsList = document.getElementById(inputElements.listId);
  const clearBtn = document.getElementById(inputElements.clearBtnId);

  if (!searchInput || !suggestionsList) return;

  let featureIndex = [];
  let selectedIndex = -1;

  const getFeatureName = (props) => {
    for (const field of nameFields) {
      if (props && props[field]) return props[field];
    }
    return "";
  };

  map.once("idle", () => {
    const rawFeatures = map.querySourceFeatures(sourceId, {
      sourceLayer: sourceId,
    });
    const uniqueMap = new Map();
    rawFeatures.forEach((feat) => {
      const name = getFeatureName(feat.properties);
      if (name && !uniqueMap.has(name)) uniqueMap.set(name, feat);
    });
    featureIndex = Array.from(uniqueMap.values());
  });

  function selectFeature(feat) {
    const name = getFeatureName(feat.properties);
    searchInput.value = name;
    suggestionsList.style.display = "none";
    selectedIndex = -1;

    const bounds = new maplibregl.LngLatBounds();
    const geometry = feat.geometry;

    if (geometry.type === "Polygon") {
      geometry.coordinates[0].forEach((coord) => bounds.extend(coord));
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((poly) => {
        poly[0].forEach((coord) => bounds.extend(coord));
      });
    }

    map.fitBounds(bounds, {
      padding: 60,
      maxZoom: 13,
      duration: 1200,
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    });

    if (borderLayerId && map.getLayer(borderLayerId)) {
      map.setFilter(borderLayerId, ["==", ["get", nameFields[0]], name]);
    }
  }

  function updateKeyboardHighlight(items) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add("selected-suggestion");
        item.scrollIntoView({ block: "nearest" }); // Auto-scroll list as user moves
      } else {
        item.classList.remove("selected-suggestion");
      }
    });
  }

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    suggestionsList.innerHTML = "";
    selectedIndex = -1;

    if (!query) {
      suggestionsList.style.display = "none";
      if (clearBtn) clearBtn.style.display = "none";
      return;
    }

    if (clearBtn) clearBtn.style.display = "block";

    const matches = featureIndex.filter((feat) =>
      getFeatureName(feat.properties).toLowerCase().includes(query),
    );

    if (matches.length === 0) {
      suggestionsList.style.display = "none";
      return;
    }

    matches.slice(0, 8).forEach((feat) => {
      const name = getFeatureName(feat.properties);
      const li = document.createElement("li");
      li.textContent = name;

      li.addEventListener("click", () => selectFeature(feat));

      li.addEventListener("mouseenter", () => {
        const items = suggestionsList.querySelectorAll("li");
        items.forEach((item) => item.classList.remove("selected-suggestion"));
        selectedIndex = -1;
      });

      li._feature = feat;
      suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = "block";
  });

  searchInput.addEventListener("keydown", (e) => {
    const items = suggestionsList.querySelectorAll("li");
    if (items.length === 0 || suggestionsList.style.display === "none") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateKeyboardHighlight(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateKeyboardHighlight(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        selectFeature(items[selectedIndex]._feature);
      } else if (items[0]) {
        // Default to first match if Enter is pressed without arrow keying
        selectFeature(items[0]._feature);
      }
    } else if (e.key === "Escape") {
      suggestionsList.style.display = "none";
      selectedIndex = -1;
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      suggestionsList.style.display = "none";
      clearBtn.style.display = "none";
      selectedIndex = -1;
      if (borderLayerId && map.getLayer(borderLayerId)) {
        map.setFilter(borderLayerId, ["==", ["get", nameFields[0]], ""]);
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".map-search-container")) {
      suggestionsList.style.display = "none";
      selectedIndex = -1;
    }
  });
}

/**
 * Layer selector toggle
 * @param {maplibregl.Map} map
 * @param {string} buttonId
 * @param {string} layerId
 */

function setupPillToggle(map, buttonId, layerId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener("click", () => {
    const visibility = map.getLayoutProperty(layerId, "visibility");

    // Toggle visibility states and sync corresponding active CSS UI tokens
    if (visibility === "visible") {
      map.setLayoutProperty(layerId, "visibility", "none");
      btn.classList.remove("active");
      btn.classList.add("inactive", "selected");
    } else {
      map.setLayoutProperty(layerId, "visibility", "visible");
      btn.classList.remove("inactive", "selected");
      btn.classList.add("active", "selected");
    }
  });
}

////////////////////////////////////////////////////////////////////////
// Section 3: Core Application

document.addEventListener("DOMContentLoaded", () => {
  ////////////////////////////////////////////////////////////////////////
  // Map 1: Neighbourhood supply/demand choropleth
  const mapRatio = createBaseMap("map-ratio");

  mapRatio.on("load", () => {
    mapRatio.addSource("neighbourhood-ratio", {
      type: "geojson",
      data: "./data/neighbourhood_childcare.geojson",
    });

    mapRatio.addSource("childcare-center", {
      type: "geojson",
      data: "./data/childcarecenter.geojson",
    });

    mapRatio.addLayer({
      id: "ratio-layer",
      type: "fill",
      source: "neighbourhood-ratio",
      layout: { visibility: "visible" },
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "Neighbourhood_ChildCare_Summarized.desert_ratio"],
          0.0,
          "#BE1A1A", // Extreme Shortage (Severe Desert)
          0.25,
          "#D0311E",
          0.5,
          "#FB6C00", // Moderate Gap Area
          0.75,
          "#f99e37",
          1.0,
          "#F7D87F", // Standard Stabilized Supply
        ],
        "fill-opacity": 0.8,
        "fill-outline-color": "#ffffff",
      },
    });

    mapRatio.addLayer({
      id: "ratio-hover-border",
      type: "line",
      source: "neighbourhood-ratio",
      paint: {
        "line-color": "#24292e",
        "line-width": 2.5,
      },
      // Expressions filter ensuring no outlines render initially
      filter: ["==", ["get", "AREA_NAME"], ""],
    });

    mapRatio.addLayer({
      id: "centers-points-layer",
      type: "circle",
      source: "childcare-center",
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": 3.5,
        "circle-color": "hsl(236, 69%, 21%)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Search bar
    setupMapSearch(
      mapRatio,
      "neighbourhood-ratio",
      {
        inputId: "neighborhood-search",
        listId: "search-suggestions",
        clearBtnId: "clear-search-btn",
      },
      ["AREA_NAME", "Neighbourhood"],
      "ratio-hover-border",
    );

    // Toggle buttons
    const btnAll = document.getElementById("filter-all");
    const btnSevere = document.getElementById("filter-severe");
    const btnModerate = document.getElementById("filter-moderate");
    const filterBtns = [btnAll, btnSevere, btnModerate];

    function setFilterButtonUI(activeBtn) {
      filterBtns.forEach((btn) => {
        if (btn) btn.classList.remove("active", "selected");
      });
      if (activeBtn) activeBtn.classList.add("active", "selected");
    }

    const propKey = "Neighbourhood_ChildCare_Summarized.desert_ratio";

    if (btnAll) {
      btnAll.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", null);
        setFilterButtonUI(btnAll);
      });
    }

    if (btnSevere) {
      btnSevere.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", ["<", ["get", propKey], 0.25]);
        setFilterButtonUI(btnSevere);
      });
    }

    if (btnModerate) {
      btnModerate.addEventListener("click", () => {
        mapRatio.setFilter("ratio-layer", [
          "all",
          [">=", ["get", propKey], 0.25],
          ["<=", ["get", propKey], 0.75],
        ]);
        setFilterButtonUI(btnModerate);
      });
    }

    setupPillToggle(mapRatio, "toggle-centers", "centers-points-layer");

    // Popup config
    setupLayerHover(
      mapRatio,
      "ratio-layer",
      "ratio-hover-border",
      "AREA_NAME",
      (props) => {
        const name =
          props["Neighbourhood"] || props["AREA_NAME"] || "Neighbourhood";
        const ratio = props["Neighbourhood_ChildCare_Summarized.desert_ratio"];
        const cap = props["SUM_childcare_capacity"] || "N/A";
        const pop = props["years_0_4"] || "N/A";
        const formattedRatio =
          typeof ratio === "number" ? ratio.toFixed(2) : ratio;

        return `
            <div class="map-popup-content">
                <h4 class="popup-title">${name}</h4>
                <hr class="popup-divider">
                <p><strong>Desert Ratio:</strong> <span class="popup-highlight">${formattedRatio}</span></p>
                <p><strong>Total Capacity:</strong> ${cap}</p>
                <p><strong>Population (0-4):</strong> ${pop}</p>
            </div>
            `;
      },
    );
  });

  ////////////////////////////////////////////////////////////////////////
  // Map 2: 10-minute walkability gap
  const mapWalkability = createBaseMap("map-walkability");

  mapWalkability.on("load", () => {
    mapWalkability.addSource("neighbourhood", {
      type: "geojson",
      data: "./data/neighbourhood_childcare.geojson",
    });
    mapWalkability.addSource("childcare-center", {
      type: "geojson",
      data: "./data/childcarecenter.geojson",
    });
    mapWalkability.addSource("childcare-walk-desert", {
      type: "geojson",
      data: "./data/walkDesert.geojson",
    });
    mapWalkability.addSource("childcare-walk-area", {
      type: "geojson",
      data: "./data/walkArea.geojson",
    });

    mapWalkability.addLayer({
      id: "walk-area-5min-layer",
      type: "fill",
      source: "childcare-walk-area",
      filter: ["==", ["get", "ToBreak"], 5],
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#87b42d",
        "fill-opacity": 0.8,
        "fill-outline-color": "#484949",
      },
    });

    mapWalkability.addLayer({
      id: "walk-area-10min-layer",
      type: "fill",
      source: "childcare-walk-area",
      filter: ["==", ["get", "ToBreak"], 10], // Filter for ToBreak = 10
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#649c81",
        "fill-opacity": 0.9,
        "fill-outline-color": "#484949",
      },
    });

    mapWalkability.addLayer({
      id: "childcare-walk-desert-layer",
      type: "fill",
      source: "childcare-walk-desert",
      layout: { visibility: "visible" },
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "desert_ratio"],
          0.0,
          "#BE1A1A",
          0.25,
          "#D0311E",
          0.5,
          "#FB6C00",
          0.75,
          "#f99e37",
          1.0,
          "#F7D87F",
        ],
        "fill-opacity": 0.9,
        "fill-outline-color": "#ffffff",
      },
    });

    mapWalkability.addLayer({
      id: "neighbourhood-outline",
      type: "line",
      source: "neighbourhood",
      layout: { visibility: "visible" },
      paint: {
        "line-color": "#272727",
        "line-width": 1.2,
        "line-opacity": 0.5, // Keeps boundaries structural but soft
      },
    });

    mapWalkability.addLayer({
      id: "walkability-centers-points",
      type: "circle",
      source: "childcare-center",
      layout: { visibility: "visible" },
      paint: {
        "circle-radius": 3.5,
        "circle-color": "hsl(236, 69%, 21%)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });

    mapWalkability.addLayer({
      id: "walkability-hover-border",
      type: "line",
      source: "childcare-walk-desert",
      paint: {
        "line-color": "#24292e",
        "line-width": 2.5,
      },
      filter: ["==", ["get", "AREA_NAME"], ""],
    });

    // Search bar
    setupMapSearch(
      mapWalkability,
      "neighbourhood",
      {
        inputId: "neighborhood-search-2",
        listId: "search-suggestions-2",
        clearBtnId: "clear-search-btn-2",
      },
      ["AREA_NAME", "Neighbourhood"],
    );

    setupPillToggle(mapWalkability, "toggle-walk-5", "walk-area-5min-layer");
    setupPillToggle(mapWalkability, "toggle-walk-10", "walk-area-10min-layer");
    setupPillToggle(
      mapWalkability,
      "toggle-walk-centers",
      "walkability-centers-points",
    );

    // Popup
    setupLayerHover(
      mapWalkability,
      "childcare-walk-desert-layer",
      "walkability-hover-border",
      "AREA_NAME",
      (props) => {
        const name =
          props["Neighbourhood"] || props["AREA_NAME"] || "Neighbourhood";
        const walkGap = props["walk_gap_pct"];
        const cap =
          props["SUM_childcare_capacity"] ||
          props["totalChildcareCapacity"] ||
          "N/A";
        const pop = props["years_0_4"] || props["totalPopulation 0-4"] || "N/A";

        // Format walk gap percentage (converts decimals like 0.42 to 42.0% or keeps raw strings)
        let formattedGap = "N/A";
        if (typeof walkGap === "number") {
          formattedGap =
            walkGap <= 1
              ? `${(walkGap * 100).toFixed(1)}%`
              : `${walkGap.toFixed(1)}%`;
        } else if (walkGap) {
          formattedGap = `${walkGap}%`;
        }

        return `
        <div class="map-popup-content">
          <h4 class="popup-title">${name}</h4>
          <hr class="popup-divider">
          <p><strong>Walkability Gap:</strong> <span class="popup-highlight">${formattedGap}</span></p>
          <p><strong>Total Capacity:</strong> ${cap}</p>
          <p><strong>Population (0-4):</strong> ${pop}</p>
        </div>
      `;
      },
    );
  });
});
