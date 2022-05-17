import { createApiRef } from "@backstage/core-plugin-api";
import { ProtoFile } from "./protobuf";

/**
 * Options you can pass into a catalog request for additional information.
 *
 * @public
 */
export interface BloomRPCRequestOptions {
  token?: string;
  fetcher?: typeof fetch;
  fetchOptions?: any;
}

export interface UploadProtoPayload {
  files: FileList;
  includeDirs?: string[];
}

export interface UploadProtoResponse {
  status: string;
  protos?: ProtoFile[]
}

export interface SendRequestPayload {
  requestId: string;
  proto: string;
  requestData: {
    inputs: Object;
    metadata: Object;
  };
  // stream?: ReadableStream;
  methodName: string;
  serviceName: string;
  url: string;
  interactive?: boolean;
}

export interface SendRequestStreamPayload {
  requestId: string;
  proto: string;
  stream: ReadableStream;
  methodName: string;
  serviceName: string;
  url: string;
  interactive?: boolean;
}

export interface SendRequestResponse extends Response {

}

export const bloomRPCApiRef = createApiRef<BloomRPCApi>({
  id: 'plugin.bloomrpc.service',
});

export interface UploadProtoRequest {
  (payload: UploadProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse>
}

export interface SendServerRequest {
  (payload: SendRequestPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
  // (payload: SendRequestStreamPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
}

export interface SendServerRequestStream {
  (payload: SendRequestStreamPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
}

export interface BloomRPCApi {
  uploadProto: UploadProtoRequest;
  sendServerRequest: SendServerRequest;
  sendServerRequestStream: SendServerRequestStream;
}
