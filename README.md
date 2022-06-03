# backstage-grpc-playground

![GitHub](https://img.shields.io/github/license/zalopay-oss/backstage-grpc-playground) ![Project Level](https://img.shields.io/badge/level-beta-yellowgreen) ![GitHub issues](https://img.shields.io/github/issues/zalopay-oss/backstage-grpc-playground) ![GitHub contributors](https://img.shields.io/github/contributors-anon/zalopay-oss/backstage-grpc-playground?color=blue) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/zalopay-oss/backstage-grpc-playground)

<!-- TOC -->
- [**Overview**](#overview)
- [**Requirements**](#requirements)
- [**Methods supported**](#methods-supported)
- [**Not supported**](#not-supported-yet)
- [**Install**](#install)
- [**Usage**](#usage)
- [**Compare to BloomRPC**](#compare-to-bloomrpc)
- [**Examples**](#examples)
- [**Acknowledgements**](#acknowledgements)

## Overview

**backstage-grpc-playground** is a [backstage](https://backstage.io) plugin ported from [BloomRPC](https://github.com/bloomrpc/bloomrpc) which is an Electron application. We modified some of the original code to make this compatible with Backstage entity. See [Compare to BloomRPC](#compare-to-bloomrpc)

This repo contains React frontend plugin. For the backend plugin, please checkout [backstage-grpc-playground-backend](https://github.com/zalopay-oss/backstage-grpc-playground-backend.git)

## Requirements

- Backstage ^1.1.0
- Node.JS 14 | 16

## Methods supported

- Unary
- Client streaming
- Server streaming

## Not supported (yet)

We are currently not supporting

- SSL call [See issue](https://github.com/zalopay-oss/backstage-grpc-playground/issues/1)
- Load proto from reflection. [See issue](https://github.com/zalopay-oss/backstage-grpc-playground/issues/2)

## Install

Install backstage-grpc-playground for `packages/app`

E.g: In your backstage project root

```zsh
  yarn --cwd packages/app add backstage-grpc-playground
```

## Usage

#### Customize ApiDoc to use **backstage-grpc-playground** for `grpc` type

```typescript
// packages/app/src/apis.ts
import { GrpcPlaygroundComponent } from 'backstage-grpc-playground';

// your code
// ...

export const apis: AnyApiFactory[] = [
  // other apis 
  // ...
  
  createApiFactory({
    api: apiDocsConfigRef,
    deps: {},
    factory: () => {
      // load the default widgets
      const definitionWidgets = defaultDefinitionWidgets();

      return {
        getApiDefinitionWidget: (apiEntity: ApiEntity) => {
          // custom rendering for grpc
          if (apiEntity.spec.type === 'grpc') {
            return {
              type: 'grpc',
              title: 'gRPC Playground',
              component: GrpcPlaygroundComponent
            }
          }
          
          // fallback to the defaults
          return definitionWidgets.find(d => d.type === apiEntity.spec.type);
        },
      };
    },
  }),
]
```

#### A path `/grpc-playground` in backstage application

```tsx
// packages/app/src/App.tsx
import { GrpcPlaygroundPage } from 'backstage-grpc-playground'

// your code
// ...

const routes = (
  <FlatRoutes>
    // other routes 
    // ...
    <Route path="/grpc-playground" element={<GrpcPlaygroundPage />} />
  </FlatRoutes>
);
```

## Compare to BloomRPC

- Import proto files and creating clients at backstage backend
- Missing imports warning
- Send server request only

## Examples

#### Unary

See full [yaml file](examples/yaml-definition/unary.yaml)

#### Stream

See full [yaml file](examples/yaml-definition/stream.yaml)

## Acknowledgements

- Thanks to [Backstage Team](https://github.com/backstage/backstage) for creating an incredable framework
- Thanks to the authors of the awesome [BloomRPC Application](https://github.com/bloomrpc/bloomrpc)
