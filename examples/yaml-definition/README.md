## gRPC API configuration

Configuration explained:

- files (array): Proto files that the API use
  - file_name
  - url: URL to discover
  - file_path: relative path to the project root
  - imports (array, optional): Proto files this proto file use
    - file_name
    - url
    - file_path
- imports (array, optional): COMMON imports that shared between above proto files
  - file_name
  - url
  - file_path
- libraries (array, optional): libraries that shared between above proto files
  - name
  - url (optional)
  - path (optional)