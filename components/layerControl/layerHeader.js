import React from 'react';
// import PropTypes from 'prop-types';
import classnames from 'classnames';
import styled from 'styled-components';
import PanelHeaderAction from './panelHeaderAction';
import {
  EyeSeen,
  EyeUnseen,
  VertDots,
  ArrowDown,
  Trash,
  Clock
} from 'components/common/icons';

import {Tooltip} from 'components/common/styled-components';

import {
    //InlineInput, 
    StyledPanelHeader 
} from 'components/common/styled-components';

const defaultProps = {
  isDragNDropEnabled: true,
  // showRemoveLayer: true,
  className: '',
  idx: 1,
  // isConfigActive: false ,
  isVisible: true,
  layerId: 1,
  layerType: '',
  labelRCGColorValues: [255, 0, 0],
  isConfigActive: true,
  onToggleVisibility: () => {},
  onUpdateLayerLabel: () => {},
  onToggleEnableConfig: () => {},
  onRemoveLayer: () => {},
  showRemoveLayer: () => {}
};

const StyledLayerPanelHeader = StyledPanelHeader.extend`
  .layer__remove-layer {
    opacity: 0;
  }
  width: 100%;
  :hover {
    cursor: pointer;
    background-color: ${props => props.theme.panelBackgroundHover};
    
    .layer__drag-handle {
      opacity: 1;
    }
    
    .layer__remove-layer {
      opacity: 1;  
    }
    
    .layer__enable-config {
      color: white
    }
  }
`;

const HeaderLabelSection = styled.div`
  display: flex;
  color: ${props => props.theme.textColor};
`;

const HeaderActionSection = styled.div`
  display: flex;
`;

const LayerTitleSection = styled.div`
  margin-left: 12px;
  .layer__title__type {
    color: ${props => props.theme.subtextColor};
    font-size: 10px;
    line-height: 12px;
    letter-spacing: 0.37px;
    text-transform: capitalize;
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  opacity: 0;
  
  :hover {
    cursor: move;
    color: ${props => props.theme.textColorHl};
  }
`;

const ActionBarContainer = styled.div`
  display: flex;
`
const IconWrapper = styled.div`
  color: ${ props => props.theme.textColor };
  display: inline-flex;
  margin-left: 5px;
`

const ActionBar = ({ layerName, actions, actionMap }) =>
  <ActionBarContainer>
    {
      actions.map((a, i) =>
        <IconWrapper key={ i }>
          <a.Icon data-tip
            data-for={ `action-bar-${ i }` }
            onClick={ e => {
              e.stopPropagation();
              typeof a.action === "function" ?
                a.action() :
                actionMap[a.action[0]](layerName, ...a.action.slice(1))
            } }/>
          <Tooltip
            id={ `action-bar-${ i }` }
            effect="solid"
            delayShow={ 500 }>
            <span>{ a.tooltip }</span>
          </Tooltip>
        </IconWrapper>
      )
    }
  </ActionBarContainer>

const LayerPanelHeader = ({
  className,
  idx,
  isConfigActive,
  isDragNDropEnabled,
  isVisible,
  label,
  layerId,
  layerType,
  layer,
  labelRCGColorValues,
  onToggleVisibility,
  onUpdateLayerLabel,
  onToggleEnableConfig,
  onRemoveLayer,
  showRemoveLayer,
  theme,
  actionMap
}) => (
  <StyledLayerPanelHeader
    className={classnames('layer-panel__header', {
      'sort--handle': !isConfigActive
    })}
    active={isConfigActive}
    labelRCGColorValues={labelRCGColorValues}
    onClick={onToggleEnableConfig}
    theme={theme}
  >
    <HeaderLabelSection className="layer-panel__header__content">
      {isDragNDropEnabled && (
        <DragHandle theme={theme} className="layer__drag-handle">
          <VertDots height="20px" />
        </DragHandle>
      )}
      <PanelHeaderAction
        className="layer__visibility-toggle"
        id={layerId}
        tooltip={isVisible ? 'hide layer' : 'show layer'}
        onClick={onToggleVisibility}
        IconComponent={isVisible ? EyeSeen : EyeUnseen}
        active={isVisible}
        flush
      />
      <LayerTitleSection className="layer__title" theme={theme}>
        <div>
          <div>{ layer.name }</div>
          <div className="layer__title__type">
            {
              !layer.actions ? null :
              <ActionBar actionMap={ actionMap }
                actions={ layer.actions }
                layerName={ layer.name }/>
            }
          </div>
        </div>
      </LayerTitleSection>
      { layer.loading ? 
        <PanelHeaderAction
          className="layer__loading-layer"
          id={layerId}
          tooltip={'Layer Loading'}
          onClick={null}
          tooltipType="error"
          IconComponent={Clock}
          
        />
        : null
      }
    </HeaderLabelSection>
    <HeaderActionSection className="layer-panel__header__actions">
      {showRemoveLayer ? (
        <PanelHeaderAction
          className="layer__remove-layer"
          id={layerId}
          tooltip={'Remove layer'}
          onClick={onRemoveLayer}
          tooltipType="error"
          IconComponent={Trash}
          
        />
      ) : null}
      <PanelHeaderAction
        className="layer__enable-config"
        id={layerId}
        tooltip={'Layer settings'}
        onClick={onToggleEnableConfig}
        IconComponent={ArrowDown}
        
      />
    </HeaderActionSection>
  </StyledLayerPanelHeader>
);

LayerPanelHeader.defaultProps = defaultProps;

export default LayerPanelHeader