import { ConfigApi, DiscoveryApi, FetchApi, IdentityApi } from "@backstage/core-plugin-api";
import { ScmAuthApi } from "@backstage/integration-react";

import {
  GrpcPlaygroundApi, GRPCPlaygroundRequestOptions,
  GetProtoPayload, SendRequestPayload, SendRequestResponse,
  UploadProtoPayload, UploadProtoResponse, UploadCertificatePayload, UploadCertificateResponse
} from "./GrpcPlaygroundApi";

export class GrpcPlaygroundApiClient implements GrpcPlaygroundApi {
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

  async getProto(payload: GetProtoPayload, options?: GRPCPlaygroundRequestOptions): Promise<UploadProtoResponse> {
    const { token } = await this.identityApi.getCredentials();

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('grpc-playground')}/proto-info/${this.entityName}`,
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

  async uploadProto(payload: UploadProtoPayload, options?: GRPCPlaygroundRequestOptions): Promise<UploadProtoResponse> {
    const { token } = await this.identityApi.getCredentials();

    const formData = new FormData();
    if (!payload.files?.length) {
      throw new Error('Empty');
    }

    for (const file of payload.files) {
      formData.append('files[]', file, file.name);
    }

    if (payload.importFor) {
      formData.append('importFor', JSON.stringify(payload.importFor));
    }

    if (payload.fileMappings) {
      formData.append('fileMappings', JSON.stringify(payload.fileMappings));
    }

    if (payload.isGenDoc !== undefined) {
      formData.append('isGenDoc', JSON.stringify(payload.isGenDoc));
    }

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('grpc-playground')}/upload-proto/${this.entityName}`,
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

  async sendServerRequest(payload: SendRequestPayload, options?: GRPCPlaygroundRequestOptions): Promise<SendRequestResponse> {
    const { token } = await this.identityApi.getCredentials();

    const fetch = options?.fetcher || this.fetchApi.fetch;

    const res = await fetch(
      `${await this.discoveryApi.getBaseUrl('grpc-playground')}/send-request/${this.entityName}`,
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

  async uploadCertificate(payload: UploadCertificatePayload, options?: GRPCPlaygroundRequestOptions): Promise<UploadCertificateResponse> {
    const { token } = await this.identityApi.getCredentials();
    const formData = new FormData();

    if (payload.files) {
      const files = [payload.files].flat() as File[];

      if (files.length === 0) {
        throw new Error('Empty');
      }

      for (const file of files) {
        formData.append('files[]', file, file.name);
      }
    }

    if (payload.fileMappings) {
      formData.append('fileMappings', JSON.stringify(payload.fileMappings));
    }

    const fetch = options?.fetcher || this.fetchApi.fetch;

    const res = await fetch(
      `${await this.discoveryApi.getBaseUrl('grpc-playground')}/upload-cert/${this.entityName}`,
      {
        ...(options?.fetchOptions || {}),
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        method: 'POST',
        body: formData,
      },
    );

    const data = await res.json();

    return data;
  }
}