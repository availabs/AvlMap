import React from "react"

import store from "store"
import { update } from "utils/redux-falcor/components/duck"
import { falcorGraph, falcorChunkerNice } from "store/falcorGraph"
import { connect } from 'react-redux';
import { reduxFalcor, UPDATE as REDUX_UPDATE } from 'utils/redux-falcor'

import get from "lodash.get"
import styled from "styled-components"

import {
    scaleQuantile,
    scaleQuantize
} from "d3-scale"
import { extent } from "d3-array"
import { format as d3format } from "d3-format"

import { fnum } from "utils/sheldusUtils"

import MapLayer from "components/AvlMap/MapLayer"
import { register, unregister } from "components/AvlMap/ReduxMiddleware"

import { getColorRange } from "constants/color-ranges";
const LEGEND_COLOR_RANGE = getColorRange(5, "RdYlBu");

const IDENTITY = i => i;

class EBRLayer extends MapLayer {
  onAdd(map) {
    super.onAdd(map);

    register(this, REDUX_UPDATE, ["graph"]);

    const geoLevel = "cousubs";

    return falcorGraph.get(
        ["geo", "36", geoLevel],
        ["parcel", "meta", ["prop_class", "owner_type"]]
      )
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
  onRemove(map) {
    super.onRemove(map);
    unregister(this);
  }
  receiveMessage(action, data) {
    this.falcorCache = data;
  }
  onFilterFetch(filterName, oldValue, newValue) {
    if (filterName === "measure") {
      switch (newValue) {
        case "num_occupants":
          this.legend.format = IDENTITY;
          break;
        case "replacement_value":
          this.legend.format = fnum;
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

        return falcorChunkerNice(["building", "byId", buildingids, ["address", "replacement_value", "owner_type", "prop_class", "num_occupants", "name", "type", "critical", "flood_zone"]])
      })
      .then(() => store.dispatch(update(falcorGraph.getCache())))
      // .then(() => this.falcorCache = falcorGraph.getCache())
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

        this.infoBoxes["measure"].show = Boolean(data.length);
        this.measureData = data;

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

const getFilterName = (layer, filterName, value = null) =>
  value === null ?
    layer.filters[filterName].domain.reduce((a, c) => c.value === layer.filters[filterName].value ? c.name : a, null)
  :
    layer.filters[filterName].domain.reduce((a, c) => c.value === value ? c.name : a, null)

const getPropClassName = (falcorCache, value) =>
  get(falcorCache, ["parcel", "meta", "prop_class", "value"], [])
    .reduce((a, c) => c.value == value ? c.name : a, "Unknown")

export default (options = {}) =>
  new EBRLayer("Enhanced Building Risk", {
    active: true,
    falcorCache: {},
    measureData: [],
    sources: [
      { id: "nys_buildings_avail",
        source: {
          'type': "vector",
          'url': 'mapbox://am3081.dpm2lod3'
        }
      }
    ],
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
    legend: {
      title: ({ layer }) => <>{ getFilterName(layer, "measure") }</>,
      type: "quantile",
      types: ["quantile", "quantize"],
      vertical: false,
      range: LEGEND_COLOR_RANGE,
      active: true,
      domain: [],
      format: fnum
    },
    popover: {
      layers: ["ebr"],
      dataFunc: function(topFeature, features) {
        const { id } = topFeature.properties;

        const graph = get(this.falcorCache, ["building", "byId", id], {}),
          attributes = [
            [null, "address"],
            ["Name", "name"],
            ["Replacement Cost", "replacement_value", fnum],
            ["Owner Type", "owner_type", d => getFilterName(this, "owner_type", d)],
            ["Land Use", "prop_class", d => getPropClassName(this.falcorCache, d)],
            ["Type", "type"],
            ["Critical Facilities (FCode)", "critical"],
            ["Flood Zone", "flood_zone"]
          ];

        const data = attributes.reduce((a, [name, key, format = IDENTITY]) => {
          const data = get(graph, [key], false)
          if (data && (name === null)) {
            a.push(format(data));
          }
          else if (data && (name !== null)) {
            a.push([name, format(data)]);
          }
          return a;
        }, [])

        if (data.length) {
          data.push(["Building ID", id]);
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
          { value: "replacement_value", name: "Replacement Cost" },
          { value: "num_occupants", name: "Number of Occupants" }
        ],
        value: "replacement_value"
      }
    },
    infoBoxes: {
      measure: {
        title: ({ layer }) => <>{ `${ getFilterName(layer, "measure") } Info` }</>,
        comp: MeasureInfoBox,
        show: false
      }
    },
    onClick: {
      layers: ["ebr"],
      dataFunc: function(features) {
        if (!features.length) return;

        const props = { ...features[0].properties };
        this.modals.building.show
          ? this.doAction(["updateModal", "building", props])
          : this.doAction(["toggleModal", "building", props]);
      }
    },
    modals: {
      building: {
        comp: BuildingModal,
        show: false
      }
    },
    ...options
  })

const MeasureInfoBox = ({ layer }) => {
  let format = d => d;
  switch (layer.filters.measure.value) {
    case "replacement_value":
      format = fnum;
      break;
    case "num_occupants":
      format = d3format(",d");
      break;
  }
  return (
    <table className="table table-sm"
      style={ {
        margin: "0px",
        fontSize: "1rem"
      } }>
      <tbody>
        <tr>
          <td>Total</td>
          <td>{ format(layer.measureData.reduce((a, c) => a + c.value, 0)) }</td>
        </tr>
        {
          layer.filters.risk.value.map(r =>
            <tr key={ r }>
              <td>{ `${ getFilterName(layer, "risk", r) } Total` }</td>
              <td>{ format(layer.measureData.filter(({ risks }) => risks.includes(r)).reduce((a, c) => a + c.value, 0)) }</td>
            </tr>
          )
        }
      </tbody>
    </table>
  )
}
const TabBase = ({ name, props, data, meta }) => {
  const rows = props.reduce((a, c) => {
    const d = get(data, [c], null);
    a.push(
      <tr key={ c }>
        <td>{ formatPropName(c) }</td>
        <td>{ (d !== null) && (d !== 'null') ? formatPropValue(c, d, meta) : "unknown" }</td>
      </tr>
    )
    return a;
  }, [])
  return (
    <table>
      <tbody>
        { rows }
      </tbody>
    </table>
  )
}

const TABS = [
  { name: "Basic",
    props: [
      "address",
      "name",
      "prop_class",
      "owner_type",
      "replacement_value",
      "critical"
    ] },
  { name: "Occupany",
    props: [
      "num_residents",
      "num_employees",
      "num_occupants",
      "num_vehicles_inhabitants"
    ] },
  { name: "Structural",
    props: [
      "num_units",
      "basement",
      "building_type",
      "roof_type",
      "height",
      "num_stories",
      "structure_type",
      "bldg_style",
      "sqft_living",
      "nbr_kitchens",
      "nbr_full_baths",
      "nbr_bedrooms",
      "first_floor_elevation"
    ] },
  { name: "Services",
    props: [
      "heat_type"
    ] },
  { name: "Commercial",
    props: [
      "replacement_value",
      "naics_code",
      "census_industry_code",
      "contents_replacement_value",
      "inventory_replacement_value",
      "establishment_revenue",
      "business_hours"
    ] },
  { name: "Risk",
    props: [
      "seismic_zone",
      "flood_plain",
      "flood_depth",
      "flood_duration",
      "flood_velocity",
      "high_wind_speed",
      "soil_type",
      "storage_hazardous_materials",
      "topography"
    ] }
]

const formatPropName = prop =>
  prop.split("_")
    .map(string => string[0].toUpperCase() + string.slice(1))
    .map(string => string.replace(/Nbr|Num/, "Number of"))
    .map(string => string.replace("Prop", "Property"))
    .map(string => string.replace("Value", "Cost"))
    .join(" ")
const formatPropValue = (prop, value, meta) => {
  const string = get(meta, [prop, "value"], [])
    .reduce((a, c) => c.value === value ? c.name : a, value);
  if (/value/.test(prop)) {
    return d3format("$,d")(string);
  }
  return string;
}


class BuildingModalBase extends React.Component {
  state = {
    tab: TABS[0].name
  }
  fetchFalcorDeps() {
    return this.props.falcor.get(
      ["building", "byId", this.props.id, TABS.reduce((a, c) => [...a, ...c.props], [])],
      ["parcel", "meta", ["prop_class", "owner_type"]]
    )
    // .then(res => this.props.layer.falcorCache = this.props.falcor.getCache())
  }
  renderTab() {
    const data = TABS.find(t => t.name === this.state.tab);
    return (
      <TabBase { ...data }
        meta={ this.props.parcelMeta }
        data={ this.props.buildingData }/>
    )
  }
  render() {
    const { layer, theme, buildingData } = this.props,
      address = get(buildingData, "address", false),
      name = get(buildingData, "name", false);
    return (
      <div style={ { color: theme.textColor, paddingTop: "15px", width: "100%", minWidth: "500px" }}>
        { address || name ?
          <h4 style={ { color: theme.textColorHl } }>
            { address || name }
          </h4>
          : null
        }
        <div style={ { width: "100%", display: "flex", padding: "10px 0px" } }>
          { TABS.map(({ name }) =>
              <TabSelector name={ name } key={ name }
                isActive={ name === this.state.tab }
                select={ tab => this.setState({ tab }) }/>
            )
          }
        </div>
        { this.renderTab() }
      </div>
    )
  }
}
const mapStateToProps = (state, { id }) => ({
  buildingData: get(state, ["graph", "building", "byId", id], {}),
  parcelMeta: get(state, ["graph", "parcel", "meta"], {})
});
const mapDispatchToProps = {};

const BuildingModal = connect(mapStateToProps, mapDispatchToProps)(reduxFalcor(BuildingModalBase))

const TabSelector = ({ name, isActive, select }) =>
  <StyledTabSelector isActive={ isActive }
    onClick={ e => select(name) }>
    { name }
  </StyledTabSelector>

const StyledTabSelector = styled.div`
  border-bottom: ${ props => props.isActive ? `2px solid ${ props.theme.textColorHl }` : 'none' };
  color: ${ props => props.isActive ? props.theme.textColorHl : props.theme.textColor };
  width: ${ 100 / TABS.length }%;
  padding: 2px 5px;
  transition: color 0.15s, background-color 0.15s;
  :hover {
    cursor: pointer;
    color: ${ props => props.theme.textColorHl };
    background-color: #666;
  }
`
