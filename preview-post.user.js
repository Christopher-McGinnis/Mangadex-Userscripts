// ==UserScript==
// @name     Mangadex PreviewPost
// @description Preview new forum/comment posts and edits on MangaDex.
// @namespace https://github.com/Christopher-McGinnis
// @version  0.0.1
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/a480c30b64fba63fad4e161cdae01e093bce1e4c/common.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/21ec54406809722c425c39a0f5b6aad59fb3d88d/uncommon.js
// @require  https://gitcdn.xyz/repo/Christopher-McGinnis/Mangadex-Userscripts/0d46bb0b3fa43f11ea904945e7baef7c6e2a6a5b/settings-ui.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png
// @license  MIT
// ==/UserScript==
// 
// 



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
    '\\[\\*\\](.*?)\\[/\\*\\]':    '<li>$1</li>'
});

// define configuration function for default
bbCodeParser.create = BBCode;


/* main code */




function makePreview(txt) {
  return bbCodeParser.parse(txt)
}

let previewDivTempl = document.createElement("div")

function createPreviewCallbacks() {
  let forms = Object.values(document.querySelectorAll(".post_edit_form"))
  forms = forms.concat( Object.values(document.querySelectorAll("#post_reply_form")))
  forms.forEach((forum)=>{
    let previewDiv = previewDivTempl.cloneNode()
    forum.parentElement.insertBefore(previewDiv,forum)
    // Try to make it side by side
    //e.parentElement.parentElement.insertBefore(previewDiv,e.parentElement)
    //e.parentElement.classList.add("sticky-top", "pt-5", "col-6")
    let textarea = forum.querySelector("textarea")
    function refreshPreview() {
      let preview = makePreview(textarea.value)
      // Remember scroll position
      var old_height = $(document).height();  //store document height before modifications
      var old_scroll = $(window).scrollTop(); //remember the scroll position
      // Update Preview
      previewDiv.innerHTML = preview
      // Scroll back to position
      $(document).scrollTop(old_scroll + $(document).height() - old_height);
    }
    previewDiv.innerHTML = makePreview(textarea.value)
    let buttons = Object.values(forum.querySelectorAll("button"))
    buttons.forEach((btn)=>{
      btn.addEventListener('click',refreshPreview)
    })
    textarea.oninput = refreshPreview
  })
}

createPreviewCallbacks()
