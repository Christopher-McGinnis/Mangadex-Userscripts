// ==UserScript==
// @name     Mangadex Preview Post
// @description Preview new forum/comment posts and edits on MangaDex.
// @namespace https://github.com/Christopher-McGinnis
// @version  0.0.7
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/a480c30b64fba63fad4e161cdae01e093bce1e4c/common.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/21ec54406809722c425c39a0f5b6aad59fb3d88d/uncommon.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/0d46bb0b3fa43f11ea904945e7baef7c6e2a6a5b/settings-ui.js
// @require  https://gitcdn.xyz/cdn/pegjs/pegjs/30f32600084d8da6a50b801edad49619e53e2a05/website/vendor/pegjs/peg.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png
// @license  MIT
// ==/UserScript==






class BBCode {
    /* Taken from https://github.com/DasRed/js-bbcode-parser
     * Distributed under MIT license
     */
    /**
     * @param {Object} codes
     * @param {Object} [options]
     */
    constructor(codes, options) {
        this.codes = [];

        options = options || {};

        // copy options
        for (let optionName in options) {
            if (optionName === 'events') {
                continue;
            }
            this[optionName] = options[optionName];
        }

        this.setCodes(codes);
    }

    /**
     * parse
     *
     * @param {String} text
     * @returns {String}
     */
    parse(text) {
        return this.codes.reduce((text, code) => text.replace(code.regexp, code.replacement), text);
    }

    /**
     * add bb codes
     *
     * @param {String} regex
     * @param {String} replacement
     * @returns {BBCode}
     */
    add(regex, replacement) {
        this.codes.push({
            regexp:      new RegExp(regex, 'igm'),
            replacement: replacement
        });

        return this;
    }

    /**
     * set bb codes
     *
     * @param {Object} codes
     * @returns {BBCode}
     */
    setCodes(codes) {
        this.codes = Object.keys(codes).map(function (regex) {
            const replacement = codes[regex];

            return {
                regexp:      new RegExp(regex, 'igm'),
                replacement: replacement
            };
        }, this);

        return this;
    }
}

// create the Default
const bbCodeParser = new BBCode({
    '\n': '<br>',
    '\\[b\\](.*?)\\[/b\\]': '<strong>$1</strong>',
    '\\[i\\](.*?)\\[/i\\]': '<em>$1</em>',
    '\\[u\\](.*?)\\[/u\\]': '<u>$1</u>',
    '\\[s\\](.*?)\\[/s\\]': '<s>$1</s>',
    '\\[code\\](.*?)\\[/code\\]': '<code>$1</code>',

    '\\[h1\\](.*?)\\[/h1\\]': '<h1>$1</h1>',
    '\\[h2\\](.*?)\\[/h2\\]': '<h2>$1</h2>',
    '\\[h3\\](.*?)\\[/h3\\]': '<h3>$1</h3>',
    '\\[h4\\](.*?)\\[/h4\\]': '<h4>$1</h4>',
    '\\[h5\\](.*?)\\[/h5\\]': '<h5>$1</h5>',
    '\\[h6\\](.*?)\\[/h6\\]': '<h6>$1</h6>',
  
    '\\[sub\\](.*?)\\[/sub\\]': '<sub>$1</sub>',
    '\\[sup\\](.*?)\\[/sup\\]': '<sup>$1</sup>',
  
    '\\[quote\\](.*?)\\[/quote\\]': '<div style="width: 100%; display: inline-block; margin: 1em 0;" class="well well-sm">$1</div>',
    '\\[spoiler\\](.*?)\\[/spoiler\\]': '<button type="button" class="btn btn-sm btn-warning btn-spoiler" onclick="$(this).next(`.spoiler`).toggle()">Spoiler</button><p class="spoiler display-none">$1</p>',
    '\\[center\\](.*?)\\[/center\\]': '<p class="text-center">$1</p>',
    '\\[left\\](.*?)\\[/left\\]': '<p class="text-left">$1</p>',
    '\\[right\\](.*?)\\[/right\\]': '<p class="text-right">$1</p>',

    '\\[img\\](.*?)\\[/img\\]': '<img src="$1">',
    '\\[hr\\](.*?)\\[/hr\\]': '<hr>$1',

    '\\[url\\](.*?)\\[/url\\]':                 '<a href="$1" target="_blank">$1</a>',
    '\\[url=(.*?)\\](.*?)\\[/url\\]':            '<a href="$1" target="_blank">$2</a>',
  
    '\\[list\\](.*?)\\[/list\\]': '<ul>$1</ul>',
    '\\[ol\\](.*?)\\[/ol\\]': '<ol>$1</ol>',
    '\\[ul\\](.*?)\\[/ul\\]': '<ul>$1</ul>',
    '\\[\\*\\](.*?)<br>':    '<li>$1</li><br>'
});

// define configuration function for default
bbCodeParser.create = BBCode


/* PEG grammer */
let bbcodePegParser = peg.generate(String.raw`
start = res:Expression? {return res}
Expression = res:(Tag / LineBreak / Text )+ {return res}
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
PrefixTag = "[" tag:PrefixTagList "]" { return {type:tag} }

// PrefixTag = "[" tag:PrefixTagList "]" content:(!("[/" ListTags "]" / LineBreak ) .)* { return {type:tag,unparsed:content.join('')} }

ListTags = "list" / "ul" / "ol" / "li"

NormalTagList = "list" / "spoiler" / "center" / "code" / "img" /  "sub" / "sup" / "left" / "right" / "ol" / "ul" / "h1" / "h2" / "h3" / "h4" / "h5" / "h6" / "hr" / "b" / "s" / "i" / "u"
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
OpenTag = "[" tag:NormalTagList "]" { return {tag} }
AttrTagProxy = "=" attr:Data? {return attr}
OpenDataTag = "[" tag:DataTagList attr:AttrTagProxy?  "]" { return {tag,attr:attr} }


CloseTag = "[/" tag:(DataTagList / NormalTagList ) "]" { return {tag} }


Text
  = text:(!(Tag / CloseTag / LineBreak). Text?) {
  if(text[2] != null) {
    return {type: "text", content:text[1] + text[2].content }
  }
  return {type: "text", content:text[1] }
}
LineBreak
  = [\n] {
  return {type: "linebreak" }
}
ErrorCatcher
  = errTxt:. {return {type: "error", content: errTxt} }

_ "whitespace"
  = [ \t\n\r]*
`)






/* main code */


function pegAstToHtml(ast) {
  let in_li = false
  if (ast == null) {
    return ""
  }
  if (typeof(ast) !== "object") {
    return ast
  }
  //dbg(ast)
  //Object.values(ast)
  let res =  ast.reduce((accum, e) => {
    function try_exit_li() {
      if (in_li) {
        in_li=false
        accum += "</li>"
        return true
      }
      return false
    }
    if (e.type == "text") {
      accum += e.content
    }
    else if (e.type == "linebreak") {
      if (! try_exit_li() ) {
        accum += "<br>"
      }
    }
    else if (e.type.match(/^(u|s|sub|sup|ol|code)$/)) {
      accum += `<${e.type}>${pegAstToHtml(e.content)}</${e.type}>`
    }
    else if (e.type.match(/^(list|ul)$/)) {
      accum += `<ul>${pegAstToHtml(e.content)}</ul>`
    }
    else if (e.type.match(/^h[123456]$/)) {
      accum += `<${e.type}>${pegAstToHtml(e.content)}</${e.type}>`
    }
    else if (e.type.match(/^hr$/)) {
      accum += `<${e.type}>${pegAstToHtml(e.content)}`
    }
    else if (e.type.match(/^b$/)) {
      accum += `<strong>${pegAstToHtml(e.content)}</strong>`
    }
    else if (e.type.match(/^i$/)) {
      accum += `<em>${pegAstToHtml(e.content)}</em>`
    }
    else if (e.type.match(/^url$/)) {
      accum += `<a href="${e.data}" target="_blank">${pegAstToHtml(e.content)}</a>`
    }
    else if (e.type.match(/^img$/)) {
      accum += `<img src="${pegAstToHtml(e.content)}"/>`
    }
    else if (e.type.match(/^quote$/)) {
      accum += `<div style="width: 100%; display: inline-block; margin: 1em 0;" class="well well-sm">${pegAstToHtml(e.content)}</div>`
    }
    else if (e.type.match(/^spoiler$/)) {
      accum += `<button type="button" class="btn btn-sm btn-warning btn-spoiler">Spoiler</button><p class="spoiler display-none">${pegAstToHtml(e.content)}</p>`
    }
    else if (e.type.match(/^(center|left|right)$/)) {
      accum += `<p class="text-center">${pegAstToHtml(e.content)}</p>`
    }
    else if (e.type == "*") {
      // must parse the inside for v2
      //accum += `<li>${pegAstToHtml( bbcodePegParser.parse(e.unparse) )}</li>`
      try_exit_li()
      accum += `<li>`
      in_li=true
    }
    else if (e.type == "error") {
      accum += e.content
    }
    else if (e.content != null ){
      accum += pegAstToHtml(e.content)
    }
    else {
      accum += e
    }
    return accum
  },"")
  if (in_li) {
    in_li=false
    res +="</li>"
  }
  return res
}

function makePreview(txt) {
  //dbg(pegAstToHtml(bbcodePegParser.parse(txt)))
  // Faster, but less dynamic
  //let html = bbCodeParser.parse(txt)
  // Slower, but more dynamic
  let html = pegAstToHtml(bbcodePegParser.parse(txt))
  let tmpl = document.createElement("div")
  tmpl.innerHTML = html
  return tmpl
}

let previewDivTempl = document.createElement("div")

function createPreviewCallbacks() {
  let forms = Object.values(document.querySelectorAll(".post_edit_form"))
  forms = forms.concat( Object.values(document.querySelectorAll("#post_reply_form")))
  forms = forms.concat( Object.values(document.querySelectorAll("#change_profile_form")))
  
  forms.forEach((forum)=>{
    // Try to make it side by side
    //e.parentElement.parentElement.insertBefore(previewDiv,e.parentElement)
    //e.parentElement.classList.add("sticky-top", "pt-5", "col-6")
    let textarea = forum.querySelector("textarea")
    let previewDiv = makePreview(textarea.value)
    forum.parentElement.insertBefore(previewDiv,forum)
    let curDisplayedVersion = 0
    let nextVersion = 0
    let updateTimeout
    let updateTimeoutDelay = 50
    function UpdatePreview() {
      // Measure load speed. Used for setting update delay dynamicly.
      let startTime = Date.now()
      // Create a preview buffer
      let thisVersion = nextVersion++
      let newPreview = makePreview(textarea.value)
      let imgLoadPromises = []
      Object.values(newPreview.querySelectorAll("img")).forEach((img) => {
        imgLoadPromises.push(new Promise(resolve => {
          img.addEventListener('load', resolve)
          // Errors dont really matter to us
          img.addEventListener('error', resolve)
          // Esure we are not already done
          if (img.complete) {
            resolve()
          }
        }))
      })
      // Wait for all images to load or error (size calculations needed) before we swap and rescroll
      // This is the part that actualy updates the preview
      Promise.all(imgLoadPromises).then(()=>{
        let endTime = Date.now()
        let updateLoadDelay = endTime - startTime
        // average out the times
        updateTimeoutDelay = (updateTimeoutDelay + updateLoadDelay) / 2
        dbg(`It took ${updateLoadDelay} milli to update. Changing delay to ${updateTimeoutDelay} `)
        // Return if we are older than cur preview
        if (thisVersion < curDisplayedVersion) {
          newPreview.remove()
          return
        }
        curDisplayedVersion = thisVersion
        // Remember scroll position
        let old_height = $(document).height();  //store document height before modifications
        let old_scroll = $(window).scrollTop(); //remember the scroll position
        // Replace the Preview with the buffered content
        previewDiv.parentElement.insertBefore(newPreview,previewDiv)
        previewDiv.remove()
        previewDiv=newPreview
        // Scroll back to position
        $(document).scrollTop(old_scroll + $(document).height() - old_height);
      })
    }
    function UpdatePreviewProxy() {
      dbg(`Reseting timeout with delay ${updateTimeoutDelay} `)
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(UpdatePreview,updateTimeoutDelay)
    }
    
    let buttons = Object.values(forum.querySelectorAll("button"))
    buttons.forEach((btn)=>{
      btn.addEventListener('click', UpdatePreviewProxy)
    })
    textarea.oninput = UpdatePreviewProxy
  })
}

createPreviewCallbacks()
