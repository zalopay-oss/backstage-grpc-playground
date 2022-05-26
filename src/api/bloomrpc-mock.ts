/* eslint-disable */
import { v4 as uuid } from 'uuid';
import get from 'lodash.get';

import {
  Enum,
  Field,
  Message,
  MapField, Method,
  Namespace,
  OneOf,
  ReflectionObject,
  Root,
  Service,
  Service as ProtoService,
  Type,
} from 'protobufjs';
import { Proto } from './protobuf';

export interface MethodPayload {
  plain: { [key: string]: any };
  message: Message;
}

export type ServiceMethodsPayload = {
  [name: string]: MethodPayload
};

const enum MethodType {
  request,
  response
}

const MAX_STACK_SIZE = 3;


/**
 * Walk through services
 */
export function walkServices(proto: Proto, onService: (service: Service, def: any, serviceName: string) => void) {
  const { ast, root } = proto;

  walkNamespace(root, namespace => {
    const nestedNamespaceTypes = namespace.nested;
    if (nestedNamespaceTypes) {
      Object.keys(nestedNamespaceTypes).forEach(nestedTypeName => {
        const fullNamespaceName = (namespace.fullName.startsWith('.'))
          ? namespace.fullName.replace('.', '')
          : namespace.fullName;

        const nestedType = root.lookup(`${fullNamespaceName}.${nestedTypeName}`);

        if (nestedType instanceof Service) {
          const serviceName = [
            ...fullNamespaceName.split('.'),
            nestedType.name
          ];

          const fullyQualifiedServiceName = serviceName.join('.');

          onService(nestedType as Service, get(ast, serviceName), fullyQualifiedServiceName);
        }
      });
    }
  });

  Object.keys(ast)
    .forEach(serviceName => {
      const lookupType = root.lookup(serviceName);
      if (lookupType instanceof Service) {
        // No namespace, root services
        onService(serviceByName(root, serviceName), ast[serviceName], serviceName);
      }
    });
}

export function walkNamespace(root: Root, onNamespace: (namespace: Namespace) => void, parentNamespace?: Namespace) {
  const namespace = parentNamespace ? parentNamespace : root;
  const nestedType = namespace.nested;

  if (nestedType) {
    Object.keys(nestedType).forEach((typeName: string) => {
      const nestedNamespace = root.lookup(`${namespace.fullName}.${typeName}`);
      if (nestedNamespace && isNamespace(nestedNamespace)) {
        onNamespace(nestedNamespace as Namespace);
        walkNamespace(root, onNamespace, nestedNamespace as Namespace);
      }
    });
  }
}

export function serviceByName(root: Root, serviceName: string): ProtoService {
  if (!root.nested) {
    throw new Error('Empty PROTO!');
  }

  const serviceLeaf = root.nested[serviceName];
  return root.lookupService(serviceLeaf.fullName);
}

function isNamespace(lookupType: ReflectionObject) {
  if (
    (lookupType instanceof Namespace) &&
    !(lookupType instanceof Service) &&
    !(lookupType instanceof Type) &&
    !(lookupType instanceof Enum) &&
    !(lookupType instanceof Field) &&
    !(lookupType instanceof MapField) &&
    !(lookupType instanceof OneOf) &&
    !(lookupType instanceof Method)
  ) {
    return true;
  }

  return false;
}

/**
 * Mock methods request
 */
export function mockRequestMethods(
  service: Service,
  mocks?: void | {},
) {
  return mockMethodReturnType(
    service,
    MethodType.request,
    mocks
  );
}

function mockMethodReturnType(
  service: Service,
  type: MethodType,
  mocks?: void | {},
): ServiceMethodsPayload {
  const root = service.root;
  const serviceMethods = service.methods;

  return Object.keys(serviceMethods).reduce((methods: ServiceMethodsPayload, method: string) => {
    const serviceMethod = serviceMethods[method];

    const methodMessageType = type === MethodType.request
      ? serviceMethod.requestType
      : serviceMethod.responseType;

    const messageType = root.lookupType(methodMessageType);

    let data = {};
    if (!mocks) {
      data = mockTypeFields(messageType);
    }

    methods[method] = {
      plain: data,
      message: messageType.fromObject(data)
    };

    return methods;
  }, {});
}

type StackDepth = {
  [type: string]: number;
};
/**
 * Mock a field type
 */
function mockTypeFields(type: Type, stackDepth: StackDepth = {}): object {
  if (stackDepth[type.name] > MAX_STACK_SIZE) {
    return {};
  }
  if (!stackDepth[type.name]) {
    stackDepth[type.name] = 0;
  }
  stackDepth[type.name]++;

  const fieldsData: { [key: string]: any } = {};

  return type.fieldsArray.reduce((data, field) => {
    field.resolve();

    if (field.parent !== field.resolvedType) {
      if (field.repeated) {
        data[field.name] = [mockField(field, stackDepth)];
      } else {
        data[field.name] = mockField(field, stackDepth);
      }
    }

    return data;
  }, fieldsData);
}

/**
 * Mock enum
 */
function mockEnum(enumType: Enum): number {
  const enumKey = Object.keys(enumType.values)[0];

  return enumType.values[enumKey];
}

/**
 * Mock a field
 */
function mockField(field: Field, stackDepth?: StackDepth): any {
  if (field instanceof MapField) {
    let mockPropertyValue = null;
    if (field.resolvedType === null) {
      mockPropertyValue = mockScalar(field.type, field.name);
    }

    if (mockPropertyValue === null) {
      const resolvedType = field.resolvedType;

      if (resolvedType instanceof Type) {
        if (resolvedType.oneofs) {
          mockPropertyValue = pickOneOf(resolvedType.oneofsArray);
        } else {
          mockPropertyValue = mockTypeFields(resolvedType);
        }
      } else if (resolvedType instanceof Enum) {
        mockPropertyValue = mockEnum(resolvedType);
      } else if (resolvedType === null) {
        mockPropertyValue = {};
      }
    }

    return {
      [mockScalar(field.keyType, field.name)]: mockPropertyValue,
    };
  }

  if (field.resolvedType instanceof Type) {
    return mockTypeFields(field.resolvedType, stackDepth);
  }

  if (field.resolvedType instanceof Enum) {
    return mockEnum(field.resolvedType);
  }

  const mockPropertyValue = mockScalar(field.type, field.name);

  if (mockPropertyValue === null) {
    const resolvedField = field.resolve();

    return mockField(resolvedField, stackDepth);
  } else {
    return mockPropertyValue;
  }
}

function pickOneOf(oneofs: OneOf[]) {
  return oneofs.reduce((fields: { [key: string]: any }, oneOf) => {
    fields[oneOf.name] = mockField(oneOf.fieldsArray[0]);
    return fields;
  }, {});
}

function mockScalar(type: string, fieldName: string): any {
  switch (type) {
    case 'string':
      return interpretMockViaFieldName(fieldName);
    case 'number':
      return 10;
    case 'bool':
      return true;
    case 'int32':
      return 10;
    case 'int64':
      return 20;
    case 'uint32':
      return 100;
    case 'uint64':
      return 100;
    case 'sint32':
      return 100;
    case 'sint64':
      return 1200;
    case 'fixed32':
      return 1400;
    case 'fixed64':
      return 1500;
    case 'sfixed32':
      return 1600;
    case 'sfixed64':
      return 1700;
    case 'double':
      return 1.4;
    case 'float':
      return 1.1;
    case 'bytes':
      return new Buffer('Hello');
    default:
      return null;
  }
}

/**
 * Tries to guess a mock value from the field name.
 * Default Hello.
 */
function interpretMockViaFieldName(fieldName: string): string {
  const fieldNameLower = fieldName.toLowerCase();

  if (fieldNameLower.startsWith('id') || fieldNameLower.endsWith('id')) {
    return uuid();
  }

  return 'Hello';
}