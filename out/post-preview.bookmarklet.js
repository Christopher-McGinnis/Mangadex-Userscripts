javascript:"use strict";function isUserscript(){return void 0!==window.GM_xmlhttpRequest}function loadScript(e){const{head:t}=document,n=document.createElement("script");return n.type="text/javascript",n.src=e,new Promise((e,o)=>{n.onload=e,n.onerror=o,t.appendChild(n)})}if(!isUserscript&&!window.location.href.startsWith("https://mangadex.org"))throw alert("Mangadex Post Preview script only works on https://mangadex.org"),Error("Mangadex Post Preview script only works on https://mangadex.org");const ERROR_IMG="https://i.pinimg.com/originals/e3/04/73/e3047319a8ae7192cb462141c30953a8.gif",LOADING_IMG="https://i.redd.it/ounq1mw5kdxy.gif",imageBlobs={};function getImageBlob(e){return imageBlobs[e]||(imageBlobs[e]=new Promise((t,n)=>{GM_xmlhttpRequest({method:"GET",url:e,responseType:"blob",onerror:n,ontimeout:n,onload:o=>200!==o.status&&304!==o.status||!o.response?n(o):(imageBlobs[e]=Promise.resolve(o.response),t(imageBlobs[e]))})})),imageBlobs[e]}function getImageObjectURL(e){return getImageBlob(e).then(e=>URL.createObjectURL(e))}const imgCache={};function cloneImageCacheEntry(e){const t=e.element.cloneNode(),{loadPromise:n}=e;return{element:t,loadPromise:n}}function getImgForURL(e){return isUserscript()?getImgForURLViaFetch(e):getImgForURLViaImg(e)}function getImgForURLViaImg(e){if(void 0!==imgCache[e])return cloneImageCacheEntry(imgCache[e]);const t=document.createElement("img"),n=new Promise((n,o)=>{t.onload=()=>n(t),t.onerror=e=>o(new Error(e.toString())),t.src=e});return imgCache[e]={element:t,loadPromise:n},imgCache[e]}function getImgForURLNoCache(e){const t=document.createElement("img"),n=new Promise((n,o)=>{t.onload=()=>n(t),t.onerror=e=>o(new Error(e.toString())),t.src=e});return{element:t,loadPromise:n}}function getImgForURLViaFetch(e){const t=getImageObjectURL(e),n=document.createElement("img"),o=t.then(e=>new Promise((t,o)=>{n.onload=()=>{URL.revokeObjectURL(e),t(n)},n.onerror=t=>{URL.revokeObjectURL(e),o(new Error(t.toString()))},n.src=e}));return{element:n,loadPromise:o}}function getImgForURLViaFetchClone(e){if(void 0!==imgCache[e])return cloneImageCacheEntry(imgCache[e]);const t=getImageObjectURL(e),n=document.createElement("img"),o=t.then(e=>new Promise((t,o)=>{n.onload=()=>{t(n)},n.onerror=e=>{o(new Error(e.toString()))},n.src=e}));return imgCache[e]={element:n,loadPromise:o},imgCache[e]}let generatedBBCodePegParser;function bbcodePegParser(){return generatedBBCodePegParser||(generatedBBCodePegParser=peg.generate(String.raw`${"\n"}start = res:Expressions? {return res}${"\n"}Expressions = reses:Expression+ {${"\n"}  let astroot = [{type:"root",content:[],location:[0,0]}]${"\n"}  let stack = [astroot[0]]${"\n"}  let astcur = astroot[0]${"\n"}  reses.forEach((res) => {${"\n"}    let thisast = {}${"\n"}    if (res.type == "open") {${"\n"}      thisast.type = res.type${"\n"}      thisast.tag = res.content${"\n"}      thisast.content = []${"\n"}      // Must update end location when tag closes${"\n"}      thisast.location = res.location${"\n"}      astcur.content.push(thisast)${"\n"}      astcur.location[1] = res.location[1]${"\n"}      astcur=thisast${"\n"}      stack.push(thisast)${"\n"}    }${"\n"}    else if (res.type == "prefix") {${"\n"}      // cannot directly nest bullet in bullet (must have a non-prexix container class)${"\n"}      if (astcur.type == "*") {${"\n"}        // FIXME are we supposed to subtract 1 here?${"\n"}        astcur.location = res.location[0] // - 1${"\n"}        stack.pop()${"\n"}        astcur=stack[stack.length -1]${"\n"}      }${"\n"}      thisast.type = res.type${"\n"}      thisast.tag = res.content${"\n"}      thisast.content = []${"\n"}      thisast.location = res.location${"\n"}      astcur.content.push(thisast)${"\n"}      astcur.location[1] = res.location[1]${"\n"}      astcur=thisast${"\n"}      stack.push(thisast)${"\n"}    }${"\n"}    else if (res.type == "opendata") {${"\n"}      thisast.type = res.type${"\n"}      thisast.tag = res.content${"\n"}      thisast.data = res.attr${"\n"}      thisast.content = []${"\n"}      thisast.location = res.location${"\n"}      astcur.content.push(thisast)${"\n"}      astcur.location[1] = res.location[1]${"\n"}      astcur=thisast${"\n"}      stack.push(thisast)${"\n"}    }${"\n"}    else if (res.type == "close") {${"\n"}      let idx = Object.values(stack).reverse().findIndex((e)=>e.tag == res.content)${"\n"}      if (idx != -1 ) {${"\n"}        idx=idx+1${"\n"}        // NOTE should we set ast location end? Yes!${"\n"}        for (let i = stack.length -idx; i < stack.length; i++) {${"\n"}          stack[i].location[1] = res.location[1]${"\n"}        }${"\n"}        stack.splice(-idx,idx)${"\n"}        astcur.location[1] = res.location[1]${"\n"}        astcur=stack[stack.length -1]${"\n"}      }${"\n"}      else {${"\n"}        thisast.type="error"${"\n"}        thisast.content="[/" + res.content + "]"${"\n"}        thisast.location = res.location${"\n"}        astcur.location[1] = res.location[1]${"\n"}        astcur.content.push(thisast)${"\n"}      }${"\n"}    }${"\n"}    else if (res.type == "linebreak" ) {${"\n"}      // TODO should check if prefix instead if prefix is to be expanded appon${"\n"}      if (astcur.tag == "*") {${"\n"}        // FIXME are we supposed to subtract 1 here?${"\n"}        astcur.location[1] = res.location[0] // - 1${"\n"}        // Are Linebreaks added when we are exiting a prefix? Seems like it!${"\n"}        // Not sure why though...${"\n"}        astcur.content.push(res)${"\n"}        stack.pop()${"\n"}        astcur=stack[stack.length -1]${"\n"}      }${"\n"}      else {${"\n"}        astcur.location[1] = res.location[1]${"\n"}        astcur.content.push(res)${"\n"}      }${"\n"}    }${"\n"}    else {${"\n"}      astcur.location[1] = res.location[1]${"\n"}      astcur.content.push(res)${"\n"}    }${"\n"}  })${"\n"}  // Close all tags (location). Remember we start at 1 bc root is just a container${"\n"}  for (let i = 1; i < stack.length; i++) {${"\n"}    stack[i].location[1] = astcur.location[1]${"\n"}  }${"\n"}  //stack.splice(start, end) not needed${"\n"}  return astroot[0].content${"\n"}}${"\n"}Expression = res:(OpenTag / OpenDataTag / CloseTag / PrefixTag / LineBreak / Text )${"\n"}/*head:Term tail:(_ ("+" / "-") _ Term)* {${"\n"}      return tail.reduce(function(result, element) {${"\n"}        if (element[1] === "+") { return result + element[3]; }${"\n"}        if (element[1] === "-") { return result - element[3]; }${"\n"}      }, head);${"\n"}    }${"\n"}*/${"\n"}Tag = tag:(OpenCloseTag / PrefixTag) {return tag}${"\n"}OpenCloseTag = open:(OpenTag / OpenDataTag) content:Expression? close:CloseTag?${"\n"}  &{${"\n"}    let hasClose = close != null${"\n"}    if (false && hasClose && open.tag != close.tag) {${"\n"}      throw new Error(${"\n"}          "Expected [/" + open.tag + "] but [/" + close.tag + "] found."${"\n"}      );${"\n"}    }${"\n"}    return true${"\n"}} {${"\n"}    return {type:open.tag, data:open.attr, content}${"\n"}}${"\n"}PrefixTag = "[" tag:PrefixTagList "]" { return {type:"prefix", content:tag, location:[location().start.offset,location().end.offset]} }${"\n"}${"\n"}// PrefixTag = "[" tag:PrefixTagList "]" content:(!("[/" ListTags "]" / LineBreak ) .)* { return {type:tag,unparsed:content.join('')} }${"\n"}${"\n"}ListTags = "list" / "ul" / "ol" / "li"${"\n"}${"\n"}NormalTagList = "list" / "spoiler" / "center" / "code" / "quote" / "img" /  "sub" / "sup" / "left" / "right" / "ol" / "ul" / "h1" / "h2" / "h3" / "h4" / "hr" / "h" / "b" / "s" / "i" / "u"${"\n"}DataTagList = "url"${"\n"}PrefixTagList = "*"${"\n"}${"\n"}Data${"\n"}  = text:(!"]". Data?) {${"\n"}  /*if(text[2] != null) {${"\n"}    return {type: "data", content:text[1] + text[2].content }${"\n"}  }${"\n"}  return {type: "data", content:text[1] }${"\n"}  */${"\n"}  if(text[2] != null) {${"\n"}    return text[1] + text[2]${"\n"}  }${"\n"}  return text[1]${"\n"}}${"\n"}OpenTag = "[" tag:NormalTagList "]" { return {type:"open", content:tag, location:[location().start.offset,location().end.offset] } }${"\n"}AttrTagProxy = "=" attr:Data? {return attr}${"\n"}OpenDataTag = "[" tag:DataTagList attr:AttrTagProxy?  "]" { return {type:"opendata", content:tag,attr:attr, location:[location().start.offset,location().end.offset]} }${"\n"}${"\n"}CloseTag = "[/" tag:(DataTagList / NormalTagList / PrefixTagList ) "]" { return {type:"close", content:tag, location:[location().start.offset,location().end.offset]} }${"\n"}${"\n"}${"\n"}Text${"\n"}  = text:(!(Tag / CloseTag / LineBreak). Text?) {${"\n"}  if(text[2] != null) {${"\n"}    return {type: "text", content:text[1] + text[2].content, location:[location().start.offset,text[2].location[1]] }${"\n"}  }${"\n"}  return {type: "text", content:text[1], location:[location().start.offset,location().end.offset] }${"\n"}}${"\n"}ContiguousText${"\n"}  = text:(!(Tag / CloseTag / LineBreak / _ ). ContiguousText?) {${"\n"}  if(text[2] != null) {${"\n"}    return {type: "text", content:text[1] + text[2].content, location:[location().start.offset,text[2].location[1]] }${"\n"}  }${"\n"}  return {type: "text", content:text[1], location:[location().start.offset,location().end.offset] }${"\n"}}${"\n"}LineBreak${"\n"}  = [\n] {${"\n"}  return {type: "linebreak", location:[location().start.offset,location().end.offset] }${"\n"}}${"\n"}ErrorCatcher${"\n"}  = errTxt:. {return {type: "error", content: errTxt, location:[location().start.offset,location().end.offset]} }${"\n"}${"\n"}_ "whitespace"${"\n"}  = [ \t\n\r]*${"\n"}`))}function pegAstToHtml_v2(e){if(null==e)return[];if("object"!=typeof e)return[];function t(e,t,n){e.push({type:"text",element:n,location:t.location})}return e.reduce((n,o)=>{if("text"===o.type)t(n,o,document.createTextNode(o.content));else if("linebreak"===o.type){const e={element:document.createElement("br"),location:o.location,type:"container",contains:[]};n.push(e)}else if("error"===o.type)t(n,o,document.createTextNode(o.content));else{if("open"!==o.type&&"prefix"!==o.type&&"opendata"!==o.type)throw new Error({msg:`Unknown AST type "${o.type}" recieved!`,child_ast:o,container_ast:e});if("u"===o.tag||"s"===o.tag||"sub"===o.tag||"sup"===o.tag||"ol"===o.tag||"code"===o.tag||"h1"===o.tag||"h2"===o.tag||"h3"===o.tag||"h4"===o.tag||"h5"===o.tag||"h6"===o.tag){const e={element:document.createElement(o.tag),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("list"===o.tag||"ul"===o.tag){const e={element:document.createElement("ul"),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("hr"===o.tag){const e={element:document.createElement(o.tag),location:o.location,type:"container",contains:[]};n.push(e),pegAstToHtml_v2(o.content).forEach(e=>{n.push(e)})}else if("b"===o.tag){const e={element:document.createElement("strong"),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("i"===o.tag){const e={element:document.createElement("em"),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("h"===o.tag){const e={element:document.createElement("mark"),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("url"===o.tag){const e={element:document.createElement("a"),location:o.location,type:"container",contains:[]};n.push(e),o.data&&(e.element.href=o.data),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("img"===o.tag){let e="";if(o.content){const t=o.content[0];t&&"text"===t.type&&(e=t.content)}const t=getImgForURL(e),a={element:t.element,location:o.location,type:"image",imagePromise:t.loadPromise.then(()=>e)};a.element.style.maxWidth="100%",a.element.classList.add("align-bottom"),n.push(a)}else if("quote"===o.tag){const e={element:document.createElement("div"),location:o.location,type:"container",contains:[]};n.push(e),e.element.style.width="100%",e.element.style.display="inline-block",e.element.style.margin="1em 0",e.element.classList.add("well","well-sm"),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("spoiler"===o.tag){const e={element:document.createElement("button"),location:o.location,type:"container",contains:[]};e.element.textContent="Spoiler",e.element.classList.add("btn","btn-sm","btn-warning","btn-spoiler"),n.push(e);const t={element:document.createElement("div"),location:o.location,type:"container",contains:[]};n.push(t),t.element.classList.add("spoiler","display-none"),t.contains=pegAstToHtml_v2(o.content),t.contains.forEach(e=>{t.element.appendChild(e.element)})}else if("center"===o.tag||"left"===o.tag||"right"===o.tag){const e={element:document.createElement("div"),location:o.location,type:"container",contains:[]};n.push(e),e.element.classList.add(`text-${o.tag}`),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else if("*"===o.tag){const e={element:document.createElement("li"),location:o.location,type:"container",contains:[]};n.push(e),e.contains=pegAstToHtml_v2(o.content),e.contains.forEach(t=>{e.element.appendChild(t.element)})}else{if(null==o.content)throw Error(`Recieved unknown and unhandeled ast entry '${JSON.stringify(o)}'`);pegAstToHtml_v2(o.content).forEach(e=>{n.push(e)})}}return n},[])}function makePreview(e){const t=pegAstToHtml_v2(bbcodePegParser().parse(e)),n=document.createElement("div");return n.style.flexGrow="1",t.forEach(e=>n.appendChild(e.element)),n.classList.add("postbody","mb-3","mt-4"),n.style.wordWrap="break-word",n.style.wordBreak="break-word",[n,t]}function createPreviewCallbacks(){const e=document.querySelector("nav.navbar.fixed-top");let t;const n=t=void 0===e?0:void 0!==e.getBoxQuads?e.getBoxQuads()[0].p3.y:e.getBoundingClientRect().height;let o=Object.values(document.querySelectorAll(".post_edit_form"));(o=(o=o.concat(Object.values(document.querySelectorAll("#post_reply_form")))).concat(Object.values(document.querySelectorAll("#change_profile_form, #start_thread_form")))).forEach(e=>{const t=e.querySelector("textarea");if(!t)return Error("Failed to find text area for forum");let o,a=0,s=1,r=50;const i=1e4,c=!1;if(!e.parentElement)return;e.parentElement.style.alignItems="flex-start",e.parentElement.classList.add("d-flex"),e.parentElement.style.flexDirection="row-reverse",e.style.position="sticky",e.style.top="0px",e.style.width="min-content",e.style.paddingTop=`${n}px`,e.style.marginTop=`-${n}px`,t.style.resize="both",t.style.minWidth="120px",t.style.width="25vw",t.style.paddingLeft="0",t.style.paddingRight="0";let[l,p]=makePreview(t.value);e.parentElement.insertBefore(l,e);const m=e.parentElement.parentElement.firstElementChild;let d;function u(o=t.selectionStart){d&&(d.style.display="none",d=void 0);const a=function e(t,n){const o=t.slice().reverse().find(e=>e.location[0]<=n&&n<=e.location[1]);if(o){if("container"===o.type){!d&&3!==o.element.nodeType&&o.element.classList.contains("spoiler")&&"block"!==o.element.style.display&&((d=o.element).style.display="block");const t=e(o.contains,n);if(t)return t}return o.element}}(p,o);if(a){if(3===a.nodeType){let e;e=void 0!==a.getBoxQuads?a.getBoxQuads()[0].p1.y:a.parentElement.getBoundingClientRect().top,document.scrollingElement.scrollBy(0,e)}else a.scrollIntoView();document.scrollingElement.scrollBy(0,-n);const t=e.getBoundingClientRect();document.scrollingElement.scrollBy(0,t.top)}}function g(){const e=Date.now(),n=s++,[o,m]=makePreview(t.value);$(o).find(".btn-spoiler").click(function(){$(this).next(".spoiler").toggle()});const d=[];Object.values(o.querySelectorAll("img")).forEach(e=>{d.push(new Promise(t=>{e.addEventListener("load",t),e.addEventListener("error",t),e.complete&&t()}))}),Promise.all(d).then(()=>{const t=Date.now()-e;!c&&t>i||(r=(r+t)/2),n<a?o.remove():(a=n,l.parentElement.insertBefore(o,l),l.remove(),l=o,p=m,u())})}function h(){clearTimeout(o),o=setTimeout(g,r)}m!==e.parentElement&&"img"===m.firstChild.nodeName.toLowerCase()&&(m.firstChild.remove(),m.appendChild(e),e.parentElement.classList.remove("p-3"),e.parentElement.classList.add("pb-3"),e.parentElement.parentElement.classList.add("post")),t.addEventListener("selectionchange",()=>{a===s-1&&null!=p[p.length-1]&&p[p.length-1].location[1]===t.value.length&&u()}),Object.values(e.querySelectorAll("button")).forEach(e=>{e.addEventListener("click",h)}),t.oninput=h})}isUserscript()?createPreviewCallbacks():loadScript("https://gitcdn.xyz/cdn/pegjs/pegjs/30f32600084d8da6a50b801edad49619e53e2a05/website/vendor/pegjs/peg.js").then(()=>{createPreviewCallbacks()});