// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/c2f35786a2a72ffbc37a104f5f720e1fb4c41854/common.js
// @require  https://cdn.rawgit.com/component/textarea-caret-position/af904838644c60a7c48b21ebcca8a533a5967074/index.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==
"use strict";

function createToolTip({title,text}) {
  let tooltip_elm = htmlToElement(`<div>${title}<br><span>${text}</span></div>`);
  let tooltip_text = tooltip_elm.children[1];
  tooltip_elm.style.display="none";
  tooltip_elm.style.backgroundColor="rgba(15,15,15,0.9)";
  tooltip_elm.style.borderRadius="15px";
  tooltip_elm.style.color="rgb(215,215,215)";
  tooltip_elm.style.left="0%";
  tooltip_elm.style.position="absolute";
  tooltip_elm.style.zIndex=10;
  tooltip_elm.style.textAlign="center";
  document.body.appendChild(tooltip_elm);
  return {
    tooltip:tooltip_elm,
    text_container:tooltip_text
  };
}

function BuildSettings({group_name="mangadex-userscript-settings"}={}) {
  let settings = this;
  if (!( settings instanceof BuildSettings) ) {
      return new BuildSettings(arguments);
  }
  settings.group_name=group_name;
  // Get Mangadex Quick Setting's Container
  let setting_item_id_prefix=settings.group_name + "-item-"
  let currentID=new Date().valueOf() + Math.floor(Math.random() * 100000);
  function createSettingID() {
    return setting_item_id_prefix + (currentID++);
  }
  settings.dialog = xp.new('//div[@id="homepage_settings_modal"]/div').with(xp.new().contains('@class','modal-dialog')).getElement();
  settings.mangadex_body = xp.new('.//div').with(xp.new().contains('@class','modal-body')).getElement(settings.dialog);

  settings.buildOptionItem = ({
    icon,
    text,
    value,
    onselect = () => {return null;},
    ontoggle = () => {return null;},
    ondeselect = () => {return null;},
    selected=false
  }) => {
    let item={};
    item.ui = htmlToElement(`
      <li class="${selected ? "selected" : ""}">
      ${icon ? `<img class="" src="${icon}"/>` : "" }
      <span class="">${text}</span>
      </li>
    `);
    item.option=htmlToElement(`
      <option  ${selected ? "selected" : "" } value="${value}"/>${text}</option>
    `);
    item.option.select_callback=onselect;
    item.option.deselect_callback=ondeselect;
    item.option.toggle_callback=ontoggle;
    item.option.dataset.contents = item.ui.innerHTML;

    return item;
  };
  settings.buildOptionItemManual = ({
    icon,
    text,
    value,
    onselect = () => {return null;},
    ontoggle = () => {return null;},
    ondeselect = () => {return null;},
    selected=false
  }) => {
    let item={};
    item.ui = htmlToElement(`
      <li class="${selected ? "selected" : ""}">
      ${icon ? `<img class="" src="${icon}"/>` : "" }
      <span class="">${text}</span>
      </li>
    `);
    item.option=htmlToElement(`
      <option ${selected ? "selected" : "" } value="${value}"/>
    `);
    item.option.dataset.contents = item.ui.innerHTML;
    item.selected_ui = item.ui.cloneNode();
    item.button_ui_container = document.createElement("div");
    item.ui.addEventListener("click",() => {
      item.option.selected = !item.option.selected;
      if (item.option.selected) {
        item.ui.classList.add("selected");
        item.button_ui_container.appendChild(item.selected_ui);
        onselect(item);
      }
      else {
        item.ui.classList.remove("selected");
        item.button_ui_container.removeChild(item.selected_ui);
        ondeselect(item);
      }
      ontoggle(item);
    });
    return item;
  };
  settings.buildMultiselect = ({setting_title}) => {
    let setting={};
    setting.container = htmlToElement(`<div class="form-group row">
			<label class="col-lg-3 col-form-label-modal">${setting_title}:</label>
			<div class="col-lg-9">
          <select multiple class="form-control selectpicker show-tick" data-actions-box="true" data-selected-text-format="count > 5" data-size="10" title="${setting_title}">
          </select>
      </div>
    </div>`);
    setting.label=setting.container.children[0];
    setting.select=setting.container.children[1].children[0];
    let id=createSettingID();
    setting.id=id;
    setting.select.id=id;
    settings.mangadex_body.appendChild(setting.container);
    $('#' + id ).on("changed.bs.select",function (e,clickedIndex,newValue,oldValue) {
        // New value is bool. oldValue is... array with random crap... for some reason....
        setting.select.children[clickedIndex].toggle_callback(newValue,oldValue);
        if (newValue) {
          setting.select.children[clickedIndex].select_callback(newValue,oldValue);
        }
        else {
          setting.select.children[clickedIndex].deselect_callback(newValue,oldValue);
        }
    });
    return setting;
  };
  return settings;
}
function main() {
  let m = new BuildSettings();
  dbg('HEre');
  let select = m.buildMultiselect({setting_title:"SomeCrap"});
  dbg('HEre');
  for (let [i,o] of ["just", "a","few","values"].entries()) {
    dbg('HEre');
    let item = m.buildOptionItem({
      text: o,
      value:i,
      ontoggle: (item) => {
        // Do something
        dbg("changed!");
      },
      onselect: (item) => {
        // Do something
        dbg("NOW SELECTED!");
      },
      ondeselect: (item) => {
        // Do something
        dbg("NOW NOT SELECTED!");
      }
    });
    //select.list_elm.appendChild(item.ui);
    //select.button_contents.appendChild(item.button_ui_container);
  }
}

let xp = new XPath();
checkLoop({
  xpath:'//div[@id="homepage_settings_modal"]/div',
  callback:main,
});
