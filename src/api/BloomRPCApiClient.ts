/* eslint-disable import/no-extraneous-dependencies */
import crossFetch from 'cross-fetch';
import { ResponseError } from '@backstage/errors';
import { ConfigApi, DiscoveryApi, FetchApi, IdentityApi } from "@backstage/core-plugin-api";
import { ScmAuthApi } from "@backstage/integration-react";

import { BloomRPCApi, BloomRPCRequestOptions, SendRequestPayload, SendRequestResponse, UploadProtoPayload, UploadProtoResponse } from "./BloomRPCApi";

export class BloomRPCApiClient implements BloomRPCApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private readonly scmAuthApi: ScmAuthApi;
  private readonly configApi: ConfigApi;
  private readonly fetchApi: FetchApi;

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
    this.fetchApi = options.fetchApi || { fetch: crossFetch };
  }

  async uploadProto(payload: UploadProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse> {
    const formData = new FormData();
    if (!payload.files?.length) {
      throw new Error('Empty');
    }

    for (const file of payload.files) {
      formData.append('files[]', file, file.name);
    }

    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/upload-proto`,
      {
        headers: {
          ...(options?.token && { Authorization: `Bearer ${options?.token}` }),
        },
        body: formData,
        method: 'POST',
      },
    );

    const data = await res.json();

    return data;
  }

  async sendServerRequest(payload: SendRequestPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse> {
    await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl('bloomrpc')}/send-request`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.token && { Authorization: `Bearer ${options?.token}` }),
        },
        method: 'POST',
        // body: JSON.stringify({ entityRef }),
      },
    )

    return {};

  }

  //
  // Private methods
  //

  private async requestIgnored(
    method: string,
    path: string,
    options?: BloomRPCRequestOptions,
  ): Promise<void> {
    const url = `${await this.discoveryApi.getBaseUrl('bloomrpc')}${path}`;
    const headers: Record<string, string> = options?.token
      ? { Authorization: `Bearer ${options.token}` }
      : {};
    const response = await this.fetchApi.fetch(url, { method, headers });

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }
  }

  private async requestRequired(
    method: string,
    path: string,
    options?: BloomRPCRequestOptions,
  ): Promise<any> {
    const url = `${await this.discoveryApi.getBaseUrl('bloomrpc')}${path}`;
    const headers: Record<string, string> = options?.token
      ? { Authorization: `Bearer ${options.token}` }
      : {};
    const response = await this.fetchApi.fetch(url, { method, headers });

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    return await response.json();
  }

  private async requestOptional(
    method: string,
    path: string,
    options?: BloomRPCRequestOptions,
  ): Promise<any | undefined> {
    const url = `${await this.discoveryApi.getBaseUrl('catalog')}${path}`;
    const headers: Record<string, string> = options?.token
      ? { Authorization: `Bearer ${options.token}` }
      : {};
    const response = await this.fetchApi.fetch(url, { method, headers });

    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw await ResponseError.fromResponse(response);
    }

    return await response.json();
  }
}