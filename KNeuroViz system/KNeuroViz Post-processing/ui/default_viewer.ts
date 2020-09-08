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

require('./default_viewer.css');

import 'neuroglancer/sliceview/chunk_format_handlers';

import {StatusMessage} from 'neuroglancer/status';
import {DisplayContext} from 'neuroglancer/display_context';
import {Viewer, ViewerOptions} from 'neuroglancer/viewer';
import {disableContextMenu, disableWheel} from 'neuroglancer/ui/disable_default_actions';

export function makeDefaultViewer(options?: Partial<ViewerOptions>) {
  disableContextMenu();
  disableWheel();
  try {
    let display = new DisplayContext(document.getElementById('neuroglancer-container')!);
    console.log("display : "+display);
    console.log("options : "+options);

    // StatusMessage.showMessage(`Error: ${error.message}`);
    // StatusMessage.showMessage("^_^ StatusMessage.showMessage()~");

    //아래에서 return을 하지 않으면 Source input 태그 안의 값이 사라지지 않는다. 그리고 input 태그가 click 이벤트가 동작한다.
    //그런데 문제는 뷰어가 안 보인다는 것이다.
    return new Viewer(display, options); 
  } catch (error) {
    StatusMessage.showMessage(`Error: ${error.message}`);
    throw error;
  }
}
