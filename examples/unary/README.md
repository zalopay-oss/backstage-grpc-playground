## Example unary gRPC call

See full [yaml file](examples/yaml-definition/unary.yaml)

In this example we will use [this demo server from GRPC team](https://github.com/grpc/grpc-web/tree/master/net/grpc/gateway/examples/helloworld) as a gateway for gRPC call

Steps to test in your backstage application:

- Install [our backstage-grpc-playground-backend plugin](https://github.com/zalopay-oss/backstage-grpc-playground-backend)

- Navigate to `/catalog-import`

- Import [examples/yaml-definition/unary.yaml](https://github.com/zalopay-oss/backstage-grpc-playground/blob/main/examples/yaml-definition/unary.yaml)

- Start gRPC server and make calls