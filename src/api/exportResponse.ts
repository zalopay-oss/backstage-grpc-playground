// import FileSaver from 'file-saver';
import { fileSave } from 'browser-fs-access';
import { EditorState } from "../components/App/Editor";
import { ProtoInfo } from "./protoInfo";

export function exportResponseToJSONFile(protoInfo: ProtoInfo, editorState: EditorState) {
  const timestamp = new Date().getTime();
  const fileName = `${protoInfo.service.serviceName}.${protoInfo.methodName}_${timestamp}.json`;

  const responseData = editorState.response.output
    ? editorState.response.output
    : JSON.stringify(editorState.responseStreamData.map((steam) => JSON.parse(steam.output)), null, 2);

  const file = new File([responseData], fileName, { type: "application/json;charset=utf-8" });
  fileSave(file);
  // FileSaver.saveAs(file);
}