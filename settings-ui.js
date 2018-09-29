// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for Mangadex userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/c2f35786a2a72ffbc37a104f5f720e1fb4c41854/common.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==
// Note, above metablock is only processed when installed directly
// Done for debugging purposes
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
      return new BuildSettings(...arguments);
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

  function OptionItem({
    icon,
    title,
    title_text,
    value,
    onselect = () => {return null;},
    onchange = () => {return null;},
    ondeselect = () => {return null;},
    selected=false
  }) {
    let item = this;
    if (!( item instanceof OptionItem) ) {
        return new OptionItem(...arguments);
    }
    let ui = htmlToElement(`
      <li class="${selected ? "selected" : ""}">
      ${icon ? `<img class="" src="${icon}"/>` : "" }
      <span class="">${title}</span>
      </li>
    `);
    item.elm=htmlToElement(`
      <option  ${selected ? "selected" : "" } value="${value}"/>${title}</option>
    `);
    item.selected=selected;
    item.elm.dataset.contents = ui.innerHTML;
    item.elm.select_callback   = (new_value,old_value) => {
      onselect(item,new_value,old_value);
    };
    item.elm.deselect_callback = (new_value,old_value) => {
      ondeselect(item,new_value,old_value);
    };
    item.elm.change_callback = (new_value,old_value) => {
      item.selected=new_value;
      onchange(item,new_value,old_value);
    };

    return item;
  };

  function Select({
    title,
    title_text,
    multiselect=false,
    onchange = () => {return null;},
    options=[],
  }) {
    let setting = this;
    if (!( setting instanceof Select) ) {
        return new Select(...arguments);
    }
    let container = settings.mangadex_body;
    setting.elm = htmlToElement(`<div class="form-group row">
			<label class="col-lg-3 col-form-label-modal">${title}:</label>
			<div class="col-lg-9">
          <select ${ multiselect ? "multiple" : ""} class="form-control selectpicker show-tick" data-actions-box="true" data-selected-text-format="count > 5" data-size="10" title="${title}">
          </select>
      </div>
    </div>`);
    setting.label=setting.elm.children[0];
    setting.select=setting.elm.children[1].children[0];
    let id=createSettingID();
    setting.id=id;
    setting.select.id=id;
    container.appendChild(setting.elm);
    $('#' + id ).on("changed.bs.select",function (e,clickedIndex,newValue,oldValue) {
        // New value is bool. oldValue is... array with random crap... for some reason....
        setting.select.children[clickedIndex].change_callback(newValue,oldValue);
        if (newValue) {
          setting.select.children[clickedIndex].select_callback(newValue,oldValue);
        }
        else {
          setting.select.children[clickedIndex].deselect_callback(newValue,oldValue);
        }
        onchange(e,setting,clickedIndex,newValue,oldValue);
    });
    setting.options={};
    let last_used_value = -1;
    function nextOptionValueToUse() {
      return ++last_used_value;
    }
    setting.addExistingOption = (option) => {
      if (setting.options[option.elm.value] != null) {
        dbg("WARNING! Option value reused within Select! Removing original!");
        setting.select.removeChild(setting.options[option.elm.value]);
      }
      setting.options[option.elm.value] = option;
      setting.select.appendChild(option.elm);
      last_used_value=option.value;
    };
    setting.addOption = (args) => {
      setting.addExistingOption(new OptionItem({value:nextOptionValueToUse(), ...args}));
    };

    for (let [idx,option] of options.entries()) {
      setting.addExistingOption(option);
    }
    return setting;
  };
  let settingObjects=[];
  function addSetting(setting) {
    settingObjects.push(setting);
  }
  settings.addMultiselect = (args) => {
    let setting = new Select({multiselect:true,...args});
    addSetting(setting);
    return setting;
  };
  settings.addSelect = (args) => {
    let setting = new Select(args);
    addSetting(setting);
    return setting;
  };
  return settings;
}
function example() {
  let m = new BuildSettings();
  let select = m.addMultiselect({title:"SomeCrap"});
  for (let [i,o] of ["just", "a","few","values"].entries()) {
    let item = select.addOption({
      title: o,
      value:i,
      ontoggle: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("changed!");
      },
      onselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW SELECTED!");
      },
      ondeselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW NOT SELECTED!");
      }
    });
  }
  let selectAuto = m.addMultiselect({title:"Autocomplete"});
  selectAuto.addOption({title:"Manga"});
  selectAuto.addOption({title:"Users"});
}
/*
let xp = new XPath();
checkLoop({
  xpath:'//div[@id="homepage_settings_modal"]/div',
  callback:example,
});
*/
