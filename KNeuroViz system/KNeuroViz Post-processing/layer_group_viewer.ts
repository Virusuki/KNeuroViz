/**
 * @license
 * Copyright 2017 Google Inc.
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

/**
 * @file Viewer for a group of layers.
 */

import debounce from 'lodash/debounce';
import {DataPanelLayoutContainer, InputEventBindings as DataPanelInputEventBindings} from 'neuroglancer/data_panel_layout';
import {DisplayContext} from 'neuroglancer/display_context';
import {MouseSelectionState, RenderLayerRole, SelectedLayerState} from 'neuroglancer/layer';
import {LayerPanel} from 'neuroglancer/layer_panel';
import {LayerListSpecification, LayerSubsetSpecification, ManagedUserLayerWithSpecification} from 'neuroglancer/layer_specification';
import {LinkedOrientationState, LinkedSpatialPosition, LinkedZoomState, NavigationState, Pose, TrackableNavigationLink} from 'neuroglancer/navigation_state';
import {TrackableBoolean} from 'neuroglancer/trackable_boolean';
import {WatchableSet, WatchableValueInterface} from 'neuroglancer/trackable_value';
import {ContextMenu} from 'neuroglancer/ui/context_menu';
import {endLayerDrag, startLayerDrag} from 'neuroglancer/ui/layer_drag_and_drop';
import {setupPositionDropHandlers} from 'neuroglancer/ui/position_drag_and_drop';
import {AutomaticallyFocusedElement} from 'neuroglancer/util/automatic_focus';
import {TrackableRGB} from 'neuroglancer/util/color';
import {Borrowed, Owned, RefCounted} from 'neuroglancer/util/disposable';
import {removeChildren} from 'neuroglancer/util/dom';
import {registerActionListener} from 'neuroglancer/util/event_action_map';
import {CompoundTrackable} from 'neuroglancer/util/trackable';
import {WatchableVisibilityPriority} from 'neuroglancer/visibility_priority/frontend';
import {EnumSelectWidget} from 'neuroglancer/widget/enum_widget';
import {TrackableScaleBarOptions} from 'neuroglancer/widget/scale_bar';

require('./layer_group_viewer.css');

export interface LayerGroupViewerState {
  display: Borrowed<DisplayContext>;
  navigationState: Owned<NavigationState>;
  perspectiveNavigationState: Owned<NavigationState>;
  mouseState: MouseSelectionState;
  showAxisLines: TrackableBoolean;
  showScaleBar: TrackableBoolean;
  scaleBarOptions: TrackableScaleBarOptions;
  showPerspectiveSliceViews: TrackableBoolean;
  layerSpecification: Owned<LayerListSpecification>;
  inputEventBindings: DataPanelInputEventBindings;
  visibility: WatchableVisibilityPriority;
  selectedLayer: SelectedLayerState;
  visibleLayerRoles: WatchableSet<RenderLayerRole>;
  crossSectionBackgroundColor: TrackableRGB;
  perspectiveViewBackgroundColor: TrackableRGB;
}

export interface LayerGroupViewerOptions {
  showLayerPanel: WatchableValueInterface<boolean>;
  showViewerMenu: boolean;
}

export const viewerDragType = 'neuroglancer-layer-group-viewer';

export function hasViewerDrag(event: DragEvent) {
  return event.dataTransfer!.types.indexOf(viewerDragType) !== -1;
}

let dragSource: {viewer: LayerGroupViewer, disposer: () => void}|undefined;

export function getCompatibleViewerDragSource(manager: Borrowed<LayerListSpecification>):
    LayerGroupViewer|undefined {
  if (dragSource && dragSource.viewer.layerSpecification.rootLayers === manager.rootLayers) {
    return dragSource.viewer;
  } else {
    return undefined;
  }
}

function getDefaultViewerDropEffect(manager: Borrowed<LayerListSpecification>): 'move'|'copy' {
  if (getCompatibleViewerDragSource(manager) !== undefined) {
    return 'move';
  } else {
    return 'copy';
  }
}

export function getViewerDropEffect(
    event: DragEvent, manager: Borrowed<LayerListSpecification>): 'move'|'copy' {
  if (event.shiftKey) {
    return 'copy';
  } else if (event.ctrlKey) {
    return 'move';
  } else {
    return getDefaultViewerDropEffect(manager);
  }
}

export class LinkedViewerNavigationState extends RefCounted {
  position: LinkedSpatialPosition;
  crossSectionOrientation: LinkedOrientationState;
  crossSectionZoom: LinkedZoomState;
  perspectiveOrientation: LinkedOrientationState;
  perspectiveZoom: LinkedZoomState;

  navigationState: NavigationState;
  perspectiveNavigationState: NavigationState;

  constructor(parent: {
    navigationState: Borrowed<NavigationState>,
    perspectiveNavigationState: Borrowed<NavigationState>
  }) {
    super();
    this.position = new LinkedSpatialPosition(parent.navigationState.position.addRef());
    this.crossSectionOrientation =
        new LinkedOrientationState(parent.navigationState.pose.orientation.addRef());
    this.crossSectionZoom = new LinkedZoomState(parent.navigationState.zoomFactor.addRef());
    this.navigationState = this.registerDisposer(new NavigationState(
        new Pose(this.position.value, this.crossSectionOrientation.value),
        this.crossSectionZoom.value));
    this.perspectiveOrientation =
        new LinkedOrientationState(parent.perspectiveNavigationState.pose.orientation.addRef());
    this.perspectiveZoom =
        new LinkedZoomState(parent.perspectiveNavigationState.zoomFactor.addRef());
    this.perspectiveNavigationState = this.registerDisposer(new NavigationState(
        new Pose(this.position.value.addRef(), this.perspectiveOrientation.value),
        this.perspectiveZoom.value));
  }

  copyToParent() {
    for (const x
             of [this.position, this.crossSectionOrientation, this.crossSectionZoom,
                 this.perspectiveOrientation, this.perspectiveZoom]) {
      x.copyToPeer();
    }
  }

  register(state: CompoundTrackable) {
    state.add('position', this.position);
    state.add('crossSectionOrientation', this.crossSectionOrientation);
    state.add('crossSectionZoom', this.crossSectionZoom);
    state.add('perspectiveOrientation', this.perspectiveOrientation);
    state.add('perspectiveZoom', this.perspectiveZoom);
  }
}


function makeViewerMenu(parent: HTMLElement, viewer: LayerGroupViewer) {
  const contextMenu = new ContextMenu(parent);
  const menu = contextMenu.element;
  menu.classList.add('neuroglancer-layer-group-viewer-context-menu');
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Remove layer group';
  menu.appendChild(closeButton);
  contextMenu.registerEventListener(closeButton, 'click', () => {
    viewer.layerSpecification.layerManager.clear();
  });
  const {viewerNavigationState} = viewer;
  for (const [name, model] of <[string, TrackableNavigationLink][]>[
         ['Position', viewerNavigationState.position.link],
         ['Cross-section orientation', viewerNavigationState.crossSectionOrientation.link],
         ['Cross-section zoom', viewerNavigationState.crossSectionZoom.link],
         ['Perspective orientation', viewerNavigationState.perspectiveOrientation.link],
         ['Perspective zoom', viewerNavigationState.perspectiveZoom.link],
       ]) {
    const widget = contextMenu.registerDisposer(new EnumSelectWidget(model));
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.flexDirection = 'row';
    label.style.whiteSpace = 'nowrap';
    label.textContent = name;
    label.appendChild(widget.element);
    menu.appendChild(label);
  }
  return contextMenu;
}

export class LayerGroupViewer extends RefCounted {

  tooltipText: HTMLSpanElement; //Joe

  layerSpecification: LayerListSpecification;
  viewerNavigationState: LinkedViewerNavigationState;
  get perspectiveNavigationState() {
    return this.viewerNavigationState.perspectiveNavigationState;
  }
  get navigationState() {
    return this.viewerNavigationState.navigationState;
  }

  // FIXME: don't make viewerState a property, just make these things properties directly
  get display() {
    return this.viewerState.display;
  }
  get selectedLayer() {
    return this.viewerState.selectedLayer;
  }
  get layerManager() {
    return this.layerSpecification.layerManager;
  }

  get chunkManager() {
    return this.layerSpecification.chunkManager;
  }
  get mouseState() {
    return this.viewerState.mouseState;
  }
  get showAxisLines() {
    return this.viewerState.showAxisLines;
  }
  get showScaleBar() {
    return this.viewerState.showScaleBar;
  }
  get showPerspectiveSliceViews() {
    return this.viewerState.showPerspectiveSliceViews;
  }
  get inputEventBindings() {
    return this.viewerState.inputEventBindings;
  }
  get visibility() {
    return this.viewerState.visibility;
  }
  get visibleLayerRoles() {
    return this.viewerState.visibleLayerRoles;
  }
  get crossSectionBackgroundColor() {
    return this.viewerState.crossSectionBackgroundColor;
  }
  get perspectiveViewBackgroundColor() {
    return this.viewerState.perspectiveViewBackgroundColor;
  }
  get scaleBarOptions() {
    return this.viewerState.scaleBarOptions;
  }
  layerPanel: LayerPanel|undefined;
  layout: DataPanelLayoutContainer;

  options: LayerGroupViewerOptions;

  state = new CompoundTrackable();

  get changed() {
    return this.state.changed;
  }

  constructor(
      public element: HTMLElement, public viewerState: LayerGroupViewerState,
      options: Partial<LayerGroupViewerOptions> = {}) {
    super();

      //Joe 툴팁용 div
  // divTooltip = document.createElement('div'); //Joe
    this.tooltipText =  <HTMLSpanElement>document.createElement('span'); //Joe

    this.options = {showLayerPanel: new TrackableBoolean(true), showViewerMenu: false, ...options};
    this.layerSpecification = this.registerDisposer(viewerState.layerSpecification);
    this.viewerNavigationState =
        this.registerDisposer(new LinkedViewerNavigationState(viewerState));
    this.viewerNavigationState.register(this.state);
    if (!(this.layerSpecification instanceof LayerSubsetSpecification)) {
      this.state.add('layers', {
        changed: this.layerSpecification.changed,
        toJSON: () => this.layerSpecification.layerManager.managedLayers.map(x => x.name),
        reset: () => {
          throw new Error('not implemented');
        },
        restoreState: () => {
          throw new Error('not implemented');
        }
      });
    } else {
      this.state.add('layers', this.layerSpecification);
    }
    element.classList.add('neuroglancer-layer-group-viewer');
    this.registerDisposer(new AutomaticallyFocusedElement(element));

    this.layout = this.registerDisposer(new DataPanelLayoutContainer(this, 'xy'));
    this.state.add('layout', this.layout);
    this.registerActionBindings();
    this.registerDisposer(this.layerManager.useDirectly());
    this.registerDisposer(setupPositionDropHandlers(element, this.navigationState.position));
    this.registerDisposer(this.options.showLayerPanel.changed.add(
        this.registerCancellable(debounce(() => this.updateUI(), 0))));

    //Joe 툴팁용
    // this.divTooltip.className = "tooltip"; //Joe
    this.tooltipText.className = "tooltiptext"; //Joe
    // this.divTooltip.appendChild(this.tooltipText); //Joe
    // element.addEventListener('mouse', function(e){
    //   this.tooltipText.style.display = "block";
    // });

    this.makeUI();


  } //constructor

  bindAction(action: string, handler: () => void) {
    this.registerDisposer(registerActionListener(this.element, action, handler));
  }

  private registerActionBindings() {
    this.bindAction('add-layer', () => {
      if (this.layerPanel) {
        this.layerPanel.addLayerMenu();
      }
    });
  }

  toJSON(): any {
    return {'type': 'viewer', ...this.state.toJSON()};
  }

  reset() {
    this.state.reset();
  }

  restoreState(obj: any) {
    this.state.restoreState(obj);
  }

  private makeUI() {
    var xPos: number; //Joe
    var yPos: number; //Joe

    this.element.style.flex = '1';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';

    //Joe 이 위치에서 Tooltip을 위한 div와 span을 넣도록 하자.
    // this.element.appendChild(this.divTooltip);
    // this.element.appendChild(this.tooltipText); //Joe

    this.element.appendChild(this.layout.element);

    //Joe
    let snackbar = document.createElement('div'); //Joe
    snackbar.id = "snackbar"; //Joe
    this.element.appendChild(snackbar); //Joe

    //Joe
    this.element.addEventListener('click', e => { //Joe OK
      // this.element.addEventListener('mousemove', e => { //Joe OK
      // this.registerEventListener(target, 'mousemove', (e: MouseEvent) => { //No works
      // e.preventDefault();
	  
      //console.log("*** e.clientX : "+e.clientX);
      //console.log("*** e.clientY : "+e.clientY);

      var idVal = <HTMLInputElement>document.getElementsByClassName('neuroglancer-layer-item-value')[1];
	  //var idVal = <HTMLInputElement>document.getElementsByClassName('neuroglancer-layer-item-label')[1];
      //console.log("$$$ ID : "+idVal.innerText);
	  //console.log(idVal);
	  
	  //alert("클릭");
      if (idVal=== undefined){
		console.log("값이 없음");
        return;
	  }
	  else if(idVal.innerText === "null" || idVal.innerText.length < 1){
        console.log("값이 없음");
        return;
      }

      snackbar.className = "show"; //Joe
      snackbar.textContent = "SegID: " + idVal.innerText; //Joe
      setTimeout(function(){ //Joe
         snackbar.className = snackbar.className.replace("show", "");
         }, 3000); //Joe

      // this.tooltipText.style.display = "block"; //이런식으로는 동작하지 않음
      // this.tooltipText.style.fontSize = "0.5" + "em";
      // xPos = e.clientX;
      // yPos = e.clientY;
      // this.tooltipText.style.height = "10" + 'px';
      // this.tooltipText.style.left = e.clientX + 7 + 'px';
      // this.tooltipText.style.top = (e.clientY - 100) + 'px';
      // //글자 수가 자를 넘어서면 width를 늘릴 것 
      // this.tooltipText.innerHTML = "SegID: " + idVal.innerHTML; //" ID: 365";
      // this.tooltipText.style.visibility = "visible";

      e.stopImmediatePropagation();
      e.preventDefault();

      // dispatchEvent(e);
    });

    // this.registerEventListener(target, 'mouseover', (event: MouseEvent) => {
      // this.dispatch('mouseover', event);

    //Joe
    this.element.addEventListener('mousemove', event => {
      // setTimeout( () => {
      //   this.tooltipText.style.visibility = "hidden";
      //   dispatchEvent(event);
      // }, 9000);

      // console.log("X : " + this.tooltipText.style.left);
      // console.log("Y : " + this.tooltipText.style.top);
      // console.log("툴팁 보임? "+this.tooltipText.style.visibility); //hidden, visible

      // console.log("툴팁 X의 이동 거리  : "+Math.abs(xPos - event.clientX));
      // console.log("툴팁 Y의 이동 거리 : "+Math.abs(yPos - event.clientY));

      if( Math.abs(xPos - event.clientX) > 12 || Math.abs(yPos - event.clientY) > 12){
        if(this.tooltipText.style.visibility === "visible"){
          this.tooltipText.style.visibility = "hidden";
          dispatchEvent(event);
        } 
      }
    });

    this.updateUI();

    //여기서 event를 걸면 안되겠다. mouse_bindings.ts에서 이벤트를 걸어야 할것 같다.
    //
    // this.element.addEventListener('mousemove', function(e){
    //   console.log("*** e.clientX : "+e.clientX);
    //   console.log("*** e.clientY : "+e.clientY);

    //   // console.log("$$$ ID : "+idVal.innerHTML);

    //   // this.tooltipText.style.display = "block";
    // });

    // this.element.addEventListener('click', function(e){
    //   // this.tooltipText.style.display = "block";

    //   console.log()
    // });

  }

  private updateUI() {
    const {options} = this;
    const showLayerPanel = options.showLayerPanel.value;
    if (this.layerPanel !== undefined && !showLayerPanel) {
      this.layerPanel.dispose();
      this.layerPanel = undefined;
      return;
    }
    if (showLayerPanel && this.layerPanel === undefined) {
      const layerPanel = this.layerPanel = new LayerPanel(
          this.display, this.layerSpecification, this.viewerNavigationState,
          this.viewerState.selectedLayer, () => this.layout.toJSON());
      if (options.showViewerMenu) {
        layerPanel.registerDisposer(makeViewerMenu(layerPanel.element, this));
        layerPanel.element.title = 'Right click for options, drag to move/copy layer group.';
      } else {
        layerPanel.element.title = 'Drag to move/copy layer group.';
      }
      layerPanel.element.draggable = true;
      this.registerEventListener(layerPanel.element, 'dragstart', (event: DragEvent) => {
        startLayerDrag(event, {
          manager: this.layerSpecification,
          layers: <ManagedUserLayerWithSpecification[]>this.layerManager.managedLayers,
          layoutSpec: this.layout.toJSON(),
        });
        const disposer = () => {
          if (dragSource && dragSource.viewer === this) {
            dragSource = undefined;
          }
          this.unregisterDisposer(disposer);
        };
        dragSource = {viewer: this, disposer};
        this.registerDisposer(disposer);
        const dragData = this.toJSON();
        delete dragData['layers'];
        event.dataTransfer!.setData(viewerDragType, JSON.stringify(dragData));
      });
      this.registerEventListener(layerPanel.element, 'dragend', (event: DragEvent) => {
        endLayerDrag(event);
        if (dragSource !== undefined && dragSource.viewer === this) {
          dragSource.disposer();
        }
      });
      this.element.insertBefore(layerPanel.element, this.element.firstChild);
    }
  }

  disposed() {
    removeChildren(this.element);
    const {layerPanel} = this;
    if (layerPanel !== undefined) {
      layerPanel.dispose();
      this.layerPanel = undefined;
    }
    super.disposed();
  }
}
