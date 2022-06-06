## Example streaming gRPC 

See full [yaml file](../yaml-definition/stream.yaml)

In this example we will use [this demo server from aditya-sridhar](https://github.com/aditya-sridhar/grpc-streams-nodejs-demo) as a gateway for gRPC call

Steps to test in your backstage application:

- Install [our backstage-grpc-playground-backend plugin](https://github.com/zalopay-oss/backstage-grpc-playground-backend)
- Navigate to `/catalog-import`
- Import [examples/yaml-definition/stream.yaml](https://github.com/zalopay-oss/backstage-grpc-playground/blob/main/examples/yaml-definition/stream.yaml)
- Start gRPC server and make calls
