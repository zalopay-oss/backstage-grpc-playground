/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
// eslint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { ProtoInfo } from "./protoInfo";
import { Certificate, LoadProtoStatus } from "./types";
import {
  GrpcWebClientBase,
  ClientReadableStream,
  RpcError,
  MethodDescriptor,
  MethodType,
} from 'grpc-web';
import { SendRequestPayload, SendServerRequest, UploadProtoResponse } from "./GrpcPlaygroundApi";
import { v4 as uuid } from 'uuid';
import { fetchEventSource, FetchEventSourceInit, EventStreamContentType } from '@microsoft/fetch-event-source';

const anyFunction: any = function () { };

export interface GRPCRequestInfo {
  url: string;
  protoInfo: ProtoInfo;
  metadata: string;
  inputs: string;
  interactive?: boolean;
  tlsCertificate?: Certificate;
}

export interface GRPCServerRequestInfo {
  url: string;
  protoInfo: ProtoInfo;
  metadata: string;
  inputs: string;
  interactive?: boolean;
  tlsCertificate?: Certificate;
  // sendServerRequest: SendServerRequest | SendServerRequestStream;
  sendServerRequest: SendServerRequest;
}

export interface ResponseMetaInformation {
  responseTime?: number;
  stream?: boolean;
}

export const GRPCEventType = {
  DATA: "DATA",
  ERROR: "ERROR",
  END: "END",
  MISSING_IMPORTS: "MISSING_IMPORTS",
};

class RetriableError extends Error { }
class FatalError extends Error { }

export interface GRPCEventEmitter extends EventEmitter {
  protoInfo: ProtoInfo;
  send(): GRPCEventEmitter;
  write(data: string): GRPCEventEmitter;
  commitStream(): void;
  cancel(): void;
}

export class GRPCServerRequest extends EventEmitter {
  url: string;
  protoInfo: ProtoInfo;
  metadata: string;
  inputs: string;
  interactive?: boolean;
  tlsCertificate?: Certificate;
  private ctrl: AbortController;
  private sendServerRequest: SendServerRequest;
  private doCall?: () => Promise<void>;
  requestData: any = {};

  constructor({
    url,
    protoInfo,
    metadata,
    inputs,
    interactive,
    tlsCertificate,
    sendServerRequest,
  }: GRPCServerRequestInfo) {
    super();
    this.url = url;
    this.protoInfo = protoInfo;
    this.metadata = metadata;
    this.inputs = inputs;
    this.interactive = interactive;
    this.tlsCertificate = tlsCertificate;
    this.sendServerRequest = sendServerRequest;
    this.ctrl = new AbortController();
  }

  send(): GRPCServerRequest {
    try {

      // TODO call backend plugin

      // eslint-disable-next-line no-constant-condition
      const reqInfo = this.parseRequestInfo(this.inputs, this.metadata);
      this.requestData = reqInfo;
      const methodDef = this.protoInfo.methodDef();

      const doCall = () => {
        console.log('OUTPUT ~ GRPCServerRequest ~ doCall ~ this.requestData', this.requestData);

        const payload: SendRequestPayload = {
          requestData: this.requestData,
          requestId: uuid(),
          url: this.url,
          interactive: this.interactive,
          methodName: this.protoInfo.methodName,
          serviceName: this.protoInfo.service.serviceName,
          imports: this.protoInfo.service.proto.imports,
          proto: this.protoInfo.service.proto.filePath,
          // proto: this.protoInfo.service.proto.protoText,
        };

        let fetcher: any;
        let fetchOptions: Partial<RequestInit> = {
          signal: this.ctrl.signal,
        };

        if (methodDef.responseStream || methodDef.requestStream) {
          // Stream request with fetch-event-source
          fetcher = fetchEventSource;

          fetchOptions = {
            ...fetchOptions,
            onmessage: (ev) => {
              if (!ev.data) return;
              console.log('do call ~ onmessage', 'ev.event', ev.event, 'data', ev.data);

              try {
                const { data, metaInfo } = JSON.parse(ev.data);
                this.emit(GRPCEventType.DATA, data, metaInfo);
              } catch (err) {
                this.emit(GRPCEventType.ERROR, err, {});
              }
            },
            onclose: () => {
              console.log('do call ~ onmessage ~ onclose');
              this.emit(GRPCEventType.END);
            },
            onopen: async (res) => {
              if (res.ok && res.headers.get('content-type') === EventStreamContentType) {
                return; // everything's good
              } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                if (res.status === 400) {
                  const uploadProtoRes = await res.json() as UploadProtoResponse | undefined;

                  if (uploadProtoRes?.status === LoadProtoStatus.part) {
                    this.emit(GRPCEventType.MISSING_IMPORTS, uploadProtoRes);
                  }
                }

                throw new FatalError();
              } else {
                throw new RetriableError();
              }
            },
            onerror: (err) => {
              console.log('OUTPUT ~ GRPCServerRequest ~ doCall ~ onerror ~ err', err);
              this.emit(GRPCEventType.ERROR, err, {});

              this.ctrl.abort();

              this.emit(GRPCEventType.END);
              throw err;
            }
          } as FetchEventSourceInit;
        }

        return this.sendServerRequest(payload, {
          fetcher,
          fetchOptions,
        })
          .then(async (res) => {
            if (!res) return;

            try {
              // Unary
              const { error, data, metaInfo } = await res.json();

              if (error) {
                const errorThrow = new Error(error.details);

                this.emit(GRPCEventType.ERROR, errorThrow, metaInfo);
              }

              if (data) {
                this.emit(GRPCEventType.DATA, data, metaInfo);
              }
            } catch (err) {
              console.log('err', err);
            }
          }).catch(e => {
            this.emit(GRPCEventType.ERROR, e, {});
          }).finally(() => {
            this.emit(GRPCEventType.END);
          })
      }

      if (methodDef.requestStream && this.interactive) {
        this.doCall = doCall;

        return this;
      }

      doCall();
    } catch (e) {
      return this;
    }

    return this;
  }

  /**
   * Write to a stream
   * @param data
   */
  write(data: string) {
    if (!this.requestData.inputs.stream) {
      this.requestData.inputs = {
        stream: [
          this.requestData.inputs,
        ]
      }
    }

    this.requestData.inputs.stream.push(this.parseRequestInfo(data).inputs);

    return this;
  }

  /**
   * Cancel request
   */
  cancel() {
    if (this.ctrl) {
      console.log('aborting request');
      this.ctrl?.abort?.();
    }

    this.emit(GRPCEventType.END);
  }

  /**
   * Commit stream
   */
  commitStream() {
    this.doCall?.();
  }

  /**
   * Parse JSON to request inputs / metadata
   * @param data
   * @param userMetadata
   */
  private parseRequestInfo(data: string, userMetadata?: string): { inputs: object, metadata: object } {
    let inputs = {};
    let metadata: { [key: string]: any } = {};

    try {
      inputs = JSON.parse(data || "{}")
    } catch (e) {
      e.message = "Couldn't parse JSON inputs Invalid json";
      this.emit(GRPCEventType.ERROR, e, {});
      this.emit(GRPCEventType.END);
      throw new Error(e);
    }

    if (userMetadata) {
      try {
        metadata = JSON.parse(userMetadata || "{}")
      } catch (e) {
        e.message = "Couldn't parse JSON metadata Invalid json";
        this.emit(GRPCEventType.ERROR, e, {});
        this.emit(GRPCEventType.END);
        throw new Error(e);
      }
    }

    return { inputs, metadata };
  }
}

export class GRPCWebRequest extends EventEmitter {
  url: string;
  protoInfo: ProtoInfo;
  metadata: string;
  inputs: string;
  interactive?: boolean;
  tlsCertificate?: Certificate;
  _call?: ClientReadableStream<any>;
  _fullUrl?: string;

  constructor({ url, protoInfo, metadata, inputs, interactive, tlsCertificate }: GRPCRequestInfo) {
    super()
    this.url = url;
    this.protoInfo = protoInfo;
    this.metadata = metadata;
    this.inputs = inputs;
    this.interactive = interactive;
    this.tlsCertificate = tlsCertificate;
    this._call = undefined;
    this._fullUrl = undefined;
  }

  send(): GRPCWebRequest {
    if (this.protoInfo.isClientStreaming()) {
      const err = new Error('client streaming is not supported in GRPC-Web at the moment')
      this.emit(GRPCEventType.ERROR, err, {});
      this.emit(GRPCEventType.END);
      throw err;
    }

    const serviceClient: any = this.protoInfo.client();

    const methodDef = this.protoInfo.methodDef();

    let inputs = {};
    let metadata: { [key: string]: any } = {};

    try {
      const reqInfo = this.parseRequestInfo(this.inputs, this.metadata);
      inputs = reqInfo.inputs;
      metadata = reqInfo.metadata;
    } catch (e) {
      return this;
    }

    // TODO: find proper type for call
    let call: ClientReadableStream<any>;
    const requestStartTime = new Date();

    const rpc = serviceClient.service[this.protoInfo.methodName]

    let scheme = 'http://'
    if (this.url.startsWith("http://") || this.url.startsWith("https://")) {
      scheme = ''
    } else if (this.tlsCertificate) {
      if (this.tlsCertificate.useServerCertificate) {
        scheme = 'https://'
      } else {
        // TODO: can we do anything about self-signed CA?
      }
    }

    const fullUrl: string = scheme + this.url + rpc.path
    this._fullUrl = fullUrl

    const methodDescriptor = new MethodDescriptor<typeof methodDef.resolvedRequestType, typeof methodDef.resolvedResponseType>(
      rpc.path, // name
      this.protoInfo.isServerStreaming() ? MethodType.SERVER_STREAMING : MethodType.UNARY, // method type
      methodDef.resolvedRequestType?.ctor || anyFunction, // request type
      methodDef.resolvedResponseType?.ctor || anyFunction, // response type
      rpc.requestSerialize, // request serialisation fn
      rpc.responseDeserialize // response serialisation fn
    );

    const client = new GrpcWebClientBase({
      format: 'text',
    });

    if (this.protoInfo.isServerStreaming()) {
      call = client.serverStreaming(
        fullUrl,
        inputs,
        metadata, // metadata
        methodDescriptor, // MethodDescriptor
      )
    } else {
      call = client.rpcCall(
        fullUrl,
        inputs,
        metadata,
        methodDescriptor,
        (err: RpcError, response: any) =>
          this.handleUnaryResponse(err, response, requestStartTime)
      )
    }

    this._call = call

    if (this.protoInfo.isServerStreaming()) {
      this.handleServerStreaming(call, requestStartTime)
    }

    return this;
  }


  /**
   * Cancel request
   */
  cancel() {
    if (this._call) {
      this._call.cancel();
      this.emit(GRPCEventType.END);
    }
  }

  write() {
    return this;
  }

  commitStream() { }

  /**
   * Handle server side streaming response
   * @param call
   * @param streamStartTime
   */
  private handleServerStreaming(call: ClientReadableStream<any>, streamStartTime?: Date) {
    call.on('data', (data: object) => {
      const responseMetaInformation = this.responseMetaInformation(streamStartTime, true);
      this.emit(GRPCEventType.DATA, data, responseMetaInformation);
      streamStartTime = new Date();
    });

    call.on('error', (err: RpcError) => {
      const responseMetaInformation = this.responseMetaInformation(streamStartTime, true);
      if (err && err.code !== 1) {
        this.emit(GRPCEventType.ERROR, this.betterErr(err), responseMetaInformation);

        if (err.code === 2 || err.code === 14) { // Stream Removed.
          this.emit(GRPCEventType.END, call);
        }
      }
      streamStartTime = new Date();
    });

    call.on('end', () => {
      this.emit(GRPCEventType.END, this);
    });
  }

  /**
   * Handle unary response
   * @param err
   * @param response
   * @param requestStartTime
   */
  private handleUnaryResponse(err: RpcError, response: any, requestStartTime?: Date) {
    const responseMetaInformation = this.responseMetaInformation(requestStartTime);

    // Client side streaming handler
    if (err) {
      // Request cancelled do nothing
      if (err.code === 1) {
        return;
      }
      this.emit(GRPCEventType.ERROR, this.betterErr(err), responseMetaInformation);

    } else {
      this.emit(GRPCEventType.DATA, response, responseMetaInformation);
    }
    this.emit(GRPCEventType.END);
  }

  private betterErr(err: RpcError): Error {
    return new Error(`full url: ${this._fullUrl}, code: ${err.code}, err: ${err.message}`)
  }

  /**
   * Response meta information
   * @param startTime
   * @param stream
   */
  private responseMetaInformation(startTime?: Date, stream?: boolean) {
    const responseDate = new Date();

    return {
      responseTime: startTime && (responseDate.getTime() - startTime.getTime()) / 1000,
      stream,
    };
  }

  /**
   * Parse JSON to request inputs / metadata
   * @param data
   * @param userMetadata
   */
  private parseRequestInfo(data: string, userMetadata?: string): { inputs: object, metadata: object } {
    let inputs = {};
    let metadata: { [key: string]: any } = {};

    try {
      inputs = JSON.parse(data || "{}")
    } catch (e) {
      e.message = "Couldn't parse JSON inputs Invalid json";
      this.emit(GRPCEventType.ERROR, e, {});
      this.emit(GRPCEventType.END);
      throw new Error(e);
    }

    if (userMetadata) {
      try {
        metadata = JSON.parse(userMetadata || "{}")
      } catch (e) {
        e.message = "Couldn't parse JSON metadata Invalid json";
        this.emit(GRPCEventType.ERROR, e, {});
        this.emit(GRPCEventType.END);
        throw new Error(e);
      }
    }

    return { inputs, metadata };
  }
}