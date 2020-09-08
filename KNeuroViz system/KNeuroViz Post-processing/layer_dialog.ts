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

import {LayerListSpecification, ManagedUserLayerWithSpecification} from 'neuroglancer/layer_specification';
import {Overlay} from 'neuroglancer/overlay';
import {DataType, VolumeType} from 'neuroglancer/sliceview/volume/base';
import {CancellationToken, CancellationTokenSource} from 'neuroglancer/util/cancellation';
import {associateLabelWithElement} from 'neuroglancer/widget/associate_label';
import {AutocompleteTextInput, makeCompletionElementWithDescription} from 'neuroglancer/widget/autocomplete';
import {makeHiddenSubmitButton} from 'neuroglancer/widget/hidden_submit_button';

// declare var addMoreData : string; // from 'neuroglancer/layer_panel';
// import {addMoreData} from 'neuroglancer/layer_panel'; //Joe OK
// import addData = require("neuroglancer/layer_panel");
// import * as addMoreData from 'neuroglancer/layer_panel'; //Joe

// Import assignment cannot be used when targeting ECMAScript modules. 
// Consider using 'import * as ns from "mod"', 'import {a} from "mod"', 'import d from "mod"', 
// or another module format instead.ts(1202)

require('./layer_dialog.css');

export class LayerDialog extends Overlay {
  /**
   * Used for displaying status information.
   */
  statusElement = document.createElement('div');

  sourceInput: AutocompleteTextInput;
  submitElement = document.createElement('button');
  btnData1 = document.createElement('button'); //Joe  
  btnData2 = document.createElement('button'); //Joe

  //레이아웃 틀 만들기
  divWrap = document.createElement('div'); //Joe   //div id="wrap"
  // divTitle = document.createElement('div'); //Joe //div id="title"
  logoImg = document.createElement('img'); //Joe  //div id="ncrgLogo"
  neuroTitle = document.createElement('h4'); //Joe  //div id="neuro_title"
  // userName = document.createElement('h6'); //Joe  //div id="user_name";
  divHeader = document.createElement('div'); //Joe   //div id="header"
  divContainer = document.createElement('div'); //Joe   //div id="container"
  divSidebar = document.createElement('div'); //Joe   //div id="sidebar"
  divContent = document.createElement('div'); //Joe   //div id="content"
  
  namePromptElement = document.createElement('label');
  nameInputElement = document.createElement('input');
  volumeCancellationSource: CancellationTokenSource|undefined = undefined;
  sourceValid: boolean = false; //Joe 원본
  // sourceValid: boolean = true; //Joe
  nameValid: boolean = true;

  constructor(
      public manager: LayerListSpecification,
      public existingLayer?: ManagedUserLayerWithSpecification) {
    super();

    // alert(location.href); //Joe 접속해 들어오는 url과 parameter를 여기서 확인할 수 있다.
    console.log("접속해 온 URL : "+location.href); // 2020-08-05
	
    //아래에서 this.content가 의미하는 것은 overlay.ts에서 아래와 같은 코드로 div class="overlay-content"로 되어 있는
    //바로 그 content를 의미한다.
    // let content = this.content = document.createElement('div');
    // content.className = 'overlay-content';
    //따라서 overlay.ts에 있는 html 엘리먼트를 layer_dialog.ts라는 다른 파일에서 가져와서 사용하는 방식이 이런식이다.
    let dialogElement = this.content;
    dialogElement.classList.add('add-layer-overlay'); 
	dialogElement.style.display = "none";
	if (dialogElement.parentElement != null ) {
		dialogElement.parentElement.style.display = "none";
	}
    let kkk = this.container; //Joe
    console.log(kkk.className); //Joe 이런식으로 overlay.ts에 있는 html 엘리먼트를 layer_dialog.ts인 다른 파일에서 사용가능

    //아래 this.divContent는 overlay.ts에서 생성한 div class="content"를 의미한다.
    // let divContent = this.divContent;

    let sourceCompleter = (value: string, cancellationToken: CancellationToken) =>
        this.manager.dataSourceProvider
            .volumeCompleter(value, this.manager.chunkManager, cancellationToken)
            .then(originalResult => ({
                    completions: originalResult.completions,
                    makeElement: makeCompletionElementWithDescription,
                    offset: originalResult.offset,
                    showSingleResult: true,
                  }));

    //Source, Name과 관련 input 박스를 포함하는 form //Joe
    let sourceForm = document.createElement('form');
    sourceForm.className = 'source-form';
    this.registerEventListener(sourceForm, 'submit', (event: Event) => {
      event.preventDefault();
      this.validateSource(/*focusName=*/true);
    });

    let sourcePrompt = document.createElement('label');
    sourcePrompt.textContent = 'Source:';
    let sourceInput = this.sourceInput =
        this.registerDisposer(new AutocompleteTextInput({completer: sourceCompleter, delay: 0}));
    sourceInput.element.classList.add('add-layer-source');
    sourceInput.element.setAttribute("id", "sourceInput");
    sourceInput.inputElement.addEventListener('blur', () => {
      this.validateSource(/*focusName=*/false);
    });
    // this.submitElement.disabled = true; //Joe 주석 해제가 원본
    sourceInput.inputChanged.add(() => {
      const {volumeCancellationSource} = this;
      if (volumeCancellationSource !== undefined) {
        volumeCancellationSource.cancel();
        this.volumeCancellationSource = undefined;
      }

      //아래 this.sourceValie의 값이 false인 상태에서는 데이터 input 화면(Source/Name)의 input 태그에 
      //url 값을 입력해 두어도 Add Layer 버튼 클릭시 뷰어 화면으로 넘어가지 않는다. 
      //이 값을 true로 해야 정상적으로 넘어가게 된다.
      // this.sourceValid = false; //Joe 주석 해제가 원본
      this.sourceValid = true; //Joe
      // this.submitElement.disabled = true; //Joe 주석 해제가 원본
      this.statusElement.textContent = '';
    });
    sourceForm.appendChild(sourcePrompt);
    sourceForm.appendChild(sourceInput.element);
    associateLabelWithElement(sourcePrompt, sourceInput.inputElement);
    let hiddenSourceSubmit = makeHiddenSubmitButton();
    sourceForm.appendChild(hiddenSourceSubmit);

    // dialogElement.appendChild(sourceForm); //Joe 주석 해제가 원본

    let {statusElement, namePromptElement, nameInputElement, submitElement, 
          btnData1, btnData2, divWrap, logoImg, neuroTitle, divHeader, divContainer, divSidebar, divContent} = this;
    statusElement.className = 'dialog-status';

    let nameForm = document.createElement('form');
    nameForm.className = 'name-form';
    namePromptElement.textContent = 'Name:';
    nameInputElement.className = 'add-layer-name';
    // nameInputElement.readOnly = true; //Joe
    // nameInputElement.value= "sample"; //Joe
    nameInputElement.autocomplete = 'off';
    nameInputElement.spellcheck = false;

    nameInputElement.type = 'text';

    this.registerEventListener(nameInputElement, 'input', () => {
      this.validateName();
    });

    submitElement.type = 'submit';

    divWrap.id = "wrap"; //Joe   //div id="wrap"
    // divTitle.id = "title"; //Joe   //div id="titleÎ"
    logoImg.id = "ncrgLogo"; //Joe  //div id="ncrgLogo"
    logoImg.src = "./src/neuroglancer/ncrgImage/ncrg_logo02.png"; //Joe
    neuroTitle.innerText = "Neuroglancer 3D Viewer"; //Joe
    
    neuroTitle.id = "neuro_title";  //Joe
    // userName.innerText = "| 홍길동 |"; //Joe
    // userName.id = "user_name"; //Joe

    divHeader.id = 'header'; //Joe   //div id="header"
    divContainer.id = 'container'; //Joe   //div id="container"
    divSidebar.id = 'sidebar'; //Joe   //div id="sidebar"
    divContent.id = 'content'; //Joe   //div id="content"

    // divHeader.innerText = "Neuroglancer 3D Viewer"; //Joe 
    // divSidebar.innerText = "Sidebar"; //Joe 
    // divContent.innerText = "Content"; //Joe 

    //아래에서 버튼 btnData1의 type을 submit으로 해줘야 이 버튼 클릭시 206라인의 submit() 함수가
    //호출이되는 것이다.
    btnData1.type = 'submit'; //Joe
    btnData2.type = 'submit'; //Joe
    // btnData1.style.width = '50em';
    btnData1.className = "btnData1"; //Joe
    btnData2.className = "btnData1"; //Joe
    //btnData1.id = 'kkk'; //이런식으로 id 추가 가능
	// btnData1.style.fontSize = '1.2em'; //Joe
    // btnData1.style.padding = '1.2em 1.2em 1.2em 1.2em'; //Joe
    // btnData1.style.marginLeft = '5em'; //Joe
    // btnData1.style.marginTop = '2em'; //Joe

    // joe.style.paddingLeft = '1.2em'; //Joe
    // joe.style.paddingBottom = '1.2em'; //Joe
    // joe.style.paddingRight = '1.2em'; //Joe
    // joe.style.paddingTop = '1.2em'; //Joe
    // btnData1.style.backgroundColor = "#00cc99"; //Joe

    associateLabelWithElement(namePromptElement, nameInputElement);

    // nameForm.appendChild(namePromptElement); //Joe 주석 해제가 원본
    // nameForm.appendChild(nameInputElement); //Joe 주석 해제가 원본
    // nameForm.appendChild(submitElement); //Joe 주석 해제가 원본

    nameForm.appendChild(btnData1); //Joe
    nameForm.appendChild(btnData2); //Joe
    divContent.appendChild(nameForm); //Joe

    divContainer.appendChild(divSidebar); //Joe
    divContainer.appendChild(divContent); //Joe

    // divTitle.appendChild(logoImg); //Joe
    // divWrap.appendChild(divTitle); //Joe
    
    this.divHeader.appendChild(logoImg); //Joe
    this.divHeader.appendChild(neuroTitle); //Joe
    // this.divHeader.appendChild(userName);
    divWrap.appendChild(this.divHeader); //Joe
    divWrap.appendChild(this.divContainer); //Joe

    // dialogElement.appendChild(nameForm); //Joe 주석 해제가 원본
    dialogElement.appendChild(divWrap); //Joe

    dialogElement.appendChild(statusElement);
	dialogElement.style.display = "none";
    if (existingLayer !== undefined) {
      if (existingLayer.sourceUrl !== undefined) {
        sourceInput.value = existingLayer.sourceUrl;
        this.validateSource();
      } else {
        this.sourceValid = true;
      }
      sourceInput.disabled = true;
      nameInputElement.value = existingLayer.name;
      this.validateName();
      submitElement.textContent = 'Save';
      nameInputElement.focus();
    } else {
      let {managedLayers} = this.manager.layerManager;
      for (let hintLayerIndex = managedLayers.length - 1; hintLayerIndex >= 0; --hintLayerIndex) {
        const hintLayer = managedLayers[hintLayerIndex];
        if (!(hintLayer instanceof ManagedUserLayerWithSpecification)) continue;
        const {sourceUrl} = hintLayer;
        if (sourceUrl === undefined) continue;
        try {
          let groupIndex = this.manager.dataSourceProvider.findSourceGroup(sourceUrl);
          sourceInput.value = sourceUrl.substring(0, groupIndex);
          sourceInput.inputElement.setSelectionRange(0, groupIndex);
          break;
        } catch {
        }
      }
      sourceInput.inputElement.focus();
      submitElement.textContent = 'Add Layer'; //Joe 주석 해제가 원본
      
/* ********************************************      
      btnData1.textContent = "Joe";
      btnData1.addEventListener("click", function(){
        sourceInput.value = "precomputed://http://192.168.1.6:8080/src/sample";
        nameInputElement.value = "sample";

        // sourceInput.element.focus();

        // var event = document.createEvent("MouseEvents");
        // event.initEvent("click", true, true);
        // sourceInput.element.dispatchEvent(event);


        // dispatchEvent("paste");
        // maybeUpdateFocus();
        // const maybeUpdateFocus = debounce(() => {
        //   const {activeElement} = document;
        //   if (activeElement === null || activeElement === document.body) {
        //     const node = LinkedListOperations.front<AutomaticallyFocusedElement>(<any>automaticFocusList);
        //     if (node !== null) {
        //       node.element.focus();
        //     }
        //   }
        // });
        
      });
********************** */

    } //else

    this.registerEventListener(nameForm, 'submit', (event: Event) => {
      event.preventDefault();
      this.submit();
    });

/* ***
    precomputed://gs://neuroglancer-public-data/kasthuri2011/image
    precomputed://gs://neuroglancer-public-data/kasthuri2011/image_color_corrected
    precomputed://gs://neuroglancer-public-data/kasthuri2011/ground_truth
*** */


    //이 위치에서도 가능
    //btnData1.textContent = "Neuroglancer용 샘플 테스트 데이터";  //Joe
    //btnData1.addEventListener("click", function(){ //Joe
      //sourceInput.value = "precomputed://http://localhost:8080/src/sample";
    //  sourceInput.value = "precomputed://http://192.168.1.37:8080/src/sample";
      // sourceInput.value = "precomputed://http://kbri.ihubiz.com/sample";
    //  nameInputElement.value = "sample";

      // sourceInput.value = "precomputed://gs://neuroglancer-public-data/kasthuri2011/image";
      // nameInputElement.value = "image";
    //});
  
    //Add Input Data 처리
    //포털에서 Add Input Data 버튼 클릭시 
    //layer_panel.ts의 this.registerEventListener(addButton, 'click', (event: MouseEvent) 함수 호출됨
    //그 함수에서 addMoreData 변수에 아래 문자열 넣어서 구분
    //아래와 같이 하면 Add Input Data 처리가 포털과 연동이 된다.
    // if(addMoreData == "qqqAddInputDataClicked"){
    //   alert("test~"+addMoreData);
    //   sourceInput.value = "precomputed://gs://neuroglancer-public-data/kasthuri2011/image";
    //   nameInputElement.value = "ground_truth";
    //   // addMoreData = "noMore"; //not work
    //   this.submit();
    //   return;
    // }



    btnData2.textContent = "Add Input Data 버튼 클릭시";
    btnData2.addEventListener("click", function(){
      alert("wait a moment~");

      sourceInput.value = "precomputed://gs://neuroglancer-public-data/kasthuri2011/ground_truth";
      nameInputElement.value = "ground_truth";
    });

    var inUrl = location.href; 
    // alert("윈도우 서버에 있는 sample 데이터 임. 접속해 온 url : "+location.href);
    //t1: userid, t2: name, t3: input_type
    var userId = inUrl.substring(inUrl.indexOf('t1')+3, inUrl.indexOf('t2')-1); //Joe
    var dirName = inUrl.substring(inUrl.indexOf('t2')+3, inUrl.indexOf('t3')-1); //Joe
    var inputType = inUrl.substring(inUrl.indexOf('t3')+3, inUrl.indexOf('t4')-1);; //Joe
	var prjId = inUrl.substring(inUrl.indexOf('t4')+3, inUrl.length); //Joe
    // alert("userId : " + userId + " || dirName : "+dirName+" || inputType : "+inputType);
    //  alert("inputType : "+inputType);

    //Add Input Data 버튼을 클릭했을 때 inputType뒤에 #!뒤쪽에 url 정보가 길게 붙음
    if(prjId.indexOf("#!") > -1){  ///data/portal/kneuroviz/test06/stability/sg
      let selecter = <HTMLSelectElement> document.getElementById("layerSelectList");
	  if (selecter != null) {
		sourceInput.value = selecter.value;
		//sourceInput.value = "precomputed://http://localhost:8080/test06/test06Data"; 
	    //nameInputElement.value = selecter.innerText;
		nameInputElement.value = selecter.options[selecter.options.selectedIndex].innerText
      	this.submit();
	  }
    } else {
      //EnView 포털 시스템과연 연동시에는 btnData1을 클릭해서 3D 뷰어를 보이는 것이 아니라 업로드 목록에서 '보기' 버튼을
      //클릭시 자동으로 3D 뷰어로 넘어가야 한다. 이렇게 동작하도록 하는 핵심이 sourceInput.value에 아래와 같은 값을 넣고
      //nameInputElement.value에도 아래와 같은 Name의 값을 넣으면 이 두 변수의 값이 변화가 발생하는 순간
      //validation 체크를 자동으로 하고 그후 this.submit()을 하면 자동으로 다음 화면으로 넘어간다!!!
      // sourceInput.value = "precomputed://http://192.168.1.37:8080/src/sample";
      // sourceInput.value = "precomputed://http://neuro.ihubiz.com/src/sample";
      sourceInput.value = "precomputed://http://kbrain-map.kbri.re.kr:8080/dext5uploaddata/kneuroviz/" + userId + "/" + dirName + "/" + inputType; 
      //sourceInput.value = "precomputed://http://192.168.100.160:2002/Segmentation/20190719_mesh_seg_out/"; 
      // sourceInput.value = "precomputed://http://kbrain-map.kbri.re.kr:8080/test06/brain_util";
      //nameInputElement.value = dirName + inputType; //"sample"; //Joe
      // location.href = "192.168.1.37:8080";
      // alert(location.href);
		//sourceInput.value = "precomputed://http://localhost:8080/test06/test06Data";
		nameInputElement.value = inputType;
      this.submit();
    }

  } //constructor

  isNameValid() {
    let name = this.nameInputElement.value;
    if (name === '') {
      return false;
    }
    let otherLayer = this.manager.layerManager.getLayerByName(name);
    return otherLayer === undefined || otherLayer === this.existingLayer; //Joe 주석 해제가 원본
    // return true; //Joe
  }

  submit() {
    if (this.sourceValid && this.isNameValid()) {
      if (this.existingLayer) {
        this.existingLayer.name = this.nameInputElement.value;
        this.manager.layerManager.layersChanged.dispatch();
      } else {
        this.manager.add(
            this.manager.getLayer(this.nameInputElement.value, this.sourceInput.value));
      }
      this.dispose();
    }
  }

  validateName() {
    let {nameInputElement} = this;
    let nameValid = this.nameValid = this.isNameValid();
    if (nameValid) {
      nameInputElement.classList.add('valid-input');
      nameInputElement.classList.remove('invalid-input');
    } else {
      nameInputElement.classList.remove('valid-input');
      nameInputElement.classList.add('invalid-input');
    }
    this.validityChanged();
  }

  validityChanged() {
    this.submitElement.disabled = !(this.nameValid && this.sourceValid); //Joe 주석 해제가 원본
    // alert(this.submitElement.disabled);
  }

  validateSource(focusName: boolean = false) {
    let url = this.sourceInput.value;
    if (url === '') {
      return;
    }
    try {
      let baseSuggestedName = this.manager.dataSourceProvider.suggestLayerName(url);
      let {nameInputElement} = this;
      if (this.nameInputElement.value === '') {
        let suggestedName = this.manager.layerManager.getUniqueLayerName(baseSuggestedName);
        nameInputElement.value = suggestedName;
        nameInputElement.setSelectionRange(0, suggestedName.length);
        this.validateName();
      }
      if (focusName) {
        nameInputElement.focus();
      }
    } catch (error) {
      this.setError(error.message);
      return;
    }

    this.setInfo('Validating volume source...');
    const token = this.volumeCancellationSource = new CancellationTokenSource();
    // alert("token: "+token); //Joe
    console.log("token: "+token);


    this.manager.dataSourceProvider
        .getVolume(
            this.manager.chunkManager, url, /*options=*/undefined, token)
        .then(source => {
          if (token.isCanceled) {
            return;
          }
          this.volumeCancellationSource = undefined;
          this.sourceValid = true;
          this.setInfo(
              `${VolumeType[source.volumeType].toLowerCase()}: ` +
              `${source.numChannels}-channel ${DataType[source.dataType].toLowerCase()}`);
          this.validityChanged();
        })
        .catch((reason: Error) => {
          if (token.isCanceled) {
            return;
          }
          this.volumeCancellationSource = undefined;
          this.setError(reason.message);
        });
  }

  setInfo(message: string) {
    this.statusElement.className = 'dialog-status dialog-status-info';
    this.statusElement.textContent = message;
  }

  setError(message: string) {
    this.statusElement.className = 'dialog-status dialog-status-error';
    this.statusElement.textContent = message;
  }
}
