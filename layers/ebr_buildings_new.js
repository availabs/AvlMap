import React from "react"

// import store from "store"
// import { update } from "utils/redux-falcor/components/duck"
import { falcorGraph, falcorChunkerNice } from "store/falcorGraph"

import get from "lodash.get"

import {
    scaleQuantile,
    scaleQuantize
} from "d3-scale"
import { extent } from "d3-array"

import { fnum } from "utils/sheldusUtils"

import MapLayer from "components/AvlMap/MapLayer"

import { getColorRange } from "constants/color-ranges";
const LEGEND_COLOR_RANGE = getColorRange(5, "RdYlBu");

const IDENTITY = i => i;

class EBRLayer extends MapLayer {
  onAdd(map) {
    super.onAdd(map);

    const geoLevel = "cousubs";

    return falcorGraph.get(["geo", "36", geoLevel], ["parcel", "meta", ["prop_class", "owner_type"]])
      .then(res => res.json.geo['36'][geoLevel])
      .then(geoids => {
        return falcorChunkerNice(["geo", geoids, "name"])
          .then(() => {
            const graph = falcorGraph.getCache().geo;
            this.filters.area.domain = geoids.map(geoid => {
              return { value: geoid, name: graph[geoid].name }
            })
            .sort((a, b) => {
              const aCounty = a.value.slice(0, 5),
                bCounty = b.value.slice(0, 5);
              if (aCounty === bCounty) {
                return a.name < b.name ? -1 : 1;
              }
              return +aCounty - +bCounty;
            })
          })
          .then(() => {
            this.filters.owner_type.domain =
              get(falcorGraph.getCache(), ["parcel", "meta", "owner_type", "value"], [])
              .filter(({ name, value }) => name !== "Unknown")
              .sort((a, b) => +a.value - +b.value);
          })
      })
      // .then(() => store.dispatch(update(falcorGraph.getCache())))
      .then(() => this.doAction(["updateFilter", "area", ['3600101000']]))
  }
  onFilterFetch(filterName, oldValue, newValue) {
    if (filterName === "measure") {
      switch (newValue) {
        case "num_occupants":
          this.legend.format = IDENTITY;
          this.legend.title = "Number of Occupants";
          break;
        case "replacement_value":
          this.legend.format = fnum;
          this.legend.title = "Replacement Cost";
          break;
      }
    }
    if (filterName === "prop_category") {
      if (newValue.length === 0) {
        this.filters.prop_class.active = false;
        this.filters.prop_class.domain = [];
      }
      else {
        this.filters.prop_class.active = true;
        const propClasses = get(falcorGraph.getCache(), ["parcel", "meta", "prop_class", "value"], []),
          shouldFilter = this.makeCheckPropCategoryFilter();
        this.filters.prop_class.domain = propClasses.filter(({ name, value }) => !shouldFilter(value))
      }
    }
    return this.fetchData();
  }
  getBuildingIds() {
    const geoids = this.filters.area.value;

    if (!geoids.length) return Promise.resolve([]);

    return falcorGraph.get(["building", "byGeoid", geoids, "length"])
      .then(res => {
        let requests =  geoids.map(geoid => {
          const length = res.json.building.byGeoid[geoid].length;
          return ["building", "byGeoid", geoid, "byIndex", { from: 0, to: length-1}, "id"]
        })
        return requests;
      })
      .then(requests => {
        return falcorGraph.get(...requests)
          .then(res => {
            const buildingids = [],
              graph = get(falcorGraph.getCache(), ["building", "byGeoid"], {});

            geoids.forEach(geoid => {
              const byIndex = get(graph, [geoid, "byIndex"], {});

              Object.values(byIndex).forEach(({ id }) => {
                if (id.value) {
                  buildingids.push(id.value)
                }
              })
            })
            return buildingids;
          })
      })
  }
  fetchData() {
    return this.getBuildingIds()
      .then(buildingids => {
        if (!buildingids.length) return;

        return falcorChunkerNice(["building", "byId", buildingids, ["replacement_value", "owner_type", "prop_class", "num_occupants", "name", "type", "critical", "flood_zone"]])
      })
      .then(() => this.falcorCache = falcorGraph.getCache())
  }
  makeCheckPropCategoryFilter() {
    const propCategoryFilters = this.filters.prop_category.value;

    return prop_class => {
      let prop_category = 0;
      if (prop_class.length === 3) {
        prop_category = (+prop_class[0]) * 100;
      }
      return propCategoryFilters.reduce((a, c) => a && (c !== prop_category), Boolean(propCategoryFilters.length));
    }
  }
  makeCheckPropClassFilter() {
    const propClassFilters = this.filters.prop_class.value;
    if (!propClassFilters.length) return this.makeCheckPropCategoryFilter();

    return prop_class => propClassFilters.reduce((a, c) => a && (c != prop_class), true);
  }
  makeCheckOwnerTypeFilter() {
    const ownerTypeFilters = this.filters.owner_type.value;

    return owner_type => ownerTypeFilters.reduce((a, c) => a && (c != owner_type), Boolean(ownerTypeFilters.length));
  }
  makeShouldFilter() {
    const propClassFilter = this.makeCheckPropClassFilter(),
      ownerTypeFilter = this.makeCheckOwnerTypeFilter();

    return ({ owner_type, prop_class }) => propClassFilter(prop_class) || ownerTypeFilter(owner_type);
  }
  getBuildingRisks({ flood_zone }) {
    return [
      this.getFloodZone(flood_zone)
    ].filter(r => Boolean(r));
  }
  getFloodZone(flood_zone) {
    if (!Boolean(flood_zone)) return false;

    switch ((flood_zone + "").slice(0, 1).toLowerCase()) {
      case "a":
      case "v":
        return "100-year";
      case "x":
      case "b":
        return "500-year";
      default:
        return false;
    }
  }
  render(map) {
    return this.getBuildingIds()
      .then(buildingids => {
        const filteredBuildingids = [];

        const shouldFilter = this.makeShouldFilter();

        const byIdGraph = get(falcorGraph.getCache(), ["building", "byId"], {}),
          measure = this.filters.measure.value,
          data = [];

        buildingids.forEach(id => {
          const prop_class = get(byIdGraph, [id, "prop_class"], "000") + "",
            owner_type = get(byIdGraph, [id, "owner_type"], "-999") + "",
            flood_zone = get(byIdGraph, [id, "flood_zone"], null),
            risks = this.getBuildingRisks({ flood_zone });

          if (!shouldFilter({ prop_class, owner_type })) {
            data.push({ id, measure, value: +get(byIdGraph, [id, measure], 0), risks });
          }
          else {
            filteredBuildingids.push(id.toString());
          }
        })
        return [filteredBuildingids, data]
      })
      .then(([filteredBuildingids = [], data = []]) => {
        const coloredBuildingIds = [],
          riskFilter = this.filters.risk.value,
          atRiskIds = [];

        const colorScale = this.getColorScale(data),
          colors = data.reduce((a, c) => {
            a[c.id] = colorScale(c.value);
            coloredBuildingIds.push(c.id.toString());
            if (riskFilter.reduce((aa, cc) => aa || c.risks.includes(cc), false)) {
              atRiskIds.push(c.id.toString());
            }
            return a;
          }, {});

        const FILTERED_COLOR = "#666",
          DEFAULT_COLOR = "#000";

        map.setPaintProperty(
          'ebr',
          'fill-outline-color',
      		["match", ["to-string", ["get", "id"]],
            atRiskIds.length ? atRiskIds : "no-at-risk", "#fff",
            coloredBuildingIds.length ? coloredBuildingIds.filter(id => !atRiskIds.includes(id)) : "no-colored", ["get", ["to-string", ["get", "id"]], ["literal", colors]],
            filteredBuildingids.length ? filteredBuildingids.filter(id => !atRiskIds.includes(id)) : "no-filtered", FILTERED_COLOR,
            DEFAULT_COLOR
          ],
          { validate: false }
        )

      	map.setPaintProperty(
      		'ebr',
      		'fill-color',
      		["match", ["to-string", ["get", "id"]],
            coloredBuildingIds.length ? coloredBuildingIds : "no-colored", ["get", ["to-string", ["get", "id"]], ["literal", colors]],
            filteredBuildingids.length ? filteredBuildingids : "no-filtered", FILTERED_COLOR,
            DEFAULT_COLOR
          ],
          { validate: false }
      	)
      })
  }
  // receiveData(map, [filteredBuildingids = [], data = []]) {
  //   const coloredBuildingIds = [],
  //     riskFilter = this.filters.risk.value,
  //     atRiskIds = [];
  //
  //   const colorScale = this.getColorScale(data),
  //     colors = data.reduce((a, c) => {
  //       a[c.id] = colorScale(c.value);
  //       coloredBuildingIds.push(c.id.toString());
  //       if (riskFilter.reduce((aa, cc) => aa || c.risks.includes(cc), false)) {
  //         atRiskIds.push(c.id.toString());
  //       }
  //       return a;
  //     }, {});
  //
  //   const FILTERED_COLOR = "#666",
  //     DEFAULT_COLOR = "#000";
  //
  //   this.falcorCache = falcorGraph.getCache();
  //
  //   map.setPaintProperty(
  //     'ebr',
  //     'fill-outline-color',
  // 		["match", ["to-string", ["get", "id"]],
  //       atRiskIds.length ? atRiskIds : "no-at-risk", "#fff",
  //       coloredBuildingIds.length ? coloredBuildingIds.filter(id => !atRiskIds.includes(id)) : "no-colored", ["get", ["to-string", ["get", "id"]], ["literal", colors]],
  //       filteredBuildingids.length ? filteredBuildingids.filter(id => !atRiskIds.includes(id)) : "no-filtered", FILTERED_COLOR,
  //       DEFAULT_COLOR
  //     ]
  //   )
  //
  // 	map.setPaintProperty(
  // 		'ebr',
  // 		'fill-color',
  // 		["match", ["to-string", ["get", "id"]],
  //       coloredBuildingIds.length ? coloredBuildingIds : "no-colored", ["get", ["to-string", ["get", "id"]], ["literal", colors]],
  //       filteredBuildingids.length ? filteredBuildingids : "no-filtered", FILTERED_COLOR,
  //       DEFAULT_COLOR
  //     ]
  // 	)
  // }
  getColorScale(data) {
    const { type, range } = this.legend;
    switch (type) {
      case "quantile": {
        const domain = data.map(d => d.value).sort();
        this.legend.domain = domain;
        return scaleQuantile()
          .domain(domain)
          .range(range);
      }
      case "quantize": {
        const domain = extent(data, d => d.value);
        this.legend.domain = domain;
        return scaleQuantize()
          .domain(domain)
          .range(range);
      }
    }
  }
}

export default (options = {}) =>
  new EBRLayer("Enhanced Building Risk", {
    active: true,
    falcorCache: {},
    buildingids: [],
    sources: [
      { id: "nys_buildings_avail",
        source: {
          'type': "vector",
          'url': 'mapbox://am3081.dpm2lod3'
        }
      }
    ],
    legend: {
      title: "Replacement Cost",
      type: "quantile",
      types: ["quantile", "quantize"],
      vertical: false,
      range: LEGEND_COLOR_RANGE,
      active: true,
      domain: [],
      format: fnum
    },
    layers: [
      { 'id': 'ebr',
          'source': 'nys_buildings_avail',
          'source-layer': 'nys_buildings_osm_ms_parcelid_pk',
          'type': 'fill',
          'minzoom': 8,
          'paint': {
              'fill-color': '#000000'
          }

      }
    ],
    popover: {
      layers: ["ebr"],
      dataFunc: function(topFeature, features) {
        const { id } = topFeature.properties;

        const graph = get(this.falcorCache, ["building", "byId", id], {}),
          attributes = [
            ["Name", "name"],
            ["Replacement Cost", "replacement_value", fnum],
            ["Type", "type"],
            ["Critical Facilities (FCode)", "critical"],
            ["Flood Zone", "flood_zone"]
          ];

        const data = attributes.reduce((a, [name, key, format = IDENTITY]) => {
          const data = get(graph, [key], false)
          if (data) {
            a.push([name, format(data)]);
          }
          return a;
        }, [])

        if (data.length) {
          data.unshift(["Building ID", id])
          return data;
        }
        return data;
      },
      minZoom: 13
    },
    filters: {
      area: {
        name: 'Area',
        type: 'multi',
        domain: [],
        value: []
      },
      owner_type: {
        name: "Owner Type",
        type: "multi",
        domain: [],
        value: []
      },
      prop_category: {
        name: "Property Category",
        type: "multi",
        domain: [
          { value: 100, name: "Agriculture" },
          { value: 200, name: "Residential" },
          { value: 300, name: "Vacant Land" },
          { value: 400, name: "Commercial" },
          { value: 500, name: "Recreation & Entertainment" },
          { value: 600, name: "Community Services" },
          { value: 700, name: "Industrial" },
          { value: 800, name: "Public Services" },
          { value: 900, name: "Wild, Forested, Conservation Lands & Public Parks" },
        ],
        value: []
      },
      prop_class: {
        name: "Property Class",
        type: "multi",
        domain: [],
        value: [],
        active: false
      },
      risk: {
        name: "Risk",
        type: "multi",
        domain: [
          { value: "100-year", name: "100-year Flood Zone" },
          { value: "500-year", name: "500-year Flood Zone" }
        ],
        value: []
      },
      measure: {
        name: "Measure",
        type: "single",
        domain: [
          { value: "replacement_value", name: "Replacement Value" },
          { value: "num_occupants", name: "Number of Occupants" }
        ],
        value: "replacement_value"
      }
    },
    ...options
  })
