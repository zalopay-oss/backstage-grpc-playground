/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { configApiRef, createApiFactory, createComponentExtension, createPlugin, createRoutableExtension, discoveryApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { scmAuthApiRef } from '@backstage/integration-react';
import { grpcPlaygroundApiRef, GrpcPlaygroundApiClient } from './api';

import { rootRouteRef } from './routes';

export const grpcPlaygroundPlugin = createPlugin({
  id: 'grpc-playground',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: grpcPlaygroundApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        scmAuthApi: scmAuthApiRef,
        identityApi: identityApiRef,
        configApi: configApiRef,
      },
      factory: ({
        discoveryApi,
        scmAuthApi,
        identityApi,
        configApi,
      }) =>
        new GrpcPlaygroundApiClient({
          discoveryApi,
          scmAuthApi,
          identityApi,
          configApi,
        })
    })
  ]
});

export const GrpcPlaygroundPage = grpcPlaygroundPlugin.provide(
  createRoutableExtension({
    name: 'GRPC Playground Page',
    component: () =>
      import('./components/App').then(m => m.StandaloneApp),
    mountPoint: rootRouteRef,
  }),
);

export const GrpcPlaygroundComponent = grpcPlaygroundPlugin.provide(
  createComponentExtension({
    name: 'GRPC Playground Plugin',
    component: {
      lazy: () => import('./components/App').then(m => m.App)
    }
  }),
);
