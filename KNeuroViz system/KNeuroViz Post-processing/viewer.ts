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

import debounce from 'lodash/debounce';
import {CapacitySpecification, ChunkManager, ChunkQueueManager, FrameNumberCounter} from 'neuroglancer/chunk_manager/frontend';
import {defaultCredentialsManager} from 'neuroglancer/credentials_provider/default_manager';
import {InputEventBindings as DataPanelInputEventBindings} from 'neuroglancer/data_panel_layout';
import {DataSourceProvider} from 'neuroglancer/datasource';
import {getDefaultDataSourceProvider} from 'neuroglancer/datasource/default_provider';
import {DisplayContext} from 'neuroglancer/display_context';
import {InputEventBindingHelpDialog} from 'neuroglancer/help/input_event_bindings';
import {allRenderLayerRoles, LayerManager, LayerSelectedValues, MouseSelectionState, RenderLayerRole, SelectedLayerState} from 'neuroglancer/layer';
import {LayerDialog} from 'neuroglancer/layer_dialog';
import {RootLayoutContainer} from 'neuroglancer/layer_groups_layout';
import {TopLevelLayerListSpecification} from 'neuroglancer/layer_specification';
import {NavigationState, Pose} from 'neuroglancer/navigation_state';
import {overlaysOpen} from 'neuroglancer/overlay';
import {StatusMessage} from 'neuroglancer/status';
import {ElementVisibilityFromTrackableBoolean, TrackableBoolean, TrackableBooleanCheckbox} from 'neuroglancer/trackable_boolean';
import {makeDerivedWatchableValue, TrackableValue, WatchableValueInterface} from 'neuroglancer/trackable_value';
import {ContextMenu} from 'neuroglancer/ui/context_menu';
import {DragResizablePanel} from 'neuroglancer/ui/drag_resize';
import {LayerInfoPanelContainer} from 'neuroglancer/ui/layer_side_panel';
import {MouseSelectionStateTooltipManager} from 'neuroglancer/ui/mouse_selection_state_tooltip';
import {setupPositionDropHandlers} from 'neuroglancer/ui/position_drag_and_drop';
import {StateEditorDialog} from 'neuroglancer/ui/state_editor';
import {StatisticsDisplayState, StatisticsPanel} from 'neuroglancer/ui/statistics';
import {AutomaticallyFocusedElement} from 'neuroglancer/util/automatic_focus';
import {TrackableRGB} from 'neuroglancer/util/color';
import {Borrowed, Owned, RefCounted} from 'neuroglancer/util/disposable';
import {removeFromParent} from 'neuroglancer/util/dom';
import {registerActionListener} from 'neuroglancer/util/event_action_map';
import {vec3} from 'neuroglancer/util/geom';
import {EventActionMap, KeyboardEventBinder} from 'neuroglancer/util/keyboard_bindings';
import {NullarySignal} from 'neuroglancer/util/signal';
import {CompoundTrackable} from 'neuroglancer/util/trackable';
import {ViewerState, VisibilityPrioritySpecification} from 'neuroglancer/viewer_state';
import {WatchableVisibilityPriority} from 'neuroglancer/visibility_priority/frontend';
import {GL} from 'neuroglancer/webgl/context';
import {AnnotationToolStatusWidget} from 'neuroglancer/widget/annotation_tool_status';
import {NumberInputWidget} from 'neuroglancer/widget/number_input_widget';
import {MousePositionWidget, PositionWidget, VoxelSizeWidget} from 'neuroglancer/widget/position_widget';
import {TrackableScaleBarOptions} from 'neuroglancer/widget/scale_bar';
import {makeTextIconButton} from 'neuroglancer/widget/text_icon_button';
import {RPC} from 'neuroglancer/worker_rpc';
import {urlSafeParse} from 'neuroglancer/util/json';

declare var NEUROGLANCER_OVERRIDE_DEFAULT_VIEWER_OPTIONS: any
require('./viewer.css');
require('neuroglancer/noselect.css');
require('neuroglancer/ui/button.css');



export class DataManagementContext extends RefCounted {
  worker = new Worker('chunk_worker.bundle.js');
  chunkQueueManager = this.registerDisposer(
      new ChunkQueueManager(new RPC(this.worker), this.gl, this.frameNumberCounter, {
        gpuMemory: new CapacitySpecification({defaultItemLimit: 1e6, defaultSizeLimit: 1e9}),
        systemMemory: new CapacitySpecification({defaultItemLimit: 1e7, defaultSizeLimit: 2e9}),
        download: new CapacitySpecification(
            {defaultItemLimit: 32, defaultSizeLimit: Number.POSITIVE_INFINITY}),
        compute: new CapacitySpecification({defaultItemLimit: 128, defaultSizeLimit: 5e8}),
      }));
  chunkManager = this.registerDisposer(new ChunkManager(this.chunkQueueManager));

  get rpc(): RPC {
    return this.chunkQueueManager.rpc!;
  }

  constructor(public gl: GL, public frameNumberCounter: FrameNumberCounter) {
    super();
    this.chunkQueueManager.registerDisposer(() => this.worker.terminate());
  }
}

export class InputEventBindings extends DataPanelInputEventBindings {
  global = new EventActionMap();
}

const viewerUiControlOptionKeys: (keyof ViewerUIControlConfiguration)[] = [
  'showHelpButton',
  'showEditStateButton',
  'showLayerPanel',
  'showLocation',
  'showAnnotationToolStatus',
];

const viewerOptionKeys: (keyof ViewerUIOptions)[] =
    ['showUIControls', 'showPanelBorders', ...viewerUiControlOptionKeys];

export class ViewerUIControlConfiguration {
  showHelpButton = new TrackableBoolean(true);
  showEditStateButton = new TrackableBoolean(true);
  showLayerPanel = new TrackableBoolean(true);
  showLocation = new TrackableBoolean(true);
  showAnnotationToolStatus = new TrackableBoolean(true);
}

export class ViewerUIConfiguration extends ViewerUIControlConfiguration {
  /**
   * If set to false, all UI controls (controlled individually by the options below) are disabled.
   */
  showUIControls = new TrackableBoolean(true);
  showPanelBorders = new TrackableBoolean(true);
}

function setViewerUiConfiguration(
    config: ViewerUIConfiguration, options: Partial<ViewerUIOptions>) {
  for (const key of viewerOptionKeys) {
    const value = options[key];
    if (value !== undefined) {
      config[key].value = value;
    }
  }
}

interface ViewerUIOptions {
  showUIControls: boolean;
  showHelpButton: boolean;
  showEditStateButton: boolean;
  showLayerPanel: boolean;
  showLocation: boolean;
  showPanelBorders: boolean;
  showAnnotationToolStatus: boolean;
}

export interface ViewerOptions extends ViewerUIOptions, VisibilityPrioritySpecification {
  dataContext: Owned<DataManagementContext>;
  element: HTMLElement;
  dataSourceProvider: Borrowed<DataSourceProvider>;
  uiConfiguration: ViewerUIConfiguration;
  showLayerDialog: boolean;
  inputEventBindings: InputEventBindings;
  resetStateWhenEmpty: boolean;
}

const defaultViewerOptions = "undefined" !== typeof NEUROGLANCER_OVERRIDE_DEFAULT_VIEWER_OPTIONS ?
  NEUROGLANCER_OVERRIDE_DEFAULT_VIEWER_OPTIONS : {
    showLayerDialog: true,
    resetStateWhenEmpty: true,
  };

function makeViewerContextMenu(viewer: Viewer) {
  const menu = new ContextMenu();
  const {element} = menu;
  element.classList.add('neuroglancer-viewer-context-menu');
  const addLimitWidget = (label: string, limit: TrackableValue<number>) => {
    const widget = menu.registerDisposer(new NumberInputWidget(limit, {label}));
    widget.element.classList.add('neuroglancer-viewer-context-menu-limit-widget');
    element.appendChild(widget.element);
  };
  addLimitWidget('GPU memory limit', viewer.chunkQueueManager.capacities.gpuMemory.sizeLimit);
  addLimitWidget('System memory limit', viewer.chunkQueueManager.capacities.systemMemory.sizeLimit);
  addLimitWidget(
      'Concurrent chunk requests', viewer.chunkQueueManager.capacities.download.itemLimit);

  const addCheckbox = (label: string, value: TrackableBoolean) => {
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    const checkbox = menu.registerDisposer(new TrackableBooleanCheckbox(value));
    labelElement.appendChild(checkbox.element);
    element.appendChild(labelElement);
  };
  addCheckbox('Show axis lines', viewer.showAxisLines);
  addCheckbox('Show scale bar', viewer.showScaleBar);
  addCheckbox('Show cross sections in 3-d', viewer.showPerspectiveSliceViews);
  addCheckbox('Show default annotations', viewer.showDefaultAnnotations);
  addCheckbox('Show chunk statistics', viewer.statisticsDisplayState.visible);
  return menu;
}

export class Viewer extends RefCounted implements ViewerState {
  navigationState = this.registerDisposer(new NavigationState());
  perspectiveNavigationState = new NavigationState(new Pose(this.navigationState.position), 1);
  mouseState = new MouseSelectionState();
  layerManager = this.registerDisposer(new LayerManager());
  selectedLayer = this.registerDisposer(new SelectedLayerState(this.layerManager.addRef()));
  showAxisLines = new TrackableBoolean(true, true);
  showScaleBar = new TrackableBoolean(true, true);
  showPerspectiveSliceViews = new TrackableBoolean(true, true);
  visibleLayerRoles = allRenderLayerRoles();
  showDefaultAnnotations = new TrackableBoolean(true, true);
  crossSectionBackgroundColor = new TrackableRGB(vec3.fromValues(0.5, 0.5, 0.5));
  perspectiveViewBackgroundColor = new TrackableRGB(vec3.fromValues(0, 0, 0));
  scaleBarOptions = new TrackableScaleBarOptions();
  contextMenu: ContextMenu;
  statisticsDisplayState = new StatisticsDisplayState();

  layerSelectedValues =
      this.registerDisposer(new LayerSelectedValues(this.layerManager, this.mouseState));
  resetInitiated = new NullarySignal();

  get chunkManager() {
    return this.dataContext.chunkManager;
  }
  get chunkQueueManager() {
    return this.dataContext.chunkQueueManager;
  }

  layerSpecification: TopLevelLayerListSpecification;
  layout: RootLayoutContainer;

  state = new CompoundTrackable();

  dataContext: Owned<DataManagementContext>;
  visibility: WatchableVisibilityPriority;
  inputEventBindings: InputEventBindings;
  element: HTMLElement;
  dataSourceProvider: Borrowed<DataSourceProvider>;

  uiConfiguration: ViewerUIConfiguration;

  private makeUiControlVisibilityState(key: keyof ViewerUIOptions) {
    const showUIControls = this.uiConfiguration.showUIControls;
    const option = this.uiConfiguration[key];
    return this.registerDisposer(
        makeDerivedWatchableValue((a, b) => a && b, showUIControls, option));
  }

  /**
   * Logical and of each of the above values with the value of showUIControls.
   */
  uiControlVisibility:
      {[key in keyof ViewerUIControlConfiguration]: WatchableValueInterface<boolean>} = <any>{};

  showLayerDialog: boolean;
  resetStateWhenEmpty: boolean;

  get inputEventMap() {
    return this.inputEventBindings.global;
  }

  visible = true;

  constructor(public display: DisplayContext, options: Partial<ViewerOptions> = {}) {
    super();

    const {
      dataContext = new DataManagementContext(display.gl, display),
      visibility = new WatchableVisibilityPriority(WatchableVisibilityPriority.VISIBLE),
      inputEventBindings = {
        global: new EventActionMap(),
        sliceView: new EventActionMap(),
        perspectiveView: new EventActionMap(),
      },
      element = display.makeCanvasOverlayElement(),
      dataSourceProvider =
          getDefaultDataSourceProvider({credentialsManager: defaultCredentialsManager}),
      uiConfiguration = new ViewerUIConfiguration(),
    } = options;
    this.visibility = visibility;
    this.inputEventBindings = inputEventBindings;
    this.element = element;
    this.dataSourceProvider = dataSourceProvider;
    this.uiConfiguration = uiConfiguration;

    this.registerDisposer(() => removeFromParent(this.element));

    this.dataContext = this.registerDisposer(dataContext);

    setViewerUiConfiguration(uiConfiguration, options);

    const optionsWithDefaults = {...defaultViewerOptions, ...options};
    const {
      resetStateWhenEmpty,
      showLayerDialog,
    } = optionsWithDefaults;

    for (const key of viewerUiControlOptionKeys) {
      this.uiControlVisibility[key] = this.makeUiControlVisibilityState(key);
    }
    this.registerDisposer(this.uiConfiguration.showPanelBorders.changed.add(() => {
      this.updateShowBorders();
    }));

    this.showLayerDialog = showLayerDialog;
    this.resetStateWhenEmpty = resetStateWhenEmpty;

    this.layerSpecification = new TopLevelLayerListSpecification(
        this.dataSourceProvider, this.layerManager, this.chunkManager, this.layerSelectedValues,
        this.navigationState.voxelSize);

    this.registerDisposer(display.updateStarted.add(() => {
      this.onUpdateDisplay();
    }));

    this.showDefaultAnnotations.changed.add(() => {
      if (this.showDefaultAnnotations.value) {
        this.visibleLayerRoles.add(RenderLayerRole.DEFAULT_ANNOTATION);
      } else {
        this.visibleLayerRoles.delete(RenderLayerRole.DEFAULT_ANNOTATION);
      }
    });

    const {state} = this;
    state.add('layers', this.layerSpecification);
    state.add('navigation', this.navigationState);
    state.add('showAxisLines', this.showAxisLines);
    state.add('showScaleBar', this.showScaleBar);
    state.add('showDefaultAnnotations', this.showDefaultAnnotations);

    state.add('perspectiveOrientation', this.perspectiveNavigationState.pose.orientation);
    state.add('perspectiveZoom', this.perspectiveNavigationState.zoomFactor);
    state.add('showSlices', this.showPerspectiveSliceViews);
    state.add('gpuMemoryLimit', this.dataContext.chunkQueueManager.capacities.gpuMemory.sizeLimit);
    state.add(
        'systemMemoryLimit', this.dataContext.chunkQueueManager.capacities.systemMemory.sizeLimit);
    state.add(
        'concurrentDownloads', this.dataContext.chunkQueueManager.capacities.download.itemLimit);
    state.add('selectedLayer', this.selectedLayer);
    state.add('crossSectionBackgroundColor', this.crossSectionBackgroundColor);
    state.add('perspectiveViewBackgroundColor', this.perspectiveViewBackgroundColor);

    this.registerDisposer(this.navigationState.changed.add(() => {
      this.handleNavigationStateChanged();
    }));

    this.layerManager.initializePosition(this.navigationState.position);

    this.registerDisposer(
        this.layerSpecification.voxelCoordinatesSet.add((voxelCoordinates: vec3) => {
          this.navigationState.position.setVoxelCoordinates(voxelCoordinates);
        }));

    this.registerDisposer(
        this.layerSpecification.spatialCoordinatesSet.add((spatialCoordinates: vec3) => {
          const {position} = this.navigationState;
          vec3.copy(position.spatialCoordinates, spatialCoordinates);
          position.markSpatialCoordinatesChanged();
        }));


    // Debounce this call to ensure that a transient state does not result in the layer dialog being
    // shown.
    const maybeResetState = this.registerCancellable(debounce(() => {
      if (!this.wasDisposed && this.layerManager.managedLayers.length === 0 &&
          this.resetStateWhenEmpty) {
        // No layers, reset state.
        this.navigationState.reset();
        this.perspectiveNavigationState.pose.orientation.reset();
        this.perspectiveNavigationState.zoomFactor.reset();
        this.resetInitiated.dispatch();
        if (!overlaysOpen && this.showLayerDialog && this.visibility.visible) {
          new LayerDialog(this.layerSpecification);
        }
      }
    }));
    this.layerManager.layersChanged.add(maybeResetState);
    maybeResetState();

    this.registerDisposer(this.dataContext.chunkQueueManager.visibleChunksChanged.add(() => {
      this.layerSelectedValues.handleLayerChange();
    }));

    this.registerDisposer(this.dataContext.chunkQueueManager.visibleChunksChanged.add(() => {
      if (this.visible) {
        display.scheduleRedraw();
      }
    }));

    this.makeUI(); 
    this.updateShowBorders();

    state.add('layout', this.layout);


    state.add('statistics', this.statisticsDisplayState);

    this.registerActionListeners();
    this.registerEventActionBindings();

    this.registerDisposer(setupPositionDropHandlers(element, this.navigationState.position));

    this.registerDisposer(new MouseSelectionStateTooltipManager(
        this.mouseState, this.layerManager, this.navigationState.voxelSize));
  }

  private updateShowBorders() {
    const {element} = this;
    const className = 'neuroglancer-show-panel-borders';
    if (this.uiConfiguration.showPanelBorders.value) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }

  
  private makeUI() {
    const gridContainer = this.element;
      //클릭한 id를 담을 배열
    // let arrList = []; //Joe

    //ID 목록 보여줄 div 생성 Joe
    let idListDiv = document.createElement('div'); //Joe
    idListDiv.id = "id_list_div"; //Joe
    
    var title = document.createElement("span");
    title.innerText = " Seg-ID List";
    title.id = "list_title";
    title.innerHTML += "<br/>";
    idListDiv.appendChild(title);

    //originCrrUrl은 Esc키를 눌렀을 때 하이라이팅 상태에서 일반적인 상태로 복귀시킬때
    //사용할 Url 값을 담을 용도
    //var originCrrUrl = ""; //Joe

    //아래 prevID 변수는 현재 클릭된 ID 이전에 클릭되었던 ID 값을 갖는 변수로
    //동일 ID 다시 click시 highlighting을 toggle로 on/off 시키기 위해
    // var prevID = ""; //Joe

    //Joe 아래 onkeydown 함수 전체
    //Esc 키를 치면 ID 클릭으로 인해 highlighting 된 세그먼트 상태 원상복구 하기 위해
    document.onkeydown = function(e){
	  e.stopImmediatePropagation;
        return;
    } //onkeydown
	console.log("---------viewer----------1");
		console.log("location1="+location.href);
		console.log("---------viewer----------1");
    var inUrl = location.href; //JOe
    // alert("윈도우 서버에 있는 sample 데이터 임. 접속해 온 url : "+location.href);
    var userId = inUrl.substring(inUrl.indexOf('t1')+3, inUrl.indexOf('t2')-1); //JOe
    var dirName = inUrl.substring(inUrl.indexOf('t2')+3, inUrl.indexOf('t3')-1); //JOe
    var inputType = inUrl.substring(inUrl.indexOf('t3')+3, inUrl.indexOf('t4')-1); //Joe
	//inputType = "segmentation";
    // alert("dirName : "+dirName);
	//alert(inputType);
    var result = ""; //JOe
    var xmlhttp = new XMLHttpRequest(); //JOe
    xmlhttp.open("GET", "http://kbrain-map.kbri.re.kr:8080/dext5uploaddata/kneuroviz/" + userId + "/" + dirName +  "/Segmentation/output.txt", false); //JOe
    xmlhttp.send(); //JOe

    if(xmlhttp.status == 200){ //JOe
      result = xmlhttp.responseText;
	  //console.log(result);
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
    //console.log("array size : ", idArr.length);
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
		
		//alert("ㅇ");
	    let s = location.href.replace(/^[^#]+/, '');
		console.log("---------viewer----------");
		console.log("location="+location.href);
		console.log("---------viewer----------");
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
		//console.log("href : " + s);
		s = decodeURIComponent(s);
		//console.log("afterdeCode : " + s);
		jsonParam = urlSafeParse(s);
		//console.log("jsonParse : " + jsonParam);
		if (jsonParam.layers[0] != null) {
			let segmentsArr = new Array();
			let editedArr = new Array();
			
			if (!(jsonParam.layers[0].segments == undefined || jsonParam.layers[0].segments == null)) {
				segmentsArr = jsonParam.layers[0].segments	
			}
			
			var chkBox = <HTMLInputElement>event.target;
			if(chkBox.value == undefined){
	          return;
	        }
			
			if(chkBox.checked){
				segmentsArr.push(chkBox.value.trim());
				editedArr = segmentsArr;
			} else {
				// 체크 해제의 경우 전체 목록에서 삭제
				segmentsArr.forEach((segment:String) => {
					if (chkBox.value.trim() != segment) {
						editedArr.push(segment);	
					}
				});
				
				//console.log("editedArr : " + editedArr);
			}
			
			jsonParam.layers[0].segments = editedArr;
			window.location.href = '#!' + encodeURIComponent(JSON.stringify(jsonParam));
			//window.location.reload;
		}
		
		event.stopPropagation;
      }); //click 이벤트 함수

      // ulList.appendChild(label);
      idListDiv.appendChild(label);

      //label 뒤에 <br/> 태그를 붙이면 #lblIDList:nth-child(even)가 먹히지를 않는다.
      // var br = document.createElement('br');
      // ulList.appendChild(br);
      // idListDiv.appendChild(br);

    }); //forEach


    //Joe 아래 함수 전체
    //ID를 클릭했을 때
    // ulList.addEventListener('click', function(e){
    //   // if(e.target && e.target.matches("li")){
    //   //   //아래에서 다음과 같은 내용이 출력된다. 즉 클릭한 <li>...</li>까지가 출력된다.
    //   //   //<li>123<span>1</span></li>
    //   //   console.log(e.target);

    //   //   //아래에서는 li안의 값들만 출력된다. 즉 <li>7893<span>1</span></li>이면
    //   //   //7893과 1이 출력된다.
    //   //   console.log(e.target.innerText);

    //   // }//if
    //   var str = e.target.innerHTML;
    //   var pos = str.indexOf("<");
    //   if(pos > 0){
    //     str = str.substring(0, pos);
    //   }

    //   alert(str);
    // });

    gridContainer.classList.add('neuroglancer-viewer');
    gridContainer.classList.add('neuroglancer-noselect');
    gridContainer.style.display = 'flex';
    gridContainer.style.flexDirection = 'column';

    const topRow = document.createElement('div');
    topRow.title = 'Right click for settings';
    topRow.classList.add('neuroglancer-viewer-top-row');
    const contextMenu = this.contextMenu = this.registerDisposer(makeViewerContextMenu(this));
    contextMenu.registerParent(topRow);
    topRow.style.display = 'flex';
    topRow.style.flexDirection = 'row';
    topRow.style.alignItems = 'stretch';

    const voxelSizeWidget = this.registerDisposer(
        new VoxelSizeWidget(document.createElement('div'), this.navigationState.voxelSize));
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showLocation, voxelSizeWidget.element));
    topRow.appendChild(voxelSizeWidget.element);

    const positionWidget = this.registerDisposer(new PositionWidget(this.navigationState.position));
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showLocation, positionWidget.element));
    topRow.appendChild(positionWidget.element);

    const mousePositionWidget = this.registerDisposer(new MousePositionWidget(
        document.createElement('div'), this.mouseState, this.navigationState.voxelSize));
    mousePositionWidget.element.style.flex = '1';
    mousePositionWidget.element.style.alignSelf = 'center';
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showLocation, mousePositionWidget.element));
    topRow.appendChild(mousePositionWidget.element);

    const annotationToolStatus =
        this.registerDisposer(new AnnotationToolStatusWidget(this.selectedLayer));
    topRow.appendChild(annotationToolStatus.element);
    this.registerDisposer(new ElementVisibilityFromTrackableBoolean(
        this.uiControlVisibility.showAnnotationToolStatus, annotationToolStatus.element));

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
    }

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
    this.layout = this.registerDisposer(new RootLayoutContainer(this, '4panel'));
    layoutAndSidePanel.appendChild(this.layout.element);
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
        this.selectedLayer.size, 'horizontal', 290));

    gridContainer.appendChild(layoutAndSidePanel);

    // gridContainer.appendChild(idListDiv); //Joe 이런식으로는 안됨

    const statisticsPanel = this.registerDisposer(
        new StatisticsPanel(this.chunkQueueManager, this.statisticsDisplayState));
    gridContainer.appendChild(statisticsPanel.element);
    statisticsPanel.registerDisposer(new DragResizablePanel(
        statisticsPanel.element, this.statisticsDisplayState.visible,
        this.statisticsDisplayState.size, 'vertical'));

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
  } //makeUI()


  /**
   * Called once by the constructor to set up event handlers.
   */
  private registerEventActionBindings() {
    const {element} = this;
    this.registerDisposer(new KeyboardEventBinder(element, this.inputEventMap));
    this.registerDisposer(new AutomaticallyFocusedElement(element));
  }

  bindAction(action: string, handler: () => void) {
    this.registerDisposer(registerActionListener(this.element, action, handler));
  }

  /**
   * Called once by the constructor to register the action listeners.
   */
  private registerActionListeners() {
    for (const action of ['recolor', 'clear-segments', ]) {
      this.bindAction(action, () => {
        this.layerManager.invokeAction(action);
      });
    }

    for (const action of ['select']) {
      this.bindAction(action, () => {
        this.mouseState.updateUnconditionally();
        this.layerManager.invokeAction(action);
      });
    }

    this.bindAction('help', () => this.showHelpDialog());

    for (let i = 1; i <= 9; ++i) {
      this.bindAction(`toggle-layer-${i}`, () => {
        const layerIndex = i - 1;
        const layers = this.layerManager.managedLayers;
        if (layerIndex < layers.length) {
          let layer = layers[layerIndex];
          layer.setVisible(!layer.visible);
        }
      });
      this.bindAction(`select-layer-${i}`, () => {
        const layerIndex = i - 1;
        const layers = this.layerManager.managedLayers;
        if (layerIndex < layers.length) {
          const layer = layers[layerIndex];
          this.selectedLayer.layer = layer;
          this.selectedLayer.visible = true;
        }
      });
    }

    this.bindAction('annotate', () => {
      const selectedLayer = this.selectedLayer.layer;
      if (selectedLayer === undefined) {
        StatusMessage.showTemporaryMessage('The annotate command requires a layer to be selected.');
        return;
      }
      const userLayer = selectedLayer.layer;
      if (userLayer === null || userLayer.tool.value === undefined) {
        StatusMessage.showTemporaryMessage(`The selected layer (${
            JSON.stringify(selectedLayer.name)}) does not have an active annotation tool.`);
        return;
      }
      userLayer.tool.value.trigger(this.mouseState);
    });

    this.bindAction('toggle-axis-lines', () => this.showAxisLines.toggle());
    this.bindAction('toggle-scale-bar', () => this.showScaleBar.toggle());
    this.bindAction('toggle-default-annotations', () => this.showDefaultAnnotations.toggle());
    this.bindAction('toggle-show-slices', () => this.showPerspectiveSliceViews.toggle());
    this.bindAction('toggle-show-statistics', () => this.showStatistics());
  }

  showHelpDialog() {
    const {inputEventBindings} = this;
    new InputEventBindingHelpDialog([
      ['Global', inputEventBindings.global],
      ['Slice View', inputEventBindings.sliceView],
      ['Perspective View', inputEventBindings.perspectiveView],
    ]);
  }

  editJsonState() {
    new StateEditorDialog(this);
  }

  showStatistics(value: boolean|undefined = undefined) {
    if (value === undefined) {
      value = !this.statisticsDisplayState.visible.value;
    }
    this.statisticsDisplayState.visible.value = value;
  }

  get gl() {
    return this.display.gl;
  }

  onUpdateDisplay() {
    if (this.visible) {
      this.dataContext.chunkQueueManager.chunkUpdateDeadline = null;
    }
  }

  private handleNavigationStateChanged() {
    if (this.visible) {
      let {chunkQueueManager} = this.dataContext;
      if (chunkQueueManager.chunkUpdateDeadline === null) {
        chunkQueueManager.chunkUpdateDeadline = Date.now() + 10;
      }
    }
  }
}
