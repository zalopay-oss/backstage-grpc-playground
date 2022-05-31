/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import * as React from 'react';
import { EditorAction, EditorState } from './Editor';
import { PlayButton } from './PlayButton';
import { CheckOutlined, DoubleRightOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { setRequestStreamData, setStreamCommitted } from './actions';
import { ProtoInfo } from '../../../api';

export interface ControlsStateProps {
  dispatch: React.Dispatch<EditorAction>
  state: EditorState
  protoInfo?: ProtoInfo
  active?: boolean;
}

export function Controls({ dispatch, state, protoInfo, active }: ControlsStateProps) {
  return (
    <div>
      <PlayButton
        active={active}
        dispatch={dispatch}
        state={state}
        protoInfo={protoInfo}
      />

      { isControlVisible(state) &&
        (
          <div style={styles.controlsContainer}>
            <Tooltip placement="topLeft" title="Push Data">
              <div style={styles.pushData} onClick={() => {
                if (state.call) {
                  dispatch(setRequestStreamData([
                    ...state.requestStreamData,
                    state.data,
                  ]));
                  state.call.write(state.data);
                }
              }}>
                <DoubleRightOutlined />
              </div>
            </Tooltip>

            <Tooltip placement="topRight" title="Commit Stream">
              <div
                style={styles.commit}
                onClick={() => {
                  if (state.call) {
                    state.call.commitStream();
                    dispatch(setStreamCommitted(true));
                  }
                }}>
                <CheckOutlined />
              </div>
            </Tooltip>
          </div>
        )}
      </div>
  );
}

export function isControlVisible(state: EditorState) {
  return Boolean(
      (state.interactive && state.loading) &&
      (state.call && state.call.protoInfo.isClientStreaming()) &&
      !state.streamCommitted);
}

const styles = {
  controlsContainer: {
    display: "flex",
    marginLeft: "-15px",
    marginTop: 17
  },
  pushData: {
    background: "#11c9f3",
    color: "white",
    padding: "10px",
    paddingLeft: "12px",
    borderRadius: "50% 0 0 50%",
    fontSize: "18px",
    cursor: "pointer",
    border: "2px solid rgb(238, 238, 238)",
    borderRight: "none"
  },
  commit: {
    background: "#28d440",
    color: "white",
    padding: "10px",
    paddingLeft: "12px",
    borderRadius: "0 50% 50% 0",
    fontSize: "18px",
    cursor: "pointer",
    border: "2px solid rgb(238, 238, 238)",
    borderLeft: "none",
  }
};
