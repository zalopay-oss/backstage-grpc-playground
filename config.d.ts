export interface Config {
  grpcPlayground?: {
    document?: {
      /**
       * @visibility frontend
       */
      enabled?: boolean;

      /**
       * Install protoc-gen-doc from github
       */
      protocGenDoc?: {
        install?: boolean;
        version?: string;
      };
      /**
       * Use cache for generated document or not
       */
      useCache?: {
        enabled: boolean;
        ttlInMinutes: number;
      };
    };
  };
}