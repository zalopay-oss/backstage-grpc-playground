# backstage-grpc-playground

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![Project Level](https://img.shields.io/badge/level-experiment-yellowgreen) [![version](https://img.shields.io/badge/repo%20status-active-brightgreen)](https://github.com/zalopay-oss/backstage-grpc-playground) [![version](https://img.shields.io/badge/contributors-2-blueviolet)](https://github.com/zalopay-oss/backstage-grpc-playground/graphs/contributors) [![version](https://img.shields.io/badge/open%20issues-0-red)](https://github.com/zalopay-oss/backstage-grpc-playground/issues)

<!-- TOC -->
- [**Overview**](#overview)
- [**Requirements**](#requirements)
- [**Methods supported**](#methods-supported)
- [**Install**](#install)
- [**Usage**](#Usage)
- [**Examples**](#examples)
- [**Additional compared to BloomRPC**](#compare-to-bloomrpc)
- [**Acknowledgements**](#acknowledgements)

## Overview

**backstage-grpc-playground** is a [backstage](https://backstage.io) plugin ported from [BloomRPC](https://github.com/bloomrpc/bloomrpc) which is an Electron application.

This repo contains React frontend plugin. For the backend plugin, please checkout [backstage-grpc-playground-backend](https://github.com/zalopay-oss/backstage-grpc-playground-backend.git)

## Requirements

- Backstage > 1.1.0
- Node.JS 14 | 16

## Methods supported

- Unary
- Client streaming
- Server streaming

## Install

Install backstage-grpc-playground for `packages/app`

E.g: In your backstage project root

```zsh
  yarn --cwd packages/app add backstage-grpc-playground
```

## Usage

```
// src/packages/app
```

## Examples



## Documentation

- Slide: [B+ Tree](docs/B+tree.pdf), [GodBee](docs/GodBee.pdf)
- Blog:
    - [Implement Key-Value Storage using Golang and C++ pt.1](https://medium.com/zalopay-engineering/cài-đặt-key-value-store-service-bằng-go-và-c-phần-1-storage-565b1a3f7e1b)
    - [Implement Key-Value Storage using Golang and C++ pt.2](https://medium.com/zalopay-engineering/cài-đặt-key-value-store-service-bằng-go-và-c-phần-2-service-937737ae515e)

## Acknowledgements

- Thanks to the awesome [BloomRPC Application](https://github.com/bloomrpc/bloomrpc)
