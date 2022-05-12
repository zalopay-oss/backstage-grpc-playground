/* eslint-disable no-param-reassign */
// eslint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { ProtoInfo } from "./protoInfo";
import { Certificate } from "./types";
import * as grpcWeb from 'grpc-web';

export interface GRPCRequestInfo {
  url: string;
  protoInfo: ProtoInfo;
  metadata: string;
  inputs: string;
  interactive?: boolean;
  tlsCertificate?: Certificate;
}

export interface ResponseMetaInformation {
  responseTime?: number;
  stream?: boolean;
}

export const GRPCEventType = {
  DATA: "DATA",
  ERROR: "ERROR",
  END: "END",
};

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
  _call?: any;

  constructor({ url, protoInfo, metadata, inputs, interactive, tlsCertificate }: GRPCRequestInfo) {
    super();
    this.url = url;
    this.protoInfo = protoInfo;
    this.metadata = metadata;
    this.inputs = inputs;
    this.interactive = interactive;
    this.tlsCertificate = tlsCertificate;
    this._call = undefined;
  }

  send(): GRPCServerRequest {
    let inputs = {};
    let metadata: {[key: string]: any} = {};

    try {
      const reqInfo = this.parseRequestInfo(this.inputs, this.metadata);
      inputs = reqInfo.inputs;
      metadata = reqInfo.metadata;

      // TODO call backend plugin
    } catch(e) {
      return this;
    }

    return this;

  }

  /**
   * Write to a stream
   * @param data
   */
  write(data: string) {
    if (this._call) {
      // Add metadata
      let inputs = {};

      try {
        const reqInfo = this.parseRequestInfo(data);
        inputs = reqInfo.inputs;
      } catch(e) {
        return this;
      }
      this._call.write(inputs);
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

  /**
   * Commit stream
   */
  commitStream() {
    if (this._call) {
      this._call.end();
    }
  }

  /**
   * Parse JSON to request inputs / metadata
   * @param data
   * @param userMetadata
   */
  private parseRequestInfo(data: string, userMetadata?: string): { inputs: object, metadata: object } {
    let inputs = {};
    let metadata: {[key: string]: any} = {};

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
  _call?: grpcWeb.ClientReadableStream<any>;
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
    const serviceClient: any = this.protoInfo.client();
    const client = new grpcWeb.GrpcWebClientBase({format: 'text'})
    let inputs = {};
    let metadata: {[key: string]: any} = {};

    try {
      const reqInfo = this.parseRequestInfo(this.inputs, this.metadata);
      inputs = reqInfo.inputs;
      metadata = reqInfo.metadata;
    } catch(e) {
      return this;
    }

    // TODO: find proper type for call
    let call: grpcWeb.ClientReadableStream<any>;
    const requestStartTime = new Date();

    const web = grpcWeb as any
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

    const fullUrl : string = scheme+this.url+rpc.path
    this._fullUrl = fullUrl

    const methodDescriptor = new web.MethodDescriptor(
      rpc.path, // name
      this.protoInfo.isServerStreaming() ? web.MethodType.SERVER_STREAMING : web.MethodType.UNARY, // method type
      function(){}, // request type
      function(){}, // response type
      rpc.requestSerialize, // request serialisation fn
      rpc.responseDeserialize // response serialisation fn
    );

    if (this.protoInfo.isClientStreaming()) {
      const err = new Error('client streaming is not supported in GRPC-Web at the moment')
      this.emit(GRPCEventType.ERROR, err, {});
      this.emit(GRPCEventType.END);
      throw err;
    }

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
        (err: grpcWeb.RpcError, response: any) =>
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

  commitStream(){ }

  /**
   * Handle server side streaming response
   * @param call
   * @param streamStartTime
   */
  private handleServerStreaming(call: grpcWeb.ClientReadableStream<any>, streamStartTime?: Date) {
    call.on('data', (data: object) => {
      const responseMetaInformation = this.responseMetaInformation(streamStartTime, true);
      this.emit(GRPCEventType.DATA, data, responseMetaInformation);
      streamStartTime = new Date();
    });

    call.on('error', (err: grpcWeb.RpcError) => {
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
  private handleUnaryResponse(err: grpcWeb.RpcError, response: any, requestStartTime?: Date) {
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

  private betterErr(err: grpcWeb.RpcError) : Error {
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
    let metadata: {[key: string]: any} = {};

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