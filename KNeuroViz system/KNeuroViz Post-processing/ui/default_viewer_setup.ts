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

import {StatusMessage} from 'neuroglancer/status';
import {bindDefaultCopyHandler, bindDefaultPasteHandler} from 'neuroglancer/ui/default_clipboard_handling';
import {setDefaultInputEventBindings} from 'neuroglancer/ui/default_input_event_bindings';
import {makeDefaultViewer} from 'neuroglancer/ui/default_viewer';
import {UrlHashBinding} from 'neuroglancer/ui/url_hash_binding';

/**
 * Sets up the default neuroglancer viewer.
 */
export function setupDefaultViewer() {
  let viewer = (<any>window)['viewer'] = makeDefaultViewer();
  console.log("viewer.state: "+viewer.state.toJSON.toString());
  console.log("viewer.display: "+viewer.display);

  setDefaultInputEventBindings(viewer.inputEventBindings);

  const hashBinding = viewer.registerDisposer(new UrlHashBinding(viewer.state));
  console.log("hashBinding :"+hashBinding.dispose);

  viewer.registerDisposer(hashBinding.parseError.changed.add(() => {
    const {value} = hashBinding.parseError;
    if (value !== undefined) {
      const status = new StatusMessage();
      status.setErrorMessage(`Error parsing state: ${value.message}`);
      console.log('Error parsing state', value);
    }
    hashBinding.parseError;
  }));

  //아래 코드가 data input후 Add Layer클릭시 data input하는 화면 영역(Source, Name 영역)이 사라지고 뷰어 화면만 보이게 하는 코드임
  //따라서 아래 코드가 없으면 data input 영역이 계속 보이고 뷰어화면은 뒷쪽에 희미하게 보인다. 이때 div overlay를 삭제하면 뷰어가 정상적으로 잘 보임
  hashBinding.updateFromUrlHash();

  //아래 두 코드도 위의 hashBinding.updateFromUrlHash()와 동일한 효과가 나온다.
  bindDefaultCopyHandler(viewer);
  bindDefaultPasteHandler(viewer);

  // alert("여기는 default-viewer-setup.ts의 setupDefaultViewer()~");

  return viewer;
}
