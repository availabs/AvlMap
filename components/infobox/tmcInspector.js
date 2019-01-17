import React, {Component} from 'react';
import { connect } from 'react-redux';
import { reduxFalcor } from 'utils/redux-falcor'

import LineChart from '../charts/lineChart'

import get from 'lodash.get'



 class TMCInspector extends Component {
  
  fetchFalcorDeps () {
    let year = +this.props.date.split('-')[0]

    return this.props.falcor.get(
      ['tmc', this.props.tmc, 'attributes', ["road_name","avg_speedlimit","length"]],
      ['tmc', this.props.tmc, 'pm3', year,  ['freeflowtt', 'vd_total', 'aadt']],
      ['tmc', this.props.tmc, 'year', year , 'avgtt' ],
      ['tmc', this.props.tmc, 'day', this.props.date, 'tt' ]
    ).then(data =>{
      return data 
    })
  }
  

  renderAttributes() {
    if (!this.props.tmcData.tmc || 
        !this.props.tmcData.tmc[this.props.tmc] || 
        !get(this.props.tmcData.tmc[this.props.tmc], 'attributes', false)){
      return <span />
    } 
    let year = +this.props.date.split('-')[0]
    let { road_name, avg_speedlimit, length} = get(this.props.tmcData.tmc[this.props.tmc], 'attributes', false)
    let { freeflowtt, aadt }  = get(this.props.tmcData.tmc[this.props.tmc],`pm3.${year}` , false)


    return (
      <div>
       <h5>{road_name}</h5>
       <div>{this.props.tmc}</div>
       <div>TMC Length: {length.toFixed(2)} mi</div>
       <div>AADT: {aadt.toLocaleString()}</div>
       <div>Avg Speed Limit: {avg_speedlimit}</div>
       <div>Freeflow Speed: {freeflowtt}</div>
      </div>
    )
  }

  renderGraph () {
    if (!this.props.tmcData.tmc || 
        !this.props.tmcData.tmc[this.props.tmc] ||
        !get(this.props.tmcData.tmc[this.props.tmc], `day.${this.props.date}.tt`, false)){
      return <span />
    }
    let colorFunction = (d) => 'rgb(177, 16, 33)' 
    let year = +this.props.date.split('-')[0]
    let day = get(this.props.tmcData.tmc[this.props.tmc], `day.${this.props.date}.tt`, {})
    let length = +get(this.props.tmcData.tmc[this.props.tmc], 'attributes.length',1)
    let avgDay = get(this.props.tmcData.tmc[this.props.tmc], `year.${year}.avgtt`, {})
    let dayData = Object.keys(day).reduce((out, epoch) => {
      let dataPoint = {
        x: epoch,
        y: +(( length / day[epoch] ) * 3600).toFixed(1)
      }
      out.data.push(dataPoint)
      return out

    }, {id: `Speed`,data: [], colorBy: colorFunction})

    let avgDayData = avgDay.reduce((out, epoch, i) => {
      let dataPoint = {
        x: i,
        y: +(( length / epoch ) * 3600).toFixed(1)
      }
      out.data.push(dataPoint)
      return out

    }, {id: `Avg Speed`,data: [], colorBy: colorFunction})
    return (
      <div style={{width: '100%', height: 100}}>

         <LineChart data={[dayData, avgDayData]}/>
      </div>
    )
  }

  render() {
    if(!this.props.tmc) return <span />

    
    return (
      <div style={{width: '100%',  padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.15)', color:'#efefef', marginTop: 5}}>
      
       {this.renderAttributes()}
       {this.renderGraph()}
      </div>
    );
  }
}

TMCInspector.defaultProps = {
  date: '2017-02-01'
}

const mapDispatchToProps = {}

const mapStateToProps = state => {
  return {
    date: state.incidents.date,
    tmc: state.incidents.inspectTMC,
    tmcData: state.incidents.tmcData,
    epoch: state.incidents.epoch
  }
};


export default connect(mapStateToProps, mapDispatchToProps)(reduxFalcor(TMCInspector))