/**
 * // FIXME Zalopay: 
 * @author thaotx3
 * 
 * This is a WORK AROUND for interface definitions 
 * and the @see ServiceClient which should extends `Client` class
 * 
 * We can not import `Client` from `@grpc/grpc-js`
 * as it require 'http2' package which only available in nodejs
 * 
 */

interface Serialize<T> {
  (value: T): Buffer;
}

interface ChannelCredentials extends Object { }

interface ChannelOptions extends Object { }

interface Deserialize<T> {
  (bytes: Buffer): T;
}

interface ClientMethodDefinition<RequestType, ResponseType> {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  requestSerialize: Serialize<RequestType>;
  responseDeserialize: Deserialize<ResponseType>;
  originalName?: string;
}

interface ServerMethodDefinition<RequestType, ResponseType> {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  responseSerialize: Serialize<ResponseType>;
  requestDeserialize: Deserialize<RequestType>;
  originalName?: string;
}

interface MethodDefinition<RequestType, ResponseType>
  extends ClientMethodDefinition<RequestType, ResponseType>,
  ServerMethodDefinition<RequestType, ResponseType> { }

type ServiceDefinition<
  ImplementationType = any
  > = {
    readonly [index in keyof ImplementationType]: MethodDefinition<any, any>;
  };

interface ProtobufTypeDefinition {
  format: string;
  type: object;
  fileDescriptorProtos: Buffer[];
}

// Workaround
interface ServiceClient /* extends Client */ {
  [methodName: string]: Function;
}

interface ServiceClientConstructor {
  new(
    address: string,
    credentials: ChannelCredentials,
    options?: Partial<ChannelOptions>
  ): ServiceClient;
  service: ServiceDefinition;
  serviceName: string;
}

export interface GrpcObject {
  [index: string]:
    | GrpcObject
    | ServiceClientConstructor
    | ProtobufTypeDefinition;
}
