/**
 * @license
 * Copyright 2016 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CancellationToken, uncancelableToken} from 'neuroglancer/util/cancellation';
import {Uint64} from 'neuroglancer/util/uint64';
import {urlSafeParse} from 'neuroglancer/util/json';
import {ContextMenu} from 'neuroglancer/ui/context_menu';
import {ElementVisibilityFromTrackableBoolean} from 'neuroglancer/trackable_boolean';
//import {makeTextIconButton} from 'neuroglancer/widget/text_icon_button';
import {makeDerivedWatchableValue} from 'neuroglancer/trackable_value';
//import {RootLayoutContainer} from 'neuroglancer/layer_groups_layout';
//import {LayerInfoPanelContainer} from 'neuroglancer/ui/layer_side_panel';
//import {DragResizablePanel} from 'neuroglancer/ui/drag_resize';
//import {StatisticsDisplayState, StatisticsPanel} from 'neuroglancer/ui/statistics';
//import {AnnotationToolStatusWidget} from 'neuroglancer/widget/annotation_tool_status';


export class HttpError extends Error {
  url: any;
  status: number;
  statusText: string;
  element: HTMLElement;
  contextMenu:any;
  registerDisposer:any;
  navigationState:any;
  uiControlVisibility:any;
  selectedLayer:any;
  layout:any;
  showHelpDialog:any;
  registerEventListener:any;
  editJsonState:any;
  mouseState:any;
  chunkQueueManager:any;
  statisticsDisplayState:any;
  visibility:any;
  visible:any;
  
  constructor(url: any, status: number, statusText: string) {
    console.log("$$$$$$$ url : "+url);
    console.log("$$$$$$$ status : "+status);
    // console.log()

    let message = `Fetching ${JSON.stringify(url)} resulted in HTTP error ${status}`;
    if (statusText) {
      message += `: ${statusText}`;
    }
    message += '.';
    super(message);
    this.name = 'HttpError';
    this.message = message;
    this.url = url;
    this.status = status;
    this.statusText = statusText;
	
////////////////////////////////////////

   

   //viewer.ts 404번째부터 가져옴
   //var contextMenu = ContextMenu;
	const gridContainer = this.element;
    let idListDiv = document.getElementById('id_list_div')||null; //Joe
    //idListDiv.id = "id_list_div"; //Joe
    
    //var title = document.createElement("span");
    //title.innerText = " Seg-ID List";
    //title.id = "list_title";
    //title.innerHTML += "<br/>";
    //idListDiv.appendChild(title);

    document.onkeydown = function(e){
	  e.stopImmediatePropagation;
        return;
    } //onkeydown

    url = url.split("/");
    var userId = url[5];
	var dirName = url[6];
	var inputType = url[7];
	
    var result = ""; //JOe
    var xmlhttp = new XMLHttpRequest(); //JOe
    xmlhttp.open("GET", "http://kbrain-map.kbri.re.kr:8080/dext5uploaddata/kneuroviz/" + userId + "/" + dirName +  "/Segmentation/output.txt", false); //JOe
    xmlhttp.send(); //JOe
	 
    if(xmlhttp.status == 200){ //JOe
      result = xmlhttp.responseText;
      // alert("ID Lists result : "+result);
    } else {
		if(inputType != 'Channel'){ 
			alert("ID 목록을 읽어 오지 못했습니다.");
		}
    }

    //포털 서버쪽의 ID 목록 파일 구성할 때 맨 마지막 id 값에서 \n이 없도록 하고 뒤에 공백이 없도록 해야 한다.
    var idArr = result.split("\n"); //result.split(","); //JOe
    //alert("idLists : "+idArr); //JOe
    //console.log("idArr : ", idArr);
   // console.log("array size : ", idArr.length);
    for(var i=0; i<idArr.length; i++){
      if(idArr[idArr.length - i - 1].length < 1){
        idArr.pop();
      }
    }
    //idArr.pop();

    //Joe
    // const idArr = new Array(141, 133, 435, 138, 934, 116, 69, 143, 127, 88, 63, 435, 521, 934, 1042, 735, 1104, 
    //                         1061, 1038, 561, 509, 145, 1205, 1096, 17, 199, 1052, 561, 42); //Joe

    //var crrUrl : string = ""; //JOe

     //Joe 아래 forEach문 전체
     //ID 목록 전체를 보여줌
    idArr.forEach(function(element){
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "idchk";
      // checkbox.width = 500;
      // checkbox.align = "left";
      checkbox.value = element.toString();

      //console.log("^__^ "+element.toString());

      var label = document.createElement('label');
      label.id = "lblIDList";
      label.appendChild(checkbox);
      // label.innerHTML += "&emsp; " + element.toString();
      label.innerHTML += element.toString();

      // var nodeTxt = document.createTextNode(element.toString());
      // node.appendChild(nodeTxt);


      label.addEventListener('click', function(event){
        // 2019.12.27 권은총 수정
		
		console.log("--------request--------");
		console.log("location="+location.href);
		console.log("--------request--------");
	    let s = location.href.replace(/^[^#]+/, '');
		//{"layers":[{"source":"precomputed://http://kbrain-map.kbri.re.kr:8080/dext5uploaddata/kneuroviz/test06/0722_test/Channel","type":"image","name":"Channel"}],"navigation":{"pose":{"position":{"voxelSize":[12,12,50],"voxelCoordinates":[7296,5120,512]}},"zoomFactor":12},"layout":"4panel"}
		//var t4 = '8#!{"layers":[{"source":"precomputed://http://kbrain-map.kbri.re.kr:8080/dext5uploaddata/kneuroviz/test06/'+dirName+'/'+inputType+'","type":"image","name":"'+inputType+'"}],"navigation":{"pose":{"position":{"voxelSize":[12,12,50],"voxelCoordinates":[7296,5120,512]}},"zoomFactor":12},"layout":"4panel"}'
		//console.log(t4);
		//var href = "http://kneuroviz.kbri.re.kr:8091/?t1="+userId+"&t2="+dirName+"&t3=Segmentation&t4="+t4;
		//console.log("location2="+href);
		//let s = t4.replace(/^[^#]+/, '');
		let jsonParam = null;
		if (s === '' || s === '#' || s === '#!') {
			s = '#!{}';
		}
		
		if (s.startsWith('#!+')) {
			s = s.slice(3);
			// Firefox always %-encodes the URL even if it is not typed that way.
		} else if (s.startsWith('#!')) {
			s = s.slice(2);
		}
		
		s = decodeURIComponent(s);
		jsonParam = urlSafeParse(s);
		//jsonParam = s;
		console.log(jsonParam);
		//console.log("source0 : "+jsonParam.layers[0].source[0]);
		console.log("source1 : "+jsonParam.layers[1].source);
		
		
		if (jsonParam.layers[1] != null) {
			let segmentsArr = new Array();
			let editedArr = new Array();
			
			if (!(jsonParam.layers[1].segments == undefined || jsonParam.layers[1].segments == null)) {
				segmentsArr = jsonParam.layers[1].segments	
			}
			
			var chkBox = <HTMLInputElement>event.target;
			if(chkBox.value == undefined){
	          return;
	        }
			
			if(chkBox.checked){
				segmentsArr.push(chkBox.value.trim());
				editedArr = segmentsArr;
				//console.log("editedArr : " + editedArr);
			} else {
				// 체크 해제의 경우 전체 목록에서 삭제
				segmentsArr.forEach((segment:String) => {
					if (chkBox.value.trim() != segment) {
						editedArr.push(segment);	
					}
				});
			}
			
			jsonParam.layers[1].segments = editedArr;
			//console.log("encodeJsonStringify : " +encodeURIComponent(JSON.stringify(jsonParam));
						
			window.location.href = '#!' + encodeURIComponent(JSON.stringify(jsonParam));
			window.location.reload;
		}
		
		event.stopPropagation;
      }); //click 이벤트 함수

      // ulList.appendChild(label);
	  //labal : null;
	  idListDiv.appendChild(label);
	  //console.log("idListDiv="+idListDiv);
      
      //label 뒤에 <br/> 태그를 붙이면 #lblIDList:nth-child(even)가 먹히지를 않는다.
      // var br = document.createElement('br');
      // ulList.appendChild(br);
      // idListDiv.appendChild(br);

    }); //forEach
	
	    gridContainer.classList.add('neuroglancer-viewer');
    gridContainer.classList.add('neuroglancer-noselect');
    gridContainer.style.display = 'flex';
    gridContainer.style.flexDirection = 'column';

    const topRow = document.createElement('div');
    topRow.title = 'Right click for settings';
    topRow.classList.add('neuroglancer-viewer-top-row');
    //const contextMenu = this.contextMenu = this.registerDisposer(makeViewerContextMenu(this));
    //contextMenu.registerParent(topRow);
    topRow.style.display = 'flex';
    topRow.style.flexDirection = 'row';
    topRow.style.alignItems = 'stretch';

    //const voxelSizeWidget = this.registerDisposer(
        //new VoxelSizeWidget(document.createElement('div'), this.navigationState.voxelSize));
  //  this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
//        this.uiControlVisibility.showLocation, voxelSizeWidget.element));
    //topRow.appendChild(voxelSizeWidget.element);

    /*const positionWidget = this.registerDisposer(new PositionWidget(this.navigationState.position));
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showLocation, positionWidget.element));
    topRow.appendChild(positionWidget.element);*/

    /* const mousePositionWidget = this.registerDisposer(new MousePositionWidget(
        document.createElement('div'), this.mouseState, this.navigationState.voxelSize));
    mousePositionWidget.element.style.flex = '1';
    mousePositionWidget.element.style.alignSelf = 'center';
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showLocation, mousePositionWidget.element));
    topRow.appendChild(mousePositionWidget.element); */ 

    /*const annotationToolStatus =
        this.registerDisposer(new AnnotationToolStatusWidget(this.selectedLayer));
    topRow.appendChild(annotationToolStatus.element);
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showAnnotationToolStatus, annotationToolStatus.element)); */

/*
    {
      const button = makeTextIconButton('{}', 'Edit JSON state');
      this.registerEventListener(button, 'click', () => {
        this.editJsonState();
      });
      this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
          this.uiControlVisibility.showEditStateButton, button));
      topRow.appendChild(button);
    }


    {
      const button = makeTextIconButton('?', 'Help');
      this.registerEventListener(button, 'click', () => {
        this.showHelpDialog();
      });
      this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
          this.uiControlVisibility.showHelpButton, button));
      topRow.appendChild(button);
    }*/

    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        makeDerivedWatchableValue(
            (...values: boolean[]) => values.reduce((a, b) => a || b, false),
            this.uiControlVisibility.showHelpButton, this.uiControlVisibility.showEditStateButton,
            this.uiControlVisibility.showLocation,
            this.uiControlVisibility.showAnnotationToolStatus),
        topRow));

    gridContainer.appendChild(topRow);

    const layoutAndSidePanel = document.createElement('div');
    layoutAndSidePanel.appendChild(idListDiv); //Joe 이렇게 넣어야 ID 목록 리스트 영역이 원하는대로 추가됨

    layoutAndSidePanel.style.display = 'flex';
    layoutAndSidePanel.style.flex = '1';
    layoutAndSidePanel.style.flexDirection = 'row';
    
	/*this.layout = this.registerDisposer(new RootLayoutContainer(this, '4panel'));
    layoutAndSidePanel.appendChild(this.layout.element);*/
    
	/*
	const layerInfoPanel =
        this.registerDisposer(new LayerInfoPanelContainer(this.selectedLayer.addRef()));
    layoutAndSidePanel.appendChild(layerInfoPanel.element);
    const self = this;
	layerInfoPanel.registerDisposer(new DragResizablePanel(
        layerInfoPanel.element, {
          changed: self.selectedLayer.changed,
          get value() {
            return self.selectedLayer.visible;
          },
          set value(visible: boolean) {
            self.selectedLayer.visible = visible;
          }
        },
        this.selectedLayer.size, 'horizontal', 290));*/

    gridContainer.appendChild(layoutAndSidePanel);

    // gridContainer.appendChild(idListDiv); //Joe 이런식으로는 안됨

    /*
	const statisticsPanel = this.registerDisposer(
        new StatisticsPanel(this.chunkQueueManager, this.statisticsDisplayState));
    gridContainer.appendChild(statisticsPanel.element);
    statisticsPanel.registerDisposer(new DragResizablePanel(
        statisticsPanel.element, this.statisticsDisplayState.visible,
        this.statisticsDisplayState.size, 'vertical'));*/

    const updateVisibility = () => {
      const shouldBeVisible = this.visibility.visible;
      if (shouldBeVisible !== this.visible) {
        gridContainer.style.visibility = shouldBeVisible ? 'inherit' : 'hidden';
        this.visible = shouldBeVisible;
      }
    };
    updateVisibility();
    this.registerDisposer(this.visibility.changed.add(updateVisibility));
    idListDiv.style.display = "block";
    //ID 목록 보여주는 div의 height의 값을 현재 화면의 height 값으로 설정
    idListDiv.style.height = (window.innerHeight - 20) + "px"; 
    // alert(window.innerHeight);

    //화면의 사이즈가 변경될 경우 동적으로 div의 height를 변경된 화면의 height로 변경
    window.addEventListener('resize', function(){
      // alert(window.innerHeight);
      idListDiv.style.height = (window.innerHeight - 20) + "px"; 
    });
	
	/////////////////////////////
  }
  static fromResponse(response: Response) {
    return new HttpError(response.url, response.status, response.statusText);
  }
  
}

/**
 * Issues a `fetch` request.
 *
 * If the request fails due to an HTTP status outside `[200, 300)`, throws an `HttpError`.  If the
 * request fails due to a network or CORS restriction, throws an `HttpError` with a `status` of `0`.
 */
export async function fetchOk(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new HttpError('', 0, '');
    }
    throw error;
  }
  if (!response.ok) throw HttpError.fromResponse(response);
  return response;
}

export function responseArrayBuffer(response: Response): Promise<ArrayBuffer> {
  return response.arrayBuffer();
}

export function responseJson(response: Response): Promise<any> {
  return response.json();
}

export type ResponseTransform<T> = (response: Response) => Promise<T>;

/**
 * Issues a `fetch` request in the same way as `fetchOk`, and returns the result of the promise
 * returned by `transformResponse`.
 *
 * Additionally, the request may be cancelled through `cancellationToken`.
 *
 * The `transformResponse` function should not do anything with the `Response` object after its
 * result becomes ready; otherwise, cancellation may not work as expected.
 */
export async function cancellableFetchOk<T>(
    input: RequestInfo, init: RequestInit, transformResponse: ResponseTransform<T>,
    cancellationToken: CancellationToken = uncancelableToken): Promise<T> {
  if (cancellationToken === uncancelableToken) {
    const response = await fetchOk(input, init);
    return await transformResponse(response);
  }
  const abortController = new AbortController();
  const unregisterCancellation = cancellationToken.add(() => abortController.abort());
  try {
    const response = await fetchOk(input, init);
    return await transformResponse(response);
  } finally {
    unregisterCancellation();
  }
}

const tempUint64 = new Uint64();

export function getByteRangeHeader(startOffset: Uint64|number, endOffset: Uint64|number) {
  let endOffsetStr: string;
  if (typeof endOffset === 'number') {
    endOffsetStr = `${endOffset - 1}`;
  } else {
    Uint64.decrement(tempUint64, endOffset);
    endOffsetStr = tempUint64.toString();
  }
  return {'Range': `bytes=${startOffset}-${endOffsetStr}`};
}

/**
 * Parses a URL that may have a special protocol designation into a real URL.
 *
 * If the protocol is 'http' or 'https', the input string is returned as is.
 *
 * The special 'gs://bucket/path' syntax is supported for accessing Google Storage buckets.
 */
export function parseSpecialUrl(url: string): string {
  const urlProtocolPattern = /^([^:\/]+):\/\/([^\/]+)(\/.*)?$/;
  let match = url.match(urlProtocolPattern);
  if (match === null) {
    throw new Error(`Invalid URL: ${JSON.stringify(url)}`);
  }
  const protocol = match[1];
  if (protocol === 'gs') {
    const bucket = match[2];
    let path = match[3];
    if (path === undefined) path = '';
    return `https://storage.googleapis.com/${bucket}${path}`;
  }
  return url;
}
