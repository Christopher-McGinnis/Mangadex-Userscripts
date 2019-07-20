// ==UserScript==
// @name        Mangadex Preview Post
// @description Preview new forum/comment posts and edits on MangaDex. Shows a formatted preview of your post/comment beside the edit box.
// @namespace   https://github.com/Christopher-McGinnis
// @author      Christopher McGinnis
// @license     MIT
// @icon        https://mangadex.org/favicon-96x96.png
// @version  0.2.2
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM_xmlhttpRequest
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/a480c30b64fba63fad4e161cdae01e093bce1e4c/common.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/21ec54406809722c425c39a0f5b6aad59fb3d88d/uncommon.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/0d46bb0b3fa43f11ea904945e7baef7c6e2a6a5b/settings-ui.js
// @require  https://gitcdn.xyz/cdn/pegjs/pegjs/30f32600084d8da6a50b801edad49619e53e2a05/website/vendor/pegjs/peg.js
// @match    https://mangadex.org/*
// ==/UserScript==

'use strict'

// @ts-ignore
const ERROR_IMG = 'https://i.pinimg.com/originals/e3/04/73/e3047319a8ae7192cb462141c30953a8.gif'
// @ts-ignore
const LOADING_IMG = 'https://i.redd.it/ounq1mw5kdxy.gif'
declare var peg: { generate: typeof import('pegjs').generate }
declare interface Window {
    unsafeWindow?: Window;
}

const imageBlobs: {[index: string]: Promise<Blob>} = {}
// @ts-ignore
function getImageBlob(url: string): Promise<Blob> {
  if (!imageBlobs[url]) {
    imageBlobs[url] = new Promise((ret ,err) => {
      GM_xmlhttpRequest({
        method: 'GET'
        ,url
        ,responseType: 'blob'
        ,onerror: err
        ,ontimeout: err
        ,onload: (response: { status: number; response: Blob | PromiseLike<Blob> | undefined }) => {
          if ((response.status == 200 || response.status == 304) && response.response) {
            imageBlobs[url] = Promise.resolve(response.response)
            return ret(imageBlobs[url])
          }
          return err(response)
        }
      })
    })
  }
  return imageBlobs[url]
  /* return fetch(url).then(d=>{
    if (d.ok) {
      imageBlobs[url] = d.blob()
      return imageBlobs[url]
    }
    return Promise.reject(d.statusText)
  }) */
}
function getImageObjectURL(url: string): Promise<string> {
  return getImageBlob(url).then(b =>
    /* For converting them into data-uris. Not too useful.
    const a = new FileReader()
    a.onload = (e) => {
      console.log(a.result)
    }
    a.readAsDataURL(b)
    */
    URL.createObjectURL(b))
}


interface BBCodeAstBase {
    location: [number ,number];
}
interface BBCodeTagAst extends BBCodeAstBase {
    tag:
    'ol' | 'ul' | 'list'
    | 'spoiler'
    | 'quote' | 'code'
    | 'left' | 'right' | 'center'
    | 'i' | 's' | 'u' | 'b' | 'h'
    | 'sub' | 'sup'
    | 'hr'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' ;
    type: 'open' | 'root';
    content: BBCodeAst[];
}
interface BBCodeImageAst extends BBCodeAstBase {
    tag: 'img';
    type: 'open';
    content: string;
}
interface BBCodePrefixAst extends BBCodeAstBase {
    tag: '*';
    type: 'prefix';
    content: BBCodeAst[];
}
interface BBCodeLineBreakAst extends BBCodeAstBase {
    type: 'linebreak';
}
interface BBCodeDataAst extends BBCodeAstBase {
    tag: 'url';
    type: 'opendata';
    data?: string;
    content: BBCodeAst[];
}

interface BBCodeTextAst extends BBCodeAstBase {
    type: 'text' | 'error';
    content: string;
}
type BBCodeAst = BBCodeTagAst | BBCodeImageAst | BBCodeDataAst | BBCodeLineBreakAst | BBCodeTextAst | BBCodePrefixAst

/* PEG grammer */

// New version will enable:
// Partial rebuilds! only update what changed
// Autoscrolling Edit Preview! Ensure the line you are editing is visible as you change it.
// FIXME Img is text only. not recursive
const bbcodePegParser_v2 = peg.generate<BBCodeAst[]>(String.raw`
start = res:Expressions? {return res}
Expressions = reses:Expression+ {
  let astroot = [{type:"root",content:[],location:[0,0]}]
  let stack = [astroot[0]]
  let astcur = astroot[0]
  reses.forEach((res) => {
    let thisast = {}
    if (res.type == "open") {
      thisast.type = res.type
      thisast.tag = res.content
      thisast.content = []
      // Must update end location when tag closes
      thisast.location = res.location
      astcur.content.push(thisast)
      astcur.location[1] = res.location[1]
      astcur=thisast
      stack.push(thisast)
    }
    else if (res.type == "prefix") {
      // cannot directly nest bullet in bullet (must have a non-prexix container class)
      if (astcur.type == "*") {
        // FIXME are we supposed to subtract 1 here?
        astcur.location = res.location[0] // - 1
        stack.pop()
        astcur=stack[stack.length -1]
      }
      thisast.type = res.type
      thisast.tag = res.content
      thisast.content = []
      thisast.location = res.location
      astcur.content.push(thisast)
      astcur.location[1] = res.location[1]
      astcur=thisast
      stack.push(thisast)
    }
    else if (res.type == "opendata") {
      thisast.type = res.type
      thisast.tag = res.content
      thisast.data = res.attr
      thisast.content = []
      thisast.location = res.location
      astcur.content.push(thisast)
      astcur.location[1] = res.location[1]
      astcur=thisast
      stack.push(thisast)
    }
    else if (res.type == "close") {
      let idx = Object.values(stack).reverse().findIndex((e)=>e.tag == res.content)
      if (idx != -1 ) {
        idx=idx+1
        // NOTE should we set ast location end? Yes!
        for (let i = stack.length -idx; i < stack.length; i++) {
          stack[i].location[1] = res.location[1]
        }
        stack.splice(-idx,idx)
        astcur.location[1] = res.location[1]
        astcur=stack[stack.length -1]
      }
      else {
        thisast.type="error"
        thisast.content="[/" + res.content + "]"
        thisast.location = res.location
        astcur.location[1] = res.location[1]
        astcur.content.push(thisast)
      }
    }
    else if (res.type == "linebreak" ) {
      // TODO should check if prefix instead if prefix is to be expanded appon
      if (astcur.tag == "*") {
        // FIXME are we supposed to subtract 1 here?
        astcur.location[1] = res.location[0] // - 1
        stack.pop()
        astcur=stack[stack.length -1]
      }
      // Linebreaks are only added when we are not exiting a prefix
      else {
        astcur.location[1] = res.location[1]
        astcur.content.push(res)
      }
    }
    else {
      astcur.location[1] = res.location[1]
      astcur.content.push(res)
    }
  })
  // Close all tags (location). Remember we start at 1 bc root is just a container
  for (let i = 1; i < stack.length; i++) {
    stack[i].location[1] = astcur.location[1]
  }
  //stack.splice(start, end) not needed
  return astroot[0].content
}
Expression = res:(OpenTag / OpenDataTag / CloseTag / PrefixTag / LineBreak / Text )
/*head:Term tail:(_ ("+" / "-") _ Term)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "+") { return result + element[3]; }
        if (element[1] === "-") { return result - element[3]; }
      }, head);
    }
*/
Tag = tag:(OpenCloseTag / PrefixTag) {return tag}
OpenCloseTag = open:(OpenTag / OpenDataTag) content:Expression? close:CloseTag?
  &{
    let hasClose = close != null
    if (false && hasClose && open.tag != close.tag) {
      throw new Error(
          "Expected [/" + open.tag + "] but [/" + close.tag + "] found."
      );
	}
    return true
} {
    return {type:open.tag, data:open.attr, content}
}
PrefixTag = "[" tag:PrefixTagList "]" { return {type:"prefix", content:tag, location:[location().start.offset,location().end.offset]} }

// PrefixTag = "[" tag:PrefixTagList "]" content:(!("[/" ListTags "]" / LineBreak ) .)* { return {type:tag,unparsed:content.join('')} }

ListTags = "list" / "ul" / "ol" / "li"

NormalTagList = "list" / "spoiler" / "center" / "code" / "quote" / "img" /  "sub" / "sup" / "left" / "right" / "ol" / "ul" / "h1" / "h2" / "h3" / "h4" / "hr" / "h" / "b" / "s" / "i" / "u"
DataTagList = "url"
PrefixTagList = "*"

Data
  = text:(!"]". Data?) {
  /*if(text[2] != null) {
    return {type: "data", content:text[1] + text[2].content }
  }
  return {type: "data", content:text[1] }
  */
  if(text[2] != null) {
    return text[1] + text[2]
  }
  return text[1]
}
OpenTag = "[" tag:NormalTagList "]" { return {type:"open", content:tag, location:[location().start.offset,location().end.offset] } }
AttrTagProxy = "=" attr:Data? {return attr}
OpenDataTag = "[" tag:DataTagList attr:AttrTagProxy?  "]" { return {type:"opendata", content:tag,attr:attr, location:[location().start.offset,location().end.offset]} }

CloseTag = "[/" tag:(DataTagList / NormalTagList / PrefixTagList ) "]" { return {type:"close", content:tag, location:[location().start.offset,location().end.offset]} }


Text
  = text:(!(Tag / CloseTag / LineBreak). Text?) {
  if(text[2] != null) {
    return {type: "text", content:text[1] + text[2].content, location:[location().start.offset,text[2].location[1]] }
  }
  return {type: "text", content:text[1], location:[location().start.offset,location().end.offset] }
}
ContiguousText
  = text:(!(Tag / CloseTag / LineBreak / _ ). ContiguousText?) {
  if(text[2] != null) {
    return {type: "text", content:text[1] + text[2].content, location:[location().start.offset,text[2].location[1]] }
  }
  return {type: "text", content:text[1], location:[location().start.offset,location().end.offset] }
}
LineBreak
  = [\n] {
  return {type: "linebreak", location:[location().start.offset,location().end.offset] }
}
ErrorCatcher
  = errTxt:. {return {type: "error", content: errTxt, location:[location().start.offset,location().end.offset]} }

_ "whitespace"
  = [ \t\n\r]*
`)


/* main code */

interface AST_HTML_ELEMENT_BASE {
    location: [number ,number];
}
interface AST_HTML_ELEMENT_CONTAINER extends AST_HTML_ELEMENT_BASE {
    type: 'container';
    element: HTMLElement | Text;
    contains: AST_HTML_ELEMENT[];
}
interface AST_HTML_ELEMENT_IMAGE extends AST_HTML_ELEMENT_BASE {
    type: 'image';
    element: HTMLImageElement;
    imagePromise: Promise<string>;
}
interface AST_HTML_ELEMENT_TEXT extends AST_HTML_ELEMENT_BASE {
    type: 'text';
    element: Text;
}
type AST_HTML_ELEMENT = AST_HTML_ELEMENT_CONTAINER | AST_HTML_ELEMENT_IMAGE | AST_HTML_ELEMENT_TEXT

// New steps:
// PegSimpleAST -> AST_WithHTML
// AST_WithHTML + cursor_location -> HtmlElement
// AST_WithHTML + text_change_location_and_range + all_text -> LocalAST_WithHTML_OfChange + local_ast_text_range -> LocalAST_WithHTML -> HtmlElement
function pegAstToHtml_v2(ast: BBCodeAst[] | null | undefined): AST_HTML_ELEMENT[] {
  if (ast == null) {
    return []
  }
  if (typeof (ast) !== 'object') {
    // This should never happen
    return []
  }
  function pushIt(a: AST_HTML_ELEMENT[] ,ast: BBCodeAst ,element: Text) {
    a.push({
      type: 'text'
      ,element
      ,location: ast.location
    })
  }

  const res = ast.reduce((accum: AST_HTML_ELEMENT[] ,e) => {
    if (e.type == 'text') {
      pushIt(accum ,e ,document.createTextNode(e.content))
    }
    else if (e.type == 'linebreak') {
      // pushIt(accum, e, document.createElement('br'), 'container')
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('br')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
    }
    else if (e.type == 'error') {
      pushIt(accum ,e ,document.createTextNode(e.content))
    }
    // Everything after this must have a tag attribute!
    // not nesting to avoid right shift
    else if (!(e.type == 'open' || e.type == 'prefix' || e.type == 'opendata')) {
      // @ts-ignore: Not a string, but doesn't need to be. Make or edit type
      throw new Error({
        msg: `Unknown AST type "${e.type}" recieved!` ,child_ast: e ,container_ast: ast
      })
    }
    else if (e.tag === 'u' || e.tag == 's' || e.tag == 'sub'
      || e.tag == 'sup' || e.tag == 'ol' || e.tag == 'code'
      || e.tag == 'h1' || e.tag == 'h2' || e.tag == 'h3'
      || e.tag == 'h4' || e.tag == 'h5' || e.tag == 'h6'
    ) {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement(e.tag)
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'list' || e.tag === 'ul') {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('ul')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'hr') {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement(e.tag)
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      // FIXME Contain children, in a non nested fashion
      // element.contains=pegAstToHtml_v2(e.content)
      pegAstToHtml_v2(e.content).forEach((e) => {
        accum.push(e)
      })
    }
    else if (e.tag === 'b') {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('strong')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'i') {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('em')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'h') {
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('mark')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'url') {
      // accum += `<a href="${e.data}" target="_blank">${pegAstToHtml(e.content)}</a>`
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('a')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      if (e.data) {
        (element.element as HTMLAnchorElement).href = e.data
      }
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'img') {
      // accum += `<img src="${pegAstToHtml(e.content)}"/>`
      let promise: Promise<string> = Promise.reject()
      // FIXME should Only pass url via image when parsing
      let url: string
      if (e.content) {
        // @ts-ignore
        const urltest = (e.content as BBCodeAst[])[0]
        if (urltest && urltest.type === 'text') {
          url = urltest.content
          promise = getImageObjectURL(url)
        }
      }
      const element: AST_HTML_ELEMENT = {
        element: document.createElement(e.tag)
        ,location: e.location
        ,type: 'image'
        ,imagePromise: promise
      }
      // element.element.src=LOADING_IMG
      promise.then((e) => {
        element.element.onload = () => {
          URL.revokeObjectURL(e)
        }
        element.element.onerror = () => {
          URL.revokeObjectURL(e)
        }
        element.element.src = e
      }).catch((b) => {
        console.log(`Url '${url}' failed to load with error!`)
        console.log(b)
        // element.element.src = ERROR_IMG
      })
      accum.push(element)
    }
    else if (e.tag === 'quote') {
      // accum += `<div style="width: 100%; display: inline-block; margin: 1em 0;" class="well well-sm">${pegAstToHtml(e.content)}</div>`
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('div')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      ;(element.element as HTMLDivElement).style.width = '100%'
      ;(element.element as HTMLDivElement).style.display = 'inline-block'
      ;(element.element as HTMLDivElement).style.margin = '1em 0'
      ;(element.element as HTMLDivElement).classList.add('well' ,'well-sm')
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag === 'spoiler') {
      // FIXME: Spoiler buttons are nested, however, spoiler divs are TopLevel only!
      // accum += `<button type="button" class="btn btn-sm btn-warning btn-spoiler">Spoiler</button><p class="spoiler display-none">${pegAstToHtml(e.content)}</p>`
      const button: AST_HTML_ELEMENT = {
        element: document.createElement('button')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      button.element.textContent = 'Spoiler'
      ;(button.element as HTMLButtonElement).classList.add('btn' ,'btn-sm' ,'btn-warning' ,'btn-spoiler')
      accum.push(button)
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('p')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      ;(element.element as HTMLDivElement).classList.add('spoiler' ,'display-none')
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
      /* In a perfect world. it would work like this... but md is a bit broken
      ;(button.element as HTMLButtonElement).addEventListener('click',()=>{
        ;(element.element as HTMLDivElement).classList.toggle('display-none')
      })
      Code to do this is afer makepreview, to ensure buggieness is preserved */
    }
    else if (e.tag === 'center' || e.tag === 'left' || e.tag === 'right') {
      // accum += `<p class="text-center">${pegAstToHtml(e.content)}</p>`
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('p')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      ;(element.element as HTMLDivElement).classList.add(`text-${e.tag}`)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.tag == '*') {
      // must parse the inside for v2
      // accum += `<li>${pegAstToHtml( bbcodePegParser.parse(e.unparse) )}</li>`
      // accum += `<li>${pegAstToHtml(e.content)}</li>`
      const element: AST_HTML_ELEMENT = {
        element: document.createElement('li')
        ,location: e.location
        ,type: 'container'
        ,contains: []
      }
      accum.push(element)
      element.contains = pegAstToHtml_v2(e.content)
      element.contains.forEach((child_ast_element) => {
        element.element.appendChild(child_ast_element.element)
      })
    }
    else if (e.content != null) {
      // FIXME? Is this possible? Root?
      pegAstToHtml_v2(e.content).forEach((e) => {
        accum.push(e)
      })
    }
    else {
      // FIXME: Does this even happed
      throw Error(`Recieved unknown and unhandeled ast entry '${JSON.stringify(e)}'`)
      /* accum.push({
        type: 'text'
        ,element: document.createTextNode(e.content)
        ,location: e.location
      }) */
    }
    return accum
  } ,[])
  return res
}


function makePreview(txt: string): [HTMLDivElement ,AST_HTML_ELEMENT[]] {
  // dbg(pegAstToHtml(bbcodePegParser.parse(txt)))
  // Faster, but less dynamic
  // let html = bbCodeParser.parse(txt)
  // Slower, but more dynamic
  // let html = pegAstToHtml(bbcodePegParser.parse(txt))
  const astHtml = pegAstToHtml_v2(bbcodePegParser_v2.parse(txt))
  // dbg(JSON.stringify(bbcodePegParser_v2.parse(txt)))
  const previewDiv = document.createElement('div')
  previewDiv.style.flexGrow = '1'
  astHtml.forEach(e => previewDiv.appendChild(e.element))
  // tmpl.innerHTML = html
  return [previewDiv ,astHtml]
}

function createPreviewInterface(forum: HTMLElement) {
  const container = forum.parentElement!
  const previewDiv = document.createElement('div')
  previewDiv.style.flexGrow = '1'
  container.style.alignItems = 'flex-start'
  container.classList.add('d-flex' ,'')
  container.insertBefore(previewDiv ,forum)
}

function createPreviewCallbacks() {
  const nav = document.querySelector('nav.navbar.fixed-top') as HTMLElement
  // @ts-ignore
  const navHeight = nav ? nav.getBoxQuads()[0].p4.y : 0
  // let image_buffers: Map<string, Blob>
  let forms = Object.values(document.querySelectorAll('.post_edit_form'))
  forms = forms.concat(Object.values(document.querySelectorAll('#post_reply_form')))
  forms = forms.concat(Object.values(document.querySelectorAll('#change_profile_form, #start_thread_form')))

  forms.forEach((forum) => {
    // Try to make it side by side
    // e.parentElement.parentElement.insertBefore(previewDiv,e.parentElement)
    // e.parentElement.classList.add("sticky-top", "pt-5", "col-6")
    const textarea = (forum.querySelector('textarea') as HTMLTextAreaElement)
    if (!textarea) {
      // FIXME throw errors. Kind of want to short circit this one though
      return Error('Failed to find text area for forum')
    }
    // Setup variables
    let curDisplayedVersion = 0
    let nextVersion = 1
    let updateTimeout: number
    let updateTimeoutDelay = 500

    const maxAcceptableDelay = 10000
    const useFallbackPreview = false
        // Prepare form
        forum.parentElement!.style.alignItems = 'flex-start'
        forum.parentElement!.classList.add('d-flex')
        ;(forum.parentElement as HTMLElement).style.flexDirection = 'row-reverse'
        ;(forum as HTMLElement).style.position = 'sticky'
        ;(forum as HTMLElement).style.top = '0px'
        // Padding keeps us from hitting the navbar. Margin lines us back up with the preview
        ;(forum as HTMLElement).style.paddingTop = `${navHeight}px`
        ;(forum as HTMLElement).style.marginTop = `-${navHeight}px`
        textarea.style.resize = 'both'
        let [previewDiv ,astHtml] = makePreview(textarea.value)
        console.log(astHtml)
        let currentSpoiler: undefined | HTMLParagraphElement
        function searchAst(ast: AST_HTML_ELEMENT[] ,cpos: number): undefined | Text | HTMLElement {
          // slice bc reverse is in place
          const a = ast.slice().reverse().find(e => e.location[0] <= cpos && cpos <= e.location[1])
          if (a) {
            if (a.type == 'container') {
              // unhide spoilers
              // Ensure we are not a Text node and that we are a spoiler
              if (!currentSpoiler && a.element.nodeType !== 3
            && (a.element as HTMLParagraphElement).classList.contains('spoiler')
            && (a.element as HTMLParagraphElement).style.display !== 'block'
              ) {
                currentSpoiler = a.element as HTMLParagraphElement
                currentSpoiler.style.display = 'block'
              }
              const b = searchAst(a.contains ,cpos)
              if (b) {
                return b
              }
            }
            return a.element
          }
          return undefined
        }
        // Auto scroll into view
        function scrollToPos(pos = textarea!.selectionStart) {
          // Hide previous spoiler
          if (currentSpoiler) {
            currentSpoiler.style.display = 'none'
            currentSpoiler = undefined
          }
          // Get element from ast that starts closest to pos
          const elm = searchAst(astHtml ,pos)
          if (elm) {
            console.log(elm)
            // FIXME Scroll pos is a bit hard to find.
            // getBoxQuads, getClientRect, getClientBoundingRect all give the offset from the viewport
            // Height of child elements not calculated in...
            // SAFE for (text)nodes?, not safe for elements with nested content
            if (elm.nodeType === 3) {
              // @ts-ignore
              const { y } = (elm as Text).getBoxQuads()[0].p1
                    // FIXME. Must be a better way to scroll (especialy in case of nested scroll frames)
                    // Scroll to top
                    document.scrollingElement!.scrollBy(0 ,y)
            }
            else {
              // FIXME. Must be a better way to scroll (especialy in case of nested scroll frames)
              // Scroll to ~ center directly
              // const y: number = (elm as HTMLElement).offsetTop
              // document.scrollingElement!.scrollTo({top:y})
              // Scroll to top
              (elm as HTMLElement).scrollIntoView()
            }
                // Scroll out of nav
                document.scrollingElement!.scrollBy(0 ,-navHeight)
                // Add this line to scroll to center
                // document.scrollingElement!.scrollBy(0,-(window.innerHeight-navHeight)/2)
                // Finally, ensure we keep the textarea in view
                const bound = (forum as HTMLFormElement).getBoundingClientRect()
                // document.scrollingElement!.scrollBy(0,bound.bottom - bound.height)
                document.scrollingElement!.scrollBy(0 ,bound.top)
          }
        }
        textarea.addEventListener('selectionchange' ,() => {
          // Only autoscroll if our ast is in sync with the preview.
          console.log(astHtml[astHtml.length - 1])
          console.log(astHtml[astHtml.length - 1].location)
          if (curDisplayedVersion === nextVersion - 1
        && astHtml[astHtml.length - 1] != null
        && astHtml[astHtml.length - 1].location[1] === textarea.value.length
          ) {
            scrollToPos()
          }
        })
        if (!forum.parentElement) {
          return
        }
        forum.parentElement.insertBefore(previewDiv ,forum)
        function UpdatePreview() {
          // Measure load speed. Used for setting update delay dynamicly.
          const startTime = Date.now()
          // Create a preview buffer
          const thisVersion = nextVersion++
          const [newPreview ,newAstHtml] = makePreview(textarea!.value)

          // Setup spoilers the same way md does
          $(newPreview).find('.btn-spoiler').click(function () {
            // @ts-ignore
            $(this as HTMLButtonElement).next('.spoiler').toggle()
          })
          // previewDiv, astHtml
          const imgLoadPromises: Promise<any>[] = []
          Object.values(newPreview.querySelectorAll('img')).forEach((img: HTMLImageElement) => {
            imgLoadPromises.push(new Promise((resolve) => {
              img.addEventListener('load' ,resolve)
              // Errors dont really matter to us
              img.addEventListener('error' ,resolve)
              // Esure we are not already done
              if (img.complete) {
                resolve()
              }
            }))
          })
          // Wait for all images to load or error (size calculations needed) before we swap and rescroll
          // This is the part that actualy updates the preview
          Promise.all(imgLoadPromises).then(() => {
            const endTime = Date.now()
            const updateLoadDelay = endTime - startTime
            if (!useFallbackPreview && updateLoadDelay > maxAcceptableDelay) {
              // NOTE: Fallback preview removed. Focusing on speed improvments of normal preview
              // useFallbackPreview = true
              // dbg(`It took ${updateLoadDelay} milli to update. Max acceptable delay was ${maxAcceptableDelay}! Switching to fallback preview!`)
              // We intentionally do not update the timout delay when we swap to fallback preview
            }
            else {
              // average out the times
              updateTimeoutDelay = (updateTimeoutDelay + updateLoadDelay) / 2
              // dbg(`It took ${updateLoadDelay} milli to update. Changing delay to ${updateTimeoutDelay} `)
            }

            // Return if we are older than cur preview
            if (thisVersion < curDisplayedVersion) {
              newPreview.remove()
              return
            }
            curDisplayedVersion = thisVersion
                // Replace the Preview with the buffered content
                previewDiv.parentElement!.insertBefore(newPreview ,previewDiv)
                previewDiv.remove()
                previewDiv = newPreview
                astHtml = newAstHtml
                // Scroll to position
                scrollToPos()
          })
        }
        function UpdatePreviewProxy() {
          // dbg(`Reseting timeout with delay ${updateTimeoutDelay} `)
          clearTimeout(updateTimeout)
          // @ts-ignore
          updateTimeout = setTimeout(UpdatePreview ,updateTimeoutDelay)
        }

        const buttons = Object.values(forum.querySelectorAll('button'))
        buttons.forEach((btn) => {
          btn.addEventListener('click' ,UpdatePreviewProxy)
        })
        textarea.oninput = UpdatePreviewProxy
  })
}

createPreviewCallbacks()
