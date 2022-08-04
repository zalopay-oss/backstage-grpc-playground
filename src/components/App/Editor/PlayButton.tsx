/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { notification } from 'antd';
import * as Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import { useApi } from '@backstage/core-plugin-api';

import {
  setCall,
  setIsLoading,
  setResponse,
  setResponseStreamData,
  setRequestStreamData,
  addResponseStreamData, setStreamCommitted
} from './actions';
import { ControlsStateProps } from './Controls';
import { GRPCServerRequest, GRPCEventType, ResponseMetaInformation, grpcPlaygroundApiRef, SendServerRequest, UploadProtoResponse, UploadCertificateResponse, Certificate } from '../../../api';

import { ProtoContextType, useProtoContext } from '../ProtoProvider';
import { CertificateContextType, useCertificateContext } from '../CertificateProvider';
import { isSameCertificate } from '../../../utils/certificates';

type MakeRequestPayload = ControlsStateProps & {
  protoContext: ProtoContextType;
  certContext: CertificateContextType;
  sendServerRequest: SendServerRequest;
}

export const makeRequest = ({ dispatch, state, protoInfo, sendServerRequest, protoContext, certContext }: MakeRequestPayload) => {
  // Do nothing if not set
  if (!protoInfo) {
    return;
  }

  // Cancel the call if ongoing.
  if (state.loading && state.call) {
    state.call.cancel();
    return;
  }

  // Play button action:
  dispatch(setIsLoading(true));

  // TODO: handle server request
  // eslint-disable-next-line no-constant-condition

  const grpcRequest = new GRPCServerRequest({
    url: state.url,
    inputs: state.data,
    metadata: state.metadata,
    protoInfo,
    interactive: state.interactive,
    tlsCertificate: state.tlsCertificate,
    sendServerRequest,
  });

  dispatch(setCall(grpcRequest));

  // Streaming cleanup
  if (grpcRequest.protoInfo.isClientStreaming()) {
    if (state.interactive) {
      dispatch(setRequestStreamData([state.data]));
    } else {
      dispatch(setRequestStreamData([]));
    }
  }

  dispatch(setResponseStreamData([]));

  grpcRequest.on(GRPCEventType.ERROR, (e: Error, metaInfo: ResponseMetaInformation) => {
    dispatch(setResponse({
      responseTime: metaInfo.responseTime,
      output: JSON.stringify({
        error: e.message,
      }, null, 2)
    }));
  });

  grpcRequest.on(GRPCEventType.MISSING_IMPORTS, (uploadProtoRes: UploadProtoResponse) => {
    protoContext.handleProtoResult(uploadProtoRes);

    // eslint-disable-next-line prefer-const
    const handlerId = protoContext.addUploadedListener(protoInfo, protos => {
      protoContext.removeUploadedListener(protoInfo, handlerId);

      if (protos.find(p => p.proto.filePath === protoInfo.service.proto.filePath)) {
        // Re-send
        grpcRequest.send();
      }
    })
  });

  grpcRequest.on(GRPCEventType.MISSING_CERTS, (uploadProtoRes: UploadCertificateResponse) => {
    const selectedCertificate = grpcRequest.tlsCertificate!;
    certContext.handleCertResult(uploadProtoRes);

    // eslint-disable-next-line prefer-const
    const handlerId = certContext.addUploadedListener(selectedCertificate, (certificate) => {
      certContext.removeUploadedListener(selectedCertificate, handlerId);

      if (isSameCertificate(certificate, selectedCertificate)) {
        // Re-send
        grpcRequest.send();
      }
    })
  });

  grpcRequest.on(GRPCEventType.DATA, (data: object, metaInfo: ResponseMetaInformation) => {
    if (metaInfo.stream && state.interactive) {
      dispatch(addResponseStreamData({
        output: JSON.stringify(data, null, 2),
        responseTime: metaInfo.responseTime,
      }));
    } else {
      dispatch(setResponse({
        responseTime: metaInfo.responseTime,
        output: JSON.stringify(data, null, 2),
      }));
    }
  });

  grpcRequest.on(GRPCEventType.END, () => {
    dispatch(setIsLoading(false));
    dispatch(setCall(undefined));
    dispatch(setStreamCommitted(false));
  });

  try {
    grpcRequest.send();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    notification.error({
      message: "Error constructing the request",
      description: e.message,
      duration: 5,
      placement: "bottomRight",
      style: {
        width: "100%",
        wordBreak: "break-all",
      }
    });

    grpcRequest.emit(GRPCEventType.END);
  }
};

export function PlayButton({ dispatch, state, protoInfo, active }: ControlsStateProps) {
  const grpcApi = useApi(grpcPlaygroundApiRef);
  const sendServerRequest = grpcApi.sendServerRequest.bind(grpcApi);
  const protoContext = useProtoContext()!;
  const certContext = useCertificateContext()!;

  React.useEffect(() => {
    if (!active) {
      return
    }

    Mousetrap.bindGlobal(['ctrl+enter', 'command+enter'], () => {
      if (state.loading) {
        return
      }

      makeRequest({ dispatch, state, protoInfo, sendServerRequest, protoContext, certContext })
    })
  }, [
    // a bit of optimisation here: list all state properties needed in this component
    state.grpcWeb,
    state.url,
    state.data,
    state.metadata,
    state.interactive,
    state.tlsCertificate,
    sendServerRequest,
    protoContext,
    certContext,
  ])

  const iconProps = {
    style: { ...styles.playIcon, ...(state.loading ? { color: "#ea5d5d" } : {}) },
    onClick: () => makeRequest({ dispatch, state, protoInfo, sendServerRequest, protoContext, certContext }),
  }

  return state.loading ? (
    <PauseCircleFilled {...iconProps} />
  ) : (
    <PlayCircleFilled {...iconProps} />
  );
}

const styles = {
  playIcon: {
    fontSize: 50,
    color: "#28d440",
    border: "3px solid rgb(238, 238, 238)",
    borderRadius: "50%",
    cursor: "pointer",
    background: "#fff",
  },
};
