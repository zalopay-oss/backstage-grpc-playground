// eslint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { ProtoInfo } from "./protoInfo";
import { Certificate, LoadProtoStatus } from "./types";
import { SendRequestPayload, SendServerRequest, UploadProtoResponse } from "./GrpcPlaygroundApi";
import { v4 as uuid } from 'uuid';
import { fetchEventSource, FetchEventSourceInit, EventStreamContentType } from '@microsoft/fetch-event-source';

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
      const reqInfo = this.parseRequestInfo(this.inputs, this.metadata);
      this.requestData = reqInfo;
      const methodDef = this.protoInfo.methodDef();

      const doCall = () => {
        const payload: SendRequestPayload = {
          requestData: this.requestData,
          requestId: uuid(),
          url: this.url,
          interactive: this.interactive,
          methodName: this.protoInfo.methodName,
          serviceName: this.protoInfo.service.serviceName,
          imports: this.protoInfo.service.proto.imports,
          proto: this.protoInfo.service.proto.filePath,
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

              try {
                const { data, metaInfo } = JSON.parse(ev.data);
                this.emit(GRPCEventType.DATA, data, metaInfo);
              } catch (err) {
                this.emit(GRPCEventType.ERROR, err, {});
              }
            },
            onclose: () => {
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
              // Ignore
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
