/* eslint-disable @typescript-eslint/no-use-before-define */
import React from 'react';
import { useEffect, useReducer } from 'react';
import {
  actions,
  setData, setEnvironment, setInteractive,
  setMetadata,
  setMetadataVisibilty,
  setProtoDocVisibility,
  setProtoVisibility,
  setTSLCertificate,
  setUrl,
} from './actions';
import { Response } from './Response';
import { Metadata } from './Metadata';
import { Controls, isControlVisible } from './Controls';
import { Request } from './Request';
import { Options } from './Options';
import { ProtoFileViewer } from './ProtoFileViewer';
import { getMetadata, getUrl, storeUrl } from '../../../storage';

import 'brace/theme/textmate';
import 'brace/mode/json';
import 'brace/mode/protobuf';
import { exportResponseToJSONFile } from "../../../api";
import Resizable from "re-resizable";
import { AddressBar } from "./AddressBar";
import { deleteEnvironment, getEnvironments, saveEnvironment } from "../../../storage/environments";
import { ProtoInfo, Certificate, GRPCEventEmitter } from '../../../api';
import { ProtoDocViewer } from './ProtoDocViewer';

export interface EditorAction {
  [key: string]: any
  type: string
}

export interface EditorEnvironment {
  name: string;
  url: string;
  metadata: string;
  isDefault?: boolean;
  interactive: boolean;
  tlsCertificate: Certificate;
}

export interface EditorRequest {
  url: string
  data: string
  inputs?: string // @deprecated
  metadata: string
  interactive: boolean
  environment?: string
  grpcWeb: boolean
  tlsCertificate?: Certificate
}

export interface EditorState extends EditorRequest {
  loading: boolean
  response: EditorResponse
  metadataOpened: boolean
  protoViewVisible: boolean
  protoDocViewVisible: boolean
  requestStreamData: string[]
  responseStreamData: EditorResponse[]
  streamCommitted: boolean
  call?: GRPCEventEmitter
}

export interface EditorProps {
  protoInfo?: ProtoInfo
  onRequestChange?: (editorRequest: EditorRequest & EditorState) => void
  initialRequest?: EditorRequest
  environmentList?: EditorEnvironment[]
  onEnvironmentListChange?: (environmentList: EditorEnvironment[]) => void
  active?: boolean
}

export interface EditorResponse {
  output: string;
  responseTime?: number;
}

const INITIAL_STATE: EditorState = {
  url: "0.0.0.0:3009",
  data: "",
  metadata: "",
  requestStreamData: [],
  responseStreamData: [],
  interactive: false,
  grpcWeb: false,
  loading: false,
  response: {
    output: "",
    responseTime: undefined,
  },
  metadataOpened: false,
  protoViewVisible: false,
  protoDocViewVisible: false,
  streamCommitted: false,
  tlsCertificate: undefined,
  call: undefined,
};

/**
 * Reducer
 * @param state
 * @param action
 */
const reducer = (state: EditorState, action: EditorAction) => {
  switch (action.type) {

    case actions.SET_DATA:
      return { ...state, data: action.data };

    case actions.SET_URL:
      return { ...state, url: action.value };

    case actions.SET_IS_LOADING:
      return { ...state, loading: action.isLoading };

    case actions.SET_RESPONSE:
      return { ...state, response: action.response };

    case actions.SET_CALL:
      return { ...state, call: action.call };

    case actions.SET_METADATA_VISIBILITY:
      return { ...state, metadataOpened: action.visible };

    case actions.SET_METADATA:
      return { ...state, metadata: action.metadata };

    case actions.SET_PROTO_VISIBILITY:
      return { ...state, protoViewVisible: action.visible };

    case actions.SET_PROTO_DOC_VISIBILITY:
      return { ...state, protoDocViewVisible: action.visible };

    case actions.SET_INTERACTIVE:
      return { ...state, interactive: action.interactive };

    case actions.SET_GRPC_WEB:
      return { ...state, grpcWeb: action.grpcWeb };

    case actions.SET_REQUEST_STREAM_DATA:
      return { ...state, requestStreamData: action.requestData };

    case actions.SET_RESPONSE_STREAM_DATA:
      return { ...state, responseStreamData: action.responseData };

    case actions.ADD_RESPONSE_STREAM_DATA:
      return { ...state, responseStreamData: [...state.responseStreamData, action.responseData] };

    case actions.SET_STREAM_COMMITTED:
      return { ...state, streamCommitted: action.committed };

    case actions.SET_SSL_CERTIFICATE:
      return { ...state, tlsCertificate: action.certificate };

    case actions.SET_ENVIRONMENT:
      return { ...state, environment: action.environment };

    default:
      return state
  }
};

export function Editor({ protoInfo, initialRequest, onRequestChange, onEnvironmentListChange, environmentList, active }: EditorProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    url: (initialRequest && initialRequest.url) || getUrl() || INITIAL_STATE.url,
    interactive: initialRequest ? initialRequest.interactive : (protoInfo && protoInfo.usesStream()) || INITIAL_STATE.interactive,
    grpcWeb: initialRequest ? initialRequest.grpcWeb : INITIAL_STATE.grpcWeb,
    metadata: (initialRequest && initialRequest.metadata) || getMetadata() || INITIAL_STATE.metadata,
    environment: (initialRequest && initialRequest.environment),
  }, undefined);

  useEffect(() => {
    if (protoInfo && !initialRequest) {
      try {
        const { plain } = protoInfo.service.methodsMocks[protoInfo.methodName];
        dispatch(setData(JSON.stringify(plain, null, 2)));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        dispatch(setData(JSON.stringify({
          "error": "Error parsing the request message, please report the problem sharing the offending protofile"
        }, null, 2)));
      }
    }

    if (initialRequest) {
      dispatch(setData(initialRequest.inputs || initialRequest.data));
      dispatch(setMetadata(initialRequest.metadata));
      dispatch(setTSLCertificate(initialRequest.tlsCertificate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClickExport = async () => {
    // TODO
    if (protoInfo) {
      exportResponseToJSONFile(protoInfo, state)
    }
  }

  return (
    <div style={styles.tabContainer}>
      <div style={styles.inputContainer}>
        <div style={{ width: "60%" }}>
          <AddressBar
            protoInfo={protoInfo}
            loading={state.loading}
            url={state.url}
            defaultEnvironment={state.environment}
            environments={environmentList}
            onChangeEnvironment={(environment) => {

              if (!environment) {
                dispatch(setEnvironment(""));

                onRequestChange?.({
                  ...state,
                  environment: "",
                });
                return;
              }

              dispatch(setUrl(environment.url));
              dispatch(setMetadata(environment.metadata));
              dispatch(setEnvironment(environment.name));

              const newState = {
                ...state,
                environment: environment.name,
                url: environment.url,
                metadata: environment.metadata,
              }

              if (!environment.isDefault) {
                dispatch(setTSLCertificate(environment.tlsCertificate));
                dispatch(setInteractive(environment.interactive));

                newState.tlsCertificate = environment.tlsCertificate;
                newState.interactive = environment.interactive;
              }

              onRequestChange?.(newState);
            }}
            onEnvironmentDelete={(environmentName) => {
              deleteEnvironment(environmentName);
              dispatch(setEnvironment(""));
              onRequestChange?.({
                ...state,
                environment: "",
              });

              onEnvironmentListChange?.(
                getEnvironments()
              );
            }}
            onEnvironmentSave={(environmentName) => {
              saveEnvironment({
                name: environmentName,
                url: state.url,
                interactive: state.interactive,
                metadata: state.metadata,
                tlsCertificate: state.tlsCertificate,
              });

              dispatch(setEnvironment(environmentName));
              onRequestChange?.({
                ...state,
                environment: environmentName,
              });

              onEnvironmentListChange?.(
                getEnvironments()
              );
            }}
            onChangeUrl={(e) => {
              dispatch(setUrl(e.target.value));
              storeUrl(e.target.value);
              onRequestChange?.({
                ...state,
                url: e.target.value,
              });
            }}
          />
        </div>

        {protoInfo && (
          <Options
            protoInfo={protoInfo}
            dispatch={dispatch}
            grpcWebChecked={state.grpcWeb}
            interactiveChecked={state.interactive}
            onClickExport={onClickExport}
            onInteractiveChange={(checked) => {
              onRequestChange?.({
                ...state,
                interactive: checked,
              });
            }}
            tlsSelected={state.tlsCertificate}
            onTLSSelected={(certificate) => {
              dispatch(setTSLCertificate(certificate));
              onRequestChange?.({
                ...state,
                tlsCertificate: certificate,
              });
            }}
          />
        )}
      </div>

      <div style={styles.editorContainer}>
        <Resizable
          enable={{ right: true }}
          defaultSize={{
            width: "50%",
          }}
          maxWidth="80%"
          minWidth="10%"
        >
          <Request
            data={state.data}
            streamData={state.requestStreamData}
            active={active}
            onChangeData={(value) => {
              dispatch(setData(value));
              onRequestChange?.({
                ...state,
                data: value,
              });
            }}
          />

          <div style={{
            ...styles.playIconContainer,
            ...(isControlVisible(state) ? styles.streamControlsContainer : {}),
          }}>
            <Controls
              active={active}
              dispatch={dispatch}
              state={state}
              protoInfo={protoInfo}
            />
          </div>
        </Resizable>

        <div style={{ ...styles.responseContainer }}>
          <Response
            streamResponse={state.responseStreamData}
            response={state.response}
          />
        </div>
      </div>

      <Metadata
        onClickMetadata={() => {
          dispatch(setMetadataVisibilty(!state.metadataOpened));
        }}
        onMetadataChange={(value) => {
          dispatch(setMetadata(value));
          onRequestChange?.({
            ...state,
            metadata: value,
          });
        }}
        value={state.metadata}
      />

      {protoInfo && (
        <ProtoFileViewer
          protoInfo={protoInfo}
          visible={state.protoViewVisible}
          onClose={() => dispatch(setProtoVisibility(false))}
        />
      )}

      {protoInfo && (
        <ProtoDocViewer
          protoInfo={protoInfo}
          visible={state.protoDocViewVisible}
          onClose={() => dispatch(setProtoDocVisibility(false))}
        />
      )}
    </div>
  )
}

const styles = {
  tabContainer: {
    width: "100%",
    height: "100%",
    position: "relative" as "relative",
    overflow: 'hidden',
  },
  editorContainer: {
    display: "flex",
    height: "100%",
    borderLeft: "1px solid rgba(0, 21, 41, 0.18)",
    background: "#fff"
  },
  responseContainer: {
    background: "white",
    maxWidth: "inherit",
    width: "inherit",
    display: "flex",
    flex: "1 1 0%",
    borderLeft: "1px solid #eee",
    borderRight: "1px solid rgba(0, 21, 41, 0.18)",
    overflow: "auto"
  },
  playIconContainer: {
    position: "absolute" as "absolute",
    zIndex: 10,
    right: "-30px",
    marginLeft: "-25px",
    top: "calc(50% - 80px)",
  },
  streamControlsContainer: {
    right: "-42px",
  },
  inputContainer: {
    display: "flex",
    justifyContent: "space-between",
    border: "1px solid rgba(0, 21, 41, 0.18)",
    borderBottom: "1px solid #eee",
    background: "#fafafa",
    padding: "15px",
    boxShadow: "2px 0px 4px 0px rgba(0,0,0,0.20)",
  },
};
