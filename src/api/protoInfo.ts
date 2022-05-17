// @ts-ignore
/* eslint-disable import/no-extraneous-dependencies */
import { get as lodashGet } from 'lodash';
import { ProtoService } from './protobuf';
import { fromJSON, PackageDefinition, loadSync } from '@grpc/proto-loader';
// import { loadPackageDefinition } from '@grpc/grpc-js';

export class ProtoInfo {

  service: ProtoService;
  methodName: string;
  packageDefinition: PackageDefinition;

  constructor(service: ProtoService, methodName: string) {
    this.service = service;
    this.methodName = methodName;
    this.packageDefinition = fromJSON(service.proto.root);
    
    const serviceDefinition = this.serviceDef();
    const methodDef = serviceDefinition.methods[this.methodName];

    const { requestType, responseType } = methodDef;

    if (!methodDef.resolvedRequestType) {
      methodDef.resolvedRequestType = this.service.proto.root.lookupType(responseType);
    }
    
    if (!methodDef.resolvedResponseType) {
      methodDef.resolvedResponseType = this.service.proto.root.lookupType(requestType);
    }

    // console.log('this.service.proto.root', this.service.proto.root);

  }

  client(): any {
    return lodashGet(this.service.proto.ast, this.service.serviceName);
  }

  serviceDef() {
    return this.service.proto.root.lookupService(this.service.serviceName);
  }

  methodDef() {
    const serviceDefinition = this.serviceDef();
    return serviceDefinition.methods[this.methodName]; 
  }


  isClientStreaming() {
    const method = this.methodDef();
    return method && method.requestStream;
  }

  isServerStreaming() {
    const method = this.methodDef();
    return method && method.responseStream;
  }

  isBiDirectionalStreaming() {
    return this.isClientStreaming() && this.isServerStreaming();
  }

  usesStream() {
    return this.isClientStreaming() || this.isServerStreaming();
  }
}
