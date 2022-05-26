import { ConfigApi, DiscoveryApi, FetchApi, IdentityApi } from "@backstage/core-plugin-api";
import { ScmAuthApi } from "@backstage/integration-react";

import { BloomRPCApi, BloomRPCRequestOptions, GetProtoPayload, SendRequestPayload, SendRequestResponse, SendRequestStreamPayload, UploadProtoPayload, UploadProtoResponse } from "./BloomRPCApi";

export class BloomRPCApiClient implements BloomRPCApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private readonly scmAuthApi: ScmAuthApi;
  private readonly configApi: ConfigApi;
  private readonly fetchApi: FetchApi;
  private entityName: string;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    scmAuthApi: ScmAuthApi;
    identityApi: IdentityApi;
    configApi: ConfigApi;
    fetchApi?: FetchApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.scmAuthApi = options.scmAuthApi;
    this.identityApi = options.identityApi;
    this.configApi = options.configApi;
    this.fetchApi = options.fetchApi || { fetch: window.fetch.bind(window) };
    this.entityName = '';
  }

  setEntityName = (entityName: string) => {
    this.entityName = entityName;
  }

  async getProto(payload: GetProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse> {
    const { token } = await this.identityApi.getCredentials();

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/proto-info/${this.entityName}`,
      {
        ...(options?.fetchOptions || {}),
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

    const data = await res.json();

    return data;
  }

  async uploadProto(payload: UploadProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse> {
    const { token } = await this.identityApi.getCredentials();

    const formData = new FormData();
    if (!payload.files?.length) {
      throw new Error('Empty');
    }

    for (const file of payload.files) {
      formData.append('files[]', file, file.name);
    }

    if (payload.isImport) {
      formData.append('importFor', JSON.stringify(payload.isImport));
    }

    if (payload.fileMappings) {
      formData.append('fileMappings', JSON.stringify(payload.fileMappings));
    }

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/upload-proto/${this.entityName}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        method: 'POST',
      },
    );

    const data = await res.json();

    return data;
  }

  async sendServerRequest(payload: SendRequestPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse> {
    const { token } = await this.identityApi.getCredentials();

    const fetch = options?.fetcher || this.fetchApi.fetch;

    const res = await fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/send-request/${this.entityName}`,
      {
        ...(options?.fetchOptions || {}),
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

    return res;
  }

  async sendServerRequestStream(payload: SendRequestStreamPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse> {
    const { token } = await this.identityApi.getCredentials();

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/send-request-stream/${this.entityName}`,
      {
        headers: {
          'Content-Type': 'text/plain',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        method: 'POST',
        body: payload.stream,
        ...{ allowHTTP1ForStreamingUpload: true } as any,
      },
    )

    return res;
  }
}